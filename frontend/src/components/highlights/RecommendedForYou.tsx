import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import { highlightsApi } from '../../lib/api/highlights';
import { ApiError } from '../../lib/apiClient';

function RecommendedForYou() {
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => highlightsApi.recommendations(),
  });

  const recommendations = data?.recommendations ?? [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-8 text-center text-ink-600">
        Finding recommendations for you…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-8 text-center text-coral-700">
        {error instanceof ApiError ? error.message : 'Could not load recommendations.'}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-ink-900">
        <Compass size={20} className="text-coral-600" />
        <h2 className="font-display text-xl font-semibold">Recommended for You</h2>
      </div>

      <div className="flex flex-col gap-6">
        {recommendations.map((rec) => (
          <div key={rec.title} className="glass-panel rounded-2xl px-5 py-5">
            <h3 className="font-display font-semibold text-ink-900">{rec.title}</h3>
            <p className="text-sm text-ink-600">{rec.explanation}</p>
            <p className="mb-3 text-xs italic text-ink-400">
              Recommended because: {rec.reasonDetails.matchCount} matching{' '}
              {rec.reasonDetails.type === 'matching_tags'
                ? 'tags'
                : rec.reasonDetails.type === 'matching_event'
                ? 'events'
                : 'recent uploads'}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {rec.media.map((media) => (
                <button
                  key={media._id}
                  onClick={() => navigate(`/room/${media.room}`)}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-900/5"
                >
                  {media.mediaType === 'image' ? (
                    <img src={media.publicUrl} alt={media.originalName} className="h-full w-full object-cover" />
                  ) : (
                    <video src={media.publicUrl} className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendedForYou;