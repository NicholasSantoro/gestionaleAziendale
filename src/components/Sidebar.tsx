import { useState } from 'react';
import { Employee } from '../types';
import { Button } from './ui/button';
import { Plus, Trash2, Users, Settings, Clock, X } from 'lucide-react';
import { AvailabilityModal } from './AvailabilityModal';

interface SidebarProps {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  minCoverage: number;
  setMinCoverage: (val: number) => void;
  maxCoverage: number;
  setMaxCoverage: (val: number) => void;
  allowOvertime: boolean;
  setAllowOvertime: (val: boolean) => void;
  onClose?: () => void;
}

export function Sidebar({ 
  employees, 
  setEmployees, 
  minCoverage, 
  setMinCoverage,
  maxCoverage,
  setMaxCoverage,
  allowOvertime,
  setAllowOvertime,
  onClose
}: SidebarProps) {
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);

  const addEmployee = () => {
    const newId = (employees.length + 1).toString();
    setEmployees([...employees, { id: crypto.randomUUID(), name: `Employee ${newId}`, unavailableDays: [], unavailableSlots: {} }]);
  };

  const removeEmployee = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
  };

  const updateName = (id: string, name: string) => {
    setEmployees(employees.map(e => e.id === id ? { ...e, name } : e));
  };

  const toggleUnavailableDay = (empId: string, dayIdx: number) => {
    setEmployees(employees.map(e => {
      if (e.id !== empId) return e;
      const current = e.unavailableDays || [];
      const newDays = current.includes(dayIdx)
        ? current.filter(d => d !== dayIdx)
        : [...current, dayIdx];
      return { ...e, unavailableDays: newDays };
    }));
  };

  const updateUnavailableSlots = (empId: string, slots: Record<number, number[]>) => {
    setEmployees(employees.map(e => e.id === empId ? { ...e, unavailableSlots: slots } : e));
  };

  const DAYS_SHORT = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

  return (
    <div className="w-80 bg-stone-50 border-r border-stone-200 h-screen flex flex-col overflow-hidden shadow-xl md:shadow-none">
      <div className="p-6 border-b border-stone-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            ShiftPlanner
          </h1>
          <p className="text-xs text-stone-500 mt-1">Gestione Turni Settimanale</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Settings Section */}
        <section>
          <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Impostazioni
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">
                Copertura Minima (Persone)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={minCoverage}
                onChange={(e) => setMinCoverage(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-2">
                Copertura Massima (Persone)
              </label>
              <input
                type="number"
                min={minCoverage}
                max="10"
                value={maxCoverage}
                onChange={(e) => setMaxCoverage(parseInt(e.target.value) || minCoverage)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowOvertime"
                checked={allowOvertime}
                onChange={(e) => setAllowOvertime(e.target.checked)}
                className="rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="allowOvertime" className="text-sm font-medium text-stone-700">
                Consenti Straordinari (&gt;4h)
              </label>
            </div>
            <p className="text-xs text-stone-500">
              Se abilitato, i turni possono essere estesi per soddisfare la copertura minima.
            </p>
          </div>
        </section>

        {/* Team Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
              Team ({employees.length})
            </h2>
            <Button size="sm" variant="outline" onClick={addEmployee} className="h-7 px-2">
              <Plus className="w-4 h-4 mr-1" /> Aggiungi
            </Button>
          </div>
          
          <div className="space-y-4">
            {employees.map((emp) => (
              <div key={emp.id} className="group bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={emp.name}
                    onChange={(e) => updateName(emp.id, e.target.value)}
                    className="flex-1 px-2 py-1 bg-transparent border-b border-transparent focus:border-indigo-500 text-sm focus:outline-none font-medium"
                    placeholder="Nome Dipendente"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAvailabilityId(emp.id)}
                    className="flex-1 flex items-center justify-center gap-2 text-stone-600 h-8 px-2"
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate text-xs">Disponibilità</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmployee(emp.id)}
                    className="h-8 w-8 p-0 text-stone-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      <div className="p-4 border-t border-stone-200 text-xs text-stone-400 text-center">
        Powered by Nicholas Santoro
      </div>

      {editingAvailabilityId && (
        <AvailabilityModal
          employee={employees.find(e => e.id === editingAvailabilityId)!}
          isOpen={true}
          onClose={() => setEditingAvailabilityId(null)}
          onSave={(slots) => updateUnavailableSlots(editingAvailabilityId, slots)}
        />
      )}
    </div>
  );
}
