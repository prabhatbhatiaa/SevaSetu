import { DAYS, TIME_SLOTS } from '../../lib/constants';
import { cn } from '../ui';

const SLOTS = TIME_SLOTS.filter((slot) => slot.value !== 'flexible');

/**
 * Week × time-of-day grid. Read-only unless `onToggle(day, slot)` is given.
 * `availability` follows the API shape: [{ day, slots: [...] }]
 */
export function AvailabilityGrid({ availability = [], onToggle }) {
  const slotsByDay = Object.fromEntries(availability.map((entry) => [entry.day, entry.slots ?? []]));
  const isAvailable = (day, slot) => slotsByDay[day]?.includes(slot) || slotsByDay[day]?.includes('flexible');

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            <th className="w-11" />
            {DAYS.map((day) => (
              <th key={day} scope="col" className="pb-1 text-[11px] font-normal text-muted">
                {day.slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot) => (
            <tr key={slot.value}>
              <th scope="row" className="pr-2 text-right text-[11px] font-normal text-muted">
                {slot.short}
              </th>
              {DAYS.map((day) => {
                const on = isAvailable(day, slot.value);
                const cellClass = cn(
                  'block h-6 w-full rounded-[5px] transition-colors',
                  on ? 'bg-ink' : 'bg-ink/[0.07]',
                );
                return (
                  <td key={day}>
                    {onToggle ? (
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${day} ${slot.label}`}
                        onClick={() => onToggle(day, slot.value)}
                        className={cn(cellClass, !on && 'hover:bg-ink/15')}
                      />
                    ) : (
                      <span className={cellClass} title={`${day} ${slot.label}${on ? ' — available' : ''}`} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
