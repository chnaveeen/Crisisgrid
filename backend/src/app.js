const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const shelterRoutes = require("./routes/shelterRoutes");
const volunteerRoutes = require("./routes/volunteerRoutes");
const resourceRequestRoutes = require("./routes/resourceRequestRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");

const app = express();

// ========================================
// MIDDLEWARE
// ========================================

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ========================================
// SWAGGER CONFIGURATION
// ========================================

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "CrisisGrid API",
            version: "1.0.0",
            description:
                "Emergency Resource Coordination Platform API"
        },

        servers: [
            {
                url: "http://localhost:5000"
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        }
    },

    apis: ["./src/routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);


// ========================================
// BASIC ROUTES
// ========================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "CrisisGrid API is running 🚨"
    });
});


app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "CrisisGrid backend is healthy",
        timestamp: new Date()
    });
});


// ========================================
// API ROUTES
// ========================================

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/incidents", incidentRoutes);

app.use("/api/resources", resourceRoutes);

app.use("/api/shelters", shelterRoutes);

app.use("/api/volunteers", volunteerRoutes);

app.use(
    "/api/resource-requests",
    resourceRequestRoutes
);

app.use(
    "/api/assignments",
    assignmentRoutes
);


// ========================================
// 404 HANDLER
// ========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});


// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});


module.exports = app;