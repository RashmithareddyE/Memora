import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, LayoutGrid, Copy } from 'lucide-react';
import MediaCard from '../components/media/MediaCard';
import { organizationApi } from '../lib/api/organization';
import { apiClient, ApiError } from '../lib/apiClient';
import type { Room } from '../types/room';

interface RoomsResponse {
  rooms: Room[];
}

type Tab = 'events' | 'timeline' | 'duplicates';

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'events', label: 'Events', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'duplicates', label: 'Duplicates', icon: Copy },
];

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-ink-600">
      {message}
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-coral-700">
      {error instanceof ApiError ? error.message : 'Something went wrong. Try again.'}
    </div>
  );
}

function OrganizePage() {
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [roomFilter, setRoomFilter] = useState('');

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.get<RoomsResponse>('/rooms'),
  });
  const rooms = roomsData?.rooms ?? [];

  const eventsQuery = useQuery({
    queryKey: ['organization', 'events', roomFilter],
    queryFn: () => organizationApi.events(roomFilter || undefined),
    enabled: activeTab === 'events',
  });

  const timelineQuery = useQuery({
    queryKey: ['organization', 'timeline', roomFilter],
    queryFn: () => organizationApi.timeline(roomFilter || undefined),
    enabled: activeTab === 'timeline',
  });

  const duplicatesQuery = useQuery({
    queryKey: ['organization', 'duplicates', roomFilter],
    queryFn: () => organizationApi.duplicates(roomFilter || undefined),
    enabled: activeTab === 'duplicates',
  });

  return (
    <div className="container-page py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Organize memories</h1>
            <p className="mt-1 text-sm text-ink-600">
              Automatically grouped from your memories' AI tags and upload dates.
            </p>
          </div>

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="rounded-xl border border-ink-900/10 bg-white/70 px-3 py-2.5 text-sm text-ink-700 outline-none focus:border-coral-500"
          >
            <option value="">All my rooms</option>
            {rooms.map((room) => (
              <option key={room._id} value={room._id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        <div className="glass-panel flex w-fit gap-1 rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-coral-500 text-white' : 'text-ink-600 hover:bg-ink-900/5'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'events' && (
          <div>
            {eventsQuery.isLoading && <EmptyState message="Grouping your memories into events…" />}
            {eventsQuery.isError && <ErrorState error={eventsQuery.error} />}
            {eventsQuery.data && eventsQuery.data.events.length === 0 && (
              <EmptyState message="No memories to group yet. Upload some photos first." />
            )}
            {eventsQuery.data && eventsQuery.data.events.length > 0 && (
              <div className="flex flex-col gap-8">
                {eventsQuery.data.events.map((group) => (
                  <div key={group.event}>
                    <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">
                      {group.event} <span className="text-sm font-normal text-ink-500">({group.count})</span>
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {group.media.map((media) => (
                        <MediaCard key={media._id} media={media} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div>
            {timelineQuery.isLoading && <EmptyState message="Building your timeline…" />}
            {timelineQuery.isError && <ErrorState error={timelineQuery.error} />}
            {timelineQuery.data && timelineQuery.data.timeline.length === 0 && (
              <EmptyState message="No memories yet. Upload some photos first." />
            )}
            {timelineQuery.data && timelineQuery.data.timeline.length > 0 && (
              <div className="flex flex-col gap-10">
                {timelineQuery.data.timeline.map((yearGroup) => (
                  <div key={yearGroup.year}>
                    <h2 className="mb-4 font-display text-xl font-bold text-ink-900">{yearGroup.year}</h2>
                    <div className="flex flex-col gap-6 border-l-2 border-coral-500/20 pl-5">
                      {yearGroup.months.map((monthGroup) => (
                        <div key={monthGroup.month}>
                          <h3 className="mb-3 font-display text-base font-semibold text-ink-800">
                            {monthGroup.month}{' '}
                            <span className="text-sm font-normal text-ink-500">({monthGroup.count})</span>
                          </h3>
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {monthGroup.media.map((media) => (
                              <MediaCard key={media._id} media={media} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'duplicates' && (
          <div>
            {duplicatesQuery.isLoading && <EmptyState message="Checking your photos for duplicates…" />}
            {duplicatesQuery.isError && <ErrorState error={duplicatesQuery.error} />}
            {duplicatesQuery.data && duplicatesQuery.data.duplicates.length === 0 && (
              <EmptyState message="No duplicate or near-duplicate photos found." />
            )}
            {duplicatesQuery.data && duplicatesQuery.data.duplicates.length > 0 && (
              <div className="flex flex-col gap-8">
                <p className="text-sm text-ink-600">
                  These look like duplicates or near-duplicates. Nothing is deleted automatically — review each
                  group and delete extras yourself from the room gallery if you want to.
                </p>
                {duplicatesQuery.data.duplicates.map((group, index) => (
                  <div key={index}>
                    <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">
                      Possible duplicates <span className="text-sm font-normal text-ink-500">({group.count})</span>
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {group.media.map((media) => (
                        <MediaCard key={media._id} media={media} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default OrganizePage;