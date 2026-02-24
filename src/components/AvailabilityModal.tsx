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
            Manage Availability: <span className="text-indigo-600">{employee.name}</span>
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1">
            {/* Header Row */}
            <div className="font-medium text-stone-500 text-xs text-center p-2">Time</div>
            {DAYS.map(day => (
              <div key={day} className="font-medium text-stone-900 text-xs text-center p-2 bg-stone-100 rounded">
                {day.slice(0, 3)}
              </div>
            ))}

            {/* Time Rows */}
            {hours.map((hour, slotIdx) => (
              <React.Fragment key={hour}>
                <div className="text-xs font-mono text-stone-500 flex items-center justify-center bg-stone-50 rounded">
                  {hour}:00
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
                      {isUnavailable ? "Busy" : "Free"}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          
          <div className="mt-4 text-xs text-stone-500">
            * Click on slots to mark them as unavailable (Red = Busy).
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
