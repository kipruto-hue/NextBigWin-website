const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId:  { type: String, required: true, unique: true, uppercase: true },
  phone:     { type: String, required: true, index: true },   // "254XXXXXXXXX"
  drawId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Draw', required: true, index: true },
  mpesaRef:  { type: String, index: true },                   // Safaricom transaction ref
  amount:    { type: Number, required: true, default: 100 },
  quantity:  { type: Number, default: 1 },                    // tickets in this transaction
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'won'],
    default: 'pending',
    index: true,
  },
  smsDelivered: { type: Boolean, default: false },
  purchasedAt:  { type: Date, default: Date.now },
}, { timestamps: true });

ticketSchema.index({ phone: 1, drawId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
