import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../services/adminApi';

export function DashboardPage({ token, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminApi.dashboard(token)
      .then((res) => { if (active) setData(res); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [token]);

  if (error) return <div className="alert-err">{error}</div>;
  if (!data) return <div className="card-box">Chargement du tableau de bord…</div>;

  const c = data.counts || {};
  const cards = [
    { label: 'Chansons', value: c.songs ?? 0 },
    { label: 'Artistes', value: c.artists ?? 0 },
    { label: 'Albums', value: c.albums ?? 0 },
    { label: 'Singles', value: c.singles ?? 0 },
    { label: 'Vidéos', value: c.videos ?? 0 },
    { label: 'Actualités', value: c.news ?? 0 },
    { label: 'Utilisateurs', value: c.users ?? 0 },
    { label: 'Écoutes cumulées', value: c.total_plays ?? 0 },
  ];

  return (
    <div>
      {data.alerts?.length > 0 && (
        <div className="alert-err">
          <strong>Alertes techniques :</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {data.alerts.map((al, i) => <li key={i}>{al.message}</li>)}
          </ul>
        </div>
      )}

      <div className="kpi-grid">
        {cards.map((card) => (
          <div key={card.label} className="kpi-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="card-box">
        <h2 style={{ marginTop: 0 }}>Actions rapides</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="btn btn-gold" onClick={() => onNavigate('songs')}>+ Ajouter une chanson</button>
          <button type="button" className="btn btn-sec" onClick={() => onNavigate('artists')}>+ Ajouter un artiste</button>
          <button type="button" className="btn btn-sec" onClick={() => onNavigate('albums')}>+ Créer un album / single</button>
          <button type="button" className="btn btn-sec" onClick={() => onNavigate('videos')}>+ Ajouter une vidéo</button>
          <button type="button" className="btn btn-sec" onClick={() => onNavigate('news')}>+ Rédiger une actualité</button>
        </div>
      </div>

      <div className="form-grid">
        <div className="card-box">
          <h2 style={{ marginTop: 0 }}>Dernières chansons ajoutées</h2>
          {data.recentSongs?.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Titre</th><th>Artiste</th><th>Statut</th></tr></thead>
                <tbody>
                  {data.recentSongs.map((s) => (
                    <tr key={s.id}>
                      <td>{s.title}</td>
                      <td>{s.artist_name || '—'}</td>
                      <td><span className={`pill pill-${s.status}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ color: 'var(--text-muted)' }}>Aucun titre pour le moment.</p>}
        </div>

        <div className="card-box">
          <h2 style={{ marginTop: 0 }}>Contenus en brouillon / à vérifier</h2>
          {data.drafts?.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Titre</th><th>Date</th></tr></thead>
                <tbody>
                  {data.drafts.map((d) => (
                    <tr key={`${d.type}-${d.id}`}>
                      <td>{d.type}</td>
                      <td>{d.title}</td>
                      <td>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ color: 'var(--text-muted)' }}>Aucun brouillon en attente.</p>}
        </div>
      </div>
    </div>
  );
}

export function MediaAssetsPage({ token }) {
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    adminApi.listMedia(token).then(setAssets).catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    setError('');
    setMsg('');
    try {
      await adminApi.deleteMedia(id, token);
      setMsg('Ressource média supprimée.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card-box">
      <h2 style={{ marginTop: 0 }}>Stockage & Ressources médias</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
        Les fichiers audio et vidéos importés sont stockés dans l’espace privé serveur et ne sont jamais servis en accès statique public.
      </p>
      {error && <div className="alert-err">{error}</div>}
      {msg && <div className="alert-ok">{msg}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Nom original</th><th>Type</th><th>MIME</th><th>Taille</th><th>Accès</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td>#{a.id}</td>
                <td>{a.original_name || '—'}</td>
                <td>{a.media_type}</td>
                <td>{a.mime_type}</td>
                <td>{(Number(a.size_bytes || 0) / (1024 * 1024)).toFixed(2)} Mo</td>
                <td>{a.is_private ? 'Privé' : 'Public'}</td>
                <td><span className={`pill pill-${a.status === 'ready' ? 'published' : 'draft'}`}>{a.status}</span></td>
                <td>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SettingsPage({ token }) {
  const [settings, setSettings] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getSettings(token).then(setSettings).catch((err) => setError(err.message));
  }, [token]);

  if (!settings) return <div className="card-box">{error ? <div className="alert-err">{error}</div> : 'Chargement des paramètres…'}</div>;

  const branding = settings.branding || {};
  const player = settings.player || {};
  const uploads = settings.uploads || {};
  const system = settings.system || {};

  const updateField = (section, key, val) => {
    setSettings((curr) => ({
      ...curr,
      [section]: { ...(curr[section] || {}), [key]: val },
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await adminApi.updateSettings({ branding, player, uploads, system }, token);
      setMsg('Paramètres enregistrés.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card-box" onSubmit={save}>
      <h2 style={{ marginTop: 0 }}>Paramètres généraux de Mali Audio</h2>
      {error && <div className="alert-err">{error}</div>}
      {msg && <div className="alert-ok">{msg}</div>}

      <div className="form-grid">
        <div className="field">
          <label>Nom de la plateforme</label>
          <input className="input" value={branding.platformName || ''} onChange={(e) => updateField('branding', 'platformName', e.target.value)} />
        </div>
        <div className="field">
          <label>Slogan</label>
          <input className="input" value={branding.tagline || ''} onChange={(e) => updateField('branding', 'tagline', e.target.value)} />
        </div>
        <div className="field">
          <label>E-mail de contact</label>
          <input className="input" value={branding.contactEmail || ''} onChange={(e) => updateField('branding', 'contactEmail', e.target.value)} />
        </div>
        <div className="field">
          <label>Téléphone de contact</label>
          <input className="input" value={branding.contactPhone || ''} onChange={(e) => updateField('branding', 'contactPhone', e.target.value)} />
        </div>
        <div className="field">
          <label>Taille max audio (Mo)</label>
          <input type="number" className="input" value={uploads.maxAudioMb || 100} onChange={(e) => updateField('uploads', 'maxAudioMb', Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Taille max image (Mo)</label>
          <input type="number" className="input" value={uploads.maxImageMb || 10} onChange={(e) => updateField('uploads', 'maxImageMb', Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Volume par défaut lecteur (0 à 1)</label>
          <input type="number" step="0.05" min="0" max="1" className="input" value={player.defaultVolume ?? 0.85} onChange={(e) => updateField('player', 'defaultVolume', Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Mention de droits</label>
          <input className="input" value={system.rightsNotice || ''} onChange={(e) => updateField('system', 'rightsNotice', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '10px 0 18px' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={Boolean(player.historyEnabled)} onChange={(e) => updateField('player', 'historyEnabled', e.target.checked)} />
          <span>Historique d’écoute activé</span>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={Boolean(system.maintenanceMode)} onChange={(e) => updateField('system', 'maintenanceMode', e.target.checked)} />
          <span>Mode maintenance</span>
        </label>
      </div>

      <button type="submit" className="btn btn-gold">Enregistrer les paramètres</button>
    </form>
  );
}

export function AuditLogsPage({ token }) {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.listAuditLogs(token).then(setLogs).catch((err) => setError(err.message));
  }, [token]);

  return (
    <div className="card-box">
      <h2 style={{ marginTop: 0 }}>Journal d’activité & Sécurité</h2>
      {error && <div className="alert-err">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Acteur</th><th>Action</th><th>Objet</th><th>Détails</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                <td>{log.actor_email || 'Système'}</td>
                <td><strong>{log.action}</strong></td>
                <td>{log.entity_type ? `${log.entity_type} #${log.entity_id || ''}` : '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{JSON.stringify(log.details || {})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
