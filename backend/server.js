/**
 * NutriCoach Backend Server
 * Node.js + Express API for AI features
 * Data operations go directly to Supabase from the mobile client
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/ai', require('./routes/ai'));
app.use('/api/meal-plan', require('./routes/mealplan'));
app.use('/api/recipe', require('./routes/recipe'));
app.use('/api/food', require('./routes/food'));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    ai_provider: process.env.AI_PROVIDER || 'openai',
    timestamp: new Date().toISOString(),
  });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🥦 NutriCoach API running on port ${PORT}`);
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
