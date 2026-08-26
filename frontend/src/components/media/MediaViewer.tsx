import { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  User,
  MapPin,
  CalendarDays,
  FileText,
} from 'lucide-react';
import type { Media } from '../../types/media';

interface MediaViewerProps {
  media: Media[];
  initialIndex: number;
  onClose: () => void;
}

function getDownloadUrl(publicUrl: string): string {
  if (publicUrl.includes('/upload/')) {
    return publicUrl.replace('/upload/', '/upload/fl_attachment/');
  }

  return publicUrl;
}

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

function MediaViewer({
  media,
  initialIndex,
  onClose,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const currentMedia = media[currentIndex];

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < media.length - 1;

  const goPrevious = () => {
    if (hasPrevious) {
      setCurrentIndex((index) => index - 1);
    }
  };

  const goNext = () => {
    if (hasNext) {
      setCurrentIndex((index) => index + 1);
    }
  };

  // Keyboard navigation.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        goPrevious();
      } else if (event.key === 'ArrowRight') {
        goNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, currentIndex]);
   <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"></div>

  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    setTouchStartX(event.touches[0].clientX);
  };

  const handleTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    if (touchStartX === null) {
      return;
    }

    const touchEndX = event.changedTouches[0].clientX;
    const difference = touchStartX - touchEndX;

    if (Math.abs(difference) > 60) {
      if (difference > 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    setTouchStartX(null);
  };

  if (!currentMedia) {
    return null;
  }

  const downloadUrl = getDownloadUrl(currentMedia.publicUrl);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Memory viewer"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {currentMedia.originalName}
          </p>

          <p className="text-xs text-white/60">
            {currentIndex + 1} / {media.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Download */}
          <a
            href={downloadUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/20"
            aria-label="Download this memory"
          >
            <Download size={18} />

            <span className="hidden sm:inline">
              Download
            </span>
          </a>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close viewer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable viewer content */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Image / video area */}
        <div
          className="relative flex min-h-[60vh] items-center justify-center px-4 py-6 sm:min-h-[70vh] sm:px-16"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Previous */}
          <button
            type="button"
            onClick={goPrevious}
            disabled={!hasPrevious}
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-20 sm:left-5"
            aria-label="Previous memory"
          >
            <ChevronLeft size={26} />
          </button>

          {/* Media */}
          {currentMedia.mediaType === 'image' ? (
            <img
              src={currentMedia.publicUrl}
              alt={currentMedia.originalName}
              className="max-h-[70vh] max-w-full select-none object-contain sm:max-h-[75vh]"
              draggable={false}
            />
          ) : (
            <video
              key={currentMedia._id}
              src={currentMedia.publicUrl}
              controls
              className="max-h-[70vh] max-w-full sm:max-h-[75vh]"
            />
          )}

          {/* Next */}
          <button
            type="button"
            onClick={goNext}
            disabled={!hasNext}
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-20 sm:right-5"
            aria-label="Next memory"
          >
            <ChevronRight size={26} />
          </button>
        </div>

        {/* Information */}
        <div className="border-t border-white/10 bg-black/80 px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Basic information */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/60">
              <span>
                {currentMedia.uploader.name}
              </span>

              <span className="flex items-center gap-1">
                <CalendarDays size={13} />
                {formatDate(currentMedia.createdAt)}
              </span>

              <span>
                {formatFileSize(currentMedia.size)}
              </span>
            </div>

            {/* AI insights */}
            {currentMedia.aiStatus === 'completed' &&
            currentMedia.aiAnalysis ? (
              <div className="mt-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles size={16} />
                  AI insights
                </div>

                {/* Description */}
                {currentMedia.aiAnalysis.description && (
                  <div className="mb-5">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/50">
                      <FileText size={13} />
                      Description
                    </p>

                    <p className="text-sm leading-relaxed text-white/85">
                      {currentMedia.aiAnalysis.description}
                    </p>
                  </div>
                )}

                {/* People */}
                {currentMedia.aiAnalysis.people.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/50">
                      <User size={13} />
                      People
                    </p>

                    <p className="text-sm text-white/85">
                      {currentMedia.aiAnalysis.people.join(', ')}
                    </p>
                  </div>
                )}

                {/* Places */}
                {currentMedia.aiAnalysis.places.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/50">
                      <MapPin size={13} />
                      Places
                    </p>

                    <p className="text-sm text-white/85">
                      {currentMedia.aiAnalysis.places.join(', ')}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {currentMedia.aiAnalysis.tags.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-white/50">
                      Tags
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {currentMedia.aiAnalysis.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : currentMedia.aiStatus === 'pending' ? (
              <p className="mt-5 text-sm text-white/60">
                AI analysis is still processing…
              </p>
            ) : currentMedia.aiStatus === 'failed' ? (
              <p className="mt-5 text-sm text-white/60">
                AI analysis is unavailable for this memory.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile swipe hint */}
      <div className="shrink-0 border-t border-white/5 bg-black/95 pb-2 pt-1 text-center text-[11px] text-white/40 sm:hidden">
        Swipe left or right to browse memories
      </div>
    </div>
  );
}

export default MediaViewer;