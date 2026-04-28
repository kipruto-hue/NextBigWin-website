const Draw = require('../models/Draw');

// GET /api/draws/current
const getCurrentDraw = async (req, res) => {
  const draw = await Draw.findOne({ status: { $in: ['open', 'upcoming'] } }).sort({ drawDate: 1 });
  if (!draw) return res.status(404).json({ success: false, message: 'No active draw' });

  res.json({ success: true, draw });
};

// GET /api/draws/history
const getDrawHistory = async (req, res) => {
  const page  = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip  = (page - 1) * limit;

  const [draws, total] = await Promise.all([
    Draw.find({ status: 'completed' }).sort({ drawDate: -1 }).skip(skip).limit(limit),
    Draw.countDocuments({ status: 'completed' }),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), draws });
};

module.exports = { getCurrentDraw, getDrawHistory };
