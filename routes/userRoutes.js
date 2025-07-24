//opsional untuk admin
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

// bisa ditambahkan pengecekan role = 'admin' nanti
router.get('/', verifyToken, userController.getUsers);
router.post('/', verifyToken, userController.createUser);

module.exports = router;