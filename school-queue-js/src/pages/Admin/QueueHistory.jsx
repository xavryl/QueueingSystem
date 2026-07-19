import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { adminTheme as theme } from '../../utils/theme';

export default function QueueHistory() {
  const [historyTickets, setHistoryTickets] = useState([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [timeFilter, setTimeFilter] = useState('ALL'); 
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(''); 
  
  // Custom Time
  const [customTimeFrom, setCustomTimeFrom] = useState('08:00');
  const [customTimeTo, setCustomTimeTo] = useState('17:00');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      setIsFetchingHistory(true);
      try {
        const startLimit = new Date(dateFilter);
        const endLimit = new Date(dateFilter);

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

        let query = supabase
          .from('tickets')
          .select('*')
          .gte('created_at', startLimit.toISOString())
          .lte('created_at', endLimit.toISOString())
          .order('created_at', { ascending: false });

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
  }, [dateFilter, deptFilter, priorityOnly, timeFilter, customTimeFrom, customTimeTo, statusFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, deptFilter, priorityOnly, timeFilter, statusFilter, searchQuery]);

  // Helpers
  const getDeptName = (id) => id === 1 ? 'REGISTRAR' : id === 2 ? 'ACCOUNTING' : 'UNKNOWN';
  const formatTime = (isoString) => isoString ? new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  const filteredHistory = historyTickets.filter(ticket => 
    searchQuery === '' || ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header & Filter Controls */}
      <div style={{ borderBottom: `0.15vw solid ${theme.outlineLight}`, paddingBottom: '2vh', marginBottom: '2vh', display: 'flex', flexDirection: 'column', gap: '2vh', flex: '0 0 auto' }}>
        <div>
          <h2 style={{ fontSize: '3.5vh', margin: '0 0 1vh 0', fontWeight: '900', letterSpacing: '0.1vw' }}>QUEUE HISTORY & LOGS</h2>
          <p style={{ color: theme.textMuted, margin: 0, fontSize: '1.6vh', fontWeight: '700' }}>Review, search, and filter past queue performance.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5vw', flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: theme.surface, padding: '2vh 2vw', borderRadius: '0.8vw', border: `0.15vw solid ${theme.outlineLight}` }}>
          
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
  );
}