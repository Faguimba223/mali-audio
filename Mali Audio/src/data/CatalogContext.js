import { createContext, useContext, useEffect, useState } from 'react';
import { catalogRepository } from './catalogRepository';
import { artists as initialArtists, stories as initialStories, tracks as initialTracks } from './catalog';
import { artistService } from '../services/artistService';
import { musicService } from '../services/musicService';

const CatalogContext = createContext(null);

const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasId = (record) => record?.id !== undefined && record?.id !== null && String(record.id).trim().length > 0;

function normalizeRecords(records, collection, fallbackRecords) {
  if (!Array.isArray(records)) {
    console.error(`[CatalogContext] Expected "${collection}" to be an array; keeping bundled records.`, records);
    return [...fallbackRecords];
  }

  const validRecords = records.filter((record) => record && typeof record === 'object' && !Array.isArray(record));
  if (validRecords.length !== records.length) {
    console.error(`[CatalogContext] Ignored ${records.length - validRecords.length} invalid record(s) in "${collection}".`);
  }

  return validRecords;
}

function normalizeTracks(records, fallbackRecords = initialTracks) {
  const recordsWithIdentity = normalizeRecords(records, 'tracks', fallbackRecords);
  const validRecords = recordsWithIdentity.filter((track) => hasId(track) && isText(track.title) && isText(track.artist));

  if (validRecords.length !== recordsWithIdentity.length) {
    console.error('[CatalogContext] Ignored track records missing id, title, or artist.');
  }

  return validRecords.map((track, index) => ({
    ...track,
    album: isText(track.album) ? track.album : 'Single',
    duration: isText(track.duration) ? track.duration : '--:--',
    image: isText(track.image) ? track.image : initialTracks[index % initialTracks.length]?.image,
  }));
}

function normalizeArtists(records, fallbackRecords = initialArtists) {
  const recordsWithIdentity = normalizeRecords(records, 'artists', fallbackRecords);
  const validRecords = recordsWithIdentity.filter((artist) => hasId(artist) && isText(artist.name));

  if (validRecords.length !== recordsWithIdentity.length) {
    console.error('[CatalogContext] Ignored artist records missing id or name.');
  }

  return validRecords.map((artist, index) => ({
    ...artist,
    genre: isText(artist.genre) ? artist.genre : 'Artiste malien',
    image: isText(artist.image) ? artist.image : initialArtists[index % initialArtists.length]?.image,
  }));
}

function ensureStories(records, fallbackStories = initialStories) {
  const normalized = normalizeRecords(records, 'stories', fallbackStories)
    .map((story, index) => {
      const fallback = fallbackStories[index % fallbackStories.length];
      return {
        ...fallback,
        ...story,
        id: hasId(story)
          ? story.id
          : `story-${Date.now()}-${index}`,
        image: isText(story.image) ? story.image : fallback.image,
        category: isText(story.category) ? story.category : 'ACTUALITÉS',
        title: isText(story.title) ? story.title : fallback.title,
        date: isText(story.date) ? story.date : fallback.date || '',
        excerpt: isText(story.excerpt) ? story.excerpt : fallback.excerpt || '',
      };
    });

  for (const fallback of fallbackStories) {
    if (normalized.length >= 2) break;
    if (!normalized.some((story) => story.id === fallback.id)) normalized.push(fallback);
  }

  return normalized;
}

function normalizeCollection(collection, records) {
  if (collection === 'tracks') return normalizeTracks(records, []);
  if (collection === 'artists') return normalizeArtists(records, []);
  if (collection === 'stories') return ensureStories(records);
  throw new Error(`Collection inconnue: ${collection}`);
}

export function CatalogProvider({ children }) {
  const [tracks, setTracks] = useState(() => normalizeTracks(initialTracks));
  const [artists, setArtists] = useState(() => normalizeArtists(initialArtists));
  const [stories, setStories] = useState(() => ensureStories(initialStories));

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      musicService.list(),
      artistService.list(),
      catalogRepository.list('stories'),
    ]).then(([nextTracks, nextArtists, nextStories]) => {
      if (!isMounted) return;
      setTracks(normalizeTracks(nextTracks));
      setArtists(normalizeArtists(nextArtists));
      setStories(ensureStories(nextStories));
    }).catch((error) => {
      if (isMounted) console.error('[CatalogContext] Failed to load catalog; bundled records remain available.', error);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const createRecord = async (collection, payload, token) => {
    const service = { tracks: musicService, artists: artistService }[collection];
    const record = service ? await service.create(payload, token) : await catalogRepository.create(collection, payload);
    const setCollection = { tracks: setTracks, artists: setArtists, stories: setStories }[collection];
    if (!setCollection) throw new Error(`Collection inconnue: ${collection}`);
    setCollection((current) => normalizeCollection(collection, [record, ...current]));
    return record;
  };

  const updateRecord = async (collection, id, payload, token) => {
    const service = { tracks: musicService, artists: artistService }[collection];
    const record = service ? await service.update(id, payload, token) : await catalogRepository.update(collection, id, payload);
    const setCollection = { tracks: setTracks, artists: setArtists, stories: setStories }[collection];
    if (!setCollection) throw new Error(`Collection inconnue: ${collection}`);
    setCollection((current) => {
      const updated = current.map((item) => item.id === id ? record : item);
      return normalizeCollection(collection, updated);
    });
    return record;
  };

  const deleteRecord = async (collection, id, token) => {
    const service = { tracks: musicService, artists: artistService }[collection];
    if (service) await service.remove(id, token);
    else await catalogRepository.remove(collection, id);
    const setCollection = { tracks: setTracks, artists: setArtists, stories: setStories }[collection];
    if (!setCollection) throw new Error(`Collection inconnue: ${collection}`);
    setCollection((current) => {
      const remaining = current.filter((item) => item.id !== id);
      return normalizeCollection(collection, remaining);
    });
  };

  return (
    <CatalogContext.Provider value={{ tracks, artists, stories, createRecord, updateRecord, deleteRecord }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog doit être utilisé dans CatalogProvider.');
  return context;
}