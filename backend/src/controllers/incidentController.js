const { pool } = require("../config/database");

const {
    sendIncidentUpdate,
    broadcastNotification
} = require("../sockets/socket");


// ========================================
// CREATE INCIDENT
// ========================================

const createIncident = async (req, res) => {
    try {
        const {
            title,
            description,
            incident_type,
            severity,
            location,
            latitude,
            longitude
        } = req.body;

        if (!title || !incident_type || !location) {
            return res.status(400).json({
                success: false,
                message:
                    "Title, incident type and location are required"
            });
        }

        const allowedSeverities = [
            "low",
            "medium",
            "high",
            "critical"
        ];

        const incidentSeverity =
            allowedSeverities.includes(severity)
                ? severity
                : "medium";

        const [result] = await pool.execute(
            `INSERT INTO incidents
            (
                title,
                description,
                incident_type,
                severity,
                location,
                latitude,
                longitude,
                status,
                reported_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                description || null,
                incident_type,
                incidentSeverity,
                location,
                latitude || null,
                longitude || null,
                "reported",
                req.user.id
            ]
        );

        const incident = {
            id: result.insertId,
            title,
            description: description || null,
            incident_type,
            severity: incidentSeverity,
            location,
            latitude: latitude || null,
            longitude: longitude || null,
            status: "reported",
            reported_by: req.user.id
        };

        // Real-time incident update
        broadcastNotification({
            type: "NEW_INCIDENT",
            message: `New ${incidentSeverity} incident reported: ${title}`,
            incident
        });

        sendIncidentUpdate(
            result.insertId,
            {
                type: "INCIDENT_CREATED",
                message: "New incident created",
                incident
            }
        );

        res.status(201).json({
            success: true,
            message: "Incident created successfully",
            incident
        });

    } catch (error) {
        console.error(
            "Create Incident Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while creating incident"
        });
    }
};


// ========================================
// GET ALL INCIDENTS
// ========================================

const getAllIncidents = async (req, res) => {
    try {
        const [incidents] = await pool.execute(
            `SELECT
                i.id,
                i.title,
                i.description,
                i.incident_type,
                i.severity,
                i.location,
                i.latitude,
                i.longitude,
                i.status,
                i.reported_by,
                u.full_name AS reported_by_name,
                i.created_at,
                i.updated_at
             FROM incidents i
             INNER JOIN users u
             ON i.reported_by = u.id
             ORDER BY i.created_at DESC`
        );

        res.json({
            success: true,
            count: incidents.length,
            incidents
        });

    } catch (error) {
        console.error(
            "Get Incidents Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while fetching incidents"
        });
    }
};


// ========================================
// GET INCIDENT BY ID
// ========================================

const getIncidentById = async (req, res) => {
    try {
        const { id } = req.params;

        const [incidents] = await pool.execute(
            `SELECT
                i.id,
                i.title,
                i.description,
                i.incident_type,
                i.severity,
                i.location,
                i.latitude,
                i.longitude,
                i.status,
                i.reported_by,
                u.full_name AS reported_by_name,
                i.created_at,
                i.updated_at
             FROM incidents i
             INNER JOIN users u
             ON i.reported_by = u.id
             WHERE i.id = ?`,
            [id]
        );

        if (incidents.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        res.json({
            success: true,
            incident: incidents[0]
        });

    } catch (error) {
        console.error(
            "Get Incident Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while fetching incident"
        });
    }
};


// ========================================
// UPDATE INCIDENT
// ========================================

const updateIncident = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            title,
            description,
            incident_type,
            severity,
            location,
            latitude,
            longitude,
            status
        } = req.body;

        const [existing] = await pool.execute(
            "SELECT * FROM incidents WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        const current = existing[0];

        const allowedSeverities = [
            "low",
            "medium",
            "high",
            "critical"
        ];

        const allowedStatuses = [
            "reported",
            "verified",
            "assigned",
            "in_progress",
            "resolved",
            "closed"
        ];

        const newSeverity =
            severity !== undefined
                ? severity
                : current.severity;

        const newStatus =
            status !== undefined
                ? status
                : current.status;

        if (!allowedSeverities.includes(newSeverity)) {
            return res.status(400).json({
                success: false,
                message: "Invalid severity"
            });
        }

        if (!allowedStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid incident status"
            });
        }

        await pool.execute(
            `UPDATE incidents
             SET
                title = ?,
                description = ?,
                incident_type = ?,
                severity = ?,
                location = ?,
                latitude = ?,
                longitude = ?,
                status = ?
             WHERE id = ?`,
            [
                title !== undefined
                    ? title
                    : current.title,

                description !== undefined
                    ? description
                    : current.description,

                incident_type !== undefined
                    ? incident_type
                    : current.incident_type,

                newSeverity,

                location !== undefined
                    ? location
                    : current.location,

                latitude !== undefined
                    ? latitude
                    : current.latitude,

                longitude !== undefined
                    ? longitude
                    : current.longitude,

                newStatus,

                id
            ]
        );

        const updatedIncident = {
            id: Number(id),
            title:
                title !== undefined
                    ? title
                    : current.title,
            description:
                description !== undefined
                    ? description
                    : current.description,
            incident_type:
                incident_type !== undefined
                    ? incident_type
                    : current.incident_type,
            severity: newSeverity,
            location:
                location !== undefined
                    ? location
                    : current.location,
            latitude:
                latitude !== undefined
                    ? latitude
                    : current.latitude,
            longitude:
                longitude !== undefined
                    ? longitude
                    : current.longitude,
            status: newStatus,
            reported_by: current.reported_by
        };

        // Real-time incident update
        sendIncidentUpdate(
            Number(id),
            {
                type: "INCIDENT_UPDATED",
                message: `Incident "${updatedIncident.title}" updated`,
                incident: updatedIncident
            }
        );

        broadcastNotification({
            type: "INCIDENT_STATUS_CHANGED",
            message:
                `Incident "${updatedIncident.title}" is now ${newStatus}`,
            incident_id: Number(id),
            status: newStatus
        });

        res.json({
            success: true,
            message: "Incident updated successfully",
            incident: updatedIncident
        });

    } catch (error) {
        console.error(
            "Update Incident Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while updating incident"
        });
    }
};


// ========================================
// DELETE INCIDENT
// ========================================

const deleteIncident = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.execute(
            "SELECT title FROM incidents WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        await pool.execute(
            "DELETE FROM incidents WHERE id = ?",
            [id]
        );

        // Real-time notification
        broadcastNotification({
            type: "INCIDENT_DELETED",
            message:
                `Incident "${existing[0].title}" was deleted`,
            incident_id: Number(id)
        });

        res.json({
            success: true,
            message: "Incident deleted successfully"
        });

    } catch (error) {
        console.error(
            "Delete Incident Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Server error while deleting incident"
        });
    }
};


// ========================================
// EXPORT
// ========================================

module.exports = {
    createIncident,
    getAllIncidents,
    getIncidentById,
    updateIncident,
    deleteIncident
};