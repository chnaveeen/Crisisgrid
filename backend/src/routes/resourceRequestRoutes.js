const express = require("express");

const router = express.Router();

const {
    createResourceRequest,
    getAllResourceRequests,
    getResourceRequestById,
    updateResourceRequest,
    deleteResourceRequest
} = require("../controllers/resourceRequestController");

const { authenticate } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Resource Requests
 *   description: Emergency resource request management
 */

/**
 * @swagger
 * /api/resource-requests:
 *   post:
 *     summary: Create a resource request
 *     tags: [Resource Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - incident_id
 *               - quantity
 *             properties:
 *               incident_id:
 *                 type: integer
 *                 example: 1
 *               resource_id:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 example: 50
 *               priority:
 *                 type: string
 *                 enum:
 *                   - low
 *                   - medium
 *                   - high
 *                   - critical
 *                 example: high
 *     responses:
 *       201:
 *         description: Resource request created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Incident or resource not found
 */
router.post("/", authenticate, createResourceRequest);

/**
 * @swagger
 * /api/resource-requests:
 *   get:
 *     summary: Get all resource requests
 *     tags: [Resource Requests]
 *     responses:
 *       200:
 *         description: Resource requests retrieved successfully
 */
router.get("/", getAllResourceRequests);

/**
 * @swagger
 * /api/resource-requests/{id}:
 *   get:
 *     summary: Get resource request by ID
 *     tags: [Resource Requests]
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
 *         description: Resource request retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource request not found
 */
router.get("/:id", authenticate, getResourceRequestById);

/**
 * @swagger
 * /api/resource-requests/{id}:
 *   put:
 *     summary: Update a resource request
 *     tags: [Resource Requests]
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
 *               quantity:
 *                 type: integer
 *                 example: 75
 *               priority:
 *                 type: string
 *                 enum:
 *                   - low
 *                   - medium
 *                   - high
 *                   - critical
 *               status:
 *                 type: string
 *                 enum:
 *                   - pending
 *                   - approved
 *                   - assigned
 *                   - completed
 *                   - rejected
 *     responses:
 *       200:
 *         description: Resource request updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource request not found
 */
router.put("/:id", authenticate, updateResourceRequest);

/**
 * @swagger
 * /api/resource-requests/{id}:
 *   delete:
 *     summary: Delete a resource request
 *     tags: [Resource Requests]
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
 *         description: Resource request deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource request not found
 */
router.delete("/:id", authenticate, deleteResourceRequest);

module.exports = router;