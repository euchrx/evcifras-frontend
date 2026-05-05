import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  ListMusic,
  Loader2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { api } from "../services/api";
import OfflineAudioButton from "../components/audio/OfflineAudioButton";
import {
  useAudioPlayer,
  type GlobalAudioTrack,
} from "../contexts/AudioPlayerContext";

type AudioTrack = GlobalAudioTrack & {
  status: "PUBLISHED";
  song?: GlobalAudioTrack["song"] & {
    lyrics?: string | null;
    lyric?: string | null;
    content?: string | null;
  };
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

type PlayerTab = "queue" | "lyrics" | "related";

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getPlayableAudioUrl(audioUrl: string) {
  if (!audioUrl) {
    return "";
  }

  try {
    const url = new URL(audioUrl);
    const currentHost = window.location.hostname;

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = currentHost;
    }

    return url.toString();
  } catch {
    return audioUrl;
  }
}

function getTrackTitle(track: GlobalAudioTrack | AudioTrack) {
  return track.song?.title || track.title || "Áudio";
}

function getTrackArtist(track: GlobalAudioTrack | AudioTrack) {
  return track.song?.artist?.name || "Artista";
}

function getTrackCover(track: GlobalAudioTrack | AudioTrack) {
  return track.song?.artist?.imageUrl || "";
}

function getTrackGenre(track: GlobalAudioTrack | AudioTrack) {
  return track.song?.genre || "";
}

function getLyrics(track: AudioTrack) {
  return (
    track.song?.lyrics ||
    track.song?.lyric ||
    track.song?.content ||
    track.description ||
    ""
  );
}

function shuffleTracks<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function buildRandomQueue(track: GlobalAudioTrack, source: GlobalAudioTrack[]) {
  const withoutCurrent = source.filter((item) => item.id !== track.id);
  const randomTracks = shuffleTracks(withoutCurrent).slice(0, 24);

  return [track, ...randomTracks];
}

