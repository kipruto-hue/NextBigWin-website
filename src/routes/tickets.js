const router = require('express').Router();
const { buyTicket, checkStatus, verifyTicket, myTickets } = require('../controllers/ticketController');
const { buyLimit, apiLimit } = require('../middleware/rateLimiter');

router.post('/buy',                   buyLimit,  buyTicket);
router.get('/status/:checkoutRequestId', apiLimit, checkStatus);
router.get('/verify/:ticketId',       apiLimit,  verifyTicket);
router.get('/phone/:phone',           apiLimit,  myTickets);

module.exports = router;
