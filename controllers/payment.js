const Listing = require("../models/listing");
const Booking = require("../models/booking");
const nodemailer = require("nodemailer");
const Tesseract = require("tesseract.js"); 
const moment = require("moment-timezone"); 
const path = require("path");
moment.tz.setDefault("Asia/Kolkata");
const QRCode = require("qrcode");


// ---------- Email transporter ----------
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { 
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
});

// ---------- helpers ----------
// --- Normalization helpers ---
function normalizeForOCR(str = "") {
    return str
        .toLowerCase()
        .replace(/\s+/g, "")   // remove spaces
        .replace(/\|/g, "l")   // OCR mistake: | → l
        .replace(/0/g, "o")    // OCR mistake: 0 → o
        .replace(/[@]/g, "@"); // just ensure @ stays proper
}

function numberLikePatterns(n) {
    // handle 3540, 3,540, 3 540, possible OCR merges
    const raw = String(n);
    const withCommas = n.toLocaleString("en-IN");
    const loose = withCommas.replace(/,/g, "[,\\s]?");
    return [
        new RegExp(`\\b${raw}\\b`),
        new RegExp(loose),
    ];
}

// try to find a date in the OCR text and parse it
function extractPaymentDate(text) {
    const candidates = [];
    const patterns = [
        /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/g,           // 16/08/2025 or 16-08-2025
        /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g,           // 2025/08/16
        /\b(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})\b/g,            // 16 Aug 2025
        /\b([A-Za-z]{3,}\s+\d{1,2},\s*\d{4})\b/g,           // Aug 16, 2025
    ];

    for (const re of patterns) {
        let m;
        while ((m = re.exec(text)) !== null) candidates.push(m[1]);
    }

    const formats = ["DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY", "YYYY/MM/DD", "YYYY-MM-DD", "DD MMM YYYY", "MMM DD, YYYY"];
    for (const c of candidates) {
        const parsed = moment.tz(c, formats, true, "Asia/Kolkata");
        if (parsed.isValid()) return parsed;
    }
    return null;
}

function withinAllowedWindow(paymentMoment) {
    // allow payment on "today" or "yesterday" (because OCR timezones / delays)
    const today = moment().startOf("day");
    const yday = moment().subtract(1, "day").startOf("day");
    return paymentMoment.isSame(today, "day") || paymentMoment.isSame(yday, "day");
}

