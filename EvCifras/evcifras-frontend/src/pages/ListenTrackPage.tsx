import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Headphones,
  Loader2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
} from "lucide-react";
import { api } from "../services/api";
import OfflineAudioButton from "../components/audio/OfflineAudioButton";
import {
  useAudioPlayer,
  type GlobalAudioTrack,
} from "../contexts/AudioPlayerContext";

type AudioTrackType =
  | "ORIGINAL"
  | "PLAYBACK"
  | "GUIDE"
  | "LESSON"
  | "DEMO"
  | "OTHER";

type AudioTrack = {
  id: string;
  title: string;
  description?: string | null;
  type: AudioTrackType;
  status: "PUBLISHED";
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
  createdAt: string;
  updatedAt: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const typeLabels: Record<AudioTrackType, string> = {
  ORIGINAL: "Original",
  PLAYBACK: "Playback",
  GUIDE: "Guia",
  LESSON: "Aula",
  DEMO: "Demo",
  OTHER: "Outro",
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getSongUrl(track: AudioTrack) {
  if (!track.song?.artist?.slug || !track.song?.slug) {
    return "/";
  }

  return `/cifras/${track.song.artist.slug}/${track.song.slug}`;
}

function getPlayableAudioUrl(audioUrl: string) {
  if (!audioUrl) {
    return "";
  }

  try {
    const url = new URL(audioUrl);
    const currentHost = window.location.hostname;

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = currentHost;
    }

    return url.toString();
  } catch {
    return audioUrl;
  }
}

export function ListenTrackPage() {
  const { trackId } = useParams<{ trackId: string }>();

  const {
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    progress,
    playTrack,
    setIsPlaying,
    seekToPercent,
    skipSeconds,
    setVolumeValue,
  } = useAudioPlayer();

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const artistName = track?.song?.artist?.name || "Artista";
  const songTitle = track?.song?.title || track?.title || "Áudio";
  const imageUrl = track?.song?.artist?.imageUrl;
  const playableAudioUrl = track ? getPlayableAudioUrl(track.audioUrl) : "";

  const isCurrentTrack = currentTrack?.id === track?.id;
  const effectiveDuration = isCurrentTrack
    ? duration || track?.durationSec || 0
    : track?.durationSec || 0;
  const effectiveCurrentTime = isCurrentTrack ? currentTime : 0;
  const effectiveProgress = isCurrentTrack ? progress : 0;
  const effectiveIsPlaying = isCurrentTrack && isPlaying;

  const playerTrack = useMemo<GlobalAudioTrack | null>(() => {
    if (!track) {
      return null;
    }

    return {
      ...track,
      audioUrl: playableAudioUrl,
    };
  }, [track, playableAudioUrl]);

  const loadTrack = useCallback(async () => {
    if (!trackId) {
      setError("Áudio inválido.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get<AudioTrack>(`/audio-tracks/${trackId}`);
      setTrack(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar o áudio."));
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    loadTrack();
  }, [loadTrack]);

  function handlePlayPause() {
    if (!playerTrack) {
      return;
    }

    setError("");

    if (isCurrentTrack) {
      setIsPlaying(!isPlaying);
      return;
    }

    playTrack(playerTrack, [playerTrack]);
  }

  function handleSeek(value: string) {
    if (!isCurrentTrack) {
      return;
    }

    seekToPercent(Number(value));
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
          Carregando player...
        </div>
      </div>
    );
  }

  if (!track || !playerTrack) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <Link
          to="/ouvir"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para ouvir
        </Link>

        <div className="mt-8 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8">
          <p className="text-sm font-semibold text-red-300">Erro</p>
          <h1 className="mt-3 text-2xl font-bold text-white">
            Áudio não encontrado
          </h1>
          <p className="mt-3 text-slate-300">
            {error || "Não foi possível encontrar este áudio."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pb-20">
      <Link
        to="/ouvir"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para ouvir
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-violet-500/20 via-white/[0.05] to-blue-500/10 p-5 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
            <Headphones className="h-3.5 w-3.5" />
            {typeLabels[track.type]}
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            <Clock3 className="h-3.5 w-3.5" />
            {formatTime(effectiveDuration)}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="h-64 w-64 overflow-hidden rounded-[2.25rem] border border-white/10 bg-black/30 shadow-2xl shadow-black/40">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={artistName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-violet-500/10 text-violet-200">
                <Music2 className="h-24 w-24" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">
            {songTitle}
          </h1>

          <p className="mt-2 text-base font-semibold text-violet-200">
            {artistName}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {typeLabels[track.type]}
          </p>
        </div>

        {track.description && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm leading-6 text-slate-300">
            {track.description}
          </p>
        )}

        <div className="mt-8">
          <input
            type="range"
            min="0"
            max="100"
            value={effectiveProgress}
            onChange={(event) => handleSeek(event.target.value)}
            disabled={!isCurrentTrack}
            className="w-full accent-violet-500 disabled:opacity-40"
            aria-label="Progresso do áudio"
          />

          <div className="mt-2 flex justify-between text-xs font-semibold text-slate-400">
            <span>{formatTime(effectiveCurrentTime)}</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => skipSeconds(-10)}
            disabled={!isCurrentTrack}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={handlePlayPause}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-500 text-white shadow-2xl shadow-violet-950/40 transition hover:bg-violet-400"
          >
            {effectiveIsPlaying ? (
              <Pause className="h-9 w-9 fill-white" />
            ) : (
              <Play className="ml-1 h-9 w-9 fill-white" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skipSeconds(10)}
            disabled={!isCurrentTrack}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <Volume2 className="h-4 w-4 text-slate-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(event) =>
              setVolumeValue(Number(event.target.value) / 100)
            }
            className="w-full accent-violet-500"
            aria-label="Volume"
          />
        </div>

        <div className="mt-4">
          <OfflineAudioButton track={playerTrack} />
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to={getSongUrl(track)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <BookOpen className="h-4 w-4" />
            Abrir cifra
          </Link>

          <Link
            to="/ouvir"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-violet-500 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
          >
            Mais áudios
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          A música continua tocando ao sair desta tela. O player global aparece
          automaticamente nas outras páginas.
        </p>
      </section>
    </div>
  );
}

export default ListenTrackPage;