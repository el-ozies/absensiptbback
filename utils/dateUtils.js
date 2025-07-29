const moment = require('moment');

/**
 * Menghasilkan array tanggal kerja (tidak termasuk hari Minggu) dalam bulan & tahun tertentu.
 * Menyembunyikan tanggal hari ini jika belum jam 18:00.
 * @param {number} bulan - Index bulan (0 = Januari, 11 = Desember)
 * @param {number} tahun - Tahun (e.g., 2025)
 * @returns {string[]} - Array tanggal dalam format 'YYYY-MM-DD'
 */
function generateTanggalKerja(bulan, tahun) {
  const tanggalKerja = [];
  const daysInMonth = moment({ year: tahun, month: bulan }).daysInMonth();

  const now = moment();
  const today = now.format('YYYY-MM-DD');
  const isAfter18 = now.hour() >= 18;

  for (let tanggal = 1; tanggal <= daysInMonth; tanggal++) {
    const current = moment({ year: tahun, month: bulan, day: tanggal });
    const formatted = current.format('YYYY-MM-DD');

    // Lewati hari Minggu
    if (current.day() === 0) continue;

    // Lewati hari ini jika belum jam 18.00
    if (formatted === today && !isAfter18) continue;

    // Hanya tampilkan hari sampai hari ini
    if (current.isAfter(now, 'day')) continue;

    tanggalKerja.push(formatted);
  }

  return tanggalKerja;
}

/**
 * Mengembalikan durasi jam kerja berdasarkan hari
 * @param {number} dayIndex - indeks hari: 0=minggu, 1=senin, ..., 6=sabtu
 * @returns {number} - jumlah jam kerja
 */
function getJamKerja(dayIndex) {
  if (dayIndex === 6) return 5; // Sabtu
  if (dayIndex === 5) return 6; // Jumat
  if (dayIndex === 0) return 0; // Minggu
  return 7; // Senin–Kamis
}

module.exports = {
  generateTanggalKerja,
  getJamKerja
};
