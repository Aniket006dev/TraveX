const express = require("express");
const wrapAsync = require("../utils/wrapAsync");
const router = express.Router();
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userController=require("../controllers/user.js");

// signup route
router
.route("/signup")
.get(userController.rederSignupForm)
.post(wrapAsync(userController.userSignup));

// login route
router.
route("/login").get(userController.renderLoginForm)
.post(saveRedirectUrl,
    passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
}), wrapAsync(userController.userLogin));

// logout route
router.get("/logout", userController.userLogout)

module.exports = router