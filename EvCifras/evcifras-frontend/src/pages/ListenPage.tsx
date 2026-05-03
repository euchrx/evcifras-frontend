import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  FileAudio,
  Headphones,
  Loader2,
  Music2,
  Search,
} from "lucide-react";
import { api } from "../services/api";

type AudioTrackType = "ORIGINAL" | "PLAYBACK" | "GUIDE" | "LESSON" | "DEMO" | "OTHER";

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

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getSongUrl(track: AudioTrack) {
  if (!track.song?.artist?.slug || !track.song?.slug) {
    return "/";
  }

  return `/cifras/${track.song.artist.slug}/${track.song.slug}`;
}

export function ListenPage() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredTracks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tracks.filter((track) => {
      const songTitle = track.song?.title || "";
      const artistName = track.song?.artist?.name || "";
      const genre = track.song?.genre || "";

      const matchesSearch =
        !normalizedSearch ||
        track.title.toLowerCase().includes(normalizedSearch) ||
        track.description?.toLowerCase().includes(normalizedSearch) ||
        songTitle.toLowerCase().includes(normalizedSearch) ||
        artistName.toLowerCase().includes(normalizedSearch) ||
        genre.toLowerCase().includes(normalizedSearch);

      const matchesType = !typeFilter || track.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [tracks, search, typeFilter]);

  async function loadTracks() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<AudioTrack[]>("/audio-tracks");
      setTracks(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar os áudios."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTracks();
  }, []);

  return (
    <div className="mx-auto max-w-5xl pb-20">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para início
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.04] to-blue-500/10 p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <Headphones className="h-3.5 w-3.5" />
              EvCifras Player
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Ouvir músicas
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Acesse guias, playbacks, aulas e demos publicados para estudar e tocar junto.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:min-w-[180px]">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Áudios
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {tracks.length}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por música, artista, gênero ou áudio..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
          >
            <option value="">Todos tipos</option>
            <option value="ORIGINAL">Original</option>
            <option value="PLAYBACK">Playback</option>
            <option value="GUIDE">Guia</option>
            <option value="LESSON">Aula</option>
            <option value="DEMO">Demo</option>
            <option value="OTHER">Outro</option>
          </select>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-300" />
          Carregando áudios...
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center">
          <FileAudio className="mx-auto h-12 w-12 text-slate-500" />
          <h2 className="mt-4 text-xl font-black text-white">
            Nenhum áudio encontrado
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Tente buscar por outro termo ou aguarde novos áudios publicados.
          </p>
        </div>
      ) : (
        <section className="mt-6 grid gap-4">
          {filteredTracks.map((track) => {
            const song = track.song;
            const artist = song?.artist;

            return (
              <article
                key={track.id}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 transition hover:border-violet-400/40 hover:bg-violet-500/10 md:p-5"
              >
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-violet-500/10 md:h-20 md:w-20">
                    {artist?.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-violet-200">
                        <Music2 className="h-7 w-7" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black text-white md:text-xl">
                          {song?.title || track.title}
                        </h2>

                        <p className="mt-1 truncate text-sm font-semibold text-violet-200">
                          {artist?.name || "Artista"} • {track.title}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            {typeLabels[track.type]}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDuration(track.durationSec)}
                          </span>

                          {song?.genre && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {song.genre}
                            </span>
                          )}

                          {(song?.currentKey || song?.originalKey) && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              Tom {song.currentKey || song.originalKey}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Link
                          to={`/ouvir/${track.id}`}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
                        >
                          <Headphones className="h-4 w-4" />
                          Ouvir
                        </Link>

                        <Link
                          to={getSongUrl(track)}
                          className="hidden h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 sm:inline-flex"
                        >
                          Cifra
                        </Link>
                      </div>
                    </div>

                    {track.description && (
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                        {track.description}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default ListenPage;
