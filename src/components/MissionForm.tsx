import React, { useState, useEffect } from 'react';
import { Mission, DailyPayment, RANKS, Rank } from '../types';
import { simulateProposedMission, RATES } from '../utils/calculator';
import { PlusCircle, Search, HelpCircle, AlertCircle, Info, CalendarClock, DollarSign, ListPlus, Calculator } from 'lucide-react';

interface MissionFormProps {
  currentMissions: Mission[];
  onAddMission: (mission: Omit<Mission, 'id'>) => void;
  allPayments: DailyPayment[];
  selectedRankId: string;
}

export default function MissionForm({ currentMissions, onAddMission, allPayments, selectedRankId }: MissionFormProps) {
  // Navigation tabs: 'register' or 'simulate'
  const [activeTab, setActiveTab] = useState<'register' | 'simulate'>('register');

  // Common inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [rankId, setRankId] = useState(selectedRankId);
  
  // Set default dates appropriately based on current year 2026
  const [startDate, setStartDate] = useState('2026-06-01T08:00');
  const [endDate, setEndDate] = useState('2026-06-02T12:00');
  const [errorMsg, setErrorMsg] = useState('');

  // Simulation state
  const [simStartDate, setSimStartDate] = useState('2026-06-15T08:00');
  const [simEndDate, setSimEndDate] = useState('2026-06-20T08:00');
  const [simRankId, setSimRankId] = useState(selectedRankId);
  const [simResult, setSimResult] = useState<ReturnType<typeof simulateProposedMission> | null>(null);

  // Sync state with selectedRankId prop
  useEffect(() => {
    if (selectedRankId) {
      setRankId(selectedRankId);
      setSimRankId(selectedRankId);
    }
  }, [selectedRankId]);

  // Re-run simulation whenever simulation inputs or background missions change
  useEffect(() => {
    try {
      const sDateObj = new Date(simStartDate);
      const eDateObj = new Date(simEndDate);
      if (sDateObj.getTime() < eDateObj.getTime()) {
        const result = simulateProposedMission(currentMissions, simStartDate, simEndDate, simRankId);
        setSimResult(result);
      } else {
        setSimResult(null);
      }
    } catch {
      setSimResult(null);
    }
  }, [simStartDate, simEndDate, currentMissions, simRankId]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Por favor, informe o título ou nome da missão.');
      return;
    }

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);

    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      setErrorMsg('Insira datas e horários válidos.');
      return;
    }

    if (endObj.getTime() <= startObj.getTime()) {
      setErrorMsg('A data/hora de término deve ser estritamente posterior ao início.');
      return;
    }

    // Call callback to persist mission with the selected rankId
    onAddMission({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      startDate,
      endDate,
      rankId,
    });

    // Reset fields
    setTitle('');
    setDescription('');
    setLocation('');
    // Advance default dates forward to prevent overlapping accidentally
    setStartDate(endDate);
  };

  const getDurationString = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} minuto(s)`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (days > 0) {
      return `${days}d ${remainingHours}h (${Math.round(hours)} horas)`;
    }
    return `${Math.round(hours)} hora(s)`;
  };

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const selectedRankObj = RANKS.find(r => r.id === rankId) || RANKS[3]; // Terceiro sargento default
  const dailyAdditionalValue = selectedRankObj.soldo * 0.02 * 0.725;

  const simRankObj = RANKS.find(r => r.id === simRankId) || RANKS[3];
  const simDailyAdditionalValue = simRankObj.soldo * 0.02 * 0.725;

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs" id="mission-form-card">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200 bg-zinc-50" id="form-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('register')}
          className={`flex-1 py-4 px-6 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 hover:bg-zinc-100 ${
            activeTab === 'register'
              ? 'border-emerald-800 text-emerald-800 bg-white'
              : 'border-transparent text-zinc-500'
          }`}
          id="tab-register-btn"
        >
          <ListPlus className="w-4 h-4" />
          Registrar Nova Missão
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('simulate')}
          className={`flex-1 py-4 px-6 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 hover:bg-zinc-100 ${
            activeTab === 'simulate'
              ? 'border-emerald-800 text-emerald-800 bg-white'
              : 'border-transparent text-zinc-500'
          }`}
          id="tab-simulate-btn"
        >
          <Calculator className="w-4 h-4" />
          Simulador de Elegibilidade
        </button>
      </div>

      <div className="p-6">
        {/* Tab 1: Register */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4" id="register-mission-form">
            <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-emerald-800" />
              Lançar Missão
            </h3>
            <p className="text-xs text-zinc-500">
              Insira os dados exatos do seu início e encerramento para calcular automaticamente os valores devidos e deduzir da quota de 30 dias de cotas de alimentação.
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-center gap-2 border border-rose-100" id="form-error">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Título da Missão *</label>
              <input
                type="text"
                required
                placeholder="Ex: Operação Fronteira Sul, Patrulha"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-850"
                id="reg-title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Início da Missão (Data e Hora) *</label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-850 font-mono"
                  id="reg-start"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Término da Missão (Data e Hora) *</label>
                <input
                  type="datetime-local"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-850 font-mono"
                  id="reg-end"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Local da Missão</label>
              <input
                type="text"
                placeholder="Ex: Bagé - RS"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-sm px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-850"
                id="reg-location"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Descrição / Notas Adicionais</label>
              <textarea
                placeholder="Detalhes adicionais sobre a ordem de serviço, comando de operações, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full text-sm px-3.5 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-850"
                id="reg-desc"
              />
            </div>

            {/* Quick Helper Reference */}
            <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-2xl text-xs space-y-2">
              <div className="font-semibold text-zinc-700 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-zinc-500" />
                Guia Rápido de Regras de Alimentação de Missão:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="flex flex-col p-2 bg-white rounded-lg border border-zinc-150">
                  <span className="text-zinc-500 font-sans">Menos de 8 horas</span>
                  <span className="font-bold text-zinc-950">Alimentação N1</span>
                  <span className="text-emerald-700 font-bold">{formatBRL(RATES.N1)}</span>
                </div>
                <div className="flex flex-col p-2 bg-white rounded-lg border border-zinc-150">
                  <span className="text-zinc-500 font-sans">8h até 24 horas</span>
                  <span className="font-bold text-zinc-950">Alimentação N5</span>
                  <span className="text-emerald-700 font-bold">{formatBRL(RATES.N5)}</span>
                </div>
                <div className="flex flex-col p-2 bg-white rounded-lg border border-zinc-150">
                  <span className="text-zinc-500 font-sans">Mais de 24 horas</span>
                  <span className="font-bold text-zinc-950">Alimentação N10</span>
                  <span className="text-emerald-700 font-bold">{formatBRL(RATES.N10)}/dia</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                * Máximo de 10 cotas de alimentação acumuladas do grupo (N10/N5) a cada intervalo deslizante de 30 dias. Qualquer dia excedente é pago como N1 de R$ 13,50 gratuitamente para poupar a quota, mantendo a GRAT REP VI intacta por dia de missão!
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-950 text-white font-bold rounded-xl shadow-xs hover:bg-emerald-900 transition-all flex items-center justify-center gap-2 text-sm"
              id="submit-mission-btn"
            >
              <PlusCircle className="w-4 h-4" />
              Salvar Missão no Histórico
            </button>
          </form>
        )}

        {/* Tab 2: Simulation */}
        {activeTab === 'simulate' && (
          <div className="space-y-4" id="simulate-mission-form">
            <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-800" />
              Simular Cotas de Alimentação e Adicional
            </h3>
            <p className="text-xs text-zinc-500">
              Planeje datas futuras antes de assumir as escalas de serviço. O simulador analisa o seu histórico de 30 dias e estima o rendimento total planejado.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1 font-sans font-semibold">Início Proposto *</label>
                <input
                  type="datetime-local"
                  required
                  value={simStartDate}
                  onChange={(e) => setSimStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-850 font-mono"
                  id="sim-start"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1 font-sans font-semibold">Fim Proposto *</label>
                <input
                  type="datetime-local"
                  required
                  value={simEndDate}
                  onChange={(e) => setSimEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-850 font-mono"
                  id="sim-end"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1 font-sans font-semibold">Seu Posto para Simular *</label>
                <select
                  value={simRankId}
                  onChange={(e) => setSimRankId(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-800/20 bg-white"
                  id="sim-rank"
                >
                  {RANKS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results of preview simulation */}
            {simResult ? (
              <div className="space-y-3" id="simulation-results">
                {/* Visual result header box */}
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Estimativa Total Prevista</span>
                    <span className="text-2xl font-bold font-mono text-emerald-850">{formatBRL(simResult.estimatedTotal)}</span>
                    <p className="text-xs text-zinc-500">
                      Duração: <strong className="font-mono text-zinc-700">{getDurationString(simResult.durationHours)}</strong> ({simResult.totalDays} {simResult.totalDays === 1 ? 'dia' : 'dias'} de manobra)
                    </p>
                    <div className="flex gap-2 text-[10px] text-zinc-500 mt-1">
                      <span>Alimentação: <strong>{formatBRL(simResult.estimatedFoodTotal)}</strong></span>
                      <span>•</span>
                      <span>GRAT REP VI com IR (-27,5%): <strong>{formatBRL(simResult.estimatedManeuverTotal)}</strong></span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-center text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Quota Livre Inicial</span>
                    <span className="text-lg font-mono font-bold text-emerald-950 mt-0.5">{simResult.remainingQuotaAtStart}/10 dias</span>
                    <span className="text-[9px] text-emerald-600">de cotas no início</span>
                  </div>
                </div>

                {/* Day-by-day simulated timeline elements */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-700">Previsão Detalhada Dia a Dia:</h4>
                  <div className="max-h-[170px] overflow-y-auto divide-y divide-zinc-100 border border-zinc-150 rounded-xl bg-white" id="sim-payments-list">
                    {simResult.plannedPayments.map((p, idx) => {
                      const isDegraded = p.originalType !== p.finalType;
                      // Format Brazilian date string smoothly
                      const formattedDate = new Date(p.dateString + 'T00:00:00').toLocaleDateString('pt-BR');
                      
                      return (
                        <div key={idx} className="p-3 flex flex-col gap-1 hover:bg-zinc-50 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-zinc-650 bg-zinc-100 px-1.5 py-0.5 rounded text-[10px]">{formattedDate}</span>
                              <span className="text-zinc-600 font-medium">Dia {idx + 1} de missão continuada</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                {isDegraded ? (
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold text-amber-600 flex items-center gap-1 text-[10.5px]">
                                      <AlertCircle className="w-3" />
                                      Capped {p.finalType}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-semibold text-emerald-950 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-mono text-[9px]">
                                    {p.finalType}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-zinc-900 text-right w-[80px]">
                                {formatBRL(p.totalDayValue)}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between pl-2 text-[10px] text-zinc-500 italic">
                            <span>Alimentação: {formatBRL(p.rate)}</span>
                            <span>GRAT REP VI (Líquido): {formatBRL(p.maneuverAllowance)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Advice Box for simulation */}
                <div className="p-3.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl text-xs flex gap-2.5">
                  <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Como funciona o cálculo deslizante?</p>
                    <p className="text-amber-905 text-amber-900 text-[11px] leading-relaxed">
                      Este simulador assume que você registrará esta missão. Ele temporariamente calcula os 30 dias antecedentes de cada dia simulado. Caso as cotas de alimentação ultrapassem 10, o sistema degrada o pagamento daquele dia específico de N10 (R$ 135) para N1 (R$ 13,50) para respeitar o limite legal, mas a GRAT REP VI de {formatBRL(simDailyAdditionalValue)} (com 27,5% IR deduzido) mantém-se inalterada.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-2 py-12">
                <Info className="w-8 h-8 text-zinc-300" />
                <span className="text-xs font-medium">Insira datas e horas válidas para rodar o simulador em tempo real.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
