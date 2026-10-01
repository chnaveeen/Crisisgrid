const express = require("express");

const router = express.Router();

const {
    createVolunteer,
    getAllVolunteers,
    getVolunteerById,
    updateVolunteer,
    deleteVolunteer
} = require("../controllers/volunteerController");

const { authenticate } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Volunteers
 *   description: Emergency volunteer management
 */

/**
 * @swagger
 * /api/volunteers:
 *   post:
 *     summary: Create a volunteer
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               skills:
 *                 type: string
 *                 example: First Aid, Rescue, Driving
 *               availability:
 *                 type: string
 *                 enum:
 *                   - available
 *                   - busy
 *                   - unavailable
 *                 example: available
 *               location:
 *                 type: string
 *                 example: Hyderabad
 *     responses:
 *       201:
 *         description: Volunteer created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: User not found
 *       409:
 *         description: Volunteer already exists
 */
router.post("/", authenticate, createVolunteer);

/**
 * @swagger
 * /api/volunteers:
 *   get:
 *     summary: Get all volunteers
 *     tags: [Volunteers]
 *     responses:
 *       200:
 *         description: Volunteers retrieved successfully
 */
router.get("/", getAllVolunteers);

/**
 * @swagger
 * /api/volunteers/{id}:
 *   get:
 *     summary: Get volunteer by ID
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Volunteer retrieved successfully
 *       404:
 *         description: Volunteer not found
 */
router.get("/:id", authenticate, getVolunteerById);

/**
 * @swagger
 * /api/volunteers/{id}:
 *   put:
 *     summary: Update volunteer
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skills:
 *                 type: string
 *                 example: First Aid, Rescue
 *               availability:
 *                 type: string
 *                 enum:
 *                   - available
 *                   - busy
 *                   - unavailable
 *               location:
 *                 type: string
 *                 example: Hyderabad
 *     responses:
 *       200:
 *         description: Volunteer updated successfully
 *       404:
 *         description: Volunteer not found
 */
router.put("/:id", authenticate, updateVolunteer);

/**
 * @swagger
 * /api/volunteers/{id}:
 *   delete:
 *     summary: Delete volunteer
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Volunteer deleted successfully
 *       404:
 *         description: Volunteer not found
 */
router.delete("/:id", authenticate, deleteVolunteer);

module.exports = router;