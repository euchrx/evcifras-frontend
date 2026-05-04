import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Archive,
  CheckCircle2,
  Edit3,
  FileAudio,
  Headphones,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

type Song = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";
  artist?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type AudioTrackType =
  | "ORIGINAL"
  | "PLAYBACK"
  | "GUIDE"
  | "LESSON"
  | "DEMO"
  | "OTHER";

type PresignedAudioUploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
  contentType: string;
  sizeBytes: number;
};

type AudioTrackStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type AudioTrack = {
  id: string;
  title: string;
  description?: string | null;
  type: AudioTrackType;
  status: AudioTrackStatus;
  audioUrl: string;
  durationSec?: number | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  songId: string;
  song?: Song | null;
  createdAt: string;
  updatedAt: string;
};

type AudioTrackFormState = {
  title: string;
  description: string;
  type: AudioTrackType;
  audioUrl: string;
  durationSec: string;
  sizeBytes: string;
  mimeType: string;
  songId: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

const emptyForm: AudioTrackFormState = {
  title: "",
  description: "",
  type: "OTHER",
  audioUrl: "",
  durationSec: "",
  sizeBytes: "",
  mimeType: "audio/mpeg",
  songId: "",
};

const typeLabels: Record<AudioTrackType, string> = {
  ORIGINAL: "Original",
  PLAYBACK: "Playback",
  GUIDE: "Guia",
  LESSON: "Aula",
  DEMO: "Demo",
  OTHER: "Outro",
};

const statusLabels: Record<AudioTrackStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  const message = apiError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return message || fallback;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) {
    return "-";
  }

  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

function getListenUrl(track: AudioTrack) {
  return `/ouvir/${track.id}`;
}

