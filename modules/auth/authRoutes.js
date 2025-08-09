// modules/auth/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('./authController');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/pegawai', authController.getPegawai); // jika digunakan oleh form register

module.exports = router;
