import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../services/adminApi';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending_review', label: 'À vérifier' },
  { value: 'published', label: 'Publié' },
  { value: 'unpublished', label: 'Dépublié' },
  { value: 'archived', label: 'Archivé' },
];

export function VideosAdminPage({ token }) {
  const [videos, setVideos] = useState([]);
  const [artists, setArtists] = useState([]);
  const [form, setForm] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([adminApi.listVideos(token), adminApi.listArtists(token)])
      .then(([v, a]) => {
        setVideos(Array.isArray(v) ? v : v.items || []);
        setArtists(Array.isArray(a) ? a : a.items || []);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setPct(0);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.artist_id) fd.append('artist_id', String(form.artist_id));
      fd.append('description', form.description || '');
      fd.append('duration', form.duration || '');
      fd.append('rights_holder', form.rights_holder || '');
      fd.append('status', form.status || 'draft');
      if (form.source_url) fd.append('source_url', form.source_url);
      if (videoFile) fd.append('video', videoFile);
      if (thumbFile) fd.append('image', thumbFile);
      await adminApi.saveVideo(form.id, fd, token, setPct);
      setForm(null);
      setVideoFile(null);
      setThumbFile(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Gestion des vidéos</h2>
        <button type="button" className="btn btn-gold" onClick={() => setForm({ title: '', artist_id: '', description: '', source_url: '', duration: '', rights_holder: '', status: 'draft' })}>
          + Ajouter une vidéo
        </button>
      </div>
      {error && <div className="alert-err">{error}</div>}

      {form && (
        <form onSubmit={save} className="card-box" style={{ background: '#111217' }}>
          <div className="form-grid">
            <div className="field"><label>Titre *</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field">
              <label>Artiste</label>
              <select className="select" value={form.artist_id || ''} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}>
                <option value="">Aucun</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field"><label>URL vidéo externe (YouTube ou MP4 HTTPS)</label><input className="input" value={form.source_url || ''} onChange={(e) => setForm({ ...form, source_url: e.target.value })} /></div>
            <div className="field"><label>Ou fichier vidéo privé (MP4/WebM)</label><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} /></div>
            <div className="field"><label>Miniature</label><input type="file" accept="image/*" onChange={(e) => setThumbFile(e.target.files?.[0] || null)} /></div>
            <div className="field"><label>Durée</label><input className="input" value={form.duration || ''} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
            <div className="field"><label>Ayant droit</label><input className="input" value={form.rights_holder || ''} onChange={(e) => setForm({ ...form, rights_holder: e.target.value })} /></div>
            <div className="field">
              <label>Statut</label>
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Description</label><textarea className="textarea" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {busy && pct > 0 && <div className="progress-bar" style={{ marginBottom: 12 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" className="btn btn-sec" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Titre</th><th>Artiste</th><th>Source</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id}>
                <td><strong>{v.title}</strong></td>
                <td>{v.artist || '—'}</td>
                <td>{v.source_type}</td>
                <td><span className={`pill pill-${v.status}`}>{v.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-sec btn-sm" onClick={() => setForm({ ...v })}>Modifier</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => adminApi.deleteVideo(v.id, token).then(load)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function NewsAdminPage({ token }) {
  const [stories, setStories] = useState([]);
  const [form, setForm] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.listNews(token).then((res) => setStories(Array.isArray(res) ? res : res.items || [])).catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('summary', form.summary || '');
      fd.append('content', form.content);
      fd.append('author', form.author || '');
      fd.append('status', form.status || 'draft');
      if (imgFile) fd.append('image', imgFile);
      await adminApi.saveNews(form.id, fd, token);
      setForm(null);
      setImgFile(null);
      setPreviewMode(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Gestion des actualités</h2>
        <button type="button" className="btn btn-gold" onClick={() => { setPreviewMode(false); setForm({ title: '', summary: '', content: '', author: '', status: 'draft' }); }}>
          + Nouvel article
        </button>
      </div>
      {error && <div className="alert-err">{error}</div>}

      {form && (
        <form onSubmit={save} className="card-box" style={{ background: '#111217' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <strong>{form.id ? 'Modifier l’article' : 'Nouvel article'}</strong>
            <button type="button" className="btn btn-sec btn-sm" onClick={() => setPreviewMode((v) => !v)}>
              {previewMode ? 'Éditer' : 'Prévisualiser'}
            </button>
          </div>
          {previewMode ? (
            <div style={{ padding: 14, background: '#0b0c10', borderRadius: 10, marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>{form.title || '(Sans titre)'}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{form.summary}</p>
              <div style={{ whiteSpace: 'pre-wrap' }}>{form.content}</div>
            </div>
          ) : (
            <>
              <div className="form-grid">
                <div className="field"><label>Titre *</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="field"><label>Auteur</label><input className="input" value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
                <div className="field">
                  <label>Statut</label>
                  <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="field"><label>Image principale</label><input type="file" accept="image/*" onChange={(e) => setImgFile(e.target.files?.[0] || null)} /></div>
              </div>
              <div className="field"><label>Résumé</label><input className="input" value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
              <div className="field"><label>Contenu *</label><textarea className="textarea" required rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            </>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-gold">Enregistrer</button>
            <button type="button" className="btn btn-sec" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Titre</th><th>Auteur</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {stories.map((st) => (
              <tr key={st.id}>
                <td><strong>{st.title}</strong></td>
                <td>{st.author || '—'}</td>
                <td><span className={`pill pill-${st.status}`}>{st.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-sec btn-sm" onClick={() => setForm({ ...st })}>Modifier</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => adminApi.deleteNews(st.id, token).then(load)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UsersAdminPage({ token, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.listUsers(q, token).then(setUsers).catch((e) => setError(e.message));
  }, [q, token]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (user) => {
    setError('');
    try {
      await adminApi.setUserActive(user.id, !user.is_active, token);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Gestion des utilisateurs</h2>
        <input type="search" className="input" style={{ maxWidth: 280 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher nom ou email..." />
      </div>
      {error && <div className="alert-err">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Création</th><th>État</th><th>Action</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                <td><span className={`pill ${u.is_active ? 'pill-published' : 'pill-unpublished'}`}>{u.is_active ? 'Actif' : 'Suspendu'}</span></td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-gold'}`}
                    disabled={u.id === currentUserId}
                    onClick={() => toggleActive(u)}
                  >
                    {u.is_active ? 'Suspendre' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TaxonomyAdminPage({ token }) {
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [catName, setCatName] = useState('');
  const [langName, setLangName] = useState('');
  const [langCode, setLangCode] = useState('');

  const load = useCallback(() => {
    Promise.all([adminApi.listCategories(), adminApi.listLanguages()])
      .then(([c, l]) => { setCategories(c); setLanguages(l); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const addCategory = async (e) => {
    e.preventDefault();
    await adminApi.createCategory({ name: catName, type: 'genre' }, token);
    setCatName('');
    load();
  };

  const addLanguage = async (e) => {
    e.preventDefault();
    await adminApi.createLanguage({ name: langName, code: langCode, is_active: true }, token);
    setLangName('');
    setLangCode('');
    load();
  };

  return (
    <div className="form-grid">
      <div className="card-box">
        <h2 style={{ marginTop: 0 }}>Genres / Catégories</h2>
        <form onSubmit={addCategory} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input className="input" required value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nouveau genre" />
          <button type="submit" className="btn btn-gold">Ajouter</button>
        </form>
        <table>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td style={{ textAlign: 'right' }}>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => adminApi.deleteCategory(c.id, token).then(load)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-box">
        <h2 style={{ marginTop: 0 }}>Langues musicales</h2>
        <form onSubmit={addLanguage} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input className="input" required value={langName} onChange={(e) => setLangName(e.target.value)} placeholder="Nom (ex: Bambara)" />
          <input className="input" style={{ maxWidth: 90 }} required value={langCode} onChange={(e) => setLangCode(e.target.value)} placeholder="Code" />
          <button type="submit" className="btn btn-gold">Ajouter</button>
        </form>
        <table>
          <tbody>
            {languages.map((l) => (
              <tr key={l.id}>
                <td>{l.name} ({l.code})</td>
                <td style={{ textAlign: 'right' }}>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => adminApi.deleteLanguage(l.id, token).then(load)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