export function AdminAudioTracksPage() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [form, setForm] = useState<AudioTrackFormState>(emptyForm);
  const [editingTrackId, setEditingTrackId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [songFilter, setSongFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [songsLoading, setSongsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishingId, setPublishingId] = useState("");
  const [archivingId, setArchivingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const editingTrack = useMemo(() => {
    if (!editingTrackId) {
      return null;
    }

    return tracks.find((track) => track.id === editingTrackId) || null;
  }, [tracks, editingTrackId]);

  const publishedSongs = useMemo(() => {
    return songs.filter((song) => song.status === "PUBLISHED");
  }, [songs]);

  const filteredTracks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tracks.filter((track) => {
      const songTitle = track.song?.title || "";
      const artistName = track.song?.artist?.name || "";

      const matchesSearch =
        !normalizedSearch ||
        track.title.toLowerCase().includes(normalizedSearch) ||
        track.description?.toLowerCase().includes(normalizedSearch) ||
        songTitle.toLowerCase().includes(normalizedSearch) ||
        artistName.toLowerCase().includes(normalizedSearch);

      const matchesStatus = !statusFilter || track.status === statusFilter;
      const matchesType = !typeFilter || track.type === typeFilter;
      const matchesSong = !songFilter || track.songId === songFilter;

      return matchesSearch && matchesStatus && matchesType && matchesSong;
    });
  }, [tracks, search, statusFilter, typeFilter, songFilter]);

  async function loadSongs() {
    try {
      setSongsLoading(true);

      const response = await api.get<Song[]>("/songs/admin/all");
      setSongs(response.data);
    } catch {
      setSongs([]);
    } finally {
      setSongsLoading(false);
    }
  }

  async function loadTracks() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<AudioTrack[]>("/audio-tracks/admin/all");
      setTracks(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível carregar os áudios."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSongs();
    loadTracks();
  }, []);

  function updateForm<K extends keyof AudioTrackFormState>(
    field: K,
    value: AudioTrackFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleStartEdit(track: AudioTrack) {
    setEditingTrackId(track.id);
    setForm({
      title: track.title || "",
      description: track.description || "",
      type: track.type || "OTHER",
      audioUrl: track.audioUrl || "",
      durationSec: track.durationSec ? String(track.durationSec) : "",
      sizeBytes: track.sizeBytes ? String(track.sizeBytes) : "",
      mimeType: track.mimeType || "audio/mpeg",
      songId: track.songId || track.song?.id || "",
    });
    setFeedback("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleCancelEdit() {
    setEditingTrackId("");
    setForm(emptyForm);
    setFeedback("");
    setError("");
  }

  function buildPayload() {
    const durationSec = form.durationSec.trim()
      ? Number(form.durationSec.trim())
      : undefined;

    const sizeBytes = form.sizeBytes.trim()
      ? Number(form.sizeBytes.trim())
      : undefined;

    return {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      audioUrl: form.audioUrl.trim(),
      durationSec,
      sizeBytes,
      mimeType: form.mimeType.trim() || undefined,
      songId: form.songId,
    };
  }

  async function handleUploadAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedTypes = new Set([
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/aac",
      "audio/x-m4a",
      "audio/wav",
      "audio/x-wav",
    ]);

    if (!allowedTypes.has(file.type)) {
      setFeedback("Selecione um áudio MP3, M4A, AAC ou WAV.");
      return;
    }

    const maxSize = 30 * 1024 * 1024;

    if (file.size > maxSize) {
      setFeedback("O arquivo precisa ter no máximo 30 MB.");
      return;
    }

    try {
      setUploading(true);
      setFeedback("");
      setError("");

      const presignResponse = await api.post<PresignedAudioUploadResponse>(
        "/uploads/audio/presign",
        {
          fileName: file.name,
          contentType: file.type || "audio/mpeg",
          sizeBytes: file.size,
        },
      );

      const { uploadUrl, publicUrl } = presignResponse.data;

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "audio/mpeg",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Falha ao enviar o áudio para o Cloudflare R2.");
      }

      setForm((current) => ({
        ...current,
        audioUrl: publicUrl,
        mimeType: file.type || "audio/mpeg",
        sizeBytes: String(file.size),
        title: current.title || file.name.replace(/\.[^/.]+$/, ""),
      }));

      setFeedback("Upload concluído. Agora preencha os dados e salve o áudio.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : getApiErrorMessage(err, "Não foi possível fazer upload.");

      setFeedback(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setFeedback("Informe o título do áudio.");
      return;
    }

    if (!form.audioUrl.trim()) {
      setFeedback("Faça upload de um arquivo de áudio antes de salvar.");
      return;
    }

    if (!form.songId) {
      setFeedback("Selecione a cifra/música vinculada.");
      return;
    }

    if (form.durationSec.trim() && Number.isNaN(Number(form.durationSec))) {
      setFeedback("A duração precisa ser um número em segundos.");
      return;
    }

    if (form.sizeBytes.trim() && Number.isNaN(Number(form.sizeBytes))) {
      setFeedback("O tamanho precisa ser um número em bytes.");
      return;
    }

    try {
      setSaving(true);
      setFeedback("");
      setError("");

      const payload = buildPayload();

      if (editingTrackId) {
        const response = await api.patch<AudioTrack>(
          `/audio-tracks/${editingTrackId}`,
          payload,
        );

        setTracks((current) =>
          current.map((track) =>
            track.id === editingTrackId ? response.data : track,
          ),
        );

        setFeedback("Áudio atualizado com sucesso.");
      } else {
        const response = await api.post<AudioTrack>("/audio-tracks", payload);

        setTracks((current) => [response.data, ...current]);
        setFeedback("Áudio cadastrado com sucesso.");
      }

      setEditingTrackId("");
      setForm(emptyForm);
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível salvar o áudio."));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(trackId: string) {
    try {
      setPublishingId(trackId);
      setFeedback("");

      const response = await api.patch<AudioTrack>(
        `/audio-tracks/${trackId}/publish`,
      );

      setTracks((current) =>
        current.map((track) => (track.id === trackId ? response.data : track)),
      );

      setFeedback("Áudio publicado com sucesso.");
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível publicar o áudio."));
    } finally {
      setPublishingId("");
    }
  }

  async function handleArchive(trackId: string) {
    try {
      setArchivingId(trackId);
      setFeedback("");

      const response = await api.patch<AudioTrack>(
        `/audio-tracks/${trackId}/archive`,
      );

      setTracks((current) =>
        current.map((track) => (track.id === trackId ? response.data : track)),
      );

      setFeedback("Áudio arquivado com sucesso.");
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível arquivar o áudio."));
    } finally {
      setArchivingId("");
    }
  }

  async function handleDelete(track: AudioTrack) {
    const shouldDelete = window.confirm(
      `Tem certeza que deseja excluir "${track.title}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(track.id);
      setFeedback("");
      setError("");

      await api.delete(`/audio-tracks/${track.id}`);

      setTracks((current) => current.filter((item) => item.id !== track.id));

      if (editingTrackId === track.id) {
        handleCancelEdit();
      }

      setFeedback("Áudio excluído com sucesso.");
    } catch (err) {
      setFeedback(getApiErrorMessage(err, "Não foi possível excluir o áudio."));
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
              <Headphones className="h-3.5 w-3.5" />
              Administração
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              Áudios
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Cadastre guias, playbacks, aulas e demos para tocar na página de
              ouvir do EvCifras.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadSongs();
              loadTracks();
            }}
            disabled={loading || songsLoading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading || songsLoading ? "animate-spin" : ""
              }`}
            />
            Atualizar
          </button>
        </div>
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[460px_1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:p-6">
          <div>
            <p className="text-sm font-semibold text-violet-300">
              {editingTrack ? "Editando áudio" : "Novo áudio"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {editingTrack ? editingTrack.title : "Cadastrar áudio"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Envie o arquivo e vincule o áudio a uma cifra publicada.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-300">
                Upload de áudio *
              </label>

              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-400/30 bg-violet-500/10 px-4 py-6 text-center transition hover:bg-violet-500/15">
                {uploading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-violet-200" />
                ) : form.audioUrl ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                ) : (
                  <Upload className="h-7 w-7 text-violet-200" />
                )}

                <span className="mt-3 text-sm font-bold text-white">
                  {uploading
                    ? "Enviando..."
                    : form.audioUrl
                      ? "Arquivo enviado"
                      : "Clique para enviar"}
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  Máximo 30 MB. Formatos: MP3, WAV, M4A ou AAC.
                </span>

                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/x-m4a,audio/wav,audio/x-wav,.mp3,.m4a,.aac,.wav"
                  disabled={uploading}
                  onChange={handleUploadAudio}
                  className="hidden"
                />
              </label>

              {form.audioUrl && (
                <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                  Áudio pronto para salvar.
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Título *
              </label>
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Ex: Guia violão"
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Cifra / música *
              </label>
              <select
                value={form.songId}
                onChange={(event) => updateForm("songId", event.target.value)}
                disabled={songsLoading}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
              >
                <option value="">Selecione</option>
                {publishedSongs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.artist?.name || "Artista"} - {song.title}
                  </option>
                ))}
              </select>

              {publishedSongs.length === 0 && (
                <p className="mt-2 text-xs text-amber-200">
                  Nenhuma cifra publicada encontrada. Publique uma cifra antes
                  de cadastrar áudio.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Tipo
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    updateForm("type", event.target.value as AudioTrackType)
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
                >
                  <option value="ORIGINAL">Original</option>
                  <option value="PLAYBACK">Playback</option>
                  <option value="GUIDE">Guia</option>
                  <option value="LESSON">Aula</option>
                  <option value="DEMO">Demo</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300">
                  MIME type
                </label>
                <input
                  value={form.mimeType}
                  onChange={(event) =>
                    updateForm("mimeType", event.target.value)
                  }
                  placeholder="audio/mpeg"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Duração em segundos
                </label>
                <input
                  value={form.durationSec}
                  onChange={(event) =>
                    updateForm("durationSec", event.target.value)
                  }
                  placeholder="Ex: 215"
                  inputMode="numeric"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Tamanho em bytes
                </label>
                <input
                  value={form.sizeBytes}
                  onChange={(event) =>
                    updateForm("sizeBytes", event.target.value)
                  }
                  placeholder="Ex: 5242880"
                  inputMode="numeric"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                placeholder="Ex: Guia de violão para estudo"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingTrack ? (
                  <Edit3 className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingTrack ? "Salvar edição" : "Cadastrar"}
              </button>

              {editingTrack && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving || uploading}
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
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-violet-300">
                Lista de áudios
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {filteredTracks.length} encontrados
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_170px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar áudio..."
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/50 focus:bg-black/30"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
              >
                <option value="">Todos status</option>
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
              >
                <option value="">Todos tipos</option>
                <option value="ORIGINAL">Original</option>
                <option value="PLAYBACK">Playback</option>
                <option value="GUIDE">Guia</option>
                <option value="LESSON">Aula</option>
                <option value="DEMO">Demo</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <select
              value={songFilter}
              onChange={(event) => setSongFilter(event.target.value)}
              className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-violet-400/50 focus:bg-black/30"
            >
              <option value="">Todas músicas</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.artist?.name || "Artista"} - {song.title}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center justify-center rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando áudios...
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
              <FileAudio className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-bold text-white">
                Nenhum áudio encontrado
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Cadastre o primeiro áudio pelo formulário ao lado.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {filteredTracks.map((track) => {
                const isPublished = track.status === "PUBLISHED";

                return (
                  <div
                    key={track.id}
                    className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-white">
                            {track.title}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-violet-200">
                            {track.song?.artist?.name || "Artista"} -{" "}
                            {track.song?.title || "Música"}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {statusLabels[track.status]}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {typeLabels[track.type]}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {formatDuration(track.durationSec)}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              {formatBytes(track.sizeBytes)}
                            </span>
                          </div>

                          {!isPublished && (
                            <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs font-semibold leading-5 text-amber-100">
                              Este áudio ainda não está visível na página
                              /ouvir. Clique em Publicar para liberar.
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {isPublished && (
                            <Link
                              to={getListenUrl(track)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                            >
                              <Headphones className="h-4 w-4" />
                              Ouvir
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEdit(track)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                          >
                            <Edit3 className="h-4 w-4" />
                            Editar
                          </button>

                          {isPublished ? (
                            <button
                              type="button"
                              onClick={() => handleArchive(track.id)}
                              disabled={archivingId === track.id}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {archivingId === track.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                              Arquivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePublish(track.id)}
                              disabled={publishingId === track.id}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {publishingId === track.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Publicar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(track)}
                            disabled={deletingId === track.id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === track.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Excluir
                          </button>
                        </div>
                      </div>

                      {track.description && (
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="line-clamp-3 text-xs leading-6 text-slate-400">
                            {track.description}
                          </p>
                        </div>
                      )}
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

export default AdminAudioTracksPage;