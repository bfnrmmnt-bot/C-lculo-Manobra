import React from 'react';
import { CalculationSummary } from '../types';
import { RATES } from '../utils/calculator';
import { DollarSign, Banknote, Award, CalendarDays, Percent } from 'lucide-react';

interface StatsDashboardProps {
  summary: CalculationSummary;
}

export default function StatsDashboard({ summary }: StatsDashboardProps) {
  const { totalEarnings, totalFoodEarnings, totalManeuverEarnings, n10Count, n5Count, n1Count, limitedDaysCount, missionCalculations, allPayments } = summary;

  // Formatting currency helper
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

  // Calculate date range for the last 30 days from the current date the app is used backwards
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 29);

  const formatDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateToDDMM = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const todayStr = formatDateStr(today);
  const thirtyDaysAgoStr = formatDateStr(thirtyDaysAgo);

  const formattedToday = formatDateToDDMM(todayStr);
  const formattedThirtyAgo = formatDateToDDMM(thirtyDaysAgoStr);

  // Filter payments to only include the last 30 days starting from today backwards
  const last30DaysPayments = allPayments.filter(
    (p) => p.dateString >= thirtyDaysAgoStr && p.dateString <= todayStr
  );

  const n10Count30 = last30DaysPayments.filter((p) => p.assignedType === 'N10' && p.rate > 0).length;
  const n5Count30 = last30DaysPayments.filter((p) => p.assignedType === 'N5' && p.rate > 0).length;
  const n1Count30 = last30DaysPayments.filter((p) => p.assignedType === 'N1' && p.rate > 0).length;

  const n10Total = last30DaysPayments.filter(p => p.assignedType === 'N10' && p.rate > 0).reduce((sum, p) => sum + p.rate, 0);
  const n5Total = last30DaysPayments.filter(p => p.assignedType === 'N5' && p.rate > 0).reduce((sum, p) => sum + p.rate, 0);
  const n1Total = last30DaysPayments.filter(p => p.assignedType === 'N1' && p.rate > 0).reduce((sum, p) => sum + p.rate, 0);

  const limitedDaysCount30 = last30DaysPayments.filter((p) => p.originalType !== p.assignedType && p.rate > 0).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" id="stats-container">
      {/* Total Earnings Card */}
      <div className="lg:col-span-4 bg-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-emerald-900 transition-all hover:shadow-md flex flex-col justify-between" id="stat-total-card">
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
            <span className="text-emerald-300">GRAT REP OP (-27,45% IR):</span>
            <span className="font-mono font-semibold text-amber-400">{formatBRL(totalManeuverEarnings)}</span>
          </div>
        </div>
      </div>

      {/* Unified Quotas Detail Card */}
      <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between" id="stat-detailed-allowances-card">
        <div className="flex flex-col h-full justify-between gap-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Distribuição das Cotas de Alimentação
              </h4>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Últimos 30 dias ({formattedThirtyAgo} a {formattedToday})
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-150 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    <th className="py-2 font-semibold">Cota</th>
                    <th className="py-2 font-semibold text-center">Dias</th>
                    <th className="py-2 font-semibold text-right">Valor Unitário</th>
                    <th className="py-2 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  <tr className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 block" />
                      <span className="font-bold text-zinc-800">N10</span>
                      <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Cota Cheia)</span>
                    </td>
                    <td className="py-3 text-center font-mono text-zinc-900 font-bold">{n10Count30} {n10Count30 === 1 ? 'dia' : 'dias'}</td>
                    <td className="py-3 text-right font-mono text-zinc-500">{formatBRL(RATES.N10)}</td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-800">{formatBRL(n10Total)}</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-sky-500 block" />
                      <span className="font-bold text-zinc-800">N5</span>
                      <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Meia Cota)</span>
                    </td>
                    <td className="py-3 text-center font-mono text-zinc-900 font-bold">{n5Count30} {n5Count30 === 1 ? 'dia' : 'dias'}</td>
                    <td className="py-3 text-right font-mono text-zinc-500">{formatBRL(RATES.N5)}</td>
                    <td className="py-3 text-right font-mono font-bold text-sky-800">{formatBRL(n5Total)}</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500 block" />
                      <span className="font-bold text-zinc-800">N1</span>
                      <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Fração / Degradada)</span>
                    </td>
                    <td className="py-3 text-center font-mono text-zinc-900 font-bold">{n1Count30} {n1Count30 === 1 ? 'dia' : 'dias'}</td>
                    <td className="py-3 text-right font-mono text-zinc-500">{formatBRL(RATES.N1)}</td>
                    <td className="py-3 text-right font-mono font-bold text-rose-800">{formatBRL(n1Total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
