import { Trash2, Sparkles, RotateCcw, User, MapPin, CalendarDays } from 'lucide-react';
import type { Media } from '../../types/media';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
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
  isDeleting?: boolean;
  isAnalyzing?: boolean;
}

function MediaCard({ media, canDelete, onDelete, onAnalyze, isDeleting, isAnalyzing }: MediaCardProps) {
  const showAnalysis = media.aiStatus === 'completed' && media.aiAnalysis;
  const showAnalyzeButton =
    Boolean(onAnalyze) &&
    media.mediaType === 'image' &&
    (media.aiStatus === 'not_analyzed' || media.aiStatus === 'failed');
  const analyzing = isAnalyzing || media.aiStatus === 'pending';

  return (
    <div className="glass-panel flex flex-col overflow-hidden rounded-2xl">
      <a
        href={media.publicUrl}
        target="_blank"
        rel="noreferrer"
        className="block aspect-square w-full overflow-hidden bg-ink-900/5"
      >
        {media.mediaType === 'image' ? (
          <img
            src={media.publicUrl}
            alt={media.originalName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform hover:scale-105"
          />
        ) : (
          <video src={media.publicUrl} controls className="h-full w-full object-cover" />
        )}
      </a>

      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-ink-900" title={media.originalName}>
            {media.originalName}
          </p>
          {canDelete && onDelete && (
            <button
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
            <CalendarDays size={12} /> {formatDate(media.createdAt)}
          </span>
          <span>{formatFileSize(media.size)}</span>
        </div>

        {showAnalysis && media.aiAnalysis && (
          <div className="mt-1 flex flex-col gap-2 rounded-xl bg-coral-500/5 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-coral-700">
              <Sparkles size={13} /> AI insights
            </div>
            {media.aiAnalysis.description && (
              <p className="text-xs text-ink-700">{media.aiAnalysis.description}</p>
            )}
            {media.aiAnalysis.people.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-ink-600">
                <User size={12} className="shrink-0" /> {media.aiAnalysis.people.join(', ')}
              </p>
            )}
            {media.aiAnalysis.places.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-ink-600">
                <MapPin size={12} className="shrink-0" /> {media.aiAnalysis.places.join(', ')}
              </p>
            )}
            {media.aiAnalysis.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {media.aiAnalysis.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-coral-500/10 px-2 py-0.5 text-[11px] font-medium text-coral-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {media.aiStatus === 'failed' && media.aiError && (
          <p className="text-xs text-ink-500">AI analysis: {media.aiError}</p>
        )}

        {analyzing && (
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
            Analyzing with AI…
          </p>
        )}

        {showAnalyzeButton && !analyzing && (
          <button
            onClick={() => onAnalyze?.(media._id)}
            className="mt-1 flex w-fit items-center gap-1.5 text-xs font-medium text-coral-600 hover:text-coral-700"
          >
            {media.aiStatus === 'failed' ? (
              <>
                <RotateCcw size={12} /> Retry AI analysis
              </>
            ) : (
              <>
                <Sparkles size={12} /> Analyze with AI
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default MediaCard;