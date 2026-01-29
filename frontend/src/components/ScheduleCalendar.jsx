import React, { useMemo } from 'react';
import { addDays, format, isSameMonth, startOfWeek } from 'date-fns';
import './ScheduleCalendar.css';

const ScheduleCalendar = ({ orders }) => {
  const today = new Date();
  const startDate = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 28 }, (_, index) => addDays(startDate, index));

  const orderMap = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const list = map.get(order.scheduled_date) || [];
      list.push(order);
      map.set(order.scheduled_date, list);
    });
    return map;
  }, [orders]);

  return (
    <div className="schedule-calendar">
      <div className="calendar-header">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayOrders = orderMap.get(dateKey) || [];
          return (
            <div
              key={dateKey}
              className={`calendar-cell ${isSameMonth(date, today) ? '' : 'muted'}`}
            >
              <span className="cell-date">{format(date, 'd')}</span>
              {dayOrders.length > 0 && (
                <div className="cell-orders">
                  <span>{dayOrders.length} pickup{dayOrders.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
