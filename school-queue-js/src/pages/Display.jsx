import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'; 

export default function Display() {
  const [departmentId, setDepartmentId] = useState(1);
  const [servingWindows, setServingWindows] = useState([]);
  const [waitingTickets, setWaitingTickets] = useState([]);
  
  // Added new styling properties to the default state
  const [displaySettings, setDisplaySettings] = useState({ 
    type: 'TEXT', 
    content: 'WELCOME TO OUR SCHOOL',
    bgColor: '#0F172A',
    textColor: '#FFFFFF',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });

  // --- AUDIO LOGIC ---
  const { speak, voices } = useSpeechSynthesis();
  const lastAnnouncedRef = useRef(new Date().toISOString());

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

  const announceTicket = (ticketNumber, deptId, winNum) => {
    if (!ticketNumber) return;
    const rawNumber = ticketNumber.split('-')[1];
    const cleanNumber = parseInt(rawNumber, 10);
    const deptName = deptId === 1 ? 'REGISTRAR' : deptId === 2 ? 'ACCOUNTING' : 'ADMISSIONS';
    const text = `${deptName} TICKET NUMBER ${cleanNumber}, PLEASE PROCEED TO WINDOW ${winNum}.`;
    
    const femaleVoice = voices.find(v => 
      (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha')) && v.localService
    );
    const selectedVoice = femaleVoice || voices.find(v => v.localService) || voices[0];

    speak({
      text: text,
      voice: selectedVoice,
      rate: 0.85
    });
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

        if (servingData && servingData.length > 0) {
          const mostRecentTicket = servingData.reduce((latest, current) => {
            return (new Date(current.called_at) > new Date(latest.called_at)) ? current : latest;
          });

          if (new Date(mostRecentTicket.called_at) > new Date(lastAnnouncedRef.current)) {
            lastAnnouncedRef.current = mostRecentTicket.called_at;
            announceTicket(mostRecentTicket.ticket_number, mostRecentTicket.department_id, mostRecentTicket.window_number);
          }
        }

        const activeWindows = [1, 2, 3, 4].map(windowNum => {
          const activeTicket = servingData?.find(t => t.window_number === windowNum);
          return { windowNumber: windowNum, ticket: activeTicket || null };
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

        // ARCHITECTURAL FIX: Use departmentId to fetch the correct TV settings!
        const { data: settingsData } = await supabase
          .from('display_settings')
          .select('*')
          .eq('id', departmentId)
          .single();

        if (settingsData) {
          setDisplaySettings({ 
            type: settingsData.media_type, 
            content: settingsData.media_content,
            bgColor: settingsData.bg_color || '#0F172A',
            textColor: settingsData.text_color || '#FFFFFF',
            fontFamily: settingsData.font_family || 'system-ui, -apple-system, sans-serif'
          });
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, voices]); 

  const deptName = departmentId === 1 ? 'REGISTRAR' : departmentId === 2 ? 'ACCOUNTING' : 'ADMISSIONS';

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
      <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, display: 'flex', flexDirection: 'column', fontFamily: '"Inter", "Segoe UI", sans-serif', overflow: 'hidden', textTransform: 'uppercase', boxSizing: 'border-box' }}>

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `0.3vw solid ${theme.outline}`, padding: '2vh 3vw', backgroundColor: theme.background, flex: '0 0 auto', zIndex: 10 }}>
          <h1 style={{ margin: 0, color: theme.textMain, fontSize: '4.5vh', fontWeight: '900', letterSpacing: '0.2vw' }}>
            {deptName} <span style={{ color: theme.accentGreen }}>QUEUE</span>
          </h1>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(parseInt(e.target.value))}
            style={{ padding: '1vh 1.5vw', fontSize: '2vh', fontWeight: '800', backgroundColor: theme.surface, color: theme.textMuted, border: `0.2vw solid ${theme.outline}`, borderRadius: '0.5vw', cursor: 'pointer', outline: 'none' }}
          >
            <option value={1}>VIEW REGISTRAR TV</option>
            <option value={2}>VIEW ACCOUNTING TV</option>
          </select>
        </header>

        <div style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>

          <div style={{ width: '50%', padding: '2vw', display: 'flex', flexDirection: 'column', borderRight: `0.3vw solid ${theme.outline}`, boxSizing: 'border-box', backgroundColor: theme.surface }}>

            <div style={{ flex: '0 0 auto', marginBottom: '3vh' }}>
              <h2 style={{ fontSize: '2.8vh', color: theme.textMuted, margin: '0 0 1.5vh 0', fontWeight: '900', letterSpacing: '0.2vw' }}>
                NOW SERVING
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1vw' }}>
                {servingWindows.map((win) => (
                  <div key={win.windowNumber} style={{ backgroundColor: theme.background, border: `0.2vw solid ${win.ticket ? theme.accentGreen : theme.outline}`, borderRadius: '0.8vw', padding: '2vh 1vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: win.ticket ? `0 0.5vh 1.5vh rgba(21, 128, 61, 0.15)` : '0 0.5vh 1vh rgba(0,0,0,0.02)', transition: 'all 0.3s ease' }}>

                    <div style={{ backgroundColor: win.ticket ? theme.accentGreen : theme.surfaceHighlight, color: win.ticket ? theme.background : theme.textDim, padding: '0.8vh 1.2vw', borderRadius: '2vw', fontSize: '1.6vh', fontWeight: '900', letterSpacing: '0.1vw', marginBottom: '1.5vh' }}>
                      WIN {win.windowNumber}
                    </div>

                    {win.ticket ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '5.5vh', fontWeight: '900', color: theme.textMain, letterSpacing: '-0.1vw', lineHeight: 1, marginBottom: '0.5vh' }}>
                          {win.ticket.ticket_number}
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: '5.5vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '2vh', color: theme.textDim, fontWeight: '800', letterSpacing: '0.1vw' }}>READY</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '2.8vh', color: theme.textMuted, margin: '0 0 1.5vh 0', fontWeight: '900', letterSpacing: '0.2vw' }}>
                NEXT IN LINE
              </h2>

              <div style={{ flex: 1, backgroundColor: theme.background, borderRadius: '1vw', border: `0.2vw solid ${theme.outline}`, padding: '2vw', boxShadow: '0 0.5vh 1vh rgba(0,0,0,0.02)' }}>
                {waitingTickets.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '3vh', color: theme.textDim, fontWeight: '800', letterSpacing: '0.1vw' }}>
                      QUEUE IS EMPTY
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'min-content', gap: '1vw', alignContent: 'start' }}>
                    {waitingTickets.map((ticket) => (
                      <div key={ticket.id} style={{ backgroundColor: theme.surfaceHighlight, padding: '2vh 1vw', borderRadius: '0.6vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

                        <span style={{ fontSize: '3.2vh', fontWeight: '900', color: theme.textMain, letterSpacing: '0.1vw' }}>
                          {ticket.ticket_number}
                        </span>

                        {ticket.is_priority && (
                          <span style={{ backgroundColor: theme.priorityBg, color: theme.priorityText, padding: '0.5vh 1vw', borderRadius: '0.4vw', fontSize: '1.4vh', fontWeight: '900', letterSpacing: '0.05vw', marginTop: '1vh' }}>
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

          {/* DYNAMIC MEDIA PANEL */}
          <div style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: displaySettings.type === 'TEXT' ? displaySettings.bgColor : '#000000'
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
                  color: displaySettings.textColor,
                  fontFamily: displaySettings.fontFamily,
                  fontSize: '7vh',
                  fontWeight: '900',
                  letterSpacing: '0.2vw',
                  lineHeight: 1.4
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