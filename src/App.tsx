import React, { useState, useEffect } from 'react';
import { Mission, RANKS, Rank } from './types';
import { calculatePay } from './utils/calculator';
import { DEFAULT_MISSIONS } from './data/defaultMissions';
import StatsDashboard from './components/StatsDashboard';
import MissionForm from './components/MissionForm';
import MissionHistory from './components/MissionHistory';
import { Banknote, Info, FileText, ChevronRight, User } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'militar_diarias_missions';

export default function App() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userRankId, setUserRankId] = useState<string>('terceiro_sargento');
  const [ranks, setRanks] = useState<Rank[]>(RANKS);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isEditingSoldo, setIsEditingSoldo] = useState(false);
  const [soldoInput, setSoldoInput] = useState('');

  // Load missions and user rank configuration from local storage on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setMissions(JSON.parse(stored));
      } else {
        // First-run: Pre-populate with our regulatory demonstrator missions
        setMissions(DEFAULT_MISSIONS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_MISSIONS));
      }

      const savedRank = localStorage.getItem('militar_diarias_user_rank');
      if (savedRank) {
        const isValidRank = RANKS.some(r => r.id === savedRank);
        if (isValidRank) {
          setUserRankId(savedRank);
        } else {
          setUserRankId('terceiro_sargento');
          try {
            localStorage.setItem('militar_diarias_user_rank', 'terceiro_sargento');
          } catch (e) {
            console.error('Failed to reset invalid user rank:', e);
          }
        }
      } else {
        setUserRankId('terceiro_sargento');
      }

      const savedRanks = localStorage.getItem('militar_diarias_custom_ranks');
      if (savedRanks) {
        try {
          const parsed = JSON.parse(savedRanks);
          if (Array.isArray(parsed)) {
            // Merge custom values to prevent issues if default table expanded
            const merged = RANKS.map(defaultRank => {
              const custom = parsed.find(r => r.id === defaultRank.id);
              if (!custom) return defaultRank;
              
              // Migração automática para soldos padrão antigos salvos em cache
              let soldo = custom.soldo;
              if (defaultRank.id === 'suboficial' && soldo === 6169.00) soldo = 6737.00;
              if (defaultRank.id === 'primeiro_sargento' && soldo === 5483.00) soldo = 5988.00;
              if (defaultRank.id === 'segundo_sargento' && soldo === 4770.00) soldo = 5209.00;
              if (defaultRank.id === 'terceiro_sargento' && (soldo === 3825.00 || soldo === 3825)) soldo = 4177.00;
              if (defaultRank.id === 'cabo' && (soldo === 2625.00 || soldo === 2625)) soldo = 2869.00;
              if (defaultRank.id === 'marinheiro_soldado' && (soldo === 1765.00 || soldo === 1765)) soldo = 2103.00;
              
              return { ...defaultRank, soldo };
            });
            setRanks(merged);
          }
        } catch {
          setRanks(RANKS);
        }
      }
    } catch {
      // Fallback
      setMissions(DEFAULT_MISSIONS);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to local storage whenever missions change
  const saveMissions = (updatedMissions: Mission[]) => {
    setMissions(updatedMissions);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedMissions));
    } catch (err) {
      console.error('Failed to save missions to storage:', err);
    }
  };

  const handleRankChange = (rankId: string) => {
    setUserRankId(rankId);
    try {
      localStorage.setItem('militar_diarias_user_rank', rankId);
    } catch (err) {
      console.error('Failed to save user rank:', err);
    }
  };

  const handleAddMission = (newMissionData: Omit<Mission, 'id'>) => {
    const newMission: Mission = {
      ...newMissionData,
      id: `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    const updatedMissions = [...missions, newMission];
    saveMissions(updatedMissions);
  };

  const handleDeleteMission = (id: string) => {
    const updatedMissions = missions.filter((m) => m.id !== id);
    saveMissions(updatedMissions);
  };

  const handleResetMissions = () => {
    if (confirm('Tem certeza de que deseja remover todas as missões cadastradas de seu histórico?')) {
      saveMissions([]);
    }
  };

  const handleLoadDefaults = () => {
    saveMissions(DEFAULT_MISSIONS);
  };

  // Perform core pay calculations on current missions with selected user rank
  const calculationSummary = calculatePay(missions, userRankId, ranks);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const activeRankObj = ranks.find(r => r.id === userRankId) || ranks.find(r => r.id === 'terceiro_sargento') || ranks[1] || ranks[0]; // defaulting to Terceiro Sargento
  const dailyAdditionalCampaignValue = activeRankObj.soldo * 0.02 * 0.725;

  const handleStartEditSoldo = () => {
    setSoldoInput(activeRankObj.soldo.toString());
    setIsEditingSoldo(true);
  };

  const handleSaveSoldo = () => {
    const val = parseFloat(soldoInput);
    if (isNaN(val) || val < 0) {
      alert('Por favor, insira um valor numérico válido para o soldo.');
      return;
    }
    const updatedRanks = ranks.map((r) => 
      r.id === userRankId ? { ...r, soldo: val } : r
    );
    setRanks(updatedRanks);
    setIsEditingSoldo(false);
    try {
      localStorage.setItem('militar_diarias_custom_ranks', JSON.stringify(updatedRanks));
    } catch (err) {
      console.error('Failed to save custom ranks:', err);
    }
  };

  const handleResetSoldos = () => {
    if (confirm('Deseja redefinir os soldos de todas as graduações para os valores originais da tabela padrão?')) {
      setRanks(RANKS);
      setIsEditingSoldo(false);
      try {
        localStorage.removeItem('militar_diarias_custom_ranks');
      } catch (err) {
        console.error('Failed to clear custom ranks:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/70 text-zinc-900 selection:bg-emerald-800 selection:text-white pb-12" id="app-root-container">
      {/* Upper Brand Header */}
      <header className="bg-emerald-950 text-white py-6 border-b border-emerald-900" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl flex items-center justify-center gap-2">
            <Banknote className="w-8 h-8 text-amber-400 animate-pulse" />
            Cálculo de Pagamento
          </h1>

          {/* Quick Informational Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 bg-emerald-900/40 p-3 rounded-2xl border border-emerald-900/60 text-xs mt-4">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 block" />
              <span>N10: <strong>R$ 135</strong></span>
            </div>
            <span className="text-emerald-800">|</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-sky-100 border border-sky-300 block" />
              <span>N5: <strong>R$ 67,50</strong></span>
            </div>
            <span className="text-emerald-800">|</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300 block" />
              <span>N1: <strong>R$ 13,50</strong></span>
            </div>
            <span className="text-emerald-800">|</span>
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold font-sans">
              <span className="w-2.5 h-2.5 rounded bg-amber-400 border border-amber-500 block animate-pulse" />
              <span>GRAT REP OP (2% com desc. de 27,5% IR): <strong className="font-mono text-white">{formatBRL(dailyAdditionalCampaignValue)}/dia</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6" id="app-main">
        {/* Perfil do Militar Panel (Now positioned ABOVE the understand rule banner) */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6" id="military-profile-panel">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-850 shrink-0 border border-emerald-100">
              <User className="w-6 h-6 text-emerald-800" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Perfil do Militar</span>
              <h2 className="text-base font-bold text-zinc-900 flex flex-wrap items-center gap-2 font-sans leading-snug">
                Graduação: <span className="relative inline-flex items-center">
                  <select
                    id="badge-rank-select"
                    value={userRankId}
                    onChange={(e) => {
                      handleRankChange(e.target.value);
                      setIsEditingSoldo(false);
                    }}
                    className="text-xs px-2.5 py-1 pr-6 font-bold text-emerald-950 bg-emerald-100/60 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer outline-none transition-colors appearance-none"
                  >
                    {ranks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-emerald-850">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </span>
                </span>
              </h2>
              
              {isEditingSoldo ? (
                <div className="flex flex-wrap items-center gap-2 mt-1.5 bg-zinc-50 p-2 rounded-xl border border-zinc-150 max-w-sm">
                  <div className="flex items-center gap-1 font-sans">
                    <span className="text-xs text-zinc-500 font-medium">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={soldoInput}
                      onChange={(e) => setSoldoInput(e.target.value)}
                      className="w-24 text-xs font-mono font-semibold px-2 py-1 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-800 bg-white text-zinc-800"
                      placeholder="Valor do soldo"
                      id="edit-soldo-input"
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveSoldo}
                      className="text-[10px] font-bold bg-emerald-850 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setIsEditingSoldo(false)}
                      className="text-[10px] font-bold bg-zinc-200 text-zinc-700 px-2.5 py-1 rounded-lg hover:bg-zinc-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                  <p>
                    Soldo: <strong className="font-mono text-zinc-700">{formatBRL(activeRankObj.soldo)}</strong>
                  </p>
                  <span className="text-zinc-300">|</span>
                  <button
                    onClick={handleStartEditSoldo}
                    className="text-emerald-800 hover:text-emerald-950 font-bold text-xs underline decoration-dotted underline-offset-2 transition-colors cursor-pointer"
                  >
                    Editar Soldo
                  </button>
                  {ranks.some((r, i) => r.soldo !== RANKS[i]?.soldo) && (
                    <>
                      <span className="text-zinc-300">|</span>
                      <button
                        onClick={handleResetSoldos}
                        className="text-amber-800 hover:text-amber-950 text-xs font-semibold hover:underline cursor-pointer"
                      >
                        Restaurar Padrão
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>



        {/* Dynamic Financial Counter & Statistics Dashboard */}
        {isInitialized && (
          <StatsDashboard summary={calculationSummary} />
        )}

        {/* Editor Grid: 2-Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="app-grid-dashboard">
          {/* Left Column: Form & Simulation Scheduler */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-4">
              <MissionForm
                currentMissions={missions}
                onAddMission={handleAddMission}
                allPayments={calculationSummary.allPayments}
                selectedRankId={userRankId}
                ranks={ranks}
              />
            </div>
          </div>

          {/* Right Column: Quota Monitor panel and dynamic history feed */}
          <div className="lg:col-span-7">
            <MissionHistory
              summary={calculationSummary}
              onDeleteMission={handleDeleteMission}
              onResetMissions={handleResetMissions}
              onLoadDefaults={handleLoadDefaults}
            />
          </div>
        </div>
      </main>

      {/* Aesthetic footer */}
      <footer className="mt-16 text-center text-xs text-zinc-400 max-w-2xl mx-auto px-4 leading-relaxed" id="app-footer">
      </footer>
    </div>
  );
}
