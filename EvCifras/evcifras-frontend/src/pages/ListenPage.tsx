import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Disc3,
  FileAudio,
  Loader2,
  Music2,
  Pause,
  Play,
} from "lucide-react";
import { api } from "../services/api";
import {
  useAudioPlayer,
  type GlobalAudioTrack,
} from "../contexts/AudioPlayerContext";

type AudioTrackType =
  | "ORIGINAL"
  | "PLAYBACK"
  | "GUIDE"
  | "LESSON"
  | "DEMO"
  | "OTHER";

type AudioTrack = GlobalAudioTrack & {
  status: "PUBLISHED";
  playCount?: number;
  playsCount?: number;
  listenCount?: number;
  totalPlays?: number;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

type AlbumGroup = {
  id: string;
  title: string;
  coverUrl: string;
  tracks: AudioTrack[];
};

const typeLabels: Record<AudioTrackType, string> = {
  ORIGINAL: "Original",
  PLAYBACK: "Playback",
  GUIDE: "Guia",
  LESSON: "Aula",
  DEMO: "Demo",
  OTHER: "Áudio",
};

const typeOptions: Array<{
  value: "" | AudioTrackType;
  label: string;
}> = [
  { value: "", label: "Todos" },
  { value: "ORIGINAL", label: "Original" },
  { value: "PLAYBACK", label: "Playbacks" },
  { value: "GUIDE", label: "Guias" },
  { value: "LESSON", label: "Aulas" },
  { value: "DEMO", label: "Demos" },
  { value: "OTHER", label: "Outros" },
];

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || fallback;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatPlays(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;

    if (Number.isInteger(millions)) {
      return `${millions} milhões`;
    }

    return `${millions.toFixed(1).replace(".", ",")} milhões`;
  }

  if (value >= 1_000) {
    const thousands = value / 1_000;

    if (Number.isInteger(thousands)) {
      return `${thousands} mil`;
    }

    return `${thousands.toFixed(1).replace(".", ",")} mil`;
  }

  return String(value);
}

function getTrackPlayCount(track: AudioTrack) {
  return (
    track.playCount ??
    track.playsCount ??
    track.listenCount ??
    track.totalPlays ??
    0
  );
}

function getTrackTitle(track: AudioTrack | GlobalAudioTrack) {
  return track.song?.title || track.title || "Música";
}

function getTrackArtist(track: AudioTrack | GlobalAudioTrack) {
  return track.song?.artist?.name || "Artista";
}

function getTrackCover(track: AudioTrack | GlobalAudioTrack) {
  return track.song?.artist?.imageUrl || "";
}

function getAlbumGroups(tracks: AudioTrack[]) {
  const map = new Map<string, AlbumGroup>();

  tracks.forEach((track) => {
    const title = getTrackTitle(track);
    const key = track.song?.id || track.id;

    const current = map.get(key);

    if (current) {
      current.tracks.push(track);
      return;
    }

    map.set(key, {
      id: key,
      title,
      coverUrl: getTrackCover(track),
      tracks: [track],
    });
  });

  return Array.from(map.values()).slice(0, 18);
}

function shuffleTracks<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function buildRandomQueue(track: AudioTrack, source: AudioTrack[]) {
  const withoutCurrent = source.filter((item) => item.id !== track.id);
  const randomTracks = shuffleTracks(withoutCurrent).slice(0, 24);

  return [track, ...randomTracks];
}

