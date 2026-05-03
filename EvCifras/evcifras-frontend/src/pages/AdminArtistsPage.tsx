import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Edit3,
  Loader2,
  Music2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";

type Artist = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  bio?: string | null;
  mainGenre?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    songs: number;
  };
};

type ArtistFormState = {
  name: string;
  imageUrl: string;
  bio: string;
  mainGenre: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const emptyForm: ArtistFormState = {
  name: "",
  imageUrl: "",
  bio: "",
  mainGenre: "",
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

export function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [form, setForm] = useState<ArtistFormState>(emptyForm);
  const [editingArtistId, setEditingArtistId] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const filteredArtists = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return artists;
    }

    return artists.filter((artist) => {
      return (
        artist.name.toLowerCase().includes(normalizedSearch) ||
        artist.slug.toLowerCase().includes(normalizedSearch) ||
        artist.mainGenre?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [artists, search]);

  const editingArtist = useMemo(() => {
    if (!editingArtistId) {
      return null;
    }

    return artists.find((artist) => artist.id === editingArtistId) || null;
  }, [artists, editingArtistId]);

  async function loadArtists() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<Artist[]>("/artists");
      setArtists(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar artistas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArtists();
  }, []);

  function updateForm<K extends keyof ArtistFormState>(
    field: K,
    value: ArtistFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleStartEdit(artist: Artist) {
    setEditingArtistId(artist.id);
    setForm({
      name: artist.name || "",
      imageUrl: artist.imageUrl || "",
      bio: artist.bio || "",
      mainGenre: artist.mainGenre || "",
    });
    setFeedback("");
    setError("");
  }

  function handleCancelEdit() {
    setEditingArtistId("");
    setForm(emptyForm);
    setFeedback("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setFeedback("Informe o nome do artista.");
      return;
    }

    const payload = {
      name,
      imageUrl: form.imageUrl.trim() || undefined,
      bio: form.bio.trim() || undefined,
      mainGenre: form.mainGenre.trim() || undefined,
    };

    try {
      setSaving(true);
      setFeedback("");
      setError("");

      if (editingArtistId) {
        const response = await api.patch<Artist>(
          `/artists/${editingArtistId}`,
          payload,
        );

        setArtists((current) =>
          current.map((artist) =>
            artist.id === editingArtistId ? response.data : artist,
          ),
        );

        setFeedback("Artista atualizado com sucesso.");
      } else {
        const response = await api.post<Artist>("/artists", payload);

        setArtists((current) => [response.data, ...current]);
        setFeedback("Artista criado com sucesso.");
      }

      setEditingArtistId("");
      setForm(emptyForm);
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível salvar artista."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(artist: Artist) {
    const totalSongs = artist._count?.songs || 0;

    if (totalSongs > 0) {
      setFeedback(
        "Não é possível excluir artista com músicas vinculadas. Remova ou arquive as músicas primeiro.",
      );
      return;
    }

    const shouldDelete = window.confirm(
      `Tem certeza que deseja excluir "${artist.name}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(artist.id);
      setFeedback("");
      setError("");

      await api.delete(`/artists/${artist.id}`);

      setArtists((current) =>
        current.filter((currentArtist) => currentArtist.id !== artist.id),
      );

      if (editingArtistId === artist.id) {
        handleCancelEdit();
      }

      setFeedback("Artista excluído com sucesso.");
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível excluir artista."));
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
              <Music2 className="h-3.5 w-3.5" />
              Administração
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Artistas
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Cadastre e organize os artistas disponíveis no EvCifras.
            </p>
          </div>

          <button
            type="button"
            onClick={loadArtists}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              {editingArtist ? "Editando artista" : "Novo artista"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {editingArtist ? editingArtist.name : "Cadastrar artista"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              O slug é gerado automaticamente pelo backend.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-300">
                Nome *
              </label>
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Ex: Gusttavo Lima"
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Gênero principal
              </label>
              <input
                value={form.mainGenre}
                onChange={(event) =>
                  updateForm("mainGenre", event.target.value)
                }
                placeholder="Ex: Sertanejo"
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                URL da imagem
              </label>
              <input
                value={form.imageUrl}
                onChange={(event) => updateForm("imageUrl", event.target.value)}
                placeholder="https://..."
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Biografia
              </label>
              <textarea
                value={form.bio}
                onChange={(event) => updateForm("bio", event.target.value)}
                placeholder="Resumo sobre o artista..."
                rows={5}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
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
                ) : editingArtist ? (
                  <Edit3 className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingArtist ? "Salvar edição" : "Cadastrar"}
              </button>

              {editingArtist && (
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-300">
                Lista de artistas
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {filteredArtists.length} encontrados
              </h2>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar artista..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center justify-center rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando artistas...
            </div>
          ) : filteredArtists.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
              <Music2 className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-bold text-white">
                Nenhum artista encontrado
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Cadastre o primeiro artista pelo formulário ao lado.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {filteredArtists.map((artist) => {
                const totalSongs = artist._count?.songs || 0;

                return (
                  <div
                    key={artist.id}
                    className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-violet-500/10">
                          {artist.imageUrl ? (
                            <img
                              src={artist.imageUrl}
                              alt={artist.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-violet-200">
                              <Music2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-white">
                            {artist.name}
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            /artistas/{artist.slug}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            {artist.mainGenre && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                {artist.mainGenre}
                              </span>
                            )}

                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {totalSongs} músicas
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(artist)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(artist)}
                          disabled={deletingId === artist.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === artist.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Excluir
                        </button>
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

export default AdminArtistsPage;