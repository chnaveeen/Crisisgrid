const { pool } = require("../config/database");

// CREATE SHELTER
const createShelter = async (req, res) => {
    try {
        const {
            name,
            location,
            capacity,
            occupied,
            contact_number
        } = req.body;

        if (!name || !location || capacity === undefined) {
            return res.status(400).json({
                success: false,
                message: "Name, location and capacity are required"
            });
        }

        if (capacity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be greater than 0"
            });
        }

        const occupiedCount = occupied || 0;

        if (occupiedCount < 0 || occupiedCount > capacity) {
            return res.status(400).json({
                success: false,
                message:
                    "Occupied count cannot be negative or greater than capacity"
            });
        }

        let status = "open";

        if (occupiedCount >= capacity) {
            status = "full";
        }

        const [result] = await pool.execute(
            `INSERT INTO shelters
            (
                name,
                location,
                capacity,
                occupied,
                contact_number,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                name,
                location,
                capacity,
                occupiedCount,
                contact_number || null,
                status
            ]
        );

        res.status(201).json({
            success: true,
            message: "Shelter created successfully",
            shelter: {
                id: result.insertId,
                name,
                location,
                capacity,
                occupied: occupiedCount,
                contact_number: contact_number || null,
                status
            }
        });

    } catch (error) {
        console.error("Create Shelter Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while creating shelter"
        });
    }
};


// GET ALL SHELTERS
const getAllShelters = async (req, res) => {
    try {
        const [shelters] = await pool.execute(
            `SELECT
                id,
                name,
                location,
                capacity,
                occupied,
                contact_number,
                status,
                created_at
             FROM shelters
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            count: shelters.length,
            shelters
        });

    } catch (error) {
        console.error("Get Shelters Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while fetching shelters"
        });
    }
};


// GET SHELTER BY ID
const getShelterById = async (req, res) => {
    try {
        const { id } = req.params;

        const [shelters] = await pool.execute(
            `SELECT
                id,
                name,
                location,
                capacity,
                occupied,
                contact_number,
                status,
                created_at
             FROM shelters
             WHERE id = ?`,
            [id]
        );

        if (shelters.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shelter not found"
            });
        }

        res.json({
            success: true,
            shelter: shelters[0]
        });

    } catch (error) {
        console.error("Get Shelter Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while fetching shelter"
        });
    }
};


// UPDATE SHELTER
const updateShelter = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            location,
            capacity,
            occupied,
            contact_number,
            status
        } = req.body;

        const [existing] = await pool.execute(
            "SELECT * FROM shelters WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shelter not found"
            });
        }

        const current = existing[0];

        const newCapacity =
            capacity !== undefined
                ? capacity
                : current.capacity;

        const newOccupied =
            occupied !== undefined
                ? occupied
                : current.occupied;

        if (newCapacity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be greater than 0"
            });
        }

        if (newOccupied < 0 || newOccupied > newCapacity) {
            return res.status(400).json({
                success: false,
                message:
                    "Occupied count cannot be negative or greater than capacity"
            });
        }

        let newStatus = "open";

        if (newOccupied >= newCapacity) {
            newStatus = "full";
        }

        if (status === "closed") {
            newStatus = "closed";
        }

        await pool.execute(
            `UPDATE shelters
             SET
                name = ?,
                location = ?,
                capacity = ?,
                occupied = ?,
                contact_number = ?,
                status = ?
             WHERE id = ?`,
            [
                name !== undefined ? name : current.name,
                location !== undefined
                    ? location
                    : current.location,
                newCapacity,
                newOccupied,
                contact_number !== undefined
                    ? contact_number
                    : current.contact_number,
                newStatus,
                id
            ]
        );

        res.json({
            success: true,
            message: "Shelter updated successfully"
        });

    } catch (error) {
        console.error("Update Shelter Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while updating shelter"
        });
    }
};


// DELETE SHELTER
const deleteShelter = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            "DELETE FROM shelters WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Shelter not found"
            });
        }

        res.json({
            success: true,
            message: "Shelter deleted successfully"
        });

    } catch (error) {
        console.error("Delete Shelter Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while deleting shelter"
        });
    }
};


module.exports = {
    createShelter,
    getAllShelters,
    getShelterById,
    updateShelter,
    deleteShelter
};