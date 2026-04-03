const express = require('express')
const wrapAsync = require('../utils/wrapAsync.js')
const ExpressError = require('../utils/ExpressError.js');
const Review = require('../models/review.js');
const Listing = require('../models/listing.js');
const {validateReview, isLoggedIn, isAuthor} = require("../middleware.js");
const reviewController = require("../controllers/review.js");
const router = express.Router({mergeParams: true});

 
//Reviews
router.post("/", validateReview, isLoggedIn, wrapAsync(reviewController.createReview ));


// delete review route
router.delete("/:reviewId",isLoggedIn, isAuthor,wrapAsync(reviewController.deleteReview));





module.exports = router;
  