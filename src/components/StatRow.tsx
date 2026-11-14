import { formatDuration } from '../lib/format';
import { todayTotal, weekTotal, monthTotal } from '../lib/stats';
import { focusState } from '../lib/defaults';
import { useStore } from '../store';
export function StatRow({ now }: { now: number }) {
  const { state } = useStore();
  const focus = focusState(state);
  const periods = [
    {label: 'Today', key: 'today', total: todayTotal(focus, now).total},
    {label: 'This week', key: 'week', total: weekTotal(focus, now).total},
    {label: 'This month', key: 'month', total: monthTotal(focus, now).total},
  ];
  return <div className="stat-row" aria-label="Focus totals">
    {periods.map(({label, key, total}) => <div className="stat-card" key={key}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" data-testid={`${key}-total`}>{formatDuration(total)}</div>
    </div>)}
  </div>;
}
