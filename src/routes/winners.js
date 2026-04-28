const router = require('express').Router();
const { getWinners, getStats } = require('../controllers/winnerController');
const { apiLimit } = require('../middleware/rateLimiter');

router.get('/',      apiLimit, getWinners);
router.get('/stats', apiLimit, getStats);

module.exports = router;