module.exports.showPaymentPage = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).send("Listing not found");

    const booking = req.session?.booking;
    if (!booking) {
        req.flash("error", "No booking found");
        return res.redirect(`/listings/${req.params.id}/book`);
    }

    // Check expiry (7 minutes validity)
    const EXPIRY_TIME = 7 * 60 * 1000;
    if (Date.now() - booking.createdAt > EXPIRY_TIME) {
        req.session.booking = null;
        req.flash("error", "⏰ Booking session expired. Please select dates again.");
        return res.redirect(`/listings/${req.params.id}/book`);
    }

    const { startDate, endDate, price, upiId } = req.session.booking;

    // generate QR 
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(listing.title)}&am=${price.totalCost}&cu=INR&tn=Booking-${listing._id}`;
    const qrCodeDataURL = await QRCode.toDataURL(upiLink);

    res.render("listings/paymentPage.ejs", {
        listing,
        totalCost: price.totalCost,
        qrCodeDataURL,
        startDate,
        endDate,
        priceBreakdown: price,
        upiId
    });
};


module.exports.confirmPayment=async (req, res) => {
    const booking = req.session?.booking;
    if (!booking) {
        req.flash("error", "No booking found");
        return res.redirect(`/listings/${req.params.id}/book`);
    }

    // ✅ populate owner from User
    const listing = await Listing.findById(booking.listingId).populate("owner");
    if (!listing) return res.status(404).send("Listing not found");  


    // ---------- OCR the screenshot ----------
    const { data: { text } } = await Tesseract.recognize(req.file.path, "eng");
    const ocrRaw = text || "";

    // ---------- Verify UPI ID ----------
    const expectedUpi = normalizeForOCR(booking.ownerUpiId || listing.ownerUpiId || "");
    const ocr = normalizeForOCR(ocrRaw);

    // check if UPI exists inside OCR result
    const upiOk = expectedUpi && ocr.includes(expectedUpi);

    // ---------- Verify Amount ----------
    const amt = Number(booking.amount?.totalCost || 0);
    const amtOk = numberLikePatterns(amt).some((re) => re.test(ocrRaw));

    // ---------- Verify Date ----------
    const foundDate = extractPaymentDate(ocrRaw);
    const dateOk = foundDate ? withinAllowedWindow(foundDate) : false;

    // console.log("OCR Result:", ocrRaw);
    // console.log("Normalized OCR:", ocr);
    // console.log("Expected UPI:", expectedUpi);
    // console.log("UPI Match:", upiOk, "Amount Match:", amtOk, "Date Match:", dateOk);

    // ---------- If any check fails → redirect to failed page ----------
    if (!(upiOk && amtOk && dateOk)) {
        let reasons = [];
        if (!upiOk) reasons.push("UPI ID did not match");
        if (!amtOk) reasons.push("Payment amount did not match");
        if (!dateOk) reasons.push("Payment date not recent");

        // 📧 Notify owner about failed payment
        if (listing.owner && listing.owner.email) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: listing.owner.email,
                subject: "⚠ TraveX Booking Payment Failed",
                text: `A booking attempt for "${listing.title}" from ${booking.startDate} to ${booking.endDate} failed.Guest: ${booking.email} / ${booking.phone}Reason: ${reasons.join(", ")}`,
                attachments: req.file ? [
                    { filename: path.basename(req.file.path), path: req.file.path }
                ] : []
            });
        }

        return res.redirect(
            `/listings/${listing._id}/paymentFailed?reason=${encodeURIComponent(reasons.join(", "))}`
        );
    }

    // Mark booked dates
    listing.bookedDates = [...(listing.bookedDates || []), ...booking.price.newDates];
    await listing.save();

    // Save booking
    const confirmedBooking = new Booking({
        listing: listing._id,
        startDate: booking.startDate,
        endDate: booking.endDate,
        email: booking.email,
        phone: booking.phone,
        amount: {
            days: booking.price.days,
            baseCost: booking.price.baseCost,
            gst: booking.price.gst,
            totalCost: booking.price.totalCost
        },
        paymentStatus: "paid",
        screenshot: req.file ? req.file.filename : null
        // paymentScreenshotPath: req.file.path
    });
    await confirmedBooking.save();
    delete req.session.paymentVisited[listing._id]; 

    // Send email to user
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: booking.email,
        subject: "Travex Booking Confirmed ✅",
        text: `🎉 Congratulations! Your booking for "${listing.title}" is now confirmed. 

        📅 Dates: ${booking.startDate} → ${booking.endDate}
        📍 Location: ${listing.location || "Shared on Travex"}
        💰 Total Paid: ₹${booking.amount?.totalCost || "N/A"}

        We look forward to hosting you!  
        For any support, feel free to contact us.  

        - Team Travex`,
    //      attachments: listing.image ? [
    //     {
    //         filename: "listing.jpg",
    //         path: `${listing.image}`,   // path or URL to the listing image
    //     }
    // ] : []
    });

    // Notify owner
    if (listing.owner && listing.owner.email) {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: listing.owner.email,
            subject: "New Booking Confirmed on Travex 📢",
            text: `Good news! 🎉  A new booking has been confirmed for your listing:  🏡 "${listing.title}"  📅 Dates: ${booking.startDate} → ${booking.endDate}  👤 Guest: ${booking.name || "Guest"}  📧 Email: ${booking.email}  📞 Phone: ${booking.phone || "Not provided"}  💰 Amount Paid: ₹${booking.amount?.totalCost || "N/A"}  
            Please prepare to host your guest during the above period.  
            - Team Travex`
            ,
        attachments: req.file ? [
                    { filename: path.basename(req.file.path), path: req.file.path }
                ] : []
        });
    }

    res.render("listings/bookingSuccess.ejs", { listing, booking });
};


module.exports.failedPayment=async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).send("Listing not found");

    const reason = req.query.reason || "Unknown error during payment verification";

    res.render("listings/paymentFailed.ejs", { listing, reason });
};
