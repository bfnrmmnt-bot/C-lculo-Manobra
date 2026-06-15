import React, { useState } from 'react';
import { Mission, DailyPayment, CalculationSummary } from '../types';
import { getActiveQuotaAtDate, formatDateString } from '../utils/calculator';
import { Trash2, AlertTriangle, MapPin, Calendar, Clock, RotateCcw, AlertCircle, Sparkles, ChevronDown, ChevronUp, BarChart4 } from 'lucide-react';

interface MissionHistoryProps {
  summary: CalculationSummary;
  onDeleteMission: (id: string) => void;
  onResetMissions: () => void;
  onLoadDefaults: () => void;
}

export default function MissionHistory({ summary, onDeleteMission, onResetMissions, onLoadDefaults }: MissionHistoryProps) {
  const { missionCalculations, allPayments } = summary;
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);

  // Sorting missions so the newer ones are shown at the top of the history feed (using end date to put the last day of the last mission on top)
  const sortedCalculations = [...missionCalculations].sort((a, b) => {
    return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
  });

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDurationString = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${Math.round(hours)}h`;
  };

  const formatDateTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper to check if any day in a mission was degraded to N1
  const hasDegradedCheck = (payments: DailyPayment[]) => {
    return payments.some((p) => p.originalType !== p.assignedType);
  };

  // State to filter out blank rest days if the user prefers
  const [showAll30Days, setShowAll30Days] = useState<boolean>(true);

  // Calculate the sliding window occupation timeline for the last 30 consecutive days!
  const getQuotaUtilizationData = () => {
    // Determine the anchor date. We prioritize June 2nd, 2026, or the maximum date of missions registered
    let anchorDate = new Date(2026, 5, 2); // June 2, 2526 (0-indexed month)
    
    if (allPayments.length > 0) {
      const dates = allPayments.map(p => p.dateString);
      const maxDateStr = dates.reduce((max, d) => d > max ? d : max, '2026-06-02');
      const maxDateObj = new Date(maxDateStr + 'T00:00:00');
      if (maxDateObj > anchorDate) {
        anchorDate = maxDateObj;
      }
    }

    const result = [];
    const tempDate = new Date(anchorDate.getTime());

    for (let i = 0; i < 30; i++) {
      const dateStr = formatDateString(tempDate);
      const { activeCount, remaining } = getActiveQuotaAtDate(allPayments, dateStr);
      const paymentsOnThisDay = allPayments.filter((p) => p.dateString === dateStr);

      let primaryType = 'Folga';
      if (paymentsOnThisDay.some((p) => p.assignedType === 'N10')) primaryType = 'N10';
      else if (paymentsOnThisDay.some((p) => p.assignedType === 'N5')) primaryType = 'N5';
      else if (paymentsOnThisDay.some((p) => p.assignedType === 'N1')) primaryType = 'N1';

      result.push({
        dateStr,
        formattedDate: tempDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        activeCount,
        remaining,
        primaryType,
        missionTitles: paymentsOnThisDay.length > 0
          ? Array.from(new Set(paymentsOnThisDay.map((p) => p.missionTitle))).join(', ')
          : 'Instalação / Sem Escala de Missão',
        hasMissions: paymentsOnThisDay.length > 0
      });

      // Move back 1 day
      tempDate.setDate(tempDate.getDate() - 1);
    }

    // Keep from newest to oldest so that the layout starts with the final/most recent day at the top, as requested
    if (showAll30Days) {
      return result;
    } else {
      return result.filter(item => item.hasMissions);
    }
  };

  const quotaTimeline = getQuotaUtilizationData();

  return (
    <div className="space-y-6" id="history-container">
      {/* 30-Day Sliding Window Monitor Panel */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs" id="sliding-quota-monitor">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <BarChart4 className="w-5 h-5 text-emerald-800" />
              Relatório Geral dos Últimos 30 Dias
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Histórico cronológico detalhado no ciclo deslizante de 1 mês completo a partir do dia de visualização.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAll30Days(!showAll30Days)}
              className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold px-2.5 py-1 rounded-lg border border-zinc-200 cursor-pointer"
            >
              {showAll30Days ? 'Filtrar Folgas' : 'Exibir Todos 30 Dias'}
            </button>
            <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-950 font-semibold px-2.5 py-1 rounded-full border border-emerald-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Limite: 10 cotas N10/N5</span>
            </div>
          </div>
        </div>

        {/* Graphical representation rows */}
        <div className="space-y-3 pt-2 max-h-[380px] overflow-y-auto pr-1" id="quota-usage-bars-list">
          {quotaTimeline.length > 0 ? (
            quotaTimeline.map((item, idx) => {
              const uPercent = (item.activeCount / 10) * 100;
              const isFull = item.activeCount >= 10;
              
              return (
                <div key={idx} className={`flex flex-col sm:flex-row sm:items-center gap-2 text-xs p-2 rounded-xl transition-all ${
                  item.hasMissions ? 'bg-zinc-50 border border-zinc-150' : 'opacity-70'
                }`}>
                  <div className="w-[85px] font-semibold text-zinc-800 shrink-0 flex items-center gap-1.5">
                    <span className={`font-mono px-2 py-0.5 rounded text-[11px] block text-center w-full ${
                      item.hasMissions ? 'bg-emerald-950 text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {item.formattedDate}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-zinc-500">
                      <span className="truncate max-w-[200px] sm:max-w-xs">{item.missionTitles}</span>
                      <span className="font-semibold text-zinc-700 font-mono">
                        {item.activeCount}/10 cotas usadas
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-200/60 h-2 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull 
                             ? 'bg-rose-500' 
                            : item.activeCount >= 8 
                            ? 'bg-amber-400' 
                            : 'bg-emerald-700'
                        }`}
                        style={{ width: `${Math.min(100, uPercent)}%` }}
                      />
                    </div>
                  </div>

                  <div className="w-[70px] text-right shrink-0">
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.primaryType === 'N10' 
                        ? 'bg-emerald-100 text-emerald-850 animate-fade' 
                        : item.primaryType === 'N5' 
                        ? 'bg-sky-100 text-sky-850' 
                        : item.primaryType === 'N1'
                        ? 'bg-amber-100 text-amber-850'
                        : 'bg-zinc-100 text-zinc-400 font-normal italic'
                    }`}>
                      {item.primaryType}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-zinc-400 text-xs">
              Nenhuma escala cadastrada neste ciclo de 30 dias.
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2 text-[10.5px] text-zinc-450 text-zinc-500">
          <AlertCircle className="w-3.5 h-3.5 text-emerald-850 shrink-0" />
          <span>
            Este relatório mostra todos os 30 dias retrospectivos a partir de hoje (02 de junho de 2026). Os dias com missões ativas aparecem destacados com suas respectivas cotas ou folgas.
          </span>
        </div>
      </div>

      {/* Database control buttons & Log Header */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs" id="missions-history-log">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-800" />
              Histórico Geral de Missões
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Visualização das escalas cumpridas e o respectivo demonstrativo de pagamentos concedidos.
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-auto shrink-0 justify-end">
            {sortedCalculations.length > 0 ? (
              <button
                type="button"
                onClick={onResetMissions}
                className="py-1.5 px-3 border border-rose-250 text-rose-800 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center cursor-pointer"
                id="delete-all-missions-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Tudo
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoadDefaults}
                className="py-1.5 px-3 border border-emerald-300 text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center cursor-pointer"
                id="load-defaults-btn"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-800" />
                Carregar Exemplo Regulamentar
              </button>
            )}
          </div>
        </div>

        {/* Missions Timeline list */}
        {sortedCalculations.length > 0 ? (
          <div className="space-y-4" id="mission-timeline-items">
            {sortedCalculations.map((calc) => {
              const isExpanded = expandedMissionId === calc.missionId;
              const hasCapping = hasDegradedCheck(calc.payments);
              const brutoManeuverPay = calc.maneuverPay / 0.725;
              const irDeduction = brutoManeuverPay * 0.275;

              return (
                <div
                  key={calc.missionId}
                  className={`border rounded-2xl overflow-hidden transition-all duration-200 bg-white ${
                    isExpanded 
                      ? 'border-emerald-800 ring-2 ring-emerald-800/10' 
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                  id={`mission-card-${calc.missionId}`}
                >
                  {/* Card Main Block */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900">{calc.title}</h4>
                        <span className="inline-flex items-center text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                          {calc.rankName || 'Posto'}
                        </span>
                        {hasCapping && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Cota Alimentação Degradada
                          </span>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateTime(calc.startDate)}
                        </span>
                        <span className="text-zinc-300 hidden sm:inline">|</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {getDurationString(calc.durationHours)} (Até {formatDateTime(calc.endDate)})
                        </span>
                        {calc.location && (
                          <>
                            <span className="text-zinc-300 hidden sm:inline">|</span>
                            <span className="flex items-center gap-1 text-zinc-650">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                              {calc.location}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="text-xs text-zinc-600 line-clamp-2 italic pt-0.5">
                        {calc.description || 'Sem descrição cadastrada para esta missão.'}
                      </div>
                    </div>

                    {/* Costing & Action block */}
                    <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-zinc-100 pt-3 sm:pt-0 gap-4">
                      <div className="text-left sm:text-right space-y-0.5">
                        <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Rendimento Militar</span>
                        <span className="text-lg font-bold font-mono text-emerald-850 block">{formatBRL(calc.totalPay)}</span>
                        <div className="text-[10.5px] text-zinc-500 block leading-normal space-y-0.5 mt-1 sm:min-w-[180px]">
                          <div className="flex justify-between sm:justify-end gap-1.5">
                            <span className="text-zinc-400">Alimentação:</span>
                            <strong className="font-mono text-zinc-700 font-semibold">{formatBRL(calc.foodPay)}</strong>
                          </div>
                          <div className="flex justify-between sm:justify-end gap-1.5">
                            <span className="text-zinc-400">GRAT REP OP:</span>
                            <strong className="font-mono text-zinc-700 font-semibold">{formatBRL(brutoManeuverPay)}</strong>
                          </div>
                          <div className="flex justify-between sm:justify-end gap-1.5 text-rose-600 font-semibold">
                            <span>Imposto de Renda:</span>
                            <span className="font-mono">-{formatBRL(irDeduction)}</span>
                          </div>
                        </div>
                        <span className="text-[10.5px] text-zinc-400 text-normal block mt-1">
                          {calc.totalDays} {calc.totalDays === 1 ? 'dia de cota' : 'dias de cotas'} ({calc.rankName})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Detail Expansion */}
                        <button
                          type="button"
                          onClick={() => setExpandedMissionId(isExpanded ? null : calc.missionId)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-800 hover:bg-zinc-50 rounded-lg border border-zinc-200 transition-all cursor-pointer"
                          title="Ver detalhamento dia a dia"
                          id={`expand-btn-${calc.missionId}`}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteMission(calc.missionId)}
                          className="p-1.5 text-rose-450 hover:text-rose-900 border border-zinc-200 hover:border-rose-150 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Excluir do histórico"
                          id={`delete-btn-${calc.missionId}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded payment breakdowns */}
                  {isExpanded && (
                    <div className="bg-zinc-50/50 border-t border-zinc-200 p-4 space-y-2" id={`expansion-panel-${calc.missionId}`}>
                      <h5 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Comprovante de Distribuição de Cotas</h5>
                      
                      <div className="divide-y divide-zinc-200/60 border border-zinc-200 bg-white rounded-xl overflow-hidden shadow-xs">
                        {calc.payments.map((p, pIdx) => {
                          const isDegraded = p.originalType !== p.assignedType;
                          const dFormatted = new Date(p.dateString + 'T00:00:00').toLocaleDateString('pt-BR');

                          return (
                            <div key={pIdx} className="p-3 flex flex-col gap-1.5 text-xs">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-650 bg-zinc-100 border border-zinc-150 px-2 py-0.5 rounded font-mono text-[10px]">
                                    {dFormatted}
                                  </span>
                                  <span className="text-zinc-600 font-sans font-medium">
                                    Cota do Dia {pIdx + 1} de missão acumulada
                                  </span>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    {isDegraded ? (
                                      <div className="flex flex-col items-end">
                                        <span className="text-[11px] text-amber-750 text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-105">
                                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                          Degradado para {p.assignedType}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-emerald-990 text-emerald-900 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg text-[10.5px]">
                                        {p.assignedType}
                                      </span>
                                    )}
                                  </div>

                                  <span className="font-mono font-bold text-zinc-900 min-w-[70px] text-right">
                                    {formatBRL(p.totalDayValue || (p.rate + (p.maneuverAllowance || 0)))}
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-between pl-2 text-[10px] text-zinc-500 italic">
                                <span>Alimentação de Missão: {formatBRL(p.rate)}</span>
                                <span>GRAT REP OP (Líquido -27,5% IR): {formatBRL(p.maneuverAllowance || 0)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-zinc-100 rounded-xl text-[10.5px] text-zinc-500 italic mt-2">
                        * O cálculo utiliza data de início e hora para alocar em períodos de 24h consecutivas. Se nas últimas 30 datas antes do processamento o militar exceder 10 cotas cheias de alimentação (N10/N5), o valor de alimentação é adjusted de R$ 135,00 para o valor residual de N1 (R$ 13,50) para proteger a quota, enquanto a GRAT REP OP (com desconto de 27,5% do imposto de renda) se mantém inalterada por dia de manobra.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-400 border border-dashed border-zinc-150 rounded-2xl flex flex-col items-center justify-center gap-3 py-16" id="empty-history-placeholder">
            <Calendar className="w-10 h-10 text-zinc-300" />
            <div className="space-y-1">
              <span className="text-sm font-semibold text-zinc-700 block">Nenhuma missão cadastrada</span>
              <span className="text-xs text-zinc-400 max-w-sm block mx-auto leading-relaxed">
                Você pode registrar suas escalas usando o formulário de lançamento ou carregar exemplos regulamentares para validar o cálculo de teto deslizante.
              </span>
            </div>
            
            <button
              type="button"
              onClick={onLoadDefaults}
              className="mt-3 py-2 px-4 bg-emerald-950 text-white font-bold hover:bg-emerald-900 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              id="empty-load-btn"
            >
              <RotateCcw className="w-4 h-4 text-emerald-250" />
              Carregar Exemplo Regulamentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
