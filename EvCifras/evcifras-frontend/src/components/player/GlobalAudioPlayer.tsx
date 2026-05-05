import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import {
  Heart,
  ListMusic,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import type { GlobalAudioTrack } from "../../contexts/AudioPlayerContext";

const FAVORITES_STORAGE_KEY = "evcifras_favorite_audio_track_ids";

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

function getInitialFavoriteIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string");
    }

    return [];
  } catch {
    return [];
  }
}

function saveFavoriteIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
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

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    getInitialFavoriteIds(),
  );
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const [lastVolumeBeforeMute, setLastVolumeBeforeMute] = useState(1);

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
  const isFavorite = favoriteIds.includes(activeTrack.id);

  function openListenTrackPage() {
    navigate(`/ouvir/${activeTrack.id}`);
  }

  function handleMainPlayButton(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (!isPlaying) {
      navigate(`/ouvir/${activeTrack.id}`);
    }

    setIsPlaying(!isPlaying);
  }

  function handlePrevious(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    playPrevious();
  }

  function handleNext(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    playNext();
  }

  function handleOpenQueue(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    navigate(`/ouvir/${activeTrack.id}?tab=queue`);
  }

  function handleClose(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    closePlayer();
  }

  function handleFavorite(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    setFavoriteIds((current) => {
      const alreadyFavorite = current.includes(activeTrack.id);

      const next = alreadyFavorite
        ? current.filter((id) => id !== activeTrack.id)
        : [...current, activeTrack.id];

      saveFavoriteIds(next);

      return next;
    });
  }

  function handleToggleMute(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (volume > 0) {
      setLastVolumeBeforeMute(volume);
      setVolumeValue(0);
      return;
    }

    setVolumeValue(lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : 1);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openListenTrackPage}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          openListenTrackPage();
        }
      }}
      className="fixed bottom-0 left-0 right-0 z-50 cursor-pointer border-t border-white/10 bg-[#070A12]/95 text-white shadow-2xl shadow-black/50 backdrop-blur-xl print:hidden"
    >
      <div className="mx-auto max-w-7xl px-3 py-2 md:px-6 md:py-3">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => seekToPercent(Number(event.target.value))}
          className="mb-2 w-full cursor-pointer accent-violet-500 md:mb-3"
          aria-label="Progresso do áudio"
        />

        <div className="grid gap-2 md:grid-cols-[300px_1fr_300px] md:items-center md:gap-4">
          <div className="flex min-w-0 items-center gap-3 md:order-2 md:mx-auto md:max-w-xl">
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

            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-black text-white md:text-base">
                {songTitle}
              </p>

              <p className="mt-0.5 truncate text-xs font-semibold text-violet-200 md:text-sm">
                {artistName} • {formatTime(currentTime)} /{" "}
                {formatTime(duration || activeTrack.durationSec || 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 md:order-1 md:justify-start md:gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={queue.length <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 md:h-12 md:w-12"
                title="Anterior"
              >
                <SkipBack className="h-4 w-4 md:h-5 md:w-5" />
              </button>

              <button
                type="button"
                onClick={handleMainPlayButton}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400 md:h-14 md:w-14"
                title={isPlaying ? "Pausar" : "Tocar"}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-white md:h-6 md:w-6" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 fill-white md:h-6 md:w-6" />
                )}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={queue.length <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 md:h-12 md:w-12"
                title="Próxima"
              >
                <SkipForward className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={handleFavorite}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                  isFavorite
                    ? "border-pink-400/30 bg-pink-500/15 text-pink-200"
                    : "border-white/10 bg-white/5 text-white",
                ].join(" ")}
                title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
              >
                <Heart
                  className={[
                    "h-4 w-4",
                    isFavorite ? "fill-current" : "",
                  ].join(" ")}
                />
              </button>

              <button
                type="button"
                onClick={handleOpenQueue}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
                title="Fila"
              >
                <ListMusic className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="hidden items-center justify-end gap-2 md:order-3 md:flex">
            <div
              className="hidden items-center gap-3 lg:flex"
              onMouseEnter={() => setIsHoveringVolume(true)}
              onMouseLeave={() => setIsHoveringVolume(false)}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleToggleMute}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                title={volume > 0 ? "Mutar" : "Ativar som"}
              >
                {volume > 0 ? (
                  <Volume2 className="h-7 w-7" />
                ) : (
                  <VolumeX className="h-7 w-7" />
                )}
              </button>

              <div
                className={[
                  "overflow-hidden transition-all duration-300",
                  isHoveringVolume ? "w-32 opacity-100" : "w-0 opacity-0",
                ].join(" ")}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(volume * 100)}
                  onChange={(event) => {
                    const nextVolume = Number(event.target.value) / 100;

                    if (nextVolume > 0) {
                      setLastVolumeBeforeMute(nextVolume);
                    }

                    setVolumeValue(nextVolume);
                  }}
                  className="w-32 cursor-pointer accent-violet-500"
                  aria-label="Volume"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleFavorite}
              className={[
                "flex h-12 w-12 items-center justify-center rounded-2xl border transition",
                isFavorite
                  ? "border-pink-400/30 bg-pink-500/15 text-pink-200 hover:bg-pink-500/25"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10",
              ].join(" ")}
              title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
            >
              <Heart
                className={[
                  "h-5 w-5",
                  isFavorite ? "fill-current" : "",
                ].join(" ")}
              />
            </button>

            <button
              type="button"
              onClick={handleOpenQueue}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              title="Fila"
            >
              <ListMusic className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobalAudioPlayer;