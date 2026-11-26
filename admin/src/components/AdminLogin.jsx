import { useState } from 'react';
import logoImg from '../assets/mali-audio-logo.png';
import { adminApi } from '../services/adminApi';

export default function AdminLogin({ onSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await adminApi.login({ identifier, password });
      if (result.user?.role !== 'admin') {
        throw new Error('Accès refusé : ce compte ne dispose pas des droits administrateur.');
      }
      onSuccess(result.token, result.user);
    } catch (err) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card-box" style={{ width: 'min(420px, 100%)', borderColor: 'var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src={logoImg} alt="Logo Mali Audio" style={{ height: 64, margin: '0 auto 10px' }} />
          <h1 style={{ margin: 0, fontSize: '1.45rem' }}>Administration Mali Audio</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '6px 0 0' }}>
            Accès réservé au promoteur et aux administrateurs autorisés.
          </p>
        </div>

        {error && <div className="alert-err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="adm-id">Identifiant ou e-mail</label>
            <input
              id="adm-id"
              className="input"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@maliaudio.local"
            />
          </div>
          <div className="field">
            <label htmlFor="adm-pass">Mot de passe</label>
            <input
              id="adm-pass"
              type="password"
              className="input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-gold" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter à l’administration'}
          </button>
        </form>
      </div>
    </div>
  );
}
