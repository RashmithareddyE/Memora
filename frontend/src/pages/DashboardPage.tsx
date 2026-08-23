import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, LogIn, Users, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import MemoryHighlights from '../components/highlights/MemoryHighlights';
import RecommendedForYou from '../components/highlights/RecommendedForYou';
import { useAuth } from '../context/AuthContext';
import { apiClient, ApiError } from '../lib/apiClient';
import type { Room } from '../types/room';

interface RoomsResponse {
  rooms: Room[];
}

interface RoomResponse {
  room: Room;
}

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const {
    data,
    isLoading: isLoadingRooms,
    isError: isRoomsError,
  } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.get<RoomsResponse>('/rooms'),
  });

  const createRoomMutation = useMutation({
    mutationFn: (name: string) => apiClient.post<RoomResponse>('/rooms', { name }),
    onSuccess: (result) => {
      setRoomName('');
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      navigate(`/room/${result.room._id}`);
    },
    onError: (err) => {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create the room.');
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: (code: string) => apiClient.post<RoomResponse>('/rooms/join', { code }),
    onSuccess: (result) => {
      setRoomCode('');
      setJoinError(null);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      navigate(`/room/${result.room._id}`);
    },
    onError: (err) => {
      setJoinError(err instanceof ApiError ? err.message : 'Could not join the room.');
    },
  });

  const handleCreateRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomName.trim()) return;
    createRoomMutation.mutate(roomName.trim());
  };

  const handleJoinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomCode.trim()) return;
    joinRoomMutation.mutate(roomCode.trim());
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const rooms = data?.rooms ?? [];

  return (
    <div className="container-page py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-8"
      >
        {/* Account header */}
        <div className="glass-panel flex flex-col gap-4 rounded-2xl px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-600">Welcome back,</p>
            <h1 className="text-2xl font-bold text-ink-900">{user?.name}</h1>
            <p className="text-sm text-ink-600">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="self-start sm:self-center">
            Logout
          </Button>
        </div>

        {/* Create / Join room */}
        <div className="grid gap-6 md:grid-cols-2">
          <form
            onSubmit={handleCreateRoom}
            className="glass-panel flex flex-col gap-3 rounded-2xl px-6 py-6"
          >
            <div className="flex items-center gap-2 text-ink-900">
              <FolderPlus size={20} className="text-coral-600" />
              <h2 className="font-display text-lg font-semibold">Create a room</h2>
            </div>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Goa Trip 2026"
              required
              className="rounded-xl border border-ink-900/10 bg-white/70 px-4 py-2.5 text-ink-900 outline-none transition-colors focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
            />
            {createError && (
              <p className="text-sm text-coral-700" role="alert">
                {createError}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createRoomMutation.isPending}
              className="self-start disabled:cursor-not-allowed disabled:opacity-70"
            >
              {createRoomMutation.isPending ? 'Creating…' : 'Create room'}
            </Button>
          </form>

          <form
            onSubmit={handleJoinRoom}
            className="glass-panel flex flex-col gap-3 rounded-2xl px-6 py-6"
          >
            <div className="flex items-center gap-2 text-ink-900">
              <LogIn size={20} className="text-coral-600" />
              <h2 className="font-display text-lg font-semibold">Join a room</h2>
            </div>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              required
              className="rounded-xl border border-ink-900/10 bg-white/70 px-4 py-2.5 uppercase tracking-widest text-ink-900 outline-none transition-colors focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
            />
            {joinError && (
              <p className="text-sm text-coral-700" role="alert">
                {joinError}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={joinRoomMutation.isPending}
              className="self-start disabled:cursor-not-allowed disabled:opacity-70"
            >
              {joinRoomMutation.isPending ? 'Joining…' : 'Join room'}
            </Button>
          </form>
        </div>

        {/* Rooms list */}
        <div>
          <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">Your rooms</h2>

          {isLoadingRooms && (
            <div className="glass-panel rounded-2xl px-6 py-8 text-center text-ink-600">
              Loading your rooms…
            </div>
          )}

          {isRoomsError && (
            <div className="glass-panel rounded-2xl px-6 py-8 text-center text-coral-700">
              Couldn't load your rooms. Try refreshing the page.
            </div>
          )}

          {!isLoadingRooms && !isRoomsError && rooms.length === 0 && (
            <div className="glass-panel rounded-2xl px-6 py-10 text-center text-ink-600">
              <Users size={28} className="mx-auto mb-3 text-ink-400" />
              <p>You're not part of any rooms yet.</p>
              <p className="text-sm">Create one above, or join with a code from a friend.</p>
            </div>
          )}

          {!isLoadingRooms && !isRoomsError && rooms.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => navigate(`/room/${room._id}`)}
                  className="glass-panel group flex flex-col gap-2 rounded-2xl px-5 py-5 text-left transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-display font-semibold text-ink-900">{room.name}</h3>
                    <ArrowRight
                      size={18}
                      className="text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-coral-600"
                    />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-widest text-coral-600">
                    {room.code}
                  </p>
                  <p className="text-sm text-ink-600">
                    {room.members.length} member{room.members.length === 1 ? '' : 's'}
                  </p>
                  <p className="text-xs text-ink-400">
                    {room.owner._id === user?.id ? 'You own this room' : `Owned by ${room.owner.name}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <MemoryHighlights />
        <RecommendedForYou />
      </motion.div>
    </div>
  );
}

export default DashboardPage;