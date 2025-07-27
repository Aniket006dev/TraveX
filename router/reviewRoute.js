const express=require("express");
const route=express.Router({mergeParams:true});
const wrapAsync = require("../utils/wrapAsync.js");
const {validateReview,isloggedIn,isReviewAuthor}=require("../middleware.js");
const reviewController=require("../controllers/review.js");

// Review post route
route.post("/reviews",isloggedIn,validateReview,wrapAsync(reviewController.createReview));

// Delete Review route
route.delete("/reviews/:reviewId",isloggedIn,isReviewAuthor,wrapAsync(reviewController.destroyReview))

module.exports=route;