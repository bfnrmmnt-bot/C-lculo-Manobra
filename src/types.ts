export interface Rank {
  id: string;
  name: string;
  soldo: number; // Base monthly salary
}

export const RANKS: Rank[] = [
  { id: 'suboficial', name: 'Suboficial', soldo: 6737.00 },
  { id: 'primeiro_sargento', name: 'Primeiro-Sargento', soldo: 5988.00 },
  { id: 'segundo_sargento', name: 'Segundo-Sargento', soldo: 5209.00 },
  { id: 'terceiro_sargento', name: 'Terceiro-Sargento', soldo: 4177.00 },
  { id: 'cabo', name: 'Cabo', soldo: 2869.00 },
  { id: 'marinheiro_soldado', name: 'Marinheiro / Soldado FN', soldo: 2103.00 }
];

export interface Mission {
  id: string;
  title: string;
  startDate: string; // ISO String (YYYY-MM-DDTHH:mm)
  endDate: string;   // ISO String (YYYY-MM-DDTHH:mm)
  description?: string;
  location?: string;
  rankId?: string; // Associated rank for this specific mission
}

export type PayType = 'N10' | 'N5' | 'N1';

export interface DailyPayment {
  dateString: string; // YYYY-MM-DD representing the day of the payment
  originalType: PayType; // What it should be based on duration
  assignedType: PayType; // What it is after applying the 30-day limit
  rate: number; // R$ value (135.00, 67.50, 13.50)
  missionId: string;
  missionTitle: string;
  rankId?: string; // Specific rank associated
  maneuverAllowance?: number; // 2% daily allowance based on rank base pay
  totalDayValue?: number; // rate (food) + maneuverAllowance
}

export interface MissionCalculation {
  missionId: string;
  title: string;
  startDate: string;
  endDate: string;
  durationHours: number;
  totalDays: number;
  payments: DailyPayment[];
  totalPay: number; // total combined of food + maneuver allowance
  foodPay: number; // food only amount
  maneuverPay: number; // 2% maneuver only amount
  description?: string;
  location?: string;
  rankId?: string;
  rankName?: string;
  soldoValue?: number;
}

export interface CalculationSummary {
  allPayments: DailyPayment[];
  missionCalculations: MissionCalculation[];
  totalEarnings: number; // combined
  totalFoodEarnings: number; // food only
  totalManeuverEarnings: number; // maneuvers only
  n10Count: number;
  n5Count: number;
  n1Count: number;
  limitedDaysCount: number; // For the last 30 days, or across all
}
