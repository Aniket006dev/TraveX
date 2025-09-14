const listing = require("./models/listing.js");
const Review = require("./models/review.js");
const { listingSchema,reviewSchema} = require("./Schema.js");
const ExpressError=require("./utils/expressError.js");

module.exports.isloggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","Please do login first!");
        return res.redirect("/login");
    }
    next();
}

module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl=req.session.redirectUrl;
    }
    next();
}

module.exports.isOwner=async(req,res,next)=>{
    let {id}=req.params;
    let list =await listing.findById(id);
    if(!list.owner._id.equals(res.locals.currUser._id)){
        req.flash("error","You are not authorrised for this action!");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

module.exports.isReviewAuthor=async(req,res,next)=>{
    let {id,reviewId}=req.params;
    console.log(reviewId)
    let review =await Review.findById(reviewId);
    console.log(review);
    if(!review.author.equals(req.user._id)){
        req.flash("error","You are not authorrised for this action!");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

module.exports.validateListing=function validateListing(req,res,next){
    let{error} = listingSchema.validate(req.body);
    if(error){
        let errMsg=error.details.map((e)=>e.message).join(",");
        throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
}

module.exports.validateReview=function validateReview(req,res,next){
    let{error} = reviewSchema.validate(req.body);
    if(error){
        let errMsg=error.details.map((e)=>e.message).join(",");
        throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
};

