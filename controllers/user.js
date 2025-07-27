const User = require("../models/user.js");

module.exports.rederSignupForm=(req, res) => {
    res.render("./user/signup.ejs");
}

module.exports.userSignup=async (req, res) => {
    try {

        let { username, email, password } = req.body;
        const newUser = new User({
            email,
            username,
        })
        const registerdUser = await User.register(newUser, password);
        req.login(registerdUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to TraveX");
            res.redirect("/listings");
        })
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
}

module.exports.renderLoginForm=(req, res) => {
    res.render("./user/login.ejs");
}

module.exports.userLogin=async (req, res) => {
    req.flash("success", "Welcome back to Travex!")
    let redirectUrl=res.locals.redirectUrl || "/listings";
    return res.redirect(redirectUrl);
}

module.exports.userLogout=(req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Successfully Logged-Out!");
        res.redirect("/listings");
    })
}