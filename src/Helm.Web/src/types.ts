export type ProjectionMode = 'Weekly' | 'Yearly';

export interface ProjectionRow {
  periodNumber: number;
  startingBalance: number;
  contribution: number;
  periodIncome: number;
  endingBalance: number;
}

export interface ProjectionRequest {
  weeklyRate: number;
  startingBalance: number;
  weeklyContribution: number;
  mode: ProjectionMode;
}

export interface ProjectionResponse {
  mode: ProjectionMode;
  rows: ProjectionRow[];
}
