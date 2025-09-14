if(process.env.NODE_ENV != "production"){
    require("dotenv").config({ path: __dirname + '/../.env' });

}


const mongoose = require("mongoose");
const initdata = require("./data.js");
const listing = require("../models/listing.js");


const cloudDBUrl=process.env.ATLASDB_URL;

main().then((res) => {
    console.log("connection stablished");
}).catch((err) => console.log(err));

async function main() {
    await mongoose.connect(cloudDBUrl);
};

const categories=["top choices", "popular cities","island","arctic","affordable","mountains","holiday hub"]
function assignCategoryByIndex(index) {
  return categories[index % categories.length];
}
const listingdata = async () => {
    initdata.data = initdata.data.map((obj,index) => ({
        ...obj, owner: '687e8e0f66262bd321f12260' , category: assignCategoryByIndex(index), ownerUpiId:'9336546396@axl', bookedDates: [],
    }));
    await listing.deleteMany({});
    await listing.insertMany(initdata.data);
}

listingdata();