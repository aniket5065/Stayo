const express = require('express')
const wrapAsync = require('../utils/wrapAsync.js')

const Listing = require('../models/listing.js');
const {isLoggedIn, isOwner, validateListing} = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer  = require('multer')
const {storage }= require("../cloudConfig.js");
const upload = multer({storage })


const router = express.Router();


router.route("/")
.get( wrapAsync (listingController.index))
.post( 
    isLoggedIn,
    
     upload.single("listing[image]"),
     validateListing,
    wrapAsync (listingController.createListings),
   
);


// new route
router.get("/new", isLoggedIn, listingController.renderNewForm );

router.route("/:id")
.get(wrapAsync ( listingController.showListing))
.put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync (listingController.updateListings))
.delete(isLoggedIn,isOwner,
     wrapAsync ( listingController.destroyListings)
   );


 // edit

router.get("/:id/edit", isLoggedIn, isOwner, 
    wrapAsync (listingController.editListing));

module.exports = router;

