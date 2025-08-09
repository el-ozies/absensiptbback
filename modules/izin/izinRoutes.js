// modules/izin/izinRoutes.js
const express = require('express');
const router = express.Router();
const izinController = require('./izinController');
const { verifyToken } = require('../../middleware/authMiddleware');

// ======================
// 📌 Endpoint Izin Pegawai
// ======================

// ✅ 1. Ajukan izin (pegawai login)
router.post('/', verifyToken, izinController.ajukanIzin);

// ✅ 2. Ambil riwayat izin pegawai yang sedang login
router.get('/riwayat', verifyToken, izinController.getRiwayatIzin);

// ✅ 3. Ambil izin berdasarkan pegawai_id tertentu (untuk admin lihat detail pegawai)
router.get('/pegawai/:pegawai_id', verifyToken, izinController.getIzinByPegawai);

// ✅ 4. Ambil semua izin yang status-nya 'menunggu' (untuk validasi admin)
router.get('/menunggu', verifyToken, izinController.getSemuaIzin);

// ✅ 5. Validasi izin oleh admin (ubah status → disetujui/ditolak)
router.put('/:id', verifyToken, izinController.validasiIzin);

// ✅ 6. Ambil semua data izin (admin) lengkap dengan nama pegawai
router.get('/all', verifyToken, izinController.getAllIzin);

// ✅ Ambil tanggal yang tidak valid untuk izin (sudah absen / sudah ada izin disetujui)
router.get('/valid-tanggal', verifyToken, izinController.getTanggalTidakValid);

// Endpoint untuk ambil tanggal yang tidak bisa dipilih izin
router.get('/disable-dates', verifyToken, izinController.getDisabledDates);

module.exports = router;
