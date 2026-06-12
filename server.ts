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
  currentLeagueId: '71',
  currentSeason: '2024',
  dataSource: 'manual',
  manualMatches: [
    { id: 'm1', tournament: 'Copa do Mundo 2026', stage: 'Fase de Grupos (Manual)', home: 'BRA', homeName: 'Brasil', homeLogo: 'https://flagcdn.com/w80/br.png', away: 'FRA', awayName: 'França', awayLogo: 'https://flagcdn.com/w80/fr.png', homeScore: 0, awayScore: 0, time: 0, status: 'SCHEDULED' }
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
  appData.currentLeagueId = currentLeagueId;
  appData.currentSeason = currentSeason;
  appData.dataSource = dataSource;
  appData.manualMatches = manualMatches;
  appData.bets = bets;
  appData.admins = allowedAdmins;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to save data file:", e);
  }
}


// API Integrations
const API_KEY = process.env.FOOTBALL_API_KEY;

// Suporte tanto para quem usa chave direto da api-sports quanto via RapidAPI
// Vamos inferir a URL com base no tamanho/formato da chave ou apenas tentar a principal
const isRapidApi = API_KEY && API_KEY.length > 40; // chaves rapidapi geralmente são mais longas
const API_HOST = isRapidApi 
  ? 'https://api-football-v1.p.rapidapi.com/v3'
  : 'https://v3.football.api-sports.io';

// Default mock matches used if no API Key is provided or API fails, representing 2026 Mens World Cup.
let cachedMatches = [
  { id: '1', tournament: 'Copa do Mundo 2026', stage: 'Fase de Grupos', home: 'BRA', homeName: 'Brasil', homeLogo: 'https://flagcdn.com/w80/br.png', away: 'FRA', awayName: 'França', awayLogo: 'https://flagcdn.com/w80/fr.png', homeScore: 2, awayScore: 1, time: 72, status: 'LIVE' },
  { id: '2', tournament: 'Copa do Mundo 2026', stage: 'Fase de Grupos', home: 'BRA', homeName: 'Brasil', homeLogo: 'https://flagcdn.com/w80/br.png', away: 'ARG', awayName: 'Argentina', awayLogo: 'https://flagcdn.com/w80/ar.png', homeScore: 0, awayScore: 0, time: 0, status: 'SCHEDULED' },
  { id: '3', tournament: 'Copa do Mundo 2026', stage: 'Fase de Grupos', home: 'BRA', homeName: 'Brasil', homeLogo: 'https://flagcdn.com/w80/br.png', away: 'ENG', awayName: 'Inglaterra', awayLogo: 'https://flagcdn.com/w80/gb-eng.png', homeScore: 0, awayScore: 0, time: 0, status: 'SCHEDULED' },
  { id: '4', tournament: 'Copa do Mundo 2026', stage: 'Oitavas de Final', home: 'BRA', homeName: 'Brasil', homeLogo: 'https://flagcdn.com/w80/br.png', away: 'ESP', awayName: 'Espanha', awayLogo: 'https://flagcdn.com/w80/es.png', homeScore: 0, awayScore: 0, time: 0, status: 'SCHEDULED' }
];

let activeMatchId = appData.activeMatchId;

// Configuração atual da API
let currentLeagueId = appData.currentLeagueId;
let currentSeason = appData.currentSeason;
let dataSource = appData.dataSource; // 'simulation', 'api-football', ou 'manual'

// Jogos administrados manualmente pelo painel
let manualMatches: any[] = appData.manualMatches;

// In-memory bets database
let bets: any[] = appData.bets;

let allowedAdmins: string[] = appData.admins;

let lastFetchTime = 0;
let apiError: string | null = null;

