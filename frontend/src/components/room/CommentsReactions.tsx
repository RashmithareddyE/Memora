import { useEffect, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Loader2,
  Send,
  Trash2,
} from 'lucide-react';

import type { Media } from '../../types/media';
import { commentsApi } from '../../lib/api/comments';
import {
  REACTION_TYPES,
  reactionsApi,
  type ReactionType,
} from '../../lib/api/reactions';
import { ApiError } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

interface CommentsReactionsProps {
  roomId: string;
  media: Media[];
}

function CommentsReactions({
  roomId,
  media,
}: CommentsReactionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedMediaId, setSelectedMediaId] =
    useState<string>('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      media.length > 0 &&
      !media.some(
        (item) => item._id === selectedMediaId
      )
    ) {
      setSelectedMediaId(media[0]._id);
    }
  }, [media, selectedMediaId]);

  const commentsQuery = useQuery({
    queryKey: [
      'comments',
      roomId,
      selectedMediaId,
    ],
    queryFn: () =>
      commentsApi.list(selectedMediaId),
    enabled: Boolean(selectedMediaId),
  });

  const reactionsQuery = useQuery({
    queryKey: [
      'reactions',
      roomId,
      selectedMediaId,
    ],
    queryFn: () =>
      reactionsApi.get(selectedMediaId),
    enabled: Boolean(selectedMediaId),
  });

  const commentMutation = useMutation({
    mutationFn: (commentText: string) =>
      commentsApi.create(
        selectedMediaId,
        commentText
      ),

    onSuccess: () => {
      setText('');
      setError(null);

      queryClient.invalidateQueries({
        queryKey: [
          'comments',
          roomId,
          selectedMediaId,
        ],
      });
    },

    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not post comment.'
      );
    },
  });

  const reactionMutation = useMutation({
    mutationFn: (type: ReactionType) =>
      reactionsApi.set(
        selectedMediaId,
        type
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'reactions',
          roomId,
          selectedMediaId,
        ],
      });
    },

    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not save reaction.'
      );
    },
  });

  const removeReactionMutation =
    useMutation({
      mutationFn: () =>
        reactionsApi.remove(selectedMediaId),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            'reactions',
            roomId,
            selectedMediaId,
          ],
        });
      },
    });

  const handleSubmit = () => {
    const trimmed = text.trim();

    if (!trimmed || !selectedMediaId) {
      return;
    }

    commentMutation.mutate(trimmed);
  };

  const selectedMedia = media.find(
    (item) => item._id === selectedMediaId
  );

  if (media.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-ink-900/10 px-4 py-6 text-center">
        <p className="text-sm text-ink-600">
          Upload a memory to start commenting and reacting.
        </p>
      </div>
    );
  }

  const reactionState =
    reactionsQuery.data;

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label
          htmlFor="comment-memory"
          className="mb-1.5 block text-xs font-medium text-ink-600"
        >
          Choose a memory
        </label>

        <select
          id="comment-memory"
          value={selectedMediaId}
          onChange={(event) => {
            setSelectedMediaId(event.target.value);
            setError(null);
          }}
          className="w-full rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
        >
          {media.map((item) => (
            <option
              key={item._id}
              value={item._id}
            >
              {item.originalName}
            </option>
          ))}
        </select>
      </div>

      {selectedMedia && (
        <div className="overflow-hidden rounded-xl border border-ink-900/10 bg-white">
          <div className="aspect-video max-h-64 overflow-hidden bg-ink-900/5">
            {selectedMedia.mediaType === 'image' ? (
              <img
                src={selectedMedia.publicUrl}
                alt={selectedMedia.originalName}
                className="h-full w-full object-contain"
              />
            ) : (
              <video
                src={selectedMedia.publicUrl}
                controls
                className="h-full w-full object-contain"
              />
            )}
          </div>

          <div className="p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {REACTION_TYPES.map((type) => {
                const count =
                  reactionState?.counts?.[type] ?? 0;

                const isMine =
                  reactionState?.mine === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (isMine) {
                        removeReactionMutation.mutate();
                      } else {
                        reactionMutation.mutate(type);
                      }
                    }}
                    disabled={
                      reactionMutation.isPending ||
                      removeReactionMutation.isPending
                    }
                    className={`rounded-full border px-2.5 py-1 text-sm transition ${
                      isMine
                        ? 'border-coral-500 bg-coral-500/10'
                        : 'border-ink-900/10 bg-white hover:bg-ink-900/5'
                    }`}
                  >
                    {type}{' '}
                    {count > 0 && (
                      <span className="text-xs text-ink-500">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mb-3">
              <h3 className="text-sm font-semibold text-ink-900">
                Comments
              </h3>
            </div>

            {commentsQuery.isLoading ? (
              <div className="py-5 text-center text-sm text-ink-500">
                <Loader2
                  size={18}
                  className="mx-auto mb-2 animate-spin"
                />
                Loading comments…
              </div>
            ) : commentsQuery.isError ? (
              <p className="py-4 text-sm text-coral-700">
                Couldn't load comments.
              </p>
            ) : commentsQuery.data?.comments
                .length === 0 ? (
              <p className="py-4 text-sm text-ink-500">
                No comments yet. Be the first!
              </p>
            ) : (
              <div className="max-h-52 space-y-3 overflow-y-auto pr-1">
                {commentsQuery.data?.comments.map(
                  (comment) => {
                    const canDelete =
                      comment.user._id === user?.id;

                    return (
                      <div
                        key={comment._id}
                        className="rounded-xl bg-ink-900/5 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-ink-900">
                              {comment.user.name}
                            </p>

                            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-700">
                              {comment.text}
                            </p>
                          </div>

                          {canDelete && (
                            <button
                              type="button"
                              title="Delete comment"
                              className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-white hover:text-coral-600"
                              onClick={async () => {
                                try {
                                  await commentsApi.remove(
                                    comment._id
                                  );

                                  queryClient.invalidateQueries({
                                    queryKey: [
                                      'comments',
                                      roomId,
                                      selectedMediaId,
                                    ],
                                  });
                                } catch {
                                  setError(
                                    'Could not delete comment.'
                                  );
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <input
                value={text}
                onChange={(event) =>
                  setText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Write a comment…"
                maxLength={1000}
                className="min-w-0 flex-1 rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  !text.trim() ||
                  commentMutation.isPending
                }
                className="flex shrink-0 items-center justify-center rounded-xl bg-coral-500 px-3 text-white transition hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {commentMutation.isPending ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </div>

            {error && (
              <p className="mt-2 text-xs text-coral-700">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CommentsReactions;