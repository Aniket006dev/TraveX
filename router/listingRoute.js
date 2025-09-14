const express = require("express");
const router = express.Router(mergeParams = true);
const wrapAsync = require("../utils/wrapAsync.js");
const { isloggedIn, isOwner, validateListing} = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer=require("multer");
const {storage}=require("../cloudConfig.js");
const upload=multer({storage});

// index route & create route
router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post(isloggedIn, upload.single('listing[image]'), validateListing,wrapAsync(listingController.createListing))
   
// new route
router.get("/new", isloggedIn, listingController.renderNewForm);

// show route & update route
router.
    route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(isloggedIn, isOwner,upload.single('listing[image]'),
        /*validateListing*/ wrapAsync(listingController.updateListing));

// show route before login
router.get("/:id/logged/reviews", isloggedIn, listingController.showListingBeforeLogged);

// edit route
router.get("/:id/edit", isloggedIn, isOwner, wrapAsync(listingController.editListing));

// delete route
router.delete("/:id/delete", isloggedIn, isOwner, wrapAsync(listingController.distroyListing));


module.exports = router