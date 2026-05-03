import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Download,
  HardDrive,
  Loader2,
  Music2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  clearOfflineAudioTracks,
  createOfflineAudioObjectUrl,
  formatOfflineBytes,
  getOfflineAudioTracks,
  removeOfflineAudioTrack,
  type OfflineAudioTrack,
} from "../services/offlineAudio";

function formatTime(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getSongUrl(track: OfflineAudioTrack) {
  if (!track.artistSlug || !track.songSlug) {
    return "/";
  }

  return `/cifras/${track.artistSlug}/${track.songSlug}`;
}

export function OfflinePage() {
  const [tracks, setTracks] = useState<OfflineAudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");
  const [clearing, setClearing] = useState(false);
  const [search, setSearch] = useState("");
  const [currentObjectUrl, setCurrentObjectUrl] = useState("");
  const [currentTrackId, setCurrentTrackId] = useState("");
  const [autoRemoveAfterPlay, setAutoRemoveAfterPlay] = useState(false);
  const [feedback, setFeedback] = useState("");

  const filteredTracks = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return tracks;
    }

    return tracks.filter((track) => {
      return (
        track.title.toLowerCase().includes(normalized) ||
        track.songTitle?.toLowerCase().includes(normalized) ||
        track.artistName?.toLowerCase().includes(normalized) ||
        track.type.toLowerCase().includes(normalized)
      );
    });
  }, [tracks, search]);

  const currentTrack = useMemo(() => {
    if (!currentTrackId) {
      return null;
    }

    return tracks.find((track) => track.id === currentTrackId) || null;
  }, [tracks, currentTrackId]);

  const totalBytes = useMemo(() => {
    return tracks.reduce((sum, track) => sum + (track.sizeBytes || 0), 0);
  }, [tracks]);

  async function loadTracks() {
    try {
      setLoading(true);

      const savedTracks = await getOfflineAudioTracks();
      setTracks(savedTracks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [currentObjectUrl]);

  function handlePlay(track: OfflineAudioTrack) {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
    }

    const objectUrl = createOfflineAudioObjectUrl(track);
    setCurrentObjectUrl(objectUrl);
    setCurrentTrackId(track.id);
    setFeedback("");
  }

  async function handleRemove(trackId: string) {
    try {
      setRemovingId(trackId);
      setFeedback("");

      await removeOfflineAudioTrack(trackId);

      if (currentTrackId === trackId && currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        setCurrentObjectUrl("");
        setCurrentTrackId("");
      }

      await loadTracks();
      setFeedback("Áudio removido do offline.");
    } finally {
      setRemovingId("");
    }
  }

  async function handleClearAll() {
    const shouldClear = window.confirm(
      "Tem certeza que deseja remover todos os áudios offline deste dispositivo?",
    );

    if (!shouldClear) {
      return;
    }

    try {
      setClearing(true);
      setFeedback("");

      await clearOfflineAudioTracks();

      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }

      setCurrentObjectUrl("");
      setCurrentTrackId("");
      await loadTracks();
      setFeedback("Todos os áudios offline foram removidos.");
    } finally {
      setClearing(false);
    }
  }

  async function handleAudioEnded() {
    if (!autoRemoveAfterPlay || !currentTrackId) {
      return;
    }

    await handleRemove(currentTrackId);
  }

  return (
    <div className="mx-auto max-w-5xl pb-20">
      <Link
        to="/ouvir"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para ouvir
      </Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-500/15 via-white/[0.04] to-violet-500/10 p-6 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Download className="h-3.5 w-3.5" />
              Modo offline
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Áudios salvos
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Toque músicas e guias salvos neste dispositivo, mesmo sem internet.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:min-w-[300px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Salvos
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {tracks.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Espaço
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {formatOfflineBytes(totalBytes)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {currentObjectUrl && currentTrack && (
        <section className="sticky top-24 z-30 mt-6 rounded-[2rem] border border-emerald-400/20 bg-[#07120d]/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-100">
                Tocando offline
              </p>
              <p className="mt-1 truncate text-xs text-slate-400">
                {currentTrack.artistName || "Artista"} •{" "}
                {currentTrack.songTitle || currentTrack.title}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleRemove(currentTrack.id)}
              disabled={removingId === currentTrack.id}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 text-xs font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removingId === currentTrack.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Remover
            </button>
          </div>

          <audio
            key={currentObjectUrl}
            src={currentObjectUrl}
            controls
            preload="metadata"
            playsInline
            onEnded={handleAudioEnded}
            className="w-full"
          />

          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={autoRemoveAfterPlay}
              onChange={(event) => setAutoRemoveAfterPlay(event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Remover automaticamente após ouvir
          </label>
        </section>
      )}

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar offline..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50 focus:bg-black/30"
            />
          </div>

          <button
            type="button"
            onClick={loadTracks}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearing || tracks.length === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Limpar tudo
          </button>
        </div>

        {feedback && (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-100">
            {feedback}
          </div>
        )}
      </section>

      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-300" />
          Carregando offline...
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center">
          <Download className="mx-auto h-12 w-12 text-slate-500" />
          <h2 className="mt-4 text-xl font-black text-white">
            Nenhum áudio salvo
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Abra uma música em /ouvir e clique em “Salvar offline”.
          </p>
        </div>
      ) : (
        <section className="mt-6 grid gap-4">
          {filteredTracks.map((track) => {
            const isCurrent = currentTrackId === track.id;

            return (
              <article
                key={track.id}
                className={[
                  "rounded-[1.75rem] border p-4 shadow-2xl shadow-black/20 transition md:p-5",
                  isCurrent
                    ? "border-emerald-400/30 bg-emerald-500/10"
                    : "border-white/10 bg-white/[0.04] hover:border-emerald-400/40 hover:bg-emerald-500/10",
                ].join(" ")}
              >
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-emerald-500/10 md:h-20 md:w-20">
                    {track.artistImageUrl ? (
                      <img
                        src={track.artistImageUrl}
                        alt={track.artistName || "Artista"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-emerald-200">
                        <Music2 className="h-7 w-7" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black text-white md:text-xl">
                          {track.songTitle || track.title}
                        </h2>

                        <p className="mt-1 truncate text-sm font-semibold text-emerald-200">
                          {track.artistName || "Artista"} • {track.title}
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                        <HardDrive className="h-3.5 w-3.5" />
                        Salvo
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        {track.type}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        {formatTime(track.durationSec)}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        {formatOfflineBytes(track.sizeBytes)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => handlePlay(track)}
                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-400"
                      >
                        Tocar offline
                      </button>

                      <Link
                        to={getSongUrl(track)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
                      >
                        <BookOpen className="h-4 w-4" />
                        Cifra
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleRemove(track.id)}
                        disabled={removingId === track.id}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingId === track.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Remover
                      </button>
                    </div>
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

export default OfflinePage;
