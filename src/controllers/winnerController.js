const Winner = require('../models/Winner');

// GET /api/winners?page=1&limit=12&featured=true
const getWinners = async (req, res) => {
  const page     = parseInt(req.query.page)  || 1;
  const limit    = parseInt(req.query.limit) || 12;
  const skip     = (page - 1) * limit;
  const featured = req.query.featured === 'true';

  const filter = featured ? { featured: true } : {};

  const [winners, total] = await Promise.all([
    Winner.find(filter).sort({ drawDate: -1 }).skip(skip).limit(limit),
    Winner.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), winners });
};

// GET /api/winners/stats
const getStats = async (req, res) => {
  const [totalWinners, totalPrizeValue] = await Promise.all([
    Winner.countDocuments(),
    Winner.aggregate([{ $group: { _id: null, total: { $sum: '$prizeValue' } } }]),
  ]);

  res.json({
    success: true,
    stats: {
      totalWinners,
      totalPrizeValue: totalPrizeValue[0]?.total || 0,
    },
  });
};

module.exports = { getWinners, getStats };
