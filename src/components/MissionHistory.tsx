import React, { useState } from 'react';
import { Mission, DailyPayment, CalculationSummary } from '../types';
import { getActiveQuotaAtDate, formatDateString } from '../utils/calculator';
import { Trash2, AlertTriangle, MapPin, Calendar, Clock, RotateCcw, AlertCircle, Sparkles, ChevronDown, ChevronUp, BarChart4, Pencil, Download, Check, X, CalendarClock } from 'lucide-react';

interface MissionHistoryProps {
  summary: CalculationSummary;
  missions: Mission[];
  onUpdateMission: (mission: Mission) => void;
  onDeleteMission: (id: string) => void;
  onResetMissions: () => void;
  onLoadDefaults: () => void;
  onEditMission: (id: string) => void;
  onImportBackup: (data: any) => void;
  onExportBackup: () => void;
  onToggleReceived: (id: string) => void;
}

export default function MissionHistory({ 
  summary, 
  missions,
  onUpdateMission,
  onDeleteMission,
  onResetMissions, 
  onLoadDefaults,
  onEditMission,
  onImportBackup,
  onExportBackup,
  onToggleReceived
}: MissionHistoryProps) {
  const { missionCalculations, allPayments } = summary;
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);

  // Sorting missions so the newer ones are shown at the top of the history feed (using end date to put the last day of the last mission on top)
  const sortedCalculations = [...missionCalculations].sort((a, b) => {
    return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
  });

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

  // State to track selected day in the calendar
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Calculate the sliding window occupation timeline for the last 30 consecutive days (chronological oldest to newest)
  const full30DaysChronological = (() => {
    // Determine the anchor date. We present the calendar up to the current day (today), or the maximum date of missions registered if it lies in the future
    let anchorDate = new Date();
    
    if (allPayments.length > 0) {
      const dates = allPayments.map(p => p.dateString);
      const maxDateStr = dates.reduce((max, d) => d > max ? d : max, '');
      if (maxDateStr) {
        const maxDateObj = new Date(maxDateStr + 'T12:00:00');
        if (maxDateObj > anchorDate) {
          anchorDate = maxDateObj;
        }
      }
    }

    const result = [];
    const tempDate = new Date(anchorDate.getTime());

    for (let i = 0; i < 30; i++) {
      const dateStr = formatDateString(tempDate);
      const { activeCount, remaining } = getActiveQuotaAtDate(allPayments, dateStr);
      const paymentsOnThisDay = allPayments.filter((p) => p.dateString === dateStr);
      const actualFoodRate = paymentsOnThisDay.length > 0 ? paymentsOnThisDay.reduce((sum, p) => sum + p.rate, 0) : 0;

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
        actualFoodRate,
        missionTitles: paymentsOnThisDay.length > 0
          ? Array.from(new Set(paymentsOnThisDay.map((p) => p.missionTitle))).join(', ')
          : 'Sem escala de missão',
        hasMissions: paymentsOnThisDay.length > 0
      });

      // Move back 1 day
      tempDate.setDate(tempDate.getDate() - 1);
    }

    // Return reversed to be in chronological order (oldest to newest)
    return result.reverse();
  })();

  // Resolve active selected date (default to latest day if none is clicked)
  const activeSelectedDateStr = selectedDateStr || (full30DaysChronological.length > 0 ? full30DaysChronological[full30DaysChronological.length - 1].dateStr : null);
  const selectedDayDetail = full30DaysChronological.find(item => item.dateStr === activeSelectedDateStr);

  const paymentOnSelectedDay = activeSelectedDateStr
    ? allPayments.find(p => p.dateString === activeSelectedDateStr)
    : null;

  const associatedMission = paymentOnSelectedDay && missions
    ? missions.find(m => m.id === paymentOnSelectedDay.missionId)
    : null;

  const getCalendarHeaderSpan = () => {
    if (full30DaysChronological.length === 0) return 'Últimos 30 Dias';
    
    const formatMonthYear = (dateStr: string) => {
      const date = new Date(dateStr + 'T12:00:00');
      const month = date.toLocaleDateString('pt-BR', { month: 'long' });
      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
      const year = date.getFullYear();
      return { month: capitalizedMonth, year };
    };

    const first = formatMonthYear(full30DaysChronological[0].dateStr);
    const last = formatMonthYear(full30DaysChronological[full30DaysChronological.length - 1].dateStr);

    if (first.month === last.month && first.year === last.year) {
      return `${first.month} de ${first.year}`;
    } else if (first.year === last.year) {
      return `${first.month} / ${last.month} de ${first.year}`;
    } else {
      return `${first.month} de ${first.year} – ${last.month} de ${last.year}`;
    }
  };

  const getReadableDayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dayAndMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    return `${capitalizedDay}, ${dayAndMonth}`;
  };

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Padding slots at the start of the calendar grid
  const startPadding = full30DaysChronological.length > 0 
    ? new Date(full30DaysChronological[0].dateStr + 'T12:00:00').getDay() 
    : 0;

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
              Calendário detalhado de alimentação no ciclo deslizante de 1 mês completo. Clique em um dia para ver o demonstrativo.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-emerald-950 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {getCalendarHeaderSpan()}
            </span>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="mt-4 border border-zinc-150 rounded-2xl p-4 bg-zinc-50/50">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            {weekdays.map((w, index) => (
              <div key={index} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Day blocks grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Empty padding slots */}
            {Array.from({ length: startPadding }).map((_, index) => (
              <div key={`pad-${index}`} className="aspect-square bg-transparent rounded-xl" />
            ))}

            {/* Actual 30 days */}
            {full30DaysChronological.map((item) => {
              const dayNum = item.dateStr.split('-')[2];
              const isSelected = item.dateStr === activeSelectedDateStr;
              
              // Resolve styles based on food allowance type
              let colorClasses = '';
              if (item.hasMissions && item.actualFoodRate === 0) {
                // Zeroed is Yellow / Amarelo
                colorClasses = 'bg-amber-100/95 text-amber-950 border-amber-300 hover:bg-amber-200 font-medium';
              } else if (item.primaryType === 'N10') {
                // N10 is Greenish / Esverdeado
                colorClasses = 'bg-emerald-100/90 text-emerald-900 border-emerald-300 hover:bg-emerald-200';
              } else if (item.primaryType === 'N5') {
                // N5 is Bluish / Azulado
                colorClasses = 'bg-sky-100/90 text-sky-900 border-sky-300 hover:bg-sky-200';
              } else if (item.primaryType === 'N1') {
                // N1 is Reddish / Avermelhado (degraded alert state)
                colorClasses = 'bg-rose-100/95 text-rose-900 border-rose-300 hover:bg-rose-250 font-bold';
              } else {
                // Folga / No Mission is neutral gray
                colorClasses = 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50';
              }

              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(item.dateStr)}
                  className={`aspect-square border rounded-xl flex flex-col items-center justify-center relative text-xs sm:text-sm font-semibold transition-all duration-200 select-none ${colorClasses} ${
                    isSelected 
                      ? 'ring-2 ring-amber-400 ring-offset-1 scale-105 z-10 shadow-sm' 
                      : ''
                  }`}
                  title={`${item.formattedDate} - ${item.primaryType} (${item.missionTitles})`}
                  id={`calendar-day-${item.dateStr}`}
                >
                  <span className="leading-none">{parseInt(dayNum, 10)}</span>
                  {item.hasMissions && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      item.actualFoodRate === 0
                        ? 'bg-amber-500'
                        : item.primaryType === 'N10' 
                        ? 'bg-emerald-600' 
                        : item.primaryType === 'N5' 
                        ? 'bg-sky-600' 
                        : 'bg-rose-600'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend section */}
          <div className="mt-5 pt-4 border-t border-zinc-200/60 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-[11px] text-zinc-650">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 block" />
              <span className="text-zinc-600 font-medium">N10</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-sky-100 border border-sky-300 block" />
              <span className="text-zinc-600 font-medium">N5</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 block" />
              <span className="text-zinc-600 font-medium">N1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 block" />
              <span className="text-zinc-600 font-medium font-semibold text-amber-900">Alimentação Zerada</span>
            </div>
          </div>
        </div>

        {/* Selected Day details popover / expansion */}
        {selectedDayDetail && (
          <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl animate-fade-in" id="calendar-day-detail">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-zinc-200/60 pb-3 mb-3">
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">
                  {getReadableDayName(selectedDayDetail.dateStr)}
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Data de Processamento: {selectedDayDetail.formattedDate}
                </span>
              </div>
              
              <div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                  selectedDayDetail.hasMissions && selectedDayDetail.actualFoodRate === 0
                    ? 'bg-amber-100 text-amber-900 border-amber-200'
                    : selectedDayDetail.primaryType === 'N10'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    : selectedDayDetail.primaryType === 'N5'
                    ? 'bg-sky-100 text-sky-900 border-sky-200'
                    : selectedDayDetail.primaryType === 'N1'
                    ? 'bg-rose-100 text-rose-900 border-rose-200'
                    : 'bg-zinc-100 text-zinc-500 border-zinc-200/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedDayDetail.hasMissions && selectedDayDetail.actualFoodRate === 0
                      ? 'bg-amber-500'
                      : selectedDayDetail.primaryType === 'N10'
                      ? 'bg-emerald-500'
                      : selectedDayDetail.primaryType === 'N5'
                      ? 'bg-sky-500'
                      : selectedDayDetail.primaryType === 'N1'
                      ? 'bg-rose-500'
                      : 'bg-zinc-400'
                  }`} />
                  {selectedDayDetail.hasMissions && selectedDayDetail.actualFoodRate === 0
                    ? 'Alimentação Zerada'
                    : selectedDayDetail.primaryType === 'N10'
                    ? 'N10 – Cota Alimentação Cheia'
                    : selectedDayDetail.primaryType === 'N5'
                    ? 'N5 – Meia Cota Alimentação'
                    : selectedDayDetail.primaryType === 'N1'
                    ? 'N1 – Alimentação Degradada'
                    : 'Folga / Sem Escala'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">Missão Ativa</span>
                  <span className="text-zinc-800 font-semibold block mt-0.5">
                    {selectedDayDetail.missionTitles}
                  </span>
                </div>
                <div>
                  <span className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">Valor de Alimentação Creditado</span>
                  <span className="text-emerald-900 font-bold font-mono text-sm block mt-0.5">
                    {formatBRL(selectedDayDetail.actualFoodRate)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-zinc-200/60 pt-3 md:pt-0 md:pl-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider block">Ocupação de Limite (Últimos 30 Dias)</span>
                    <span className="font-mono font-bold text-zinc-700">
                      {selectedDayDetail.activeCount} / 10 cotas
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200/60 h-2 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        selectedDayDetail.activeCount >= 10
                          ? 'bg-rose-500'
                          : selectedDayDetail.activeCount >= 8
                          ? 'bg-amber-400'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${(selectedDayDetail.activeCount / 10) * 100}%` }}
                    />
                  </div>
                </div>
                
                <p className="text-[10px] text-zinc-500 leading-relaxed pt-1">
                  {selectedDayDetail.activeCount >= 10
                    ? 'Limite de 10 cotas cheias atingido neste ciclo deslizante. Para proteger a quota, o valor deste dia foi degradado para o valor residual de N1 (R$ 13,50).'
                    : `Você utilizou ${selectedDayDetail.activeCount} de 10 cotas cheias admissíveis. Há ${selectedDayDetail.remaining} cotas cheias restantes disponíveis para as próximas missões.`}
                </p>
              </div>
            </div>

            {associatedMission && activeSelectedDateStr && (
              <div className="mt-4 pt-4 border-t border-zinc-200" id="daily-allowance-override-block">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 text-emerald-800" />
                  Ajustar Tipo de Alimentação para este Dia ({selectedDayDetail.formattedDate})
                </span>
                <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                  Altere a cota deste dia manualmente. Ao selecionar um tipo, as regras de degradação e limites automáticos serão substituídos para este dia de missão.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Automático (Auto)', value: 'AUTO', color: 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700' },
                    { label: 'Forçar N10 (R$ 135,00)', value: 'N10', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800' },
                    { label: 'Forçar N5 (R$ 67,50)', value: 'N5', color: 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-800' },
                    { label: 'Forçar N1 (R$ 13,50)', value: 'N1', color: 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800' },
                    { label: 'Zerar Alimentação', value: 'ZERO', color: 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950' },
                  ].map((opt) => {
                    const currentOverride = associatedMission.customAllowances?.[activeSelectedDateStr] || 
                      (associatedMission.zeroFoodDates?.includes(activeSelectedDateStr) ? 'ZERO' : 'AUTO');
                    
                    const isActive = currentOverride === opt.value;
                    
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const updatedCustomAllowances = { ...(associatedMission.customAllowances || {}) };
                          const updatedZeroFoodDates = [...(associatedMission.zeroFoodDates || [])];
                          
                          if (opt.value === 'AUTO') {
                            delete updatedCustomAllowances[activeSelectedDateStr];
                            const zeroIndex = updatedZeroFoodDates.indexOf(activeSelectedDateStr);
                            if (zeroIndex > -1) {
                              updatedZeroFoodDates.splice(zeroIndex, 1);
                            }
                          } else if (opt.value === 'ZERO') {
                            updatedCustomAllowances[activeSelectedDateStr] = 'ZERO';
                            if (!updatedZeroFoodDates.includes(activeSelectedDateStr)) {
                              updatedZeroFoodDates.push(activeSelectedDateStr);
                            }
                          } else {
                            updatedCustomAllowances[activeSelectedDateStr] = opt.value as 'N10' | 'N5' | 'N1';
                            const zeroIndex = updatedZeroFoodDates.indexOf(activeSelectedDateStr);
                            if (zeroIndex > -1) {
                              updatedZeroFoodDates.splice(zeroIndex, 1);
                            }
                          }
                          
                          onUpdateMission({
                            ...associatedMission,
                            customAllowances: updatedCustomAllowances,
                            zeroFoodDates: updatedZeroFoodDates
                          });
                        }}
                        className={`text-[11px] px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                          isActive 
                            ? 'ring-2 ring-emerald-800 bg-emerald-950 text-white border-emerald-950 scale-102 shadow-xs'
                            : opt.color
                        }`}
                        id={`override-btn-${opt.value}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2 text-[10.5px] text-zinc-450 text-zinc-500">
          <AlertCircle className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
          <span>
            Este calendário apresenta a ocupação retrospectiva de 30 dias contínuos. Clique nos dias para verificar o saldo de cotas acumuladas.
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
            {sortedCalculations.length === 0 && (
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
              const brutoManeuverPay = calc.maneuverPay / 0.7255;
              const irDeduction = brutoManeuverPay * 0.2745;

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
                            <span className="text-zinc-400">GRAT REP VI:</span>
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

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Received Status Button */}
                        <button
                          type="button"
                          onClick={() => onToggleReceived(calc.missionId)}
                          className={`w-[106px] py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all flex items-center justify-center gap-1 cursor-pointer border shadow-sm select-none shrink-0 ${
                            calc.received
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-650'
                              : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-650'
                          }`}
                          title={calc.received ? "Marcado como Recebido" : "Marcado como Pendente"}
                          id={`received-btn-${calc.missionId}`}
                        >
                          {calc.received ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                          {calc.received ? 'RECEBIDO' : 'NÃO RECEBIDO'}
                        </button>

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

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => onEditMission(calc.missionId)}
                            className="p-1.5 text-blue-600 hover:text-blue-900 border border-zinc-200 hover:border-blue-150 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="Editar missão"
                            id={`edit-btn-${calc.missionId}`}
                          >
                            <Pencil className="w-4 h-4" />
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
                                    {p.rate === 0 ? (
                                      <div className="flex flex-col items-end">
                                        <span className="text-[11px] text-amber-850 text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                                          Alimentação Zerada
                                        </span>
                                      </div>
                                    ) : isDegraded ? (
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
                                <span>Alimentação de Missão: {formatBRL(p.rate)} {p.rate === 0 && <span className="text-amber-800 font-bold font-sans not-italic ml-1">(Zerada pelo Usuário)</span>}</span>
                                <span>GRAT REP VI (Líquido -27,45% IR): {formatBRL(p.maneuverAllowance || 0)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-zinc-100 rounded-xl text-[10.5px] text-zinc-500 italic mt-2">
                        * O cálculo utiliza data de início e hora para alocar em períodos de 24h consecutivas. Se nas últimas 30 datas antes do processamento o militar exceder 10 cotas cheias de alimentação (N10/N5), o valor de alimentação é adjusted de R$ 135,00 para o valor residual de N1 (R$ 13,50) para proteger a quota, enquanto a GRAT REP VI (com desconto de 27,45% do imposto de renda) se mantém inalterada por dia de manobra.
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

      {/* Backup Section */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4" id="backup-container">
        <div className="text-left">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Backup dos Dados</h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Salve ou restaure seu histórico completo de missões e configurações de soldo localmente.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
          {/* Import Backup */}
          <button
            type="button"
            onClick={() => {
              const fileInput = document.getElementById('import-file-input');
              if (fileInput) fileInput.click();
            }}
            className="flex-1 sm:flex-none py-1.5 px-3 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            id="import-backup-btn"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500 rotate-180" />
            Importar Backup
          </button>
          
          <input
            type="file"
            id="import-file-input"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const content = event.target?.result as string;
                  const parsed = JSON.parse(content);
                  onImportBackup(parsed);
                  // Reset file input
                  e.target.value = '';
                } catch (err) {
                  alert('Erro ao importar arquivo. Certifique-se de carregar um arquivo JSON de backup válido.');
                }
              };
              reader.readAsText(file);
            }}
          />

          {/* Export Backup */}
          <button
            type="button"
            onClick={onExportBackup}
            className="flex-1 sm:flex-none py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            id="export-backup-btn"
          >
            <Download className="w-3.5 h-3.5 text-zinc-300" />
            Exportar Backup
          </button>
        </div>
      </div>
    </div>
  );
}
