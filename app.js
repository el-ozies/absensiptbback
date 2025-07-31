// app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const absensiRoutes = require('./routes/absensiRoutes');
const izinRoutes = require('./routes/izinRoutes')
const userRoutes = require('./routes/userRoutes');
const morgan = require('morgan');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/absensi', absensiRoutes);
app.use('/api/izin', izinRoutes); // ✅ otomatis /api/izin POST dan GET
app.use('/api/users', userRoutes);


// Root Route
app.get('/', (req, res) => {
  res.send('Sistem Absensi Pegawai PTB is running 🚀');
});

// Run Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
