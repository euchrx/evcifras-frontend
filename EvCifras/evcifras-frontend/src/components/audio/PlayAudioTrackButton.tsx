import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, Pause, Play } from "lucide-react";
import {
  useAudioPlayer,
  type GlobalAudioTrack,
} from "../../contexts/AudioPlayerContext";

type PlayAudioTrackButtonProps = {
  track: GlobalAudioTrack;
  queue?: GlobalAudioTrack[];
  label?: string;
  className?: string;
};

function isIOSDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PlayAudioTrackButton({
  track,
  queue,
  label = "Tocar",
  className,
}: PlayAudioTrackButtonProps) {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useAudioPlayer();

  const isIOS = useMemo(() => isIOSDevice(), []);
  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;

  function handleClick() {
    if (isIOS && !isCurrent) {
      navigate(`/ouvir/${track.id}`);
      return;
    }

    if (isCurrent) {
      setIsPlaying(!isPlaying);
      return;
    }

    playTrack(track, queue);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ||
        "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-xs font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
      }
    >
      {isCurrentPlaying ? (
        <Pause className="h-4 w-4 fill-white" />
      ) : isCurrent ? (
        <Play className="h-4 w-4 fill-white" />
      ) : (
        <Headphones className="h-4 w-4" />
      )}

      {isIOS && !isCurrent
        ? "Abrir player"
        : isCurrentPlaying
          ? "Pausar"
          : label}
    </button>
  );
}

export default PlayAudioTrackButton;