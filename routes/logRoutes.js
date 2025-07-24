//opsional untuk admin
const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, logController.getLogAktivitas);

module.exports = router;
