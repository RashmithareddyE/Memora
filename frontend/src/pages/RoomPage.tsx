import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Crown,
  Copy,
  Check,
  ArrowLeft,
  Images,
  Activity,
  MessageCircle,
  Trash2,
} from 'lucide-react';

import Button from '../components/ui/Button';
import MediaUpload from '../components/media/MediaUpload';
import MediaGallery from '../components/media/MediaGallery';
import { useAuth } from '../context/AuthContext';
import { apiClient, ApiError } from '../lib/apiClient';
import { useRoomSocket } from '../lib/useRoomSocket';
import type { Room } from '../types/room';
import type { Media } from '../types/media';

interface RoomResponse {
  room: Room;
}

interface MediaListResponse {
  media: Media[];
}

function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [activityFeed, setActivityFeed] = useState<string[]>([]);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['room', id],
    queryFn: () => apiClient.get<RoomResponse>(`/rooms/${id}`),
    enabled: Boolean(id),
    retry: false,
  });

  const leaveMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>(`/rooms/${id}/leave`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      navigate('/dashboard');
    },

    onError: (err) => {
      setLeaveError(
        err instanceof ApiError
          ? err.message
          : 'Could not leave the room.'
      );
    },
  });

  // Only the room owner can delete the room.
  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient.delete<{ message: string }>(`/rooms/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      navigate('/dashboard');
    },

    onError: (err) => {
      setLeaveError(
        err instanceof ApiError
          ? err.message
          : 'Could not delete the room.'
      );
    },
  });

  // Connects to the shared socket and joins this room's channel — the
  // server re-verifies membership on every join. Handles reconnect/rejoin
  // and leave-on-unmount internally; this component only needs `socket`
  // to attach its own feature listeners on top.
  const { socket } = useRoomSocket(id);

  // Real-time feature listeners, kept in a dedicated effect so they're
  // attached/removed exactly once per (id, socket) pair — navigating away
  // and back to the same room never accumulates duplicate listeners,
  // since the cleanup below always removes the exact same handler
  // references it registered.
  useEffect(() => {
    if (!id) return;

    const pushActivity = (message?: string) => {
      if (!message) return;
      setActivityFeed((prev) => [message, ...prev].slice(0, 10));
    };

    const handleMediaCreated = (
      payload: { media: Media; activity?: string }
    ) => {
      queryClient.setQueryData<MediaListResponse>(
        ['media', id],
        (old) => {
          if (!old) return old;

          // The uploader already has this item from their own HTTP response;
          // this check is what stops it from appearing twice for them.
          const alreadyPresent = old.media.some(
            (item) => item._id === payload.media._id
          );

          if (alreadyPresent) return old;

          return {
            media: [payload.media, ...old.media],
          };
        }
      );

      pushActivity(payload.activity);
    };

    const handleMediaDeleted = (
      payload: { mediaId: string }
    ) => {
      queryClient.setQueryData<MediaListResponse>(
        ['media', id],
        (old) => {
          if (!old) return old;

          return {
            media: old.media.filter(
              (item) => item._id !== payload.mediaId
            ),
          };
        }
      );
    };

    const handleAnalysisUpdate = (
      payload: { media: Media }
    ) => {
      queryClient.setQueryData<MediaListResponse>(
        ['media', id],
        (old) => {
          if (!old) return old;

          return {
            media: old.media.map(
              (item) =>
                item._id === payload.media._id
                  ? payload.media
                  : item
            ),
          };
        }
      );
    };

    const handleMemberJoined = (
      payload: { activity?: string }
    ) => {
      queryClient.invalidateQueries({
        queryKey: ['room', id],
      });

      pushActivity(payload.activity);
    };

    const handleMemberLeft = (
      payload: { activity?: string }
    ) => {
      queryClient.invalidateQueries({
        queryKey: ['room', id],
      });

      pushActivity(payload.activity);
    };

    socket.on('media:created', handleMediaCreated);
    socket.on('media:deleted', handleMediaDeleted);
    socket.on(
      'media:analysis-completed',
      handleAnalysisUpdate
    );
    socket.on(
      'media:analysis-failed',
      handleAnalysisUpdate
    );
    socket.on(
      'room:member-joined',
      handleMemberJoined
    );
    socket.on(
      'room:member-left',
      handleMemberLeft
    );

    return () => {
      socket.off('media:created', handleMediaCreated);
      socket.off('media:deleted', handleMediaDeleted);
      socket.off(
        'media:analysis-completed',
        handleAnalysisUpdate
      );
      socket.off(
        'media:analysis-failed',
        handleAnalysisUpdate
      );
      socket.off(
        'room:member-joined',
        handleMemberJoined
      );
      socket.off(
        'room:member-left',
        handleMemberLeft
      );
    };
  }, [id, socket, queryClient]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked in some environments;
      // the code is still visible on screen for manual copying.
    }
  };

  if (isLoading) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ink-600">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-500 border-t-transparent" />
          <span className="text-sm">Loading room…</span>
        </div>
      </div>
    );
  }

  if (error) {
    const status =
      error instanceof ApiError
        ? error.status
        : undefined;

    const message =
      status === 404
        ? "This room doesn't exist, or has been deleted."
        : status === 403
          ? "You're not a member of this room."
          : error instanceof ApiError
            ? error.message
            : 'Something went wrong while loading this room.';

    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-ink-900">
          {message}
        </p>

        <Link
          to="/dashboard"
          className="text-coral-600 hover:text-coral-700"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const room = data!.room;

  const isOwner =
    String(room.owner._id) === String(user?.id);

  return (
    <div className="container-page py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-6"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex w-fit items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </button>

        {/* Room header */}
        <div className="glass-panel flex flex-col gap-4 rounded-2xl px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">
              {room.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-600">
              <Crown
                size={16}
                className="text-coral-600"
              />

              <span>
                Owned by {room.owner.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-ink-900/10 bg-white/70 px-4 py-2">
              <span className="text-xs uppercase tracking-widest text-ink-600">
                Code
              </span>

              <span className="font-display font-semibold tracking-widest text-ink-900">
                {room.code}
              </span>

              <button
                onClick={() =>
                  handleCopyCode(room.code)
                }
                className="ml-1 text-ink-400 hover:text-coral-600"
                aria-label="Copy room code"
              >
                {codeCopied ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>

            {!isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLeaveError(null);
                  leaveMutation.mutate();
                }}
                disabled={leaveMutation.isPending}
                className="disabled:cursor-not-allowed disabled:opacity-70"
              >
                {leaveMutation.isPending
                  ? 'Leaving…'
                  : 'Leave room'}
              </Button>
            )}
          </div>
        </div>

        {leaveError && (
          <p
            className="rounded-xl bg-coral-500/10 px-4 py-2.5 text-sm text-coral-700"
            role="alert"
          >
            {leaveError}
          </p>
        )}

        {/* Owner-only room deletion */}
        {isOwner && (
          <div className="flex flex-col gap-3 rounded-2xl border border-coral-500/20 bg-coral-500/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-ink-900">
                Room management
              </p>

              <p className="mt-1 text-sm text-ink-600">
                As the room owner, you can permanently delete
                this room when you no longer need it.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const confirmed = window.confirm(
                  'Are you sure you want to delete this room? This action cannot be undone.'
                );

                if (confirmed) {
                  setLeaveError(null);
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="shrink-0 text-coral-700 hover:text-coral-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 size={15} />

              {deleteMutation.isPending
                ? 'Deleting…'
                : 'Delete room'}
            </Button>
          </div>
        )}

        {/* Members */}
        <div className="glass-panel rounded-2xl px-6 py-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">
            Members ({room.members.length})
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {room.members.map((member) => (
              <div
                key={member._id}
                className="flex items-center gap-3 rounded-xl border border-ink-900/10 bg-white/60 px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-500/15 font-display font-semibold text-coral-700">
                  {member.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">
                    {member.name}

                    {String(member._id) ===
                      String(room.owner._id) && (
                      <span className="ml-1.5 text-xs font-normal text-coral-600">
                        (owner)
                      </span>
                    )}
                  </p>

                  <p className="truncate text-xs text-ink-600">
                    {member.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Media: upload + gallery */}
        <div className="glass-panel rounded-2xl px-6 py-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-ink-900">
              <Images
                size={20}
                className="text-coral-600"
              />

              <h2 className="font-display text-lg font-semibold">
                Shared memories
              </h2>
            </div>

            <Link
              to={`/search?roomId=${room._id}`}
              className="text-sm text-coral-600 hover:text-coral-700"
            >
              Search this room →
            </Link>
          </div>

          <MediaUpload roomId={room._id} />

          <div className="mt-6">
            <MediaGallery
              roomId={room._id}
              currentUserId={user?.id}
              roomOwnerId={room.owner._id}
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Live activity, populated in real time via Socket.IO */}
          <div className="glass-panel rounded-2xl px-6 py-6">
            <div className="flex items-center gap-2 text-ink-900">
              <Activity
                size={20}
                className="text-coral-600"
              />

              <h2 className="font-display text-lg font-semibold">
                Activity
              </h2>
            </div>

            {activityFeed.length === 0 ? (
              <p className="mt-2 text-sm text-ink-600">
                Live updates will appear here while you're
                viewing this room.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {activityFeed.map(
                  (message, index) => (
                    <li
                      key={index}
                      className="text-sm text-ink-700"
                    >
                      {message}
                    </li>
                  )
                )}
              </ul>
            )}
          </div>

          {/* Placeholder section for a later phase */}
          <div className="glass-panel rounded-2xl px-6 py-6">
            <div className="flex items-center gap-2 text-ink-900">
              <MessageCircle
                size={20}
                className="text-coral-600"
              />

              <h2 className="font-display text-lg font-semibold">
                Comments &amp; reactions
              </h2>
            </div>

            <p className="mt-2 text-sm text-ink-600">
              Commenting and reactions on shared memories
              are planned for a later phase.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default RoomPage;