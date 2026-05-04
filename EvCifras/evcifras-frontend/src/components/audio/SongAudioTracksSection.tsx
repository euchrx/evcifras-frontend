import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock3,
  FileAudio,
  Headphones,
  Loader2,
  Music2,
} from "lucide-react";
import { api } from "../../services/api";
import PlayAudioTrackButton from "./PlayAudioTrackButton";
import type { GlobalAudioTrack } from "../../contexts/AudioPlayerContext";

type SongAudioTracksSectionProps = {
  songId: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const typeLabels: Record<string, string> = {
  ORIGINAL: "Original",
  PLAYBACK: "Playback",
  GUIDE: "Guia",
  LESSON: "Aula",
  DEMO: "Demo",
  OTHER: "Áudio",
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getTrackDisplayTitle(track: GlobalAudioTrack) {
  const typeLabel = typeLabels[track.type] || "Áudio";

  if (track.song?.title) {
    return typeLabel;
  }

  return typeLabel;
}

function getTrackSubtitle(track: GlobalAudioTrack) {
  const artistName = track.song?.artist?.name;
  const songTitle = track.song?.title;

  if (artistName && songTitle) {
    return `${artistName} • ${songTitle}`;
  }

  if (songTitle) {
    return songTitle;
  }

  return "Faixa disponível";
}

export function SongAudioTracksSection({ songId }: SongAudioTracksSectionProps) {
  const [tracks, setTracks] = useState<GlobalAudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTracks() {
      if (!songId) {
        setTracks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get<GlobalAudioTrack[]>(
          `/audio-tracks/song/${songId}`,
        );

        setTracks(response.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Não foi possível carregar os áudios."));
      } finally {
        setLoading(false);
      }
    }

    loadTracks();
  }, [songId]);

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
          Carregando áudios...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
            <FileAudio className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-white">Áudios</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Ainda não há áudios publicados para esta cifra.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
          <Headphones className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-bold text-white">Ouvir esta música</p>
          <p className="mt-1 text-xs text-slate-400">
            {tracks.length} áudio{tracks.length > 1 ? "s" : ""} disponível
            {tracks.length > 1 ? "eis" : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {tracks.map((track) => (
          <article
            key={track.id}
            className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                <Music2 className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black text-white">
                  {getTrackDisplayTitle(track)}
                </h3>

                <p className="mt-1 truncate text-xs font-semibold text-violet-200">
                  {getTrackSubtitle(track)}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDuration(track.durationSec)}
                  </span>
                </div>

                {track.description && (
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">
                    {track.description}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <PlayAudioTrackButton
                    track={track}
                    queue={tracks}
                    label="Tocar"
                  />

                  <Link
                    to={`/ouvir/${track.id}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    Player
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SongAudioTracksSection;