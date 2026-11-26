import { BIBLE_STUDY } from '../lib/defaults';

/** The small marker beside an activity name: a cross for Bible Study, a colored dot for everything else. */
export function CategoryMark({ id, color }: { id: string; color: string }) {
  if (id === BIBLE_STUDY.id) {
    return (
      <svg className="mark-cross" viewBox="0 0 12 16" aria-hidden="true" style={{ color }}>
        <path d="M6 1v14M2 5.5h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return <span className="dot" style={{ background: color }} />;
}

/** A cross shown before the Bible Study name on buttons. */
export function CrossIcon() {
  return (
    <svg className="mark-cross inline" viewBox="0 0 12 16" aria-hidden="true">
      <path d="M6 1v14M2 5.5h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
