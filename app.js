const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require('ejs-mate');
const ExpressError = require('./utils/ExpressError.js');
const session = require("express-session");  
const MongoStore = require('connect-mongo');
const flash = require("connect-flash")
const passport = require("passport");
const LocalStrategy = require("passport-local")
const User = require("./models/user.js");




const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter  = require("./routes/user.js")
const { Passport } = require('passport');



const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/Wanderlust";

main().then(() =>{
    console.log("connected to db");
}).catch(err =>{
    console.error("Database Connection Error:", err.message);
    if (err.code === 'ENOTFOUND') {
        console.error("TIP: Your machine cannot reach the MongoDB Atlas host. Check your internet connection or IP whitelisting.");
    }
});


async function main() {
    await mongoose.connect(dbUrl);
}
app.set("view engine", "ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,   
});
store.on("error", function(e){
    console.log("session store error", e)
});

const sessionOption  = {
    secret : process.env.SECRET,
    resave: false,
    saveUninitialized :true,
    cookie: {
        expires: Date.now() * 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly : true,
    },
};

app.get("/",(req, res) =>{
    res.redirect("/listings");
})





app.use(session(sessionOption)); 
app.use(flash());

app.use(passport.initialize());
app.use(passport.session()); 
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
 





app.use((req, res, next)=>{
 res.locals.success = req.flash("success")
 res.locals.error = req.flash("error")
 res.locals.currUser = req.user;
 
 next();  
});




app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/",userRouter);

app.use((err, req, res, next) => {
    let { statusCode=500, message="something went wrong" } = err;
    res.status(statusCode).render("layouts/error.ejs", { statusCode, message, error: err });
});

if (process.env.NODE_ENV !== "production") {
    app.listen(8080, () => {
        console.log("server is listning to port 8080");
    });
}

module.exports = app;