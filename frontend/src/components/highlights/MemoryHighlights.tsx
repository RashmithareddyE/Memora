import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { highlightsApi } from '../../lib/api/highlights';
import { ApiError } from '../../lib/apiClient';

function MemoryHighlights() {
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['highlights'],
    queryFn: () => highlightsApi.highlights(),
  });

  const highlights = data?.highlights ?? [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-8 text-center text-ink-600">
        Building your highlights…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-8 text-center text-coral-700">
        {error instanceof ApiError ? error.message : 'Could not load highlights.'}
      </div>
    );
  }

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-ink-900">
        <Sparkles size={20} className="text-coral-600" />
        <h2 className="font-display text-xl font-semibold">Memory Highlights</h2>
      </div>

      <div className="flex flex-col gap-6">
        {highlights.map((highlight) => (
          <div key={highlight.title} className="glass-panel rounded-2xl px-5 py-5">
            <h3 className="font-display font-semibold text-ink-900">{highlight.title}</h3>
            <p className="mb-3 text-sm text-ink-600">{highlight.reason}</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {highlight.media.map((media) => (
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

export default MemoryHighlights;