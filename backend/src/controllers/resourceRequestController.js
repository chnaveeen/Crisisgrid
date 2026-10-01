const { pool } = require("../config/database");

// ========================================
// CREATE RESOURCE REQUEST
// ========================================

const createResourceRequest = async (req, res) => {
    try {
        const {
            incident_id,
            resource_id,
            quantity,
            priority
        } = req.body;

        if (!incident_id || !quantity) {
            return res.status(400).json({
                success: false,
                message: "Incident ID and quantity are required"
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0"
            });
        }

        // Check incident
        const [incidents] = await pool.execute(
            "SELECT id FROM incidents WHERE id = ?",
            [incident_id]
        );

        if (incidents.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        // Check resource if provided
        if (resource_id) {
            const [resources] = await pool.execute(
                "SELECT id FROM resources WHERE id = ?",
                [resource_id]
            );

            if (resources.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Resource not found"
                });
            }
        }

        const allowedPriorities = [
            "low",
            "medium",
            "high",
            "critical"
        ];

        const requestPriority =
            allowedPriorities.includes(priority)
                ? priority
                : "medium";

        const [result] = await pool.execute(
            `INSERT INTO resource_requests
            (
                incident_id,
                resource_id,
                requested_by,
                quantity,
                priority,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                incident_id,
                resource_id || null,
                req.user.id,
                quantity,
                requestPriority,
                "pending"
            ]
        );

        res.status(201).json({
            success: true,
            message: "Resource request created successfully",
            request: {
                id: result.insertId,
                incident_id,
                resource_id: resource_id || null,
                requested_by: req.user.id,
                quantity,
                priority: requestPriority,
                status: "pending"
            }
        });

    } catch (error) {
        console.error(
            "Create Resource Request Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while creating resource request"
        });
    }
};


// ========================================
// GET ALL RESOURCE REQUESTS
// ========================================

const getAllResourceRequests = async (req, res) => {
    try {
        const [requests] = await pool.execute(
            `SELECT
                rr.id,
                rr.incident_id,
                i.title AS incident_title,
                rr.resource_id,
                r.name AS resource_name,
                rr.requested_by,
                u.full_name AS requested_by_name,
                rr.quantity,
                rr.priority,
                rr.status,
                rr.created_at
             FROM resource_requests rr

             INNER JOIN incidents i
             ON rr.incident_id = i.id

             LEFT JOIN resources r
             ON rr.resource_id = r.id

             INNER JOIN users u
             ON rr.requested_by = u.id

             ORDER BY rr.created_at DESC`
        );

        res.json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error(
            "Get Resource Requests Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while fetching resource requests"
        });
    }
};


// ========================================
// GET RESOURCE REQUEST BY ID
// ========================================

const getResourceRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const [requests] = await pool.execute(
            `SELECT
                rr.id,
                rr.incident_id,
                i.title AS incident_title,
                rr.resource_id,
                r.name AS resource_name,
                rr.requested_by,
                u.full_name AS requested_by_name,
                rr.quantity,
                rr.priority,
                rr.status,
                rr.created_at
             FROM resource_requests rr

             INNER JOIN incidents i
             ON rr.incident_id = i.id

             LEFT JOIN resources r
             ON rr.resource_id = r.id

             INNER JOIN users u
             ON rr.requested_by = u.id

             WHERE rr.id = ?`,
            [id]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource request not found"
            });
        }

        res.json({
            success: true,
            request: requests[0]
        });

    } catch (error) {
        console.error(
            "Get Resource Request Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while fetching resource request"
        });
    }
};


// ========================================
// UPDATE RESOURCE REQUEST
// ========================================

const updateResourceRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            quantity,
            priority,
            status
        } = req.body;

        const [existing] = await pool.execute(
            "SELECT * FROM resource_requests WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource request not found"
            });
        }

        const current = existing[0];

        const newQuantity =
            quantity !== undefined
                ? quantity
                : current.quantity;

        if (newQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0"
            });
        }

        const allowedPriorities = [
            "low",
            "medium",
            "high",
            "critical"
        ];

        const allowedStatuses = [
            "pending",
            "approved",
            "assigned",
            "completed",
            "rejected"
        ];

        const newPriority =
            priority !== undefined
                ? priority
                : current.priority;

        const newStatus =
            status !== undefined
                ? status
                : current.status;

        if (!allowedPriorities.includes(newPriority)) {
            return res.status(400).json({
                success: false,
                message: "Invalid priority"
            });
        }

        if (!allowedStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        await pool.execute(
            `UPDATE resource_requests
             SET
                quantity = ?,
                priority = ?,
                status = ?
             WHERE id = ?`,
            [
                newQuantity,
                newPriority,
                newStatus,
                id
            ]
        );

        res.json({
            success: true,
            message: "Resource request updated successfully"
        });

    } catch (error) {
        console.error(
            "Update Resource Request Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while updating resource request"
        });
    }
};


// ========================================
// DELETE RESOURCE REQUEST
// ========================================

const deleteResourceRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            "DELETE FROM resource_requests WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource request not found"
            });
        }

        res.json({
            success: true,
            message: "Resource request deleted successfully"
        });

    } catch (error) {
        console.error(
            "Delete Resource Request Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while deleting resource request"
        });
    }
};


// ========================================
// EXPORT
// ========================================

module.exports = {
    createResourceRequest,
    getAllResourceRequests,
    getResourceRequestById,
    updateResourceRequest,
    deleteResourceRequest
};