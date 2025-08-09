// modules/auth/authModel.js
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ✅ Fungsi login utama
const login = async (username, password) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE username = ?`;
    db.query(sql, [username], async (err, results) => {
      if (err) {
  console.error('❌ DB ERROR:', err); // DEBUGGING LOG
  return reject({ status: 500, message: 'DB error', error: err });
}

      if (results.length === 0) return reject({ status: 401, message: 'Username tidak ditemukan' });

      const user = results[0];

      try {
        const match = await bcrypt.compare(password, user.password);
        if (!match) return reject({ status: 401, message: 'Password salah' });

        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role,
            pegawai_id: user.pegawai_id,
          },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );

        return resolve({
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            pegawai_id: user.pegawai_id,
          },
        });
      } catch (errCompare) {
        return reject({ status: 500, message: 'Gagal membandingkan password', error: errCompare });
      }
    });
  });
};

// Fungsi cari user by username
const findUserByUsername = (username) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

// Fungsi tambah user
const createUser = (username, hashedPassword, role, pegawai_id = null) => {
  const sql = pegawai_id
    ? `INSERT INTO users (username, password, role, pegawai_id) VALUES (?, ?, ?, ?)`
    : `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;

  const values = pegawai_id
    ? [username, hashedPassword, role, pegawai_id]
    : [username, hashedPassword, role];

  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// Fungsi tambah data pegawai
const createPegawai = (nama, nip, jabatan, no_telp, alamat) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO pegawai (nama, nip, jabatan, no_telp, alamat, tanggal_aktif)
                 VALUES (?, ?, ?, ?, ?, CURDATE())`;
    db.query(sql, [nama, nip, jabatan, no_telp, alamat], (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};

// Ambil semua pegawai
const getAllPegawai = () => {
  return new Promise((resolve, reject) => {
    db.query('SELECT id, nama FROM pegawai ORDER BY nama ASC', (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// ✅ Export lengkap
module.exports = {
  login,
  findUserByUsername,
  createUser,
  createPegawai,
  getAllPegawai,
};
