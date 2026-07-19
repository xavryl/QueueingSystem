import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { adminTheme as theme } from '../../utils/theme';

export default function StaffManagement() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Unified Form State for Create & Update
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'STAFF',
    department_id: 1, 
    window_number: 1 // Default to Window 1
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, role, department_id, window_number, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ username: '', password: '', role: 'STAFF', department_id: 1, window_number: 1 });
  };

  // --- CREATE & UPDATE LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const payload = {
        username: formData.username,
        role: formData.role,
        // Admins don't need a department or window assigned
        department_id: formData.role === 'ADMIN' ? null : parseInt(formData.department_id),
        window_number: formData.role === 'ADMIN' ? null : parseInt(formData.window_number)
      };

      if (editingId) {
        // UPDATE Existing User
        if (formData.password) {
          payload.password = formData.password; 
        }
        
        const { error } = await supabase
          .from('app_users')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        alert("USER UPDATED SUCCESSFULLY.");

      } else {
        // CREATE New User
        if (!formData.password) throw new Error("Password is required for new users.");
        payload.password = formData.password;

        const { error } = await supabase
          .from('app_users')
          .insert([payload]);

        if (error) throw error;
        alert("USER CREATED SUCCESSFULLY.");
      }

      resetForm();
      fetchUsers();

    } catch (error) {
      console.error("Operation failed:", error);
      alert(`OPERATION FAILED: ${error.message || "Username may already exist."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- EDIT PREPARATION ---
  const handleEditClick = (user) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: '', 
      role: user.role,
      department_id: user.department_id || 1,
      window_number: user.window_number || 1
    });
  };

  // --- DELETE LOGIC ---
  const handleDelete = async (id, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete user: ${username}?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("FAILED TO DELETE USER.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getDeptName = (id) => {
    if (id === 1) return 'REGISTRAR';
    if (id === 2) return 'ACCOUNTING';
    return 'N/A';
  };

  return (
    <div style={{ display: 'flex', gap: '3vw', height: '100%' }}>
      
      {/* --- FORM PANEL (CREATE/UPDATE) --- */}
      <div style={{ flex: '1', backgroundColor: theme.surface, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '1vw', padding: '4vh 3vw', boxShadow: '0 1vh 2vh rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3vh' }}>
          <h2 style={{ fontSize: '2.5vh', margin: 0, fontWeight: '900', color: editingId ? theme.accentGreen : theme.textDark }}>
            {editingId ? 'EDIT STAFF ACCOUNT' : 'REGISTER NEW STAFF'}
          </h2>
          {editingId && (
            <button onClick={resetForm} style={{ fontSize: '1.2vh', padding: '0.5vh 1vw', backgroundColor: theme.disabledBg, color: theme.textMuted, border: 'none', borderRadius: '0.4vw', cursor: 'pointer', fontWeight: '800' }}>
              CANCEL EDIT
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted, marginBottom: '0.5vh' }}>USERNAME</label>
            <input 
              type="text" 
              name="username"
              required 
              value={formData.username} 
              onChange={handleInputChange} 
              style={{ width: '100%', padding: '1.5vh', fontSize: '1.6vh', borderRadius: '0.5vw', border: `0.2vw solid ${theme.outlineLight}`, outline: 'none' }} 
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted, marginBottom: '0.5vh' }}>
              PASSWORD {editingId && <span style={{ color: theme.disabledText }}>(Leave blank to keep current)</span>}
            </label>
            <input 
              type="password" 
              name="password"
              required={!editingId} 
              value={formData.password} 
              onChange={handleInputChange} 
              style={{ width: '100%', padding: '1.5vh', fontSize: '1.6vh', borderRadius: '0.5vw', border: `0.2vw solid ${theme.outlineLight}`, outline: 'none' }} 
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted, marginBottom: '0.5vh' }}>ACCOUNT ROLE</label>
            <select 
              name="role"
              value={formData.role} 
              onChange={handleInputChange} 
              style={{ width: '100%', padding: '1.5vh', fontSize: '1.6vh', borderRadius: '0.5vw', border: `0.2vw solid ${theme.outlineLight}`, outline: 'none' }}
            >
              <option value="STAFF">STANDARD STAFF</option>
              <option value="ADMIN">ADMINISTRATOR</option>
            </select>
          </div>

          {/* Department & Window Select (Hidden for Admins) */}
          {formData.role === 'STAFF' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted, marginBottom: '0.5vh' }}>ASSIGNED DEPARTMENT</label>
                <select 
                  name="department_id"
                  value={formData.department_id} 
                  onChange={handleInputChange} 
                  style={{ width: '100%', padding: '1.5vh', fontSize: '1.6vh', borderRadius: '0.5vw', border: `0.2vw solid ${theme.outlineLight}`, outline: 'none' }}
                >
                  <option value={1}>REGISTRAR (REG)</option>
                  <option value={2}>ACCOUNTING (ACT)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '1.2vh', fontWeight: '800', color: theme.textMuted, marginBottom: '0.5vh' }}>ASSIGNED WINDOW</label>
                <select 
                  name="window_number"
                  value={formData.window_number} 
                  onChange={handleInputChange} 
                  style={{ width: '100%', padding: '1.5vh', fontSize: '1.6vh', borderRadius: '0.5vw', border: `0.2vw solid ${theme.outlineLight}`, outline: 'none' }}
                >
                  <option value={1}>WINDOW 01</option>
                  <option value={2}>WINDOW 02</option>
                  <option value={3}>WINDOW 03</option>
                  <option value={4}>WINDOW 04</option>
                </select>
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={isProcessing} 
            style={{ marginTop: '2vh', padding: '2vh', backgroundColor: editingId ? '#0369A1' : theme.accentGreen, color: theme.surface, border: 'none', borderRadius: '0.5vw', fontSize: '1.6vh', fontWeight: '900', cursor: isProcessing ? 'wait' : 'pointer', letterSpacing: '0.1vw' }}
          >
            {isProcessing ? 'PROCESSING...' : editingId ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>

      {/* --- LIST PANEL (READ/DELETE) --- */}
      <div style={{ flex: '2', backgroundColor: theme.surface, border: `0.2vw solid ${theme.outlineLight}`, borderRadius: '1vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '3vh 2vw', borderBottom: `0.2vw solid ${theme.outlineLight}` }}>
          <h2 style={{ fontSize: '2.5vh', margin: 0, fontWeight: '900' }}>ACTIVE ACCOUNTS</h2>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '2vw' }}>
          
          {/* Table Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr 1fr', fontWeight: '900', color: theme.textMuted, fontSize: '1.4vh', borderBottom: `0.1vw solid ${theme.outlineLight}`, paddingBottom: '1vh', marginBottom: '1vh', gap: '1vw' }}>
            <span>USERNAME</span>
            <span>ROLE</span>
            <span>DEPARTMENT</span>
            <span>WINDOW</span>
            <span style={{ textAlign: 'right' }}>ACTIONS</span>
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '4vh', color: theme.textMuted, fontWeight: '800' }}>LOADING USERS...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4vh', color: theme.disabledText, fontWeight: '800' }}>NO USERS FOUND.</div>
          ) : (
            users.map(user => (
              <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr 1fr', padding: '1.5vh 0', borderBottom: `0.1vw solid ${theme.outlineLight}`, fontSize: '1.6vh', fontWeight: '700', alignItems: 'center', gap: '1vw' }}>
                
                <span style={{ color: theme.textDark }}>{user.username}</span>
                
                <span style={{ color: user.role === 'ADMIN' ? theme.dangerText : theme.accentGreen, fontSize: '1.4vh', fontWeight: '900' }}>
                  {user.role}
                </span>
                
                <span style={{ color: theme.textMuted, fontSize: '1.4vh' }}>
                  {user.role === 'ADMIN' ? 'ALL ACCESS' : getDeptName(user.department_id)}
                </span>

                <span style={{ color: theme.textMuted, fontSize: '1.4vh' }}>
                  {user.role === 'ADMIN' ? '-' : `WIN 0${user.window_number}`}
                </span>
                
                <div style={{ display: 'flex', gap: '1vw', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => handleEditClick(user)}
                    disabled={isProcessing}
                    style={{ padding: '0.8vh 1vw', backgroundColor: '#F0F9FF', color: '#0369A1', border: '0.1vw solid #BAE6FD', borderRadius: '0.4vw', fontSize: '1.2vh', fontWeight: '800', cursor: 'pointer' }}
                  >
                    EDIT
                  </button>
                  <button 
                    onClick={() => handleDelete(user.id, user.username)}
                    disabled={isProcessing}
                    style={{ padding: '0.8vh 1vw', backgroundColor: theme.dangerBg, color: theme.dangerText, border: `0.1vw solid ${theme.dangerBorder}`, borderRadius: '0.4vw', fontSize: '1.2vh', fontWeight: '800', cursor: 'pointer' }}
                  >
                    DELETE
                  </button>
                </div>
                
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}