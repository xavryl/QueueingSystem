import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminTheme as theme } from '../../utils/theme';

import AdminSidebar from './AdminSidebar';
import MediaController from './MediaController';
import QueueHistory from './QueueHistory';
import StaffManagement from './StaffManagement';
import SystemSettings from './SystemSettings';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('MEDIA'); 
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('queue_user'));
    if (!session || session.role !== 'ADMIN') {
      navigate('/login');
    } else {
      setIsLoading(false);
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '3vh', color: theme.textDark }}>
        LOADING SYSTEM...
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, color: theme.textDark, fontFamily: '"Inter", "Segoe UI", sans-serif', display: 'flex', flexDirection: 'row', textTransform: 'uppercase', boxSizing: 'border-box' }}>
      
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={{ flex: 1, padding: '5vh 4vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'MEDIA' && <MediaController />}
        {activeTab === 'HISTORY' && <QueueHistory />}
        {activeTab === 'USERS' && <StaffManagement />}
        {activeTab === 'SETTINGS' && <SystemSettings />}
      </div>
      
    </div>
  );
}