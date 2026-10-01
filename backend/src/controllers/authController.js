const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const register = async (req, res) => {
    try {
        const {
            full_name,
            email,
            password,
            role,
            phone
        } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const [existingUsers] = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const allowedRoles = [
            "admin",
            "control_center",
            "field_responder",
            "volunteer",
            "resource_provider"
        ];

        const userRole = allowedRoles.includes(role)
            ? role
            : "volunteer";

        const [result] = await pool.execute(
            `INSERT INTO users
            (full_name, email, password, role, phone)
            VALUES (?, ?, ?, ?, ?)`,
            [
                full_name,
                email,
                hashedPassword,
                userRole,
                phone || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: result.insertId,
                full_name,
                email,
                role: userRole,
                phone: phone || null
            }
        });

    } catch (error) {
        console.error("Registration Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const [users] = await pool.execute(
            `SELECT id, full_name, email, password, role, phone, status
             FROM users
             WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Account is inactive"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error("Login Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};


module.exports = {
    register,
    login
};
