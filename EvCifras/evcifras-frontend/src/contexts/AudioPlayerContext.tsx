import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type GlobalAudioTrackType =
  | "ORIGINAL"
  | "PLAYBACK"
  | "GUIDE"
  | "LESSON"
  | "DEMO"
  | "OTHER";

export type GlobalAudioTrack = {
  id: string;
  title: string;
  description?: string | null;
  type: GlobalAudioTrackType;
  status?: string;
  audioUrl: string;
  durationSec?: number | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  songId: string;
  song?: {
    id: string;
    title: string;
    slug: string;
    originalKey?: string | null;
    currentKey?: string | null;
    genre?: string | null;
    artist?: {
      id: string;
      name: string;
      slug: string;
      imageUrl?: string | null;
    } | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type AudioPlayerContextValue = {
  currentTrack: GlobalAudioTrack | null;
  queue: GlobalAudioTrack[];
  isPlaying: boolean;
  isExpanded: boolean;
  requestToken: number;
  playTrack: (track: GlobalAudioTrack, queue?: GlobalAudioTrack[]) => void;
  playQueue: (queue: GlobalAudioTrack[], startTrack?: GlobalAudioTrack) => void;
  setIsPlaying: (value: boolean) => void;
  setIsExpanded: (value: boolean) => void;
  playNext: () => void;
  playPrevious: () => void;
  closePlayer: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<GlobalAudioTrack | null>(
    null,
  );
  const [queue, setQueue] = useState<GlobalAudioTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [requestToken, setRequestToken] = useState(0);

  const playTrack = useCallback(
    (track: GlobalAudioTrack, nextQueue?: GlobalAudioTrack[]) => {
      setQueue(nextQueue && nextQueue.length > 0 ? nextQueue : [track]);
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsExpanded(true);
      setRequestToken((current) => current + 1);
    },
    [],
  );

  const playQueue = useCallback(
    (nextQueue: GlobalAudioTrack[], startTrack?: GlobalAudioTrack) => {
      if (nextQueue.length === 0) {
        return;
      }

      const firstTrack = startTrack || nextQueue[0];

      setQueue(nextQueue);
      setCurrentTrack(firstTrack);
      setIsPlaying(true);
      setIsExpanded(true);
      setRequestToken((current) => current + 1);
    },
    [],
  );

  const playNext = useCallback(() => {
    if (!currentTrack || queue.length === 0) {
      return;
    }

    const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
    const nextIndex =
      currentIndex === -1 || currentIndex === queue.length - 1
        ? 0
        : currentIndex + 1;

    setCurrentTrack(queue[nextIndex]);
    setIsPlaying(true);
    setRequestToken((current) => current + 1);
  }, [currentTrack, queue]);

  const playPrevious = useCallback(() => {
    if (!currentTrack || queue.length === 0) {
      return;
    }

    const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
    const previousIndex =
      currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;

    setCurrentTrack(queue[previousIndex]);
    setIsPlaying(true);
    setRequestToken((current) => current + 1);
  }, [currentTrack, queue]);

  const closePlayer = useCallback(() => {
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsExpanded(false);
    setQueue([]);
  }, []);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      currentTrack,
      queue,
      isPlaying,
      isExpanded,
      requestToken,
      playTrack,
      playQueue,
      setIsPlaying,
      setIsExpanded,
      playNext,
      playPrevious,
      closePlayer,
    }),
    [
      currentTrack,
      queue,
      isPlaying,
      isExpanded,
      requestToken,
      playTrack,
      playQueue,
      playNext,
      playPrevious,
      closePlayer,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);

  if (!context) {
    throw new Error(
      "useAudioPlayer deve ser usado dentro de AudioPlayerProvider.",
    );
  }

  return context;
}
