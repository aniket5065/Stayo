const Booking = require("../models/booking");
const Listing = require("../models/listing");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Check for required env variables to avoid startup crashes
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

let razorpay;
if (key_id && key_secret) {
    razorpay = new Razorpay({
        key_id: key_id,
        key_secret: key_secret,
    });
}

module.exports.createBooking = async (req, res) => {
    try {
        let { id } = req.params;
        let { checkIn, checkOut } = req.body;
        
        if (!checkIn || !checkOut) {
            req.flash("error", "Please select both check-in and check-out dates.");
            return res.redirect(`/listings/${id}`);
        }

        let listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        
        if (isNaN(checkInDate) || isNaN(checkOutDate)) {
            req.flash("error", "Invalid dates selected.");
            return res.redirect(`/listings/${id}`);
        }

        const diffTime = Math.abs(checkOutDate - checkInDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
            req.flash("error", "Check-out date must be after check-in date!");
            return res.redirect(`/listings/${id}`);
        }

        const totalPrice = diffDays * listing.price;

        // Just create a Pending booking without Razorpay order for now
        const newBooking = new Booking({
            listing: id,
            user: req.user._id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            totalPrice: totalPrice,
            razorpayOrderId: "temp_" + Date.now(), // Temporary until payment initialized
            paymentStatus: "Pending",
        });

        await newBooking.save();
        req.flash("success", "Stay reserved! Please complete the payment to confirm your booking.");
        res.redirect("/mybookings");

    } catch (err) {
        console.error("Create Booking Error:", err);
        req.flash("error", "Could not create reservation. Please try again.");
        res.redirect("/listings");
    }
};

module.exports.initializePayment = async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        if (!razorpay) {
            return res.json({ 
                success: false, 
                message: "Payment system not configured. Please add Razorpay keys to environment variables." 
            });
        }

        const booking = await Booking.findById(bookingId).populate("listing");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found." });
        }

        // Create actual Razorpay Order
        const options = {
            amount: Math.round(booking.totalPrice * 100), // Ensure it's an integer
            currency: "INR",
            receipt: `receipt_${booking._id}`,
        };

        const order = await razorpay.orders.create(options);
        
        // Update booking with real Order ID
        booking.razorpayOrderId = order.id;
        await booking.save();

        res.json({
            success: true,
            order,
            key_id: key_id,
            listingTitle: booking.listing.title,
            userName: req.user.username,
            userEmail: req.user.email
        });
    } catch (err) {
        console.error("Initialize Payment Error:", err);
        res.json({ success: false, message: "Error initializing payment: " + err.message });
    }
};

module.exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!key_secret) {
            return res.json({ success: false, message: "Payment verification failed: Secret key missing." });
        }

        const hmac = crypto.createHmac("sha256", key_secret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature === razorpay_signature) {
            await Booking.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                { paymentStatus: "Paid", razorpayPaymentId: razorpay_payment_id }
            );
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Payment verification failed: Signature mismatch." });
        }
    } catch (err) {
        console.error("Verify Payment Error:", err);
        res.status(500).json({ success: false, message: "Error verifying payment: " + err.message });
    }
};

module.exports.renderMyBookings = async (req, res) => {
    try {
        const allBookings = await Booking.find({ user: req.user._id })
            .populate("listing")
            .sort({ createdAt: -1 });
        res.render("users/bookings.ejs", { allBookings });
    } catch (err) {
        console.error("Render Bookings Error:", err);
        req.flash("error", "Error loading bookings.");
        res.redirect("/listings");
    }
};

module.exports.destroyBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        await Booking.findByIdAndDelete(bookingId);
        req.flash("success", "Booking cancelled successfully.");
        res.redirect("/mybookings");
    } catch (err) {
        console.error("Destroy Booking Error:", err);
        req.flash("error", "Could not cancel booking.");
        res.redirect("/mybookings");
    }
};
