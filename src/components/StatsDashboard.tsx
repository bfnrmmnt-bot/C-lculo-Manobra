import React from 'react';
import { CalculationSummary } from '../types';
import { RATES } from '../utils/calculator';
import { DollarSign, ShieldAlert, Award, CalendarDays, Percent } from 'lucide-react';

interface StatsDashboardProps {
  summary: CalculationSummary;
}

export default function StatsDashboard({ summary }: StatsDashboardProps) {
  const { totalEarnings, totalFoodEarnings, totalManeuverEarnings, n10Count, n5Count, n1Count, limitedDaysCount, missionCalculations } = summary;

  // Formatting currency helper
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-container">
      {/* Total Earnings Card */}
      <div className="bg-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-emerald-900 transition-all hover:shadow-md flex flex-col justify-between" id="stat-total-card">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-350 text-xs font-semibold uppercase tracking-wider">Rendimento Acumulado</p>
            <h3 className="text-3xl font-bold tracking-tight mt-1 font-mono">{formatBRL(totalEarnings)}</h3>
          </div>
          <div className="p-3 bg-emerald-900/60 rounded-xl text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-emerald-900 text-[11px] text-emerald-250 flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-emerald-300">Cotas Alimentação:</span>
            <span className="font-mono font-semibold text-emerald-50">{formatBRL(totalFoodEarnings)}</span>
          </div>
          <div className="flex justify-between border-t border-emerald-900/65 pt-1">
            <span className="text-emerald-300">GRAT REP VI (-27,5% IR):</span>
            <span className="font-mono font-semibold text-amber-400">{formatBRL(totalManeuverEarnings)}</span>
          </div>
        </div>
      </div>

      {/* Quotas / Premium Days Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between" id="stat-premium-card">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Cotas N10 Pagas</p>
            <h3 className="text-3xl font-bold text-zinc-900 mt-1 font-mono">
              {n10Count} <span className="text-xs text-zinc-400 font-normal">dias</span>
            </h3>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center text-xs text-zinc-500">
          <span>Máximo {RATES.N10}/dia de alimentação</span>
          <span className="font-semibold text-emerald-700 font-mono">{formatBRL(n10Count * RATES.N10)}</span>
        </div>
      </div>

      {/* Partial / N5 count card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between" id="stat-n5-card">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Cotas N5 Pagas</p>
            <h3 className="text-3xl font-bold text-zinc-900 mt-1 font-mono">
              {n5Count} <span className="text-xs text-zinc-400 font-normal">dias</span>
            </h3>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <Percent className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center text-xs text-zinc-500">
          <span>Frações {RATES.N5}/dia de alimentação</span>
          <span className="font-semibold text-sky-700 font-mono">{formatBRL(n5Count * RATES.N5)}</span>
        </div>
      </div>

      {/* Capped / Degraded Days count card */}
      <div className={`rounded-2xl p-6 shadow-xs flex flex-col justify-between border transition-all ${
        limitedDaysCount > 0 
          ? 'bg-rose-50/50 border-rose-200 text-rose-900' 
          : 'bg-zinc-50/50 border-zinc-200 text-zinc-900'
      }`} id="stat-degraded-card">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Atingiram Limite (Teto)</p>
            <h3 className="text-3xl font-bold mt-1 font-mono">
              {limitedDaysCount} <span className="text-xs text-zinc-400 font-normal">dias</span>
            </h3>
          </div>
          <div className={`p-3 rounded-xl ${limitedDaysCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-zinc-100 text-zinc-600'}`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-150 flex justify-between items-center text-xs text-zinc-500">
          <span>Degradados para N1 ({formatBRL(RATES.N1)})</span>
          {limitedDaysCount > 0 && (
            <span className="text-rose-600 font-semibold font-mono">Poupou quota residual!</span>
          )}
        </div>
      </div>
    </div>
  );
}
