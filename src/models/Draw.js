const mongoose = require('mongoose');

const prizeSchema = new mongoose.Schema({
  tier:    { type: String, required: true },          // 'grand' | 'weekly' | 'daily'
  name:    { type: String, required: true },
  value:   { type: Number, required: true },           // KES
  emoji:   { type: String, default: '🎁' },
  imageUrl:{ type: String },
}, { _id: false });

const drawSchema = new mongoose.Schema({
  drawNumber: { type: Number, required: true, unique: true },
  title:      { type: String, required: true },
  drawDate:   { type: Date, required: true },
  prizes:     [prizeSchema],
  streamUrl:  { type: String },
  status: {
    type: String,
    enum: ['upcoming', 'open', 'closed', 'completed'],
    default: 'upcoming',
  },
  totalTickets: { type: Number, default: 0 },
  // Set after draw executes
  winnerTicketId: { type: String },
  winnerPhone:    { type: String },
  rngSeed:        { type: String },   // stored for audit/transparency
  executedAt:     { type: Date },
}, { timestamps: true });

drawSchema.index({ status: 1 });
drawSchema.index({ drawDate: -1 });

module.exports = mongoose.model('Draw', drawSchema);
