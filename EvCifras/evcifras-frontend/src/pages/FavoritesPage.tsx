import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Heart,
  Loader2,
  Music2,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";

type FavoriteSong = {
  id: string;
  title: string;
  slug: string;
  originalKey?: string | null;
  currentKey?: string | null;
  genre?: string | null;
  difficulty: string;
  views: number;
  artist?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type FavoriteItem = {
  id: string;
  createdAt: string;
  song: FavoriteSong;
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

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const filteredFavorites = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return favorites;
    }

    return favorites.filter((favorite) => {
      const song = favorite.song;
      const artistName = song.artist?.name || "";

      return (
        song.title.toLowerCase().includes(normalizedSearch) ||
        artistName.toLowerCase().includes(normalizedSearch) ||
        song.genre?.toLowerCase().includes(normalizedSearch) ||
        difficultyLabels[song.difficulty]
          ?.toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [favorites, search]);

  async function loadFavorites() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<FavoriteItem[]>("/favorites");
      setFavorites(response.data);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível carregar suas favoritas."),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  async function handleRemoveFavorite(songId: string) {
    try {
      setRemovingId(songId);
      setFeedback("");

      await api.delete(`/favorites/${songId}`);

      setFavorites((current) =>
        current.filter((favorite) => favorite.song.id !== songId),
      );

      setFeedback("Cifra removida dos favoritos.");
    } catch (err) {
      setFeedback(
        getApiErrorMessage(err, "Não foi possível remover esta cifra."),
      );
    } finally {
      setRemovingId("");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
          Carregando favoritas...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
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
              <Heart className="h-3.5 w-3.5 fill-violet-200" />
              Minhas cifras
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Favoritas
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Acesse rapidamente as cifras que você salvou para tocar, estudar
              ou montar seus repertórios.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:min-w-[340px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Total
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {favorites.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Encontradas
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {filteredFavorites.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Biblioteca pessoal
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Cifras salvas
            </h2>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nas favoritas..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
            />
          </div>
        </div>

        {feedback && (
          <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-100">
            {feedback}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {filteredFavorites.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-slate-500" />
            <h3 className="mt-4 text-lg font-bold text-white">
              Nenhuma cifra favorita
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Abra uma cifra e clique em “Favoritar cifra” para salvar aqui.
            </p>

            <Link
              to="/"
              className="mt-5 inline-flex rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400"
            >
              Explorar cifras
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {filteredFavorites.map((favorite) => {
              const song = favorite.song;
              const artist = song.artist;
              const difficulty =
                difficultyLabels[song.difficulty] ||
                song.difficulty ||
                "Não informado";

              const songUrl =
                artist?.slug && song.slug
                  ? `/cifras/${artist.slug}/${song.slug}`
                  : "/";

              return (
                <div
                  key={favorite.id}
                  className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <Link
                      to={songUrl}
                      className="flex min-w-0 flex-1 items-start gap-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-500/25">
                        <Music2 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-white">
                          {song.title}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-violet-200">
                          {artist?.name || "Artista"}
                        </p>

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

                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            <Eye className="h-3.5 w-3.5" />
                            {song.views || 0}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(song.id)}
                      disabled={removingId === song.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingId === song.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default FavoritesPage;