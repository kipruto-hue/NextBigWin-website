const router = require('express').Router();
const { handleUSSD } = require('../controllers/ussdController');

// Africa's Talking POSTs here
router.post('/', handleUSSD);

module.exports = router;
