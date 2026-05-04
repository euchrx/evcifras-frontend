import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Disc3,
  FileAudio,
  Headphones,
  Library,
  Loader2,
  Music2,
  PlayCircle,
  Radio,
  Search,
  Sparkles,
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
  subtitle: string;
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
    const artist = getTrackArtist(track);
    const genre = track.song?.genre || "EvCifras";
    const key = track.song?.artist?.id || artist;

    const current = map.get(key);

    if (current) {
      current.tracks.push(track);
      return;
    }

    map.set(key, {
      id: key,
      title: artist,
      subtitle: genre,
      coverUrl: getTrackCover(track),
      tracks: [track],
    });
  });

  return Array.from(map.values()).slice(0, 8);
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

  const featuredTrack = filteredTracks[0] || tracks[0] || null;

  const quickPicks = useMemo(() => {
    return filteredTracks.slice(0, 10);
  }, [filteredTracks]);

  const albumGroups = useMemo(() => {
    return getAlbumGroups(filteredTracks);
  }, [filteredTracks]);

  const jukeboxQueue = useMemo(() => {
    return filteredTracks.slice(0, 20);
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

      <section className="relative mt-8 overflow-hidden rounded-[2.5rem] px-1 py-2">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute right-10 top-8 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative grid gap-8 md:grid-cols-[1.1fr_360px] md:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-violet-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              Jukebox digital
            </div>

            <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
              Ouvir agora
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Uma experiência de áudio para estudar, ensaiar e tocar junto:
              guias, playbacks, demos, aulas e faixas organizadas por música,
              artista e categoria.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {featuredTrack && (
                <PlayAudioTrackButton
                  track={featuredTrack}
                  queue={jukeboxQueue.length > 0 ? jukeboxQueue : tracks}
                  label="Iniciar jukebox"
                  className="inline-flex h-13 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-black text-black shadow-2xl shadow-black/30 transition hover:scale-[1.03] hover:bg-slate-100"
                />
              )}

              <button
                type="button"
                onClick={loadTracks}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Radio className="h-4 w-4" />
                )}
                {loading ? "Atualizando..." : "Atualizar rádio"}
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
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
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2.25rem] bg-violet-500/20 blur-2xl" />

            <div className="relative rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Tocando em destaque
                  </p>

                  <h2 className="mt-2 line-clamp-2 text-2xl font-black text-white">
                    {featuredTrack ? getTrackTitle(featuredTrack) : "EvCifras"}
                  </h2>

                  <p className="mt-1 truncate text-sm font-semibold text-violet-200">
                    {featuredTrack ? getTrackArtist(featuredTrack) : "Player"}
                  </p>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-violet-200">
                  <Disc3 className="h-8 w-8" />
                </div>
              </div>

              <div className="mt-5 h-56 overflow-hidden rounded-[2rem] bg-black/30">
                {featuredTrack && getTrackCover(featuredTrack) ? (
                  <img
                    src={getTrackCover(featuredTrack)}
                    alt={getTrackArtist(featuredTrack)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-blue-500/10 text-violet-100">
                    <Music2 className="h-24 w-24" />
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {featuredTrack
                      ? getTrackSubtitle(featuredTrack)
                      : "Sem faixa"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tracks.length} áudio{tracks.length === 1 ? "" : "s"} na
                    biblioteca
                  </p>
                </div>

                {featuredTrack && (
                  <PlayAudioTrackButton
                    track={featuredTrack}
                    queue={jukeboxQueue}
                    label=""
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-xl shadow-black/30 transition hover:scale-105 hover:bg-slate-100"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-24 z-20 mt-8 rounded-[2rem] border border-white/10 bg-[#070A12]/80 p-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar música, artista, categoria ou gênero..."
            className="h-12 w-full rounded-2xl border border-violet-400/30 bg-violet-500/10 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-violet-200/70 focus:border-violet-300/60 focus:bg-violet-500/15"
          />
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
        <div className="mt-10 space-y-12">
          {quickPicks.length > 0 && (
            <section>
              <SectionTitle
                icon={<PlayCircle className="h-5 w-5" />}
                title="Escolhas rápidas"
                description="Faixas prontas para tocar sem abrir outra tela."
              />

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

          {albumGroups.length > 0 && (
            <section>
              <SectionTitle
                icon={<Library className="h-5 w-5" />}
                title="Álbuns e artistas"
                description="Agrupado como uma biblioteca de estudos."
              />

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {albumGroups.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {playbackTracks.length > 0 && (
            <TrackCarousel
              title="Playbacks para tocar junto"
              description="Base para ensaio, treino e repertório."
              tracks={playbackTracks}
              queue={filteredTracks}
            />
          )}

          {guideTracks.length > 0 && (
            <TrackCarousel
              title="Guias para estudar"
              description="Referências rápidas para tirar a música."
              tracks={guideTracks}
              queue={filteredTracks}
            />
          )}

          <section>
            <SectionTitle
              icon={<Headphones className="h-5 w-5" />}
              title="Jukebox digital"
              description="Todas as faixas em uma lista contínua."
            />

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

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-violet-200">
          {icon}
          <p className="text-sm font-bold">EvCifras</p>
        </div>

        <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
    </div>
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

function AlbumCard({ album }: { album: AlbumGroup }) {
  const firstTrack = album.tracks[0];

  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden rounded-[2rem] bg-white/[0.04] shadow-2xl shadow-black/20 transition group-hover:scale-[1.02]">
        <div className="aspect-square overflow-hidden">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-blue-500/10 text-violet-200">
              <Disc3 className="h-16 w-16" />
            </div>
          )}
        </div>

        {firstTrack && (
          <div className="absolute bottom-3 right-3 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            <PlayAudioTrackButton
              track={firstTrack}
              queue={album.tracks}
              label=""
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl shadow-black/40 transition hover:scale-105"
            />
          </div>
        )}
      </div>

      <h3 className="mt-3 truncate text-sm font-black text-white">
        {album.title}
      </h3>

      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
        {album.subtitle} • {album.tracks.length} faixa
        {album.tracks.length === 1 ? "" : "s"}
      </p>
    </article>
  );
}

function TrackCarousel({
  title,
  description,
  tracks,
  queue,
}: {
  title: string;
  description: string;
  tracks: AudioTrack[];
  queue: AudioTrack[];
}) {
  return (
    <section>
      <SectionTitle
        icon={<Music2 className="h-5 w-5" />}
        title={title}
        description={description}
      />

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