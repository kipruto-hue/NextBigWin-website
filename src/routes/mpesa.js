const router = require('express').Router();
const { callback } = require('../controllers/mpesaController');

// Safaricom POSTs here — no auth, no rate limit (Safaricom retries)
router.post('/callback', callback);

module.exports = router;
