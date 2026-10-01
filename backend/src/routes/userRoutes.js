const express = require("express");
const {
    authenticate,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get logged-in user's profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User authentication verified
 *       401:
 *         description: Authentication required
 */
router.get("/profile", authenticate, (req, res) => {
    res.json({
        success: true,
        message: "JWT authentication successful",
        user: req.user
    });
});


/**
 * @swagger
 * /api/users/admin-test:
 *   get:
 *     summary: Admin-only test endpoint
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access granted
 *       403:
 *         description: Admin access required
 */
router.get(
    "/admin-test",
    authenticate,
    authorizeRoles("admin"),
    (req, res) => {
        res.json({
            success: true,
            message: "Admin access granted",
            user: req.user
        });
    }
);

module.exports = router;
