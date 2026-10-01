const express = require("express");

const router = express.Router();

const {
    createResource,
    getAllResources,
    getResourceById,
    updateResource,
    deleteResource
} = require("../controllers/resourceController");

const { authenticate } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Resources
 *   description: Emergency resource management
 */

/**
 * @swagger
 * /api/resources:
 *   post:
 *     summary: Create a new resource
 *     tags: [Resources]
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
 *               - resource_type
 *             properties:
 *               name:
 *                 type: string
 *                 example: Medical Kits
 *               resource_type:
 *                 type: string
 *                 example: Medical
 *               quantity:
 *                 type: integer
 *                 example: 100
 *               available_quantity:
 *                 type: integer
 *                 example: 80
 *               location:
 *                 type: string
 *                 example: Hyderabad
 *     responses:
 *       201:
 *         description: Resource created successfully
 *       400:
 *         description: Invalid resource data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.post(
    "/",
    authenticate,
    createResource
);

/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: Get all resources
 *     tags: [Resources]
 *     responses:
 *       200:
 *         description: Resources retrieved successfully
 */
router.get(
    "/",
    getAllResources
);

/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Resource retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource not found
 */
router.get(
    "/:id",
    authenticate,
    getResourceById
);

/**
 * @swagger
 * /api/resources/{id}:
 *   put:
 *     summary: Update a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
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
 *                 example: Medical Kits
 *               resource_type:
 *                 type: string
 *                 example: Medical
 *               quantity:
 *                 type: integer
 *                 example: 150
 *               available_quantity:
 *                 type: integer
 *                 example: 120
 *               location:
 *                 type: string
 *                 example: Hyderabad
 *     responses:
 *       200:
 *         description: Resource updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource not found
 */
router.put(
    "/:id",
    authenticate,
    updateResource
);

/**
 * @swagger
 * /api/resources/{id}:
 *   delete:
 *     summary: Delete a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Resource ID
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource not found
 */
router.delete(
    "/:id",
    authenticate,
    deleteResource
);

module.exports = router;