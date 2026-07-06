import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Display() {
  const [departmentId, setDepartmentId] = useState(1); 
  const [servingWindows, setServingWindows] = useState([]);
  const [waitingTickets, setWaitingTickets] = useState([]);

  // Daylight / Outdoor High-Contrast Theme
  const theme = {
    background: '#FFFFFF',       // Pure white for maximum outdoor visibility
    surface: '#F8FAFC',          // Very subtle cool gray for cards
    surfaceHighlight: '#F1F5F9', // Slightly darker gray for empty states
    textMain: '#0F172A',         // Near black for primary text
    textMuted: '#475569',        // Slate gray for secondary text
    textDim: '#94A3B8',          // Light slate for inactive states
    accentGreen: '#15803D',      // Bold, dark green for active highlights
    outline: '#E2E8F0',          // Crisp, light borders
    priorityBg: '#FEF08A',       // Bright yellow for priority badges
    priorityText: '#854D0E'      // Dark brown/amber for priority text
  };

  useEffect(() => {
    const fetchLiveQueue = async () => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const isoStart = startOfToday.toISOString();

        // 1. Fetch ALL serving tickets
        const { data: servingData } = await supabase
          .from('tickets')
          .select('*')
          .eq('status', 'SERVING')
          .eq('department_id', departmentId)
          .gte('created_at', isoStart)
          .order('called_at', { ascending: false });

        // 2. Map to 4 Windows
        const activeWindows = [1, 2, 3, 4].map(windowNum => {
          const activeTicket = servingData?.find(t => t.window_number === windowNum);
          return {
            windowNumber: windowNum,
            ticket: activeTicket || null
          };
        });

        // 3. Fetch waiting tickets (Limited to 8 to perfectly fit the half-screen layout)
        const { data: waitingData } = await supabase
          .from('tickets')
          .select('*')
          .eq('status', 'WAITING')
          .eq('department_id', departmentId)
          .gte('created_at', isoStart)
          .order('is_priority', { ascending: false }) 
          .order('created_at', { ascending: true })
          .limit(8); 

        setServingWindows(activeWindows);
        setWaitingTickets(waitingData || []);

      } catch (error) {
        console.error("Error fetching display data:", error);
      }
    };

    fetchLiveQueue();
    const intervalId = setInterval(fetchLiveQueue, 2000);
    return () => clearInterval(intervalId);
    
  }, [departmentId]); 

  const deptName = departmentId === 1 ? 'REGISTRAR' : departmentId === 2 ? 'CASHIER' : 'ADMISSIONS';

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, display: 'flex', flexDirection: 'column', fontFamily: '"Inter", "Segoe UI", sans-serif', overflow: 'hidden', textTransform: 'uppercase', boxSizing: 'border-box' }}>
      
      {/* ============================== */}
      {/* HEADER SECTION                 */}
      {/* ============================== */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `0.3vw solid ${theme.outline}`, padding: '2vh 3vw', backgroundColor: theme.background, flex: '0 0 auto', zIndex: 10 }}>
        <h1 style={{ margin: 0, color: theme.textMain, fontSize: '4vh', fontWeight: '900', letterSpacing: '0.2vw' }}>
          {deptName} <span style={{ color: theme.accentGreen }}>QUEUE STATUS</span>
        </h1>
        
        <select 
          value={departmentId} 
          onChange={(e) => setDepartmentId(parseInt(e.target.value))}
          style={{ padding: '1vh 2vw', fontSize: '1.8vh', fontWeight: '800', backgroundColor: theme.surface, color: theme.textMuted, border: `0.2vw solid ${theme.outline}`, borderRadius: '0.8vw', cursor: 'pointer', outline: 'none' }}
        >
          <option value={1}>VIEW REGISTRAR TV</option>
          <option value={2}>VIEW CASHIER TV</option>

        </select>
      </header>

      {/* ============================== */}
      {/* MAIN SPLIT SCREEN BODY         */}
      {/* ============================== */}
      <div style={{ display: 'flex', flex: 1, width: '100%' }}>
        
        {/* ================================== */}
        {/* LEFT SIDE: QUEUE (50% Width)       */}
        {/* ================================== */}
        <div style={{ width: '50%', padding: '3vw', display: 'flex', flexDirection: 'column', borderRight: `0.3vw solid ${theme.outline}`, boxSizing: 'border-box', backgroundColor: theme.surface }}>
          
          {/* NOW SERVING (2x2 Grid to fit 4 windows in half the screen) */}
          <div style={{ flex: '0 0 auto', marginBottom: '4vh' }}>
            <h2 style={{ fontSize: '2.2vh', color: theme.textMuted, margin: '0 0 2vh 0', fontWeight: '900', letterSpacing: '0.3vw' }}>
              NOW SERVING
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5vw' }}>
              {servingWindows.map((win) => (
                <div key={win.windowNumber} style={{ backgroundColor: theme.background, border: `0.3vw solid ${win.ticket ? theme.accentGreen : theme.outline}`, borderRadius: '1vw', padding: '2.5vh 2vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: win.ticket ? `0 1vh 3vh rgba(21, 128, 61, 0.15)` : '0 0.5vh 1vh rgba(0,0,0,0.02)', transition: 'all 0.3s ease' }}>
                  
                  <div style={{ backgroundColor: win.ticket ? theme.accentGreen : theme.surfaceHighlight, color: win.ticket ? theme.background : theme.textDim, padding: '0.8vh 2vw', borderRadius: '3vw', fontSize: '1.6vh', fontWeight: '900', letterSpacing: '0.15vw', marginBottom: '1.5vh' }}>
                    WINDOW {win.windowNumber}
                  </div>

                  {win.ticket ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '6vh', fontWeight: '900', color: theme.textMain, letterSpacing: '-0.1vw', lineHeight: 1, marginBottom: '1vh' }}>
                        {win.ticket.ticket_number}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '7vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '2vh', color: theme.textDim, fontWeight: '800', letterSpacing: '0.2vw' }}>AVAILABLE</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* NEXT IN LINE (2 Column Grid) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '2.2vh', color: theme.textMuted, margin: '0 0 2vh 0', fontWeight: '900', letterSpacing: '0.3vw' }}>
              NEXT IN LINE
            </h2>
            
            <div style={{ flex: 1, backgroundColor: theme.background, borderRadius: '1vw', border: `0.2vw solid ${theme.outline}`, padding: '2vw', boxShadow: '0 0.5vh 1vh rgba(0,0,0,0.02)' }}>
               {waitingTickets.length === 0 ? (
                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '2.5vh', color: theme.textDim, fontWeight: '800', letterSpacing: '0.1vw' }}>
                      QUEUE IS EMPTY
                    </p>
                 </div>
               ) : (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: 'min-content', gap: '1.5vw', alignContent: 'start' }}>
                   {waitingTickets.map((ticket) => (
                     <div key={ticket.id} style={{ backgroundColor: theme.surfaceHighlight, padding: '2vh', borderRadius: '0.8vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       
                       <span style={{ fontSize: '2.8vh', fontWeight: '900', color: theme.textMain, letterSpacing: '0.1vw' }}>
                         {ticket.ticket_number}
                       </span>
                       
                       {ticket.is_priority && (
                         <span style={{ backgroundColor: theme.priorityBg, color: theme.priorityText, padding: '0.5vh 1vw', borderRadius: '0.5vw', fontSize: '1.4vh', fontWeight: '900', letterSpacing: '0.05vw' }}>
                           PRIORITY
                         </span>
                       )}

                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>

        </div>

        {/* ================================== */}
        {/* RIGHT SIDE: SOCIAL MEDIA (50% W)   */}
        {/* ================================== */}
        <div style={{ width: '50%', backgroundColor: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', position: 'relative' }}>
          
          {/* Placeholder for Video/Image Ads */}
          <span style={{ fontSize: '8vw', marginBottom: '2vh' }}>📺</span>
          <h2 style={{ color: '#FFFFFF', fontSize: '3vh', fontWeight: '900', letterSpacing: '0.1vw', margin: '0 0 1vh 0' }}>
            SCHOOL MEDIA & ANNOUNCEMENTS
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '1.8vh', fontWeight: '600' }}>
            50% WIDTH DEDICATED CONTAINER
          </p>

          {/* Just an example of how you'd embed a video or image later:
          <video 
             src="/your-school-ad.mp4" 
             autoPlay 
             loop 
             muted 
             style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} 
          /> 
          */}
        </div>

      </div>
    </div>
  );
}