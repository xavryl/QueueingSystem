import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const theme = {
    background: '#F9FAFB', surface: '#FFFFFF', textDark: '#0A2E15', 
    textMuted: '#4B5563', outlineLight: '#E5E7EB', accentGreen: '#2E7D32',
    dangerText: '#DC2626'
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (dbError || !data) {
        throw new Error('Invalid username or password');
      }

      // Save session locally
      // Inside your handleLogin try-block
// Save session locally (Inside Login.jsx -> handleLogin)
      localStorage.setItem('queue_user', JSON.stringify({
        username: data.username,
        role: data.role,
        department_id: data.department_id, // <-- THIS MUST BE HERE
        window_number: data.window_number
      }));

      // Route based on role
      if (data.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/registrar'); // Or let them choose their department
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: theme.background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
      <div style={{ backgroundColor: theme.surface, padding: '5vh 3vw', borderRadius: '1vw', boxShadow: '0 2vh 4vh rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', border: `0.2vw solid ${theme.outlineLight}` }}>
        
        <div style={{ textAlign: 'center', marginBottom: '4vh' }}>
          <h1 style={{ fontSize: '3.5vh', color: theme.textDark, margin: '0 0 1vh 0', fontWeight: '900', letterSpacing: '0.1vw' }}>SYSTEM LOGIN</h1>
          <p style={{ color: theme.textMuted, fontSize: '1.6vh', margin: 0, fontWeight: '700' }}>Enter your staff credentials</p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', color: theme.dangerText, padding: '1.5vh', borderRadius: '0.5vw', marginBottom: '2vh', fontSize: '1.4vh', fontWeight: '800', textAlign: 'center', border: '0.15vw solid #F87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '2.5vh' }}>
          <div>
            <label style={{ display: 'block', fontSize: '1.4vh', fontWeight: '800', color: theme.textMuted, marginBottom: '1vh', letterSpacing: '0.05vw' }}>USERNAME</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '1.8vh', fontSize: '1.6vh', fontWeight: '700', borderRadius: '0.6vw', border: `0.2vw solid ${theme.outlineLight}`, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '1.4vh', fontWeight: '800', color: theme.textMuted, marginBottom: '1vh', letterSpacing: '0.05vw' }}>PASSWORD</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '1.8vh', fontSize: '1.6vh', fontWeight: '700', borderRadius: '0.6vw', border: `0.2vw solid ${theme.outlineLight}`, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            style={{ marginTop: '1vh', padding: '2vh', backgroundColor: theme.accentGreen, color: theme.surface, border: 'none', borderRadius: '0.8vw', fontSize: '1.8vh', fontWeight: '900', letterSpacing: '0.1vw', cursor: isLoading ? 'wait' : 'pointer' }}
          >
            {isLoading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
          </button>
        </form>
      </div>
    </div>
  );
}