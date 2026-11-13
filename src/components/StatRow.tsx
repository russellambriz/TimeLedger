import { formatDuration } from '../lib/format';
import { todayTotal, weekTotal } from '../lib/stats';
import { useStore } from '../store';

export function StatRow({ now }: { now: number }) {
  const { state } = useStore();
  const live = state.active !== null;
  const today = todayTotal(state, now);
  const week = weekTotal(state, now);
  return (
    <div className="stat-row">
      <div>
        <div className="stat-label">Today</div>
        <div className="stat-value" data-testid="today-total">
          {formatDuration(today.total, live)}
        </div>
      </div>
      <div className="stat-rule" aria-hidden="true" />
      <div>
        <div className="stat-label">This week</div>
        <div className="stat-value" data-testid="week-total">
          {formatDuration(week.total, live)}
        </div>
      </div>
    </div>
  );
}
