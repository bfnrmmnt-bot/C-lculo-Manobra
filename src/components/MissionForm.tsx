import React, { useState, useEffect } from 'react';
import { Mission, DailyPayment, RANKS, Rank } from '../types';
import { simulateProposedMission, RATES } from '../utils/calculator';
import { PlusCircle, Search, HelpCircle, AlertCircle, Info, CalendarClock, DollarSign, ListPlus, Calculator } from 'lucide-react';

interface MissionFormProps {
  currentMissions: Mission[];
  onAddMission: (mission: Omit<Mission, 'id'>) => void;
  onUpdateMission?: (mission: Mission) => void;
  editingMission?: Mission | null;
  onCancelEdit?: () => void;
  allPayments: DailyPayment[];
  selectedRankId: string;
  ranks?: Rank[];
}

export default function MissionForm({ 
  currentMissions, 
  onAddMission, 
  onUpdateMission,
  editingMission,
  onCancelEdit,
  allPayments, 
  selectedRankId, 
  ranks = RANKS 
}: MissionFormProps) {
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

  // Quick support calculators state
  const [paidValueInput, setPaidValueInput] = useState('');
  const [directN10, setDirectN10] = useState<number>(0);
  const [directN5, setDirectN5] = useState<number>(0);
  const [directN1, setDirectN1] = useState<number>(0);

  // Inverse calculation helper
  const parsedPaidValue = parseFloat(paidValueInput.replace(',', '.')) || 0;
  
  const getInverseCalculation = (val: number) => {
    if (val <= 0) return null;
    const r10 = 13500; // in cents
    const r5 = 6750;   // in cents
    const r1 = 1350;   // in cents
    
    let remaining = Math.round(val * 100);
    const n10 = Math.floor(remaining / r10);
    remaining = remaining % r10;
    
    const n5 = Math.floor(remaining / r5);
    remaining = remaining % r5;
    
    const n1 = Math.floor(remaining / r1);
    remaining = remaining % r1;
    
    const totalRepresented = (n10 * r10 + n5 * r5 + n1 * r1) / 100;
    
    return {
      n10,
      n5,
      n1,
      remainder: remaining / 100,
      totalRepresented
    };
  };

  const inverseResult = getInverseCalculation(parsedPaidValue);

  // Sync state with selectedRankId prop
  useEffect(() => {
    if (selectedRankId) {
      setRankId(selectedRankId);
      setSimRankId(selectedRankId);
    }
  }, [selectedRankId]);

  // Sync state with editingMission prop
  useEffect(() => {
    if (editingMission) {
      setTitle(editingMission.title);
      setDescription(editingMission.description || '');
      setLocation(editingMission.location || '');
      setStartDate(editingMission.startDate);
      setEndDate(editingMission.endDate);
      setRankId(editingMission.rankId);
      setActiveTab('register');
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setStartDate('2026-06-01T08:00');
      setEndDate('2026-06-02T12:00');
    }
  }, [editingMission]);

  // Re-run simulation whenever simulation inputs or background missions change
  useEffect(() => {
    try {
      const sDateObj = new Date(simStartDate);
      const eDateObj = new Date(simEndDate);
      if (sDateObj.getTime() < eDateObj.getTime()) {
        const result = simulateProposedMission(currentMissions, simStartDate, simEndDate, simRankId, ranks);
        setSimResult(result);
      } else {
        setSimResult(null);
      }
    } catch {
      setSimResult(null);
    }
  }, [simStartDate, simEndDate, currentMissions, simRankId, ranks]);

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

    if (editingMission && onUpdateMission) {
      onUpdateMission({
        ...editingMission,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startDate,
        endDate,
        rankId,
      });
    } else {
      // Call callback to persist mission with the selected rankId
      onAddMission({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startDate,
        endDate,
        rankId,
      });
    }

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
    if (isNaN(value) || !isFinite(value)) return 'R$\u00a00,00';
    const fixed = value.toFixed(10);
    const [integerPart, decimalPart] = fixed.split('.');
    const truncatedValue = Number(integerPart + '.' + decimalPart.substring(0, 2));

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(truncatedValue);
  };

  const selectedRankObj = ranks.find(r => r.id === rankId) || ranks.find(r => r.id === 'terceiro_sargento') || ranks[1] || ranks[0]; // Terceiro sargento default
  const dailyAdditionalValue = selectedRankObj.soldo * 0.02 * 0.7255;

  const simRankObj = ranks.find(r => r.id === simRankId) || ranks.find(r => r.id === 'terceiro_sargento') || ranks[1] || ranks[0];
  const simDailyAdditionalValue = simRankObj.soldo * 0.02 * 0.7255;

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
          {editingMission ? 'Editar Missão' : 'Registrar Nova Missão'}
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
              {editingMission ? 'Editar Missão' : 'Lançar Missão'}
            </h3>
            <p className="text-xs text-zinc-500">
              {editingMission 
                ? 'Atualize os detalhes da missão selecionada. Os cálculos e quotas do teto deslizante serão atualizados automaticamente ao salvar.' 
                : 'Insira os dados exatos do seu início e encerramento para calcular automaticamente os valores devidos e deduzir da quota de 30 dias de cotas de alimentação.'}
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
                  <span className="text-emerald-700 font-bold">{formatBRL(RATES.N1)}/dia</span>
                </div>
                <div className="flex flex-col p-2 bg-white rounded-lg border border-zinc-150">
                  <span className="text-zinc-500 font-sans">8h até 24 horas</span>
                  <span className="font-bold text-zinc-950">Alimentação N5</span>
                  <span className="text-emerald-700 font-bold">{formatBRL(RATES.N5)}/dia</span>
                </div>
                <div className="flex flex-col p-2 bg-white rounded-lg border border-zinc-150">
                  <span className="text-zinc-500 font-sans">Mais de 24 horas</span>
                  <span className="font-bold text-zinc-950">Alimentação N10</span>
                  <span className="text-emerald-700 font-bold">{formatBRL(RATES.N10)}/dia</span>
                </div>
              </div>
            </div>

            {editingMission ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-950 text-white font-bold rounded-xl shadow-xs hover:bg-emerald-900 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  id="submit-mission-btn"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-250" />
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Cancelar Edição
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-950 text-white font-bold rounded-xl shadow-xs hover:bg-emerald-900 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                id="submit-mission-btn"
              >
                <PlusCircle className="w-4 h-4" />
                Salvar Missão no Histórico
              </button>
            )}
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
                  {ranks.map((r) => (
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
                      <span>GRAT REP OP com IR (-27,45%): <strong>{formatBRL(simResult.estimatedManeuverTotal)}</strong></span>
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
                            <span>GRAT REP OP (Líquido): {formatBRL(p.maneuverAllowance)}</span>
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
                      Este simulador assume que você registrará esta missão. Ele temporariamente calcula os 30 dias antecedentes de cada dia simulado. Caso as cotas de alimentação ultrapassem 10, o sistema degrada o pagamento daquele dia específico de N10 (R$ 135) para N1 (R$ 13,50) para respeitar o limite legal, mas a GRAT REP OP de {formatBRL(simDailyAdditionalValue)} (com 27,45% IR deduzido) mantém-se inalterada.
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

            {/* Divider */}
            <div className="border-t border-zinc-150 my-6 pt-5" id="auxiliary-calculators-divider" />

            {/* Support Calculators Bento-like Section */}
            <div className="space-y-4" id="quick-calculators-section">
              <div className="flex items-center gap-2">
                <Calculator className="w-4.5 h-4.5 text-emerald-800" />
                <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">
                  Calculadoras de Apoio a Diárias
                </h4>
              </div>
              <p className="text-xs text-zinc-500 leading-normal">
                Utilize estas ferramentas para converter de forma rápida valores recebidos de volta em cotas ou estimar valores diretamente por quantidade de cotas.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Frame 1: Paid Value Decomposition */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between space-y-4" id="decouple-calculator-frame">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1">
                      1. Decompor Valor Recebido
                    </h5>
                    <p className="text-[11px] text-zinc-500 leading-snug mb-3">
                      Insira o valor líquido total recebido para deduzir quais cotas de alimentação puras (N10, N5, N1) compõem este pagamento.
                    </p>

                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-zinc-400 text-xs font-bold font-mono">R$</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: 216,00"
                        value={paidValueInput}
                        onChange={(e) => setPaidValueInput(e.target.value)}
                        className="block w-full pl-8 pr-3 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-850 font-mono"
                        id="paid-value-input"
                      />
                    </div>

                    <div className="space-y-1.5 mt-3">
                      {/* N10 Badge */}
                      <div className="flex items-center justify-between text-xs p-2 bg-white border border-zinc-150 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block shrink-0" />
                          <span className="font-semibold text-zinc-700">N10 (R$ 135,00):</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                          {inverseResult ? `${inverseResult.n10} ${inverseResult.n10 === 1 ? 'cota' : 'cotas'}` : '0 cotas'}
                        </span>
                      </div>

                      {/* N5 Badge */}
                      <div className="flex items-center justify-between text-xs p-2 bg-white border border-zinc-150 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 block shrink-0" />
                          <span className="font-semibold text-zinc-700">N5 (R$ 67,50):</span>
                        </div>
                        <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                          {inverseResult ? `${inverseResult.n5} ${inverseResult.n5 === 1 ? 'cota' : 'cotas'}` : '0 cotas'}
                        </span>
                      </div>

                      {/* N1 Badge */}
                      <div className="flex items-center justify-between text-xs p-2 bg-white border border-zinc-150 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block shrink-0" />
                          <span className="font-semibold text-zinc-700">N1 (R$ 13,50):</span>
                        </div>
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                          {inverseResult ? `${inverseResult.n1} ${inverseResult.n1 === 1 ? 'cota' : 'cotas'}` : '0 cotas'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {inverseResult && (
                    <div className="pt-2 border-t border-dashed border-zinc-200 flex flex-col gap-1 text-[11px] bg-white p-3 rounded-xl border border-zinc-150 animate-fade-in">
                      <div className="flex justify-between font-bold text-zinc-800">
                        <span>Soma Equivalente:</span>
                        <span className="font-mono text-emerald-850">{formatBRL(inverseResult.totalRepresented)}</span>
                      </div>
                      {inverseResult.remainder > 0 && (
                        <div className="text-amber-800 bg-amber-50 px-2 py-1 rounded-lg text-[10px] flex items-center gap-1.5 mt-1 border border-amber-150 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Resíduo de {formatBRL(inverseResult.remainder)} não se divide em cotas inteiras.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Frame 2: Direct Simulator */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between space-y-4" id="direct-calculator-frame">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1">
                      2. Calcular por Quantidade
                    </h5>
                    <p className="text-[11px] text-zinc-500 leading-snug mb-3">
                      Insira livremente a quantidade de cada tipo de cota de alimentação para obter o somatório instantâneo calculado.
                    </p>

                    <div className="space-y-2.5">
                      {/* Direct N10 */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          N10 (R$ 135,00)
                        </span>
                        <div className="flex items-center border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setDirectN10(Math.max(0, directN10 - 1))}
                            className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer select-none font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={directN10}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setDirectN10(isNaN(val) || val < 0 ? 0 : val);
                            }}
                            className="w-12 text-center text-xs py-1 focus:outline-none font-mono font-bold text-zinc-800 border-none"
                          />
                          <button
                            type="button"
                            onClick={() => setDirectN10(directN10 + 1)}
                            className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer select-none font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Direct N5 */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                          N5 (R$ 67,50)
                        </span>
                        <div className="flex items-center border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setDirectN5(Math.max(0, directN5 - 1))}
                            className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer select-none font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={directN5}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setDirectN5(isNaN(val) || val < 0 ? 0 : val);
                            }}
                            className="w-12 text-center text-xs py-1 focus:outline-none font-mono font-bold text-zinc-800 border-none"
                          />
                          <button
                            type="button"
                            onClick={() => setDirectN5(directN5 + 1)}
                            className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer select-none font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Direct N1 */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          N1 (R$ 13,50)
                        </span>
                        <div className="flex items-center border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setDirectN1(Math.max(0, directN1 - 1))}
                            className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer select-none font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={directN1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setDirectN1(isNaN(val) || val < 0 ? 0 : val);
                            }}
                            className="w-12 text-center text-xs py-1 focus:outline-none font-mono font-bold text-zinc-800 border-none"
                          />
                          <button
                            type="button"
                            onClick={() => setDirectN1(directN1 + 1)}
                            className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer select-none font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-dashed border-zinc-200 flex flex-col justify-end text-right bg-white p-3 rounded-xl border border-zinc-150">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Calculado</span>
                    <span className="text-xl font-bold font-mono text-emerald-850 mt-0.5">
                      {formatBRL((directN10 * 135) + (directN5 * 67.5) + (directN1 * 13.5))}
                    </span>
                    <span className="text-[9.5px] text-zinc-500 font-mono mt-0.5">
                      ({directN10}x N10 + {directN5}x N5 + {directN1}x N1)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
