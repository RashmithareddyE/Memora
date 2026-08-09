const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRoutes);

module.exports = app;