import React from 'react';
import { Schedule, Employee, DAYS } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { getShiftType } from '@/lib/solver';

interface StatsPanelProps {
  schedule: Schedule;
  employees: Employee[];
}

export function StatsPanel({ schedule, employees }: StatsPanelProps) {
  // Prepare data for charts
  
  // 1. Hours per employee
  const hoursData = employees.map(emp => {
    const totalSlots = schedule.shifts
      .filter(s => s.employeeId === emp.id)
      .reduce((acc, s) => acc + s.length, 0);
    return {
      name: emp.name,
      hours: totalSlots // 1 hour slots
    };
  });

  // 2. Shift Type Distribution
  const typeData = employees.map(emp => {
    const shifts = schedule.shifts.filter(s => s.employeeId === emp.id);
    const counts = { Morning: 0, Intermediate: 0, Evening: 0 };
    shifts.forEach(s => {
      const type = getShiftType(s.startSlot);
      if (type in counts) counts[type as keyof typeof counts]++;
    });
    return {
      name: emp.name,
      ...counts
    };
  });

  // 3. Daily Coverage Min/Max
  const coverageData = DAYS.map((day, idx) => {
    const slots = schedule.coverage[idx];
    return {
      name: day,
      min: Math.min(...slots),
      max: Math.max(...slots),
      avg: (slots.reduce((a, b) => a + b, 0) / slots.length).toFixed(1)
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Distribuzione Ore Settimanali</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hoursData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="hours" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                {hoursData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hours === 28 ? '#22c55e' : '#4f46e5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equità Tipi di Turno</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Morning" name="Mattina" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Intermediate" name="Intermedio" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Evening" name="Sera" stackId="a" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analisi Copertura Giornaliera</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={coverageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{fontSize: 11}} />
              <YAxis domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Bar dataKey="min" fill="#ef4444" name="Staff Min" />
              <Bar dataKey="avg" fill="#10b981" name="Staff Medio" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
