export type ShiftType = 'Morning' | 'Intermediate' | 'Evening' | 'Off';

export interface Employee {
  id: string;
  name: string;
  unavailableDays: number[]; // 0-6 (Mon-Sun) - kept for quick full-day toggle
  unavailableSlots: Record<number, number[]>; // dayIndex -> array of unavailable slot indices (0-11)
}

export interface Shift {
  employeeId: string;
  dayIndex: number; // 0-6 (Mon-Sun)
  startSlot: number; // 0-23 (30 min slots starting at 10:00)
  length: number; // number of slots (8 slots = 4 hours)
}

export interface Schedule {
  shifts: Shift[];
  coverage: number[][]; // [day][slot] = count
}

export interface SolverSettings {
  minCoverage: number;
  maxCoverage: number;
  allowOvertime: boolean;
  employees: Employee[];
  operatingHoursStart: number; // 10
  operatingHoursEnd: number; // 22
  shiftDurationHours: number; // 4
}

export const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const SLOTS_PER_HOUR = 1;
export const START_HOUR = 9;
export const END_HOUR = 22;
export const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR; // 13 slots
export const SHIFT_LENGTH_SLOTS = 4 * SLOTS_PER_HOUR; // 4 slots
export const MIN_SHIFT_LENGTH_SLOTS = 2 * SLOTS_PER_HOUR; // 2 slots
