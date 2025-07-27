// wrapasync function --> a function that takes the function as an argument and returns another function

module.exports=(fn)=>{
    return (req,res,next)=>{
        fn(req,res,next).catch((err)=>{
            let {message}=err;
            res.render("../views/error.ejs",{message});
        });
    }
}