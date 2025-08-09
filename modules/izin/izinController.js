// modules/izin/izinController.js
const izinModel = require('./izinModel');
const absensiModel = require('../absensi/absensiModel');
const moment = require('moment');
moment.locale('id');

// 🔧 Fungsi bantu: menghasilkan list tanggal dari rentang mulai - selesai
function getRentangTanggal(start, end) {
  const tanggalList = [];
  let current = moment(start);
  const last = moment(end);
  while (current <= last) {
    tanggalList.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'days');
  }
  return tanggalList;
}

// ✅ Ajukan izin oleh pegawai
exports.ajukanIzin = async (req, res) => {
  const pegawaiId = req.user?.pegawai_id;
  const { alasan, tanggal_mulai, tanggal_selesai } = req.body;

  try {
    // Validasi input
    if (!alasan || !tanggal_mulai || !tanggal_selesai) {
      return res.status(400).json({ message: 'Alasan dan tanggal wajib diisi', type: 'invalid_input' });
    }

    // Cegah izin mundur (tanggal mulai < hari ini)
    if (moment(tanggal_mulai).isBefore(moment(), 'day')) {
      return res.status(400).json({ message: 'Tanggal mulai izin tidak boleh di masa lalu', type: 'invalid_date' });
    }

    // Validasi tanggal selesai >= tanggal mulai
    if (moment(tanggal_selesai).isBefore(moment(tanggal_mulai))) {
      return res.status(400).json({ message: 'Tanggal selesai tidak boleh sebelum tanggal mulai', type: 'invalid_date' });
    }

    // Loop semua tanggal dalam rentang izin
    const listTanggal = getRentangTanggal(tanggal_mulai, tanggal_selesai);

    for (const tgl of listTanggal) {
      // 1️⃣ Cek apakah sudah absen
      const sudahAbsen = await absensiModel.cekSudahAbsenMasuk(pegawaiId, tgl);
      if (sudahAbsen) {
        return res.status(409).json({ message: `Sudah absen pada tanggal ${tgl}. Tidak bisa ajukan izin.`, type: 'sudah_absen' });
      }

      // 2️⃣ Cek apakah sudah ada izin disetujui
      const izinDisetujui = await izinModel.cekIzinDisetujuiByUserDanTanggal(pegawaiId, tgl);
      if (izinDisetujui) {
        return res.status(409).json({ message: `Sudah ada izin disetujui pada tanggal ${tgl}`, type: 'izin_sudah_ada' });
      }

      // 3️⃣ Cek izin overlap (pending/disetujui)
      const izinOverlap = await izinModel.cekIzinOverlap(pegawaiId, tgl);
      if (izinOverlap) {
        return res.status(409).json({ message: `Sudah ada izin lain pada tanggal ${tgl}`, type: 'izin_overlap' });
      }
    }

    // ✅ Insert izin baru (status = menunggu)
    const result = await izinModel.ajukanIzin(pegawaiId, alasan, tanggal_mulai, tanggal_selesai);
    res.json({ message: 'Izin berhasil diajukan', type: 'izin_diajukan', result });

  } catch (err) {
    console.error('❌ Error ajukanIzin:', err);
    res.status(500).json({ message: err.message, type: 'error' });
  }
};

// ✅ Ambil riwayat izin pegawai yang sedang login
exports.getRiwayatIzin = async (req, res) => {
  const pegawaiId = req.user?.pegawai_id;
  try {
    const data = await izinModel.getRiwayatIzin(pegawaiId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Ambil izin berdasarkan pegawai_id (untuk admin melihat detail pegawai)
exports.getIzinByPegawai = async (req, res) => {
  try {
    const data = await izinModel.getIzinByPegawai(req.params.pegawai_id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Ambil semua izin yang status-nya 'menunggu' (untuk validasi)
exports.getSemuaIzin = async (req, res) => {
  try {
    const data = await izinModel.getSemuaIzin();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Validasi izin oleh admin
exports.validasiIzin = async (req, res) => {
  try {
    const result = await izinModel.validasiIzin(req.params.id, req.body.status);
    res.json({ message: 'Status izin diperbarui', result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Ambil semua data izin lengkap (untuk admin)
exports.getAllIzin = async (req, res) => {
  try {
    const data = await izinModel.getAllIzin();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Ambil daftar tanggal yang tidak boleh dipilih untuk izin
exports.getTanggalTidakValid = async (req, res) => {
  const pegawaiId = req.user?.pegawai_id;
  try {
    // Ambil tanggal yang sudah absen masuk
    const absen = await absensiModel.getTanggalSudahAbsen(pegawaiId);

    // Ambil tanggal yang sudah ada izin disetujui
    const izin = await izinModel.getTanggalIzinDisetujui(pegawaiId);

    // Gabungkan & unikkan
    const semuaTanggal = [...new Set([...absen, ...izin])];

    res.json(semuaTanggal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Ambil daftar tanggal yang dikunci (absen/izin disetujui)
exports.getDisabledDates = (req, res) => {
  const pegawaiId = req.user?.pegawai_id;

  izinModel.getDisabledDates(pegawaiId, (err, dates) => {
    if (err) {
      console.error("Error getDisabledDates:", err);
      return res.status(500).json({ message: "Gagal mengambil tanggal yang dikunci" });
    }
    res.json({ disabledDates: dates });
  });
};
