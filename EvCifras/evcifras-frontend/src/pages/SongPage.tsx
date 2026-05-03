import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Gauge,
  Guitar,
  Heart,
  Maximize2,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import SongAudioTracksSection from "../components/audio/SongAudioTracksSection";

type Artist = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  bio?: string | null;
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
  status?: string;
  youtubeUrl?: string | null;
  views: number;
  artist?: Artist | null;
};

type FavoriteCheckResponse = {
  favorited: boolean;
};

type Repertoire = {
  id: string;
  name: string;
  description?: string | null;
  items?: Array<{
    id: string;
    song?: {
      id: string;
    } | null;
  }>;
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

const chromaticSharpKeys = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const chromaticFlatKeys = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const flatToSharp: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

const chordRegex =
  /\b([A-G](?:#|b)?)(m|maj|min|dim|aug|sus|add|º|°|\+|-)?([0-9]{0,2})?([^\s\]]*)/g;

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

function normalizeRoot(root: string) {
  return flatToSharp[root] || root;
}

function transposeRoot(root: string, semitones: number) {
  const normalized = normalizeRoot(root);
  const index = chromaticSharpKeys.indexOf(normalized);

  if (index === -1) {
    return root;
  }

  const nextIndex = (index + semitones + 1200) % 12;
  const preferFlats = root.includes("b");

  return preferFlats
    ? chromaticFlatKeys[nextIndex]
    : chromaticSharpKeys[nextIndex];
}

function transposeChordToken(token: string, semitones: number) {
  return token.replace(/([A-G](?:#|b)?)/g, (match) =>
    transposeRoot(match, semitones),
  );
}

function transposeText(value: string, semitones: number) {
  if (semitones === 0) {
    return value;
  }

  return value.replace(chordRegex, (match) =>
    transposeChordToken(match, semitones),
  );
}

function transposeKey(value: string | null | undefined, semitones: number) {
  if (!value) {
    return "-";
  }

  return transposeRoot(value, semitones);
}

function formatChords(chords: string, semitones: number) {
  const transposed = transposeText(chords, semitones);

  return transposed.split("\n").map((line, index) => {
    const trimmed = line.trim();

    const isChordLine =
      /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add)?[0-9/()#b\sA-Gmmajindugsusaddº°+-]*$/i.test(
        trimmed,
      ) ||
      trimmed.startsWith("[") ||
      trimmed.includes("Intro") ||
      trimmed.includes("Refrão") ||
      trimmed.includes("Verso") ||
      trimmed.includes("Ponte");

    return {
      id: `${index}-${line}`,
      text: line,
      isChordLine,
      isEmpty: trimmed.length === 0,
    };
  });
}

export function SongPage() {
  const { artistSlug, songSlug } = useParams<{
    artistSlug: string;
    songSlug: string;
  }>();

  const { user, isAuthenticated } = useAuth();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const autoScrollIntervalRef = useRef<number | null>(null);

  const [song, setSong] = useState<Song | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);

  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [repertoireLoading, setRepertoireLoading] = useState(false);
  const [addingRepertoireId, setAddingRepertoireId] = useState("");

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [semitones, setSemitones] = useState(0);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(1.2);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showRepertoireBox, setShowRepertoireBox] = useState(false);

  const formattedLines = useMemo(() => {
    if (!song?.chords) {
      return [];
    }

    return formatChords(song.chords, semitones);
  }, [song?.chords, semitones]);

  const addedRepertoireIds = useMemo(() => {
    if (!song?.id) {
      return new Set<string>();
    }

    return new Set(
      repertoires
        .filter((repertoire) =>
          repertoire.items?.some((item) => item.song?.id === song.id),
        )
        .map((repertoire) => repertoire.id),
    );
  }, [repertoires, song?.id]);

  useEffect(() => {
    async function loadSong() {
      if (!artistSlug || !songSlug) {
        setError("Cifra inválida.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get<Song>(`/songs/${artistSlug}/${songSlug}`);
        setSong(response.data);

        await api.post(`/songs/${response.data.id}/view`).catch(() => null);
      } catch (err) {
        setError(getApiErrorMessage(err, "Não foi possível carregar a cifra."));
      } finally {
        setLoading(false);
      }
    }

    loadSong();
  }, [artistSlug, songSlug]);

  useEffect(() => {
    async function checkFavorite() {
      if (!song?.id || !isAuthenticated) {
        setFavorited(false);
        return;
      }

      try {
        const response = await api.get<FavoriteCheckResponse>(
          `/favorites/check/${song.id}`,
        );
        setFavorited(response.data.favorited);
      } catch {
        setFavorited(false);
      }
    }

    checkFavorite();
  }, [song?.id, isAuthenticated]);

  useEffect(() => {
    async function loadRepertoires() {
      if (!isAuthenticated || !song?.id) {
        setRepertoires([]);
        return;
      }

      try {
        setRepertoireLoading(true);
        const response = await api.get<Repertoire[]>("/repertoires");
        setRepertoires(response.data);
      } catch {
        setRepertoires([]);
      } finally {
        setRepertoireLoading(false);
      }
    }

    loadRepertoires();
  }, [isAuthenticated, song?.id]);

  useEffect(() => {
    if (!autoScrollEnabled) {
      if (autoScrollIntervalRef.current) {
        window.clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }

      return;
    }

    autoScrollIntervalRef.current = window.setInterval(() => {
      window.scrollBy({ top: autoScrollSpeed, behavior: "smooth" });
    }, 80);

    return () => {
      if (autoScrollIntervalRef.current) {
        window.clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
  }, [autoScrollEnabled, autoScrollSpeed]);

  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) {
        window.clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  async function handleToggleFavorite() {
    if (!song) {
      return;
    }

    if (!isAuthenticated) {
      setFeedback("Entre na sua conta para favoritar cifras.");
      return;
    }

    try {
      setFavoriteLoading(true);
      setFeedback("");

      if (favorited) {
        await api.delete(`/favorites/${song.id}`);
        setFavorited(false);
        setFeedback("Cifra removida dos favoritos.");
      } else {
        await api.post(`/favorites/${song.id}`);
        setFavorited(true);
        setFeedback("Cifra adicionada aos favoritos.");
      }
    } catch (err) {
      setFeedback(
        getApiErrorMessage(err, "Não foi possível atualizar o favorito."),
      );
    } finally {
      setFavoriteLoading(false);
    }
  }

  async function handleAddToRepertoire(repertoireId: string) {
    if (!song) {
      return;
    }

    try {
      setAddingRepertoireId(repertoireId);
      setFeedback("");

      await api.post(`/repertoires/${repertoireId}/songs`, {
        songId: song.id,
      });

      setRepertoires((current) =>
        current.map((repertoire) =>
          repertoire.id === repertoireId
            ? {
                ...repertoire,
                items: [
                  ...(repertoire.items || []),
                  {
                    id: `${repertoireId}-${song.id}`,
                    song: { id: song.id },
                  },
                ],
              }
            : repertoire,
        ),
      );

      setFeedback("Cifra adicionada ao repertório.");
    } catch (err) {
      setFeedback(
        getApiErrorMessage(err, "Não foi possível adicionar ao repertório."),
      );
    } finally {
      setAddingRepertoireId("");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setFeedback("Link copiado com sucesso.");
    } catch {
      setFeedback("Não foi possível copiar o link.");
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleTransposeDown() {
    setSemitones((current) => current - 1);
  }

  function handleTransposeUp() {
    setSemitones((current) => current + 1);
  }

  function handleResetTone() {
    setSemitones(0);
  }

  function scrollToCifra() {
    contentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          <RefreshCw className="h-5 w-5 animate-spin text-violet-300" />
          Carregando cifra...
        </div>
      </div>
    );
  }

  if (error || !song) {
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
            Cifra não encontrada
          </h1>
          <p className="mt-3 text-slate-300">
            {error || "Não foi possível encontrar esta cifra."}
          </p>
        </div>
      </div>
    );
  }

  const artistName = song.artist?.name || "Artista";
  const difficulty =
    difficultyLabels[song.difficulty] || song.difficulty || "Não informado";
  const currentKey = transposeKey(song.currentKey || song.originalKey, semitones);
  const originalKey = song.originalKey || "-";

  return (
    <div
      className={
        presentationMode
          ? "mx-auto max-w-5xl pb-20"
          : "mx-auto max-w-7xl pb-20"
      }
    >
      <div className="print:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para início
        </Link>
      </div>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.04] to-blue-500/10 shadow-2xl shadow-black/30 print:border-none print:bg-white print:shadow-none">
        <div
          className={
            presentationMode
              ? "p-6 md:p-8"
              : "grid gap-8 p-6 md:grid-cols-[1fr_340px] md:p-8"
          }
        >
          <div>
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              {song.genre && (
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                  {song.genre}
                </span>
              )}

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                {difficulty}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Eye className="h-3.5 w-3.5" />
                {song.views || 0} visualizações
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl print:text-3xl print:text-black">
              {song.title}
            </h1>

            <Link
              to={`/artistas/${song.artist?.slug || ""}`}
              className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-violet-200 transition hover:text-violet-100 print:text-black"
            >
              <Music2 className="h-5 w-5 print:hidden" />
              {artistName}
            </Link>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 print:grid-cols-3">
              <InfoCard label="Tom" value={currentKey} />
              <InfoCard label="Original" value={originalKey} />
              <InfoCard label="Capotraste" value={song.capo || "Não"} />
            </div>
          </div>

          {!presentationMode && (
            <aside className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 print:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
                  <Guitar className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">EvCifras</p>
                  <p className="text-xs text-slate-400">
                    Cifra pronta para tocar
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleTransposeDown}
                  className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Minus className="h-4 w-4" /> ½
                </button>

                <button
                  type="button"
                  onClick={handleResetTone}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Tom
                </button>

                <button
                  type="button"
                  onClick={handleTransposeUp}
                  className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" /> ½
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                    <Gauge className="h-4 w-4 text-violet-300" />
                    Rolagem
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setAutoScrollEnabled((current) => !current)
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    {autoScrollEnabled ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {autoScrollEnabled ? "Pausar" : "Iniciar"}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[0.7, 1.2, 2].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setAutoScrollSpeed(speed)}
                      className={[
                        "rounded-xl border px-2 py-2 text-xs font-bold transition",
                        autoScrollSpeed === speed
                          ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                      ].join(" ")}
                    >
                      {speed === 0.7
                        ? "Lenta"
                        : speed === 1.2
                          ? "Média"
                          : "Rápida"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Heart
                    className={`h-4 w-4 ${favorited ? "fill-white" : ""}`}
                  />
                  {favorited ? "Remover favorito" : "Favoritar cifra"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRepertoireBox((current) => !current)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <BookOpen className="h-4 w-4" />
                  Adicionar ao repertório
                  {showRepertoireBox ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showRepertoireBox && (
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    {!isAuthenticated ? (
                      <p className="text-sm text-slate-400">
                        Entre na sua conta para adicionar esta cifra a um
                        repertório.
                      </p>
                    ) : repertoireLoading ? (
                      <p className="text-sm text-slate-400">
                        Carregando repertórios...
                      </p>
                    ) : repertoires.length === 0 ? (
                      <div className="text-sm text-slate-400">
                        <p>Você ainda não tem repertórios.</p>
                        <Link
                          to="/repertorios"
                          className="mt-2 inline-flex font-bold text-violet-200 hover:text-violet-100"
                        >
                          Criar repertório
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {repertoires.map((repertoire) => {
                          const alreadyAdded = addedRepertoireIds.has(
                            repertoire.id,
                          );

                          return (
                            <button
                              key={repertoire.id}
                              type="button"
                              onClick={() =>
                                handleAddToRepertoire(repertoire.id)
                              }
                              disabled={
                                alreadyAdded ||
                                addingRepertoireId === repertoire.id
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="truncate">
                                {repertoire.name}
                              </span>
                              <span className="text-xs text-slate-400">
                                {alreadyAdded ? "Adicionada" : "Adicionar"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Copy className="h-4 w-4" />
                  Copiar link
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir cifra
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPresentationMode(true);
                    setTimeout(scrollToCifra, 100);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Maximize2 className="h-4 w-4" />
                  Modo apresentação
                </button>
              </div>

              {feedback && (
                <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-100">
                  {feedback}
                </div>
              )}

              {!user && (
                <p className="mt-5 text-xs leading-relaxed text-slate-400">
                  Entre na sua conta para salvar esta cifra em favoritos e
                  repertórios.
                </p>
              )}
            </aside>
          )}
        </div>
      </section>

      {presentationMode && (
        <div className="sticky top-24 z-30 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#070A12]/90 p-3 backdrop-blur-xl print:hidden">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTransposeDown}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
            >
              -½ tom
            </button>

            <button
              type="button"
              onClick={handleResetTone}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
            >
              Original
            </button>

            <button
              type="button"
              onClick={handleTransposeUp}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
            >
              +½ tom
            </button>

            <button
              type="button"
              onClick={() => setAutoScrollEnabled((current) => !current)}
              className="rounded-xl border border-violet-400/20 bg-violet-500/15 px-3 py-2 text-sm font-bold text-violet-100"
            >
              {autoScrollEnabled ? "Pausar" : "Rolagem"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setPresentationMode(false);
              setAutoScrollEnabled(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
          >
            <X className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}

      <section
        ref={contentRef}
        className={
          presentationMode
            ? "mt-8 print:block"
            : "mt-8 grid gap-8 lg:grid-cols-[1fr_320px] print:block"
        }
      >
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-8 print:border-none print:bg-white print:p-0 print:shadow-none">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-5 print:border-slate-300">
            <div>
              <p className="text-sm font-semibold text-violet-300 print:text-black">
                Cifra
              </p>
              <h2 className="mt-1 text-2xl font-black text-white print:text-black">
                {song.title}
              </h2>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 md:flex print:hidden">
              <Star className="h-4 w-4 text-yellow-300" />
              {difficulty}
            </div>
          </div>

          <div className="overflow-x-auto">
            <pre
              className={[
                presentationMode
                  ? "text-xl leading-10 md:text-2xl md:leading-[3.2rem]"
                  : "text-[15px] leading-8 md:text-base",
                "font-mono text-slate-100 print:whitespace-pre-wrap print:text-[13px] print:leading-6 print:text-black",
              ].join(" ")}
            >
              {formattedLines.map((line) => {
                if (line.isEmpty) {
                  return "\n";
                }

                return (
                  <span
                    key={line.id}
                    className={
                      line.isChordLine
                        ? "font-bold text-violet-300 print:text-black"
                        : "text-slate-100 print:text-black"
                    }
                  >
                    {line.text}
                    {"\n"}
                  </span>
                );
              })}
            </pre>
          </div>
        </article>

        {!presentationMode && (
          <aside className="space-y-5 print:hidden">
            <SongAudioTracksSection songId={song.id} />

            {song.youtubeUrl && (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-bold text-white">Vídeo / aula</p>
                <p className="mt-2 text-sm text-slate-400">
                  Link relacionado à música.
                </p>

                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400"
                >
                  Abrir vídeo
                </a>
              </div>
            )}

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm font-bold text-white">Informações</p>

              <dl className="mt-4 space-y-4 text-sm">
                <InfoRow label="Artista" value={artistName} />
                <InfoRow label="Gênero" value={song.genre || "Não informado"} />
                <InfoRow label="Dificuldade" value={difficulty} />
                <InfoRow label="Tom atual" value={currentKey} />
                <InfoRow
                  label="Transposição"
                  value={
                    semitones === 0
                      ? "Original"
                      : `${semitones > 0 ? "+" : ""}${semitones} semitons`
                  }
                />
              </dl>
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 print:border-slate-300 print:bg-white">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white print:text-black">
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-200">{value}</dd>
    </div>
  );
}

export default SongPage;