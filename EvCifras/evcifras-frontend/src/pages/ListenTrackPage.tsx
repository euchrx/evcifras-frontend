import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Headphones,
  Loader2,
  Music2,
} from "lucide-react";
import { api } from "../services/api";
import OfflineAudioButton from "../components/audio/OfflineAudioButton";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);

  const artistName = track?.song?.artist?.name || "Artista";
  const songTitle = track?.song?.title || track?.title || "Áudio";
  const imageUrl = track?.song?.artist?.imageUrl;
  const playableAudioUrl = track ? getPlayableAudioUrl(track.audioUrl) : "";

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

  useEffect(() => {
    if (!track || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: songTitle,
      artist: artistName,
      album: "EvCifras",
      artwork: imageUrl
        ? [
            {
              src: imageUrl,
              sizes: "512x512",
              type: "image/png",
            },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
    });

    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (!audioRef.current) {
        return;
      }

      audioRef.current.currentTime = Math.max(
        0,
        audioRef.current.currentTime - 10,
      );
    });

    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (!audioRef.current) {
        return;
      }

      audioRef.current.currentTime = Math.min(
        audioRef.current.duration || 0,
        audioRef.current.currentTime + 10,
      );
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, [track, songTitle, artistName, imageUrl]);

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

  if (!track) {
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
            {formatTime(duration || track.durationSec || 0)}
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

          <p className="mt-1 text-sm text-slate-400">{track.title}</p>
        </div>

        {track.description && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm leading-6 text-slate-300">
            {track.description}
          </p>
        )}

        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
          <audio
            key={playableAudioUrl}
            ref={audioRef}
            src={playableAudioUrl}
            controls
            preload="metadata"
            playsInline
            onLoadedMetadata={(event) => {
              const audio = event.currentTarget;
              setDuration(audio.duration || track.durationSec || 0);
            }}
            onPlay={() => {
              setError("");
            }}
            onError={(event) => {
              const code = event.currentTarget.error?.code;

              const messageByCode: Record<number, string> = {
                1: "Reprodução cancelada.",
                2: "Erro de rede ao carregar o áudio.",
                3: "O navegador não conseguiu decodificar este áudio.",
                4: "Formato de áudio não suportado pelo navegador.",
              };

              setError(
                messageByCode[code || 0] ||
                  "Não foi possível reproduzir este áudio neste dispositivo.",
              );
            }}
            className="w-full"
          />

          <a
            href={playableAudioUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block truncate text-center text-xs font-semibold text-violet-200 underline"
          >
            Tocar no navegador
          </a>
        </div>

        <div className="mt-4">
          <OfflineAudioButton
            track={{
              ...track,
              audioUrl: playableAudioUrl,
            }}
          />
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
          Para ouvir em segundo plano, dê play e bloqueie a tela ou troque de
          app. Em alguns navegadores, o recurso funciona melhor com o site
          instalado como PWA.
        </p>
      </section>
    </div>
  );
}

export default ListenTrackPage;