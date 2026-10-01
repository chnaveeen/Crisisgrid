const express = require("express");

const router = express.Router();

const {
    createShelter,
    getAllShelters,
    getShelterById,
    updateShelter,
    deleteShelter
} = require("../controllers/shelterController");

const { authenticate } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Shelters
 *   description: Emergency shelter management
 */

/**
 * @swagger
 * /api/shelters:
 *   post:
 *     summary: Create a new shelter
 *     tags: [Shelters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *                 example: Hyderabad Relief Shelter
 *               location:
 *                 type: string
 *                 example: Hyderabad
 *               capacity:
 *                 type: integer
 *                 example: 500
 *               occupied:
 *                 type: integer
 *                 example: 120
 *               contact_number:
 *                 type: string
 *                 example: 9876543210
 *     responses:
 *       201:
 *         description: Shelter created successfully
 *       400:
 *         description: Invalid shelter data
 *       401:
 *         description: Authentication required
 */
router.post(
    "/",
    authenticate,
    createShelter
);

/**
 * @swagger
 * /api/shelters:
 *   get:
 *     summary: Get all shelters
 *     tags: [Shelters]
 *     responses:
 *       200:
 *         description: Shelters retrieved successfully
 */
router.get(
    "/",
    getAllShelters
);

/**
 * @swagger
 * /api/shelters/{id}:
 *   get:
 *     summary: Get shelter by ID
 *     tags: [Shelters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Shelter retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Shelter not found
 */
router.get(
    "/:id",
    authenticate,
    getShelterById
);

/**
 * @swagger
 * /api/shelters/{id}:
 *   put:
 *     summary: Update a shelter
 *     tags: [Shelters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               occupied:
 *                 type: integer
 *               contact_number:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum:
 *                   - open
 *                   - full
 *                   - closed
 *     responses:
 *       200:
 *         description: Shelter updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Shelter not found
 */
router.put(
    "/:id",
    authenticate,
    updateShelter
);

/**
 * @swagger
 * /api/shelters/{id}:
 *   delete:
 *     summary: Delete a shelter
 *     tags: [Shelters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Shelter deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Shelter not found
 */
router.delete(
    "/:id",
    authenticate,
    deleteShelter
);

module.exports = router;