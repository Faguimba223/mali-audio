const DATABASE_NAME = 'mali-audio-offline';
const DATABASE_VERSION = 1;
const STORE_NAME = 'tracks';

let databasePromise;

function openDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('Le stockage local hors connexion n’est pas disponible dans ce navigateur.'));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error || new Error('Impossible d’ouvrir la bibliothèque hors connexion.'));
      request.onblocked = () => reject(new Error('La bibliothèque hors connexion est bloquée par un autre onglet.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

function runStoreRequest(mode, createRequest) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    let result;
    const request = createRequest(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error || new Error('Échec de l’accès à la bibliothèque hors connexion.'));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error('Échec de l’enregistrement hors connexion.'));
    transaction.onabort = () => reject(transaction.error || new Error('Enregistrement hors connexion annulé.'));
  }));
}

function toLocalTrack(record) {
  return {
    id: record.id,
    title: record.title,
    artist: record.artist,
    album: record.album,
    duration: record.duration,
    cover_url: '',
    isLocal: true,
    file: record.file,
  };
}

export async function listOfflineMusic() {
  const records = await runStoreRequest('readonly', (store) => store.getAll());
  return records
    .filter((record) => record?.file instanceof Blob)
    .map(toLocalTrack);
}

export async function importOfflineMusic(files) {
  const importedTracks = [];
  const failures = [];

  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const supportedExtension = ['aac', 'flac', 'm4a', 'mp3', 'ogg', 'opus', 'wav', 'webm'].includes(extension);
    if (!file.type?.startsWith('audio/') && !supportedExtension) {
      failures.push({ name: file.name, error: new Error('Ce fichier ne semble pas être un fichier audio.') });
      continue;
    }

    const id = `local-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const title = file.name.replace(/\.[^.]+$/, '') || file.name;
    const track = {
      id,
      title,
      artist: 'Fichier local',
      album: 'Sur cet appareil',
      duration: '--:--',
      file,
    };

    try {
      await runStoreRequest('readwrite', (store) => store.put(track));
      importedTracks.push(toLocalTrack(track));
    } catch (error) {
      failures.push({ name: file.name, error });
    }
  }

  return { importedTracks, failures };
}

export function deleteOfflineMusic(trackId) {
  return runStoreRequest('readwrite', (store) => store.delete(trackId));
}