export function ListenPage() {
  const [searchParams] = useSearchParams();

  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();

  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState<"" | AudioTrackType>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  const filteredTracks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tracks.filter((track) => {
      const songTitle = track.song?.title || "";
      const artistName = track.song?.artist?.name || "";
      const genre = track.song?.genre || "";
      const typeLabel = typeLabels[track.type] || "";

      const matchesSearch =
        !normalizedSearch ||
        songTitle.toLowerCase().includes(normalizedSearch) ||
        artistName.toLowerCase().includes(normalizedSearch) ||
        genre.toLowerCase().includes(normalizedSearch) ||
        typeLabel.toLowerCase().includes(normalizedSearch) ||
        track.description?.toLowerCase().includes(normalizedSearch);

      const matchesType = !typeFilter || track.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [tracks, search, typeFilter]);

  const albumGroups = useMemo(() => {
    return getAlbumGroups(filteredTracks);
  }, [filteredTracks]);

  const quickPicks = useMemo(() => {
    return filteredTracks.slice(0, 8);
  }, [filteredTracks]);

  const guideTracks = useMemo(() => {
    return filteredTracks.filter((track) => track.type === "GUIDE").slice(0, 8);
  }, [filteredTracks]);

  const playbackTracks = useMemo(() => {
    return filteredTracks
      .filter((track) => track.type === "PLAYBACK")
      .slice(0, 8);
  }, [filteredTracks]);

  function updateTrackPlayCount(trackId: string, playCount: number) {
    setTracks((current) =>
      current.map((track) =>
        track.id === trackId
          ? {
              ...track,
              playCount,
            }
          : track,
      ),
    );
  }

  async function registerStream(trackId: string) {
    try {
      const response = await api.post<
        | {
            id?: string;
            playCount?: number;
            playsCount?: number;
            listenCount?: number;
            totalPlays?: number;
          }
        | AudioTrack
      >(`/audio-tracks/${trackId}/stream`);

      const data = response.data;

      const nextPlayCount =
        data.playCount ??
        data.playsCount ??
        data.listenCount ??
        data.totalPlays;

      if (typeof nextPlayCount === "number") {
        updateTrackPlayCount(trackId, nextPlayCount);
      }
    } catch {
      // Mantém a contagem real: se o backend falhar, não cria número falso.
    }
  }

  function handlePlayTrack(track: AudioTrack) {
    const isCurrent = currentTrack?.id === track.id;

    if (isCurrent) {
      setIsPlaying(!isPlaying);
      return;
    }

    const source = filteredTracks.length > 0 ? filteredTracks : tracks;
    const randomQueue = buildRandomQueue(track, source);

    playTrack(track, randomQueue);
    void registerStream(track.id);
  }

  async function loadTracks() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<AudioTrack[]>("/audio-tracks");
      setTracks(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar os áudios."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTracks();
  }, []);

  return (
    <div className="mx-auto max-w-7xl pb-28">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para início
      </Link>

      <section className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {typeOptions.map((option) => {
          const active = typeFilter === option.value;

          return (
            <button
              key={option.value || "ALL"}
              type="button"
              onClick={() => setTypeFilter(option.value)}
              className={[
                "h-10 shrink-0 rounded-full px-4 text-sm font-bold transition",
                active
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-300" />
          Carregando áudios...
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center">
          <FileAudio className="mx-auto h-12 w-12 text-slate-500" />
          <h2 className="mt-4 text-xl font-black text-white">
            Nenhum áudio encontrado
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Tente buscar por outro termo ou aguarde novos áudios publicados.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {albumGroups.length > 0 && (
            <section>
              <SectionTitle title="Escolha a dedo" />

              <div className="mt-5 flex snap-x gap-4 overflow-x-auto pb-4">
                {albumGroups.map((album) => (
                  <AlbumTouchCard
                    key={album.id}
                    album={album}
                    onPlayTrack={handlePlayTrack}
                  />
                ))}
              </div>
            </section>
          )}

          {quickPicks.length > 0 && (
            <section>
              <SectionTitle title="Escolhas rápidas" />

              <div className="mt-5 grid gap-x-5 gap-y-3 md:grid-cols-2">
                {quickPicks.map((track, index) => (
                  <FloatingTrackRow
                    key={track.id}
                    track={track}
                    index={index}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    onPlayTrack={handlePlayTrack}
                  />
                ))}
              </div>
            </section>
          )}

          {playbackTracks.length > 0 && (
            <TrackCarousel
              title="Playbacks"
              tracks={playbackTracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
            />
          )}

          {guideTracks.length > 0 && (
            <TrackCarousel
              title="Guias"
              tracks={guideTracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
            />
          )}

          <section>
            <SectionTitle title="Todas as faixas" />

            <div className="mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur">
              <div className="grid grid-cols-[48px_1fr_72px] gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 md:grid-cols-[56px_1fr_80px]">
                <span>#</span>
                <span>Título</span>
                <span className="text-right">
                  <Clock3 className="ml-auto h-4 w-4" />
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {filteredTracks.map((track, index) => (
                  <JukeboxRow
                    key={track.id}
                    track={track}
                    index={index}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    onPlayTrack={handlePlayTrack}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-2xl font-black text-white md:text-3xl">{title}</h2>
  );
}

function PlayStateIcon({
  active,
  playing,
  className,
}: {
  active: boolean;
  playing: boolean;
  className: string;
}) {
  return (
    <span className={className}>
      {active && playing ? (
        <Pause className="h-4 w-4 fill-current" />
      ) : (
        <Play className="ml-0.5 h-4 w-4 fill-current" />
      )}
    </span>
  );
}

function AlbumTouchCard({
  album,
  onPlayTrack,
}: {
  album: AlbumGroup;
  onPlayTrack: (track: AudioTrack) => void;
}) {
  const firstTrack = album.tracks[0];

  function handleClick() {
    if (!firstTrack) {
      return;
    }

    onPlayTrack(firstTrack);
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      className="group w-[138px] shrink-0 snap-start cursor-pointer outline-none sm:w-[160px] md:w-[190px] lg:w-[210px]"
      aria-label={`Tocar ${album.title}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-[1.7rem] shadow-2xl shadow-black/30 transition duration-300 group-hover:scale-[1.03] group-active:scale-[0.98]">
        {album.coverUrl ? (
          <img
            src={album.coverUrl}
            alt={album.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-blue-500/10 text-violet-200">
            <Disc3 className="h-14 w-14" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

        {firstTrack && (
          <div className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl shadow-black/40 transition group-hover:scale-105">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </div>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-black leading-5 text-white">
        {album.title}
      </p>
    </article>
  );
}

function FloatingTrackRow({
  track,
  index,
  currentTrackId,
  isPlaying,
  onPlayTrack,
}: {
  track: AudioTrack;
  index: number;
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: AudioTrack) => void;
}) {
  const cover = getTrackCover(track);
  const isCurrent = currentTrackId === track.id;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onPlayTrack(track)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPlayTrack(track);
        }
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-[1.5rem] border border-transparent bg-white/[0.035] p-3 outline-none backdrop-blur transition hover:border-white/10 hover:bg-white/[0.075] active:scale-[0.99]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-black text-slate-500 group-hover:hidden">
        {index + 1}
      </div>

      <PlayStateIcon
        active={isCurrent}
        playing={isPlaying}
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 group-hover:flex"
      />

      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/10">
        {cover ? (
          <img
            src={cover}
            alt={getTrackArtist(track)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-violet-200">
            <Music2 className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">
          {getTrackTitle(track)}
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-400">
          {getTrackArtist(track)}
        </p>
      </div>

      <span className="hidden text-xs font-semibold text-slate-500 sm:block">
        {formatDuration(track.durationSec)}
      </span>
    </article>
  );
}

function TrackCarousel({
  title,
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
}: {
  title: string;
  tracks: AudioTrack[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: AudioTrack) => void;
}) {
  return (
    <section>
      <SectionTitle title={title} />

      <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
        {tracks.map((track) => {
          const cover = getTrackCover(track);
          const isCurrent = currentTrackId === track.id;

          return (
            <article
              key={track.id}
              role="button"
              tabIndex={0}
              onClick={() => onPlayTrack(track)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPlayTrack(track);
                }
              }}
              className="group w-44 shrink-0 cursor-pointer rounded-[1.75rem] border border-transparent bg-white/[0.035] p-3 outline-none transition hover:border-white/10 hover:bg-white/[0.075] active:scale-[0.99]"
            >
              <div className="relative aspect-square overflow-hidden rounded-[1.4rem] bg-white/10">
                {cover ? (
                  <img
                    src={cover}
                    alt={getTrackArtist(track)}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-violet-200">
                    <Music2 className="h-12 w-12" />
                  </div>
                )}

                <PlayStateIcon
                  active={isCurrent}
                  playing={isPlaying}
                  className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl shadow-black/40 transition hover:scale-105 md:opacity-0 md:group-hover:opacity-100"
                />
              </div>

              <h3 className="mt-3 line-clamp-2 text-sm font-black text-white">
                {getTrackTitle(track)}
              </h3>

              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                {getTrackArtist(track)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function JukeboxRow({
  track,
  index,
  currentTrackId,
  isPlaying,
  onPlayTrack,
}: {
  track: AudioTrack;
  index: number;
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: AudioTrack) => void;
}) {
  const cover = getTrackCover(track);
  const plays = formatPlays(getTrackPlayCount(track));
  const isCurrent = currentTrackId === track.id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPlayTrack(track)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPlayTrack(track);
        }
      }}
      className="group grid cursor-pointer grid-cols-[48px_1fr_72px] items-center gap-3 px-4 py-3 outline-none transition hover:bg-white/[0.06] active:bg-white/[0.08] md:grid-cols-[56px_1fr_80px]"
    >
      <div className="flex items-center justify-center">
        <span className="text-sm font-bold text-slate-500 group-hover:hidden">
          {index + 1}
        </span>

        <PlayStateIcon
          active={isCurrent}
          playing={isPlaying}
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 group-hover:flex"
        />
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/10">
          {cover ? (
            <img
              src={cover}
              alt={getTrackArtist(track)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-violet-200">
              <Music2 className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">
            {getTrackTitle(track)}
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            {getTrackArtist(track)} - Tocou {plays} vezes
          </p>
        </div>
      </div>

      <div className="text-right text-sm font-semibold text-slate-400">
        {formatDuration(track.durationSec)}
      </div>
    </div>
  );
}

export default ListenPage;