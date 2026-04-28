const Subscriber = require('../models/Subscriber');

// POST /api/newsletter/subscribe
const subscribe = async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email required' });
  }

  const existing = await Subscriber.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.json({ success: true, message: "You're already subscribed! We'll keep you posted." });
  }

  await Subscriber.create({ email });
  res.json({ success: true, message: "You're subscribed! Get ready for winner alerts. 🎉" });
};

module.exports = { subscribe };
