const db = require('../config/db');
const bcrypt = require('bcryptjs');
const moment = require('moment');

// ✅ Ambil semua user beserta data pegawai
exports.getUsers = (req, res) => {
  const sql = `
    SELECT users.id, users.username, users.role,
           pegawai.id AS pegawai_id, pegawai.nama, pegawai.nip,
           pegawai.jabatan, pegawai.no_telp, pegawai.alamat
    FROM users
    LEFT JOIN pegawai ON users.pegawai_id = pegawai.id
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Get Users Error:', err); // ← log ke server
      return res.status(500).json({ message: 'Gagal ambil data user', error: err });
    }
    res.json(result);
  });
};



// ✅ Tambah user + pegawai baru (untuk admin)
exports.createUser = (req, res) => {
  const { username, password, role, nama, nip, jabatan, no_telp, alamat } = req.body;

  if (!username || !password || !nama || !nip) {
    return res.status(400).json({ message: 'Lengkapi semua data wajib' });
  }

  const tanggal_aktif = new Date().toISOString().split('T')[0];

  // 1. Insert ke pegawai
  const insertPegawaiSQL = `
    INSERT INTO pegawai (nama, nip, jabatan, no_telp, alamat, tanggal_aktif)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(insertPegawaiSQL, [nama, nip, jabatan, no_telp, alamat, tanggal_aktif], (err, pegawaiResult) => {
    if (err) {
      console.error('Error insert pegawai:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'NIP sudah terdaftar' });
      }
      return res.status(500).json({ message: 'Gagal insert pegawai', error: err });
    }

    const pegawaiId = pegawaiResult.insertId;

    // 2. Hash password
    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error('Error hash password:', hashErr);
        return res.status(500).json({ message: 'Gagal hash password' });
      }

      // 3. Insert user
      const insertUserSQL = `
        INSERT INTO users (username, password, role, pegawai_id)
        VALUES (?, ?, ?, ?)
      `;
      db.query(insertUserSQL, [username, hashedPassword, role, pegawaiId], (userErr) => {
        if (userErr) {
          console.error('Error insert user:', userErr);
          if (userErr.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Username sudah terdaftar' });
          }
          return res.status(500).json({ message: 'Gagal insert user', error: userErr });
        }

        res.status(201).json({ message: 'User berhasil ditambahkan' });
      });
    });
  });
};






// ✅ Update user dan data pegawai
exports.updateUser = (req, res) => {
  const id = req.params.id;
  const { username, role, nama, nip, jabatan, email, no_telp, alamat } = req.body;

  // Ambil data pegawai_id dari user
  db.query(`SELECT pegawai_id FROM users WHERE id = ?`, [id], (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

    const pegawaiId = result[0].pegawai_id;

    // 1. Update data pegawai
    const updatePegawaiSQL = `
      UPDATE pegawai SET nama=?, nip=?, jabatan=?, no_telp=?, alamat=? WHERE id=?
    `;
    db.query(updatePegawaiSQL, [nama, nip, jabatan, no_telp, alamat, pegawaiId], (err2) => {
      if (err2) return res.status(500).json({ message: 'Gagal update pegawai', error: err2 });

      // 2. Update data user
      const updateUserSQL = `UPDATE users SET username=?, role=? WHERE id=?`;
      db.query(updateUserSQL, [username, role, id], (err3) => {
        if (err3) return res.status(500).json({ message: 'Gagal update user', error: err3 });

        res.json({ message: 'User dan pegawai berhasil diupdate' });
      });
    });
  });
};

// ✅ Hapus user + pegawai yang terkait
exports.deleteUser = (req, res) => {
  const id = req.params.id;

  // 1. Ambil pegawai_id dari user
  db.query(`SELECT pegawai_id FROM users WHERE id = ?`, [id], (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

    const pegawaiId = result[0].pegawai_id;

    // 2. Hapus user
    db.query(`DELETE FROM users WHERE id = ?`, [id], (err2) => {
      if (err2) return res.status(500).json({ message: 'Gagal hapus user', error: err2 });

      // 3. Hapus pegawai
      db.query(`DELETE FROM pegawai WHERE id = ?`, [pegawaiId], (err3) => {
        if (err3) return res.status(500).json({ message: 'User terhapus, tapi gagal hapus pegawai', error: err3 });

        res.json({ message: 'User dan pegawai berhasil dihapus' });
      });
    });
  });
};
