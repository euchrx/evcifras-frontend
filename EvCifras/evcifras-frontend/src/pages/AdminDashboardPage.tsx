import { useEffect, useMemo, useState } from "react";
import {
  FileMusic,
  Loader2,
  Music2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

type Artist = {
  id: string;
  name: string;
  slug: string;
  mainGenre?: string | null;
  _count?: {
    songs: number;
  };
};

type Song = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";
  genre?: string | null;
  views: number;
  artist?: {
    id: string;
    name: string;
    slug: string;
  } | null;
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

export function AdminDashboardPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const published = songs.filter((song) => song.status === "PUBLISHED").length;
    const drafts = songs.filter((song) => song.status === "DRAFT").length;
    const review = songs.filter(
      (song) => song.status === "PENDING_REVIEW",
    ).length;
    const archived = songs.filter((song) => song.status === "ARCHIVED").length;
    const totalViews = songs.reduce((sum, song) => sum + (song.views || 0), 0);

    return {
      totalArtists: artists.length,
      totalSongs: songs.length,
      published,
      drafts,
      review,
      archived,
      totalViews,
    };
  }, [artists, songs]);

  const recentSongs = useMemo(() => songs.slice(0, 5), [songs]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [artistsResponse, songsResponse] = await Promise.all([
        api.get<Artist[]>("/artists"),
        api.get<Song[]>("/songs/admin/all"),
      ]);

      setArtists(artistsResponse.data);
      setSongs(songsResponse.data);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível carregar o painel admin."),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.04] to-blue-500/10 p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Painel administrativo
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Admin EvCifras
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Gerencie artistas, cifras, publicações e acompanhe os principais
              números da plataforma.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-300" />
          Carregando painel...
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-500">
                Artistas
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {stats.totalArtists}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
                <FileMusic className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-500">
                Total de cifras
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {stats.totalSongs}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
                <Music2 className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-500">
                Publicadas
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {stats.published}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200">
                <Plus className="h-5 w-5" />
              </div>
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-500">
                Rascunhos
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {stats.drafts}
              </p>
            </div>
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
              <p className="text-sm font-semibold text-violet-300">
                Atalhos rápidos
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                Gerenciar conteúdo
              </h2>

              <div className="mt-6 grid gap-3">
                <Link
                  to="/admin/artistas"
                  className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                      <Users className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">Artistas</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Cadastrar e editar artistas
                      </p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/admin/cifras"
                  className="group rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
                      <FileMusic className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">Cifras</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Criar, publicar e arquivar cifras
                      </p>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-bold text-white">
                  Resumo editorial
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Em revisão</span>
                    <strong className="text-slate-200">{stats.review}</strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Arquivadas</span>
                    <strong className="text-slate-200">{stats.archived}</strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Visualizações</span>
                    <strong className="text-slate-200">{stats.totalViews}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-violet-300">
                    Últimas cifras
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Conteúdo recente
                  </h2>
                </div>

                <Link
                  to="/admin/cifras"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Ver todas
                </Link>
              </div>

              {recentSongs.length === 0 ? (
                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
                  <FileMusic className="mx-auto h-10 w-10 text-slate-500" />
                  <h3 className="mt-4 text-lg font-bold text-white">
                    Nenhuma cifra cadastrada
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Crie a primeira cifra no painel de cifras.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-3">
                  {recentSongs.map((song) => {
                    const isPublished = song.status === "PUBLISHED";

                    return (
                      <div
                        key={song.id}
                        className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-black text-white">
                              {song.title}
                            </h3>
                            <p className="mt-1 text-sm font-semibold text-violet-200">
                              {song.artist?.name || "Artista não informado"}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span
                                className={[
                                  "rounded-full border px-2.5 py-1",
                                  isPublished
                                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                    : "border-amber-400/20 bg-amber-500/10 text-amber-200",
                                ].join(" ")}
                              >
                                {isPublished ? "Publicada" : "Não publicada"}
                              </span>

                              {song.genre && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                  {song.genre}
                                </span>
                              )}

                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                                {song.views || 0} views
                              </span>
                            </div>
                          </div>

                          <Link
                            to="/admin/cifras"
                            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
                          >
                            Editar
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;