export type OfflineAudioTrack = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  audioUrl: string;
  durationSec?: number | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  songId: string;
  songTitle?: string | null;
  artistName?: string | null;
  artistImageUrl?: string | null;
  artistSlug?: string | null;
  songSlug?: string | null;
  savedAt: string;
  blob: Blob;
};

export type OfflineAudioTrackInput = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  audioUrl: string;
  durationSec?: number | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  songId: string;
  song?: {
    id: string;
    title: string;
    slug: string;
    artist?: {
      id: string;
      name: string;
      slug: string;
      imageUrl?: string | null;
    } | null;
  } | null;
};

const DB_NAME = "evcifras-offline";
const DB_VERSION = 1;
const STORE_NAME = "audio-tracks";

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error("Não foi possível abrir o banco offline."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });

        store.createIndex("savedAt", "savedAt");
        store.createIndex("songId", "songId");
      }
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openOfflineDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = callback(store);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error || new Error("Erro na operação offline."));
        };

        transaction.oncomplete = () => {
          db.close();
        };

        transaction.onerror = () => {
          reject(transaction.error || new Error("Erro na transação offline."));
          db.close();
        };
      }),
  );
}

export async function getOfflineAudioTracks(): Promise<OfflineAudioTrack[]> {
  const tracks = await runTransaction<OfflineAudioTrack[]>("readonly", (store) =>
    store.getAll(),
  );

  return tracks.sort((a, b) => {
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });
}

export async function getOfflineAudioTrack(
  id: string,
): Promise<OfflineAudioTrack | null> {
  const track = await runTransaction<OfflineAudioTrack | undefined>(
    "readonly",
    (store) => store.get(id),
  );

  return track || null;
}

export async function isAudioTrackOffline(id: string): Promise<boolean> {
  const track = await getOfflineAudioTrack(id);
  return Boolean(track);
}

export async function removeOfflineAudioTrack(id: string): Promise<void> {
  await runTransaction<undefined>("readwrite", (store) => store.delete(id));
}

export async function clearOfflineAudioTracks(): Promise<void> {
  await runTransaction<undefined>("readwrite", (store) => store.clear());
}

export async function saveAudioTrackOffline(
  track: OfflineAudioTrackInput,
): Promise<OfflineAudioTrack> {
  const response = await fetch(track.audioUrl, {
    method: "GET",
    mode: "cors",
  });

  if (!response.ok) {
    throw new Error("Não foi possível baixar o áudio para offline.");
  }

  const blob = await response.blob();

  const offlineTrack: OfflineAudioTrack = {
    id: track.id,
    title: track.title,
    description: track.description,
    type: track.type,
    audioUrl: track.audioUrl,
    durationSec: track.durationSec,
    sizeBytes: track.sizeBytes || blob.size,
    mimeType: track.mimeType || blob.type || "audio/mpeg",
    songId: track.songId,
    songTitle: track.song?.title || null,
    artistName: track.song?.artist?.name || null,
    artistImageUrl: track.song?.artist?.imageUrl || null,
    artistSlug: track.song?.artist?.slug || null,
    songSlug: track.song?.slug || null,
    savedAt: new Date().toISOString(),
    blob,
  };

  await runTransaction<IDBValidKey>("readwrite", (store) =>
    store.put(offlineTrack),
  );

  return offlineTrack;
}

export function createOfflineAudioObjectUrl(track: OfflineAudioTrack) {
  return URL.createObjectURL(track.blob);
}

export function formatOfflineBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) {
    return "-";
  }

  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}
