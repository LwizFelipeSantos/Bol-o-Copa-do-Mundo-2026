import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import fs from 'fs';

const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = 3000;

const DATA_FILE = path.join(process.cwd(), 'app_data.json');

let appData = {
  activeMatchId: 'm1',
  manualMatches: [
    { id: 'm1', tournament: 'Copa do Mundo 2026', stage: 'Fase de Grupos', home: 'BRA', homeName: 'Brasil', homeLogo: 'https://flagcdn.com/w80/br.png', away: 'FRA', awayName: 'França', awayLogo: 'https://flagcdn.com/w80/fr.png', homeScore: 0, awayScore: 0, time: 0, status: 'SCHEDULED', matchDate: '' }
  ],
  bets: [] as any[],
  admins: ['LuizFelipeNGL@gmail.com'] as string[]
};

try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    appData = { ...appData, ...JSON.parse(data) };
    if (!appData.admins || appData.admins.length === 0) appData.admins = ['LuizFelipeNGL@gmail.com'];
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf-8');
  }
} catch (e) {
  console.error("Failed to load or save data file:", e);
}

function saveAll() {
  appData.activeMatchId = activeMatchId;
  appData.manualMatches = manualMatches;
  appData.bets = bets;
  appData.admins = allowedAdmins;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to save data file:", e);
  }
}


// API Integrations removed for exclusively manual usage

let activeMatchId = appData.activeMatchId;

// Jogos administrados manualmente pelo painel
let manualMatches: any[] = appData.manualMatches;

// In-memory bets database
let bets: any[] = appData.bets;

let allowedAdmins: string[] = appData.admins;

// API: Update settings (Simplified)
app.post('/api/settings', (req, res) => {
  saveAll();
  res.json({ success: true });
});

// APIs para Cadastro e Gestão Manual de Partidas
app.post('/api/matches/manual', (req, res) => {
  const { homeName, awayName, homeCode, awayCode, matchDate } = req.body;
  const newMatch = {
    id: 'm_' + Date.now(),
    tournament: 'Copa do Mundo 2026',
    stage: 'Jogos',
    home: homeName ? homeName.substring(0, 3).toUpperCase() : 'HOM',
    homeName: homeName || 'Home',
    homeLogo: homeCode ? `https://flagcdn.com/w80/${homeCode.toLowerCase()}.png` : null,
    away: awayName ? awayName.substring(0, 3).toUpperCase() : 'AWY',
    awayName: awayName || 'Away',
    awayLogo: awayCode ? `https://flagcdn.com/w80/${awayCode.toLowerCase()}.png` : null,
    homeScore: 0,
    awayScore: 0,
    time: 0,
    status: 'SCHEDULED',
    matchDate: matchDate || ''
  };
  manualMatches.push(newMatch);
  if (!activeMatchId || !manualMatches.find(m => m.id === activeMatchId)) activeMatchId = newMatch.id;
  saveAll();
  res.json(newMatch);
});

app.put('/api/matches/manual/:id', (req, res) => {
  const { id } = req.params;
  const index = manualMatches.findIndex(m => m.id === id);
  if (index > -1) {
    manualMatches[index] = { ...manualMatches[index], ...req.body };
    saveAll();
    res.json(manualMatches[index]);
  } else {
    res.status(404).json({ error: 'Nao encontrado' });
  }
});

app.delete('/api/matches/manual/:id', (req, res) => {
  const { id } = req.params;
  manualMatches = manualMatches.filter(m => m.id !== id);
  if (activeMatchId === id) {
    activeMatchId = manualMatches.length > 0 ? manualMatches[0].id : '';
  }
  saveAll();
  res.json({ success: true });
});

// Endpoint para ajudar a debugar
app.get('/api/debug', (req, res) => {
  res.json({
    usingRealApi: false,
    matchesCount: manualMatches.length,
  });
});

// API: Get all matches
app.get('/api/matches', async (req, res) => {
  res.json(manualMatches);
});

// API: Get the currently active match for the app interface
app.get('/api/matches/active', async (req, res) => {
  const active = manualMatches.find(m => m.id === activeMatchId);
  res.json(active || manualMatches[0] || null);
});

// API: Set the active match
app.post('/api/matches/active', async (req, res) => {
  const { id } = req.body;
  if (manualMatches.find(m => m.id === id)) {
    activeMatchId = id;
    saveAll();
    res.json({ success: true, activeMatchId });
  } else {
    res.status(404).json({ error: 'Match not found' });
  }
});

// API: Get bets for a specific match
app.get('/api/bets', (req, res) => {
  const matchId = req.query.matchId as string || activeMatchId;
  const matchBets = bets.filter(b => b.matchId === matchId);
  res.json(matchBets);
});

// API: Register a new bet
app.post('/api/bets', (req, res) => {
  const newBet = {
    ...req.body,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
  bets.push(newBet);
  saveAll();
  res.json(newBet);
});

// API: Update a bet
app.put('/api/bets/:id', (req, res) => {
  const { id } = req.params;
  const index = bets.findIndex(b => b.id === id);
  if (index > -1) {
    bets[index] = { ...bets[index], ...req.body };
    saveAll();
    res.json(bets[index]);
  } else {
    res.status(404).json({ error: 'Bet not found' });
  }
});

// API: Delete a bet
app.delete('/api/bets/:id', (req, res) => {
  bets = bets.filter(b => b.id !== req.params.id);
  saveAll();
  res.json({ success: true });
});

app.get('/api/admins', (req, res) => {
  res.json(allowedAdmins);
});

app.post('/api/admins', (req, res) => {
  const { email } = req.body;
  if (email && !allowedAdmins.includes(email)) {
    allowedAdmins.push(email);
    saveAll();
  }
  res.json(allowedAdmins);
});

app.delete('/api/admins', (req, res) => {
  const { email } = req.body;
  if (email && email !== 'LuizFelipeNGL@gmail.com') {
    allowedAdmins = allowedAdmins.filter(a => a !== email);
    saveAll();
  }
  res.json(allowedAdmins);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
