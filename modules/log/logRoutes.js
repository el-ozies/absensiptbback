// modules/log/logRoutes.js
const express = require('express');
const router = express.Router();
const logController = require('./logController');
const { verifyToken } = require('../../middleware/authMiddleware');

// Hanya admin yang boleh lihat log
router.get('/', verifyToken, logController.getLogAktivitas);

module.exports = router;