import { useCallback, useEffect, useState } from 'react';
import { adminApi, resolveMediaUrl } from '../services/adminApi';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending_review', label: 'À vérifier' },
  { value: 'published', label: 'Publié' },
  { value: 'unpublished', label: 'Dépublié' },
  { value: 'archived', label: 'Archivé' },
];

export function ArtistsAdminPage({ token }) {
  const [artists, setArtists] = useState([]);
  const [form, setForm] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi.listArtists(token).then((res) => setArtists(Array.isArray(res) ? res : res.items || [])).catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('biography', form.biography || '');
      fd.append('country', form.country || '');
      fd.append('genres', form.genres || '');
      fd.append('language', form.language || 'fr');
      fd.append('status', form.status || 'published');
      if (photoFile) fd.append('image', photoFile);
      else if (form.photo) fd.append('photo', form.photo);
      await adminApi.saveArtist(form.id, fd, token);
      setForm(null);
      setPhotoFile(null);
      setMsg('Artiste enregistré.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Supprimer ou archiver cet artiste ?')) return;
    try {
      const res = await adminApi.deleteArtist(id, token);
      setMsg(res.message || 'Opération effectuée.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Gestion des artistes</h2>
        <button type="button" className="btn btn-gold" onClick={() => { setPhotoFile(null); setForm({ name: '', biography: '', country: 'Mali', genres: '', language: 'fr', status: 'published' }); }}>
          + Nouvel artiste
        </button>
      </div>
      {error && <div className="alert-err">{error}</div>}
      {msg && <div className="alert-ok">{msg}</div>}

      {form && (
        <form onSubmit={save} className="card-box" style={{ background: '#111217' }}>
          <div className="form-grid">
            <div className="field"><label>Nom public *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Pays</label><input className="input" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div className="field"><label>Genres</label><input className="input" value={form.genres || ''} onChange={(e) => setForm({ ...form, genres: e.target.value })} /></div>
            <div className="field"><label>Langue</label><input className="input" value={form.language || ''} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
            <div className="field">
              <label>Statut</label>
              <select className="select" value={form.status || 'published'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Photo (JPG/PNG/WebP)</label><input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} /></div>
          </div>
          <div className="field"><label>Biographie</label><textarea className="textarea" rows={3} value={form.biography || ''} onChange={(e) => setForm({ ...form, biography: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="btn btn-sec" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Genres</th><th>Pays</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {artists.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.name}</strong></td>
                <td>{a.genres || '—'}</td>
                <td>{a.country || '—'}</td>
                <td><span className={`pill pill-${a.status}`}>{a.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-sec btn-sm" onClick={() => { setPhotoFile(null); setForm({ ...a }); }}>Modifier</button>
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

export function SongsAdminPage({ token }) {
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [form, setForm] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    Promise.all([adminApi.listSongs(token), adminApi.listArtists(token), adminApi.listAlbums(token)])
      .then(([s, a, al]) => {
        setSongs(Array.isArray(s) ? s : s.items || []);
        setArtists(Array.isArray(a) ? a : a.items || []);
        setAlbums(Array.isArray(al) ? al : al.items || []);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setUploadPct(0);
    setError('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.artist_id) fd.append('artist_id', String(form.artist_id));
      if (form.album_id) fd.append('album_id', String(form.album_id));
      fd.append('genre', form.genre || '');
      fd.append('language', form.language || 'fr');
      fd.append('duration', form.duration || '');
      fd.append('release_type', form.release_type || 'single');
      if (form.release_date) fd.append('release_date', String(form.release_date).slice(0, 10));
      fd.append('description', form.description || '');
      fd.append('rights_holder', form.rights_holder || '');
      fd.append('license_info', form.license_info || '');
      fd.append('provenance', form.provenance || '');
      fd.append('status', form.status || 'draft');
      fd.append('is_featured', String(Boolean(form.is_featured)));
      if (audioFile) fd.append('audio', audioFile);
      if (coverFile) fd.append('image', coverFile);

      await adminApi.saveSong(form.id, fd, token, setUploadPct);
      setForm(null);
      setAudioFile(null);
      setCoverFile(null);
      setMsg('Chanson enregistrée dans le stockage privé.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const previewSong = async (songId) => {
    setError('');
    try {
      const res = await adminApi.streamToken(songId, token);
      setPreviewUrl(resolveMediaUrl(res.streamUrl));
    } catch (err) {
      setError(err.message);
    }
  };

  const quickStatus = async (song, status) => {
    const fd = new FormData();
    fd.append('status', status);
    await adminApi.saveSong(song.id, fd, token);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Supprimer définitivement cette chanson ?')) return;
    await adminApi.deleteSong(id, token);
    load();
  };

  return (
    <div className="card-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Gestion des chansons (Audio privé)</h2>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            setAudioFile(null);
            setCoverFile(null);
            setUploadPct(0);
            setForm({ title: '', artist_id: artists[0]?.id || '', album_id: '', genre: '', language: 'fr', duration: '', release_type: 'single', status: 'draft', rights_holder: '', license_info: '', provenance: '', is_featured: false });
          }}
        >
          + Ajouter une chanson
        </button>
      </div>

      {error && <div className="alert-err">{error}</div>}
      {msg && <div className="alert-ok">{msg}</div>}

      {previewUrl && (
        <div className="card-box" style={{ background: '#101216' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Aperçu audio sécurisé (avant publication)</strong>
            <button type="button" className="btn btn-sec btn-sm" onClick={() => setPreviewUrl('')}>Fermer</button>
          </div>
          <audio controls autoPlay controlsList="nodownload" src={previewUrl} style={{ width: '100%' }} />
        </div>
      )}

      {form && (
        <form onSubmit={save} className="card-box" style={{ background: '#111217' }}>
          <div className="form-grid">
            <div className="field"><label>Titre *</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field">
              <label>Artiste principal *</label>
              <select className="select" required value={form.artist_id || ''} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}>
                <option value="">Sélectionner…</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Album (optionnel)</label>
              <select className="select" value={form.album_id || ''} onChange={(e) => setForm({ ...form, album_id: e.target.value })}>
                <option value="">Single / Aucun</option>
                {albums.map((al) => <option key={al.id} value={al.id}>{al.title}</option>)}
              </select>
            </div>
            <div className="field"><label>Genre</label><input className="input" value={form.genre || ''} onChange={(e) => setForm({ ...form, genre: e.target.value })} /></div>
            <div className="field"><label>Langue</label><input className="input" value={form.language || ''} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
            <div className="field"><label>Durée (ex: 3:42)</label><input className="input" value={form.duration || ''} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
            <div className="field"><label>Date de sortie</label><input type="date" className="input" value={form.release_date ? String(form.release_date).slice(0, 10) : ''} onChange={(e) => setForm({ ...form, release_date: e.target.value })} /></div>
            <div className="field">
              <label>Statut</label>
              <select className="select" value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Ayant droit</label><input className="input" value={form.rights_holder || ''} onChange={(e) => setForm({ ...form, rights_holder: e.target.value })} /></div>
            <div className="field"><label>Licence / autorisation</label><input className="input" value={form.license_info || ''} onChange={(e) => setForm({ ...form, license_info: e.target.value })} /></div>
            <div className="field"><label>Fichier audio privé (MP3, WAV, M4A, AAC, OGG, FLAC)</label><input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} /></div>
            <div className="field"><label>Pochette (JPG, PNG, WebP)</label><input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} /></div>
          </div>
          <div className="field"><label>Description</label><textarea className="textarea" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input type="checkbox" checked={Boolean(form.is_featured)} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            <span>Mettre en avant</span>
          </label>
          {busy && uploadPct > 0 && (
            <div style={{ marginBottom: 12 }}>
              <small>Envoi du média privé : {uploadPct}%</small>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadPct}%` }} /></div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? 'Envoi…' : 'Enregistrer'}</button>
            <button type="button" className="btn btn-sec" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Titre</th><th>Artiste</th><th>Audio</th><th>Statut</th><th>Écoutes</th><th>Actions</th></tr></thead>
          <tbody>
            {songs.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.title}</strong></td>
                <td>{s.artist}</td>
                <td>{s.stream_protected ? 'Stockage privé' : s.has_audio ? 'Externe' : 'Aucun'}</td>
                <td><span className={`pill pill-${s.status}`}>{s.status}</span></td>
                <td>{s.play_count}</td>
                <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.has_audio && <button type="button" className="btn btn-sec btn-sm" onClick={() => previewSong(s.id)}>Aperçu</button>}
                  <button type="button" className="btn btn-sec btn-sm" onClick={() => { setAudioFile(null); setCoverFile(null); setForm({ ...s }); }}>Modifier</button>
                  {s.status !== 'published' ? (
                    <button type="button" className="btn btn-gold btn-sm" onClick={() => quickStatus(s, 'published')}>Publier</button>
                  ) : (
                    <button type="button" className="btn btn-sec btn-sm" onClick={() => quickStatus(s, 'unpublished')}>Dépublier</button>
                  )}
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AlbumsAdminPage({ token }) {
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [form, setForm] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    Promise.all([adminApi.listAlbums(token), adminApi.listArtists(token), adminApi.listSongs(token)])
      .then(([al, ar, s]) => {
        setAlbums(Array.isArray(al) ? al : al.items || []);
        setArtists(Array.isArray(ar) ? ar : ar.items || []);
        setSongs(Array.isArray(s) ? s : s.items || []);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggleTrack = (songId) => {
    const idStr = String(songId);
    setForm((curr) => ({
      ...curr,
      trackIds: curr.trackIds.includes(idStr) ? curr.trackIds.filter((x) => x !== idStr) : [...curr.trackIds, idStr],
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('artist_id', String(form.artist_id));
      fd.append('release_type', form.release_type || 'album');
      fd.append('genre', form.genre || '');
      fd.append('description', form.description || '');
      fd.append('status', form.status || 'draft');
      if (form.release_date) fd.append('release_date', String(form.release_date).slice(0, 10));
      fd.append('trackIds', JSON.stringify(form.trackIds || []));
      if (coverFile) fd.append('image', coverFile);
      await adminApi.saveAlbum(form.id, fd, token);
      setForm(null);
      setCoverFile(null);
      setMsg('Album/Single enregistré.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (album) => {
    const linkedIds = songs.filter((s) => s.album_id === album.id).sort((a, b) => a.track_number - b.track_number).map((s) => String(s.id));
    setForm({ ...album, trackIds: linkedIds });
  };

  return (
    <div className="card-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Albums & Singles</h2>
        <button type="button" className="btn btn-gold" onClick={() => setForm({ title: '', artist_id: artists[0]?.id || '', release_type: 'album', genre: '', description: '', status: 'draft', trackIds: [] })}>
          + Nouvel album / single
        </button>
      </div>
      {error && <div className="alert-err">{error}</div>}
      {msg && <div className="alert-ok">{msg}</div>}

      {form && (
        <form onSubmit={save} className="card-box" style={{ background: '#111217' }}>
          <div className="form-grid">
            <div className="field"><label>Titre *</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field">
              <label>Artiste *</label>
              <select className="select" required value={form.artist_id || ''} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}>
                <option value="">Sélectionner…</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Type</label>
              <select className="select" value={form.release_type} onChange={(e) => setForm({ ...form, release_type: e.target.value })}>
                <option value="album">Album</option>
                <option value="single">Single</option>
                <option value="ep">EP</option>
              </select>
            </div>
            <div className="field">
              <label>Statut</label>
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Date de sortie</label><input type="date" className="input" value={form.release_date ? String(form.release_date).slice(0, 10) : ''} onChange={(e) => setForm({ ...form, release_date: e.target.value })} /></div>
            <div className="field"><label>Pochette</label><input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} /></div>
          </div>
          <div className="field"><label>Description</label><textarea className="textarea" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field">
            <label>Chansons associées (dans l’ordre de sélection)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6, maxHeight: 190, overflowY: 'auto', padding: 8, background: '#0c0d11', borderRadius: 8 }}>
              {songs.map((s) => (
                <label key={s.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.84rem' }}>
                  <input type="checkbox" checked={form.trackIds.includes(String(s.id))} onChange={() => toggleTrack(s.id)} />
                  <span>{s.title} — {s.artist}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-gold">Enregistrer</button>
            <button type="button" className="btn btn-sec" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Titre</th><th>Type</th><th>Artiste</th><th>Titres</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {albums.map((al) => (
              <tr key={al.id}>
                <td><strong>{al.title}</strong></td>
                <td>{al.release_type}</td>
                <td>{al.artist}</td>
                <td>{al.track_count || 0}</td>
                <td><span className={`pill pill-${al.status}`}>{al.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-sec btn-sm" onClick={() => openEdit(al)}>Modifier</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => adminApi.deleteAlbum(al.id, token).then(load)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlaylistsAdminPage({ token }) {
  const [playlists, setPlaylists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [form, setForm] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([adminApi.listPlaylists(token), adminApi.listSongs(token)])
      .then(([p, s]) => {
        setPlaylists(Array.isArray(p) ? p : []);
        setSongs(Array.isArray(s) ? s : s.items || []);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggleTrack = (songId) => {
    const idStr = String(songId);
    setForm((curr) => ({
      ...curr,
      trackIds: curr.trackIds.includes(idStr) ? curr.trackIds.filter((x) => x !== idStr) : [...curr.trackIds, idStr],
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description || '');
      fd.append('is_public', String(Boolean(form.is_public)));
      fd.append('status', form.status || 'published');
      fd.append('trackIds', JSON.stringify(form.trackIds || []));
      if (coverFile) fd.append('image', coverFile);
      await adminApi.savePlaylist(form.id, fd, token);
      setForm(null);
      setCoverFile(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Playlists éditoriales</h2>
        <button type="button" className="btn btn-gold" onClick={() => setForm({ title: '', description: '', is_public: true, status: 'published', trackIds: [] })}>
          + Nouvelle playlist
        </button>
      </div>
      {error && <div className="alert-err">{error}</div>}

      {form && (
        <form onSubmit={save} className="card-box" style={{ background: '#111217' }}>
          <div className="form-grid">
            <div className="field"><label>Titre *</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field">
              <label>Statut</label>
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Couverture</label><input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} /></div>
          </div>
          <div className="field"><label>Description</label><textarea className="textarea" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input type="checkbox" checked={Boolean(form.is_public)} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
            <span>Playlist publique</span>
          </label>
          <div className="field">
            <label>Morceaux publiables</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6, maxHeight: 190, overflowY: 'auto', padding: 8, background: '#0c0d11', borderRadius: 8 }}>
              {songs.filter((s) => s.status === 'published').map((s) => (
                <label key={s.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.84rem' }}>
                  <input type="checkbox" checked={(form.trackIds || []).includes(String(s.id))} onChange={() => toggleTrack(s.id)} />
                  <span>{s.title} — {s.artist}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-gold">Enregistrer</button>
            <button type="button" className="btn btn-sec" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Titre</th><th>Type</th><th>Titres</th><th>Visibilité</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {playlists.map((pl) => (
              <tr key={pl.id}>
                <td><strong>{pl.title}</strong></td>
                <td>{pl.is_editorial ? 'Éditoriale' : 'Utilisateur'}</td>
                <td>{pl.track_count || 0}</td>
                <td>{pl.is_public ? 'Publique' : 'Privée'}</td>
                <td><span className={`pill pill-${pl.status}`}>{pl.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-sec btn-sm" onClick={() => setForm({ ...pl, trackIds: pl.trackIds || [] })}>Modifier</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => adminApi.deletePlaylist(pl.id, token).then(load)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
