const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const bookingController = require("../controllers/booking.js");

// Create initial reservation (via listings route)
router.post("/", isLoggedIn, wrapAsync(bookingController.createBooking));

// My Bookings page (Global)
router.get("/mybookings", isLoggedIn, wrapAsync(bookingController.renderMyBookings));

// Initialize payment for a pending booking (Global)
router.get("/pay/:bookingId", isLoggedIn, wrapAsync(bookingController.initializePayment));

// Verify payment (Global)
router.post("/verify", isLoggedIn, wrapAsync(bookingController.verifyPayment));

// Cancel booking (Global)
router.delete("/mybookings/:bookingId", isLoggedIn, wrapAsync(bookingController.destroyBooking));

module.exports = router;
