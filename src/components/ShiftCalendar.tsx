import React from 'react';
import { Schedule, DAYS, START_HOUR, END_HOUR, SLOTS_PER_HOUR, Employee } from '../types';
import { cn } from '@/lib/utils';
import { Coffee } from 'lucide-react';

interface ShiftCalendarProps {
  schedule: Schedule;
  employees: Employee[];
}

export function ShiftCalendar({ schedule, employees }: ShiftCalendarProps) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[1000px] border rounded-lg border-stone-200 bg-white shadow-sm">
        {/* Header Row */}
        <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-stone-200 bg-stone-50">
          <div className="p-4 font-semibold text-stone-500 text-sm flex items-center justify-center border-r border-stone-200">
            Orario
          </div>
          {DAYS.map(day => (
            <div key={day} className="p-4 font-semibold text-stone-900 text-sm text-center border-r border-stone-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="divide-y divide-stone-100">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-[100px_repeat(7,1fr)] group hover:bg-stone-50/50 transition-colors">
              {/* Time Column */}
              <div className="p-3 text-[10px] font-mono text-stone-500 border-r border-stone-200 flex items-center justify-center bg-stone-50/30 text-center leading-tight">
                <span>{hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00</span>
              </div>

              {/* Days Columns */}
              {DAYS.map((_, dayIdx) => {
                // Find shifts active in this hour (1 slot)
                const slot = (hour - START_HOUR);

                const activeShifts = schedule.shifts.filter(s => 
                  s.dayIndex === dayIdx && 
                  s.startSlot <= slot && s.startSlot + s.length > slot
                );

                return (
                  <div key={dayIdx} className="border-r border-stone-200 last:border-r-0 p-1 relative min-h-[60px]">
                    <div className="space-y-1">
                      {activeShifts.map(shift => {
                         // Calculate if this is a VDT break time
                         // VDT break: 15 min every 2 hours.
                         // Shift is 4 hours (4 slots).
                         // Breaks could be at slot index 2 (after 2h).
                         const slotsSinceStart = slot - shift.startSlot;
                         const isBreakTime = slotsSinceStart === 2; // At 2h mark

                         return (
                          <div 
                            key={shift.employeeId + shift.startSlot}
                            className={cn(
                              "text-[10px] px-2 py-1 rounded border shadow-sm flex items-center justify-between",
                              "bg-indigo-50 border-indigo-100 text-indigo-900"
                            )}
                          >
                            <span className="truncate font-medium">{getEmployeeName(shift.employeeId)}</span>
                            {isBreakTime && (
                              <div className="group/tooltip relative">
                                <Coffee className="w-3 h-3 text-amber-500" />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-stone-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 whitespace-nowrap pointer-events-none z-10">
                                  VDT Break
                                </span>
                              </div>
                            )}
                          </div>
                         );
                      })}
                    </div>
                    
                    {/* Coverage Indicator */}
                    <div className={cn(
                      "absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded",
                      schedule.coverage[dayIdx][slot] < 1 
                        ? "bg-red-100 text-red-600 font-bold" // Uncovered
                        : "text-stone-300"
                    )}>
                      {schedule.coverage[dayIdx][slot]}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
