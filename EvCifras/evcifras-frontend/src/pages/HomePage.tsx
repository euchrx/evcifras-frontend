import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  Guitar,
  Loader2,
  Music2,
  PlayCircle,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
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
  status?: string;
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

export function HomePage() {
  const navigate = useNavigate();

  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const popularSongs = useMemo(() => {
    return [...songs].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
  }, [songs]);

  const recentSongs = useMemo(() => songs.slice(0, 8), [songs]);

  const featuredArtists = useMemo(() => {
    return [...artists]
      .sort((a, b) => (b._count?.songs || 0) - (a._count?.songs || 0))
      .slice(0, 6);
  }, [artists]);

  const genres = useMemo(() => {
    const uniqueGenres = new Set<string>();

    songs.forEach((song) => {
      if (song.genre) {
        uniqueGenres.add(song.genre);
      }
    });

    return Array.from(uniqueGenres).slice(0, 8);
  }, [songs]);

  async function loadHome() {
    try {
      setLoading(true);
      setError("");

      const [songsResponse, artistsResponse] = await Promise.all([
        api.get<Song[]>("/songs"),
        api.get<Artist[]>("/artists"),
      ]);

      setSongs(songsResponse.data);
      setArtists(artistsResponse.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar o EvCifras."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHome();
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      return;
    }

    navigate(`/busca?q=${encodeURIComponent(query)}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
          Carregando EvCifras...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-violet-500/20 via-white/[0.04] to-blue-500/10 p-6 shadow-2xl shadow-black/30 md:p-10">
        <div className="pointer-events-none absolute right-[-6rem] top-[-6rem] h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-7rem] left-[20%] h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Cifras, música e repertórios
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl">
              Toque suas músicas favoritas com cifras simples e organizadas.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Busque músicas, salve favoritas, monte repertórios e use uma página de cifra pensada para tocar ao vivo.
            </p>

            <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-black/30 p-2 md:flex-row">
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
                Buscar cifra
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {genres.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <Link
                    key={genre}
                    to={`/busca?q=${encodeURIComponent(genre)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-950/40">
                <Guitar className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-black text-white">EvCifras</p>
                <p className="text-xs text-slate-500">Plataforma musical</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cifras</p>
                <p className="mt-2 text-3xl font-black text-white">{songs.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Artistas</p>
                <p className="mt-2 text-3xl font-black text-white">{artists.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-violet-300">Mais acessadas</p>
              <h2 className="mt-1 text-2xl font-black text-white">Cifras populares</h2>
            </div>
            <Link to="/busca" className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 md:inline-flex">
              Ver todas
            </Link>
          </div>

          {popularSongs.length === 0 ? (
            <EmptyState title="Nenhuma cifra publicada" description="Publique cifras no admin para aparecerem aqui." />
          ) : (
            <div className="mt-6 grid gap-3">
              {popularSongs.map((song, index) => (
                <SongListCard key={song.id} song={song} index={index + 1} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
            <p className="text-sm font-semibold text-violet-300">Artistas</p>
            <h2 className="mt-1 text-2xl font-black text-white">Em destaque</h2>

            {featuredArtists.length === 0 ? (
              <EmptyState title="Nenhum artista" description="Cadastre artistas no painel admin." compact />
            ) : (
              <div className="mt-6 space-y-3">
                {featuredArtists.map((artist) => (
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
          </div>
        </aside>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-violet-300">Novidades</p>
            <h2 className="mt-1 text-2xl font-black text-white">Cifras recentes</h2>
          </div>
          <Link to="/busca" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
            Explorar
          </Link>
        </div>

        {recentSongs.length === 0 ? (
          <EmptyState title="Sem cifras recentes" description="As cifras publicadas aparecerão aqui." />
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentSongs.map((song) => (
              <Link
                key={song.id}
                to={getSongUrl(song)}
                className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-500/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                  <Music2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 line-clamp-2 text-lg font-black text-white">{song.title}</h3>
                <p className="mt-2 truncate text-sm font-semibold text-violet-200">{song.artist?.name || "Artista"}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Tom {song.currentKey || song.originalKey || "-"}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{difficultyLabels[song.difficulty]}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SongListCard({ song, index }: { song: Song; index: number }) {
  return (
    <Link
      to={getSongUrl(song)}
      className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-500/10"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
            <span className="text-sm font-black">#{index}</span>
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
          <span className="inline-flex items-center gap-1 text-violet-200">
            <PlayCircle className="h-4 w-4" />
            Abrir
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ title, description, compact = false }: { title: string; description?: string; compact?: boolean }) {
  return (
    <div className={`mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 text-center ${compact ? "p-5" : "p-8"}`}>
      <Star className="mx-auto h-10 w-10 text-slate-500" />
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
    </div>
  );
}

export default HomePage;
