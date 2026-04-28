const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
  ticketId:    { type: String, required: true },
  maskedPhone: { type: String, required: true },  // "0712***678"
  firstName:   { type: String },                  // optional, added after verification
  location:    { type: String },
  prize:       { type: String, required: true },
  prizeValue:  { type: Number },
  prizeEmoji:  { type: String, default: '🏆' },
  drawId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Draw' },
  drawNumber:  { type: Number },
  drawDate:    { type: Date },
  claimStatus: {
    type: String,
    enum: ['pending', 'verified', 'claimed', 'expired'],
    default: 'pending',
  },
  claimedAt:  { type: Date },
  expiresAt:  { type: Date },    // drawDate + 30 days
  testimonial:{ type: String },
  featured:   { type: Boolean, default: false },
  avatarColor:{ type: String, default: '#D4AF37' },
}, { timestamps: true });

winnerSchema.index({ drawDate: -1 });
winnerSchema.index({ featured: 1 });

module.exports = mongoose.model('Winner', winnerSchema);
