const Draw    = require('../models/Draw');
const Ticket  = require('../models/Ticket');
const { stkPush, formatPhone, maskPhone } = require('../utils/mpesa');

const TICKET_PRICE = Number(process.env.TICKET_PRICE) || 100;

// POST /api/tickets/buy
const buyTicket = async (req, res) => {
  const { phone, quantity = 1 } = req.body;

  if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
  if (quantity < 1 || quantity > 10) {
    return res.status(400).json({ success: false, message: 'Quantity must be between 1 and 10' });
  }

  // Validate active draw
  const draw = await Draw.findOne({ status: 'open' }).sort({ drawDate: 1 });
  if (!draw) return res.status(400).json({ success: false, message: 'No active draw at this time. Check back soon!' });

  const formattedPhone = formatPhone(phone);
  const amount         = TICKET_PRICE * quantity;
  const orderId        = `NBW-${Date.now().toString(36).toUpperCase()}`;

  try {
    const stkResponse = await stkPush(formattedPhone, amount, orderId);

    if (stkResponse.ResponseCode !== '0') {
      return res.status(400).json({ success: false, message: stkResponse.CustomerMessage || 'Payment initiation failed' });
    }

    // Create pending ticket record — confirmed on M-PESA callback
    await Ticket.create({
      ticketId:  `PENDING-${orderId}`,  // replaced with real ID on callback
      phone:     formattedPhone,
      drawId:    draw._id,
      mpesaRef:  stkResponse.CheckoutRequestID,
      amount,
      quantity,
      status:    'pending',
    });

    res.json({
      success: true,
      message: `Check your phone (${maskPhone(formattedPhone)}) for an M-PESA prompt. Enter your PIN to complete payment.`,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      amount,
      quantity,
    });
  } catch (err) {
    console.error('[BuyTicket] STK Push error:', err.message);
    res.status(500).json({ success: false, message: 'Payment initiation failed. Please try again.' });
  }
};

// GET /api/tickets/status/:checkoutRequestId
const checkStatus = async (req, res) => {
  const ticket = await Ticket.findOne({ mpesaRef: req.params.checkoutRequestId });
  if (!ticket) return res.status(404).json({ success: false, message: 'Transaction not found' });

  res.json({
    success: true,
    status:   ticket.status,
    ticketId: ticket.status === 'confirmed' ? ticket.ticketId : null,
    phone:    maskPhone(ticket.phone),
  });
};

// GET /api/tickets/verify/:ticketId
const verifyTicket = async (req, res) => {
  const ticket = await Ticket.findOne({ ticketId: req.params.ticketId.toUpperCase() }).populate('drawId', 'drawDate title status');
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  res.json({
    success: true,
    ticket: {
      ticketId:    ticket.ticketId,
      status:      ticket.status,
      maskedPhone: maskPhone(ticket.phone),
      draw:        ticket.drawId,
      purchasedAt: ticket.purchasedAt,
    },
  });
};

// GET /api/tickets/phone/:phone
const myTickets = async (req, res) => {
  const formattedPhone = formatPhone(req.params.phone);
  const tickets = await Ticket.find({ phone: formattedPhone, status: 'confirmed' })
    .populate('drawId', 'drawDate title status')
    .sort({ purchasedAt: -1 })
    .limit(50);

  res.json({ success: true, count: tickets.length, tickets });
};

module.exports = { buyTicket, checkStatus, verifyTicket, myTickets };
