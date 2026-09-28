import { useState } from 'react';
import { loginUser, registerUser, getCurrentUser } from '../services/api';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConsent, setRegConsent] = useState(true);

  // Status & Error
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginUser(loginEmail.trim(), loginPassword);
      const token = data.access_token;
      localStorage.setItem('token', token);
      
      const userProfile = await getCurrentUser(token);
      onAuthSuccess(token, userProfile);
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión. Verificá tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!regConsent) {
      setError('Debés aceptar el consentimiento para el tratamiento de datos (Ley 25.326).');
      return;
    }

    if (regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // 1. Registrar usuario
      await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        data_consent: regConsent
      });

      // 2. Auto iniciar sesión
      const loginData = await loginUser(regEmail.trim(), regPassword);
      const token = loginData.access_token;
      localStorage.setItem('token', token);

      const userProfile = await getCurrentUser(token);
      onAuthSuccess(token, userProfile);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-card" style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>
            {mode === 'login' ? '🔑 Iniciar Sesión' : '📝 Registrarse'}
          </h2>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#888' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
          <button
            onClick={() => { setMode('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: 'none',
              borderBottom: mode === 'login' ? '3px solid #00b3a4' : 'none',
              fontWeight: mode === 'login' ? 'bold' : 'normal',
              color: mode === 'login' ? '#00b3a4' : '#666',
              cursor: 'pointer'
            }}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: 'none',
              borderBottom: mode === 'register' ? '3px solid #00b3a4' : 'none',
              fontWeight: mode === 'register' ? 'bold' : 'normal',
              color: mode === 'register' ? '#00b3a4' : '#666',
              cursor: 'pointer'
            }}
          >
            Crear Cuenta
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#ffe6e6', color: '#d32f2f', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Correo electrónico:
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Contraseña:
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="******"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#ccc' : '#00b3a4',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Nombre completo:
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Correo electrónico:
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="tu@correo.com"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Contraseña (mínimo 6 caracteres):
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="******"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <input
                type="checkbox"
                id="consent-check"
                checked={regConsent}
                onChange={(e) => setRegConsent(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <label htmlFor="consent-check" style={{ fontSize: '0.85rem', color: '#555' }}>
                Autorizo explícitamente el tratamiento de mis datos personales en conformidad con la <strong>Ley 25.326</strong>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#ccc' : '#00b3a4',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Registrando...' : 'Crear Cuenta y Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '16px'
};

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  maxWidth: '450px',
  width: '100%',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  boxSizing: 'border-box',
  fontSize: '0.95rem'
};
