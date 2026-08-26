import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Images, Film, FolderOpen, HardDrive } from 'lucide-react';
import { analyticsApi } from '../lib/api/analytics';
import { ApiError } from '../lib/apiClient';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function formatDay(dayKey: string): string {
  return new Date(dayKey).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Images; label: string; value: string | number }) {
  return (
    <div className="glass-panel flex items-center gap-3 rounded-2xl px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-500/10 text-coral-600">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-bold text-ink-900">{value}</p>
        <p className="text-xs text-ink-600">{label}</p>
      </div>
    </div>
  );
}

function BarList({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-500">Nothing here yet.</p>;
  }

  const max = Math.max(...items.map((item) => item.count));

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-ink-600">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 font-medium text-ink-800">{item.count}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/5">
            <div
              className="h-full rounded-full bg-coral-500"
              style={{ width: `${max > 0 ? (item.count / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview(),
    staleTime: 60_000,
  });

  const overview = data?.overview;

  return (
    <div className="container-page py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-6"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Analytics</h1>
          <p className="mt-1 text-sm text-ink-600">
            Real stats from every room you're a member of.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-ink-600">
            Loading your analytics...
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-coral-700">
            {error instanceof ApiError ? error.message : 'Unable to load analytics.'}
          </div>
        )}

        {overview && overview.totalMemories === 0 && (
          <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-ink-600">
            No memories yet. Upload some photos or videos to see your analytics here.
          </div>
        )}

        {overview && overview.totalMemories > 0 && (
          <>
            {/* Memory Overview */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard icon={Images} label="Total memories" value={overview.totalMemories} />
              <StatCard
                icon={Film}
                label="Photos / Videos"
                value={`${overview.photosCount} / ${overview.videosCount}`}
              />
              <StatCard icon={FolderOpen} label="Rooms" value={overview.totalRooms} />
              <StatCard icon={HardDrive} label="Storage used" value={formatBytes(overview.totalStorageBytes)} />
            </div>

            {/* AI Analysis Status */}
            <div className="glass-panel rounded-2xl px-6 py-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">🤖 AI Analysis</h2>
              <BarList
                items={[
                  { label: 'Completed', count: overview.aiStatus.completed },
                  { label: 'Pending', count: overview.aiStatus.pending },
                  { label: 'Failed', count: overview.aiStatus.failed },
                  { label: 'Not analyzed', count: overview.aiStatus.notAnalyzed },
                ]}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="glass-panel rounded-2xl px-6 py-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">📈 Memory Growth</h2>
                <BarList
                  items={overview.uploadsOverTime.map((entry) => ({
                    label: formatMonth(entry.month),
                    count: entry.count,
                  }))}
                />
              </div>

              <div className="glass-panel rounded-2xl px-6 py-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Most active days</h2>
                <BarList
                  items={overview.mostActiveDays.map((entry) => ({
                    label: formatDay(entry.day),
                    count: entry.count,
                  }))}
                />
              </div>

              <div className="glass-panel rounded-2xl px-6 py-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">🏷️ Top Tags</h2>
                <BarList items={overview.topTags.map((entry) => ({ label: entry.tag, count: entry.count }))} />
              </div>

              <div className="glass-panel rounded-2xl px-6 py-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">🎉 Top Events</h2>
                <BarList items={overview.topEvents.map((entry) => ({ label: entry.event, count: entry.count }))} />
              </div>

              <div className="glass-panel rounded-2xl px-6 py-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">📍 Top Places</h2>
                <BarList items={overview.topPlaces.map((entry) => ({ label: entry.place, count: entry.count }))} />
              </div>

              <div className="glass-panel rounded-2xl px-6 py-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Top Objects</h2>
                <BarList
                  items={overview.topObjects.map((entry) => ({ label: entry.object, count: entry.count }))}
                />
              </div>
            </div>

            {/* Room Statistics */}
            {overview.roomStats && overview.roomStats.length > 0 && (
              <div className="glass-panel rounded-2xl px-6 py-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">🏠 Room Statistics</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {overview.roomStats.map((room) => (
                    <button
                      key={room.roomId}
                      onClick={() => navigate(`/room/${room.roomId}`)}
                      className="flex flex-col gap-1 rounded-xl border border-ink-900/10 bg-white/60 px-4 py-3 text-left hover:border-coral-500"
                    >
                      <p className="truncate font-medium text-ink-900">{room.roomName}</p>
                      <p className="text-xs text-ink-600">
                        {room.memberCount} member{room.memberCount === 1 ? '' : 's'} · {room.memoryCount}{' '}
                        {room.memoryCount === 1 ? 'memory' : 'memories'}
                      </p>
                      <p className="text-xs text-ink-400">
                        {room.mostRecentUpload
                          ? `Last upload ${new Date(room.mostRecentUpload).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}`
                          : 'No uploads yet'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

export default AnalyticsPage;