const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const Admin  = require('../models/Admin');
const Draw   = require('../models/Draw');
const Ticket = require('../models/Ticket');
const Winner = require('../models/Winner');
const { sendSMS, templates } = require('../utils/sms');
const { maskPhone } = require('../utils/mpesa');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/admin/login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  res.json({
    success: true,
    token: signToken(admin._id),
    admin: { id: admin._id, email: admin.email, role: admin.role },
  });
};

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  const [totalTickets, confirmedTickets, totalWinners, activeDraw, recentTickets] = await Promise.all([
    Ticket.countDocuments(),
    Ticket.countDocuments({ status: 'confirmed' }),
    Winner.countDocuments(),
    Draw.findOne({ status: { $in: ['open', 'upcoming'] } }).sort({ drawDate: 1 }),
    Ticket.find({ status: 'confirmed' }).sort({ purchasedAt: -1 }).limit(10),
  ]);

  const revenue = await Ticket.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  res.json({
    success: true,
    stats: {
      totalTickets,
      confirmedTickets,
      totalWinners,
      totalRevenue: revenue[0]?.total || 0,
    },
    activeDraw,
    recentTickets,
  });
};

// POST /api/admin/draws — create a new draw
const createDraw = async (req, res) => {
  const { drawNumber, title, drawDate, prizes, streamUrl } = req.body;

  const draw = await Draw.create({ drawNumber, title, drawDate, prizes, streamUrl });
  res.status(201).json({ success: true, draw });
};

// PATCH /api/admin/draws/:id/status — open / close draw
const updateDrawStatus = async (req, res) => {
  const { status } = req.body;
  const allowed    = ['upcoming', 'open', 'closed', 'completed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const draw = await Draw.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!draw) return res.status(404).json({ success: false, message: 'Draw not found' });

  res.json({ success: true, draw });
};

// POST /api/admin/draws/:id/execute — run RNG, select winner, create Winner record, send SMS
const executeDraw = async (req, res) => {
  const draw = await Draw.findById(req.params.id);
  if (!draw) return res.status(404).json({ success: false, message: 'Draw not found' });
  if (draw.status === 'completed') return res.status(400).json({ success: false, message: 'Draw already executed' });

  // Get all confirmed ticket IDs for this draw
  const tickets = await Ticket.find({ drawId: draw._id, status: 'confirmed' });
  if (tickets.length === 0) return res.status(400).json({ success: false, message: 'No confirmed tickets for this draw' });

  // Cryptographically secure RNG selection
  const rngSeed   = crypto.randomBytes(32).toString('hex');
  const rngBuffer = Buffer.from(rngSeed, 'hex');
  const rngInt    = rngBuffer.readUInt32BE(0);
  const winnerIdx = rngInt % tickets.length;
  const winnerTicket = tickets[winnerIdx];

  const grandPrize = draw.prizes.find(p => p.tier === 'grand') || draw.prizes[0];
  const drawDate   = new Date(draw.drawDate);
  const expiresAt  = new Date(drawDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Mark ticket as won
  await Ticket.findByIdAndUpdate(winnerTicket._id, { status: 'won' });

  // Create public winner record
  const winner = await Winner.create({
    ticketId:    winnerTicket.ticketId,
    maskedPhone: maskPhone(winnerTicket.phone),
    prize:       grandPrize?.name || 'Grand Prize',
    prizeValue:  grandPrize?.value || 0,
    prizeEmoji:  grandPrize?.emoji || '🏆',
    drawId:      draw._id,
    drawNumber:  draw.drawNumber,
    drawDate,
    expiresAt,
    featured:    true,
  });

  // Update draw record
  draw.status         = 'completed';
  draw.winnerTicketId = winnerTicket.ticketId;
  draw.winnerPhone    = winnerTicket.phone;
  draw.rngSeed        = rngSeed;
  draw.executedAt     = new Date();
  await draw.save();

  // Notify winner via SMS
  try {
    await sendSMS(winnerTicket.phone, templates.winner(winnerTicket.ticketId, grandPrize?.name || 'Grand Prize'));
  } catch (err) {
    console.error('[ExecuteDraw] SMS failed:', err.message);
  }

  res.json({
    success: true,
    message: 'Draw executed successfully.',
    winner: {
      ticketId:    winnerTicket.ticketId,
      maskedPhone: maskPhone(winnerTicket.phone),
      prize:       grandPrize?.name,
    },
    rngSeed,
    totalParticipants: tickets.length,
  });
};

// PATCH /api/admin/winners/:id
const updateWinner = async (req, res) => {
  const { claimStatus, firstName, location, testimonial, featured } = req.body;
  const updates = {};
  if (claimStatus)  updates.claimStatus  = claimStatus;
  if (firstName)    updates.firstName    = firstName;
  if (location)     updates.location     = location;
  if (testimonial)  updates.testimonial  = testimonial;
  if (featured !== undefined) updates.featured = featured;
  if (claimStatus === 'claimed') updates.claimedAt = new Date();

  const winner = await Winner.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!winner) return res.status(404).json({ success: false, message: 'Winner not found' });

  res.json({ success: true, winner });
};

// GET /api/admin/tickets?page=1&drawId=xxx
const getAllTickets = async (req, res) => {
  const page   = parseInt(req.query.page)  || 1;
  const limit  = parseInt(req.query.limit) || 20;
  const skip   = (page - 1) * limit;
  const filter = {};
  if (req.query.drawId) filter.drawId = req.query.drawId;
  if (req.query.status) filter.status = req.query.status;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ purchasedAt: -1 }).skip(skip).limit(limit),
    Ticket.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), tickets });
};

module.exports = { login, getDashboard, createDraw, updateDrawStatus, executeDraw, updateWinner, getAllTickets };
