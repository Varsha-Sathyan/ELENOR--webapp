// =====================================
// 1. LOAD ENVIRONMENT VARIABLES
// =====================================

require("dotenv").config();


// =====================================
// 2. IMPORT PACKAGES
// =====================================

const express = require("express");

const path = require("path");

const session = require("express-session");


// =====================================
// 3. IMPORT DATABASE
// =====================================

const connectDB = require("./src/config/database");


// =====================================
// 4. IMPORT MIDDLEWARE
// =====================================



// =====================================
// 5. CREATE EXPRESS APPLICATION
// =====================================

const app = express();


// =====================================
// 6. EJS CONFIGURATION
// =====================================

// Set EJS as the template engine

app.set("view engine", "ejs");


// Set views directory

app.set(
    "views",
    path.join(__dirname, "src", "views")
);


// =====================================
// 7. STATIC FILES
// =====================================

// Serve CSS, JavaScript and images
// from src/public

app.use(
    express.static(
        path.join(__dirname, "src", "public")
    )
);


// =====================================
// 8. BODY PARSER
// =====================================

// Parse HTML form data

app.use(
    express.urlencoded({
        extended: true, limit: "512kb"
    })
);


// Parse JSON requests

app.use(express.json());


// =====================================
// 9. SESSION CONFIGURATION
// =====================================

// Check SESSION_SECRET

if (!process.env.SESSION_SECRET) {

    throw new Error(
        "SESSION_SECRET is missing from .env"
    );

}


// Configure session

app.use(
    session({

        name: "elenor.sid",

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {

            httpOnly: true,

            sameSite: "lax",

            secure:
                process.env.NODE_ENV === "production",

            maxAge: 24 * 60 * 60 * 1000

        }

    })
);


// =====================================
// 10. AUTHENTICATION ROUTES
// =====================================

// Import signup, login and OTP routes

const authRoutes = require(
    "./src/routes/authRoutes"
);

// Register authentication routes

app.use("/", authRoutes);
app.use("/", require("./src/routes/userRoutes"));


// =====================================
// 11. DEFAULT ROUTE
// =====================================

// When user opens the website

app.get("/", (req, res) => {

    // If user is already logged in

    if (req.session && req.session.userId) {

        return res.redirect("/home");

    }


    // If user is not logged in

    return res.redirect("/signup");

});


// =====================================
// 12. PROTECTED HOMEPAGE
// =====================================

// User must be logged in to access homepage

app.use(require("./src/routes/storefrontRoutes"));


// =====================================
// 13. ADMIN DASHBOARD
// =====================================

// IMPORTANT:
// Add your admin authentication middleware
// before this route.

app.use("/admin", require("./src/routes/adminRoutes"));


// =====================================
// 14. 404 HANDLER
// =====================================

// If requested page does not exist

app.use(
    (req, res) => {

        res.status(404).render("404", {
            accountUrl: req.session?.userId ? "/profile" : "/login",
            signedIn: Boolean(req.session?.userId)
        });

    }
);


// =====================================
// 15. ERROR HANDLER
// =====================================

// Handle application errors

app.use(
    (err, req, res, next) => {

        console.error(
            "Application error:",
            err
        );


        res.status(500).send(
            "Something went wrong. Please try again."
        );

    }
);


// =====================================
// 16. SERVER CONFIGURATION
// =====================================

const PORT = process.env.PORT || 3000;


// =====================================
// 17. START SERVER
// =====================================

async function startServer() {

    try {

        // Connect to database first

        await connectDB();


        // Start Express server

        app.listen(
            PORT,
            () => {

                console.log(
                    `ELENOR server running at http://localhost:${PORT}`
                );

            }
        );


    } catch (error) {

        console.error(
            "Failed to start application:",
            error.message
        );


        process.exit(1);

    }

}


// =====================================
// 18. EXECUTE SERVER
// =====================================

startServer();
