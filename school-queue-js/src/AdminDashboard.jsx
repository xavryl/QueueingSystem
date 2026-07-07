import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('MEDIA'); 
  
  // ==========================
  // MEDIA CONTROLLER STATE
  // ==========================
  const [mediaType, setMediaType] = useState('TEXT');
  const [mediaContent, setMediaContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ==========================
  // HISTORY & ANALYTICS STATE
  // ==========================
  const [historyTickets, setHistoryTickets] = useState([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [timeFilter, setTimeFilter] = useState('ALL'); 
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(''); 
  
  // Custom Time Setup
  const [customTimeFrom, setCustomTimeFrom] = useState('08:00');
  const [customTimeTo, setCustomTimeTo] = useState('17:00');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ==========================
  // SETTINGS STATE
  // ==========================
  const [isResetting, setIsResetting] = useState(false);
  const [resetTarget, setResetTarget] = useState('ALL');

  // Theme Object
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
    dangerBg: '#FEF2F2',
    dangerText: '#DC2626',
    dangerBorder: '#F87171'
  };

  // 1. Initial Load - Settings
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
      if (error) console.error("Error fetching settings:", error);
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  // 2. Fetch History Logic
  useEffect(() => {
    if (activeTab !== 'HISTORY') return;

    const fetchHistory = async () => {
      setIsFetchingHistory(true);
      try {
        const startLimit = new Date(dateFilter);
        const endLimit = new Date(dateFilter);

        // Time calculations
        if (timeFilter === 'ALL') {
          startLimit.setHours(0, 0, 0, 0);
          endLimit.setHours(23, 59, 59, 999);
        } else if (timeFilter === 'AM') {
          startLimit.setHours(0, 0, 0, 0);
          endLimit.setHours(11, 59, 59, 999);
        } else if (timeFilter === 'PM') {
          startLimit.setHours(12, 0, 0, 0);
          endLimit.setHours(23, 59, 59, 999);
        } else if (timeFilter === 'CUSTOM') {
          const [fH, fM] = customTimeFrom.split(':');
          const [tH, tM] = customTimeTo.split(':');
          startLimit.setHours(parseInt(fH || 0), parseInt(fM || 0), 0, 0);
          endLimit.setHours(parseInt(tH || 23), parseInt(tM || 59), 59, 999);
        }

        // Build Database Query
        let query = supabase
          .from('tickets')
          .select('*')
          .gte('created_at', startLimit.toISOString())
          .lte('created_at', endLimit.toISOString())
          .order('created_at', { ascending: false });

        // Apply Status Filter at Database level
        if (statusFilter === 'ALL') {
          query = query.in('status', ['COMPLETED', 'CANCELLED']);
        } else {
          query = query.eq('status', statusFilter);
        }

        if (deptFilter !== 'ALL') query = query.eq('department_id', parseInt(deptFilter));
        if (priorityOnly) query = query.eq('is_priority', true);

        const { data, error } = await query;
        if (error) throw error;
        
        setHistoryTickets(data || []);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsFetchingHistory(false);
      }
    };

    fetchHistory();
  }, [activeTab, dateFilter, deptFilter, priorityOnly, timeFilter, customTimeFrom, customTimeTo, statusFilter]);

  // 3. Reset Pagination when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, deptFilter, priorityOnly, timeFilter, statusFilter, searchQuery]);

  // ==========================
  // HANDLERS
  // ==========================
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

  // ==========================
  // HELPERS & DATA PROCESSING
  // ==========================
  const getDeptName = (id) => {
    if (id === 1) return 'REGISTRAR';
    if (id === 2) return 'ACCOUNTING';
    return 'UNKNOWN';
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Client-Side Search Filtering
  const filteredHistory = historyTickets.filter(ticket => 
    searchQuery === '' || ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) return <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, color: theme.textDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '3vh' }}>LOADING SYSTEM...</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, color: theme.textDark, fontFamily: '"Inter", "Segoe UI", sans-serif', display: 'flex', flexDirection: 'row', textTransform: 'uppercase', boxSizing: 'border-box' }}>
      
      {/* ============================== */}
      {/* SIDEBAR NAVIGATION             */}
      {/* ============================== */}
      <div style={{ width: '22vw', backgroundColor: theme.surface, borderRight: `0.2vw solid ${theme.outlineLight}`, padding: '4vh 2vw', display: 'flex', flexDirection: 'column', boxShadow: '0 0 2vh rgba(0,0,0,0.02)', zIndex: 10 }}>
        <h1 style={{ fontSize: '3vh', fontWeight: '900', letterSpacing: '0.15vw', margin: '0 0 5vh 0', color: theme.textDark }}>
          ADMIN<span style={{ color: theme.accentGreen }}>PORTAL</span>
        </h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vh' }}>
          <button 
            onClick={() => setActiveTab('MEDIA')}
            style={{ padding: '2vh 1.5vw', textAlign: 'left', backgroundColor: activeTab === 'MEDIA' ? theme.accentGreen : 'transparent', color: activeTab === 'MEDIA' ? theme.surface : theme.textMuted, border: `0.15vw solid ${activeTab === 'MEDIA' ? theme.accentGreen : 'transparent'}`, borderRadius: '0.8vw', fontWeight: '800', fontSize: '1.6vh', cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.1vw' }}
          >
            📺 TV MEDIA CONTROLLER
          </button>
          
          <button 
            onClick={() => setActiveTab('HISTORY')}
            style={{ padding: '2vh 1.5vw', textAlign: 'left', backgroundColor: activeTab === 'HISTORY' ? theme.accentGreen : 'transparent', color: activeTab === 'HISTORY' ? theme.surface : theme.textMuted, border: `0.15vw solid ${activeTab === 'HISTORY' ? theme.accentGreen : 'transparent'}`, borderRadius: '0.8vw', fontWeight: '800', fontSize: '1.6vh', cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.1vw' }}
          >
            📊 QUEUE HISTORY & LOGS
          </button>

          <button 
            onClick={() => setActiveTab('SETTINGS')}
            style={{ padding: '2vh 1.5vw', textAlign: 'left', backgroundColor: activeTab === 'SETTINGS' ? theme.accentGreen : 'transparent', color: activeTab === 'SETTINGS' ? theme.surface : theme.textMuted, border: `0.15vw solid ${activeTab === 'SETTINGS' ? theme.accentGreen : 'transparent'}`, borderRadius: '0.8vw', fontWeight: '800', fontSize: '1.6vh', cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.1vw' }}
          >
            ⚙️ SYSTEM SETTINGS
          </button>
        </div>
      </div>

      {/* ============================== */}
      {/* MAIN CONTENT AREA              */}
      {/* ============================== */}
      <div style={{ flex: 1, padding: '5vh 4vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* --- TAB: MEDIA CONTROLLER --- */}
        {activeTab === 'MEDIA' && (
          <div style={{ maxWidth: '80vw', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: `0.15vw solid ${theme.outlineLight}`, paddingBottom: '2vh', marginBottom: '4vh', flex: '0 0 auto' }}>
              <h2 style={{ fontSize: '3.5vh', margin: '0 0 1vh 0', fontWeight: '900', letterSpacing: '0.1vw' }}>TV DISPLAY CONTROLLER</h2>
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
        )}

        {/* --- TAB: TICKET HISTORY --- */}
        {activeTab === 'HISTORY' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Header & Filter Controls */}
            <div style={{ borderBottom: `0.15vw solid ${theme.outlineLight}`, paddingBottom: '2vh', marginBottom: '2vh', display: 'flex', flexDirection: 'column', gap: '2vh', flex: '0 0 auto' }}>
              <div>
                <h2 style={{ fontSize: '3.5vh', margin: '0 0 1vh 0', fontWeight: '900', letterSpacing: '0.1vw' }}>QUEUE HISTORY & LOGS</h2>
                <p style={{ color: theme.textMuted, margin: 0, fontSize: '1.6vh', fontWeight: '700' }}>Review, search, and filter past queue performance.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '1.5vw', flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: theme.surface, padding: '2vh 2vw', borderRadius: '0.8vw', border: `0.15vw solid ${theme.outlineLight}` }}>
                
                {/* Search Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh', flex: '1 1 200px' }}>
                  <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>SEARCH TICKET</label>
                  <input 
                    type="text" 
                    placeholder="E.g., 001"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '1vh 1vw', fontSize: '1.4vh', fontWeight: '700', border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', outline: 'none' }} 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh' }}>
                  <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>DATE</label>
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: '1vh 1vw', fontSize: '1.4vh', fontWeight: '700', border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', outline: 'none' }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh' }}>
                  <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>DEPARTMENT</label>
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ padding: '1vh 1vw', fontSize: '1.4vh', fontWeight: '700', border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', outline: 'none' }}>
                    <option value="ALL">ALL DEPTS</option>
                    <option value="1">REGISTRAR</option>
                    <option value="2">ACCOUNTING</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh' }}>
                  <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>STATUS</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '1vh 1vw', fontSize: '1.4vh', fontWeight: '700', border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', outline: 'none' }}>
                    <option value="ALL">ALL STATUSES</option>
                    <option value="COMPLETED">COMPLETED ONLY</option>
                    <option value="CANCELLED">CANCELLED (RESET)</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh' }}>
                  <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>TYPE</label>
                  <select value={priorityOnly ? 'PRIORITY' : 'ALL'} onChange={(e) => setPriorityOnly(e.target.value === 'PRIORITY')} style={{ padding: '1vh 1vw', fontSize: '1.4vh', fontWeight: '700', border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', outline: 'none' }}>
                    <option value="ALL">ALL TICKETS</option>
                    <option value="PRIORITY">PRIORITY ONLY</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh' }}>
                  <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>SHIFT</label>
                  <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ padding: '1vh 1vw', fontSize: '1.4vh', fontWeight: '700', border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', outline: 'none' }}>
                    <option value="ALL">ALL DAY</option>
                    <option value="AM">AM ONLY</option>
                    <option value="PM">PM ONLY</option>
                    <option value="CUSTOM">CUSTOM...</option>
                  </select>
                </div>
                
                {timeFilter === 'CUSTOM' && (
                  <div style={{ display: 'flex', gap: '1vw' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh' }}>
                      <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>FROM</label>
                      <input type="time" value={customTimeFrom} onChange={(e) => setCustomTimeFrom(e.target.value)} style={{ padding: '1vh 1vw', fontSize: '1.4vh', fontWeight: '700', border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh' }}>
                      <label style={{ fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted }}>TO</label>
                      <input type="time" value={customTimeTo} onChange={(e) => setCustomTimeTo(e.target.value)} style={{ padding: '1vh 1vw', fontSize: '1.4vh', fontWeight: '700', border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', outline: 'none' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History Table Container */}
            <div style={{ flex: 1, backgroundColor: theme.surface, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '1vw', boxShadow: '0 1vh 2vh rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1.5fr 1fr 1fr', padding: '2vh 3vw', backgroundColor: theme.background, borderBottom: `0.2vw solid ${theme.outlineLight}`, fontWeight: '900', fontSize: '1.4vh', color: theme.textMuted, letterSpacing: '0.1vw', flex: '0 0 auto' }}>
                <div>TICKET</div>
                <div>DEPARTMENT</div>
                <div>WINDOW</div>
                <div>STATUS</div>
                <div>ISSUED</div>
                <div>CALLED</div>
              </div>

              {/* Table Data */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 1vw' }}>
                {isFetchingHistory ? (
                  <div style={{ textAlign: 'center', padding: '5vh', color: theme.textMuted, fontWeight: '800', fontSize: '1.8vh' }}>LOADING DATA...</div>
                ) : paginatedHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '5vh', color: theme.disabledText, fontWeight: '800', fontSize: '1.8vh' }}>NO TICKETS MATCH YOUR FILTERS/SEARCH.</div>
                ) : (
                  paginatedHistory.map((ticket) => (
                    <div key={ticket.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1.5fr 1fr 1fr', padding: '2vh 2vw', borderBottom: `0.1vw solid ${theme.outlineLight}`, alignItems: 'center', fontSize: '1.6vh', fontWeight: '700', color: theme.textDark }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
                        <span style={{ fontSize: '2vh', fontWeight: '900' }}>{ticket.ticket_number}</span>
                        {ticket.is_priority && <span style={{ backgroundColor: theme.priorityBadge, color: theme.priorityText, padding: '0.3vh 0.6vw', borderRadius: '0.4vw', fontSize: '1vh', fontWeight: '900' }}>PRI</span>}
                      </div>
                      
                      <div>{getDeptName(ticket.department_id)}</div>
                      
                      <div>
                        <span style={{ backgroundColor: theme.disabledBg, padding: '0.5vh 1vw', borderRadius: '0.5vw' }}>
                          WIN {ticket.window_number || '-'}
                        </span>
                      </div>
                      
                      <div>
                        <span style={{ color: ticket.status === 'CANCELLED' ? theme.dangerText : theme.accentGreen, fontWeight: '900' }}>
                          {ticket.status}
                        </span>
                      </div>
                      
                      <div style={{ color: theme.textMuted }}>{formatTime(ticket.created_at)}</div>
                      <div style={{ color: theme.textMuted }}>{formatTime(ticket.called_at)}</div>
                      
                    </div>
                  ))
                )}
              </div>
              
              {/* Pagination Controls */}
              <div style={{ padding: '2vh 3vw', borderTop: `0.2vw solid ${theme.outlineLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.background, flex: '0 0 auto' }}>
                <span style={{ fontSize: '1.4vh', fontWeight: '800', color: theme.textMuted }}>
                  SHOWING PAGE {currentPage} OF {totalPages} ({filteredHistory.length} TOTAL)
                </span>
                
                <div style={{ display: 'flex', gap: '1vw' }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '1vh 2vw', fontSize: '1.4vh', fontWeight: '800', backgroundColor: currentPage === 1 ? theme.disabledBg : theme.surface, color: currentPage === 1 ? theme.disabledText : theme.textDark, border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    PREV
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '1vh 2vw', fontSize: '1.4vh', fontWeight: '800', backgroundColor: currentPage === totalPages ? theme.disabledBg : theme.surface, color: currentPage === totalPages ? theme.disabledText : theme.textDark, border: `0.15vw solid ${theme.outlineLight}`, borderRadius: '0.5vw', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    NEXT
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB: SYSTEM SETTINGS --- */}
        {activeTab === 'SETTINGS' && (
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
        )}

      </div>
    </div>
  );
}