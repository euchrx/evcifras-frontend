import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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

  duration: number;
  currentTime: number;
  volume: number;
  progress: number;

  playTrack: (track: GlobalAudioTrack, queue?: GlobalAudioTrack[]) => void;
  playQueue: (queue: GlobalAudioTrack[], startTrack?: GlobalAudioTrack) => void;

  setIsPlaying: (value: boolean) => void;
  setIsExpanded: (value: boolean) => void;

  seekToPercent: (value: number) => void;
  skipSeconds: (seconds: number) => void;
  setVolumeValue: (value: number) => void;

  playNext: () => void;
  playPrevious: () => void;
  closePlayer: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeTrackIdRef = useRef<string>("");
  const activeAudioUrlRef = useRef<string>("");

  const [currentTrack, setCurrentTrack] = useState<GlobalAudioTrack | null>(
    null,
  );
  const [queue, setQueue] = useState<GlobalAudioTrack[]>([]);
  const [isPlaying, setIsPlayingState] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [requestToken, setRequestToken] = useState(0);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  const progress = useMemo(() => {
    if (!duration) {
      return 0;
    }

    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const loadAndPlayTrack = useCallback(
    async (track: GlobalAudioTrack) => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      const isSameTrack =
        activeTrackIdRef.current === track.id &&
        activeAudioUrlRef.current === track.audioUrl;

      if (!isSameTrack) {
        activeTrackIdRef.current = track.id;
        activeAudioUrlRef.current = track.audioUrl;

        audio.src = track.audioUrl;
        audio.load();

        setCurrentTime(0);
        setDuration(track.durationSec || 0);
      }

      audio.volume = volume;

      try {
        await audio.play();
        setIsPlayingState(true);
      } catch {
        setIsPlayingState(false);
      }
    },
    [volume],
  );

  const playTrack = useCallback(
    (track: GlobalAudioTrack, nextQueue?: GlobalAudioTrack[]) => {
      const effectiveQueue =
        nextQueue && nextQueue.length > 0 ? nextQueue : [track];

      setQueue(effectiveQueue);
      setCurrentTrack(track);
      setIsExpanded(true);

      const isSameTrack =
        activeTrackIdRef.current === track.id &&
        activeAudioUrlRef.current === track.audioUrl;

      if (!isSameTrack) {
        setRequestToken((current) => current + 1);
      }

      void loadAndPlayTrack(track);
    },
    [loadAndPlayTrack],
  );

  const playQueue = useCallback(
    (nextQueue: GlobalAudioTrack[], startTrack?: GlobalAudioTrack) => {
      if (nextQueue.length === 0) {
        return;
      }

      const firstTrack = startTrack || nextQueue[0];

      setQueue(nextQueue);
      setCurrentTrack(firstTrack);
      setIsExpanded(true);

      const isSameTrack =
        activeTrackIdRef.current === firstTrack.id &&
        activeAudioUrlRef.current === firstTrack.audioUrl;

      if (!isSameTrack) {
        setRequestToken((current) => current + 1);
      }

      void loadAndPlayTrack(firstTrack);
    },
    [loadAndPlayTrack],
  );

  const setIsPlaying = useCallback((value: boolean) => {
    const audio = audioRef.current;

    if (!audio) {
      setIsPlayingState(value);
      return;
    }

    if (value) {
      audio.play().then(
        () => setIsPlayingState(true),
        () => setIsPlayingState(false),
      );
      return;
    }

    audio.pause();
    setIsPlayingState(false);
  }, []);

  const playNext = useCallback(() => {
    if (!currentTrack || queue.length === 0) {
      return;
    }

    const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
    const nextIndex =
      currentIndex === -1 || currentIndex === queue.length - 1
        ? 0
        : currentIndex + 1;

    const nextTrack = queue[nextIndex];

    setCurrentTrack(nextTrack);
    setRequestToken((current) => current + 1);

    void loadAndPlayTrack(nextTrack);
  }, [currentTrack, queue, loadAndPlayTrack]);

  const playPrevious = useCallback(() => {
    if (!currentTrack || queue.length === 0) {
      return;
    }

    const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
    const previousIndex =
      currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;

    const previousTrack = queue[previousIndex];

    setCurrentTrack(previousTrack);
    setRequestToken((current) => current + 1);

    void loadAndPlayTrack(previousTrack);
  }, [currentTrack, queue, loadAndPlayTrack]);

  const seekToPercent = useCallback(
    (value: number) => {
      const audio = audioRef.current;

      if (!audio || !duration) {
        return;
      }

      const nextTime = (value / 100) * duration;
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration],
  );

  const skipSeconds = useCallback((seconds: number) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = Math.min(
      Math.max(audio.currentTime + seconds, 0),
      audio.duration || 0,
    );
  }, []);

  const setVolumeValue = useCallback((value: number) => {
    const audio = audioRef.current;
    const nextVolume = Math.min(1, Math.max(0, value));

    setVolume(nextVolume);

    if (audio) {
      audio.volume = nextVolume;
    }
  }, []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    activeTrackIdRef.current = "";
    activeAudioUrlRef.current = "";

    setCurrentTrack(null);
    setIsPlayingState(false);
    setIsExpanded(false);
    setQueue([]);
    setDuration(0);
    setCurrentTime(0);
  }, []);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      currentTrack,
      queue,
      isPlaying,
      isExpanded,
      requestToken,

      duration,
      currentTime,
      volume,
      progress,

      playTrack,
      playQueue,
      setIsPlaying,
      setIsExpanded,

      seekToPercent,
      skipSeconds,
      setVolumeValue,

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
      duration,
      currentTime,
      volume,
      progress,
      playTrack,
      playQueue,
      setIsPlaying,
      seekToPercent,
      skipSeconds,
      setVolumeValue,
      playNext,
      playPrevious,
      closePlayer,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}

      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        className="hidden"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          setDuration(audio.duration || currentTrack?.durationSec || 0);
          audio.volume = volume;
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onPlay={() => setIsPlayingState(true)}
        onPause={() => setIsPlayingState(false)}
        onEnded={() => {
          if (queue.length > 1) {
            playNext();
          } else {
            setIsPlayingState(false);
          }
        }}
        onError={() => {
          setIsPlayingState(false);
        }}
      />
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