import React, { useState, useMemo, useEffect } from 'react';
import { ShieldAlert, Trophy, Plus, CheckCircle2, Trash2, Edit, Activity, ListTodo, User, LogOut, Upload } from 'lucide-react';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

type Match = {
  id: string;
  tournament?: string;
  stage?: string;
  home: string;
  homeName: string;
  homeLogo?: string;
  away: string;
  awayName: string;
  awayLogo?: string;
  homeScore: number;
  awayScore: number;
  time: number;
  status: string;
};

type Bet = {
  id: string;
  matchId: string;
  name: string;
  avatarUrl?: string;
  scoreBra: number;
  scoreOpponent: number;
  amount: number;
  timestamp: string;
};

const WORLD_CUP_TEAMS = [
  { name: 'Alemanha', code: 'de' },
  { name: 'Arábia Saudita', code: 'sa' },
  { name: 'Argentina', code: 'ar' },
  { name: 'Austrália', code: 'au' },
  { name: 'Bélgica', code: 'be' },
  { name: 'Bolívia', code: 'bo' },
  { name: 'Bósnia e Herzegovina', code: 'ba' },
  { name: 'Brasil', code: 'br' },
  { name: 'Camarões', code: 'cm' },
  { name: 'Canadá', code: 'ca' },
  { name: 'Catar', code: 'qa' },
  { name: 'Chile', code: 'cl' },
  { name: 'Colômbia', code: 'co' },
  { name: 'Coreia do Sul', code: 'kr' },
  { name: 'Costa do Marfim', code: 'ci' },
  { name: 'Costa Rica', code: 'cr' },
  { name: 'Croácia', code: 'hr' },
  { name: 'Dinamarca', code: 'dk' },
  { name: 'Egito', code: 'eg' },
  { name: 'Equador', code: 'ec' },
  { name: 'Escócia', code: 'gb-sct' },
  { name: 'Eslováquia', code: 'sk' },
  { name: 'Espanha', code: 'es' },
  { name: 'EUA', code: 'us' },
  { name: 'França', code: 'fr' },
  { name: 'Gana', code: 'gh' },
  { name: 'Grécia', code: 'gr' },
  { name: 'Haiti', code: 'ht' },
  { name: 'Holanda', code: 'nl' },
  { name: 'Honduras', code: 'hn' },
  { name: 'Inglaterra', code: 'gb-eng' },
  { name: 'Irã', code: 'ir' },
  { name: 'Itália', code: 'it' },
  { name: 'Jamaica', code: 'jm' },
  { name: 'Japão', code: 'jp' },
  { name: 'Marrocos', code: 'ma' },
  { name: 'México', code: 'mx' },
  { name: 'Nigéria', code: 'ng' },
  { name: 'Nova Zelândia', code: 'nz' },
  { name: 'País de Gales', code: 'gb-wls' },
  { name: 'Panamá', code: 'pa' },
  { name: 'Paraguai', code: 'py' },
  { name: 'Peru', code: 'pe' },
  { name: 'Polônia', code: 'pl' },
  { name: 'Portugal', code: 'pt' },
  { name: 'Senegal', code: 'sn' },
  { name: 'Sérvia', code: 'rs' },
  { name: 'Suécia', code: 'se' },
  { name: 'Suíça', code: 'ch' },
  { name: 'Tunísia', code: 'tn' },
  { name: 'Ucrânia', code: 'ua' },
  { name: 'Uruguai', code: 'uy' },
  { name: 'Venezuela', code: 've' }
].sort((a,b) => a.name.localeCompare(b.name));

