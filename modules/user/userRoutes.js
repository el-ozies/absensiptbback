// modules/users/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("./userController");
const { verifyToken } = require("../../middleware/authMiddleware");

// Semua endpoint user + pegawai
router.get("/", verifyToken, userController.getUsers);
router.post("/", verifyToken, userController.createUser);
router.put("/:id", verifyToken, userController.updateUser);
router.delete("/:id", verifyToken, userController.deleteUser);

module.exports = router;
