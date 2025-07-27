const listing = require("../models/listing.js");


const fetch = require("node-fetch");

async function geocodeLocation(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TaveX (Aniket@TaveX.com)' // Required by Nominatim
    }
  });
  const data = await response.json();

  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } else {
    return null;
  }
}

// module.exports.index=async(req,res)=>{
//   const allListings = await listing.find({});
//   res.render("listings/index.ejs", {
//       allListings,
//       // currentCategory: category,
//       // searchQuery: search
//     });
// }

module.exports.index = async (req, res) => {
  let allListings;
  const { category, search } = req.query;
  let query = {};
  if (category) {
    query.category = category;
  }
  let searchRegex;
  if (search && search.trim() !== "") {
    if(!isNaN(parseFloat(search))){
      query.price={ $lte: parseFloat(search)};
    }
    else{
      searchRegex = new RegExp(search, "i"); // case-insensitive
      query.$or = [
        { title: searchRegex },
        { location: searchRegex },
        { category: searchRegex },
        { country: searchRegex },
      ];

    }
  }
  const categoryListings = await listing.find(query);
  const normalListings = await listing.find({});
  // console.log(query, categoryListings, normalListings);
  if(categoryListings.length===0 && Object.keys(query).length !== 0){
    req.flash("error", "No result found!!");
    res.redirect("/listings");
  }
  else{
    if(categoryListings.length!=0){
      allListings=categoryListings;
    }
    else{
      allListings=normalListings;
    }
    res.render("listings/index.ejs", {
      allListings,
      // currentCategory: category,
      // searchQuery: search
    });

  }

}

module.exports.renderNewForm = (req, res) => {

    res.render("listings/new.ejs");
}

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    let list = await listing.findById(id).
        populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");
    if (!list) {
        req.flash("error", "Listing does not exist!!");
        res.redirect("/listings");
    } else {
        res.render("listings/show.ejs", { list});
    }
}

module.exports.showListingBeforeLogged = async (req, res) => {
    let { id } = req.params;
    let list = await listing.findById(id).populate({ path: "reviews", populate: { path: "author" } }).populate("owner");
    res.render("listings/show.ejs", { list });
}

module.exports.createListing = async (req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;
    const list = new listing(req.body.listing);
    list.owner = req.user._id;
    list.image = { url, filename };


    //  🧭 Geocode location
    const location = req.body.listing.location;
    const coordinates = await geocodeLocation(location);

    list.coordinates = coordinates || { lat: 0, lng: 0 }; // default fallback

    await list.save();
    req.flash("success", "New listing Added !!");
    res.redirect("/listings");
}

module.exports.editListing = async (req, res) => {
    let { id } = req.params;
    let list = await listing.findById(id);
    if (!list) {
        req.flash("error", "Listing does not exist!!");
        res.redirect("/listings");
    } else {
        let originalImageUrl = list.image.url
        originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
        res.render("listings/update.ejs", { list, originalImageUrl });

    }
}

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let list = await listing.findByIdAndUpdate(id, { ...req.body.listing });
    if (typeof req.file !=="undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        list.image = { url, filename };
        await list.save();
    }
    req.flash("success", "Listing Edited successfully!!");
    res.redirect(`/listings/${id}`);
}

module.exports.distroyListing = async (req, res) => {
    let { id } = req.params;
    await listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted successfully!!")
    res.redirect("/listings");
}