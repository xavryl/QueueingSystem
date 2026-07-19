import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { adminTheme as theme } from '../../utils/theme';

export default function MediaController() {
  const [mediaType, setMediaType] = useState('TEXT');
  const [mediaContent, setMediaContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('display_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (data) {
        setMediaType(data.media_type);
        setMediaContent(data.media_content);
      }
      if (error) console.error("Error fetching media settings:", error);
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSaveMedia = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('display_settings')
        .update({ media_type: mediaType, media_content: mediaContent })
        .eq('id', 1);

      if (error) throw error;
      alert("TV DISPLAY UPDATED SUCCESSFULLY!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("FAILED TO UPDATE TV.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: '4vh', color: theme.textMuted }}>Loading media settings...</div>;

  return (
    <div style={{ maxWidth: '80vw', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: `0.15vw solid ${theme.outlineLight}`, paddingBottom: '2vh', marginBottom: '4vh', flex: '0 0 auto' }}>
        <h2 style={{ fontSize: '3.5vh', margin: '0 0 1vh 0', fontWeight: '900', letterSpacing: '0.1vw' }}>TV MEDIA CONTROLLER</h2>
        <p style={{ color: theme.textMuted, margin: 0, fontSize: '1.6vh', fontWeight: '700' }}>Update the right-side media panel on the public display instantly.</p>
      </div>

      <div style={{ backgroundColor: theme.surface, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '1vw', padding: '4vh 3vw', boxShadow: '0 1vh 2vh rgba(0,0,0,0.03)', flex: '0 0 auto' }}>
        <label style={{ display: 'block', fontSize: '1.4vh', fontWeight: '800', color: theme.textMuted, marginBottom: '1vh', letterSpacing: '0.05vw' }}>MEDIA FORMAT TYPE</label>
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

        <button 
          onClick={handleSaveMedia}
          disabled={isSaving}
          style={{ width: '100%', padding: '2.5vh', backgroundColor: isSaving ? theme.disabledBg : theme.accentGreen, color: isSaving ? theme.disabledText : theme.surface, border: 'none', borderRadius: '0.8vw', fontSize: '2vh', fontWeight: '900', letterSpacing: '0.15vw', cursor: isSaving ? 'wait' : 'pointer', transition: 'all 0.2s ease', boxShadow: isSaving ? 'none' : '0 0.5vh 1.5vh rgba(46,125,50,0.15)' }}
        >
          {isSaving ? 'SYNCING TO TV...' : 'PUBLISH TO TV DISPLAY'}
        </button>
      </div>
    </div>
  );
}