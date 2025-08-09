// modules/auth/authController.js
const authModel = require('./authModel');
const bcrypt = require('bcryptjs');

// POST /login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  try {
    const result = await authModel.login(username, password);
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /register
exports.register = async (req, res) => {
  try {
    const { username, password, role, nama, nip, jabatan, no_telp, alamat } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    let pegawai_id = null;
    if (role === 'pegawai') {
      pegawai_id = await authModel.createPegawai(nama, nip, jabatan, no_telp, alamat);
    }

    await authModel.createUser(username, hashedPassword, role, pegawai_id);
    return res.json({ message: 'Registrasi berhasil' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /pegawai (opsional untuk form dropdown saat register)
exports.getPegawai = async (req, res) => {
  try {
    const result = await authModel.getAllPegawai();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
