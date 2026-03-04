import { Employee, Schedule, Shift, SolverSettings, TOTAL_SLOTS, SHIFT_LENGTH_SLOTS, DAYS, START_HOUR, MIN_SHIFT_LENGTH_SLOTS } from '../types';

// Helper per ottenere il tipo di turno basato sullo slot di inizio
export function getShiftType(startSlot: number): 'Morning' | 'Intermediate' | 'Evening' {
  if (startSlot < 3) return 'Morning'; // Inizio 09:00 - 12:00
  if (startSlot < 6) return 'Intermediate'; // Inizio 12:00 - 15:00
  return 'Evening'; // Inizio 15:00+
}

export function generateSchedule(settings: SolverSettings): Schedule {
  let bestSchedule: Schedule | null = null;
  let bestUncovered = 999999;
  let bestWorkloadVariance = 999999;

  // Monte Carlo approach: run 100 times and pick the best schedule
  for (let iteration = 0; iteration < 100; iteration++) {
    const schedule = generateSingleSchedule(settings);
    
    let uncovered = 0;
    for (let d = 0; d < 7; d++) {
      for (let s = 0; s < TOTAL_SLOTS; s++) {
        if (schedule.coverage[d][s] < settings.minCoverage) {
          uncovered += (settings.minCoverage - schedule.coverage[d][s]);
        }
      }
    }

    const workloads = settings.employees.map(emp => {
      return schedule.shifts.filter(s => s.employeeId === emp.id).reduce((sum, s) => sum + s.length, 0);
    });
    const avgWorkload = workloads.reduce((a, b) => a + b, 0) / workloads.length;
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w - avgWorkload, 2), 0);

    if (uncovered < bestUncovered || (uncovered === bestUncovered && variance < bestWorkloadVariance)) {
      bestUncovered = uncovered;
      bestWorkloadVariance = variance;
      bestSchedule = schedule;
    }
  }

  return bestSchedule!;
}

