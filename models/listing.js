const mongoose =require("mongoose");
const Schema=mongoose.Schema;
const Review=require("./review.js");

const listingSchema=new Schema({
    title:{
        type:String,
        required:true,
    },
    description: String,
    image:{
       url:String,
       filename:String,
    },
    price:Number,
    location:String,
    coordinates:{
        lat:Number,
        lng:Number
    },
    country:String,
    category:{
        type:String,
        enum:["top choices", "popular cities","island","arctic","affordable","mountains","holiday hub"]
    },
    reviews:[{
        type:Schema.Types.ObjectId,
        ref:"Review"
    }],
    owner:{
    type:Schema.Types.ObjectId,
    ref:"User",
    }
});


listingSchema.post("findOneAndDelete",async(list)=>{
    if(list){
        await Review.deleteMany({_id:{$in: list.reviews}});
    }
});

const listing=mongoose.model("listing",listingSchema);
module.exports=listing;