import React, { useState, useEffect } from 'react';
import { Mission, RANKS } from './types';
import { calculatePay } from './utils/calculator';
import { DEFAULT_MISSIONS } from './data/defaultMissions';
import StatsDashboard from './components/StatsDashboard';
import MissionForm from './components/MissionForm';
import MissionHistory from './components/MissionHistory';
import { ShieldCheck, Info, FileText, ChevronRight, User } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'militar_diarias_missions';

export default function App() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [userRankId, setUserRankId] = useState<string>('terceiro_sargento');
  const [isInitialized, setIsInitialized] = useState(false);

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
        setUserRankId(savedRank);
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
  const calculationSummary = calculatePay(missions, userRankId);

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const activeRankObj = RANKS.find(r => r.id === userRankId) || RANKS[3]; // defaulting to Terceiro Sargento
  const dailyAdditionalCampaignValue = activeRankObj.soldo * 0.02 * 0.725;

  return (
    <div className="min-h-screen bg-zinc-50/70 text-zinc-900 selection:bg-emerald-800 selection:text-white pb-12" id="app-root-container">
      {/* Upper Brand Header */}
      <header className="bg-emerald-950 text-white py-6 border-b border-emerald-900" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl flex items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-amber-400 animate-pulse" />
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
              <span>GRAT REP VI (2% com desc. de 27,5% IR): <strong className="font-mono text-white">{formatBRL(dailyAdditionalCampaignValue)}/dia</strong></span>
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
                    onChange={(e) => handleRankChange(e.target.value)}
                    className="text-xs px-2.5 py-1 pr-6 font-bold text-emerald-950 bg-emerald-100/60 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer outline-none transition-colors appearance-none"
                  >
                    {RANKS.map((r) => (
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
              <p className="text-xs text-zinc-500 mt-1">
                Soldo: <strong className="font-mono text-zinc-700">{formatBRL(activeRankObj.soldo)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Core Quick Help Notice (Now positioned BELOW the military profile) */}
        <div className="bg-amber-50 text-amber-950 p-4 rounded-3xl border border-amber-200/50 text-xs flex gap-3 shadow-xs" id="critical-rule-banner">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-amber-900 text-[13px]">Entenda a Regra de 30 Dias Deslizantes para Alimentação de Missão</span>
            <p className="text-amber-950 leading-relaxed text-[11.5px]">
              Segundo a regulamentação militar, o militar pode receber no máximo <strong>10 cotas completas (N10) ou parciais (N5) combinadas de alimentação</strong> a cada 30 dias contados retroativamente a partir de cada escala. Se você realizar uma única missão de 15 dias, você receberá 10 pagamentos N10 inteiros e as 5 cotas excedentes sofrerão degradação para o valor básico N1 de R$ 13,50, poupando a sua quota. Nota: Estas cotas cobrem as despesas de alimentação decorrentes da escala, sem se confundir com diárias administrativas de viagem.
            </p>
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
