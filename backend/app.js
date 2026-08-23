const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const mediaRoutes = require('./routes/media.routes');
const searchRoutes = require('./routes/search.routes');
const organizationRoutes = require('./routes/organization.routes');
const highlightsRoutes = require('./routes/highlights.routes');

const app = express();

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', mediaRoutes);
app.use('/api', searchRoutes);
app.use('/api', organizationRoutes);
app.use('/api', highlightsRoutes);

module.exports = app;