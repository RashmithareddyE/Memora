import {
  Trash2,
  Sparkles,
  RotateCcw,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import type { Media } from '../../types/media';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface MediaCardProps {
  media: Media;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
  onAnalyze?: (id: string) => void;
  onOpen?: (id: string) => void;
  isDeleting?: boolean;
  isAnalyzing?: boolean;
}

function MediaCard({
  media,
  canDelete,
  onDelete,
  onAnalyze,
  onOpen,
  isDeleting,
  isAnalyzing,
}: MediaCardProps) {
  const showAnalyzeButton =
    Boolean(onAnalyze) &&
    media.mediaType === 'image' &&
    (media.aiStatus === 'not_analyzed' || media.aiStatus === 'failed');

  const analyzing =
    isAnalyzing || media.aiStatus === 'pending';

  const handleOpen = () => {
    onOpen?.(media._id);
  };

  return (
    <div className="glass-panel flex flex-col overflow-hidden rounded-2xl">
      {/* Photo */}
      <button
        type="button"
        onClick={handleOpen}
        className="group relative block aspect-square w-full overflow-hidden bg-ink-900/5 text-left"
        aria-label={`Open ${media.originalName}`}
      >
        {media.mediaType === 'image' ? (
          <img
            src={media.publicUrl}
            alt={media.originalName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <video
            src={media.publicUrl}
            muted
            preload="metadata"
            className="h-full w-full object-cover"
          />
        )}

        {/* Open indicator */}
        <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ChevronRight size={18} />
        </span>
      </button>

      {/* Compact information */}
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="min-w-0 truncate text-left text-sm font-medium text-ink-900 hover:text-coral-600"
            title={media.originalName}
          >
            {media.originalName}
          </button>

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(media._id)}
              disabled={isDeleting}
              aria-label="Delete media"
              className="shrink-0 text-ink-400 hover:text-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span>{media.uploader.name}</span>

          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {formatDate(media.createdAt)}
          </span>

          <span>{formatFileSize(media.size)}</span>
        </div>

        {/* Small AI indicator instead of the full AI content */}
        {media.aiStatus === 'completed' && media.aiAnalysis && (
          <button
            type="button"
            onClick={handleOpen}
            className="mt-1 flex w-fit items-center gap-1.5 text-xs font-medium text-coral-600 hover:text-coral-700"
          >
            <Sparkles size={13} />
            AI insights
            <ChevronRight size={12} />
          </button>
        )}

        {media.aiStatus === 'failed' && media.aiError && (
          <p className="text-xs text-ink-500">
            AI analysis: {media.aiError}
          </p>
        )}

        {analyzing && (
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
            Analyzing with AI…
          </p>
        )}

        {showAnalyzeButton && !analyzing && (
          <button
            type="button"
            onClick={() => onAnalyze?.(media._id)}
            className="mt-1 flex w-fit items-center gap-1.5 text-xs font-medium text-coral-600 hover:text-coral-700"
          >
            {media.aiStatus === 'failed' ? (
              <>
                <RotateCcw size={12} />
                Retry AI analysis
              </>
            ) : (
              <>
                <Sparkles size={12} />
                Analyze with AI
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default MediaCard;