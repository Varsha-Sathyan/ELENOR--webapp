const express = require("express");
const router = express.Router();

// ==========================================
// LOGIN PAGE
// ==========================================
router.get("/login", (req, res) => {
    if (req.session?.userId) {
        return res.redirect("/home");
    }

    res.render("auth/login", {
        error: null
    });
});

// ==========================================
// SIGNUP PAGE
// ==========================================
router.get("/signup", (req, res) => {
    if (req.session?.userId) {
        return res.redirect("/home");
    }

    res.render("auth/signup", {
        error: null
    });
});

// ==========================================
// PROCESS SIGNUP
// ==========================================
router.post("/signup", async (req, res) => {
    try {
        const {
            fullName,
            email,
            password,
            confirmPassword,
            referralId
        } = req.body;

        // Check required fields
        if (!fullName || !email || !password || !confirmPassword) {
            return res.status(400).render("auth/signup", {
                error: "Please fill in all required fields."
            });
        }

        // Check password confirmation
        if (password !== confirmPassword) {
            return res.status(400).render("auth/signup", {
                error: "Passwords do not match."
            });
        }

        // TODO:
        // 1. Check whether email already exists in database.
        // 2. Hash the password using bcrypt.
        // 3. Generate a 6-digit OTP.
        // 4. Send OTP using your email configuration.
        // 5. Store pending signup details securely.
        // 6. Redirect to OTP verification.

        return res.redirect("/verify-otp");

    } catch (error) {
        console.error("Signup error:", error);

        return res.status(500).render("auth/signup", {
            error: "Something went wrong. Please try again."
        });
    }
});

// ==========================================
// OTP VERIFICATION PAGE
// ==========================================
router.get("/verify-otp", (req, res) => {

    // Check whether signup has been initiated
    if (!req.session.pendingSignup) {
        return res.redirect("/signup");
    }

    res.render("auth/verify-otp", {
        error: null
    });
});

// ==========================================
// VERIFY OTP
// ==========================================
router.post("/verify-otp", async (req, res) => {
    try {
        const { otp } = req.body;

        // Check pending signup
        if (!req.session.pendingSignup) {
            return res.redirect("/signup");
        }

        // TODO:
        // 1. Compare entered OTP with generated OTP.
        // 2. Check OTP expiration.
        // 3. Save verified user to database.
        // 4. Remove pending signup data.
        // 5. Redirect to login.

        return res.redirect("/login");

    } catch (error) {
        console.error("OTP verification error:", error);

        return res.status(500).render("auth/verify-otp", {
            error: "OTP verification failed. Please try again."
        });
    }
});

module.exports = router;














// const express = require("express");

// const router = express.Router();

// // LOGIN PAGE
// router.get("/login", (req, res) => {
//     if (req.session?.userId) {
//         return res.redirect("/home");
//     }

//     res.render("auth/login", {
//         error: null
//     });
// });

// // SIGNUP PAGE
// router.get("/signup", (req, res) => {
//     if (req.session?.userId) {
//         return res.redirect("/home");
//     }

//     res.render("auth/signup");
// });

// module.exports = router;
