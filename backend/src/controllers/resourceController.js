const { pool } = require("../config/database");

// CREATE RESOURCE
const createResource = async (req, res) => {
    try {
        const {
            name,
            resource_type,
            quantity,
            available_quantity,
            location
        } = req.body;

        if (!name || !resource_type) {
            return res.status(400).json({
                success: false,
                message: "Name and resource type are required"
            });
        }

        const totalQuantity = quantity || 0;

        const availableQuantity =
            available_quantity !== undefined
                ? available_quantity
                : totalQuantity;

        if (totalQuantity < 0 || availableQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity cannot be negative"
            });
        }

        if (availableQuantity > totalQuantity) {
            return res.status(400).json({
                success: false,
                message:
                    "Available quantity cannot be greater than total quantity"
            });
        }

        let status = "available";

        if (availableQuantity === 0) {
            status = "unavailable";
        } else if (availableQuantity < totalQuantity) {
            status = "partially_available";
        }

        const [result] = await pool.execute(
            `INSERT INTO resources
            (name, resource_type, quantity, available_quantity, location, status, provider_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                resource_type,
                totalQuantity,
                availableQuantity,
                location || null,
                status,
                req.user.id
            ]
        );

        res.status(201).json({
            success: true,
            message: "Resource created successfully",
            resource: {
                id: result.insertId,
                name,
                resource_type,
                quantity: totalQuantity,
                available_quantity: availableQuantity,
                location: location || null,
                status,
                provider_id: req.user.id
            }
        });

    } catch (error) {
        console.error("Create Resource Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while creating resource"
        });
    }
};


// GET ALL RESOURCES
const getAllResources = async (req, res) => {
    try {
        const [resources] = await pool.execute(
            `SELECT
                r.id,
                r.name,
                r.resource_type,
                r.quantity,
                r.available_quantity,
                r.location,
                r.status,
                r.created_at,
                u.full_name AS provider_name
             FROM resources r
             LEFT JOIN users u
             ON r.provider_id = u.id
             ORDER BY r.created_at DESC`
        );

        res.json({
            success: true,
            count: resources.length,
            resources
        });

    } catch (error) {
        console.error("Get Resources Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while fetching resources"
        });
    }
};


// GET RESOURCE BY ID
const getResourceById = async (req, res) => {
    try {
        const { id } = req.params;

        const [resources] = await pool.execute(
            `SELECT
                r.id,
                r.name,
                r.resource_type,
                r.quantity,
                r.available_quantity,
                r.location,
                r.status,
                r.created_at,
                u.full_name AS provider_name
             FROM resources r
             LEFT JOIN users u
             ON r.provider_id = u.id
             WHERE r.id = ?`,
            [id]
        );

        if (resources.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        res.json({
            success: true,
            resource: resources[0]
        });

    } catch (error) {
        console.error("Get Resource Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while fetching resource"
        });
    }
};


// UPDATE RESOURCE
const updateResource = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            resource_type,
            quantity,
            available_quantity,
            location
        } = req.body;

        const [existing] = await pool.execute(
            "SELECT * FROM resources WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const current = existing[0];

        const newQuantity =
            quantity !== undefined
                ? quantity
                : current.quantity;

        const newAvailableQuantity =
            available_quantity !== undefined
                ? available_quantity
                : current.available_quantity;

        if (newQuantity < 0 || newAvailableQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity cannot be negative"
            });
        }

        if (newAvailableQuantity > newQuantity) {
            return res.status(400).json({
                success: false,
                message:
                    "Available quantity cannot be greater than total quantity"
            });
        }

        let status = "available";

        if (newAvailableQuantity === 0) {
            status = "unavailable";
        } else if (newAvailableQuantity < newQuantity) {
            status = "partially_available";
        }

        await pool.execute(
            `UPDATE resources
             SET
                name = ?,
                resource_type = ?,
                quantity = ?,
                available_quantity = ?,
                location = ?,
                status = ?
             WHERE id = ?`,
            [
                name !== undefined ? name : current.name,
                resource_type !== undefined
                    ? resource_type
                    : current.resource_type,
                newQuantity,
                newAvailableQuantity,
                location !== undefined
                    ? location
                    : current.location,
                status,
                id
            ]
        );

        res.json({
            success: true,
            message: "Resource updated successfully"
        });

    } catch (error) {
        console.error("Update Resource Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while updating resource"
        });
    }
};


// DELETE RESOURCE
const deleteResource = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            "DELETE FROM resources WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        res.json({
            success: true,
            message: "Resource deleted successfully"
        });

    } catch (error) {
        console.error("Delete Resource Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while deleting resource"
        });
    }
};


module.exports = {
    createResource,
    getAllResources,
    getResourceById,
    updateResource,
    deleteResource
};