if(process.env.NODE_ENV!= "production"){
    require('dotenv').config();

}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const listingsRoute=require("./router/listingRoute.js");
const reviewRoute=require("./router/reviewRoute.js");
const ExpressError = require("./utils/expressError.js");
const session=require("express-session");
const MongoStore = require('connect-mongo');
const flash=require("connect-flash");
const passport=require("passport");
const localStrategy=require("passport-local");
const User=require("./models/user.js");
const userRoute=require("./router/userRoute.js");
const bookingRoute=require("./router/bookings.js");

const cloudDBUrl=process.env.ATLASDB_URL;

main().then(() => {
    console.log("connected to DB");
}).catch((err) => console.log(err));

async function main() {
    await mongoose.connect(cloudDBUrl);
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

const store=MongoStore.create({
    mongoUrl:cloudDBUrl,
    crypto:{
        secret: process.env.SECRET
    },
    touchAfter: 24*3600,
})

store.on("error",()=>{
    console.log("Error in MONGO SESSION STORE", err);
});

app.use(session({
    store,
    secret: process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+7*24*60*60,
        maxAge:7*24*60*60,
        httpOnly:true
    }
}))

// root route
app.get("/", (req, res) => {
    res.redirect("/listings");
});


app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

app.use((req,res,next)=>{
    res.locals.successMsg=req.flash("success");
    res.locals.failureMsg=req.flash("error");
    res.locals.currUser=req.user;
    // res.locals.redirectUrl=req.session.redirectUrl;
    next();
});

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// listings route
app.use("/listings",listingsRoute)


// Review route
app.use("/listings/:id",reviewRoute)

//booking route
app.use("/listings",bookingRoute)


// signup route & login route
app.use("/",userRoute);

// handels non specified routes
app.use((req, res, next) => {
    next(new ExpressError(404, "page not found"));
})

// error handeller middleware
app.use((err, req, res, next) => {
    let { statusCode, message } = err;
    res.status(statusCode || 400).render("error.ejs", { message });
})

// server setup
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is listening at ${port}`);
});

