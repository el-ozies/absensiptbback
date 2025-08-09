// modules/user/userController.js
const userModel = require("./userModel");

// Ambil semua user + data pegawai
exports.getUsers = (req, res) => {
  userModel.getAllUsers((err, results) => {
    if (err) {
      console.error("❌ Error getUsers:", err.sqlMessage || err);
      return res.status(500).json({ message: "Gagal mengambil data users" });
    }

    const safeResults = results.map((row) => ({
      id: row.id,
      username: row.username || "",
      role: row.role || "",
      pegawai_id: row.pegawai_id || null,
      nama: row.nama || "",
      nip: row.nip || "",
      jabatan: row.jabatan || "",
      no_telp: row.no_telp || "",
      alamat: row.alamat || ""
    }));

    res.json(safeResults);
  });
};

// Tambah user + pegawai
exports.createUser = (req, res) => {
  const { username, password, role, nama, nip, jabatan, no_telp, alamat } = req.body;

  if (!username || !password || !role || !nama || !nip) {
    return res.status(400).json({ message: "Data user & pegawai wajib diisi" });
  }

  userModel.hashPassword(password, (err, hashedPassword) => {
    if (err) {
      console.error("❌ Error hash password:", err);
      return res.status(500).json({ message: "Gagal mengenkripsi password" });
    }

    const userData = [username, hashedPassword, role];
    const pegawaiData = { nama, nip, jabatan, no_telp, alamat };

    userModel.insertUserAndPegawai(userData, pegawaiData, (err, result) => {
      if (err) {
        console.error("❌ Error insert user/pegawai:", err.sqlMessage || err);
        return res.status(500).json({ message: "Gagal membuat user", error: err.sqlMessage });
      }

      res.json({ message: "User dan pegawai berhasil dibuat", id: result.insertId });
    });
  });
};

// Update user + pegawai (opsional password)
exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { username, password, role, pegawai_id, nama, nip, jabatan, no_telp, alamat } = req.body;

  if (!username || !role || !pegawai_id) {
    return res.status(400).json({ message: "Data user & pegawai wajib diisi" });
  }

  const userData = { username, role, pegawai_id, user_id: id };
  const pegawaiData = { nama, nip, jabatan, no_telp, alamat };

  if (password) {
    userModel.hashPassword(password, (err, hashed) => {
      if (err) {
        console.error("❌ Error hash password:", err);
        return res.status(500).json({ message: "Gagal mengenkripsi password" });
      }
      userModel.updateUserWithPassword(
        [username, hashed, role, pegawai_id, id],
        (err) => {
          if (err) {
            console.error("❌ Error update user:", err.sqlMessage || err);
            return res.status(500).json({ message: "Gagal update user", error: err.sqlMessage });
          }

          userModel.updatePegawai(pegawaiData, pegawai_id, (err2) => {
            if (err2) {
              return res.status(500).json({ message: "Gagal update pegawai", error: err2.sqlMessage });
            }
            res.json({ message: "User dan pegawai berhasil diupdate" });
          });
        }
      );
    });
  } else {
    userModel.updateUserAndPegawai(userData, pegawaiData, (err) => {
      if (err) {
        console.error("❌ Error update:", err.sqlMessage || err);
        return res.status(500).json({ message: "Gagal update data", error: err.sqlMessage });
      }
      res.json({ message: "User dan pegawai berhasil diupdate" });
    });
  }
};

// Hapus user (+hapus pegawai jika tidak digunakan user lain)
exports.deleteUser = (req, res) => {
  const { id } = req.params;
  userModel.deleteUser(id, (err) => {
    if (err) {
      console.error("❌ Error deleteUser:", err.sqlMessage || err);
      return res.status(500).json({ message: "Gagal menghapus user", error: err.sqlMessage });
    }
    res.json({ message: "User berhasil dihapus" });
  });
};