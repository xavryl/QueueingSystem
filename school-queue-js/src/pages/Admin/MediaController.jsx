import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { adminTheme as theme } from '../../utils/theme';

export default function MediaController({ deptId }) {
  // If the admin has no locked department (Master Admin), default to 1 (Registrar)
  const [targetDeptId, setTargetDeptId] = useState(deptId || 1);
  const targetDeptName = targetDeptId === 1 ? 'REGISTRAR' : 'ACCOUNTING';

  const [mediaType, setMediaType] = useState('TEXT');
  const [mediaContent, setMediaContent] = useState('');
  
  // Styling States
  const [bgColor, setBgColor] = useState('#0F172A');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontFamily, setFontFamily] = useState('system-ui, -apple-system, sans-serif');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Debugging States
  const [showDebug, setShowDebug] = useState(false);
  const [debugLog, setDebugLog] = useState({ action: 'INITIALIZE', status: 'WAITING' });

  // Standard web-safe built-in fonts
  const builtInFonts = [
    { label: 'System Default (Sans-Serif)', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Impact', value: 'Impact, sans-serif' }
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('display_settings')
          .select('*')
          .eq('id', targetDeptId)
          .single();

        if (error && error.code !== 'PGRST116') {
          setDebugLog({ action: 'FETCH_TV_SETTINGS', error: error });
          console.error("Error fetching media settings:", error);
        } else {
          setDebugLog({ action: 'FETCH_TV_SETTINGS', data: data || 'NO_DATA_FOUND' });
        }

        if (data) {
          setMediaType(data.media_type || 'TEXT');
          setMediaContent(data.media_content || '');
          setBgColor(data.bg_color || '#0F172A');
          setTextColor(data.text_color || '#FFFFFF');
          setFontFamily(data.font_family || 'system-ui, -apple-system, sans-serif');
        } else {
          // Reset to defaults if no data exists for this ID yet
          setMediaType('TEXT');
          setMediaContent('');
          setBgColor('#0F172A');
          setTextColor('#FFFFFF');
          setFontFamily('system-ui, -apple-system, sans-serif');
        }
      } catch (err) {
        setDebugLog({ action: 'FETCH_SYSTEM_ERROR', error: err.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [targetDeptId]);

  const handleSaveMedia = async () => {
    setIsSaving(true);
    try {
      const payload = { 
        media_type: mediaType, 
        media_content: mediaContent,
        bg_color: bgColor,
        text_color: textColor,
        font_family: fontFamily
      };

      const { data, error } = await supabase
        .from('display_settings')
        .upsert({ id: targetDeptId, ...payload })
        .select();

      if (error) {
        setDebugLog({ action: 'SAVE_TV_SETTINGS', error: error });
        throw error;
      }
      
      setDebugLog({ action: 'SAVE_TV_SETTINGS', data: data });
      alert(`${targetDeptName} TV DISPLAY UPDATED SUCCESSFULLY!`);
    } catch (error) {
      console.error("Error saving:", error);
      alert("FAILED TO UPDATE TV. Check Debug Console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    try {
      if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
      else if (url.includes('youtube.com/watch')) videoId = new URLSearchParams(url.split('?')[1]).get('v');
      else if (url.includes('youtube.com/embed/')) videoId = url.split('youtube.com/embed/')[1].split('?')[0];
    } catch (e) {
      return '';
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0` : '';
  };

  return (
    <div style={{ maxWidth: '80vw', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER & TV SELECTOR */}
      <div style={{ borderBottom: `0.15vw solid ${theme.outlineLight}`, paddingBottom: '2vh', marginBottom: '4vh', flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ 
  fontSize: '3.5vh', 
  margin: '0 0 1vh 0', 
  fontWeight: '900', 
  letterSpacing: '0.1vw',
  color: theme.textDark // This ensures it matches the rest of your app
}}>
  TV CONTROLLER
</h2>
          <p style={{ color: theme.textMuted, margin: 0, fontSize: '1.6vh', fontWeight: '700' }}>
            Select a department to update and preview its public display.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2vw' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh' }}>
            <label style={{ fontSize: '1.2vh', fontWeight: '900', color: theme.accentGreen, letterSpacing: '0.05vw' }}>TARGET DISPLAY</label>
            <select 
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(parseInt(e.target.value))}
              disabled={isLoading || isSaving}
              style={{ padding: '1vh 1.5vw', fontSize: '1.6vh', fontWeight: '800', backgroundColor: theme.surface, color: theme.textDark, border: `0.2vw solid ${theme.accentGreen}`, borderRadius: '0.5vw', cursor: 'pointer', outline: 'none' }}
            >
              <option value={1}>📺 REGISTRAR TV</option>
              <option value={2}>📺 ACCOUNTING TV</option>
            </select>
          </div>
          
          <button 
            onClick={() => setShowDebug(!showDebug)}
            style={{ padding: '1.5vh', backgroundColor: theme.disabledBg, color: theme.textMuted, border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', fontSize: '1.4vh', fontWeight: '800', cursor: 'pointer' }}
          >
            {showDebug ? 'HIDE DEBUG' : '🐞 SHOW DEBUG'}
          </button>
        </div>
      </div>

      {/* DEBUG CONSOLE OVERLAY */}
      {showDebug && (
        <div style={{ flex: '0 0 auto', backgroundColor: '#1E293B', color: '#10B981', padding: '2vh', borderRadius: '0.8vw', marginBottom: '3vh', fontFamily: 'monospace', fontSize: '1.2vh', maxHeight: '15vh', overflowY: 'auto', border: '0.2vw solid #0F172A' }}>
          <div style={{ fontWeight: '900', marginBottom: '1vh', color: '#F8FAFC' }}>SYSTEM LOG (DEPT ID: {targetDeptId})</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {JSON.stringify(debugLog, null, 2)}
          </pre>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '4vh', color: theme.textMuted, fontWeight: '800', textAlign: 'center' }}>
          LOADING {targetDeptName} MEDIA SETTINGS...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '3vw', flex: 1, overflowY: 'auto', alignItems: 'flex-start' }}>
          
          {/* LEFT COLUMN: CONTROLS */}
          <div style={{ flex: 1, backgroundColor: theme.surface, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '1vw', padding: '4vh 3vw', boxShadow: '0 1vh 2vh rgba(0,0,0,0.03)' }}>
            
            <label style={{ display: 'block', fontSize: '1.4vh', fontWeight: '800', color: theme.textMuted, marginBottom: '1vh', letterSpacing: '0.05vw' }}>
              MEDIA FORMAT TYPE
            </label>
            <select 
              value={mediaType} 
              onChange={(e) => setMediaType(e.target.value)}
              style={{ width: '100%', padding: '1.8vh', backgroundColor: theme.background, color: theme.textDark, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '0.6vw', marginBottom: '4vh', fontSize: '1.8vh', fontWeight: '700', outline: 'none' }}
            >
              <option value="TEXT">ANNOUNCEMENT TEXT</option>
              <option value="IMAGE">IMAGE URL (JPG/PNG)</option>
              <option value="VIDEO">DIRECT VIDEO URL (.MP4)</option>
              <option value="YOUTUBE">YOUTUBE LINK</option>
            </select>

            <label style={{ display: 'block', fontSize: '1.4vh', fontWeight: '800', color: theme.textMuted, marginBottom: '1vh', letterSpacing: '0.05vw' }}>
              {mediaType === 'TEXT' ? 'ANNOUNCEMENT MESSAGE' : 'MEDIA URL LINK'}
            </label>
            
            {mediaType === 'TEXT' ? (
              <textarea 
                value={mediaContent} 
                onChange={(e) => setMediaContent(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '1.8vh', backgroundColor: theme.background, color: theme.textDark, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '0.6vw', marginBottom: '4vh', fontSize: '1.8vh', fontWeight: '700', resize: 'vertical', outline: 'none' }}
                placeholder="Enter your announcement here..."
              />
            ) : (
              <input 
                type="text"
                value={mediaContent} 
                onChange={(e) => setMediaContent(e.target.value)}
                style={{ width: '100%', padding: '1.8vh', backgroundColor: theme.background, color: theme.textDark, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '0.6vw', marginBottom: '4vh', fontSize: '1.8vh', fontWeight: '700', outline: 'none' }}
                placeholder="https://example.com/media.mp4"
              />
            )}

            {/* CONDITIONAL STYLING OPTIONS FOR TEXT */}
            {mediaType === 'TEXT' && (
              <div style={{ backgroundColor: theme.background, padding: '3vh 2vw', borderRadius: '0.8vw', border: `0.15vw dashed ${theme.outlineLight}`, marginBottom: '4vh' }}>
                <h3 style={{ fontSize: '1.6vh', fontWeight: '900', margin: '0 0 2vh 0', color: theme.textDark }}>TEXT STYLING CONFIGURATION</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                  
                  <div style={{ display: 'flex', gap: '2vw' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1vh' }}>
                      <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>BACKGROUND</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', border: `0.2vw solid ${theme.outlineLight}`, padding: '0.5vh', borderRadius: '0.6vw', backgroundColor: theme.surface }}>
                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: '4vh', height: '4vh', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.3vw' }} />
                        <span style={{ fontSize: '1.4vh', fontWeight: '700', color: theme.textDark }}>{bgColor.toUpperCase()}</span>
                      </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1vh' }}>
                      <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>TEXT COLOR</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', border: `0.2vw solid ${theme.outlineLight}`, padding: '0.5vh', borderRadius: '0.6vw', backgroundColor: theme.surface }}>
                        <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: '4vh', height: '4vh', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.3vw' }} />
                        <span style={{ fontSize: '1.4vh', fontWeight: '700', color: theme.textDark }}>{textColor.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1vh' }}>
                    <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>FONT FAMILY</label>
                    <select 
                      value={fontFamily} 
                      onChange={(e) => setFontFamily(e.target.value)}
                      style={{ width: '100%', padding: '1.4vh', backgroundColor: theme.surface, color: theme.textDark, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '0.6vw', fontSize: '1.4vh', fontWeight: '700', outline: 'none', fontFamily: fontFamily }}
                    >
                      {builtInFonts.map((font) => (
                        <option key={font.label} value={font.value} style={{ fontFamily: font.value }}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>
            )}

            <button 
              onClick={handleSaveMedia}
              disabled={isSaving}
              style={{ width: '100%', padding: '2.5vh', backgroundColor: isSaving ? theme.disabledBg : theme.accentGreen, color: isSaving ? theme.disabledText : theme.surface, border: 'none', borderRadius: '0.8vw', fontSize: '2vh', fontWeight: '900', letterSpacing: '0.15vw', cursor: isSaving ? 'wait' : 'pointer', transition: 'all 0.2s ease', boxShadow: isSaving ? 'none' : '0 0.5vh 1.5vh rgba(46,125,50,0.15)' }}
            >
              {isSaving ? 'SYNCING TO TV...' : `PUBLISH TO ${targetDeptName} TV`}
            </button>
          </div>

          {/* RIGHT COLUMN: LIVE PREVIEW */}
          <div style={{ flex: 1, backgroundColor: theme.surface, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '1vw', padding: '4vh 3vw', boxShadow: '0 1vh 2vh rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 2vh 0', fontSize: '2vh', fontWeight: '900', color: theme.textDark, letterSpacing: '0.1vw' }}>
              {targetDeptName} PREVIEW
            </h3>
            
            <div style={{ 
              width: '100%', 
              aspectRatio: '16/9', 
              backgroundColor: mediaType === 'TEXT' ? bgColor : '#000000',
              borderRadius: '0.5vw',
              overflow: 'hidden',
              position: 'relative',
              border: `0.2vw solid ${theme.outlineLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1vh 2vh rgba(0,0,0,0.2)'
            }}>
              
              {mediaType === 'VIDEO' && mediaContent && (
                <video src={mediaContent} autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}

              {mediaType === 'YOUTUBE' && mediaContent && (
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={getYouTubeEmbedUrl(mediaContent)} 
                  frameBorder="0" 
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {mediaType === 'IMAGE' && mediaContent && (
                <img src={mediaContent} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}

              {mediaType === 'TEXT' && (
                <div style={{ padding: '3vw', textAlign: 'center', zIndex: 1, width: '100%' }}>
                  <h2 style={{
                    color: textColor,
                    fontFamily: fontFamily,
                    fontSize: '3vh',
                    fontWeight: '900',
                    letterSpacing: '0.1vw',
                    lineHeight: 1.4,
                    margin: 0,
                    wordBreak: 'break-word'
                  }}>
                    {mediaContent || 'Preview your announcement text here...'}
                  </h2>
                </div>
              )}

              {mediaType !== 'TEXT' && !mediaContent && (
                <span style={{ color: '#475569', fontSize: '1.6vh', fontWeight: '800' }}>AWAITING MEDIA URL...</span>
              )}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}