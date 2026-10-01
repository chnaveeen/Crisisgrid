const express = require("express");

const {
    createIncident,
    getAllIncidents,
    getIncidentById,
    updateIncident,
    deleteIncident
} = require("../controllers/incidentController");

const {
    authenticate,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();


/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: Create a new emergency incident
 *     tags:
 *       - Incidents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - incident_type
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 example: Flood Emergency
 *               description:
 *                 type: string
 *                 example: Heavy flooding reported in a residential area
 *               incident_type:
 *                 type: string
 *                 example: Flood
 *               severity:
 *                 type: string
 *                 enum:
 *                   - low
 *                   - medium
 *                   - high
 *                   - critical
 *                 example: high
 *               location:
 *                 type: string
 *                 example: Hyderabad
 *               latitude:
 *                 type: number
 *                 format: double
 *                 example: 17.385
 *               longitude:
 *                 type: number
 *                 format: double
 *                 example: 78.4867
 *     responses:
 *       201:
 *         description: Incident created successfully
 *       400:
 *         description: Required fields are missing
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.post(
    "/",
    authenticate,
    authorizeRoles(
        "admin",
        "control_center",
        "field_responder",
        "volunteer"
    ),
    createIncident
);


/**
 * @swagger
 * /api/incidents:
 *   get:
 *     summary: Get all emergency incidents
 *     tags:
 *       - Incidents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all incidents
 *       401:
 *         description: Authentication required
 */
router.get(
    "/",
    authenticate,
    getAllIncidents
);


/**
 * @swagger
 * /api/incidents/{id}:
 *   get:
 *     summary: Get incident by ID
 *     tags:
 *       - Incidents
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
 *         description: Incident found
 *       404:
 *         description: Incident not found
 *       401:
 *         description: Authentication required
 */
router.get(
    "/:id",
    authenticate,
    getIncidentById
);


/**
 * @swagger
 * /api/incidents/{id}:
 *   put:
 *     summary: Update an emergency incident
 *     tags:
 *       - Incidents
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
 *               title:
 *                 type: string
 *                 example: Updated Flood Emergency
 *               description:
 *                 type: string
 *                 example: Updated incident description
 *               incident_type:
 *                 type: string
 *                 example: Flood
 *               severity:
 *                 type: string
 *                 enum:
 *                   - low
 *                   - medium
 *                   - high
 *                   - critical
 *                 example: critical
 *               location:
 *                 type: string
 *                 example: Hyderabad
 *               latitude:
 *                 type: number
 *                 example: 17.385
 *               longitude:
 *                 type: number
 *                 example: 78.4867
 *               status:
 *                 type: string
 *                 enum:
 *                   - reported
 *                   - verified
 *                   - assigned
 *                   - in_progress
 *                   - resolved
 *                   - closed
 *                 example: verified
 *     responses:
 *       200:
 *         description: Incident updated successfully
 *       404:
 *         description: Incident not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.put(
    "/:id",
    authenticate,
    authorizeRoles(
        "admin",
        "control_center",
        "field_responder"
    ),
    updateIncident
);


/**
 * @swagger
 * /api/incidents/{id}:
 *   delete:
 *     summary: Delete an emergency incident
 *     tags:
 *       - Incidents
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
 *         description: Incident deleted successfully
 *       404:
 *         description: Incident not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.delete(
    "/:id",
    authenticate,
    authorizeRoles(
        "admin",
        "control_center"
    ),
    deleteIncident
);


module.exports = router;