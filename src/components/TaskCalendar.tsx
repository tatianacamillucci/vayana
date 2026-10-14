import React, { useMemo, useState } from 'react';
import { Task } from '../lib/db/tasks';

type CalendarMode = 'month' | 'week';

interface TaskCalendarProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onMoveTask?: (task: Task, date: Date) => Promise<void> | void;
}

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKeyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date): Date {
  const base = startOfDay(date);
  const day = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - day);
  return base;
}

function getMonthLabel(date: Date): string {
  const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getWeekLabel(date: Date): string {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startTxt = start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  const endTxt = end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startTxt} - ${endTxt}`;
}

interface CalendarCell {
  date: Date;
  inCurrentMonth: boolean;
}

function buildMonthCells(anchor: Date): CalendarCell[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const cells: CalendarCell[] = [];

  for (let i = leading; i > 0; i -= 1) {
    const date = new Date(first);
    date.setDate(date.getDate() - i);
    cells.push({ date, inCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inCurrentMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const date = new Date(cells[cells.length - 1].date);
    date.setDate(date.getDate() + 1);
    cells.push({ date, inCurrentMonth: false });
  }

  return cells;
}

function buildWeekCells(anchor: Date): CalendarCell[] {
  const start = getWeekStart(anchor);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({ date, inCurrentMonth: true });
  }
  return cells;
}

export function TaskCalendar({ tasks, onEdit, onMoveTask }: TaskCalendarProps): React.ReactElement {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursor, setCursor] = useState(startOfDay(new Date()));
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const visibleTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    visibleTasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = toDateKeyLocal(new Date(task.dueDate));
      const bucket = map.get(key) || [];
      bucket.push(task);
      map.set(key, bucket);
    });
    map.forEach((list) => list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
    return map;
  }, [visibleTasks]);

  const cells = useMemo(() => (mode === 'month' ? buildMonthCells(cursor) : buildWeekCells(cursor)), [cursor, mode]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const goPrev = () => {
    setCursor((current) => {
      const next = new Date(current);
      if (mode === 'month') next.setMonth(next.getMonth() - 1, 1);
      else next.setDate(next.getDate() - 7);
      return startOfDay(next);
    });
  };

  const goNext = () => {
    setCursor((current) => {
      const next = new Date(current);
      if (mode === 'month') next.setMonth(next.getMonth() + 1, 1);
      else next.setDate(next.getDate() + 7);
      return startOfDay(next);
    });
  };

  const goToday = () => setCursor(startOfDay(new Date()));

  const getDayTasks = (date: Date): Task[] => tasksByDay.get(toDateKeyLocal(date)) || [];

  const handleDropOnDay = async (date: Date) => {
    if (!dragTaskId || !onMoveTask) return;
    const task = tasks.find((item) => item.id === dragTaskId);
    if (!task) return;
    await onMoveTask(task, startOfDay(date));
    setDragTaskId(null);
  };

  return (
    <section className="task-calendar">
      <div className="calendar-topbar">
        <div className="calendar-nav">
          <button type="button" onClick={goPrev}>‹</button>
          <h3>{mode === 'month' ? getMonthLabel(cursor) : getWeekLabel(cursor)}</h3>
          <button type="button" onClick={goNext}>›</button>
          <button type="button" className="today-btn" onClick={goToday}>Oggi</button>
        </div>
        <div className="calendar-view-toggle">
          <button type="button" className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Settimana</button>
          <button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Mese</button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className={`calendar-grid ${mode}`}>
        {cells.map((cell) => (
          <div
            key={toDateKeyLocal(cell.date)}
            className={`calendar-day ${cell.inCurrentMonth ? '' : 'outside'} ${isSameDay(cell.date, today) ? 'today' : ''}`}
            onDragOver={(event) => {
              if (onMoveTask) event.preventDefault();
            }}
            onDrop={() => {
              void handleDropOnDay(cell.date);
            }}
          >
            <div className="day-head">
              <span className="day-number">{cell.date.getDate()}</span>
            </div>
            <div className="day-tasks">
              {getDayTasks(cell.date).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={`task-chip priority-${task.priority}`}
                  draggable
                  onDragStart={() => setDragTaskId(task.id)}
                  onDragEnd={() => setDragTaskId(null)}
                  onClick={() => onEdit(task)}
                  title={task.title}
                >
                  {task.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
