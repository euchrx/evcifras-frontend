import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  ListMusic,
  Loader2,
  Music2,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import { api } from "../services/api";
import {
  useAudioPlayer,
  type GlobalAudioTrack,
} from "../contexts/AudioPlayerContext";

type AudioTrack = GlobalAudioTrack & {
  status: "PUBLISHED";
  playCount?: number;
  playsCount?: number;
  listenCount?: number;
  totalPlays?: number;
  song?: GlobalAudioTrack["song"] & {
    lyrics?: string | null;
    lyric?: string | null;
    content?: string | null;
  };
};

type PublicSongResponse = {
  id: string;
  title: string;
  slug: string;
  content?: string | null;
  lyrics?: string | null;
  lyric?: string | null;
  genre?: string | null;
  artist?: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string | null;
  } | null;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

type PlayerTab = "queue" | "lyrics" | "related";

type SyncedLyricItem = {
  time: number;
  text: string;
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
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

function getLyrics(track: AudioTrack | null) {
  if (!track) {
    return "";
  }

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

function parseLrcLyrics(rawLyrics: string) {
  const lines = rawLyrics.split(/\r?\n/);
  const parsed: SyncedLyricItem[] = [];

  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];

    if (matches.length === 0) {
      continue;
    }

    const text = line.replace(timeRegex, "").trim();

    for (const match of matches) {
      const minutes = Number(match[1] || 0);
      const seconds = Number(match[2] || 0);
      const hundredths = Number(match[3] || 0);
      const time = minutes * 60 + seconds + hundredths / 100;

      parsed.push({
        time,
        text: text || "♪",
      });
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
}

function buildEstimatedVerseLyrics(rawLyrics: string, durationSec: number) {
  const verses = rawLyrics
    .split(/\n\s*\n/)
    .map((verse) => verse.trim())
    .filter(Boolean);

  if (verses.length === 0) {
    return [];
  }

  const safeDuration = durationSec > 0 ? durationSec : verses.length * 8;
  const slice = safeDuration / verses.length;

  return verses.map((verse, index) => ({
    time: index * slice,
    text: verse,
  }));
}

function buildLyricsTimeline(rawLyrics: string, durationSec: number) {
  const lrc = parseLrcLyrics(rawLyrics);

  if (lrc.length > 0) {
    return lrc;
  }

  return buildEstimatedVerseLyrics(rawLyrics, durationSec);
}

function getActiveLyricIndex(items: SyncedLyricItem[], currentTime: number) {
  if (items.length === 0) {
    return -1;
  }

  let activeIndex = 0;

  for (let index = 0; index < items.length; index += 1) {
    if (currentTime >= items[index].time) {
      activeIndex = index;
    } else {
      break;
    }
  }

  return activeIndex;
}

export function ListenTrackPage() {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();

  const {
    currentTrack,
    queue,
    isPlaying,
    duration,
    currentTime,
    playTrack,
    setIsPlaying,
  } = useAudioPlayer();

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [allTracks, setAllTracks] = useState<AudioTrack[]>([]);
  const [activeTab, setActiveTab] = useState<PlayerTab>("queue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeLyricRef = useRef<HTMLDivElement | null>(null);

  const playerTrack = useMemo<GlobalAudioTrack | null>(() => {
    if (!track) {
      return null;
    }

    return {
      ...track,
      audioUrl: getPlayableAudioUrl(track.audioUrl),
    };
  }, [track]);

  const isCurrentTrack = currentTrack?.id === track?.id;

  const currentDisplayTime = isCurrentTrack ? currentTime : 0;
  const currentDuration = isCurrentTrack
    ? duration || track?.durationSec || 0
    : track?.durationSec || 0;

  const rawLyrics = useMemo(() => getLyrics(track), [track]);

  const lyricsTimeline = useMemo(() => {
    return buildLyricsTimeline(rawLyrics, currentDuration || track?.durationSec || 0);
  }, [rawLyrics, currentDuration, track?.durationSec]);

  const activeLyricIndex = useMemo(() => {
    return getActiveLyricIndex(lyricsTimeline, currentDisplayTime);
  }, [lyricsTimeline, currentDisplayTime]);

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

  useEffect(() => {
    if (activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLyricIndex]);

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

      let nextTrack = trackResponse.data;

      const hasLyrics =
        nextTrack.song?.lyrics ||
        nextTrack.song?.lyric ||
        nextTrack.song?.content ||
        nextTrack.description;

      if (
        !hasLyrics &&
        nextTrack.song?.artist?.slug &&
        nextTrack.song?.slug
      ) {
        try {
          const songResponse = await api.get<PublicSongResponse>(
            `/songs/${nextTrack.song.artist.slug}/${nextTrack.song.slug}`,
          );

          nextTrack = {
            ...nextTrack,
            song: {
              ...nextTrack.song,
              ...songResponse.data,
              artist: songResponse.data.artist || nextTrack.song?.artist || null,
            },
          };
        } catch {
          // Se a rota pública falhar, mantém os dados atuais.
        }
      }

      setTrack(nextTrack);
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

  function handlePlayCurrent() {
    if (!playerTrack) {
      return;
    }

    if (isCurrentTrack) {
      setIsPlaying(!isPlaying);
      return;
    }

    const nextQueue =
      suggestedQueue.length > 0 ? suggestedQueue : [playerTrack];

    playTrack(playerTrack, nextQueue);
  }

  function handleSelectTrack(nextTrack: GlobalAudioTrack, nextQueue: GlobalAudioTrack[]) {
    playTrack(nextTrack, nextQueue);
    navigate(`/ouvir/${nextTrack.id}`);
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

  const artistName = getTrackArtist(track);
  const songTitle = getTrackTitle(track);
  const imageUrl = getTrackCover(track);

  return (
    <div className="mx-auto max-w-7xl pb-40">
      <Link
        to="/ouvir"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para ouvir
      </Link>

      <section className="mt-8 grid gap-12 lg:grid-cols-[1fr_430px]">
        <div className="flex min-h-[620px] flex-col items-center justify-start">
          <button
            type="button"
            onClick={handlePlayCurrent}
            className="group block w-full max-w-[440px] text-center"
          >
            <div className="mx-auto aspect-square w-full overflow-hidden rounded-[2.5rem] shadow-2xl shadow-black/40 transition duration-300 group-hover:scale-[1.01]">
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
          </button>

          <p className="mt-7 text-center text-lg font-semibold text-violet-200">
            {artistName}
          </p>

          <h1 className="mt-3 max-w-4xl text-center text-4xl font-black tracking-tight text-white md:text-6xl">
            {songTitle}
          </h1>

          <button
            type="button"
            onClick={handlePlayCurrent}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            {isCurrentTrack && isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                Tocar agora
              </>
            )}
          </button>
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

          <div className="mt-5">
            {activeTab === "queue" && (
              <div className="grid gap-2">
                {effectiveQueue.map((item, index) => {
                  const isCurrent = currentTrack?.id === item.id;
                  const cover = getTrackCover(item);

                  return (
                    <button
                      key={`${item.id}-${index}`}
                      type="button"
                      onClick={() => handleSelectTrack(item, effectiveQueue)}
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
              <div className="max-h-[650px] overflow-y-auto pr-2">
                {lyricsTimeline.length > 0 ? (
                  <div className="space-y-6 py-6">
                    {lyricsTimeline.map((item, index) => {
                      const isActive = index === activeLyricIndex;
                      const isPast = index < activeLyricIndex;

                      return (
                        <div
                          key={`${item.time}-${index}`}
                          ref={isActive ? activeLyricRef : null}
                          className={[
                            "transition-all duration-500",
                            isActive
                              ? "scale-[1.02] text-white opacity-100"
                              : isPast
                                ? "text-slate-500 opacity-60"
                                : "text-slate-400 opacity-80",
                          ].join(" ")}
                        >
                          <p
                            className={[
                              "whitespace-pre-wrap font-black leading-tight",
                              isActive
                                ? "text-3xl md:text-4xl"
                                : "text-xl md:text-2xl",
                            ].join(" ")}
                          >
                            {item.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-center">
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
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-center">
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
                        onClick={() => handleSelectTrack(item, nextQueue)}
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