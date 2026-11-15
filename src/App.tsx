import { useState } from 'react';
import { HistoryScreen } from './components/HistoryScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { TabBar, type Tab } from './components/TabBar';
import { TimerScreen } from './components/TimerScreen';
import { SleepScreen } from './components/SleepScreen';
import { useStore } from './store';

export function App() {
  const { state, toast, saveError, retrySave } = useStore();
  // Open straight to Sleep in the morning if the sleep timer is running.
  const [tab, setTab] = useState<Tab>(() => (state.sleep ? 'sleep' : 'timer'));

  return (
    <div className="app">
      {saveError && <div className="save-warning" role="alert">Not saved yet. Keep this app open. <button onClick={retrySave}>Retry save</button><span>You can also export a backup from History → Data.</span></div>}
      {tab === 'timer' && <TimerScreen />}
      {tab === 'sleep' && <SleepScreen />}
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
