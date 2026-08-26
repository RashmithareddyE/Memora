import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Images } from 'lucide-react';
import { mediaApi } from '../../lib/api/media';
import { ApiError } from '../../lib/apiClient';
import MediaCard from './MediaCard';
import MediaViewer from './MediaViewer';

interface MediaGalleryProps {
  roomId: string;
  currentUserId?: string;
  roomOwnerId: string;
}

function MediaGallery({
  roomId,
  currentUserId,
  roomOwnerId,
}: MediaGalleryProps) {
  const queryClient = useQueryClient();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['media', roomId],
    queryFn: () => mediaApi.list(roomId),
  });

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.remove(mediaId),

    onMutate: (mediaId: string) => {
      setActionError(null);
      setDeletingId(mediaId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['media', roomId],
      });
    },

    onError: (err) => {
      setActionError(
        err instanceof ApiError
          ? err.message
          : 'Could not delete this item.'
      );
    },

    onSettled: () => {
      setDeletingId(null);
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.analyze(mediaId),

    onMutate: (mediaId: string) => {
      setActionError(null);
      setAnalyzingId(mediaId);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['media', roomId],
      });
    },

    onError: (err) => {
      setActionError(
        err instanceof ApiError
          ? err.message
          : 'Could not analyze this item.'
      );
    },

    onSettled: () => {
      setAnalyzingId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-ink-600">
        Loading memories…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-coral-700">
        Couldn't load this room's media. Try refreshing the page.
      </div>
    );
  }

  const items = data?.media ?? [];

  const openViewer = (mediaId: string) => {
    const index = items.findIndex(
      (media) => media._id === mediaId
    );

    if (index !== -1) {
      setViewerIndex(index);
    }
  };

  const closeViewer = () => {
    setViewerIndex(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p
          className="rounded-xl bg-coral-500/10 px-4 py-2.5 text-sm text-coral-700"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-ink-600">
          <Images
            size={28}
            className="mx-auto mb-3 text-ink-400"
          />

          <p>No memories here yet.</p>

          <p className="text-sm">
            Upload a photo or video above to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((media) => (
            <MediaCard
              key={media._id}
              media={media}
              canDelete={
                String(media.uploader?._id) ===
                  String(currentUserId) ||
                String(roomOwnerId) ===
                  String(currentUserId)
              }
              onDelete={(id) => deleteMutation.mutate(id)}
              onAnalyze={(id) => analyzeMutation.mutate(id)}
              onOpen={openViewer}
              isDeleting={deletingId === media._id}
              isAnalyzing={analyzingId === media._id}
            />
          ))}
        </div>
      )}

      {/* Full-screen gallery viewer */}
      {viewerIndex !== null && items.length > 0 && (
        <MediaViewer
          media={items}
          initialIndex={viewerIndex}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}

export default MediaGallery;