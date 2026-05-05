const Booking = require("../models/booking");
const Listing = require("../models/listing");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports.createBooking = async (req, res) => {
    try {
        let { id } = req.params;
        let { checkIn, checkOut } = req.body;
        let listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const diffTime = Math.abs(checkOutDate - checkInDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const totalPrice = diffDays * listing.price;

        if (diffDays <= 0) {
            req.flash("error", "Check-out date must be after check-in date!");
            return res.redirect(`/listings/${id}`);
        }

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
        console.error(err);
        req.flash("error", "Could not create reservation.");
        res.redirect("back");
    }
};

module.exports.initializePayment = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId).populate("listing");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found." });
        }

        // Create actual Razorpay Order
        const options = {
            amount: booking.totalPrice * 100,
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
            key_id: process.env.RAZORPAY_KEY_ID,
            listingTitle: booking.listing.title,
            userName: req.user.username,
            userEmail: req.user.email
        });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Error initializing payment." });
    }
};

module.exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature === razorpay_signature) {
            await Booking.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                { paymentStatus: "Paid", razorpayPaymentId: razorpay_payment_id }
            );
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Payment verification failed." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error verifying payment." });
    }
};

module.exports.renderMyBookings = async (req, res) => {
    // Show ALL bookings for the user (Paid and Pending)
    const allBookings = await Booking.find({ user: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 });
    res.render("users/bookings.ejs", { allBookings });
};

module.exports.destroyBooking = async (req, res) => {
    const { bookingId } = req.params;
    await Booking.findByIdAndDelete(bookingId);
    req.flash("success", "Booking cancelled successfully.");
    res.redirect("/mybookings");
};
