if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const router=express.Router({mergeParams:true});
const multer = require("multer");
const path = require("path");
const {isloggedIn}=require("../middleware");
const bookingController=require("../controllers/booking");
const paymentController=require("../controllers/payment");
const {storage}=require("../cloudConfig.js");
const upload=multer({storage});


// ---------- Multer setup (for screenshot uploads) ----------
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, "uploads/payments");
//     },
//     filename: (req, file, cb) => {
//         cb(
//             null,
//             Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)
//         );
//     }
// });


// ---------- Show booking form ----------
router.get("/:id/book",isloggedIn, bookingController.showBookingForm);

// ---------- Handle booking form → Show QR & Upload option ----------
router.post("/:id/book",isloggedIn, bookingController.bookingFormPost);

router.get("/:id/payment", paymentController.showPaymentPage);

// ---------- Confirm payment with Screenshot Upload ----------
router.post("/:id/confirm",isloggedIn, upload.single("paymentProof"), paymentController.confirmPayment);

// ---------- failed payment route----------
router.get("/:id/paymentFailed", paymentController.failedPayment);


module.exports = router;
