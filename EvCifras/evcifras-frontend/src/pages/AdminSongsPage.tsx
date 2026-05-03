import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Archive,
  Edit3,
  Eye,
  FileMusic,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

type Artist = {
  id: string;
  name: string;
  slug: string;
  mainGenre?: string | null;
};

type Song = {
  id: string;
  title: string;
  slug: string;
  lyrics: string;
  chords: string;
  originalKey?: string | null;
  currentKey?: string | null;
  capo?: string | null;
  genre?: string | null;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";
  youtubeUrl?: string | null;
  views: number;
  artistId: string;
  artist?: Artist | null;
  createdAt: string;
  updatedAt: string;
};

type SongFormState = {
  title: string;
  artistId: string;
  lyrics: string;
  chords: string;
  originalKey: string;
  currentKey: string;
  capo: string;
  genre: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  youtubeUrl: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const emptyForm: SongFormState = {
  title: "",
  artistId: "",
  lyrics: "",
  chords: "",
  originalKey: "",
  currentKey: "",
  capo: "",
  genre: "",
  difficulty: "BEGINNER",
  youtubeUrl: "",
};

const difficultyLabels: Record<Song["difficulty"], string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

const statusLabels: Record<Song["status"], string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Revisão",
  PUBLISHED: "Publicada",
  ARCHIVED: "Arquivada",
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

export function AdminSongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [form, setForm] = useState<SongFormState>(emptyForm);
  const [editingSongId, setEditingSongId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [artistFilter, setArtistFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [publishingId, setPublishingId] = useState("");
  const [archivingId, setArchivingId] = useState("");

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const editingSong = useMemo(() => {
    if (!editingSongId) {
      return null;
    }

    return songs.find((song) => song.id === editingSongId) || null;
  }, [songs, editingSongId]);

  const filteredSongs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return songs.filter((song) => {
      const artistName = song.artist?.name || "";

      const matchesSearch =
        !normalizedSearch ||
        song.title.toLowerCase().includes(normalizedSearch) ||
        song.slug.toLowerCase().includes(normalizedSearch) ||
        artistName.toLowerCase().includes(normalizedSearch) ||
        song.genre?.toLowerCase().includes(normalizedSearch);

      const matchesStatus = !statusFilter || song.status === statusFilter;
      const matchesArtist = !artistFilter || song.artistId === artistFilter;

      return matchesSearch && matchesStatus && matchesArtist;
    });
  }, [songs, search, statusFilter, artistFilter]);

  async function loadArtists() {
    try {
      setArtistsLoading(true);

      const response = await api.get<Artist[]>("/artists");
      setArtists(response.data);
    } catch {
      setArtists([]);
    } finally {
      setArtistsLoading(false);
    }
  }

  async function loadSongs() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<Song[]>("/songs/admin/all");
      setSongs(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar músicas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArtists();
    loadSongs();
  }, []);

  function updateForm<K extends keyof SongFormState>(
    field: K,
    value: SongFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleStartEdit(song: Song) {
    setEditingSongId(song.id);
    setForm({
      title: song.title || "",
      artistId: song.artistId || song.artist?.id || "",
      lyrics: song.lyrics || "",
      chords: song.chords || "",
      originalKey: song.originalKey || "",
      currentKey: song.currentKey || "",
      capo: song.capo || "",
      genre: song.genre || "",
      difficulty: song.difficulty || "BEGINNER",
      youtubeUrl: song.youtubeUrl || "",
    });
    setFeedback("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleCancelEdit() {
    setEditingSongId("");
    setForm(emptyForm);
    setFeedback("");
    setError("");
  }

  function buildPayload() {
    return {
      title: form.title.trim(),
      artistId: form.artistId,
      lyrics: form.lyrics.trim(),
      chords: form.chords.trim(),
      originalKey: form.originalKey.trim() || undefined,
      currentKey: form.currentKey.trim() || form.originalKey.trim() || undefined,
      capo: form.capo.trim() || undefined,
      genre: form.genre.trim() || undefined,
      difficulty: form.difficulty,
      youtubeUrl: form.youtubeUrl.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setFeedback("Informe o título da música.");
      return;
    }

    if (!form.artistId) {
      setFeedback("Selecione o artista.");
      return;
    }

    if (!form.lyrics.trim()) {
      setFeedback("Informe a letra da música.");
      return;
    }

    if (!form.chords.trim()) {
      setFeedback("Informe a cifra/acordes da música.");
      return;
    }

    try {
      setSaving(true);
      setFeedback("");
      setError("");

      const payload = buildPayload();

      if (editingSongId) {
        const response = await api.patch<Song>(
          `/songs/${editingSongId}`,
          payload,
        );

        setSongs((current) =>
          current.map((song) =>
            song.id === editingSongId ? response.data : song,
          ),
        );

        setFeedback("Cifra atualizada com sucesso.");
      } else {
        const response = await api.post<Song>("/songs", payload);

        setSongs((current) => [response.data, ...current]);
        setFeedback("Cifra cadastrada com sucesso.");
      }

      setEditingSongId("");
      setForm(emptyForm);
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível salvar cifra."));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(songId: string) {
    try {
      setPublishingId(songId);
      setFeedback("");

      const response = await api.patch<Song>(`/songs/${songId}/publish`);

      setSongs((current) =>
        current.map((song) => (song.id === songId ? response.data : song)),
      );

      setFeedback("Cifra publicada com sucesso.");
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível publicar cifra."));
    } finally {
      setPublishingId("");
    }
  }

  async function handleArchive(songId: string) {
    try {
      setArchivingId(songId);
      setFeedback("");

      const response = await api.patch<Song>(`/songs/${songId}/archive`);

      setSongs((current) =>
        current.map((song) => (song.id === songId ? response.data : song)),
      );

      setFeedback("Cifra arquivada com sucesso.");
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível arquivar cifra."));
    } finally {
      setArchivingId("");
    }
  }

  async function handleDelete(song: Song) {
    const shouldDelete = window.confirm(
      `Tem certeza que deseja excluir "${song.title}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(song.id);
      setFeedback("");
      setError("");

      await api.delete(`/songs/${song.id}`);

      setSongs((current) => current.filter((item) => item.id !== song.id));

      if (editingSongId === song.id) {
        handleCancelEdit();
      }

      setFeedback("Cifra excluída com sucesso.");
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível excluir cifra."));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.04] to-blue-500/10 p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <FileMusic className="h-3.5 w-3.5" />
              Administração
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Cifras
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Cadastre, edite, publique e arquive as cifras disponíveis no
              EvCifras.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadArtists();
              loadSongs();
            }}
            disabled={loading || artistsLoading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading || artistsLoading ? "animate-spin" : ""
              }`}
            />
            Atualizar
          </button>
        </div>
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[460px_1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              {editingSong ? "Editando cifra" : "Nova cifra"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {editingSong ? editingSong.title : "Cadastrar música"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              O slug é gerado automaticamente por título e artista.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-300">
                Título *
              </label>
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Ex: Apelido Carinhoso"
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Artista *
              </label>
              <select
                value={form.artistId}
                onChange={(event) => updateForm("artistId", event.target.value)}
                disabled={artistsLoading}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
              >
                <option value="">Selecione</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Tom original
                </label>
                <input
                  value={form.originalKey}
                  onChange={(event) =>
                    updateForm("originalKey", event.target.value)
                  }
                  placeholder="G"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Tom atual
                </label>
                <input
                  value={form.currentKey}
                  onChange={(event) =>
                    updateForm("currentKey", event.target.value)
                  }
                  placeholder="G"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Capotraste
                </label>
                <input
                  value={form.capo}
                  onChange={(event) => updateForm("capo", event.target.value)}
                  placeholder="Não"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Gênero
                </label>
                <input
                  value={form.genre}
                  onChange={(event) => updateForm("genre", event.target.value)}
                  placeholder="Sertanejo"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Dificuldade
                </label>
                <select
                  value={form.difficulty}
                  onChange={(event) =>
                    updateForm(
                      "difficulty",
                      event.target.value as SongFormState["difficulty"],
                    )
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
                >
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                YouTube URL
              </label>
              <input
                value={form.youtubeUrl}
                onChange={(event) =>
                  updateForm("youtubeUrl", event.target.value)
                }
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Letra *
              </label>
              <textarea
                value={form.lyrics}
                onChange={(event) => updateForm("lyrics", event.target.value)}
                placeholder="Cole aqui a letra sem acordes..."
                rows={7}
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Cifra / acordes *
              </label>
              <textarea
                value={form.chords}
                onChange={(event) => updateForm("chords", event.target.value)}
                placeholder={`[Intro] G D Em C\n\nG\nO que que eu faço agora...`}
                rows={11}
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingSong ? (
                  <Edit3 className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingSong ? "Salvar edição" : "Cadastrar"}
              </button>

              {editingSong && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

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
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-violet-300">
                Lista de cifras
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {filteredSongs.length} encontradas
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar cifra..."
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
              >
                <option value="">Todos status</option>
                <option value="DRAFT">Rascunho</option>
                <option value="PENDING_REVIEW">Revisão</option>
                <option value="PUBLISHED">Publicada</option>
                <option value="ARCHIVED">Arquivada</option>
              </select>

              <select
                value={artistFilter}
                onChange={(event) => setArtistFilter(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
              >
                <option value="">Todos artistas</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center justify-center rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando cifras...
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
              <FileMusic className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-bold text-white">
                Nenhuma cifra encontrada
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Cadastre a primeira cifra pelo formulário ao lado.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {filteredSongs.map((song) => {
                const isPublished = song.status === "PUBLISHED";

                return (
                  <div
                    key={song.id}
                    className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-white">
                            {song.title}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-violet-200">
                            {song.artist?.name || "Artista não informado"}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {statusLabels[song.status]}
                            </span>

                            {song.genre && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                {song.genre}
                              </span>
                            )}

                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {difficultyLabels[song.difficulty]}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              Tom {song.currentKey || song.originalKey || "-"}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              <Eye className="h-3.5 w-3.5" />
                              {song.views || 0}
                            </span>
                          </div>

                          {!isPublished && (
                            <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs font-semibold leading-5 text-amber-100">
                              Esta cifra ainda não está visível no site público.
                              Clique em Publicar para liberar.
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {isPublished && song.artist?.slug && song.slug && (
                            <Link
                              to={getSongUrl(song)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEdit(song)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                          >
                            <Edit3 className="h-4 w-4" />
                            Editar
                          </button>

                          {isPublished ? (
                            <button
                              type="button"
                              onClick={() => handleArchive(song.id)}
                              disabled={archivingId === song.id}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {archivingId === song.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                              Arquivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePublish(song.id)}
                              disabled={publishingId === song.id}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {publishingId === song.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Publicar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(song)}
                            disabled={deletingId === song.id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === song.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="line-clamp-3 font-mono text-xs leading-6 text-slate-400">
                          {song.chords}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminSongsPage;