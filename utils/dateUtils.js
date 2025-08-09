// utils/dateUtils.js
const dayjs = require("dayjs");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const advancedFormat = require("dayjs/plugin/advancedFormat");
dayjs.extend(isSameOrAfter);
dayjs.extend(advancedFormat);

/**
 * Menghasilkan array tanggal kerja (Senin–Sabtu) dalam bulan & tahun tertentu.
 * Bulan 1-based (1=Jan, 12=Des).
 */
function generateTanggalKerja(bulan, tahun) {
  const tanggalKerja = [];
  const daysInMonth = dayjs(`${tahun}-${String(bulan).padStart(2, "0")}-01`).daysInMonth();
  const now = dayjs();

  for (let t = 1; t <= daysInMonth; t++) {
    const current = dayjs(`${tahun}-${String(bulan).padStart(2, "0")}-${String(t).padStart(2, "0")}`, "YYYY-MM-DD");
    const dayIndex = current.day(); // 0 = Minggu
    if (dayIndex === 0) continue; // skip Minggu
    if (current.isAfter(now, "day")) break; // stop jika sudah melewati hari ini
    tanggalKerja.push(current.format("YYYY-MM-DD"));
  }

  return tanggalKerja;
}

/**
 * Detail jam kerja sesuai hari (jam_masuk, jam_pulang, istirahat dalam menit, jam_kerja string)
 */
function getJamKerjaDetail(dayIndex) {
  if (dayIndex === 0) return { jam_masuk: null, jam_pulang: null, istirahat: 0, jam_kerja: "-" };
  if (dayIndex === 5) return { jam_masuk: "08:00:00", jam_pulang: "16:00:00", istirahat: 120, jam_kerja: "08:00 - 16:00" }; // Jumat
  if (dayIndex === 6) return { jam_masuk: "08:00:00", jam_pulang: "14:00:00", istirahat: 60, jam_kerja: "08:00 - 14:00" }; // Sabtu
  return { jam_masuk: "08:00:00", jam_pulang: "16:00:00", istirahat: 60, jam_kerja: "08:00 - 16:00" }; // Senin-Kamis
}

/**
 * Hitung jam kerja aktual (return "X jam Y menit")
 */
function hitungJamKerja(jamMasuk, jamKeluar, istirahatMenit = 60) {
  if (!jamMasuk || !jamKeluar) return "-";
  const masuk = dayjs(jamMasuk, "HH:mm:ss");
  const keluar = dayjs(jamKeluar, "HH:mm:ss");
  const totalMenit = keluar.diff(masuk, "minute") - istirahatMenit;
  if (totalMenit <= 0) return "-";
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  return `${jam} jam ${menit} menit`;
}

/**
 * Hitung keterlambatan
 */
function hitungKeterlambatan(jamMasuk, jamWajibMasuk) {
  if (!jamMasuk || !jamWajibMasuk) return "-";
  const masuk = dayjs(jamMasuk, "HH:mm:ss");
  const wajib = dayjs(jamWajibMasuk, "HH:mm:ss");
  const diffMenit = masuk.diff(wajib, "minute");
  return diffMenit > 0
    ? `${Math.floor(diffMenit / 60)} jam ${diffMenit % 60} menit`
    : "-";
}

module.exports = {
  generateTanggalKerja,
  getJamKerjaDetail,
  hitungJamKerja,
  hitungKeterlambatan
};