export function ListenTrackPage() {
  const { trackId } = useParams<{ trackId: string }>();

  const {
    currentTrack,
    queue,
    isPlaying,
    duration,
    currentTime,
    volume,
    progress,
    playTrack,
    setIsPlaying,
    seekToPercent,
    skipSeconds,
    setVolumeValue,
  } = useAudioPlayer();

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [allTracks, setAllTracks] = useState<AudioTrack[]>([]);
  const [activeTab, setActiveTab] = useState<PlayerTab>("queue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const artistName = track ? getTrackArtist(track) : "Artista";
  const songTitle = track ? getTrackTitle(track) : "Áudio";
  const imageUrl = track ? getTrackCover(track) : "";
  const playableAudioUrl = track ? getPlayableAudioUrl(track.audioUrl) : "";

  const isCurrentTrack = currentTrack?.id === track?.id;
  const effectiveDuration = isCurrentTrack
    ? duration || track?.durationSec || 0
    : track?.durationSec || 0;
  const effectiveCurrentTime = isCurrentTrack ? currentTime : 0;
  const effectiveProgress = isCurrentTrack ? progress : 0;
  const effectiveIsPlaying = isCurrentTrack && isPlaying;

  const playerTrack = useMemo<GlobalAudioTrack | null>(() => {
    if (!track) {
      return null;
    }

    return {
      ...track,
      audioUrl: playableAudioUrl,
    };
  }, [track, playableAudioUrl]);

  const relatedTracks = useMemo(() => {
    if (!track) {
      return [];
    }

    const currentGenre = getTrackGenre(track).toLowerCase();

    if (!currentGenre) {
      return allTracks.filter((item) => item.id !== track.id).slice(0, 12);
    }

    return allTracks
      .filter((item) => {
        const itemGenre = getTrackGenre(item).toLowerCase();

        return item.id !== track.id && itemGenre === currentGenre;
      })
      .slice(0, 12);
  }, [allTracks, track]);

  const suggestedQueue = useMemo(() => {
    if (!playerTrack) {
      return [];
    }

    const source = allTracks.length > 0 ? allTracks : [playerTrack];
    return buildRandomQueue(playerTrack, source);
  }, [allTracks, playerTrack]);

  const effectiveQueue = useMemo(() => {
    if (queue.length > 1) {
      return queue;
    }

    if (suggestedQueue.length > 0) {
      return suggestedQueue;
    }

    if (playerTrack) {
      return [playerTrack];
    }

    return [];
  }, [queue, suggestedQueue, playerTrack]);

  const lyrics = track ? getLyrics(track) : "";

  const loadTrack = useCallback(async () => {
    if (!trackId) {
      setError("Áudio inválido.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [trackResponse, tracksResponse] = await Promise.all([
        api.get<AudioTrack>(`/audio-tracks/${trackId}`),
        api.get<AudioTrack[]>("/audio-tracks"),
      ]);

      setTrack(trackResponse.data);
      setAllTracks(tracksResponse.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar o áudio."));
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    loadTrack();
  }, [loadTrack]);

  function handlePlayPause() {
    if (!playerTrack) {
      return;
    }

    setError("");

    if (isCurrentTrack) {
      setIsPlaying(!isPlaying);
      return;
    }

    playTrack(playerTrack, suggestedQueue.length > 0 ? suggestedQueue : [playerTrack]);
  }

  function handleSeek(value: string) {
    if (!isCurrentTrack) {
      return;
    }

    seekToPercent(Number(value));
  }

  function handlePlayFromList(
    nextTrack: GlobalAudioTrack,
    nextQueue: GlobalAudioTrack[],
  ) {
    playTrack(nextTrack, nextQueue);
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
          Carregando player...
        </div>
      </div>
    );
  }

  if (!track || !playerTrack) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <Link
          to="/ouvir"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para ouvir
        </Link>

        <div className="mt-8 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8">
          <p className="text-sm font-semibold text-red-300">Erro</p>
          <h1 className="mt-3 text-2xl font-bold text-white">
            Áudio não encontrado
          </h1>
          <p className="mt-3 text-slate-300">
            {error || "Não foi possível encontrar este áudio."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <Link
        to="/ouvir"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para ouvir
      </Link>

      <section className="mt-8 grid gap-10 lg:grid-cols-[1fr_430px]">
        <div className="flex min-h-[620px] flex-col items-center justify-center">
          <p className="text-center text-lg font-semibold text-violet-200">
            {artistName}
          </p>

          <div className="mt-7 w-full max-w-[420px]">
            <div className="aspect-square overflow-hidden rounded-[2.5rem] shadow-2xl shadow-black/50">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={artistName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-violet-500/10 text-violet-200">
                  <Music2 className="h-24 w-24" />
                </div>
              )}
            </div>
          </div>

          <h1 className="mt-7 max-w-3xl text-center text-4xl font-black tracking-tight text-white md:text-6xl">
            {songTitle}
          </h1>

          <div className="mt-10 w-full max-w-3xl">
            <input
              type="range"
              min="0"
              max="100"
              value={effectiveProgress}
              onChange={(event) => handleSeek(event.target.value)}
              disabled={!isCurrentTrack}
              className="w-full accent-violet-500 disabled:opacity-40"
              aria-label="Progresso do áudio"
            />

            <div className="mt-2 flex justify-between text-xs font-semibold text-slate-400">
              <span>{formatTime(effectiveCurrentTime)}</span>
              <span>{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => skipSeconds(-10)}
              disabled={!isCurrentTrack}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handlePlayPause}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-500 text-white shadow-2xl shadow-violet-950/40 transition hover:bg-violet-400"
            >
              {effectiveIsPlaying ? (
                <Pause className="h-9 w-9 fill-white" />
              ) : (
                <Play className="ml-1 h-9 w-9 fill-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(10)}
              disabled={!isCurrentTrack}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 backdrop-blur">
            <Volume2 className="h-4 w-4 text-slate-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={(event) =>
                setVolumeValue(Number(event.target.value) / 100)
              }
              className="w-full accent-violet-500"
              aria-label="Volume"
            />
          </div>

          <div className="mt-4">
            <OfflineAudioButton track={playerTrack} />
          </div>
        </div>

        <aside className="min-h-[620px]">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black transition",
                activeTab === "queue"
                  ? "bg-white text-black"
                  : "bg-white/5 text-white hover:bg-white/10",
              ].join(" ")}
            >
              <ListMusic className="h-4 w-4" />
              Fila
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("lyrics")}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black transition",
                activeTab === "lyrics"
                  ? "bg-white text-black"
                  : "bg-white/5 text-white hover:bg-white/10",
              ].join(" ")}
            >
              <FileText className="h-4 w-4" />
              Letra
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("related")}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black transition",
                activeTab === "related"
                  ? "bg-white text-black"
                  : "bg-white/5 text-white hover:bg-white/10",
              ].join(" ")}
            >
              <Sparkles className="h-4 w-4" />
              Relacionados
            </button>
          </div>

          <div className="mt-5 max-h-[650px] overflow-y-auto pr-1">
            {activeTab === "queue" && (
              <div className="grid gap-2">
                {effectiveQueue.map((item, index) => {
                  const isCurrent = currentTrack?.id === item.id;
                  const cover = getTrackCover(item);

                  return (
                    <button
                      key={`${item.id}-${index}`}
                      type="button"
                      onClick={() => handlePlayFromList(item, effectiveQueue)}
                      className={[
                        "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                        isCurrent
                          ? "border-violet-400/30 bg-violet-500/15"
                          : "border-white/10 bg-white/[0.035] hover:bg-white/10",
                      ].join(" ")}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
                        {cover ? (
                          <img
                            src={cover}
                            alt={getTrackArtist(item)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-violet-200">
                            <Music2 className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">
                          {index + 1}. {getTrackTitle(item)}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                          {getTrackArtist(item)}
                        </p>
                      </div>

                      {isCurrent && isPlaying && (
                        <Pause className="h-4 w-4 text-violet-200" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "lyrics" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur">
                {lyrics ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">
                    {lyrics}
                  </pre>
                ) : (
                  <div className="py-10 text-center">
                    <FileText className="mx-auto h-10 w-10 text-slate-500" />
                    <p className="mt-4 text-sm font-bold text-white">
                      Letra não cadastrada
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Cadastre a letra na música para aparecer aqui.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "related" && (
              <div className="grid gap-2">
                {relatedTracks.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-center backdrop-blur">
                    <Sparkles className="mx-auto h-10 w-10 text-slate-500" />
                    <p className="mt-4 text-sm font-bold text-white">
                      Nenhuma música relacionada
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Quando houver mais músicas do mesmo gênero, elas aparecem
                      aqui.
                    </p>
                  </div>
                ) : (
                  relatedTracks.map((item) => {
                    const cover = getTrackCover(item);
                    const nextQueue = buildRandomQueue(item, allTracks);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handlePlayFromList(item, nextQueue)}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:bg-white/10"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
                          {cover ? (
                            <img
                              src={cover}
                              alt={getTrackArtist(item)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-violet-200">
                              <Music2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">
                            {getTrackTitle(item)}
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                            {getTrackArtist(item)}
                          </p>
                        </div>

                        <Play className="h-4 w-4 text-slate-500" />
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

export default ListenTrackPage;