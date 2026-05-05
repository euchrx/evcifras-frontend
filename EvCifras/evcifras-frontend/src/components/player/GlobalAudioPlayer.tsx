import { useEffect } from "react";
import {
  ListMusic,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import type { GlobalAudioTrack } from "../../contexts/AudioPlayerContext";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getTrackTitle(track: GlobalAudioTrack) {
  return track.song?.title || track.title || "Música";
}

function getTrackArtist(track: GlobalAudioTrack) {
  return track.song?.artist?.name || "Artista";
}

function getTrackCover(track: GlobalAudioTrack) {
  return track.song?.artist?.imageUrl || "";
}

export function GlobalAudioPlayer() {
  const navigate = useNavigate();

  const {
    currentTrack,
    queue,
    isPlaying,
    duration,
    currentTime,
    volume,
    progress,
    setIsPlaying,
    seekToPercent,
    setVolumeValue,
    playNext,
    playPrevious,
    closePlayer,
  } = useAudioPlayer();

  const mediaTrack = currentTrack;

  useEffect(() => {
    if (!mediaTrack || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: getTrackTitle(mediaTrack),
      artist: getTrackArtist(mediaTrack),
      album: "EvCifras",
      artwork: getTrackCover(mediaTrack)
        ? [
          {
            src: getTrackCover(mediaTrack),
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

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, [mediaTrack, setIsPlaying, playNext, playPrevious]);

  if (!mediaTrack) {
    return null;
  }

  const activeTrack = mediaTrack;
  const artistName = getTrackArtist(activeTrack);
  const songTitle = getTrackTitle(activeTrack);
  const imageUrl = getTrackCover(activeTrack);

  function handleMainPlayButton() {
    if (!isPlaying) {
      navigate(`/ouvir/${activeTrack.id}`);
    }

    setIsPlaying(!isPlaying);
  }

  function handleOpenQueue() {
    navigate(`/ouvir/${activeTrack.id}?tab=queue`);
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

        <div className="grid items-center gap-3 md:grid-cols-[260px_1fr_260px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playPrevious}
              disabled={queue.length <= 1}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              title="Anterior"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleMainPlayButton}
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
              onClick={playNext}
              disabled={queue.length <= 1}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              title="Próxima"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <Link
            to={`/ouvir/${activeTrack.id}`}
            className="mx-auto flex min-w-0 max-w-xl items-center justify-start gap-3 text-left"
          >
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-violet-500/10">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={artistName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-violet-200">
                  <Music2 className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-black text-white">
                {songTitle}
              </p>

              <p className="truncate text-xs font-semibold text-violet-200">
                {artistName} • {formatTime(currentTime)} /{" "}
                {formatTime(duration || activeTrack.durationSec || 0)}
              </p>
            </div>
          </Link>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden w-28 items-center gap-2 lg:flex">
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

            <button
              type="button"
              onClick={handleOpenQueue}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              title="Fila"
            >
              <ListMusic className="h-4 w-4" />
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
      </div>
    </div>
  );
}

export default GlobalAudioPlayer;