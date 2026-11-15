import {download,stamp,toJSON} from '../lib/export';
import {useStore} from '../store';
import {Sheet} from './Sheet';
export const CLOUD_URL='https://hourwell-focus-cloud.latterbag5.chatgpt.site/';
const SIGN_IN_URL=CLOUD_URL+'signin-with-chatgpt?return_to=%2F';
export function CloudSyncSheet({onClose}:{onClose:()=>void}){
 const {state}=useStore();
 return <Sheet title="Sign in to Hourwell" onClose={onClose}>
  <p className="sheet-copy">Keep your focus time together on your Android, iPhone, iPad, and computer. Use the same ChatGPT account on each device.</p>
  {state.active ? <p className="form-error">Stop and save your running timer before signing in. Close this panel and tap Stop &amp; save.</p> : <a className="menu-row cloud-link" href={SIGN_IN_URL} target="_top">Continue with ChatGPT →</a>}
  <p className="quiet">Secure sign-in opens with ChatGPT, then takes you to Hourwell Cloud. Use that version for synced tracking.</p>
  {state.sessions.length>0 && <><h3>Bring your existing history</h3><p className="sheet-copy">You have {state.sessions.length} saved session{state.sessions.length===1?'':'s'} on this device. Export them before signing in, then in Hourwell Cloud tap your account status → Bring over history → Import JSON.</p><button className="menu-row" onClick={()=>download(`hourwell-${stamp()}.json`,toJSON(state),'application/json')}>Export my history</button></>}
 </Sheet>;
}
