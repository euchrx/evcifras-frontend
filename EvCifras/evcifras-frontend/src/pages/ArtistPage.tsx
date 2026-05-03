import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Disc3,
  Eye,
  Guitar,
  Loader2,
  Music2,
  Search,
  Star,
} from "lucide-react";
import { api } from "../services/api";

type ArtistSong = {
  id: string;
  title: string;
  slug: string;
  originalKey?: string | null;
  currentKey?: string | null;
  genre?: string | null;
  difficulty: string;
  views: number;
  createdAt: string;
};

type ArtistDetail = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  bio?: string | null;
  mainGenre?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  songs: ArtistSong[];
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const difficultyLabels: Record<string, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

export function ArtistPage() {
  const { artistSlug } = useParams<{ artistSlug: string }>();

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredSongs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!artist?.songs) {
      return [];
    }

    if (!normalizedSearch) {
      return artist.songs;
    }

    return artist.songs.filter((song) => {
      return (
        song.title.toLowerCase().includes(normalizedSearch) ||
        song.genre?.toLowerCase().includes(normalizedSearch) ||
        difficultyLabels[song.difficulty]
          ?.toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [artist?.songs, search]);

  useEffect(() => {
    async function loadArtist() {
      if (!artistSlug) {
        setError("Artista inválido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get<ArtistDetail>(`/artists/${artistSlug}`);
        setArtist(response.data);
      } catch (err) {
        setError(
          getApiErrorMessage(err, "Não foi possível carregar o artista."),
        );
      } finally {
        setLoading(false);
      }
    }

    loadArtist();
  }, [artistSlug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
          Carregando artista...
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para início
        </Link>

        <div className="mt-8 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8">
          <p className="text-sm font-semibold text-red-300">Erro</p>
          <h1 className="mt-3 text-2xl font-bold text-white">
            Artista não encontrado
          </h1>
          <p className="mt-3 text-slate-300">
            {error || "Não foi possível encontrar este artista."}
          </p>
        </div>
      </div>
    );
  }

  const totalViews = artist.songs.reduce((sum, song) => sum + song.views, 0);

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para início
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.04] to-blue-500/10 shadow-2xl shadow-black/30">
        <div className="grid gap-8 p-6 md:grid-cols-[220px_1fr] md:p-8">
          <div className="flex justify-center md:block">
            <div className="relative h-44 w-44 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30 md:h-52 md:w-52">
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-violet-500/10 text-violet-200">
                  <Music2 className="h-16 w-16" />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              {artist.mainGenre && (
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                  {artist.mainGenre}
                </span>
              )}

              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Guitar className="h-3.5 w-3.5" />
                {artist.songs.length} cifras
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Eye className="h-3.5 w-3.5" />
                {totalViews} visualizações
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              {artist.name}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              {artist.bio ||
                "Artista cadastrado no EvCifras. Explore as cifras disponíveis e monte seu repertório."}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Cifras
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {artist.songs.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Gênero
                </p>
                <p className="mt-2 text-xl font-black text-white">
                  {artist.mainGenre || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Views
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {totalViews}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Cifras do artista
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Músicas disponíveis
            </h2>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar música do artista..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
            />
          </div>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
            <Disc3 className="mx-auto h-10 w-10 text-slate-500" />
            <h3 className="mt-4 text-lg font-bold text-white">
              Nenhuma cifra encontrada
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Tente buscar por outro nome ou volte mais tarde.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {filteredSongs.map((song) => {
              const difficulty =
                difficultyLabels[song.difficulty] ||
                song.difficulty ||
                "Não informado";

              return (
                <Link
                  key={song.id}
                  to={`/cifras/${artist.slug}/${song.slug}`}
                  className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-500/25">
                        <Music2 className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-white">
                          {song.title}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          {song.genre && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {song.genre}
                            </span>
                          )}

                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            {difficulty}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            Tom {song.currentKey || song.originalKey || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {song.views || 0}
                      </span>

                      <span className="inline-flex items-center gap-1 text-violet-200">
                        <Star className="h-4 w-4" />
                        Abrir cifra
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default ArtistPage;