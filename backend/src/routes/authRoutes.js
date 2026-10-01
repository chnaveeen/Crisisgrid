const express = require("express");

const {
    register,
    login
} = require("../controllers/authController");

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new CrisisGrid user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - password
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Naveen
 *               email:
 *                 type: string
 *                 example: naveen@example.com
 *               password:
 *                 type: string
 *                 example: Naveen@123
 *               role:
 *                 type: string
 *                 example: volunteer
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to CrisisGrid
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: naveen@example.com
 *               password:
 *                 type: string
 *                 example: Naveen@123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account is inactive
 */
router.post("/login", login);

module.exports = router;