const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin:
                process.env.CLIENT_URL ||
                "http://localhost:5173",
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log(
            `🔌 Client connected: ${socket.id}`
        );

        // Join user-specific room
        socket.on("join_user_room", (userId) => {
            if (userId) {
                socket.join(`user_${userId}`);

                console.log(
                    `👤 User ${userId} joined room`
                );
            }
        });

        // Join incident-specific room
        socket.on("join_incident_room", (incidentId) => {
            if (incidentId) {
                socket.join(
                    `incident_${incidentId}`
                );

                console.log(
                    `🚨 Joined incident room: ${incidentId}`
                );
            }
        });

        socket.on("disconnect", () => {
            console.log(
                `🔌 Client disconnected: ${socket.id}`
            );
        });
    });

    console.log("⚡ Socket.IO initialized");

    return io;
};


// Send notification to a specific user
const sendUserNotification = (userId, data) => {
    if (!io) return;

    io.to(`user_${userId}`).emit(
        "notification",
        data
    );
};


// Send update to everyone watching an incident
const sendIncidentUpdate = (incidentId, data) => {
    if (!io) return;

    io.to(`incident_${incidentId}`).emit(
        "incident_update",
        data
    );
};


// Broadcast to everyone
const broadcastNotification = (data) => {
    if (!io) return;

    io.emit("global_notification", data);
};


module.exports = {
    initializeSocket,
    sendUserNotification,
    sendIncidentUpdate,
    broadcastNotification
};