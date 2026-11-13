import type { ReactNode } from 'react';

export type Tab = 'timer' | 'insights' | 'history';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'timer',
    label: 'Timer',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 8.4V12l2.3 1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 16.5v-3M10 16.5V8M15 16.5v-5M20 16.5V5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 7.5h10M7 12h10M7 16.5h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={tab === item.id ? 'tab is-on' : 'tab'}
          aria-current={tab === item.id ? 'page' : undefined}
          data-testid={`tab-${item.id}`}
          onClick={() => onTab(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