export default function App() {
  const [matchState, setMatchState] = useState<Match | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'ranking'>('current');

  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [allowedAdmins, setAllowedAdmins] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // API Debug & Settings
  const [apiDebug, setApiDebug] = useState<any>(null);
  const [leagueIdInput, setLeagueIdInput] = useState('');
  const [seasonInput, setSeasonInput] = useState('');
  const [dataSourceInput, setDataSourceInput] = useState('simulation');

  // New Bet Form
  const [newBetName, setNewBetName] = useState('');
  const [newBetAvatar, setNewBetAvatar] = useState('');
  const [newBetBra, setNewBetBra] = useState('');
  const [newBetOpp, setNewBetOpp] = useState('');
  const [newBetAmount, setNewBetAmount] = useState('');

  // Editing Bet Form
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [editingBetData, setEditingBetData] = useState<Partial<Bet>>({});

  // Manual Match Form
  const [newHomeTeam, setNewHomeTeam] = useState(WORLD_CUP_TEAMS.find(t=>t.code === 'br')?.code || WORLD_CUP_TEAMS[0].code);
  const [newAwayTeam, setNewAwayTeam] = useState(WORLD_CUP_TEAMS.find(t=>t.code === 'fr')?.code || WORLD_CUP_TEAMS[1].code);
  
  // Admin Panel Setup
  const [selectedMatchId, setSelectedMatchId] = useState('');

  const fetchActiveData = async () => {
    try {
      const matchRes = await fetch('/api/matches/active');
      const activeMatch = await matchRes.json();
      setMatchState(activeMatch);
      setSelectedMatchId(activeMatch.id);

      const betsRes = await fetch(`/api/bets?matchId=${activeMatch.id}`);
      const activeBets = await betsRes.json();
      setBets(activeBets);

      const allBetsRes = await fetch(`/api/bets`);
      const allB = await allBetsRes.json();
      setAllBets(allB);

      const allRes = await fetch('/api/matches');
      const allM = await allRes.json();
      setAllMatches(allM);
      setIsLoading(false);
      
      const debugRes = await fetch('/api/debug');
      const debugData = await debugRes.json();
      setApiDebug(debugData);

      const adminsRes = await fetch('/api/admins');
      const adminsData = await adminsRes.json();
      setAllowedAdmins(adminsData);

      if (!leagueIdInput) setLeagueIdInput(debugData.currentLeagueId || '71');
      if (!seasonInput) setSeasonInput(debugData.currentSeason || '2024');
      if (!dataSourceInput) setDataSourceInput(debugData.dataSource || 'simulation');
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchActiveData();
    // Poll every 5 seconds to simulate real-time updates from "Sports Page API"
    const interval = setInterval(fetchActiveData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  const handleAdminToggle = async () => {
    if (isAdminAuth) {
      setIsAdminAuth(false);
      return;
    }
    
    if (!currentUser) {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const email = result.user.email;
        if (email && allowedAdmins.some(a => a.toLowerCase() === email.toLowerCase())) {
          setIsAdminAuth(true);
        } else {
          alert(`Acesso Negado: Seu email (${email}) não possui permissão de administrador.`);
          signOut(auth);
        }
      } catch (e: any) {
        console.error("Login failed", e);
        alert("Erro no login Firebase: " + e.message + "\n\nDica: Se estiver bloqueando janelas (pop-ups), libere no seu navegador ou abra o app em uma nova guia.");
      }
    } else {
      if (currentUser.email && allowedAdmins.some(a => a.toLowerCase() === currentUser.email!.toLowerCase())) {
         setIsAdminAuth(true);
      } else {
         alert(`Acesso Negado: Seu email (${currentUser.email}) não possui permissão de administrador.`);
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsAdminAuth(false);
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    await fetch('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newAdminEmail })
    });
    setNewAdminEmail('');
    fetchActiveData();
  };

  const handleRemoveAdmin = async (email: string) => {
    await fetch('/api/admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    fetchActiveData();
  };

  // Derived state for prize pool
  const totalPrizePool = useMemo(() => {
    return bets.reduce((sum, bet) => sum + bet.amount, 0);
  }, [bets]);

  const scorePools = useMemo(() => {
    const pools: Record<string, number> = {};
    bets.forEach(bet => {
      const key = `${bet.scoreBra}-${bet.scoreOpponent}`;
      pools[key] = (pools[key] || 0) + bet.amount;
    });
    return pools;
  }, [bets]);

  const getPotentialWin = (bet: Bet) => {
    if (!matchState) return 0;
    const key = `${bet.scoreBra}-${bet.scoreOpponent}`;
    const poolForThisScore = scorePools[key];
    if (poolForThisScore === 0) return 0;
    return (bet.amount / poolForThisScore) * totalPrizePool;
  };

  const isExactMatch = (bet: Bet) => {
    if (!matchState) return false;
    return bet.scoreBra === matchState.homeScore && bet.scoreOpponent === matchState.awayScore;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setNewBetAvatar(dataUrl);
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChangeActiveMatch = async (id: string) => {
    await fetch('/api/matches/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setSelectedMatchId(id);
    fetchActiveData();
  };

  const handleUpdateApiSettings = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: leagueIdInput, season: seasonInput, newDataSource: dataSourceInput })
    });
    fetchActiveData();
  };

  const handleCreateManualMatch = async () => {
    const home = WORLD_CUP_TEAMS.find(t => t.code === newHomeTeam);
    const away = WORLD_CUP_TEAMS.find(t => t.code === newAwayTeam);
    if (!home || !away) return;

    await fetch('/api/matches/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        homeName: home.name, homeCode: home.code,
        awayName: away.name, awayCode: away.code 
      })
    });
    setNewHomeTeam(WORLD_CUP_TEAMS.find(t=>t.code === 'br')?.code || WORLD_CUP_TEAMS[0].code);
    setNewAwayTeam(WORLD_CUP_TEAMS.find(t=>t.code === 'fr')?.code || WORLD_CUP_TEAMS[1].code);
    fetchActiveData();
  };

  const handleUpdateManualMatch = async (id: string, updates: any) => {
    await fetch(`/api/matches/manual/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    fetchActiveData();
  };

  const handleDeleteManualMatch = async (id: string) => {
    await fetch(`/api/matches/manual/${id}`, {
      method: 'DELETE'
    });
    fetchActiveData();
  };

  const handleAddBet = async () => {
    if (!newBetName || !newBetBra || !newBetOpp || !newBetAmount || !matchState) return;
    
    // Convert comma to dot
    const amountFloat = parseFloat(newBetAmount.replace(',', '.'));
    
    const newBet = {
      matchId: matchState.id,
      name: newBetName,
      avatarUrl: newBetAvatar,
      scoreBra: parseInt(newBetBra),
      scoreOpponent: parseInt(newBetOpp),
      amount: amountFloat,
    };

    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBet)
    });

    if (res.ok) {
      const created = await res.json();
      setBets([created, ...bets]);
      setNewBetName('');
      setNewBetAvatar('');
      setNewBetBra('');
      setNewBetOpp('');
      setNewBetAmount('');
    }
  };

  const handleRemoveBet = async (id: string) => {
    await fetch(`/api/bets/${id}`, { method: 'DELETE' });
    setBets(bets.filter(b => b.id !== id));
  };

  const handleEditBetClick = (bet: Bet) => {
    setEditingBetId(bet.id);
    setEditingBetData({
       name: bet.name,
       scoreBra: bet.scoreBra,
       scoreOpponent: bet.scoreOpponent,
       amount: bet.amount
    });
  };

  const handleSaveBetEdit = async () => {
    if (!editingBetId) return;
    const res = await fetch(`/api/bets/${editingBetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingBetData)
    });
    if (res.ok) {
      const updated = await res.json();
      setBets(bets.map(b => b.id === updated.id ? updated : b));
      setEditingBetId(null);
      setEditingBetData({});
      fetchActiveData(); // Refresh all bets
    }
  };

  const handleCancelBetEdit = () => {
    setEditingBetId(null);
    setEditingBetData({});
  };

  // Sort bets for top winners projection
  const topWinners = useMemo(() => {
    return [...bets]
      .filter(bet => isExactMatch(bet))
      .sort((a, b) => getPotentialWin(b) - getPotentialWin(a))
      .slice(0, 3);
  }, [bets, matchState, totalPrizePool, scorePools]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const globalRanking = useMemo(() => {
    const users: Record<string, {name: string, avatarUrl: string, betsCount: number, exactHits: number, invested: number}> = {};
    allBets.forEach(bet => {
       const key = bet.name.toLowerCase();
       if (!users[key]) {
          users[key] = { name: bet.name, avatarUrl: bet.avatarUrl || '', betsCount: 0, exactHits: 0, invested: 0 };
       }
       // Prioritize avatar if missing
       if (bet.avatarUrl && !users[key].avatarUrl) users[key].avatarUrl = bet.avatarUrl;
       
       users[key].betsCount += 1;
       users[key].invested += bet.amount;
       
       const m = allMatches.find(x => x.id === bet.matchId);
       if (m && (m.status === 'FINISHED' || m.status === 'LIVE')) {
           if (m.homeScore === bet.scoreBra && m.awayScore === bet.scoreOpponent) {
                users[key].exactHits += 1;
           }
       }
    });
    return Object.values(users).sort((a,b) => b.exactHits - a.exactHits || b.betsCount - a.betsCount);
  }, [allBets, allMatches]);

  if (isLoading || !matchState) {
    return (
      <div className="flex h-screen w-full bg-slate-950 items-center justify-center text-white">
        <Activity className="animate-spin text-emerald-500 mr-2" /> Carregando Feed Esportivo...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 font-sans text-slate-200 overflow-hidden">
      {/* FIFA 2026 Branding Header */}
      <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-gradient-to-r from-emerald-600 via-yellow-500 to-blue-700 shadow-lg shrink-0">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center font-black text-blue-900 text-lg lg:text-xl italic">26</div>
          <h1 className="text-lg lg:text-xl font-black uppercase tracking-tighter text-white">
            Bolão Copa do Mundo 2026
          </h1>
        </div>
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-white/70">Prêmio Acumulado</span>
            <span className="text-xl lg:text-2xl font-black text-white leading-none">{formatCurrency(totalPrizePool)}</span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && isAdminAuth && (
               <button onClick={handleLogout} className="h-8 lg:h-10 px-3 rounded-full border border-white/20 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-2">
                 <LogOut size={14} />
                 Sair
               </button>
            )}
            <button 
              onClick={handleAdminToggle}
              className={`h-8 w-8 lg:h-10 lg:w-10 rounded-full border flex items-center justify-center transition-colors ${isAdminAuth ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
            >
              <ShieldAlert size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 p-4 overflow-y-auto lg:overflow-hidden">
        {/* Left Sidebar: Scoreboard & Top Winners */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shrink-0">
            <div className="absolute top-2 left-3 flex flex-col">
              <span className="text-[9px] uppercase font-black text-yellow-500">{matchState.tournament}</span>
              <span className="text-[10px] font-bold text-slate-400">{matchState.stage}</span>
            </div>
            <div className="absolute top-0 right-0 p-2 flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-white/50 uppercase font-bold bg-black/30 px-2 py-0.5 rounded-full border border-white/10">
                <Activity size={10} className="text-emerald-500" />
                API-Football Feed
              </span>
              <span className={`text-white text-[10px] px-2 py-0.5 rounded-full font-bold ${matchState.status === 'LIVE' ? 'bg-red-600 animate-pulse' : 'bg-slate-600'}`}>
                {matchState.status} {matchState.time > 0 ? `${matchState.time}'` : ''}
              </span>
            </div>
            <div className="flex justify-around items-center w-full mb-6 mt-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-900 rounded-lg mb-2 border-2 border-yellow-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl overflow-hidden shrink-0">
                  {matchState.homeLogo ? <img src={matchState.homeLogo} alt={matchState.homeName} className="w-full h-full object-cover" /> : matchState.home}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">{matchState.homeName}</span>
              </div>
              <div className="text-5xl font-black italic text-yellow-400 drop-shadow-md">
                {matchState.homeScore} &mdash; {matchState.awayScore}
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-lg mb-2 border-2 border-blue-600 flex items-center justify-center text-3xl font-bold text-blue-900 shadow-xl overflow-hidden shrink-0">
                  {matchState.awayLogo ? <img src={matchState.awayLogo} alt={matchState.awayName} className="w-full h-full object-cover" /> : matchState.away}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">{matchState.awayName}</span>
              </div>
            </div>
            {matchState.status === 'LIVE' && (
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${(matchState.time / 90) * 100}%` }}
                ></div>
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden min-h-[200px]">
            <h3 className="text-xs font-black uppercase text-emerald-400 mb-4 tracking-widest border-b border-slate-800 pb-2">Top Ganhadores (Projeção)</h3>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {topWinners.length > 0 ? topWinners.map((bet, idx) => (
                <div key={bet.id} className={`flex items-center justify-between p-3 rounded-xl border ${idx === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-black ${idx === 0 ? 'text-emerald-500' : 'text-slate-500'}`}>0{idx + 1}</span>
                    <div>
                      <p className="text-sm font-bold">{bet.name}</p>
                      <p className="text-[10px] opacity-60">Placar: {bet.scoreBra}-{bet.scoreOpponent} (EXATO)</p>
                    </div>
                  </div>
                  <span className={`font-black tracking-tight ${idx === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {formatCurrency(getPotentialWin(bet))}
                  </span>
                </div>
              )) : (
                <div className="text-center text-slate-500 text-xs py-8">
                  Nenhum apostador acertando o placar exato no momento.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Main Content: Tabs structure for Betting Grid, History, and Ranking */}
        <section className={`col-span-12 ${isAdminAuth ? 'lg:col-span-5' : 'lg:col-span-8'} bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden min-h-[300px]`}>
          <div className="flex bg-slate-900 border-b border-slate-800 p-1 shrink-0">
             <button onClick={() => setActiveTab('current')} className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${activeTab === 'current' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>Apostas ao Vivo</button>
             <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>Histórico</button>
             <button onClick={() => setActiveTab('ranking')} className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'ranking' ? 'bg-yellow-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
               <Trophy size={14} className={activeTab === 'ranking' ? 'text-slate-900' : 'text-yellow-500'} /> Ranking
             </button>
          </div>
          
          {activeTab === 'current' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">{matchState.home} vs {matchState.away}</h3>
                <span className="text-[10px] bg-emerald-600 px-2 py-1 rounded font-bold">{bets.length} APOSTAS</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                      <th className="pb-2 font-black pl-2">Jogador</th>
                      <th className="pb-2 font-black text-center">Palpite</th>
                      <th className="pb-2 font-black text-right hidden sm:table-cell">Aposta</th>
                      <th className="pb-2 font-black text-right pr-2">Potencial</th>
                      {isAdminAuth && <th className="pb-2 font-black text-center">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {bets.map((bet) => {
                      const exact = isExactMatch(bet);
                      const potential = exact ? getPotentialWin(bet) : 0;
                      
                      if (editingBetId === bet.id) {
                         return (
                            <tr key={`edit-${bet.id}`} className="border-b border-slate-800 bg-slate-800/20">
                               <td className="py-2 pl-2" colSpan={isAdminAuth ? 5 : 4}>
                                  <div className="flex flex-col gap-2 p-2 rounded bg-slate-950 border border-slate-700">
                                     <div className="flex gap-2">
                                        <input type="text" value={editingBetData.name || ''} onChange={e => setEditingBetData({...editingBetData, name: e.target.value})} className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" placeholder="Nome" />
                                        <input type="number" value={editingBetData.scoreBra ?? ''} onChange={e => setEditingBetData({...editingBetData, scoreBra: parseInt(e.target.value) || 0})} className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center text-white" placeholder="Casa" />
                                        <span className="text-white font-bold self-center">x</span>
                                        <input type="number" value={editingBetData.scoreOpponent ?? ''} onChange={e => setEditingBetData({...editingBetData, scoreOpponent: parseInt(e.target.value) || 0})} className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center text-white" placeholder="Fora" />
                                     </div>
                                     <div className="flex gap-2 items-center justify-between">
                                        <div className="flex items-center gap-2">
                                           <span className="text-[10px] text-slate-400">Aposta (R$):</span>
                                           <input type="number" value={editingBetData.amount ?? ''} onChange={e => setEditingBetData({...editingBetData, amount: parseFloat(e.target.value) || 0})} className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-left text-white" placeholder="0.00" step="0.01" />
                                        </div>
                                        <div className="flex gap-2">
                                           <button onClick={handleCancelBetEdit} className="px-3 py-1 rounded text-[10px] uppercase font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700">Cancelar</button>
                                           <button onClick={handleSaveBetEdit} className="px-3 py-1 rounded text-[10px] uppercase font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1"><CheckCircle2 size={12}/> Salvar</button>
                                        </div>
                                     </div>
                                  </div>
                               </td>
                            </tr>
                         );
                      }

                      return (
                        <tr key={bet.id} className={`border-b border-slate-800/50 ${exact ? 'bg-emerald-500/5' : ''}`}>
                          <td className="py-3 pl-2 font-bold flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            {bet.avatarUrl ? (
                              <img src={bet.avatarUrl} alt={bet.name} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-slate-700 object-cover shrink-0 bg-slate-800" />
                            ) : (
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-slate-700 flex items-center justify-center shrink-0 bg-slate-800 text-slate-500">
                                <User size={14} />
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              {bet.name}
                              {exact && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                            </div>
                          </td>
                          <td className="py-3 text-center font-mono font-black">{bet.scoreBra} &mdash; {bet.scoreOpponent}</td>
                          <td className="py-3 text-right text-slate-400 text-xs hidden sm:table-cell">{formatCurrency(bet.amount)}</td>
                          <td className={`py-3 pr-2 text-right font-black ${exact ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {potential > 0 ? formatCurrency(potential) : 'R$ 0,00'}
                          </td>
                          {isAdminAuth && (
                            <td className="py-3 text-center flex items-center justify-center gap-2">
                              <button onClick={() => handleEditBetClick(bet)} className="text-blue-500 hover:text-blue-400 p-1">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleRemoveBet(bet.id)} className="text-red-500 hover:text-red-400 p-1">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {bets.length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-10">Nenhuma aposta registrada para esta partida.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
               {allMatches.map(m => (
                  <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                     <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase text-slate-400">{m.tournament} &bull; {m.stage}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${m.status === 'FINISHED' ? 'bg-slate-700' : m.status === 'LIVE' ? 'bg-red-600 animate-pulse' : 'bg-blue-900'}`}>{m.status}</span>
                     </div>
                     <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center w-16">
                           <div className="w-10 h-10 border border-slate-800 rounded bg-slate-900 flex items-center justify-center mb-1 overflow-hidden">
                              {m.homeLogo ? <img src={m.homeLogo} alt={m.home} /> : <span className="font-bold text-xs">{m.home}</span>}
                           </div>
                           <span className="text-[10px] font-bold text-center">{m.homeName}</span>
                        </div>
                        <div className="text-2xl font-black italic text-slate-200">
                           {m.homeScore} - {m.awayScore}
                        </div>
                        <div className="flex flex-col items-center w-16">
                           <div className="w-10 h-10 border border-slate-800 rounded bg-slate-900 flex items-center justify-center mb-1 overflow-hidden">
                              {m.awayLogo ? <img src={m.awayLogo} alt={m.away} /> : <span className="font-bold text-xs">{m.away}</span>}
                           </div>
                           <span className="text-[10px] font-bold text-center">{m.awayName}</span>
                        </div>
                     </div>
                     <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{allBets.filter(b => b.matchId === m.id).length} Apostas Realizadas</span>
                     </div>
                  </div>
               ))}
               {allMatches.length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-10">Nenhuma partida registrada ainda.</div>
               )}
            </div>
          )}

          {activeTab === 'ranking' && (
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-2">
                   {globalRanking.map((user, idx) => (
                      <div key={user.name} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-slate-700 overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                               {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                               <span className="text-sm font-bold">{user.name}</span>
                               <span className="text-[9px] uppercase text-slate-500">Total Apostas: {user.betsCount} &bull; Acertos Exatos: <span className="text-yellow-500">{user.exactHits}</span></span>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-amber-500">#{idx + 1}</span>
                         </div>
                      </div>
                   ))}
                   {globalRanking.length === 0 && (
                      <div className="text-center text-slate-500 text-sm py-10">Ranking vazio.</div>
                   )}
                </div>
             </div>
          )}
        </section>

        {/* Right Sidebar: Admin Panel */}
        {isAdminAuth && (
          <section className="col-span-12 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shrink-0">
            <div className="p-4 bg-red-950/30 border-b border-red-900/50 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-xs font-black uppercase tracking-widest text-red-400">Painel Admin</h3>
              </div>
              <p className="text-[10px] text-red-400/60 flex items-center gap-1">
                <Activity size={10}/> Conectado via Sports API Feed
              </p>
            </div>
            
            <div className="p-4 flex-1 space-y-6 overflow-y-auto custom-scrollbar">
              
              {/* API Status Info */}
              {apiDebug && (
                <div className={`space-y-2 p-3 rounded-xl border ${apiDebug.usingRealApi ? (apiDebug.lastError ? 'bg-red-900/30 border-red-800' : 'bg-emerald-900/30 border-emerald-800') : 'bg-blue-900/30 border-blue-800'}`}>
                  <h4 className="text-[10px] font-black uppercase text-white/70 flex items-center gap-1">
                    Configuração de API
                  </h4>
                  <div className="text-[10px] text-white/60 space-y-2">
                    <p><strong>Status da Chave:</strong> {apiDebug.apiKeyConfigured ? 'Disponível no Ambiente' : 'Não Encontrada'}</p>
                    {apiDebug.dataSource === 'simulation' ? (
                      <p className="text-blue-400 font-bold">API Fictícia (Simulação Interna) Ativada. Grátis e sempre rodando.</p>
                    ) : apiDebug.usingRealApi ? (
                      <>
                        <p className={apiDebug.lastError ? 'text-red-400' : 'text-emerald-400'}>
                          <strong>Status API Real:</strong> {apiDebug.lastError || 'Conectado com Sucesso!'}
                        </p>
                        <p><strong>Jogos Retornados:</strong> {apiDebug.matchesCount}</p>
                      </>
                    ) : (
                       <p className="text-red-400">Falha ao usar API Externa. Chave não encontrada.</p>
                    )}
                    
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <p className="text-[9px] text-slate-400">Nota importante: Nenhuma API real possui os jogos ao vivo da Copa de 2026 ainda! Para desenvolver seu app hoje, use a "Simulação" (que imita perfeitamente a API) ou teste com um campeonato atual (como o Brasileirão, Liga 71, ano 2024).</p>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-500">Fonte de Dados</label>
                        <select 
                          value={dataSourceInput}
                          onChange={e => setDataSourceInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                        >
                          <option value="simulation">Módulo Simulação Fictício (Recomendado p/ 2026)</option>
                          <option value="manual">Controle Manual (Você insere os dados ao vivo)</option>
                          <option value="api-football">API-Football Externa (Requer Chave, para torneios atuais)</option>
                        </select>
                      </div>

                      {dataSourceInput === 'api-football' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-500">League ID</label>
                            <input 
                              type="text" 
                              value={leagueIdInput}
                              onChange={e => setLeagueIdInput(e.target.value)}
                              placeholder="71"
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-slate-500">Temporada</label>
                            <input 
                              type="text" 
                              value={seasonInput}
                              onChange={e => setSeasonInput(e.target.value)}
                              placeholder="2024"
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-center"
                            />
                          </div>
                        </div>
                      )}
                      
                      <button 
                        onClick={handleUpdateApiSettings}
                        className="w-full bg-blue-600 hover:bg-blue-500 mt-2 text-white font-bold py-1.5 rounded transition-all text-[9px] uppercase"
                      >
                        Aplicar Configuração
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Gerenciador Manual */}
              {apiDebug?.dataSource === 'manual' && (
                <div className="space-y-3 bg-slate-800/30 p-3 rounded-xl border border-slate-700">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                    Cadastrar Partida Manual
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={newHomeTeam} onChange={e => setNewHomeTeam(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                    >
                      {WORLD_CUP_TEAMS.map(t => <option key={`h-${t.code}`} value={t.code}>{t.name}</option>)}
                    </select>
                    <select 
                      value={newAwayTeam} onChange={e => setNewAwayTeam(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                    >
                      {WORLD_CUP_TEAMS.map(t => <option key={`a-${t.code}`} value={t.code}>{t.name}</option>)}
                    </select>
                  </div>
                  <button onClick={handleCreateManualMatch} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded transition-all text-[9px] uppercase">
                    Adicionar Jogo
                  </button>

                  <h4 className="text-[10px] font-black uppercase text-slate-400 mt-4 pt-4 border-t border-slate-700">
                    Jogos Cadastrados (Placar Ao Vivo)
                  </h4>
                  <div className="space-y-2">
                    {allMatches.length === 0 && <p className="text-xs text-slate-500">Nenhum jogo manual cadastrado.</p>}
                    {allMatches.map(m => (
                      <div key={m.id} className="p-2 border border-slate-700 rounded bg-slate-900 grid gap-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-white uppercase">
                          <span>{m.homeName} vs {m.awayName}</span>
                          <button onClick={() => handleDeleteManualMatch(m.id)} className="text-red-400 hover:text-red-300">Apagar</button>
                        </div>
                        <div className="grid grid-cols-4 gap-1 items-end">
                          <label className="text-[8px] text-slate-500 flex flex-col gap-1">Gols C.
                            <input type="number" min="0" value={m.homeScore} onChange={e => handleUpdateManualMatch(m.id, {homeScore: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-600 rounded px-1 py-1 text-xs text-center text-white" />
                          </label>
                          <label className="text-[8px] text-slate-500 flex flex-col gap-1">Gols V.
                            <input type="number" min="0" value={m.awayScore} onChange={e => handleUpdateManualMatch(m.id, {awayScore: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-600 rounded px-1 py-1 text-xs text-center text-white" />
                          </label>
                          <label className="text-[8px] text-slate-500 flex flex-col gap-1">Tempo
                            <input type="number" min="0" value={m.time} onChange={e => handleUpdateManualMatch(m.id, {time: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-600 rounded px-1 py-1 text-xs text-center text-white" placeholder="Min" />
                          </label>
                          <label className="text-[8px] text-slate-500 flex flex-col gap-1">Status
                            <select value={m.status} onChange={e => handleUpdateManualMatch(m.id, {status: e.target.value})} className="w-full bg-slate-950 border border-slate-600 rounded px-1 py-1 text-xs text-center text-white">
                              <option value="SCHEDULED">Agend.</option>
                              <option value="LIVE">Vivo</option>
                              <option value="FINISHED">Fim</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seleção do Jogo Baseado na API de Esportes */}
              <div className="space-y-3 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
                <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <ListTodo size={12} /> Selecionar Partida Esportiva
                </h4>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-500">Puxando jogos previstos online...</p>
                  <select 
                    value={selectedMatchId}
                    onChange={(e) => handleChangeActiveMatch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-300"
                  >
                    {allMatches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.homeName} x {m.awayName} {m.status === 'LIVE' ? '(AO VIVO)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="w-full h-px bg-slate-800"></div>

              {/* Controle de Administradores */}
              <div className="space-y-3 bg-red-900/10 p-3 rounded-xl border border-red-900/30">
                <h4 className="text-[10px] font-black uppercase text-red-400 flex items-center gap-1">
                  Gerenciar Admins
                </h4>
                <div className="space-y-2">
                  {allowedAdmins.map(email => (
                    <div key={email} className="flex justify-between items-center bg-slate-950 p-2 rounded text-xs">
                      <span className="text-white truncate">{email}</span>
                      {email !== 'LuizFelipeNGL@gmail.com' && (
                        <button onClick={() => handleRemoveAdmin(email)} className="text-red-500 hover:text-red-400 ml-2 shrink-0">
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                   <input 
                      type="email" 
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      placeholder="Novo email admin"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                   />
                   <button onClick={handleAddAdmin} className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 rounded text-xs">
                     Add
                   </button>
                </div>
              </div>

              <div className="w-full h-px bg-slate-800"></div>

              {/* Registro de Nova Aposta Simplificado */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <Plus size={12} /> Cadastrar Aposta para Partida Ativa
                </h4>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 px-1">Nome do Apostador</label>
                  <input 
                    type="text" 
                    value={newBetName}
                    onChange={(e) => setNewBetName(e.target.value)}
                    placeholder="Ex: João Silva" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors" 
                  />
                </div>
                <div className="space-y-1 mt-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 px-1">Avatar (Opcional)</label>
                  <div className="flex gap-2">
                    {newBetAvatar && (
                      <div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden shrink-0 bg-slate-900 border-2 border-blue-500/30">
                         <img src={newBetAvatar} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                    )}
                    <div className="flex-1 relative">
                       <input 
                         type="text" 
                         value={newBetAvatar}
                         onChange={(e) => setNewBetAvatar(e.target.value)}
                         placeholder="URL da imagem ou upload" 
                         className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700" 
                       />
                    </div>
                    <label title="Fazer Upload" className="cursor-pointer h-10 w-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center justify-center shrink-0 text-white transition-colors">
                      <Upload size={16} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-500 px-1">Placar {matchState.home}</label>
                    <input 
                      type="number" 
                      value={newBetBra}
                      onChange={(e) => setNewBetBra(e.target.value)}
                      placeholder="0" 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:border-yellow-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-500 px-1">Placar {matchState.away}</label>
                    <input 
                      type="number" 
                      value={newBetOpp}
                      onChange={(e) => setNewBetOpp(e.target.value)}
                      placeholder="0" 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 px-1">Valor da Aposta (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newBetAmount}
                    onChange={(e) => setNewBetAmount(e.target.value)}
                    placeholder="50.00" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500" 
                  />
                </div>
                
                <button 
                  onClick={handleAddBet}
                  disabled={!newBetName || !newBetBra || !newBetOpp || !newBetAmount}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl shadow-lg transition-all uppercase tracking-widest text-xs mt-2"
                >
                  Registrar Aposta
                </button>
              </div>

            </div>
          </section>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-8 bg-blue-900 flex items-center px-4 shrink-0 justify-between border-t border-blue-800">
        <div className="flex items-center gap-2 lg:gap-4 text-[9px] lg:text-[10px] font-bold text-white/70 uppercase">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Feed API Conectado</span>
          <span className="hidden sm:inline">Atualizado ao Vivo</span>
        </div>
        <div className="text-[9px] lg:text-[10px] font-bold text-white/50">
          &copy; Copa do Mundo 2026 - Predictor Full-Stack
        </div>
      </footer>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(51, 65, 85, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>
    </div>
  );
}
