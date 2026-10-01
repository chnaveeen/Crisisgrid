require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const path = require('path');
const fs = require('fs');

// Route imports
const authRoutes = require('./routes/authRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const aiRoutes = require('./routes/aiRoutes');
const cameraRoutes = require('./routes/cameraRoutes');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Ensure CCTV uploads directory exists
const cctvUploadsDir = path.join(__dirname, 'uploads/cctv');
if (!fs.existsSync(cctvUploadsDir)) {
  fs.mkdirSync(cctvUploadsDir, { recursive: true });
}

// Socket.IO configuration with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Store io instance on app for controller access
app.set('io', io);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static CCTV evidence snapshots & media
app.use('/uploads/cctv', express.static(cctvUploadsDir));

// Lightweight request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Socket.IO connection event
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Relay inbound real-time alerts across Socket.IO without touching database records
  const relayAlert = (alertData) => {
    console.log(`[Socket.IO ⚡ ALERT DISPATCH] #${alertData?.incidentId || alertData?.id} - ${alertData?.title || alertData?.type} [Source: ${alertData?.source || 'CCTV AI'}]`);
    io.emit('incident:new', alertData);
    io.emit('emergency:alert', alertData);
  };
  socket.on('demo:dispatch-alert', relayAlert);
  socket.on('incident:dispatch-alert', relayAlert);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cameras', cameraRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'CrisisGrid AI',
    tagline: 'AI-Powered Emergency Resource Coordination Platform',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    project: 'CrisisGrid AI',
    tagline: 'AI-Powered Emergency Resource Coordination Platform',
    status: 'ONLINE',
    endpoints: {
      auth: '/api/auth',
      incidents: '/api/incidents',
      resources: '/api/resources',
      ai: '/api/ai/analyze',
      health: '/api/health'
    }
  });
});

// Centralized error handler (friendly, no stack trace exposure)
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred. Please try again later.'
  });
});

// Start HTTP + WebSocket Server
server.listen(PORT, () => {
  console.log('================================================================');
  console.log('🚨 CrisisGrid AI - Emergency Resource Coordination Platform');
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📡 Socket.IO listening on port ${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log('================================================================');

  // Start Autonomous CCTV Surveillance Background Worker
  if (process.env.NODE_ENV !== 'test' && process.env.CCTV_AUTONOMOUS_WORKER !== 'false') {
    const { startAutonomousSurveillanceWorker } = require('./services/cctvDetectionService');
    startAutonomousSurveillanceWorker(io, {
      startDelayMs: 20000,
      intervalMs: parseInt(process.env.CCTV_SCAN_INTERVAL_MS, 10) || 120000
    });
  }
});

module.exports = { app, server };
