// modules/log/logController.js
const logModel = require('./logModel');

// Ambil semua log aktivitas
exports.getLogAktivitas = (req, res) => {
  logModel.getLogAktivitas((err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal mengambil log aktivitas', error: err });
    res.json(result);
  });
};

// Fungsi reusable untuk menyimpan log (panggil dari controller lain)
exports.logAktivitas = logModel.logAktivitas;
