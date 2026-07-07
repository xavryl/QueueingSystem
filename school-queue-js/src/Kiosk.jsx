import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Kiosk({ onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [lastTicket, setLastTicket] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  const theme = {
    backgroundGradient: 'linear-gradient(135deg, #2E7D32 0%, #0A2E15 100%)', 
    surface: '#FFFFFF',      
    textDark: '#0A2E15',     
    outline: '#1B5E20',      
  };

  const handleOpenPopup = (id, prefix, name) => {
    setSelectedDept({ id, prefix, name });
    setLastTicket(null); 
  };

  const handleGenerateTicket = async (userType) => {
    if (!selectedDept) return;
    setLoading(true);

    try {
      const { id: departmentId, prefix } = selectedDept;
      const isPriority = userType !== 'STUDENT / GUARDIAN';

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const isoStart = startOfToday.toISOString();

      const { data: latestTickets, error: fetchError } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('department_id', departmentId)
        .gte('created_at', isoStart)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let nextNumber = 1;
      if (latestTickets && latestTickets.length > 0) {
        const lastTicketString = latestTickets[0].ticket_number.split('-')[1];
        nextNumber = parseInt(lastTicketString, 10) + 1;
      }

      const formattedNumber = String(nextNumber).padStart(3, '0');
      const ticketNumber = `${prefix}-${formattedNumber}`;

      const { data: newTicket, error: insertError } = await supabase
        .from('tickets')
        .insert([
          {
            department_id: departmentId,
            ticket_number: ticketNumber,
            status: 'WAITING',
            is_priority: isPriority 
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setLastTicket({ ...newTicket, displayType: userType });
      setSelectedDept(null);

    } catch (error) {
      console.error("Error generating ticket:", error);
      alert("FAILED TO GENERATE TICKET. PLEASE TRY AGAIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: theme.backgroundGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", "Segoe UI", sans-serif', padding: '4vw', overflow: 'hidden', textTransform: 'uppercase' }}>
      
     

      {/* MAIN KIOSK CONTAINER */}
      <div style={{ backgroundColor: theme.surface, padding: '5vh 4vw', borderRadius: '2vw', border: `0.4vw solid ${theme.outline}`, boxShadow: '0 2vh 5vh rgba(0,0,0,0.4)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', flex: '0 0 auto', marginBottom: '4vh' }}>
          <h1 style={{ fontSize: '6vh', color: theme.textDark, margin: '0 0 1vh 0', fontWeight: '900', letterSpacing: '0.2vw' }}>
            WELCOME
          </h1>
          <p style={{ fontSize: '2.5vh', color: theme.textDark, margin: 0, fontWeight: '600', letterSpacing: '0.1vw', opacity: 0.8 }}>
            PLEASE SELECT A DEPARTMENT TO JOIN THE QUEUE
          </p>
        </div>

        {/* DEPARTMENT BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '3vw', flex: 1 }}>
          <button 
            onClick={() => handleOpenPopup(1, 'REG', 'REGISTRAR')}
            style={{ flex: 1, fontSize: '4vh', cursor: 'pointer', backgroundColor: theme.surface, color: theme.textDark, border: `0.4vw solid ${theme.outline}`, borderRadius: '1.5vw', fontWeight: '900', letterSpacing: '0.1vw', transition: 'all 0.2s', textTransform: 'uppercase' }}
          >
            REGISTRAR
          </button>

          <button 
            onClick={() => handleOpenPopup(2, 'ACT', 'ACCOUNTING')}
            style={{ flex: 1, fontSize: '4vh', cursor: 'pointer', backgroundColor: theme.surface, color: theme.textDark, border: `0.4vw solid ${theme.outline}`, borderRadius: '1.5vw', fontWeight: '900', letterSpacing: '0.1vw', transition: 'all 0.2s', textTransform: 'uppercase' }}
          >
            ACCOUNTING
          </button>
        </div>
      </div>

      {/* THE POPUP MODAL (Priority Selection) */}
      {selectedDept && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 46, 21, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          
          <div style={{ backgroundColor: theme.surface, padding: '3vw', borderRadius: '1.5vw', width: '35vw', border: `0.3vw solid ${theme.outline}`, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 2vh 5vh rgba(0,0,0,0.6)' }}>
            
            <div style={{ textAlign: 'center', flex: '0 0 auto', marginBottom: '2vw' }}>
              <h2 style={{ margin: '0 0 0.5vw 0', fontSize: '3vw', color: theme.textDark, fontWeight: '900', letterSpacing: '0.1vw' }}>
                {selectedDept.name}
              </h2>
              <p style={{ color: theme.textDark, margin: 0, fontSize: '1vw', fontWeight: '600', opacity: 0.8 }}>
                SELECT YOUR CLASSIFICATION
              </p>
            </div>
            
            {/* PRIORITY BUTTONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1vw', flex: 1 }}>
              <button onClick={() => handleGenerateTicket('STUDENT / GUARDIAN')} disabled={loading} style={{ padding: '1.5vw', fontSize: '1vw', cursor: 'pointer', borderRadius: '1vw', border: `0.2vw solid ${theme.outline}`, backgroundColor: theme.surface, color: theme.textDark, fontWeight: '900', letterSpacing: '0.05vw' }}>
                {loading ? 'LOADING...' : 'STUDENT / GUARDIAN'}
              </button>
              
              <button onClick={() => handleGenerateTicket('SENIOR CITIZEN')} disabled={loading} style={{ padding: '1.5vw', fontSize: '1vw', cursor: 'pointer', borderRadius: '1vw', border: `0.2vw solid ${theme.outline}`, backgroundColor: theme.surface, color: theme.textDark, fontWeight: '900', letterSpacing: '0.05vw' }}>
                SENIOR CITIZEN
              </button>
              
              <button onClick={() => handleGenerateTicket('PWD')} disabled={loading} style={{ padding: '1.5vw', fontSize: '1vw', cursor: 'pointer', borderRadius: '1vw', border: `0.2vw solid ${theme.outline}`, backgroundColor: theme.surface, color: theme.textDark, fontWeight: '900', letterSpacing: '0.05vw' }}>
                PWD 
              </button>
              
              <button onClick={() => handleGenerateTicket('VIP')} disabled={loading} style={{ padding: '1.5vw', fontSize: '1vw', cursor: 'pointer', borderRadius: '1vw', border: `0.2vw solid ${theme.outline}`, backgroundColor: theme.surface, color: theme.textDark, fontWeight: '900', letterSpacing: '0.05vw' }}>
                VIP
              </button>
            </div>

            <button 
              onClick={() => setSelectedDept(null)}
              style={{ marginTop: '2vw', padding: '1vw', fontSize: '1.2vw', backgroundColor: 'transparent', border: 'none', color: theme.textDark, fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
            >
              GO BACK
            </button>
          </div>
        </div>
      )}

      {/* THE PRINTED TICKET DISPLAY */}
      {lastTicket && !selectedDept && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 46, 21, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          
          <div style={{ backgroundColor: theme.surface, padding: '3vw 2vw', borderRadius: '1.5vw', border: `0.3vw solid ${theme.outline}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2vh 5vh rgba(0,0,0,0.6)', width: '35vw', boxSizing: 'border-box' }}>
            <p style={{ fontSize: '1.2vw', color: theme.textDark, margin: '0 0 1vw 0', fontWeight: 'bold', letterSpacing: '0.1vw' }}>YOUR QUEUE NUMBER</p>
            
            <h2 style={{ fontSize: '7vw', margin: '0 0 1.5vw 0', color: theme.textDark, fontWeight: '900', letterSpacing: '-0.2vw' }}>
              {lastTicket.ticket_number}
            </h2>
            
            <div style={{ backgroundColor: theme.textDark, color: theme.surface, padding: '1vw 2vw', borderRadius: '3vw', fontSize: '1.2vw', fontWeight: '900', letterSpacing: '0.1vw' }}>
              {lastTicket.displayType}
            </div>
            
            <p style={{ color: theme.textDark, fontSize: '0.9vw', marginTop: '3vw', fontWeight: '800' }}>PLEASE WAIT FOR YOUR NUMBER TO BE CALLED ON THE SCREEN.</p>
            
            <button 
              onClick={() => setLastTicket(null)}
              style={{ marginTop: '2vw', padding: '1vw 4vw', fontSize: '1.2vw', backgroundColor: 'transparent', border: `0.2vw solid ${theme.outline}`, color: theme.textDark, fontWeight: 'bold', cursor: 'pointer', borderRadius: '0.8vw' }}
            >
              FINISH
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
