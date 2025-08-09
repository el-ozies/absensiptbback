// modules/dashboard/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("./dashboardController");
const { verifyToken } = require("../../middleware/authMiddleware");

/* ==============================
   📊 Dashboard Admin
   ============================== */
// Statistik Dashboard Admin
router.get("/statistik", verifyToken, dashboardController.getDashboardStatistik);

// router.get("/pegawai/statistik", verifyToken, dashboardController.getDashboardPegawai);

router.get('/dashboard', verifyToken, dashboardController.getDashboardStatistik);

// Chart Kehadiran Harian Admin
router.get("/chart", verifyToken, dashboardController.getChartKehadiranAdmin);

// Pegawai Belum Pulang Hari Ini
router.get("/belum-pulang", verifyToken, dashboardController.getBelumPulang);

/* ==============================
   📊 Dashboard Pegawai
   ============================== */
// Statistik Dashboard Pegawai (Bulanan)
router.get("/pegawai/statistik", verifyToken, dashboardController.getDashboardPegawai);

// Chart Kehadiran Pegawai (Bulanan)
router.get("/pegawai/chart", verifyToken, dashboardController.getChartKehadiranPegawai);

module.exports = router;
