const express = require("express");

const router = express.Router();

const {
    createAssignment,
    getAllAssignments,
    getAssignmentById,
    updateAssignment,
    deleteAssignment
} = require("../controllers/assignmentController");

const { authenticate } = require("../middleware/authMiddleware");


// ========================================
// SWAGGER TAG
// ========================================

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Emergency resource assignment management
 */


// ========================================
// CREATE ASSIGNMENT
// ========================================

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource_request_id
 *               - assigned_quantity
 *             properties:
 *               resource_request_id:
 *                 type: integer
 *                 example: 1
 *               volunteer_id:
 *                 type: integer
 *                 example: 1
 *               responder_id:
 *                 type: integer
 *                 example: 2
 *               assigned_quantity:
 *                 type: integer
 *                 example: 25
 *               notes:
 *                 type: string
 *                 example: Deliver medical kits to shelter
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Resource request, volunteer or responder not found
 */

router.post(
    "/",
    authenticate,
    createAssignment
);


// ========================================
// GET ALL ASSIGNMENTS
// ========================================

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: Get all assignments
 *     tags: [Assignments]
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully
 */

router.get(
    "/",
    getAllAssignments
);


// ========================================
// GET ASSIGNMENT BY ID
// ========================================

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get assignment by ID
 *     tags: [Assignments]
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
 *         description: Assignment retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Assignment not found
 */

router.get(
    "/:id",
    authenticate,
    getAssignmentById
);


// ========================================
// UPDATE ASSIGNMENT
// ========================================

/**
 * @swagger
 * /api/assignments/{id}:
 *   put:
 *     summary: Update an assignment
 *     tags: [Assignments]
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
 *               assigned_quantity:
 *                 type: integer
 *                 example: 30
 *               status:
 *                 type: string
 *                 enum:
 *                   - assigned
 *                   - accepted
 *                   - in_progress
 *                   - completed
 *                   - cancelled
 *                 example: in_progress
 *               notes:
 *                 type: string
 *                 example: Team has started delivery
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       400:
 *         description: Invalid assignment status or quantity
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Assignment not found
 */

router.put(
    "/:id",
    authenticate,
    updateAssignment
);


// ========================================
// DELETE ASSIGNMENT
// ========================================

/**
 * @swagger
 * /api/assignments/{id}:
 *   delete:
 *     summary: Delete an assignment
 *     tags: [Assignments]
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
 *         description: Assignment deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Assignment not found
 */

router.delete(
    "/:id",
    authenticate,
    deleteAssignment
);


module.exports = router;