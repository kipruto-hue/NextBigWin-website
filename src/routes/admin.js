const router = require('express').Router();
const {
  login, getDashboard, createDraw, updateDrawStatus,
  executeDraw, updateWinner, getAllTickets,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { loginLimit, apiLimit } = require('../middleware/rateLimiter');

// Public
router.post('/login', loginLimit, login);

// Protected — all routes below require valid JWT
router.use(protect);

router.get('/dashboard',                   apiLimit, getDashboard);
router.get('/tickets',                     apiLimit, getAllTickets);
router.post('/draws',                      apiLimit, createDraw);
router.patch('/draws/:id/status',          apiLimit, updateDrawStatus);
router.post('/draws/:id/execute',          apiLimit, executeDraw);
router.patch('/winners/:id',               apiLimit, updateWinner);

module.exports = router;
