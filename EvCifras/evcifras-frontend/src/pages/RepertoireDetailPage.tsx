import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Guitar,
  Loader2,
  Music2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";

type Song = {
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

type RepertoireItem = {
  id: string;
  position: number;
  createdAt: string;
  song: Song;
};

type Repertoire = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  items: RepertoireItem[];
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

function getSongUrl(song: Song) {
  if (!song.artist?.slug || !song.slug) {
    return "/";
  }

  return `/cifras/${song.artist.slug}/${song.slug}`;
}

export function RepertoireDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [repertoire, setRepertoire] = useState<Repertoire | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [songsLoading, setSongsLoading] = useState(true);
  const [addingId, setAddingId] = useState("");
  const [removingId, setRemovingId] = useState("");

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const addedSongIds = useMemo(() => {
    return new Set(repertoire?.items?.map((item) => item.song.id) || []);
  }, [repertoire?.items]);

  const filteredSongs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return songs;
    }

    return songs.filter((song) => {
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
  }, [songs, search]);

  async function loadRepertoire() {
    if (!id) {
      setError("Repertório inválido.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get<Repertoire>(`/repertoires/${id}`);
      setRepertoire(response.data);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível carregar o repertório."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSongs() {
    try {
      setSongsLoading(true);

      const response = await api.get<Song[]>("/songs");
      setSongs(response.data);
    } catch {
      setSongs([]);
    } finally {
      setSongsLoading(false);
    }
  }

  useEffect(() => {
    loadRepertoire();
    loadSongs();
  }, [id]);

  async function handleAddSong(songId: string) {
    if (!id) {
      return;
    }

    try {
      setAddingId(songId);
      setFeedback("");

      await api.post(`/repertoires/${id}/songs`, {
        songId,
      });
      
      await loadRepertoire();

      setFeedback("Cifra adicionada ao repertório.");
    } catch (err) {
      setFeedback(
        getApiErrorMessage(err, "Não foi possível adicionar esta cifra."),
      );
    } finally {
      setAddingId("");
    }
  }

  async function handleRemoveSong(songId: string) {
    if (!id) {
      return;
    }

    try {
      setRemovingId(songId);
      setFeedback("");

      await api.delete(`/repertoires/${id}/songs/${songId}`);

      setRepertoire((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: current.items.filter((item) => item.song.id !== songId),
        };
      });

      setFeedback("Cifra removida do repertório.");
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
          Carregando repertório...
        </div>
      </div>
    );
  }

  if (error || !repertoire) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <Link
          to="/repertorios"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para repertórios
        </Link>

        <div className="mt-8 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8">
          <p className="text-sm font-semibold text-red-300">Erro</p>
          <h1 className="mt-3 text-2xl font-bold text-white">
            Repertório não encontrado
          </h1>
          <p className="mt-3 text-slate-300">
            {error || "Não foi possível encontrar este repertório."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <Link
        to="/repertorios"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para repertórios
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.04] to-blue-500/10 p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <BookOpen className="h-3.5 w-3.5" />
              Repertório
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              {repertoire.name}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              {repertoire.description ||
                "Organize as cifras deste repertório para tocar ao vivo, ensaiar ou estudar."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:min-w-[340px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Cifras
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {repertoire.items.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Status
              </p>
              <p className="mt-2 text-xl font-black text-emerald-300">
                Ativo
              </p>
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-100">
          {feedback}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Cifras adicionadas
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Lista do repertório
            </h2>
          </div>

          {repertoire.items.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
              <Guitar className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-bold text-white">
                Nenhuma cifra adicionada
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Use a busca ao lado para adicionar músicas neste repertório.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {repertoire.items.map((item, index) => {
                const song = item.song;
                const difficulty =
                  difficultyLabels[song.difficulty] ||
                  song.difficulty ||
                  "Não informado";

                return (
                  <div
                    key={item.id}
                    className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <Link
                        to={getSongUrl(song)}
                        className="flex min-w-0 flex-1 items-start gap-4"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-500/25">
                          <span className="text-sm font-black">
                            {index + 1}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-white">
                            {song.title}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-violet-200">
                            {song.artist?.name || "Artista"}
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
                          </div>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleRemoveSong(song.id)}
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

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Adicionar cifras
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Buscar músicas
            </h2>
          </div>

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por música, artista ou gênero..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
            />
          </div>

          {songsLoading ? (
            <div className="mt-6 flex items-center justify-center rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando músicas...
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-bold text-white">
                Nenhuma música encontrada
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Tente buscar por outro termo.
              </p>
            </div>
          ) : (
            <div className="mt-6 max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {filteredSongs.map((song) => {
                const alreadyAdded = addedSongIds.has(song.id);

                return (
                  <div
                    key={song.id}
                    className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                        <Music2 className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black text-white">
                          {song.title}
                        </h3>

                        <p className="mt-1 truncate text-xs font-semibold text-violet-200">
                          {song.artist?.name || "Artista"}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            Tom {song.currentKey || song.originalKey || "-"}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            <Eye className="h-3.5 w-3.5" />
                            {song.views || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        to={getSongUrl(song)}
                        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                      >
                        Abrir
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleAddSong(song.id)}
                        disabled={alreadyAdded || addingId === song.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingId === song.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {alreadyAdded ? "Adicionada" : "Adicionar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default RepertoireDetailPage;