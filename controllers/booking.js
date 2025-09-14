const Listing = require("../models/listing");
const Booking = require("../models/booking");

module.exports.showBookingForm= async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).send("Listing not found");

    //  Fetch all bookings for this listing
    const bookings = await Booking.find({ listing: listing._id });

    let disabledDates = [];
    let today = new Date();

    bookings.forEach(b => {
        let start = new Date(b.startDate);
        let end = new Date(b.endDate);

        // Only disable if booking endDate >= today
        if (end >= today) {
            let temp = new Date(start);
            while (temp <= end) {
                disabledDates.push(temp.toISOString().split("T")[0]);
                temp.setDate(temp.getDate() + 1);
            }
        }
    });

    res.render("listings/bookingForm.ejs", { listing, disabledDates });
};


module.exports.bookingFormPost=async (req, res) => {
    const { startDate, endDate, email, phone, agree } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) return res.status(404).send("Listing not found");
    if (!agree) {
        req.flash("error", "You must agree to terms");
        return res.redirect(`/listings/${req.params.id}/book`);
    }

    // Check if dates overlap
    const overlappingBooking = await Booking.findOne({
        listing: listing._id,
        $or: [
            { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
    });
    if (overlappingBooking) {
        req.flash("error", "⚠️ These dates are already booked");
        return res.redirect(`/listings/${req.params.id}/book`);
    }
    // Generate booked dates array
    let newDates = [];
    let start = new Date(startDate);
    let end = new Date(endDate);

    while (start <= end) {
        let d = start.toISOString().split("T")[0];
        newDates.push(d);
        start.setDate(start.getDate() + 1);
    }


    // Cost calculation
    const days = newDates.length;
    const baseCost = listing.price * days;
    const gst = Math.round(baseCost * 0.18);
    const totalCost = baseCost + gst;

    const priceBreakdown = { days, baseCost, gst, totalCost, newDates };


    // Generate UPI QR (dynamic per owner)
    const upiId = listing.ownerUpiId;
    if (!upiId) {
        req.flash("error", "Host has not set up payments yet");
        return res.redirect(`/listings/${req.params.id}/book`);
    }

    // Store booking in session (unconfirmed)
    req.session.booking = {
        listingId: listing._id,
        startDate,
        endDate,
        email,
        phone,
        price: priceBreakdown,
        createdAt: Date.now(),
        upiId
    };

    res.redirect(`/listings/${listing._id}/payment`);
};
