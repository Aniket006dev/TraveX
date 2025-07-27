if(process.env.NODE_ENV != "production"){
    require("dotenv").config({ path: __dirname + '/../.env' });

}

const mongoose = require("mongoose");
const Listing = require("../models/listing");
const fetch = require("node-fetch");

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(process.env.ATLASDB_URL);
  console.log("MongoDB connected ✅");

  // Find all listings with missing or zero coordinates
  const listings = await Listing.find({
    $or: [
      { coordinates: { $exists: false } },
      { "coordinates.lat": 0 },
      { "coordinates.lng": 0 }
    ]
  });

  // console.log(Found ${listings.length} listings to update.);

  for (let listing of listings) {
    if (!listing.location) continue;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(listing.location)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TaveX - CoordinateFixer'
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      listing.coordinates = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
      await listing.save();
      console.log(`✅ Updated: ${listing.title}`);
    } else {
      console.log(`❌ Could not geocode: ${listing.title}`);
    }
  }

  console.log("✅ All done!");
  mongoose.connection.close();
}


