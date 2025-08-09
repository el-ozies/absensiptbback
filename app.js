// app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Modular Routes
app.use('/api/auth', require('./modules/auth/authRoutes'));
app.use('/api/absensi', require('./modules/absensi/absensiRoutes'));
app.use('/api/izin', require('./modules/izin/izinRoutes'));
app.use('/api/users', require('./modules/user/userRoutes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboardRoutes'));
app.use('/api/log', require('./modules/log/logRoutes')); // jika log dimodularisasi

// Root Route
app.get('/', (req, res) => {
  res.send('Sistem Absensi Pegawai PTB is running 🚀');
});

// Run Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
