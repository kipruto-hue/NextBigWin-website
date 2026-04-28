require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const path     = require('path');

const connectDB    = require('./src/config/db');
const ticketRoutes    = require('./src/routes/tickets');
const mpesaRoutes     = require('./src/routes/mpesa');
const ussdRoutes      = require('./src/routes/ussd');
const drawRoutes      = require('./src/routes/draws');
const winnerRoutes    = require('./src/routes/winners');
const newsletterRoutes= require('./src/routes/newsletter');
const adminRoutes     = require('./src/routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Database ─────────────────────────────────────────────────
connectDB();

// ── Core middleware ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // relax for inline styles in frontend
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API routes ────────────────────────────────────────────────
app.use('/api/tickets',    ticketRoutes);
app.use('/api/mpesa',      mpesaRoutes);
app.use('/api/ussd',       ussdRoutes);
app.use('/api/draws',      drawRoutes);
app.use('/api/winners',    winnerRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin',      adminRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Serve frontend ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 NextBigWin server running on http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
});
