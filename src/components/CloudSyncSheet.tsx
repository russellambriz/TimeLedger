import {download,stamp,toJSON} from '../lib/export';
import {useStore} from '../store';
import {Sheet} from './Sheet';
export const CLOUD_URL='https://hourwell-focus-cloud.latterbag5.chatgpt.site/';
export function CloudSyncSheet({onClose}:{onClose:()=>void}){
 const {state}=useStore();
 return <Sheet title="Your time, everywhere" onClose={onClose}>
  <p className="sheet-copy">Your private cloud version is ready. Open it on each device and sign in with the same ChatGPT account to sync your sessions and running timer.</p>
  <p className="sheet-copy">Bring your history over once: export a backup below, open the cloud version, then tap the account status → Bring over history → Import JSON.</p>
  {state.active&&<p className="form-error">Stop and save your running timer here before moving. A backup imports finished sessions only.</p>}
  <button className="menu-row" onClick={()=>download(`hourwell-${stamp()}.json`,toJSON(state),'application/json')}>1. Export my history</button>
  <a className="menu-row cloud-link" href={CLOUD_URL} target="_blank" rel="noopener noreferrer">2. Open Hourwell Cloud ↗</a>
  <p className="quiet">Use the new cloud link for future sessions on every device. This original version keeps saving locally; its history stays here until you import it.</p>
 </Sheet>;
}
