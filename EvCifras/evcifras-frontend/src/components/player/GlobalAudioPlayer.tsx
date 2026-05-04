import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Headphones,
  ListMusic,
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";

const typeLabels: Record<string, string> = {
  ORIGINAL: "Original",
  PLAYBACK: "Playback",
  GUIDE: "Guia",
  LESSON: "Aula",
  DEMO: "Demo",
  OTHER: "Outro",
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getSongUrl(trackId: string, artistSlug?: string, songSlug?: string) {
  if (!artistSlug || !songSlug) {
    return `/ouvir/${trackId}`;
  }

  return `/cifras/${artistSlug}/${songSlug}`;
}

export function GlobalAudioPlayer() {
  const location = useLocation();

  const {
    currentTrack,
    queue,
    isPlaying,
    isExpanded,
    duration,
    currentTime,
    volume,
    progress,
    setIsPlaying,
    setIsExpanded,
    seekToPercent,
    skipSeconds,
    setVolumeValue,
    playNext,
    playPrevious,
    closePlayer,
  } = useAudioPlayer();

  const [showQueue, setShowQueue] = useState(false);

  const hideVisualPlayer = /^\/ouvir\/[^/]+/.test(location.pathname);

  const artistName = currentTrack?.song?.artist?.name || "Artista";
  const songTitle = currentTrack?.song?.title || currentTrack?.title || "Áudio";
  const imageUrl = currentTrack?.song?.artist?.imageUrl;
  const artistSlug = currentTrack?.song?.artist?.slug;
  const songSlug = currentTrack?.song?.slug;

  useEffect(() => {
    if (!currentTrack || !("mediaSession" in navigator)) {
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
      setIsPlaying(true);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      setIsPlaying(false);
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      playPrevious();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      playNext();
    });

    navigator.mediaSession.setActionHandler("seekbackward", () => {
      skipSeconds(-10);
    });

    navigator.mediaSession.setActionHandler("seekforward", () => {
      skipSeconds(10);
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, [
    currentTrack,
    songTitle,
    artistName,
    imageUrl,
    setIsPlaying,
    playNext,
    playPrevious,
    skipSeconds,
  ]);

  if (!currentTrack || hideVisualPlayer) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#070A12]/95 text-white shadow-2xl shadow-black/50 backdrop-blur-xl print:hidden">
      <div className="mx-auto max-w-7xl px-3 py-2 md:px-6">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(event) => seekToPercent(Number(event.target.value))}
          className="mb-2 w-full accent-violet-500"
          aria-label="Progresso do áudio"
        />

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-violet-500/10 md:h-14 md:w-14">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={artistName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-violet-200">
                <Music2 className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white md:text-base">
              {songTitle}
            </p>
            <p className="truncate text-xs font-semibold text-violet-200">
              {artistName}
            </p>

            <div className="mt-1 hidden items-center gap-2 text-xs text-slate-500 sm:flex">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration || currentTrack.durationSec || 0)}</span>
              <span>•</span>
              <span>{typeLabels[currentTrack.type] || "Áudio"}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={playPrevious}
              disabled={queue.length <= 1}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
              title="Anterior"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(-10)}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:flex"
              title="Voltar 10s"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
              title={isPlaying ? "Pausar" : "Tocar"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-white" />
              ) : (
                <Play className="ml-0.5 h-5 w-5 fill-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(10)}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:flex"
              title="Avançar 10s"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={playNext}
              disabled={queue.length <= 1}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
              title="Próxima"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden w-32 items-center gap-2 lg:flex">
            <Volume2 className="h-4 w-4 text-slate-500" />
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

          <div className="flex shrink-0 items-center gap-1">
            <Link
              to={getSongUrl(currentTrack.id, artistSlug, songSlug)}
              className="hidden h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition hover:bg-white/10 md:inline-flex"
            >
              Cifra
            </Link>

            <button
              type="button"
              onClick={() => setShowQueue((current) => !current)}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 sm:flex"
              title="Fila"
            >
              <ListMusic className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              title="Expandir"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={closePlayer}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 md:hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || currentTrack.durationSec || 0)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={playPrevious}
                disabled={queue.length <= 1}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white disabled:opacity-40"
              >
                <SkipBack className="h-4 w-4" />
                Ant.
              </button>

              <Link
                to={`/ouvir/${currentTrack.id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white"
              >
                <Headphones className="h-4 w-4" />
                Player
              </Link>

              <button
                type="button"
                onClick={playNext}
                disabled={queue.length <= 1}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white disabled:opacity-40"
              >
                Próx.
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <Volume2 className="h-4 w-4 text-slate-500" />
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
          </div>
        )}

        {showQueue && queue.length > 1 && (
          <div className="mt-3 hidden max-h-52 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3 sm:block">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Fila
            </p>

            <div className="grid gap-2">
              {queue.map((track, index) => {
                const isCurrent = track.id === currentTrack.id;

                return (
                  <div
                    key={`${track.id}-${index}`}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm",
                      isCurrent
                        ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
                        : "border-white/10 bg-white/5 text-slate-300",
                    ].join(" ")}
                  >
                    <p className="truncate font-bold">
                      {index + 1}. {track.song?.title || track.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {track.song?.artist?.name || "Artista"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GlobalAudioPlayer;