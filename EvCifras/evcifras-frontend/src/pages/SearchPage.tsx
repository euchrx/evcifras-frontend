import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Disc3, Eye, Loader2, Music2, Search, Users } from "lucide-react";
import { api } from "../services/api";

type Artist = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  bio?: string | null;
  mainGenre?: string | null;
  _count?: {
    songs: number;
  };
};

type Song = {
  id: string;
  title: string;
  slug: string;
  originalKey?: string | null;
  currentKey?: string | null;
  genre?: string | null;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  views: number;
  artist?: Artist | null;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const difficultyLabels: Record<Song["difficulty"], string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

function getSongUrl(song: Song) {
  if (!song.artist?.slug || !song.slug) {
    return "/";
  }

  return `/cifras/${song.artist.slug}/${song.slug}`;
}

export function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const query = new URLSearchParams(location.search).get("q") || "";

  const [search, setSearch] = useState(query);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredArtists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return artists.slice(0, 8);
    }

    return artists.filter((artist) => {
      return (
        artist.name.toLowerCase().includes(normalizedQuery) ||
        artist.mainGenre?.toLowerCase().includes(normalizedQuery) ||
        artist.bio?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [artists, query]);

  async function loadSearch() {
    try {
      setLoading(true);
      setError("");

      const [songsResponse, artistsResponse] = await Promise.all([
        api.get<Song[]>("/songs", {
          params: query ? { search: query } : undefined,
        }),
        api.get<Artist[]>("/artists", {
          params: query ? { search: query } : undefined,
        }),
      ]);

      setSongs(songsResponse.data);
      setArtists(artistsResponse.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível buscar resultados."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSearch(query);
    loadSearch();
  }, [query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = search.trim();

    if (!value) {
      navigate("/busca");
      return;
    }

    navigate(`/busca?q=${encodeURIComponent(value)}`);
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.04] to-blue-500/10 p-6 shadow-2xl shadow-black/30 md:p-8">
        <p className="text-sm font-semibold text-violet-300">Busca EvCifras</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
          {query ? `Resultados para “${query}”` : "Encontre sua próxima música"}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          Pesquise por música, artista, gênero ou trecho da letra/cifra.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-black/30 p-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar música, artista ou gênero..."
              className="h-14 w-full rounded-2xl border border-transparent bg-transparent pl-12 pr-4 text-sm font-medium text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-6 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
          >
            Buscar
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-300" />
          Buscando resultados...
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
            <div>
              <p className="text-sm font-semibold text-violet-300">Músicas</p>
              <h2 className="mt-1 text-2xl font-black text-white">{songs.length} cifras encontradas</h2>
            </div>

            {songs.length === 0 ? (
              <EmptyState icon="song" title="Nenhuma cifra encontrada" description="Tente buscar por outro termo ou confira os artistas cadastrados." />
            ) : (
              <div className="mt-6 grid gap-3">
                {songs.map((song) => (
                  <Link
                    key={song.id}
                    to={getSongUrl(song)}
                    className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                          <Music2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-white">{song.title}</h3>
                          <p className="mt-1 text-sm font-semibold text-violet-200">{song.artist?.name || "Artista"}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                            {song.genre && <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{song.genre}</span>}
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{difficultyLabels[song.difficulty]}</span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Tom {song.currentKey || song.originalKey || "-"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {song.views || 0}
                        </span>
                        <span className="font-bold text-violet-200">Abrir cifra</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
            <p className="text-sm font-semibold text-violet-300">Artistas</p>
            <h2 className="mt-1 text-2xl font-black text-white">{filteredArtists.length} encontrados</h2>

            {filteredArtists.length === 0 ? (
              <EmptyState icon="artist" title="Nenhum artista" description="Nenhum artista encontrado para essa busca." />
            ) : (
              <div className="mt-6 space-y-3">
                {filteredArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    to={`/artistas/${artist.slug}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-violet-500/10 text-violet-200">
                      {artist.imageUrl ? (
                        <img src={artist.imageUrl} alt={artist.name} className="h-full w-full object-cover" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">{artist.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{artist.mainGenre || "Artista"} • {artist._count?.songs || 0} cifras</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon: "song" | "artist" }) {
  return (
    <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
      {icon === "song" ? (
        <Disc3 className="mx-auto h-10 w-10 text-slate-500" />
      ) : (
        <Users className="mx-auto h-10 w-10 text-slate-500" />
      )}
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default SearchPage;