function generateSingleSchedule(settings: SolverSettings): Schedule {
  const { employees, minCoverage, maxCoverage, allowOvertime } = settings;
  
  const schedule: Schedule = {
    shifts: [],
    coverage: Array(7).fill(0).map(() => Array(TOTAL_SLOTS).fill(0))
  };

  const equityTracker: Record<string, Record<string, number>> = {};
  const workloadTracker: Record<string, number> = {};

  employees.forEach(e => {
    equityTracker[e.id] = { Morning: 0, Intermediate: 0, Evening: 0 };
    workloadTracker[e.id] = 0;
  });

  const addShift = (dayIdx: number, startSlot: number, length: number) => {
    for (let i = 0; i < length; i++) {
      schedule.coverage[dayIdx][startSlot + i]++;
    }
  };

  function calculateScore(dayIdx: number, startSlot: number, length: number, empId: string): number {
    let score = 0;

    let firstGap = -1;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (schedule.coverage[dayIdx][i] < minCoverage) {
        firstGap = i;
        break;
      }
    }

    if (firstGap !== -1) {
       if (startSlot > firstGap) {
          score -= 10000;
       }
       if (startSlot <= firstGap && startSlot + length > firstGap) {
          score += 5000;
          if (startSlot === firstGap) {
             score += 2000;
          }
       }
    }

    let fillsGap = false;
    let minLevelInShift = 999;
    
    for (let i = 0; i < length; i++) {
      const currentLevel = schedule.coverage[dayIdx][startSlot + i];
      if (currentLevel < minLevelInShift) minLevelInShift = currentLevel;
      if (currentLevel < minCoverage) {
        fillsGap = true;
      }
    }

    if (fillsGap) score += 1000;
    score -= minLevelInShift * 100; 
    score += length * 10; // Prefer longer shifts

    const type = getShiftType(startSlot);
    const currentCount = equityTracker[empId][type];
    score -= currentCount * 50;

    if (dayIdx > 0) {
      const prevShift = schedule.shifts.find(s => s.employeeId === empId && s.dayIndex === dayIdx - 1);
      if (prevShift) {
        const prevEnd = prevShift.startSlot + prevShift.length;
        const gap = (TOTAL_SLOTS - prevEnd) + startSlot;
        score += gap;
      }
    }

    // Check if this shift leaves a small gap at the end of the day
    const endSlot = startSlot + length;
    const remainingSlots = TOTAL_SLOTS - endSlot;
    if (remainingSlots > 0 && remainingSlots < MIN_SHIFT_LENGTH_SLOTS) {
      score -= 5000; // Heavy penalty for leaving unfillable gap at end
    }
    
    // Bonus for ending exactly at the end of the day
    if (remainingSlots === 0) {
      score += 2000;
    }

    return score;
  }

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const dailyEmployees = [...employees].sort((a, b) => {
      const noiseA = Math.random() * 4;
      const noiseB = Math.random() * 4;
      return (workloadTracker[a.id] + noiseA) - (workloadTracker[b.id] + noiseB);
    });
    
    for (const emp of dailyEmployees) {
      if (emp.unavailableDays && emp.unavailableDays.includes(dayIdx)) {
        continue;
      }

      let bestStart = -1;
      let bestLength = -1;
      let bestScore = -999999;

      for (let start = 0; start <= TOTAL_SLOTS - MIN_SHIFT_LENGTH_SLOTS; start++) {
        let maxLen = 0;
        for (let l = 1; l <= SHIFT_LENGTH_SLOTS; l++) {
          if (start + l > TOTAL_SLOTS) break;
          if (emp.unavailableSlots && emp.unavailableSlots[dayIdx] && emp.unavailableSlots[dayIdx].includes(start + l - 1)) {
            break;
          }
          if (schedule.coverage[dayIdx][start + l - 1] >= maxCoverage) {
            break;
          }
          maxLen = l;
        }

        if (maxLen >= MIN_SHIFT_LENGTH_SLOTS) {
          let validRest = true;
          if (dayIdx > 0) {
            const prevShifts = schedule.shifts.filter(s => s.employeeId === emp.id && s.dayIndex === dayIdx - 1);
            if (prevShifts.length > 0) {
              const prevShift = prevShifts[prevShifts.length - 1];
              const prevEndHour = START_HOUR + (prevShift.startSlot + prevShift.length);
              const currentStartHour = START_HOUR + start;
              const restHours = (24 - prevEndHour) + currentStartHour;
              if (restHours < 11) validRest = false;
            }
          }

          if (validRest) {
            for (let l = maxLen; l >= MIN_SHIFT_LENGTH_SLOTS; l--) {
              const score = calculateScore(dayIdx, start, l, emp.id);
              if (score > bestScore) {
                bestScore = score;
                bestStart = start;
                bestLength = l;
              }
            }
          }
        }
      }

      if (bestStart !== -1) {
        schedule.shifts.push({
          employeeId: emp.id,
          dayIndex: dayIdx,
          startSlot: bestStart,
          length: bestLength
        });
        addShift(dayIdx, bestStart, bestLength);
        equityTracker[emp.id][getShiftType(bestStart)]++;
        workloadTracker[emp.id] += bestLength;
      }
    }

    if (allowOvertime) {
      for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
        if (schedule.coverage[dayIdx][slot] < minCoverage) {
          const activeShifts = schedule.shifts.filter(s => 
            s.dayIndex === dayIdx && 
            (s.startSlot + s.length === slot || s.startSlot - 1 === slot)
          );

          for (const shift of activeShifts) {
            const emp = employees.find(e => e.id === shift.employeeId)!;
            if (emp.unavailableSlots && emp.unavailableSlots[dayIdx] && emp.unavailableSlots[dayIdx].includes(slot)) {
              continue;
            }

            if (shift.startSlot - 1 === slot) {
              if (schedule.coverage[dayIdx][slot] < maxCoverage) {
                shift.startSlot--;
                shift.length++;
                addShift(dayIdx, slot, 1);
                workloadTracker[shift.employeeId]++;
                break;
              }
            }
            if (shift.startSlot + shift.length === slot) {
              if (schedule.coverage[dayIdx][slot] < maxCoverage) {
                shift.length++;
                addShift(dayIdx, slot, 1);
                workloadTracker[shift.employeeId]++;
                break;
              }
            }
          }
        }
      }
    }
  }

  return schedule;
}
