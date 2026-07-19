import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { adminTheme as theme } from '../../utils/theme';

export default function SystemSettings() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetTarget, setResetTarget] = useState('ALL');

  const handleQueueReset = async () => {
    const targetName = resetTarget === 'ALL' ? 'ALL DEPARTMENTS' : 
                       resetTarget === '1' ? 'REGISTRAR' : 
                       'ACCOUNTING';

    const confirmReset = window.confirm(
      `⚠️ WARNING: MANUAL QUEUE RESET ⚠️\n\nThis will instantly cancel all waiting and serving tickets for ${targetName}.\n\nAre you absolutely sure you want to proceed?`
    );

    if (!confirmReset) return;

    setIsResetting(true);
    try {
      let query = supabase
        .from('tickets')
        .update({ status: 'CANCELLED' })
        .in('status', ['WAITING', 'SERVING']);

      if (resetTarget !== 'ALL') {
        query = query.eq('department_id', parseInt(resetTarget));
      }

      const { error } = await query;
      if (error) throw error;
      
      alert(`QUEUE RESET SUCCESSFUL FOR ${targetName}.`);
    } catch (error) {
      console.error("Error resetting queue:", error);
      alert("FAILED TO RESET QUEUE. Check database connection.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div style={{ maxWidth: '80vw', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: `0.15vw solid ${theme.outlineLight}`, paddingBottom: '2vh', marginBottom: '4vh', flex: '0 0 auto' }}>
        <h2 style={{ fontSize: '3.5vh', margin: '0 0 1vh 0', fontWeight: '900', letterSpacing: '0.1vw' }}>SYSTEM SETTINGS</h2>
        <p style={{ color: theme.textMuted, margin: 0, fontSize: '1.6vh', fontWeight: '700' }}>Manage core system operations and data control.</p>
      </div>

      <div style={{ backgroundColor: theme.dangerBg, border: `0.2vw solid ${theme.dangerBorder}`, borderRadius: '1vw', padding: '4vh 3vw', boxShadow: '0 1vh 2vh rgba(0,0,0,0.03)', flex: '0 0 auto' }}>
        <h3 style={{ margin: '0 0 1vh 0', fontSize: '2.2vh', color: theme.dangerText, fontWeight: '900', letterSpacing: '0.1vw' }}>DANGER ZONE: MANUAL QUEUE RESET</h3>
        <p style={{ color: theme.textMuted, fontSize: '1.6vh', fontWeight: '700', marginBottom: '3vh', lineHeight: '1.5' }}>
          Executing a queue reset will instantly cancel all unserved tickets for the selected department. <br/>
          <em>Note: This forces the TVs and Staff Counters to clear, but retains the data in your history logs.</em>
        </p>
        
        <div style={{ display: 'flex', gap: '2vw', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1vh', flex: 1 }}>
            <label style={{ fontSize: '1.4vh', fontWeight: '900', color: theme.dangerText, letterSpacing: '0.05vw' }}>SELECT TARGET TO RESET</label>
            <select 
              value={resetTarget} 
              onChange={(e) => setResetTarget(e.target.value)}
              disabled={isResetting}
              style={{ padding: '2vh 1vw', fontSize: '1.8vh', fontWeight: '700', color: theme.dangerText, backgroundColor: theme.surface, border: `0.2vw solid ${theme.dangerBorder}`, borderRadius: '0.8vw', outline: 'none' }}
            >
              <option value="ALL">🚨 ALL DEPARTMENTS (FULL WIPE)</option>
              <option value="1">REGISTRAR ONLY</option>
              <option value="2">ACCOUNTING ONLY</option>
            </select>
          </div>

          <button 
            onClick={handleQueueReset}
            disabled={isResetting}
            style={{ flex: 1, padding: '2.5vh 4vw', marginTop: '3.5vh', backgroundColor: theme.dangerText, color: theme.surface, border: 'none', borderRadius: '0.8vw', fontSize: '1.8vh', fontWeight: '900', letterSpacing: '0.15vw', cursor: isResetting ? 'wait' : 'pointer', transition: 'all 0.2s ease', boxShadow: '0 0.5vh 1.5vh rgba(220, 38, 38, 0.2)' }}
          >
            {isResetting ? 'WIPING QUEUE...' : 'EXECUTE MANUAL RESET'}
          </button>
        </div>
      </div>
    </div>
  );
}