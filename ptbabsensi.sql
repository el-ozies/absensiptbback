-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 24 Jul 2025 pada 09.14
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ptbabsensi`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `absensi`
--

CREATE TABLE `absensi` (
  `id` int(11) NOT NULL,
  `pegawai_id` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `jam_masuk` time DEFAULT NULL,
  `jam_keluar` time DEFAULT NULL,
  `lokasi_masuk` varchar(100) DEFAULT NULL,
  `lokasi_keluar` varchar(100) DEFAULT NULL,
  `status` enum('Hadir','Terlambat','Pulang Cepat','Tidak Hadir') DEFAULT 'Hadir',
  `keterangan` text DEFAULT NULL,
  `keterlambatan` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `absensi`
--

INSERT INTO `absensi` (`id`, `pegawai_id`, `tanggal`, `jam_masuk`, `jam_keluar`, `lokasi_masuk`, `lokasi_keluar`, `status`, `keterangan`, `keterlambatan`) VALUES
(1, 1, '2025-07-21', '09:22:34', NULL, '-7.12355,112.6079342', NULL, 'Hadir', NULL, 0),
(2, 3, '2025-07-21', '11:09:37', NULL, '-7.12355,112.6079342', NULL, 'Hadir', NULL, 0),
(3, 4, '2025-07-21', '13:38:54', NULL, '-7.12355,112.6079342', NULL, 'Terlambat', NULL, 338),
(4, 5, '2025-07-21', '13:48:54', NULL, '-7.1205552,112.6004593', NULL, 'Terlambat', NULL, 348),
(5, 1, '2025-07-23', '09:42:17', NULL, '-7.1269268,112.6079343', NULL, 'Terlambat', NULL, 102),
(6, 3, '2025-07-24', '08:42:28', NULL, '-7.1205608,112.6004659', NULL, 'Terlambat', NULL, 42),
(7, 1, '2025-07-24', '09:45:44', NULL, '-7.1205608,112.6004659', NULL, 'Terlambat', NULL, 105),
(8, 4, '2025-07-24', '10:06:50', '10:19:28', '-7.1205608,112.6004659', '-7.1205608,112.6004659', 'Terlambat', NULL, 126);

-- --------------------------------------------------------

--
-- Struktur dari tabel `izin`
--

CREATE TABLE `izin` (
  `id` int(11) NOT NULL,
  `pegawai_id` int(11) NOT NULL,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date NOT NULL,
  `keterangan` text DEFAULT NULL,
  `status` enum('menunggu','disetujui','ditolak') DEFAULT 'menunggu',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `lokasi_kantor`
--

CREATE TABLE `lokasi_kantor` (
  `id` int(11) NOT NULL,
  `nama_lokasi` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `radius_meter` int(11) DEFAULT 50
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `pegawai`
--

CREATE TABLE `pegawai` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `nip` varchar(50) NOT NULL,
  `jabatan` varchar(100) DEFAULT NULL,
  `no_telp` varchar(20) DEFAULT NULL,
  `alamat` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `pegawai`
--

INSERT INTO `pegawai` (`id`, `nama`, `nip`, `jabatan`, `no_telp`, `alamat`) VALUES
(1, 'Budi Santoso', '12345678', 'Staff IT', '08123456789', 'Jl. Raya Manyar No.1'),
(2, 'Fauzi', '', NULL, NULL, NULL),
(3, 'Pauzi', '123', '123', '123', '123'),
(4, 'Lukman', '12234', '12233', '1234', '12'),
(5, 'Usman', '972983784273', 'Maleng', '783922', NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('pegawai','admin') NOT NULL,
  `pegawai_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `pegawai_id`) VALUES
(6, 'admin', '$2b$10$kHeyy43fZrYszH4ptB/2G.kv5DYUQ.xUxT77IvN4RKpKqIZNUNg3C', 'admin', NULL),
(7, 'pegawai', '$2b$10$KH7qQe9iJ03cYvFbCI../uBDgYcHBe8KRWtCaKb6DRVn/vsjcopka', 'pegawai', 1),
(8, 'pegawai2', '$2b$10$dsOsZ7xbGFAptgfDrje09ehzEEXQmOaeC4D3CrB9Fsc5/MpEwt/9u', 'pegawai', 1),
(9, 'bopupalukman@gmail.com', '$2b$10$i61T/uZWxLj/d1V8ZyAZ5.Lh3KlRJvJ/U1l/oVYUk3hB.gX9UEJS6', 'pegawai', 2),
(10, 'pegawai3', '$2b$10$gOjPROvd3l/WKQM55ch1o.L8NhoR4.FBpXrGjzVIO7SLO6sNlQ9iS', 'pegawai', 3),
(11, 'Pegawai4', '$2b$10$gwY1gXibx6Lb.D8XH4yZTeyOVewlFlREkellk2fvFOKmKGSZnDOhq', 'pegawai', 4),
(12, 'pegawai5', '$2b$10$Ud4mC6cQmHvSXAy76mWd4OKEE7xrq9Yk4qcKruEc0MZ1JEQ421Qcq', 'pegawai', 5);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `absensi`
--
ALTER TABLE `absensi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pegawai_id` (`pegawai_id`);

--
-- Indeks untuk tabel `izin`
--
ALTER TABLE `izin`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pegawai_id` (`pegawai_id`);

--
-- Indeks untuk tabel `lokasi_kantor`
--
ALTER TABLE `lokasi_kantor`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `pegawai`
--
ALTER TABLE `pegawai`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nip` (`nip`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `pegawai_id` (`pegawai_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `absensi`
--
ALTER TABLE `absensi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `izin`
--
ALTER TABLE `izin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `lokasi_kantor`
--
ALTER TABLE `lokasi_kantor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `pegawai`
--
ALTER TABLE `pegawai`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `absensi`
--
ALTER TABLE `absensi`
  ADD CONSTRAINT `absensi_ibfk_1` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `izin`
--
ALTER TABLE `izin`
  ADD CONSTRAINT `izin_ibfk_1` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
