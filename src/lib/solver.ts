import { Employee, Schedule, Shift, SolverSettings, TOTAL_SLOTS, SHIFT_LENGTH_SLOTS, DAYS, START_HOUR } from '../types';

// Helper per ottenere il tipo di turno basato sullo slot di inizio
export function getShiftType(startSlot: number): 'Morning' | 'Intermediate' | 'Evening' {
  if (startSlot < 2) return 'Morning'; // Inizio 10:00 - 12:00
  if (startSlot < 5) return 'Intermediate'; // Inizio 12:00 - 15:00
  return 'Evening'; // Inizio 15:00+
}

export function generateSchedule(settings: SolverSettings): Schedule {
  const { employees, minCoverage, maxCoverage, allowOvertime } = settings;
  const shifts: Shift[] = [];
  const coverage: number[][] = Array(7).fill(0).map(() => Array(TOTAL_SLOTS).fill(0));
  
  // Tracciamento dei turni per equità: [employeeId][type] = conteggio
  const equityTracker: Record<string, Record<string, number>> = {};
  // Tracciamento del carico di lavoro totale (slot assegnati) per garantire equità
  const workloadTracker: Record<string, number> = {};

  employees.forEach(e => {
    equityTracker[e.id] = { Morning: 0, Intermediate: 0, Evening: 0 };
    workloadTracker[e.id] = 0;
  });

  // Helper per aggiungere un turno alla copertura
  const addShift = (dayIdx: number, startSlot: number, length: number = SHIFT_LENGTH_SLOTS) => {
    for (let i = 0; i < length; i++) {
      coverage[dayIdx][startSlot + i]++;
    }
  };

  // Generiamo la pianificazione giorno per giorno
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    // Ordiniamo i dipendenti in base al carico di lavoro (chi ha lavorato meno ha priorità)
    // Usiamo un fattore casuale per rompere le parità ed evitare pattern ripetitivi
    const dailyEmployees = [...employees].sort((a, b) => {
      const workA = workloadTracker[a.id];
      const workB = workloadTracker[b.id];
      if (workA !== workB) return workA - workB; // Priorità a chi ha meno ore
      return Math.random() - 0.5; // Random per parità
    });
    
    // 1. Assegnazione Standard (4 ore)
    for (const emp of dailyEmployees) {
      // Check unavailability
      if (emp.unavailableDays && emp.unavailableDays.includes(dayIdx)) {
        continue;
      }

      // Troviamo gli slot di inizio validi (da 0 a TOTAL_SLOTS - SHIFT_LENGTH_SLOTS)
      // Vogliamo scegliere uno slot che aiuti la copertura E bilanci l'equità
      
      const possibleStarts = [];
      for (let s = 0; s <= TOTAL_SLOTS - SHIFT_LENGTH_SLOTS; s++) {
        possibleStarts.push(s);
      }

      // Filter possible starts to enforce MAX coverage
      const validStarts = possibleStarts.filter(start => {
        // Hard Constraint: Unavailable Slots
        if (emp.unavailableSlots && emp.unavailableSlots[dayIdx]) {
          const unavailable = emp.unavailableSlots[dayIdx];
          for (let i = 0; i < SHIFT_LENGTH_SLOTS; i++) {
            if (unavailable.includes(start + i)) {
              return false; // Shift overlaps with unavailable slot
            }
          }
        }

        // Hard Constraint: 11h Rest Rule
        // Check previous day's shift
        if (dayIdx > 0) {
          const prevShift = shifts.find(s => s.employeeId === emp.id && s.dayIndex === dayIdx - 1);
          if (prevShift) {
            const prevEndHour = START_HOUR + (prevShift.startSlot + prevShift.length); // e.g., 22
            const currentStartHour = START_HOUR + start; // e.g., 10
            const restHours = (24 - prevEndHour) + currentStartHour;
            
            if (restHours < 11) {
              return false; // Violates 11h rest rule
            }
          }
        }

        for (let i = 0; i < SHIFT_LENGTH_SLOTS; i++) {
          if (coverage[dayIdx][start + i] >= maxCoverage) return false; 
        }
        return true;
      });

      if (validStarts.length === 0) {
        continue;
      }

      // Ordiniamo i possibili inizi in base a un punteggio
      validStarts.sort((a, b) => {
        const scoreA = calculateScore(dayIdx, a, emp.id);
        const scoreB = calculateScore(dayIdx, b, emp.id);
        return scoreB - scoreA;
      });

      const bestStart = validStarts[0];
      
      // If the best start has a very low score (meaning it probably leaves a gap), 
      // and we still have critical gaps, maybe we shouldn't assign this employee yet?
      // But for now, let's just assign.
      
      shifts.push({
        employeeId: emp.id,
        dayIndex: dayIdx,
        startSlot: bestStart,
        length: SHIFT_LENGTH_SLOTS
      });
      
      addShift(dayIdx, bestStart);
      equityTracker[emp.id][getShiftType(bestStart)]++;
      workloadTracker[emp.id] += SHIFT_LENGTH_SLOTS;
    }

    // 2. Gestione Overtime (se abilitato e ci sono buchi)
    if (allowOvertime) {
      // Identifica slot sotto copertura minima
      for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
        if (coverage[dayIdx][slot] < minCoverage) {
          // Troviamo un dipendente che può coprire questo slot
          // Preferibilmente estendendo un turno esistente
          
          // Cerca tra chi lavora già oggi
          const workingShifts = shifts.filter(s => s.dayIndex === dayIdx);
          let covered = false;

          // Prova ad estendere turni esistenti
          for (const shift of workingShifts) {
            // Controlla se possiamo estendere all'indietro (shift.startSlot - 1 == slot)
            if (shift.startSlot - 1 === slot) {
              if (coverage[dayIdx][slot] < maxCoverage) {
                shift.startSlot--;
                shift.length++;
                addShift(dayIdx, slot, 1);
                workloadTracker[shift.employeeId]++; // Aggiorna carico lavoro
                covered = true;
                break;
              }
            }
            // Controlla se possiamo estendere in avanti (shift.startSlot + shift.length == slot)
            if (shift.startSlot + shift.length === slot) {
              if (coverage[dayIdx][slot] < maxCoverage) {
                shift.length++;
                addShift(dayIdx, slot, 1);
                workloadTracker[shift.employeeId]++; // Aggiorna carico lavoro
                covered = true;
                break;
              }
            }
          }

          // Se non siamo riusciti ad estendere, proviamo ad assegnare a chi non lavora (nuovo turno breve? o turno extra?)
          // Per semplicità, in questa euristica ci limitiamo ad estendere i turni esistenti per mantenere la "continuità".
          // Se nessuno lavora adiacente, il buco rimane (o richiederebbe logica più complessa di creazione nuovo turno).
        }
      }
    }
  }

  return { shifts, coverage };

  function calculateScore(dayIdx: number, startSlot: number, empId: string): number {
    let score = 0;

    // 0. CRITICAL: Fill the earliest gap first (Sequential Filling)
    let firstGap = -1;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (coverage[dayIdx][i] < minCoverage) {
        firstGap = i;
        break;
      }
    }

    if (firstGap !== -1) {
       // We have a gap to fill
       if (startSlot > firstGap) {
          // This shift starts AFTER the gap, leaving it open.
          // Since we fill sequentially, this is very bad as it might make the gap unfillable.
          score -= 10000;
       }
       
       // Check if this shift actually covers the gap
       if (startSlot <= firstGap && startSlot + SHIFT_LENGTH_SLOTS > firstGap) {
          score += 5000;
          
          // Bonus for starting EXACTLY at the gap (perfect fit)
          if (startSlot === firstGap) {
             score += 2000;
          }
       }
    }

    // 1. Necessità di Copertura (Priorità Alta - General)
    // Controlliamo gli slot che questo turno coprirebbe.
    let fillsGap = false;
    let minLevelInShift = 999;
    
    for (let i = 0; i < SHIFT_LENGTH_SLOTS; i++) {
      const currentLevel = coverage[dayIdx][startSlot + i];
      if (currentLevel < minLevelInShift) minLevelInShift = currentLevel;
      if (currentLevel < minCoverage) {
        fillsGap = true;
      }
    }

    if (fillsGap) score += 1000;
    // Preferiamo aggiungere agli slot con copertura più bassa
    score -= minLevelInShift * 100; 

    // 2. Equità (Priorità Media)
    const type = getShiftType(startSlot);
    const currentCount = equityTracker[empId][type];
    // Penalizziamo se hanno già molti turni di questo tipo
    score -= currentCount * 50;

    // 3. Riposo (Priorità Bassa - controlliamo il giorno precedente)
    if (dayIdx > 0) {
      const prevShift = shifts.find(s => s.employeeId === empId && s.dayIndex === dayIdx - 1);
      if (prevShift) {
        const prevEnd = prevShift.startSlot + prevShift.length;
        const gap = (TOTAL_SLOTS - prevEnd) + startSlot; // Slot tra la fine di ieri e l'inizio di oggi
        // Vogliamo massimizzare il gap (riposo).
        score += gap;
      }
    }

    return score;
  }
}
