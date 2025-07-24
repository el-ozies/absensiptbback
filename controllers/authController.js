const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// LOGIN
exports.login = (req, res) => {
  const { username, password } = req.body;

  const sql = `SELECT * FROM users WHERE username = ?`;
  db.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err });
    if (results.length === 0) return res.status(401).json({ message: 'Username tidak ditemukan' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Password salah' });

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        pegawai_id: user.pegawai_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        pegawai_id: user.pegawai_id
      }
    });
  });
};

// REGISTER
// ✅ REGISTER dengan insert ke pegawai
// REGISTER
exports.register = async (req, res) => {
  const { username, password, role, nama, nip, jabatan, no_telp, alamat } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Lengkapi semua field' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cek jika username sudah dipakai
    const sqlCheck = `SELECT * FROM users WHERE username = ?`;
    db.query(sqlCheck, [username], (err, results) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      if (results.length > 0) {
        return res.status(409).json({ message: 'Username sudah digunakan' });
      }

      // ✅ INSERT PEGAWAI JIKA role == pegawai
      if (role === 'pegawai') {
        const sqlPegawai = `
          INSERT INTO pegawai (nama, nip, jabatan, no_telp, alamat)
          VALUES (?, ?, ?, ?, ?)
        `;
        db.query(sqlPegawai, [nama, nip || null, jabatan || null, no_telp || null, alamat || null], (err2, result2) => {
          if (err2) return res.status(500).json({ message: 'Gagal tambah pegawai', error: err2 });

          const pegawai_id = result2.insertId;

          const sqlUser = `INSERT INTO users (username, password, role, pegawai_id) VALUES (?, ?, ?, ?)`;
          db.query(sqlUser, [username, hashedPassword, role, pegawai_id], (err3) => {
            if (err3) return res.status(500).json({ message: 'Gagal buat user', error: err3 });
            res.status(201).json({ message: 'Registrasi berhasil' });
          });
        });
      } else {
        // ✅ Admin tidak punya pegawai_id
        const sqlUser = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
        db.query(sqlUser, [username, hashedPassword, role], (err4) => {
          if (err4) return res.status(500).json({ message: 'Gagal buat user', error: err4 });
          res.status(201).json({ message: 'Registrasi berhasil' });
        });
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal hash password', error: err });
  }
};





// GET /api/pegawai
exports.getPegawai = (req, res) => {
  const sql = `SELECT id, nama FROM pegawai ORDER BY nama ASC`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal ambil data pegawai', error: err });
    res.json(result);
  });
};
