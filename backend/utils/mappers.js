export const mapUser = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username || null,
  email: user.email,
  phone: user.phone || null,
  role: user.role,
  avatar: user.avatar || '',
  language: user.language || 'fr',
  is_active: Boolean(user.is_active),
  created_at: user.created_at,
  updated_at: user.updated_at,
});

export const mapArtist = (artist) => ({
  id: artist.id,
  name: artist.name,
  slug: artist.slug || '',
  biography: artist.biography || '',
  photo: artist.photo || '',
  country: artist.country || '',
  genres: artist.genres || '',
  language: artist.language || '',
  official_links: artist.official_links || {},
  status: artist.status || 'published',
  created_at: artist.created_at,
  updated_at: artist.updated_at,
});

export const mapAlbum = (album) => ({
  id: album.id,
  title: album.title,
  slug: album.slug || '',
  artist_id: album.artist_id,
  artist: album.artist_name || album.artist || '',
  release_type: album.release_type || 'album',
  cover_url: album.cover_url || '',
  release_date: album.release_date || null,
  description: album.description || '',
  genre: album.genre || '',
  status: album.status || 'draft',
  track_count: album.track_count !== undefined ? Number(album.track_count) : undefined,
  created_at: album.created_at,
  updated_at: album.updated_at,
});

export const mapSong = (song, { includePrivateMeta = false } = {}) => {
  const hasPrivateAsset = Boolean(song.audio_asset_id);
  const externalAudio = !hasPrivateAsset && song.audio_url && !String(song.audio_url).startsWith('/uploads/')
    ? song.audio_url
    : '';

  const mapped = {
    id: song.id,
    title: song.title,
    slug: song.slug || '',
    artist_id: song.artist_id,
    artist: song.artist_name || song.artist || '',
    album_id: song.album_id || null,
    album: song.album_title || song.album || '',
    track_number: Number(song.track_number || 1),
    release_type: song.release_type || 'single',
    genre: song.genre || '',
    category_id: song.category_id || null,
    language: song.language || '',
    cover_url: song.cover_url || '',
    duration: song.duration || '',
    release_date: song.release_date || null,
    description: song.description || '',
    play_count: Number(song.play_count || 0),
    is_featured: Boolean(song.is_featured),
    status: song.status || 'published',
    has_audio: Boolean(hasPrivateAsset || externalAudio),
    stream_protected: Boolean(hasPrivateAsset),
    external_audio_url: externalAudio || null,
    published_at: song.published_at || null,
    created_at: song.created_at,
    updated_at: song.updated_at,
  };

  if (Array.isArray(song.featured_artists)) {
    mapped.featured_artists = song.featured_artists;
  }

  if (includePrivateMeta) {
    mapped.rights_holder = song.rights_holder || '';
    mapped.license_info = song.license_info || '';
    mapped.provenance = song.provenance || '';
    mapped.audio_asset_id = song.audio_asset_id || null;
    mapped.cover_asset_id = song.cover_asset_id || null;
    mapped.audio_original_name = song.audio_original_name || null;
    mapped.audio_status = song.audio_status || null;
  }

  return mapped;
};

export const mapPlaylist = (playlist) => ({
  id: playlist.id,
  user_id: playlist.user_id,
  owner_name: playlist.owner_name || '',
  title: playlist.title,
  slug: playlist.slug || '',
  description: playlist.description || '',
  cover_url: playlist.cover_url || '',
  is_editorial: Boolean(playlist.is_editorial),
  is_public: Boolean(playlist.is_public),
  status: playlist.status || 'published',
  track_count: playlist.track_count !== undefined ? Number(playlist.track_count) : undefined,
  created_at: playlist.created_at,
  updated_at: playlist.updated_at,
});

export const mapVideo = (video) => ({
  id: video.id,
  title: video.title,
  slug: video.slug || '',
  artist_id: video.artist_id || null,
  artist: video.artist_name || '',
  description: video.description || '',
  thumbnail_url: video.thumbnail_url || '',
  source_type: video.source_type || 'external',
  source_url: video.source_type === 'external' ? (video.source_url || '') : (video.media_asset_id ? `/api/videos/${video.id}/stream` : ''),
  duration: video.duration || '',
  release_date: video.release_date || null,
  rights_holder: video.rights_holder || '',
  status: video.status || 'draft',
  published_at: video.published_at || null,
  created_at: video.created_at,
  updated_at: video.updated_at,
});

export const mapNews = (story) => ({
  id: story.id,
  title: story.title,
  slug: story.slug || '',
  summary: story.summary || '',
  content: story.content,
  image_url: story.image_url || '',
  author: story.author || '',
  category_id: story.category_id || null,
  published: story.status === 'published' || Boolean(story.published),
  status: story.status || (story.published ? 'published' : 'draft'),
  published_at: story.published_at || null,
  created_at: story.created_at,
  updated_at: story.updated_at,
});

export const mapLanguage = (language) => ({
  id: language.id,
  name: language.name,
  code: language.code,
  is_active: Boolean(language.is_active),
  created_at: language.created_at,
});

export const mapFavorite = (favorite) => ({
  id: favorite.id,
  user_id: favorite.user_id,
  song_id: favorite.song_id,
  song: favorite.song ? mapSong(favorite.song) : null,
  created_at: favorite.created_at,
});
