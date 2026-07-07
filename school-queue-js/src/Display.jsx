import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Display() {
  const [departmentId, setDepartmentId] = useState(1); 
  const [servingWindows, setServingWindows] = useState([]);
  const [waitingTickets, setWaitingTickets] = useState([]);
  
  const [displaySettings, setDisplaySettings] = useState({ type: 'TEXT', content: 'WELCOME TO OUR SCHOOL' });

  const theme = {
    background: '#FFFFFF',       
    surface: '#F8FAFC',          
    surfaceHighlight: '#F1F5F9', 
    textMain: '#0F172A',         
    textMuted: '#475569',        
    textDim: '#94A3B8',          
    accentGreen: '#15803D',      
    outline: '#E2E8F0',          
    priorityBg: '#FEF08A',       
    priorityText: '#854D0E'      
  };

  useEffect(() => {
    const fetchLiveQueue = async () => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const isoStart = startOfToday.toISOString();

        const { data: servingData } = await supabase
          .from('tickets')
          .select('*')
          .eq('status', 'SERVING')
          .eq('department_id', departmentId)
          .gte('created_at', isoStart)
          .order('called_at', { ascending: false });

        const activeWindows = [1, 2, 3, 4].map(windowNum => {
          const activeTicket = servingData?.find(t => t.window_number === windowNum);
          return {
            windowNumber: windowNum,
            ticket: activeTicket || null
          };
        });

        const { data: waitingData } = await supabase
          .from('tickets')
          .select('*')
          .eq('status', 'WAITING')
          .eq('department_id', departmentId)
          .gte('created_at', isoStart)
          .order('is_priority', { ascending: false }) 
          .order('created_at', { ascending: true })
          .limit(16); 

        const { data: settingsData } = await supabase
          .from('display_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (settingsData) {
          setDisplaySettings({ type: settingsData.media_type, content: settingsData.media_content });
        }

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

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    try {
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        videoId = urlParams.get('v');
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split('?')[0];
      }
    } catch (e) {
      console.error("Invalid YouTube URL");
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0` : '';
  };

  return (
    <>
      {/* INJECT KEYFRAMES FOR ANIMATED BACKGROUND */}
      <style>
        {`
          @keyframes movingGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>

      <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, display: 'flex', flexDirection: 'column', fontFamily: '"Inter", "Segoe UI", sans-serif', overflow: 'hidden', textTransform: 'uppercase', boxSizing: 'border-box' }}>
        
        {/* ============================== */}
        {/* HEADER SECTION                 */}
        {/* ============================== */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `0.3vw solid ${theme.outline}`, padding: '1.5vh 3vw', backgroundColor: theme.background, flex: '0 0 auto', zIndex: 10 }}>
          <h1 style={{ margin: 0, color: theme.textMain, fontSize: '3.5vh', fontWeight: '900', letterSpacing: '0.2vw' }}>
            {deptName} <span style={{ color: theme.accentGreen }}>QUEUE</span>
          </h1>
          
          <select 
            value={departmentId} 
            onChange={(e) => setDepartmentId(parseInt(e.target.value))}
            style={{ padding: '0.8vh 1.5vw', fontSize: '1.6vh', fontWeight: '800', backgroundColor: theme.surface, color: theme.textMuted, border: `0.2vw solid ${theme.outline}`, borderRadius: '0.5vw', cursor: 'pointer', outline: 'none' }}
          >
            <option value={1}>VIEW REGISTRAR TV</option>
            <option value={2}>VIEW ACCOUNTING TV</option>
          </select>
        </header>

        {/* ============================== */}
        {/* MAIN SPLIT SCREEN BODY         */}
        {/* ============================== */}
        <div style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>
          
          {/* ================================== */}
          {/* LEFT SIDE: QUEUE (50% Width)       */}
          {/* ================================== */}
          <div style={{ width: '50%', padding: '2vw', display: 'flex', flexDirection: 'column', borderRight: `0.3vw solid ${theme.outline}`, boxSizing: 'border-box', backgroundColor: theme.surface }}>
            
            {/* NOW SERVING (4 Columns) */}
            <div style={{ flex: '0 0 auto', marginBottom: '3vh' }}>
              <h2 style={{ fontSize: '2vh', color: theme.textMuted, margin: '0 0 1.5vh 0', fontWeight: '900', letterSpacing: '0.2vw' }}>
                NOW SERVING
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1vw' }}>
                {servingWindows.map((win) => (
                  <div key={win.windowNumber} style={{ backgroundColor: theme.background, border: `0.2vw solid ${win.ticket ? theme.accentGreen : theme.outline}`, borderRadius: '0.8vw', padding: '1.5vh 0.5vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: win.ticket ? `0 0.5vh 1.5vh rgba(21, 128, 61, 0.15)` : '0 0.5vh 1vh rgba(0,0,0,0.02)', transition: 'all 0.3s ease' }}>
                    
                    <div style={{ backgroundColor: win.ticket ? theme.accentGreen : theme.surfaceHighlight, color: win.ticket ? theme.background : theme.textDim, padding: '0.5vh 1vw', borderRadius: '2vw', fontSize: '1.2vh', fontWeight: '900', letterSpacing: '0.1vw', marginBottom: '1vh' }}>
                      WIN {win.windowNumber}
                    </div>

                    {win.ticket ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3.5vh', fontWeight: '900', color: theme.textMain, letterSpacing: '-0.1vw', lineHeight: 1, marginBottom: '0.5vh' }}>
                          {win.ticket.ticket_number}
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: '4vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.4vh', color: theme.textDim, fontWeight: '800', letterSpacing: '0.1vw' }}>READY</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* NEXT IN LINE (4 Column Grid) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '2vh', color: theme.textMuted, margin: '0 0 1.5vh 0', fontWeight: '900', letterSpacing: '0.2vw' }}>
                NEXT IN LINE
              </h2>
              
              <div style={{ flex: 1, backgroundColor: theme.background, borderRadius: '1vw', border: `0.2vw solid ${theme.outline}`, padding: '1.5vw', boxShadow: '0 0.5vh 1vh rgba(0,0,0,0.02)' }}>
                 {waitingTickets.length === 0 ? (
                   <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ fontSize: '2vh', color: theme.textDim, fontWeight: '800', letterSpacing: '0.1vw' }}>
                        QUEUE IS EMPTY
                      </p>
                   </div>
                 ) : (
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'min-content', gap: '1vw', alignContent: 'start' }}>
                     {waitingTickets.map((ticket) => (
                       <div key={ticket.id} style={{ backgroundColor: theme.surfaceHighlight, padding: '1.5vh 1vw', borderRadius: '0.6vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                         
                         <span style={{ fontSize: '2.2vh', fontWeight: '900', color: theme.textMain, letterSpacing: '0.1vw' }}>
                           {ticket.ticket_number}
                         </span>
                         
                         {ticket.is_priority && (
                           <span style={{ backgroundColor: theme.priorityBg, color: theme.priorityText, padding: '0.3vh 0.8vw', borderRadius: '0.4vw', fontSize: '1vh', fontWeight: '900', letterSpacing: '0.05vw', marginTop: '0.5vh' }}>
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
          {/* RIGHT SIDE: DYNAMIC MEDIA (50% W)  */}
          {/* ================================== */}
          <div style={{ 
            width: '50%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxSizing: 'border-box', 
            position: 'relative', 
            overflow: 'hidden',
            /* The Animated Background */
            background: 'linear-gradient(-45deg, #0F172A, #15803D, #062812, #0F172A)',
            backgroundSize: '400% 400%',
            animation: 'movingGradient 15s ease infinite'
          }}>
            
            {displaySettings.type === 'VIDEO' && (
              <video 
                src={displaySettings.content} 
                autoPlay 
                loop 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} 
              />
            )}

            {displaySettings.type === 'YOUTUBE' && (
              <iframe
                width="100%"
                height="100%"
                src={getYouTubeEmbedUrl(displaySettings.content)}
                title="YouTube Ad"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }} 
              ></iframe>
            )}

            {displaySettings.type === 'IMAGE' && (
              <img 
                src={displaySettings.content} 
                alt="School Media"
                style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0 }} 
              />
            )}

            {displaySettings.type === 'TEXT' && (
              <div style={{ padding: '5vw', textAlign: 'center', zIndex: 1 }}>
                <h2 style={{ 
                  color: '#FFFFFF', 
                  fontSize: '5vh', 
                  fontWeight: '900', 
                  letterSpacing: '0.2vw', 
                  lineHeight: 1.4,
                  textShadow: '0 1vh 3vh rgba(0,0,0,0.5)'
                }}>
                  {displaySettings.content}
                </h2>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}