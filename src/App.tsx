import { useState } from 'react';
import { HistoryScreen } from './components/HistoryScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { TabBar, type Tab } from './components/TabBar';
import { TimerScreen } from './components/TimerScreen';
import { useStore } from './store';

export function App() {
  const { toast } = useStore();
  const [tab, setTab] = useState<Tab>('timer');

  return (
    <div className="app">
      {tab === 'timer' && <TimerScreen />}
      {tab === 'insights' && <InsightsScreen />}
      {tab === 'history' && <HistoryScreen onShowTimer={() => setTab('timer')} />}
      <TabBar tab={tab} onTab={setTab} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
