const { pool } = require("../config/database");

// ========================================
// CREATE ASSIGNMENT
// ========================================

const createAssignment = async (req, res) => {
    try {
        const {
            resource_request_id,
            volunteer_id,
            responder_id,
            assigned_quantity,
            notes
        } = req.body;

        if (!resource_request_id || !assigned_quantity) {
            return res.status(400).json({
                success: false,
                message:
                    "Resource request ID and assigned quantity are required"
            });
        }

        if (assigned_quantity <= 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Assigned quantity must be greater than 0"
            });
        }

        // Check resource request
        const [requests] = await pool.execute(
            `SELECT id, quantity, status
             FROM resource_requests
             WHERE id = ?`,
            [resource_request_id]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource request not found"
            });
        }

        // Check volunteer if provided
        if (volunteer_id) {
            const [volunteers] = await pool.execute(
                "SELECT id FROM volunteers WHERE id = ?",
                [volunteer_id]
            );

            if (volunteers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Volunteer not found"
                });
            }
        }

        // Check responder if provided
        if (responder_id) {
            const [responders] = await pool.execute(
                `SELECT id
                 FROM users
                 WHERE id = ?
                 AND role = 'field_responder'`,
                [responder_id]
            );

            if (responders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Field responder not found"
                });
            }
        }

        if (!volunteer_id && !responder_id) {
            return res.status(400).json({
                success: false,
                message:
                    "Either volunteer ID or responder ID is required"
            });
        }

        if (assigned_quantity > requests[0].quantity) {
            return res.status(400).json({
                success: false,
                message:
                    "Assigned quantity cannot exceed requested quantity"
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO assignments
            (
                resource_request_id,
                volunteer_id,
                responder_id,
                assigned_quantity,
                status,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                resource_request_id,
                volunteer_id || null,
                responder_id || null,
                assigned_quantity,
                "assigned",
                notes || null
            ]
        );

        // Update resource request status
        await pool.execute(
            `UPDATE resource_requests
             SET status = 'assigned'
             WHERE id = ?`,
            [resource_request_id]
        );

        res.status(201).json({
            success: true,
            message: "Assignment created successfully",
            assignment: {
                id: result.insertId,
                resource_request_id,
                volunteer_id: volunteer_id || null,
                responder_id: responder_id || null,
                assigned_quantity,
                status: "assigned",
                notes: notes || null
            }
        });

    } catch (error) {
        console.error(
            "Create Assignment Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while creating assignment"
        });
    }
};


// ========================================
// GET ALL ASSIGNMENTS
// ========================================

const getAllAssignments = async (req, res) => {
    try {
        const [assignments] = await pool.execute(
            `SELECT
                a.id,
                a.resource_request_id,

                rr.incident_id,
                i.title AS incident_title,

                rr.resource_id,
                r.name AS resource_name,

                a.volunteer_id,
                vu.full_name AS volunteer_name,

                a.responder_id,
                ru.full_name AS responder_name,

                a.assigned_quantity,
                a.status,
                a.notes,
                a.assigned_at,
                a.updated_at

             FROM assignments a

             INNER JOIN resource_requests rr
             ON a.resource_request_id = rr.id

             INNER JOIN incidents i
             ON rr.incident_id = i.id

             LEFT JOIN resources r
             ON rr.resource_id = r.id

             LEFT JOIN volunteers v
             ON a.volunteer_id = v.id

             LEFT JOIN users vu
             ON v.user_id = vu.id

             LEFT JOIN users ru
             ON a.responder_id = ru.id

             ORDER BY a.assigned_at DESC`
        );

        res.json({
            success: true,
            count: assignments.length,
            assignments
        });

    } catch (error) {
        console.error(
            "Get Assignments Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while fetching assignments"
        });
    }
};


// ========================================
// GET ASSIGNMENT BY ID
// ========================================

const getAssignmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const [assignments] = await pool.execute(
            `SELECT
                a.id,
                a.resource_request_id,

                rr.incident_id,
                i.title AS incident_title,

                rr.resource_id,
                r.name AS resource_name,

                a.volunteer_id,
                vu.full_name AS volunteer_name,

                a.responder_id,
                ru.full_name AS responder_name,

                a.assigned_quantity,
                a.status,
                a.notes,
                a.assigned_at,
                a.updated_at

             FROM assignments a

             INNER JOIN resource_requests rr
             ON a.resource_request_id = rr.id

             INNER JOIN incidents i
             ON rr.incident_id = i.id

             LEFT JOIN resources r
             ON rr.resource_id = r.id

             LEFT JOIN volunteers v
             ON a.volunteer_id = v.id

             LEFT JOIN users vu
             ON v.user_id = vu.id

             LEFT JOIN users ru
             ON a.responder_id = ru.id

             WHERE a.id = ?`,
            [id]
        );

        if (assignments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });
        }

        res.json({
            success: true,
            assignment: assignments[0]
        });

    } catch (error) {
        console.error(
            "Get Assignment Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while fetching assignment"
        });
    }
};


// ========================================
// UPDATE ASSIGNMENT
// ========================================

const updateAssignment = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            assigned_quantity,
            status,
            notes
        } = req.body;

        const [existing] = await pool.execute(
            "SELECT * FROM assignments WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });
        }

        const current = existing[0];

        const newQuantity =
            assigned_quantity !== undefined
                ? assigned_quantity
                : current.assigned_quantity;

        if (newQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Assigned quantity must be greater than 0"
            });
        }

        const allowedStatuses = [
            "assigned",
            "accepted",
            "in_progress",
            "completed",
            "cancelled"
        ];

        const newStatus =
            status !== undefined
                ? status
                : current.status;

        if (!allowedStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid assignment status"
            });
        }

        await pool.execute(
            `UPDATE assignments
             SET
                assigned_quantity = ?,
                status = ?,
                notes = ?
             WHERE id = ?`,
            [
                newQuantity,
                newStatus,
                notes !== undefined
                    ? notes
                    : current.notes,
                id
            ]
        );

        // Update resource request based on assignment status
        if (newStatus === "completed") {
            await pool.execute(
                `UPDATE resource_requests
                 SET status = 'completed'
                 WHERE id = ?`,
                [current.resource_request_id]
            );
        } else if (newStatus === "cancelled") {
            await pool.execute(
                `UPDATE resource_requests
                 SET status = 'pending'
                 WHERE id = ?`,
                [current.resource_request_id]
            );
        }

        res.json({
            success: true,
            message: "Assignment updated successfully"
        });

    } catch (error) {
        console.error(
            "Update Assignment Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while updating assignment"
        });
    }
};


// ========================================
// DELETE ASSIGNMENT
// ========================================

const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.execute(
            "SELECT resource_request_id FROM assignments WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });
        }

        await pool.execute(
            "DELETE FROM assignments WHERE id = ?",
            [id]
        );

        // Return resource request to pending
        await pool.execute(
            `UPDATE resource_requests
             SET status = 'pending'
             WHERE id = ?`,
            [existing[0].resource_request_id]
        );

        res.json({
            success: true,
            message: "Assignment deleted successfully"
        });

    } catch (error) {
        console.error(
            "Delete Assignment Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while deleting assignment"
        });
    }
};


// ========================================
// EXPORT
// ========================================

module.exports = {
    createAssignment,
    getAllAssignments,
    getAssignmentById,
    updateAssignment,
    deleteAssignment
};