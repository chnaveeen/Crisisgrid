const { pool } = require("../config/database");

// CREATE VOLUNTEER
const createVolunteer = async (req, res) => {
    try {
        const { user_id, skills, availability, location } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const [users] = await pool.execute(
            "SELECT id FROM users WHERE id = ?",
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const [existing] = await pool.execute(
            "SELECT id FROM volunteers WHERE user_id = ?",
            [user_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Volunteer profile already exists"
            });
        }

        const allowedAvailability = [
            "available",
            "busy",
            "unavailable"
        ];

        const volunteerAvailability =
            allowedAvailability.includes(availability)
                ? availability
                : "available";

        const [result] = await pool.execute(
            `INSERT INTO volunteers
            (user_id, skills, availability, location)
            VALUES (?, ?, ?, ?)`,
            [
                user_id,
                skills || null,
                volunteerAvailability,
                location || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Volunteer created successfully",
            volunteer: {
                id: result.insertId,
                user_id,
                skills: skills || null,
                availability: volunteerAvailability,
                location: location || null
            }
        });

    } catch (error) {
        console.error("Create Volunteer Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while creating volunteer"
        });
    }
};


// GET ALL VOLUNTEERS
const getAllVolunteers = async (req, res) => {
    try {
        const [volunteers] = await pool.execute(
            `SELECT
                v.id,
                v.user_id,
                u.full_name,
                u.email,
                u.phone,
                v.skills,
                v.availability,
                v.location,
                v.created_at
             FROM volunteers v
             INNER JOIN users u
             ON v.user_id = u.id
             ORDER BY v.created_at DESC`
        );

        res.json({
            success: true,
            count: volunteers.length,
            volunteers
        });

    } catch (error) {
        console.error("Get Volunteers Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while fetching volunteers"
        });
    }
};


// GET VOLUNTEER BY ID
const getVolunteerById = async (req, res) => {
    try {
        const { id } = req.params;

        const [volunteers] = await pool.execute(
            `SELECT
                v.id,
                v.user_id,
                u.full_name,
                u.email,
                u.phone,
                v.skills,
                v.availability,
                v.location,
                v.created_at
             FROM volunteers v
             INNER JOIN users u
             ON v.user_id = u.id
             WHERE v.id = ?`,
            [id]
        );

        if (volunteers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Volunteer not found"
            });
        }

        res.json({
            success: true,
            volunteer: volunteers[0]
        });

    } catch (error) {
        console.error("Get Volunteer Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while fetching volunteer"
        });
    }
};


// UPDATE VOLUNTEER
const updateVolunteer = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            skills,
            availability,
            location
        } = req.body;

        const [existing] = await pool.execute(
            "SELECT * FROM volunteers WHERE id = ?",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Volunteer not found"
            });
        }

        const current = existing[0];

        const allowedAvailability = [
            "available",
            "busy",
            "unavailable"
        ];

        const newAvailability =
            availability !== undefined
                ? availability
                : current.availability;

        if (!allowedAvailability.includes(newAvailability)) {
            return res.status(400).json({
                success: false,
                message:
                    "Availability must be available, busy or unavailable"
            });
        }

        await pool.execute(
            `UPDATE volunteers
             SET
                skills = ?,
                availability = ?,
                location = ?
             WHERE id = ?`,
            [
                skills !== undefined
                    ? skills
                    : current.skills,

                newAvailability,

                location !== undefined
                    ? location
                    : current.location,

                id
            ]
        );

        res.json({
            success: true,
            message: "Volunteer updated successfully"
        });

    } catch (error) {
        console.error("Update Volunteer Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while updating volunteer"
        });
    }
};


// DELETE VOLUNTEER
const deleteVolunteer = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            "DELETE FROM volunteers WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Volunteer not found"
            });
        }

        res.json({
            success: true,
            message: "Volunteer deleted successfully"
        });

    } catch (error) {
        console.error("Delete Volunteer Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error while deleting volunteer"
        });
    }
};


// EXPORT FUNCTIONS
module.exports = {
    createVolunteer,
    getAllVolunteers,
    getVolunteerById,
    updateVolunteer,
    deleteVolunteer
};