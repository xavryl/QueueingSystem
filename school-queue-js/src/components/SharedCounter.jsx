import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function SharedCounter() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  // ==========================
  // AUTHENTICATION & SESSION CHECK
  // ==========================
  useEffect(() => {
    const rawSession = localStorage.getItem('queue_user');
    if (!rawSession) {
      navigate('/login', { replace: true });
      return;
    }
    
    const parsedSession = JSON.parse(rawSession);
    
    // Ensure the user has an assigned department and window (Admins without one shouldn't be here)
    if (!parsedSession.department_id || !parsedSession.window_number) {
      alert("UNAUTHORIZED: Your account is not assigned to a specific service counter.");
      navigate('/login', { replace: true });
      return;
    }
    
    setSession(parsedSession);
  }, [navigate]);

  // Derived state from session
  const departmentId = session?.department_id;
  const windowNumber = session?.window_number;

  const departmentName = useMemo(() => {
    if (departmentId === 1) return "REGISTRAR (REG)";
    if (departmentId === 2) return "ACCOUNTING (ACT)";
    return "UNKNOWN DEPARTMENT";
  }, [departmentId]);

  // ==========================
  // APPLICATION STATE
  // ==========================
  const [currentTicket, setCurrentTicket] = useState(null);
  const [allServingWindows, setAllServingWindows] = useState([]); 
  const [waitingTickets, setWaitingTickets] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false); 
  
  const isBusy = loading || isFetching;

  const theme = {
    background: '#F9FAFB',     
    surface: '#FFFFFF',        
    textDark: '#0A2E15',       
    textMuted: '#4B5563',      
    outline: '#1B5E20',        
    outlineLight: '#E5E7EB',   
    accentGreen: '#2E7D32',    
    disabledBg: '#F3F4F6',     
    disabledText: '#9CA3AF',
    priorityBadge: '#FEF3C7', 
    priorityText: '#92400E',  
    regularBadge: '#F3F4F6',  
    regularText: '#374151',
    dangerBg: '#FEF2F2',
    dangerText: '#DC2626',
    dangerBorder: '#F87171'
  };

  // ==========================
  // DATA FETCHING
  // ==========================
  const fetchDashboardData = async (showLoadingState = false) => {
    if (!departmentId || !windowNumber) return;
    if (showLoadingState) setIsFetching(true);
    
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const isoStart = startOfToday.toISOString();
      
      const { data: servingData, error: servingError } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'SERVING')
        .eq('department_id', departmentId)
        .gte('created_at', isoStart)
        .order('called_at', { ascending: false });

      if (servingError) throw servingError;
      
      const { data: waitingData, error: waitingError } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'WAITING')
        .eq('department_id', departmentId)
        .gte('created_at', isoStart)
        .order('created_at', { ascending: true }); 

      if (waitingError) throw waitingError;

      const activeWindows = [1, 2, 3, 4].map(w => ({
        windowNumber: w,
        ticket: servingData?.find(t => t.window_number === w) || null
      }));
      
      setAllServingWindows(activeWindows);
      setCurrentTicket(servingData?.find(t => t.window_number === windowNumber) || null);
      setWaitingTickets(waitingData || []);
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      if (showLoadingState) setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!departmentId) return;
    fetchDashboardData(true); 
    const intervalId = setInterval(() => fetchDashboardData(false), 3000);
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, windowNumber]);

  // ==========================
  // MUTATIONS
  // ==========================
  const handleCallNext = async () => {
    if (!departmentId || !windowNumber) return;
    setLoading(true);

    try {
      if (currentTicket && currentTicket.window_number === windowNumber) {
        await supabase
          .from('tickets')
          .update({ status: 'COMPLETED' })
          .eq('id', currentTicket.id);
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: nextTickets, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', departmentId)
        .eq('status', 'WAITING')
        .gte('created_at', startOfToday.toISOString())
        .order('is_priority', { ascending: false }) 
        .order('created_at', { ascending: true })   
        .limit(1);

      if (fetchError) throw fetchError;

      if (!nextTickets || nextTickets.length === 0) {
        alert("THERE IS NO ONE WAITING IN THIS QUEUE!");
        setCurrentTicket(null); 
        setLoading(false);
        return;
      }

      const nextTicket = nextTickets[0];

      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update({ 
            status: 'SERVING',
            called_at: new Date().toISOString(),
            window_number: windowNumber
        })
        .eq('id', nextTicket.id)
        .eq('status', 'WAITING') 
        .select()
        .single(); 

      if (updateError) {
         console.warn("Ticket grabbed by another window, trying again...");
         return handleCallNext(); 
      }

      fetchDashboardData(false);
      setCurrentTicket(updatedTicket);

    } catch (error) {
      console.error("Error calling next ticket:", error);
      alert("FAILED TO CALL NEXT STUDENT.");
    } finally {
      setLoading(false); 
    }
  };

  const handleRepeatCall = async () => {
    if (!currentTicket) return;
    
    setLoading(true);
    try {
      const newTimestamp = new Date().toISOString();
      
      const { error } = await supabase
        .from('tickets')
        .update({ called_at: newTimestamp })
        .eq('id', currentTicket.id);

      if (error) throw error;

      setCurrentTicket(prev => ({ ...prev, called_at: newTimestamp }));
      fetchDashboardData(false);

    } catch (error) {
      console.error("Error repeating call:", error);
      alert("FAILED TO BROADCAST REPEAT COMMAND.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('queue_user');
    navigate('/login', { replace: true });
  };

  if (!session) return null; // Prevent render until session is verified

  const allPriority = waitingTickets.filter(t => t.is_priority);
  const allRegular = waitingTickets.filter(t => !t.is_priority);
  const topPriority = allPriority.slice(0, 8);
  const topRegular = allRegular.slice(0, 8);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, display: 'flex', flexDirection: 'row', gap: '2vw', padding: '2vw', fontFamily: '"Inter", "Segoe UI", sans-serif', overflow: 'hidden', textTransform: 'uppercase', boxSizing: 'border-box' }}>
      
      {/* ============================== */}
      {/* LEFT SIDEBAR: 4-COLUMN QUEUE   */}
      {/* ============================== */}
      <div style={{ flex: 1, backgroundColor: theme.surface, borderRadius: '1.5vw', border: `0.2vw solid ${theme.outlineLight}`, display: 'flex', flexDirection: 'column', padding: '3vh 2vw', boxShadow: '0 1vh 2vh rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
        
        <div style={{ borderBottom: `0.15vw solid ${theme.outlineLight}`, paddingBottom: '2vh', marginBottom: '3vh', flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h2 style={{ fontSize: '2.2vh', color: theme.textDark, margin: 0, fontWeight: '900', letterSpacing: '0.1vw' }}>
            DEPARTMENT OVERVIEW
          </h2>
          <p style={{ fontSize: '1.6vh', color: theme.textMuted, margin: 0, fontWeight: '800' }}>
            {waitingTickets.length} WAITING TOTAL
          </p>
        </div>

        <div style={{ marginBottom: '3vh', flex: '0 0 auto' }}>
          <h3 style={{ fontSize: '1.4vh', color: theme.textMuted, margin: '0 0 1vh 0', fontWeight: '800', letterSpacing: '0.1vw' }}>ACTIVE COUNTERS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1vh' }}>
            {allServingWindows.map((win) => (
              <div key={win.windowNumber} style={{ backgroundColor: win.ticket ? theme.accentGreen : theme.background, color: win.ticket ? theme.surface : theme.textMuted, borderRadius: '0.8vw', border: `0.15vw solid ${win.ticket ? theme.accentGreen : theme.outlineLight}`, padding: '1.5vh 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.2vh', fontWeight: '800', opacity: 0.8, marginBottom: '0.5vh' }}>WIN {win.windowNumber}</span>
                <span style={{ fontSize: '2vh', fontWeight: '900', letterSpacing: '0.05vw' }}>
                  {win.ticket ? win.ticket.ticket_number : 'IDLE'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginBottom: '2vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1vh' }}>
            <h3 style={{ fontSize: '1.4vh', color: theme.priorityText, margin: 0, fontWeight: '800', letterSpacing: '0.1vw' }}>PRIORITY</h3>
            {allPriority.length > 8 && <span style={{ fontSize: '1.2vh', color: theme.textMuted, fontWeight: '700' }}>+{allPriority.length - 8} MORE</span>}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'min-content', gap: '1vh', flex: 1, alignContent: 'start' }}>
            {topPriority.length === 0 ? (
              <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, borderRadius: '1vw', border: `0.15vw dashed ${theme.outlineLight}`, padding: '2vh' }}>
                <span style={{ fontSize: '1.4vh', color: theme.disabledText, fontWeight: '700' }}>EMPTY</span>
              </div>
            ) : (
              topPriority.map((ticket) => (
                <div key={ticket.id} style={{ backgroundColor: theme.priorityBadge, color: theme.priorityText, borderRadius: '0.6vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1vh 0', boxShadow: '0 0.5vh 1vh rgba(146, 64, 14, 0.05)' }}>
                  <span style={{ fontSize: '1.8vh', fontWeight: '900', letterSpacing: '0.05vw' }}>{ticket.ticket_number}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1vh' }}>
            <h3 style={{ fontSize: '1.4vh', color: theme.textMuted, margin: 0, fontWeight: '800', letterSpacing: '0.1vw' }}>REGULAR</h3>
            {allRegular.length > 8 && <span style={{ fontSize: '1.2vh', color: theme.textMuted, fontWeight: '700' }}>+{allRegular.length - 8} MORE</span>}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'min-content', gap: '1vh', flex: 1, alignContent: 'start' }}>
            {topRegular.length === 0 ? (
              <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, borderRadius: '1vw', border: `0.15vw dashed ${theme.outlineLight}`, padding: '2vh' }}>
                <span style={{ fontSize: '1.4vh', color: theme.disabledText, fontWeight: '700' }}>EMPTY</span>
              </div>
            ) : (
              topRegular.map((ticket) => (
                <div key={ticket.id} style={{ backgroundColor: theme.regularBadge, color: theme.regularText, borderRadius: '0.6vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1vh 0', boxShadow: '0 0.5vh 1vh rgba(0, 0, 0, 0.02)' }}>
                  <span style={{ fontSize: '1.8vh', fontWeight: '900', letterSpacing: '0.05vw' }}>{ticket.ticket_number}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ============================== */}
      {/* RIGHT SIDE: STAFF COCKPIT      */}
      {/* ============================== */}
      <div style={{ flex: 1, backgroundColor: theme.surface, borderRadius: '1.5vw', border: `0.3vw solid ${theme.outline}`, boxShadow: '0 1vh 3vh rgba(10,46,21,0.06)', display: 'flex', flexDirection: 'column', padding: '4vh 4vw', boxSizing: 'border-box' }}>
        
        <div style={{ borderBottom: `0.15vw solid ${theme.outlineLight}`, paddingBottom: '3vh', marginBottom: '4vh', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: '0 0 auto' }}>
          <h1 style={{ fontSize: '3.5vh', color: theme.textDark, margin: 0, fontWeight: '900', letterSpacing: '0.15vw' }}>
            STAFF CONTROL
          </h1>
          
          <button 
            onClick={handleLogout}
            style={{ padding: '1.5vh 2vw', backgroundColor: theme.dangerBg, color: theme.dangerText, border: `0.15vw solid ${theme.dangerBorder}`, borderRadius: '0.6vw', fontSize: '1.4vh', fontWeight: '900', letterSpacing: '0.1vw', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            🚪 LOCK STATION
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: '2vw', marginBottom: '4vh', flex: '0 0 auto' }}>
          
          {/* LOCKED DEPARTMENT */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8vh' }}>
            <label style={{ fontSize: '1.4vh', fontWeight: '800', color: theme.textMuted, letterSpacing: '0.05vw' }}>ASSIGNED DEPARTMENT</label>
            <div style={{ width: '100%', padding: '1.8vh 1vw', fontSize: '1.8vh', fontWeight: '900', color: theme.surface, backgroundColor: theme.accentGreen, border: `0.2vw solid ${theme.outline}`, borderRadius: '0.8vw', textAlign: 'center', letterSpacing: '0.1vw', boxSizing: 'border-box' }}>
              {departmentName}
            </div>
          </div>

          {/* LOCKED WINDOW */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8vh' }}>
            <label style={{ fontSize: '1.4vh', fontWeight: '800', color: theme.textMuted, letterSpacing: '0.05vw' }}>STATION NUMBER</label>
            <div style={{ width: '100%', padding: '1.8vh 1vw', fontSize: '1.8vh', fontWeight: '900', color: theme.textDark, backgroundColor: theme.surface, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '0.8vw', textAlign: 'center', letterSpacing: '0.1vw', boxSizing: 'border-box' }}>
              WINDOW 0{windowNumber}
            </div>
          </div>
        </div>

        <div style={{ border: `0.2vw solid ${theme.outline}`, borderRadius: '1vw', padding: '4vh 2vw', textAlign: 'center', backgroundColor: theme.background, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '4vh' }}>
          <p style={{ fontSize: '1.6vh', fontWeight: '800', color: theme.textMuted, margin: '0 0 1vh 0', letterSpacing: '0.2vw' }}>MY CURRENT TICKET</p>
          
          {isFetching ? (
             <div style={{ fontSize: '2.5vh', color: theme.textMuted, fontWeight: '700', letterSpacing: '0.1vw', padding: '4vh 0' }}>
               SYNCING DATABASE...
             </div>
          ) : currentTicket ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '9vh', color: theme.textDark, margin: '1vh 0', fontWeight: '900', letterSpacing: '-0.2vw', lineHeight: 1 }}>
                {currentTicket.ticket_number}
              </h2>
              
              <button 
                onClick={handleRepeatCall} 
                disabled={isBusy}
                style={{ marginTop: '3vh', padding: '1.5vh 3vw', fontSize: '1.6vh', fontWeight: '800', letterSpacing: '0.1vw', cursor: isBusy ? 'not-allowed' : 'pointer', borderRadius: '0.6vw', border: `0.15vw solid ${theme.outline}`, backgroundColor: isBusy ? theme.disabledBg : theme.surface, color: isBusy ? theme.disabledText : theme.textDark }}
              >
                {isBusy ? 'UPDATING...' : 'BROADCAST REPEAT CALL TO TV'}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '2.2vh', color: theme.textMuted, fontWeight: '700', letterSpacing: '0.05vw', padding: '4vh 0' }}>
              STATION INACTIVE • NO ACTIVE DISPATCH
            </div>
          )}
        </div>

        <button 
          onClick={handleCallNext} 
          disabled={isBusy}
          style={{ 
            padding: '3vh 2vw', 
            fontSize: '2.5vh', 
            letterSpacing: '0.15vw',
            backgroundColor: isBusy ? theme.disabledBg : theme.accentGreen, 
            color: isBusy ? theme.disabledText : theme.surface, 
            border: isBusy ? `0.2vw solid ${theme.disabledText}` : `0.2vw solid ${theme.outline}`, 
            borderRadius: '1vw', 
            cursor: isBusy ? 'not-allowed' : 'pointer',
            width: '100%',
            flex: '0 0 auto',
            fontWeight: '900',
            boxShadow: isBusy ? 'none' : '0 0.5vh 1.5vh rgba(46,125,50,0.15)'
          }}
        >
          {currentTicket ? 'COMPLETE & CALL NEXT' : 'START DISPATCH CALL'}
        </button>

      </div>
    </div>
  );
}