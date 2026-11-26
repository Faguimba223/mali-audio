import { artists, stories, tracks } from '../data/catalog';

const users = [
  { id: 'demo-u1', name: 'Aminata Traoré', email: 'aminata@example.test', role: 'user', active: true, createdAt: '2026-08-12T10:00:00.000Z', plays: 84, favorites: 12 },
  { id: 'demo-u2', name: 'Moussa Diallo', email: 'moussa@example.test', role: 'user', active: true, createdAt: '2026-07-29T10:00:00.000Z', plays: 41, favorites: 6 },
  { id: 'demo-u3', name: 'Fatou Cissé', email: 'fatou@example.test', role: 'user', active: false, createdAt: '2026-06-03T10:00:00.000Z', plays: 19, favorites: 3 },
  { id: 'demo-u4', name: 'Ibrahim Koné', email: 'ibrahim@example.test', role: 'user', active: true, createdAt: '2026-09-05T10:00:00.000Z', plays: 126, favorites: 18 },
];

let albums = [
  { id: 'demo-al1', title: 'Fenfo', artist: 'Fatoumata Diawara', artistId: 'a1', image: tracks[0]?.image, trackIds: ['t1'], description: 'Un album entre héritage et sons contemporains.' },
  { id: 'demo-al2', title: 'Moffou', artist: 'Salif Keita', artistId: 'a2', image: tracks[2]?.image, trackIds: ['t3', 't4'], description: 'Les cordes mandingues rencontrent le monde.' },
];

let playlists = [
  { id: 'demo-pl1', name: 'Voix du Mali', description: 'Les grandes voix du pays.', image: tracks[0]?.image, trackIds: ['t1', 't3'], isPublic: true },
  { id: 'demo-pl2', name: 'Découvertes', description: 'À écouter cette semaine.', image: tracks[4]?.image, trackIds: ['t2', 't5'], isPublic: false },
];

let settings = {
  appName: 'Mali Audio',
  description: 'Les sons de chez nous',
  logo: '',
  notificationsEnabled: true,
  editorialEnabled: true,
};

let activity = [
  { id: 'activity-1', label: 'Catalogue musical chargé', detail: `${tracks.length} titres · ${artists.length} artistes`, createdAt: new Date().toISOString() },
  { id: 'activity-2', label: 'Actualités prêtes à consulter', detail: `${stories.length} articles`, createdAt: new Date(Date.now() - 3600000).toISOString() },
];

let sequence = 0;
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${++sequence}`;
const cloneList = (items) => items.map((item) => ({ ...item, trackIds: item.trackIds ? [...item.trackIds] : undefined }));

export const adminService = {
  async getOverview({ musicCount = tracks.length, artistCount = artists.length } = {}) {
    return {
      users: users.length,
      artists: artistCount,
      tracks: musicCount,
      albums: albums.length,
      playlists: playlists.length,
      plays: users.reduce((sum, user) => sum + user.plays, 0),
      recentActivity: [...activity].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      isDemo: true,
    };
  },
  recordActivity(label, detail = '') {
    activity = [{ id: makeId('activity'), label, detail, createdAt: new Date().toISOString() }, ...activity].slice(0, 12);
  },
  async listUsers(query = '') {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(normalizedQuery)).map((user) => ({ ...user }));
  },
  async setUserActive(id, active) {
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) throw new Error('Utilisateur introuvable dans les données de démonstration.');
    users[index] = { ...users[index], active };
    this.recordActivity(active ? 'Compte de démonstration activé' : 'Compte de démonstration désactivé', users[index].email);
    return { ...users[index] };
  },
  async listAlbums() { return cloneList(albums); },
  async createAlbum(payload) {
    const album = { ...payload, id: makeId('album'), trackIds: [...(payload.trackIds || [])] };
    albums = [album, ...albums];
    this.recordActivity('Album créé', album.title);
    return { ...album };
  },
  async updateAlbum(id, payload) {
    const index = albums.findIndex((album) => album.id === id);
    if (index < 0) throw new Error('Album introuvable.');
    albums[index] = { ...albums[index], ...payload, trackIds: [...(payload.trackIds || [])] };
    this.recordActivity('Album modifié', albums[index].title);
    return { ...albums[index] };
  },
  async removeAlbum(id) {
    const album = albums.find((item) => item.id === id);
    albums = albums.filter((item) => item.id !== id);
    if (album) this.recordActivity('Album supprimé', album.title);
  },
  async listPlaylists() { return cloneList(playlists); },
  async createPlaylist(payload) {
    const playlist = { ...payload, id: makeId('playlist'), trackIds: [...(payload.trackIds || [])] };
    playlists = [playlist, ...playlists];
    this.recordActivity('Playlist créée', playlist.name);
    return { ...playlist };
  },
  async updatePlaylist(id, payload) {
    const index = playlists.findIndex((playlist) => playlist.id === id);
    if (index < 0) throw new Error('Playlist introuvable.');
    playlists[index] = { ...playlists[index], ...payload, trackIds: [...(payload.trackIds || [])] };
    this.recordActivity('Playlist modifiée', playlists[index].name);
    return { ...playlists[index] };
  },
  async removePlaylist(id) {
    const playlist = playlists.find((item) => item.id === id);
    playlists = playlists.filter((item) => item.id !== id);
    if (playlist) this.recordActivity('Playlist supprimée', playlist.name);
  },
  async getSettings() { return { ...settings }; },
  async updateSettings(changes) {
    settings = { ...settings, ...changes };
    this.recordActivity('Paramètres mis à jour', settings.appName);
    return { ...settings };
  },
};