const router = require('express').Router();
const { getCurrentDraw, getDrawHistory } = require('../controllers/drawController');
const { apiLimit } = require('../middleware/rateLimiter');

router.get('/current', apiLimit, getCurrentDraw);
router.get('/history', apiLimit, getDrawHistory);

module.exports = router;
