import { useNavigate } from 'react-router-dom';
import { adminTheme as theme } from '../../utils/theme';

export default function AdminSidebar({ activeTab, setActiveTab }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('queue_user');
    navigate('/login');
  };

  const getTabStyle = (tabName) => ({
    padding: '2vh 1.5vw', 
    textAlign: 'left', 
    backgroundColor: activeTab === tabName ? theme.accentGreen : 'transparent', 
    color: activeTab === tabName ? theme.surface : theme.textMuted, 
    border: `0.15vw solid ${activeTab === tabName ? theme.accentGreen : 'transparent'}`, 
    borderRadius: '0.8vw', 
    fontWeight: '800', 
    fontSize: '1.6vh', 
    cursor: 'pointer', 
    transition: 'all 0.2s ease'
  });

  return (
    <div style={{ width: '22vw', backgroundColor: theme.surface, borderRight: `0.2vw solid ${theme.outlineLight}`, padding: '4vh 2vw', display: 'flex', flexDirection: 'column', boxShadow: '0 0 2vh rgba(0,0,0,0.02)', zIndex: 10 }}>
      <h1 style={{ fontSize: '3vh', fontWeight: '900', letterSpacing: '0.15vw', margin: '0 0 5vh 0', color: theme.textDark }}>
        ADMIN<span style={{ color: theme.accentGreen }}>PORTAL</span>
      </h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vh', flex: 1 }}>
        <button onClick={() => setActiveTab('MEDIA')} style={getTabStyle('MEDIA')}>📺 TV MEDIA CONTROLLER</button>
        <button onClick={() => setActiveTab('HISTORY')} style={getTabStyle('HISTORY')}>📊 QUEUE HISTORY & LOGS</button>
        <button onClick={() => setActiveTab('USERS')} style={getTabStyle('USERS')}>👥 STAFF MANAGEMENT</button>
        <button onClick={() => setActiveTab('SETTINGS')} style={getTabStyle('SETTINGS')}>⚙️ SYSTEM SETTINGS</button>
      </div>

      <button onClick={handleLogout} style={{ padding: '2vh 1.5vw', backgroundColor: theme.dangerBg, color: theme.dangerText, border: `0.15vw solid ${theme.dangerBorder}`, borderRadius: '0.8vw', fontWeight: '900', fontSize: '1.6vh', cursor: 'pointer' }}>
        🚪 LOGOUT
      </button>
    </div>
  );
}