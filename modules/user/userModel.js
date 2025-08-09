// 📁 modules/users/userModel.js
const db = require("../../config/db");
const bcrypt = require("bcryptjs");

// Ambil semua user + data pegawai
exports.getAllUsers = (callback) => {
  const sql = `
    SELECT 
      u.id, u.username, u.role, u.pegawai_id,
      p.nama, p.nip, p.jabatan, p.no_telp, p.alamat
    FROM users u
    LEFT JOIN pegawai p ON u.pegawai_id = p.id
    ORDER BY COALESCE(p.nama, u.username) ASC
  `;
  db.query(sql, callback);
};

// Tambah user + pegawai
exports.insertUserAndPegawai = (userData, pegawaiData, callback) => {
  const sqlPegawai = `INSERT INTO pegawai (nama, nip, jabatan, no_telp, alamat) VALUES (?, ?, ?, ?, ?)`;
  const pegawaiValues = [pegawaiData.nama, pegawaiData.nip, pegawaiData.jabatan, pegawaiData.no_telp, pegawaiData.alamat];

  db.query(sqlPegawai, pegawaiValues, (err, result) => {
    if (err) return callback(err);
    const pegawaiId = result.insertId;

    const sqlUser = `INSERT INTO users (username, password, role, pegawai_id) VALUES (?, ?, ?, ?)`;
    db.query(sqlUser, [...userData, pegawaiId], callback);
  });
};

// Update user + pegawai tanpa password
exports.updateUserAndPegawai = (userData, pegawaiData, callback) => {
  const { username, role, pegawai_id, user_id } = userData;
  const { nama, nip, jabatan, no_telp, alamat } = pegawaiData;

  const sqlUser = `UPDATE users SET username=?, role=?, pegawai_id=? WHERE id=?`;
  const sqlPegawai = `UPDATE pegawai SET nama=?, nip=?, jabatan=?, no_telp=?, alamat=? WHERE id=?`;

  db.query(sqlUser, [username, role, pegawai_id, user_id], (err) => {
    if (err) return callback(err);

    db.query(sqlPegawai, [nama, nip, jabatan, no_telp, alamat, pegawai_id], callback);
  });
};

// Update user dengan password
exports.updateUserWithPassword = (data, callback) => {
  const sql = `UPDATE users SET username=?, password=?, role=?, pegawai_id=? WHERE id=?`;
  db.query(sql, data, callback);
};

// Update data pegawai
exports.updatePegawai = (data, id, callback) => {
  const { nama, nip, jabatan, no_telp, alamat } = data;
  const sql = `UPDATE pegawai SET nama=?, nip=?, jabatan=?, no_telp=?, alamat=? WHERE id=?`;
  db.query(sql, [nama, nip, jabatan, no_telp, alamat, id], callback);
};

// Hapus user (+hapus pegawai jika tidak digunakan user lain)
exports.deleteUser = (id, callback) => {
  const sqlGet = `SELECT pegawai_id FROM users WHERE id=?`;
  db.query(sqlGet, [id], (err, result) => {
    if (err) return callback(err);
    const pegawaiId = result[0]?.pegawai_id;

    db.query(`DELETE FROM users WHERE id=?`, [id], (err) => {
      if (err) return callback(err);

      const sqlCheck = `SELECT COUNT(*) AS count FROM users WHERE pegawai_id=?`;
      db.query(sqlCheck, [pegawaiId], (err, result) => {
        if (err) return callback(err);

        if (result[0].count === 0 && pegawaiId) {
          db.query(`DELETE FROM pegawai WHERE id=?`, [pegawaiId], callback);
        } else {
          callback(null, { message: "User deleted, pegawai retained" });
        }
      });
    });
  });
};

// Hash password
exports.hashPassword = (password, callback) => {
  bcrypt.hash(password, 10, callback);
};
