import { homeworkState, isHomework } from '../lib/defaults';
import { formatDuration } from '../lib/format';
import { todayTotal, weekTotal, monthTotal } from '../lib/stats';
import { useStore } from '../store';
import { Sheet } from './Sheet';

export function HomeworkSheet({onClose}: {onClose: () => void}) {
  const {state, now, setCategory} = useStore();
  const selected = state.active?.categoryId ?? state.lastCategoryId;
  const summary = (id?: string) => {
    const filtered = homeworkState(state, id);
    return [todayTotal(filtered, now), weekTotal(filtered, now), monthTotal(filtered, now)];
  };
  const periods = ['Today', 'This week', 'This month'];
  return <Sheet title="Homework" onClose={onClose}>
    <p className="sheet-copy">Choose your subject, then tap Focus to begin.</p>
    <div className="homework-summary" aria-label="All homework totals">
      {summary().map((total, i) => <div key={periods[i]}><span>{periods[i]}</span><strong>{formatDuration(total.total)}</strong></div>)}
    </div>
    <p className="quiet">Your subjects</p>
    <div className="homework-subjects">
      {state.categories.filter(c => isHomework(c.id) && !c.archived).map(c => <button
        type="button" key={c.id} className="homework-subject" aria-pressed={selected === c.id}
        onClick={() => {setCategory(c.id); onClose();}}>
        <span className="subject-title"><i className="dot" style={{background:c.color}} />{c.id === 'homework' ? 'General homework' : c.name}<span className="subject-check">{selected === c.id ? 'Selected' : 'Choose'}</span></span>
        <span className="subject-totals">{summary(c.id).map((t,i) => <span key={periods[i]}><small>{periods[i]}</small>{formatDuration(t.total)}</span>)}</span>
      </button>)}
    </div>
    {state.active && <p className="sheet-copy">Changing subjects moves the entire running session to that subject. Stop and save first to begin a separate session.</p>}
  </Sheet>;
}
