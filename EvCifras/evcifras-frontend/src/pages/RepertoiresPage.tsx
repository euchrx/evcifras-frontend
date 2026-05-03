import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Loader2,
  Music2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";

type RepertoireItem = {
  id: string;
  position: number;
  createdAt: string;
  song?: {
    id: string;
    title: string;
    slug: string;
    artist?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

type Repertoire = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RepertoireItem[];
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function RepertoiresPage() {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const filteredRepertoires = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return repertoires;
    }

    return repertoires.filter((repertoire) => {
      return (
        repertoire.name.toLowerCase().includes(normalizedSearch) ||
        repertoire.description?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [repertoires, search]);

  async function loadRepertoires() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<Repertoire[]>("/repertoires");
      setRepertoires(response.data);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível carregar os repertórios."),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRepertoires();
  }, []);

  async function handleCreateRepertoire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setFeedback("Informe o nome do repertório.");
      return;
    }

    try {
      setCreating(true);
      setFeedback("");
      setError("");

      const response = await api.post<Repertoire>("/repertoires", {
        name: trimmedName,
        description: trimmedDescription || undefined,
      });

      setRepertoires((current) => [response.data, ...current]);
      setName("");
      setDescription("");
      setFeedback("Repertório criado com sucesso.");
    } catch (err) {
      setFeedback(
        getApiErrorMessage(err, "Não foi possível criar o repertório."),
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteRepertoire(id: string) {
    const shouldDelete = window.confirm(
      "Tem certeza que deseja excluir este repertório?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(id);
      setFeedback("");
      setError("");

      await api.delete(`/repertoires/${id}`);

      setRepertoires((current) =>
        current.filter((repertoire) => repertoire.id !== id),
      );

      setFeedback("Repertório excluído com sucesso.");
    } catch (err) {
      setFeedback(
        getApiErrorMessage(err, "Não foi possível excluir o repertório."),
      );
    } finally {
      setDeletingId("");
    }
  }

  const totalSongs = repertoires.reduce((sum, repertoire) => {
    return sum + (repertoire.items?.length || 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
          Carregando repertórios...
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
              <BookOpen className="h-3.5 w-3.5" />
              Repertórios
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Meus repertórios
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Organize cifras para culto, ensaio, barzinho, aulas ou qualquer
              apresentação musical.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:min-w-[340px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Repertórios
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {repertoires.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Cifras
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {totalSongs}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              Novo repertório
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Criar lista
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Crie uma lista para separar suas cifras por ocasião.
            </p>
          </div>

          <form onSubmit={handleCreateRepertoire} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-300">
                Nome
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Culto domingo"
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex: Repertório do louvor da manhã"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Criar repertório
            </button>
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
                Biblioteca
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                Listas criadas
              </h2>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar repertório..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>
          </div>

          {filteredRepertoires.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-bold text-white">
                Nenhum repertório encontrado
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Crie seu primeiro repertório para organizar suas cifras.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {filteredRepertoires.map((repertoire) => {
                const totalItems = repertoire.items?.length || 0;

                return (
                  <div
                    key={repertoire.id}
                    className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <Link
                        to={`/repertorios/${repertoire.id}`}
                        className="flex min-w-0 flex-1 items-start gap-4"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-500/25">
                          <BookOpen className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-white">
                            {repertoire.name}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                            {repertoire.description ||
                              "Sem descrição informada."}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              <Music2 className="h-3.5 w-3.5" />
                              {totalItems} cifras
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(repertoire.createdAt)}
                            </span>
                          </div>
                        </div>
                      </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteRepertoire(repertoire.id)}
                      disabled={deletingId === repertoire.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === repertoire.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Excluir
                    </button>
                  </div>
                  </div>
          );
              })}
      </div>
          )}
    </section>
      </div >
    </div >
  );
}

export default RepertoiresPage;