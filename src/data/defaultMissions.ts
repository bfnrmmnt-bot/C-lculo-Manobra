import { Mission } from '../types';

// Let's set the prefilled missions relative to the current year 2026 so it looks dynamic and freshly loaded.
// Current year is 2026 as per metadata.
export const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'Patrulhamento Costeiro de Rotina',
    startDate: '2026-05-01T08:00',
    endDate: '2026-05-01T13:00', // 5 hours -> under 8 hours -> Should get 1x N1 (R$ 13.50)
    description: 'Patrulha marítima preventiva de rotina ao longo da Baía de Guanabara.',
    location: 'Rio de Janeiro - RJ',
  },
  {
    id: 'm2',
    title: 'Instrução do Tiro de Guerra',
    startDate: '2026-05-04T07:00',
    endDate: '2026-05-04T19:00', // 12 hours -> between 8h and 24h -> Should get 1x N5 (R$ 67.50)
    description: 'Apoio e treinamento técnico de tiro prático aos atiradores da corporação.',
    location: 'Niterói - RJ',
  },
  {
    id: 'm3',
    title: 'Operação Aliança - Fase I',
    startDate: '2026-05-08T08:00',
    endDate: '2026-05-11T08:00', // exactly 72 hours -> 3 days -> Should get 3x N10 (R$ 135.00 each)
    description: 'Exercício tático conjunto de simulação de defesa cibernética e comunicações de campanha.',
    location: 'Brasília - DF',
  },
  {
    id: 'm4',
    title: 'Missão Sentinela Avançada',
    startDate: '2026-05-15T08:00',
    endDate: '2026-05-30T08:00', // exactly 15 days -> 360 hours -> Should get 10x N10, and remaining 5x N1 (limit of 10 daily pays achieved)
    description: 'Operação de fronteira em ambiente de selva com acampamento tático avançado. Demonstração prática do teto de diárias no ciclo de 30 dias.',
    location: 'Tabatinga - AM',
  },
  {
    id: 'm5',
    title: 'Faturamento de Material Escolar',
    startDate: '2026-06-04T06:00',
    endDate: '2026-06-10T14:00', // 6 days + 8 hours remainder -> 6x N10 + 1x N5 diária residual!
    description: 'Missão especial de transporte de faturas e suprimentos. Demonstrativo de frações residuais de escala (6 dias completos de 24h pagam N10 e as 8h adicionais remanescentes pagam N5).',
    location: 'Rio de Janeiro - RJ',
  },
];
