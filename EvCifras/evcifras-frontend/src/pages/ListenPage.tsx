import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Disc3,
  FileAudio,
  Loader2,
  Music2,
  Search,
} from "lucide-react";
import { api } from "../services/api";
import PlayAudioTrackButton from "../components/audio/PlayAudioTrackButton";
import type { GlobalAudioTrack } from "../contexts/AudioPlayerContext";

type AudioTrackType =
  | "ORIGINAL"
  | "PLAYBACK"
  | "GUIDE"
  | "LESSON"
  | "DEMO"
  | "OTHER";

type AudioTrack = GlobalAudioTrack & {
  status: "PUBLISHED";
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

function getSongUrl(track: AudioTrack) {
  if (!track.song?.artist?.slug || !track.song?.slug) {
    return "/";
  }

  return `/cifras/${track.song.artist.slug}/${track.song.slug}`;
}

function getTrackTitle(track: AudioTrack) {
  return track.song?.title || track.title || "Música";
}

function getTrackArtist(track: AudioTrack) {
  return track.song?.artist?.name || "Artista";
}

function getTrackCover(track: AudioTrack) {
  return track.song?.artist?.imageUrl || "";
}

function getTrackType(track: AudioTrack) {
  return typeLabels[track.type] || "Áudio";
}

function getTrackSubtitle(track: AudioTrack) {
  const typeLabel = getTrackType(track);
  const genre = track.song?.genre;

  if (genre) {
    return `${typeLabel} • ${genre}`;
  }

  return typeLabel;
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

export function ListenPage() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | AudioTrackType>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      <section className="sticky top-24 z-20 mt-6 rounded-[2rem] border border-white/10 bg-[#070A12]/80 p-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar música, artista, categoria ou gênero..."
            className="h-12 w-full rounded-2xl border border-violet-400/30 bg-violet-500/10 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-violet-200/70 focus:border-violet-300/60 focus:bg-violet-500/15"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
                  <AlbumTouchCard key={album.id} album={album} />
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
                    queue={filteredTracks}
                  />
                ))}
              </div>
            </section>
          )}

          {playbackTracks.length > 0 && (
            <TrackCarousel
              title="Playbacks"
              tracks={playbackTracks}
              queue={filteredTracks}
            />
          )}

          {guideTracks.length > 0 && (
            <TrackCarousel
              title="Guias"
              tracks={guideTracks}
              queue={filteredTracks}
            />
          )}

          <section>
            <SectionTitle title="Todas as faixas" />

            <div className="mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur">
              <div className="grid grid-cols-[48px_1fr_96px_72px] gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 md:grid-cols-[56px_1fr_150px_120px_80px]">
                <span>#</span>
                <span>Título</span>
                <span className="hidden md:block">Categoria</span>
                <span>Cifra</span>
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
                    queue={filteredTracks}
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

function AlbumTouchCard({ album }: { album: AlbumGroup }) {
  const firstTrack = album.tracks[0];

  return (
    <article className="group w-[138px] shrink-0 snap-start sm:w-[160px] md:w-[190px] lg:w-[210px]">
      <button
        type="button"
        className="block w-full text-left"
        aria-label={`Tocar ${album.title}`}
      >
        <div className="relative aspect-square overflow-hidden rounded-[1.7rem] shadow-2xl shadow-black/30 transition duration-300 group-hover:scale-[1.03]">
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

          {firstTrack && (
            <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-3 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
              <PlayAudioTrackButton
                track={firstTrack}
                queue={album.tracks}
                label=""
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl shadow-black/40 transition hover:scale-105"
              />
            </div>
          )}
        </div>

        <p className="mt-3 line-clamp-2 text-sm font-black leading-5 text-white">
          {album.title}
        </p>
      </button>
    </article>
  );
}

function FloatingTrackRow({
  track,
  index,
  queue,
}: {
  track: AudioTrack;
  index: number;
  queue: AudioTrack[];
}) {
  const cover = getTrackCover(track);

  return (
    <article className="group flex items-center gap-3 rounded-[1.5rem] border border-transparent bg-white/[0.035] p-3 backdrop-blur transition hover:border-white/10 hover:bg-white/[0.075]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-black text-slate-500 group-hover:hidden">
        {index + 1}
      </div>

      <PlayAudioTrackButton
        track={track}
        queue={queue}
        label=""
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
          {getTrackArtist(track)} • {getTrackSubtitle(track)}
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
  queue,
}: {
  title: string;
  tracks: AudioTrack[];
  queue: AudioTrack[];
}) {
  return (
    <section>
      <SectionTitle title={title} />

      <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
        {tracks.map((track) => {
          const cover = getTrackCover(track);

          return (
            <article
              key={track.id}
              className="group w-44 shrink-0 rounded-[1.75rem] border border-transparent bg-white/[0.035] p-3 transition hover:border-white/10 hover:bg-white/[0.075]"
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

                <div className="absolute bottom-3 right-3 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <PlayAudioTrackButton
                    track={track}
                    queue={queue}
                    label=""
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl shadow-black/40 transition hover:scale-105"
                  />
                </div>
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
  queue,
}: {
  track: AudioTrack;
  index: number;
  queue: AudioTrack[];
}) {
  const cover = getTrackCover(track);

  return (
    <div className="group grid grid-cols-[48px_1fr_96px_72px] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.06] md:grid-cols-[56px_1fr_150px_120px_80px]">
      <div className="flex items-center justify-center">
        <span className="text-sm font-bold text-slate-500 group-hover:hidden">
          {index + 1}
        </span>

        <PlayAudioTrackButton
          track={track}
          queue={queue}
          label=""
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
            {getTrackArtist(track)}
            {track.song?.genre ? ` • ${track.song.genre}` : ""}
          </p>
        </div>
      </div>

      <div className="hidden md:block">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
          {getTrackType(track)}
        </span>
      </div>

      <Link
        to={getSongUrl(track)}
        className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition hover:bg-white/10"
      >
        Cifra
      </Link>

      <div className="text-right text-sm font-semibold text-slate-400">
        {formatDuration(track.durationSec)}
      </div>
    </div>
  );
}

export default ListenPage;