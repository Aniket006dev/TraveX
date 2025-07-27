const Review = require("../models/review.js");
const listing = require("../models/listing.js");

module.exports.createReview=async(req,res)=>{
    let list=await listing.findById(req.params.id);
    let review=await Review.insertOne(req.body.review);
    list.reviews.push(review);
    review.author=req.user._id;
    await review.save();
    await list.save();
    req.flash("success","Review Added!!");
    res.redirect(`/listings/${req.params.id}`)
}

module.exports.destroyReview=async(req,res)=>{
    let {id,reviewId}=req.params;
    await listing.findByIdAndUpdate(id, {$pull:{reviews:reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("success","Review Deleted!!");
    res.redirect(`/listings/${req.params.id}`)
}