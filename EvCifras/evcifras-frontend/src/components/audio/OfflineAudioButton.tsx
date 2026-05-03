import { useEffect, useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import {
  isAudioTrackOffline,
  removeOfflineAudioTrack,
  saveAudioTrackOffline,
  type OfflineAudioTrackInput,
} from "../../services/offlineAudio";

type OfflineAudioButtonProps = {
  track: OfflineAudioTrackInput;
  className?: string;
};

export function OfflineAudioButton({ track, className }: OfflineAudioButtonProps) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSaved() {
      const exists = await isAudioTrackOffline(track.id);

      if (mounted) {
        setSaved(exists);
      }
    }

    checkSaved();

    return () => {
      mounted = false;
    };
  }, [track.id]);

  async function handleToggleOffline() {
    try {
      setLoading(true);
      setFeedback("");

      if (saved) {
        await removeOfflineAudioTrack(track.id);
        setSaved(false);
        setFeedback("Removido do offline.");
        return;
      }

      await saveAudioTrackOffline(track);
      setSaved(true);
      setFeedback("Salvo para ouvir offline.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar offline.";

      setFeedback(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggleOffline}
        disabled={loading}
        className={
          className ||
          [
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
            saved
              ? "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
              : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
          ].join(" ")
        }
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <Trash2 className="h-4 w-4" />
        ) : (
          <Download className="h-4 w-4" />
        )}

        {saved ? "Remover offline" : "Salvar offline"}
      </button>

      {feedback && (
        <p className="mt-2 text-center text-xs font-semibold text-slate-400">
          {feedback}
        </p>
      )}
    </div>
  );
}

export default OfflineAudioButton;
