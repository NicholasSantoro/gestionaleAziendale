import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ShiftCalendar } from './components/ShiftCalendar';
import { StatsPanel } from './components/StatsPanel';
import { Button } from './components/ui/button';
import { Employee, Schedule, SolverSettings, START_HOUR, END_HOUR, DAYS } from './types';
import { generateSchedule } from './lib/solver';
import { Calendar, BarChart3, Download, Play, AlertCircle, Menu } from 'lucide-react';
import { cn } from './lib/utils';
import * as XLSX from 'xlsx';

const INITIAL_EMPLOYEES: Employee[] = Array.from({ length: 10 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `Employee ${i + 1}`,
  unavailableDays: [],
  unavailableSlots: {}
}));

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [minCoverage, setMinCoverage] = useState(1);
  const [maxCoverage, setMaxCoverage] = useState(2);
  const [allowOvertime, setAllowOvertime] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats'>('calendar');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Small timeout to allow UI to update
    setTimeout(() => {
      const settings: SolverSettings = {
        employees,
        minCoverage,
        maxCoverage,
        allowOvertime,
        operatingHoursStart: START_HOUR,
        operatingHoursEnd: END_HOUR,
        shiftDurationHours: 4
      };
      const result = generateSchedule(settings);
      setSchedule(result);
      setIsGenerating(false);
      setIsSidebarOpen(false); // Close sidebar on mobile after generating
    }, 100);
  };

  const handleExport = () => {
    if (!schedule) return;

    // Create a flat data structure for Excel
    const rows = [];
    
    // Header
    rows.push(['Date', 'Employee', 'Start Time', 'End Time', 'Type', 'Duration (h)']);

    schedule.shifts.forEach(shift => {
      const day = DAYS[shift.dayIndex];
      const emp = employees.find(e => e.id === shift.employeeId)?.name || 'Unknown';
      
      const startTotalMinutes = (shift.startSlot * 60);
      const startH = START_HOUR + Math.floor(startTotalMinutes / 60);
      const startM = startTotalMinutes % 60;
      
      const endTotalMinutes = startTotalMinutes + (shift.length * 60);
      const endH = START_HOUR + Math.floor(endTotalMinutes / 60);
      const endM = endTotalMinutes % 60;

      const formatTime = (h: number, m: number) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      // Determine type
      let type = 'Evening';
      if (startH < 12) type = 'Morning';
      else if (startH < 15) type = 'Intermediate';

      rows.push([
        day,
        emp,
        formatTime(startH, startM),
        formatTime(endH, endM),
        type,
        (shift.length).toFixed(1)
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    XLSX.writeFile(wb, "weekly_schedule.xlsx");
  };

  return (
    <div className="flex h-screen bg-white font-sans text-stone-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar 
          employees={employees} 
          setEmployees={setEmployees}
          minCoverage={minCoverage}
          setMinCoverage={setMinCoverage}
          maxCoverage={maxCoverage}
          setMaxCoverage={setMaxCoverage}
          allowOvertime={allowOvertime}
          setAllowOvertime={setAllowOvertime}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsSidebarOpen(false)} 
          />
          <div className="absolute left-0 top-0 bottom-0 z-50 animate-in slide-in-from-left duration-200">
            <Sidebar 
              employees={employees} 
              setEmployees={setEmployees}
              minCoverage={minCoverage}
              setMinCoverage={setMinCoverage}
              maxCoverage={maxCoverage}
              setMaxCoverage={setMaxCoverage}
              allowOvertime={allowOvertime}
              setAllowOvertime={setAllowOvertime}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      )}
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-stone-200 bg-white px-4 md:px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 -ml-2 text-stone-500 hover:text-stone-900"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  "px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  activeTab === 'calendar' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={cn(
                  "px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  activeTab === 'stats' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Statistics</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Button 
              variant="outline" 
              onClick={handleExport} 
              disabled={!schedule}
              className="hidden sm:flex"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="md:h-10">
              {isGenerating ? (
                <span className="animate-pulse">Generating...</span>
              ) : (
                <>
                  <Play className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Generate</span>
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-stone-50/50 p-4 md:p-8">
          {!schedule ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 p-4">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-stone-300" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 mb-2 text-center">No Schedule Generated</h3>
              <p className="max-w-md text-center mb-6 text-sm md:text-base">
                Configure your team and settings in the sidebar, then click "Generate" to create an optimized shift plan.
              </p>
              <Button onClick={handleGenerate}>
                Generate Now
              </Button>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {activeTab === 'calendar' ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">Weekly Schedule</h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-stone-500">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-indigo-50 border border-indigo-100 rounded"></div>
                        <span>Shift</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coffee className="w-3 h-3 text-amber-500" />
                        <span>VDT Break (15m)</span>
                      </div>
                    </div>
                  </div>
                  <ShiftCalendar schedule={schedule} employees={employees} />
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight">Analytics & Equity</h2>
                  <StatsPanel schedule={schedule} employees={employees} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Coffee({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  );
}
