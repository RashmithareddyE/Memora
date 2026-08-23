import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import Button from '../components/ui/Button';
import MediaCard from '../components/media/MediaCard';
import { searchApi } from '../lib/api/search';
import { apiClient, ApiError } from '../lib/apiClient';
import type { Room } from '../types/room';

interface RoomsResponse {
  rooms: Room[];
}

const EXAMPLE_QUERIES = [
  'photos of me smiling',
  'birthday photos',
  'beach memories',
  'photos with friends',
  'sunset photos',
];

function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialRoomId = searchParams.get('roomId') || '';

  const [inputValue, setInputValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState(initialRoomId);

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.get<RoomsResponse>('/rooms'),
  });

  const {
    data,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['search', submittedQuery, roomFilter],
    queryFn: () => searchApi.search({ query: submittedQuery, roomId: roomFilter || undefined }),
    enabled: submittedQuery !== '',
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(inputValue.trim());
  };

  const handleExampleClick = (example: string) => {
    setInputValue(example);
    setSubmittedQuery(example);
  };

  const hasSearched = submittedQuery !== '';
  const results = data?.results ?? [];
  const rooms = roomsData?.rooms ?? [];

  return (
    <div className="container-page py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-6"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Search your memories</h1>
          <p className="mt-1 text-sm text-ink-600">
            Try natural language, like "beach memories" or "photos with friends".
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel flex flex-col gap-3 rounded-2xl px-6 py-5 sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink-900/10 bg-white/70 px-4 py-2.5">
            <SearchIcon size={18} className="text-ink-400" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What are you looking for?"
              className="w-full bg-transparent text-ink-900 outline-none"
            />
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

          <Button type="submit" variant="primary" size="md" className="shrink-0">
            Search
          </Button>
        </form>

        {!hasSearched && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="rounded-full border border-ink-900/10 bg-white/60 px-3 py-1.5 text-xs text-ink-600 hover:border-coral-500 hover:text-coral-700"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        {hasSearched && (
          <div>
            {isFetching && (
              <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-ink-600">
                Searching your memories…
              </div>
            )}

            {isError && (
              <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-coral-700">
                {error instanceof ApiError ? error.message : 'Something went wrong while searching. Try again.'}
              </div>
            )}

            {!isFetching && !isError && results.length === 0 && (
              <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-10 text-center text-ink-600">
                <p>No memories matched "{submittedQuery}".</p>
                <p className="text-sm">Try a different phrase, or fewer words.</p>
              </div>
            )}

            {!isFetching && !isError && results.length > 0 && (
              <>
                <p className="mb-4 text-sm text-ink-600">
                  {data?.total} {data?.total === 1 ? 'result' : 'results'} for "{data?.query}"
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {results.map(({ media }) => (
                    <MediaCard key={media._id} media={media} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default SearchPage;