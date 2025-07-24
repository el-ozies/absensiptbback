//opsional
const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getUsers = (req, res) => {
  db.query(`SELECT * FROM users`, (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil data user' });
    res.json(result);
  });
};

exports.createUser = async (req, res) => {
  const { username, password, role, pegawai_id } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const sql = `INSERT INTO users (username, password, role, pegawai_id) VALUES (?, ?, ?, ?)`;

  db.query(sql, [username, hashed, role, pegawai_id], (err) => {
    if (err) return res.status(500).json({ message: 'Gagal tambah user', error: err });
    res.json({ message: 'User berhasil ditambahkan' });
  });
};
