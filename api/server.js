const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/students',     require('./routes/students'));
app.use('/api/surveys',      require('./routes/surveys'));
app.use('/api/library',      require('./routes/library'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/system-users', require('./routes/systemUsers'));

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date() }));

// Solo escuchar puerto en local
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));
}

module.exports = app;