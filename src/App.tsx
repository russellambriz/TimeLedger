import { useState } from 'react';
import { HistoryScreen } from './components/HistoryScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { TabBar, type Tab } from './components/TabBar';
import { TimerScreen } from './components/TimerScreen';
import { useStore } from './store';

export function App() {
  const { toast, saveError, retrySave } = useStore();
  const [tab, setTab] = useState<Tab>('timer');

  return (
    <div className="app">
      {saveError && <div className="save-warning" role="alert">Not saved yet. Keep this app open. <button onClick={retrySave}>Retry save</button><span>You can also export a backup from History → Data.</span></div>}
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
