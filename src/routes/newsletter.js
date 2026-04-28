const router  = require('express').Router();
const { subscribe } = require('../controllers/newsletterController');
const { apiLimit } = require('../middleware/rateLimiter');

router.post('/subscribe', apiLimit, subscribe);

module.exports = router;
