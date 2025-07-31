const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

// ✅ CRUD untuk user + pegawai (admin)
router.get('/', verifyToken, userController.getUsers);           // Ambil semua user + data pegawai
router.post('/', verifyToken, userController.createUser);        // Tambah user + pegawai baru
router.put('/:id', verifyToken, userController.updateUser);      // Update user + data pegawai
router.delete('/:id', verifyToken, userController.deleteUser);   // Hapus user + pegawai

module.exports = router;
