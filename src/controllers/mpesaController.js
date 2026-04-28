const Ticket = require('../models/Ticket');
const Draw   = require('../models/Draw');
const { generateTicketId } = require('../utils/ticketId');
const { sendSMS, templates } = require('../utils/sms');
const { maskPhone } = require('../utils/mpesa');

// POST /api/mpesa/callback  — called by Safaricom
const callback = async (req, res) => {
  // Always acknowledge Safaricom immediately (they retry if no 200)
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const { Body } = req.body;
    const stk = Body?.stkCallback;
    if (!stk) return;

    const checkoutId = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode;

    const ticket = await Ticket.findOne({ mpesaRef: checkoutId });
    if (!ticket) {
      console.warn('[MpesaCallback] No pending ticket for:', checkoutId);
      return;
    }

    // Payment failed
    if (resultCode !== 0) {
      ticket.status = 'cancelled';
      await ticket.save();
      console.log(`[MpesaCallback] Payment failed for ${checkoutId}: code ${resultCode}`);
      return;
    }

    // Extract M-PESA metadata
    const meta    = stk.CallbackMetadata?.Item || [];
    const getMeta = (name) => meta.find(i => i.Name === name)?.Value;
    const mpesaCode = getMeta('MpesaReceiptNumber');
    const paidPhone = getMeta('PhoneNumber')?.toString();

    // Generate ticket IDs for each ticket in bulk purchase
    const ticketIds = [];
    for (let i = 0; i < ticket.quantity; i++) {
      ticketIds.push(generateTicketId());
    }

    // Use the first generated ID as the primary ticket ID
    ticket.ticketId   = ticketIds[0];
    ticket.mpesaRef   = mpesaCode || ticket.mpesaRef;
    ticket.status     = 'confirmed';
    ticket.smsDelivered = false;
    await ticket.save();

    // If bulk purchase, create additional ticket records
    if (ticket.quantity > 1) {
      const extraTickets = ticketIds.slice(1).map(tid => ({
        ticketId:  tid,
        phone:     paidPhone || ticket.phone,
        drawId:    ticket.drawId,
        mpesaRef:  mpesaCode || ticket.mpesaRef,
        amount:    Number(process.env.TICKET_PRICE) || 100,
        quantity:  1,
        status:    'confirmed',
        smsDelivered: false,
      }));
      await Ticket.insertMany(extraTickets);
    }

    // Increment draw ticket count
    await Draw.findByIdAndUpdate(ticket.drawId, { $inc: { totalTickets: ticket.quantity } });

    // Send SMS confirmation
    const draw = await Draw.findById(ticket.drawId);
    const drawDateStr = draw
      ? draw.drawDate.toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
      : 'upcoming draw';

    const smsMessage = ticket.quantity === 1
      ? templates.ticketConfirmed(ticketIds[0], drawDateStr)
      : templates.ticketsBulk(ticketIds, drawDateStr);

    await sendSMS(paidPhone || ticket.phone, smsMessage);
    ticket.smsDelivered = true;
    await ticket.save();

    console.log(`[MpesaCallback] ✅ ${ticket.quantity} ticket(s) confirmed for ${maskPhone(ticket.phone)}: ${ticketIds.join(', ')}`);
  } catch (err) {
    console.error('[MpesaCallback] Processing error:', err.message);
  }
};

module.exports = { callback };
