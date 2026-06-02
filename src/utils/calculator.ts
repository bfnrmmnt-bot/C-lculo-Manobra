import { Mission, DailyPayment, MissionCalculation, CalculationSummary, PayType, RANKS, Rank } from '../types';

// Constants for the daily pay rates in Brazilian Reais (R$)
export const RATES = {
  N10: 135.00,
  N5: 67.50,
  N1: 13.50,
};

/**
 * Calculates local YYYY-MM-DD from a Date object
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a local Date object
 */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Generates an array of date strings between start and end (inclusive)
 */
export function getDatesInRange(startDate: Date, days: number): string[] {
  const dates: string[] = [];
  const current = new Date(startDate.getTime());
  for (let i = 0; i < days; i++) {
    dates.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Core pay calculator engine.
 * Processes all missions, spreads them chronologically, applies the sliding 30-day limits,
 * and compiles stats and granular logs, including the 2% daily maneuver allowance based on rank.
 */
export function calculatePay(missions: Mission[], defaultUserRankId: string = 'terceiro_sargento'): CalculationSummary {
  // Sort missions chronologically by start date
  const sortedMissions = [...missions].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Step 1: Expand each mission into "candidate payments" with its original planned category
  interface Candidate {
    dateString: string;
    originalType: PayType;
    missionId: string;
    missionTitle: string;
    rankId: string;
  }

  const allCandidates: Candidate[] = [];

  sortedMissions.forEach((mission) => {
    const startObj = new Date(mission.startDate);
    const endObj = new Date(mission.endDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    
    // Duration in hours
    const durationHours = diffMs / (1000 * 60 * 60);
    
    if (durationHours <= 0) return; // Ignore invalid missions

    const activeRankId = mission.rankId || defaultUserRankId;

    if (durationHours < 8) {
      // Receives N1 pay (less than 8 hours) on the start date
      allCandidates.push({
        dateString: formatDateString(startObj),
        originalType: 'N1',
        missionId: mission.id,
        missionTitle: mission.title,
        rankId: activeRankId,
      });
    } else if (durationHours >= 8 && durationHours < 24) {
      // Receives N5 pay (between 8 and 24 hours) on the start date
      allCandidates.push({
        dateString: formatDateString(startObj),
        originalType: 'N5',
        missionId: mission.id,
        missionTitle: mission.title,
        rankId: activeRankId,
      });
    } else {
      // Receives N10 pay for full 24-hour blocks
      // For any remaining residual hours (< 24h), receives N5 (if >= 8h) or N1 (if < 8h)
      const fullBlocks = Math.floor(durationHours / 24);
      const residualHours = durationHours % 24;
      const totalDays = fullBlocks + (residualHours > 0 ? 1 : 0);
      const dates = getDatesInRange(startObj, totalDays);
      
      dates.forEach((dateStr, index) => {
        let originalType: PayType = 'N10';
        
        if (index === fullBlocks) {
          // This is the residual day
          if (residualHours < 8) {
            originalType = 'N1';
          } else {
            originalType = 'N5';
          }
        }

        allCandidates.push({
          dateString: dateStr,
          originalType,
          missionId: mission.id,
          missionTitle: mission.title,
          rankId: activeRankId,
        });
      });
    }
  });

  // Step 2: Sort all candidates strictly chronologically by date
  allCandidates.sort((a, b) => a.dateString.localeCompare(b.dateString));

  // Step 3: Process candidates one by one, keeping track of committed daily payments
  const committedPayments: DailyPayment[] = [];

  allCandidates.forEach((candidate) => {
    const candDateObj = parseDateOnly(candidate.dateString);
    const rank = RANKS.find(r => r.id === candidate.rankId) || RANKS.find(r => r.id === 'terceiro_sargento')!;
    const maneuverAllowance = rank.soldo * 0.02 * 0.725; // 2% base pay discounted by 27.5% Income Tax (IR)
    
    if (candidate.originalType === 'N1') {
      // N1 is never capped, so it's directly assigned N1
      committedPayments.push({
        dateString: candidate.dateString,
        originalType: 'N1',
        assignedType: 'N1',
        rate: RATES.N1,
        missionId: candidate.missionId,
        missionTitle: candidate.missionTitle,
        rankId: candidate.rankId,
        maneuverAllowance,
        totalDayValue: RATES.N1 + maneuverAllowance,
      });
      return;
    }

    // Checking the sliding window: previous 30 days (from candidate date - 29 to candidate date)
    const thirtyDaysAgoDate = new Date(candDateObj.getTime());
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 29);
    const thirtyDaysAgoStr = formatDateString(thirtyDaysAgoDate);

    // Sum of N10 and N5 payments already allocated in that 30-day window
    const activePremiumCount = committedPayments.filter((payment) => {
      const isInWindow = payment.dateString >= thirtyDaysAgoStr && payment.dateString <= candidate.dateString;
      const isPremium = payment.assignedType === 'N10' || payment.assignedType === 'N5';
      return isInWindow && isPremium;
    }).length;

    let assignedType: PayType = candidate.originalType;
    if (activePremiumCount >= 10) {
      assignedType = 'N1';
    }

    const rate = RATES[assignedType];

    committedPayments.push({
      dateString: candidate.dateString,
      originalType: candidate.originalType,
      assignedType: assignedType,
      rate,
      missionId: candidate.missionId,
      missionTitle: candidate.missionTitle,
      rankId: candidate.rankId,
      maneuverAllowance,
      totalDayValue: rate + maneuverAllowance,
    });
  });

  // Step 4: Re-group sorted payments into individual mission calculations
  const missionCalculations: MissionCalculation[] = sortedMissions.map((mission) => {
    const startObj = new Date(mission.startDate);
    const endObj = new Date(mission.endDate);
    const diffMs = endObj.getTime() - startObj.getTime();
    const durationHours = Math.max(0, diffMs / (1000 * 60 * 60));
    
    // Find all payments that belong to this mission
    const paymentsForMission = committedPayments.filter((p) => p.missionId === mission.id);
    const totalDays = paymentsForMission.length;
    
    const foodPay = paymentsForMission.reduce((sum, p) => sum + p.rate, 0);
    const maneuverPay = paymentsForMission.reduce((sum, p) => sum + (p.maneuverAllowance || 0), 0);
    const totalPay = foodPay + maneuverPay;

    const activeRankId = mission.rankId || defaultUserRankId;
    const rankObj = RANKS.find(r => r.id === activeRankId) || RANKS.find(r => r.id === 'terceiro_sargento')!;

    return {
      missionId: mission.id,
      title: mission.title,
      startDate: mission.startDate,
      endDate: mission.endDate,
      durationHours,
      totalDays,
      payments: paymentsForMission,
      totalPay,
      foodPay,
      maneuverPay,
      description: mission.description,
      location: mission.location,
      rankId: activeRankId,
      rankName: rankObj.name,
      soldoValue: rankObj.soldo,
    };
  });

  // Calculate totals
  const totalFoodEarnings = committedPayments.reduce((sum, p) => sum + p.rate, 0);
  const totalManeuverEarnings = committedPayments.reduce((sum, p) => sum + (p.maneuverAllowance || 0), 0);
  const totalEarnings = totalFoodEarnings + totalManeuverEarnings;

  const n10Count = committedPayments.filter((p) => p.assignedType === 'N10').length;
  const n5Count = committedPayments.filter((p) => p.assignedType === 'N5').length;
  const n1Count = committedPayments.filter((p) => p.assignedType === 'N1').length;
  const limitedDaysCount = committedPayments.filter((p) => p.originalType !== p.assignedType).length;

  return {
    allPayments: committedPayments,
    missionCalculations,
    totalEarnings,
    totalFoodEarnings,
    totalManeuverEarnings,
    n10Count,
    n5Count,
    n1Count,
    limitedDaysCount,
  };
}

/**
 * Calculates the active count of N10 + N5 payments in the last 30 days from a specific reference date
 */
export function getActiveQuotaAtDate(payments: DailyPayment[], refDateStr: string): { activeCount: number; remaining: number } {
  const refDate = parseDateOnly(refDateStr);
  const thirtyDaysAgoDate = new Date(refDate.getTime());
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 29);
  const thirtyDaysAgoStr = formatDateString(thirtyDaysAgoDate);

  const activeCount = payments.filter((p) => {
    const isInWindow = p.dateString >= thirtyDaysAgoStr && p.dateString <= refDateStr;
    const isPremium = p.assignedType === 'N10' || p.assignedType === 'N5';
    return isInWindow && isPremium;
  }).length;

  return {
    activeCount,
    remaining: Math.max(0, 10 - activeCount),
  };
}

/**
 * Suggests or simulates a future mission to analyze its financial eligibility
 */
export function simulateProposedMission(
  currentMissions: Mission[],
  startDateStr: string,
  endDateStr: string,
  defaultUserRankId: string = 'terceiro_sargento'
): {
  durationHours: number;
  totalDays: number;
  plannedPayments: { dateString: string; originalType: PayType; finalType: PayType; rate: number; maneuverAllowance: number; totalDayValue: number }[];
  estimatedTotal: number;
  estimatedFoodTotal: number;
  estimatedManeuverTotal: number;
  remainingQuotaAtStart: number;
} {
  const tempMission: Mission = {
    id: 'temp-simulation',
    title: 'Simulação',
    startDate: startDateStr,
    endDate: endDateStr,
    rankId: defaultUserRankId,
  };

  const simulatedSummary = calculatePay([...currentMissions, tempMission], defaultUserRankId);
  
  // Find the simulated payments for this temp mission
  const tempResult = simulatedSummary.missionCalculations.find((m) => m.missionId === 'temp-simulation');
  
  const originalPaymentsBeforeSim = calculatePay(currentMissions, defaultUserRankId).allPayments;
  const { remaining } = getActiveQuotaAtDate(originalPaymentsBeforeSim, formatDateString(new Date(startDateStr)));

  if (!tempResult) {
    return {
      durationHours: 0,
      totalDays: 0,
      plannedPayments: [],
      estimatedTotal: 0,
      estimatedFoodTotal: 0,
      estimatedManeuverTotal: 0,
      remainingQuotaAtStart: remaining,
    };
  }

  return {
    durationHours: tempResult.durationHours,
    totalDays: tempResult.totalDays,
    plannedPayments: tempResult.payments.map((p) => ({
      dateString: p.dateString,
      originalType: p.originalType,
      finalType: p.assignedType,
      rate: p.rate,
      maneuverAllowance: p.maneuverAllowance || 0,
      totalDayValue: p.totalDayValue || 0,
    })),
    estimatedTotal: tempResult.totalPay,
    estimatedFoodTotal: tempResult.foodPay,
    estimatedManeuverTotal: tempResult.maneuverPay,
    remainingQuotaAtStart: remaining,
  };
}