// Function to fetch real live data from Sports API
async function fetchRealMatches() {
  if (dataSource === 'manual') {
    apiError = null;
    return manualMatches;
  }

  if (dataSource === 'simulation') {
    apiError = null;
    return cachedMatches; // Usa nossos dados internos simulados
  }

  if (!API_KEY) {
    apiError = "Chave da API não fornecida no ambiente.";
    console.log("No FOOTBALL_API_KEY found.");
    return [];
  }
  
  // Rate limiting to prevent spamming
  if (Date.now() - lastFetchTime < 60000) {
    return cachedMatches;
  }
  
  try {
    // Busca as partidas baseadas na liga e temporada configuradas
    const response = await fetch(`${API_HOST}/fixtures?league=${currentLeagueId}&season=${currentSeason}`, {
      headers: {
        'x-rapidapi-key': API_KEY, // Se for via RapidAPI
        'x-apisports-key': API_KEY // Se for API-Sports direto
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error("API-Football Errors:", data.errors);
        apiError = "Erro da API: " + JSON.stringify(data.errors);
      } else if (data.response && data.response.length > 0) {
        apiError = null;
        cachedMatches = data.response.map((match: any) => ({
          id: match.fixture.id.toString(),
          tournament: match.league.name,
          stage: match.league.round,
          home: match.teams.home.symbol || match.teams.home.name.substring(0, 3).toUpperCase(),
          homeName: match.teams.home.name,
          homeLogo: match.teams.home.logo,
          away: match.teams.away.symbol || match.teams.away.name.substring(0, 3).toUpperCase(),
          awayName: match.teams.away.name,
          awayLogo: match.teams.away.logo,
          homeScore: match.goals.home ?? 0,
          awayScore: match.goals.away ?? 0,
          time: match.fixture.status.elapsed ?? 0,
          status: match.fixture.status.short === 'FT' ? 'FINISHED' : 
                  (match.fixture.status.short === 'NS' ? 'SCHEDULED' : 'LIVE')
        }));
        
        if (!cachedMatches.find(m => m.id === activeMatchId)) {
          activeMatchId = cachedMatches[0].id;
        }
      } else {
        console.warn(`A API conectou com sucesso, mas retornou 0 jogos para LIGA ${currentLeagueId} e TEMPORADA ${currentSeason}.`);
        apiError = `A API conectou, mas a temporada ${currentSeason} da liga ${currentLeagueId} não retornou jogos (podem não estar disponíveis ainda na API).`;
      }
      lastFetchTime = Date.now();
    } else {
      apiError = `Erro HTTP da API: ${response.status} ${response.statusText}`;
      console.error(apiError);
    }
  } catch (error: any) {
    apiError = `Erro na requisição para a API: ${error.message}`;
    console.error("Failed to fetch from real API", error);
  }
  
  return cachedMatches;
}

// API: Update settings
app.post('/api/settings', (req, res) => {
  const { leagueId, season, newDataSource } = req.body;
  if (leagueId) currentLeagueId = leagueId;
  if (season) currentSeason = season;
  if (newDataSource) {
    dataSource = newDataSource;
    // Se mudou para manual, garanta que temos um id ativo válido daquela fonte
    if (dataSource === 'manual' && manualMatches.length > 0) {
      if (!manualMatches.find(m => m.id === activeMatchId)) activeMatchId = manualMatches[0].id;
    }
  }
  // Reset last fetch so it fetches again immediately on next call
  lastFetchTime = 0; 
  saveAll();
  res.json({ success: true, currentLeagueId, currentSeason, dataSource });
});

// APIs para Cadastro e Gestão Manual de Partidas
app.post('/api/matches/manual', (req, res) => {
  const { homeName, awayName, homeCode, awayCode } = req.body;
  const newMatch = {
    id: 'm_' + Date.now(),
    tournament: 'Copa do Mundo 2026',
    stage: 'Jogos (Manual)',
    home: homeName ? homeName.substring(0, 3).toUpperCase() : 'HOM',
    homeName: homeName || 'Home',
    homeLogo: homeCode ? `https://flagcdn.com/w80/${homeCode.toLowerCase()}.png` : null,
    away: awayName ? awayName.substring(0, 3).toUpperCase() : 'AWY',
    awayName: awayName || 'Away',
    awayLogo: awayCode ? `https://flagcdn.com/w80/${awayCode.toLowerCase()}.png` : null,
    homeScore: 0,
    awayScore: 0,
    time: 0,
    status: 'SCHEDULED'
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

// Endpoint para ajudar a debugar a conexão com a API
app.get('/api/debug', (req, res) => {
  res.json({
    usingRealApi: dataSource === 'api-football' && !!API_KEY,
    apiKeyConfigured: !!API_KEY,
    dataSource,
    currentLeagueId,
    currentSeason,
    lastError: apiError,
    matchesCount: cachedMatches.length,
    cachedMatches
  });
});

// Simulate a live sports API updating match clocks and scores online Se no modo Simulação
setInterval(() => {
  if (dataSource === 'simulation') {
    cachedMatches.forEach(m => {
      if (m.status === 'LIVE' && m.time < 90) {
        m.time += 1;
        if (Math.random() < 0.02) {
          if (Math.random() > 0.5) m.homeScore++;
          else m.awayScore++;
        }
      } else if (m.status === 'LIVE' && m.time >= 90) {
        m.status = 'FINISHED';
      }
    });
  }
}, 60000);

// API: Get all matches from the "Sports Page"
app.get('/api/matches', async (req, res) => {
  const matches = await fetchRealMatches();
  res.json(matches);
});

// API: Get the currently active match for the app interface
app.get('/api/matches/active', async (req, res) => {
  const matches = await fetchRealMatches();
  const active = matches.find(m => m.id === activeMatchId);
  res.json(active || matches[0]);
});

// API: Set the active match
app.post('/api/matches/active', async (req, res) => {
  const { id } = req.body;
  const matches = await fetchRealMatches();
  if (matches.find(m => m.id === id)) {
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
