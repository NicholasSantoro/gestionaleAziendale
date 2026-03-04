import React, { useState, useEffect } from 'react';
import { Employee, DAYS, START_HOUR, END_HOUR, TOTAL_SLOTS } from '../types';
import { X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface AvailabilityModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSave: (slots: Record<number, number[]>) => void;
}

export function AvailabilityModal({ employee, isOpen, onClose, onSave }: AvailabilityModalProps) {
  const [localSlots, setLocalSlots] = useState<Record<number, number[]>>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize with existing slots or empty
      setLocalSlots(employee.unavailableSlots || {});
    }
  }, [isOpen, employee]);

  if (!isOpen) return null;

  const toggleSlot = (dayIdx: number, slotIdx: number) => {
    setLocalSlots(prev => {
      const currentDaySlots = prev[dayIdx] || [];
      const newDaySlots = currentDaySlots.includes(slotIdx)
        ? currentDaySlots.filter(s => s !== slotIdx)
        : [...currentDaySlots, slotIdx];
      
      return { ...prev, [dayIdx]: newDaySlots };
    });
  };

  const handleSave = () => {
    onSave(localSlots);
    onClose();
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <h2 className="text-lg font-semibold text-stone-900">
            Gestisci Disponibilità: <span className="text-indigo-600">{employee.name}</span>
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-1 min-w-[600px]">
            {/* Header Row */}
            <div className="font-medium text-stone-500 text-xs text-center p-2 flex items-center justify-center">Orario</div>
            {DAYS.map((day, dayIdx) => {
              const allSlots = hours.map((_, i) => i);
              const currentSlots = localSlots[dayIdx] || [];
              const isAllBusy = currentSlots.length === hours.length;
              
              return (
                <div key={day} className="flex flex-col gap-1 p-1 bg-stone-100 rounded">
                  <div className="font-medium text-stone-900 text-xs text-center">
                    {day.slice(0, 3)}
                  </div>
                  <button
                    onClick={() => {
                      setLocalSlots(prev => ({
                        ...prev,
                        [dayIdx]: isAllBusy ? [] : allSlots
                      }));
                    }}
                    className="text-[9px] py-0.5 px-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-600 font-medium transition-colors"
                  >
                    {isAllBusy ? "Libera" : "Occupa"}
                  </button>
                </div>
              );
            })}

            {/* Time Rows */}
            {hours.map((hour, slotIdx) => (
              <React.Fragment key={hour}>
                <div className="text-[10px] font-mono text-stone-500 flex items-center justify-center bg-stone-50 rounded px-1 text-center leading-tight">
                  {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
                </div>
                {DAYS.map((_, dayIdx) => {
                  const isUnavailable = (localSlots[dayIdx] || []).includes(slotIdx);
                  return (
                    <button
                      key={`${dayIdx}-${slotIdx}`}
                      onClick={() => toggleSlot(dayIdx, slotIdx)}
                      className={cn(
                        "h-8 rounded text-[10px] transition-colors border",
                        isUnavailable
                          ? "bg-red-100 border-red-200 text-red-700 hover:bg-red-200"
                          : "bg-white border-stone-100 hover:bg-stone-50 text-stone-400"
                      )}
                    >
                      {isUnavailable ? "Occupato" : "Libero"}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          
          <div className="mt-4 text-xs text-stone-500">
            * Clicca sugli slot per segnarli come non disponibili (Rosso = Occupato).
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave}>Salva Modifiche</Button>
        </div>
      </div>
    </div>
  );
}
