const express = require('express');
const router = express.Router();
const izinController = require('../controllers/izinController');

router.post('/', izinController.ajukanIzin);
router.get('/pegawai/:pegawai_id', izinController.getIzinByPegawai);
router.get('/', izinController.getAllIzin);
router.put('/:id', izinController.validasiIzin);

module.exports = router;
