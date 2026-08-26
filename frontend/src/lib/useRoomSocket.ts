import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket } from './socket';

interface JoinAck {
  ok: boolean;
  message?: string;
}

interface UseRoomSocketResult {
  /** The shared socket instance. */
  socket: Socket;
  /** True once the server has confirmed membership and joined the channel. */
  isJoined: boolean;
  /** Set if the server rejected the join (e.g. not a member of this room). */
  joinError: string | null;
}

/**
 * Connects to the shared socket, joins the given Memora room's channel
 * (the server re-verifies membership on every join — this hook never
 * assumes the join will succeed), and cleans up on unmount or when
 * roomId changes.
 *
 * This is foundation only: it does not attach any feature listeners
 * (media/AI/member-activity). Consumers add those with `socket.on(...)`
 * once `isJoined` is true.
 */
export function useRoomSocket(roomId: string | undefined): UseRoomSocketResult {
  // Lazy init: getSocket() returns the existing singleton (or creates it),
  // and the object reference never changes, so it never needs a setState
  // call inside the effect below.
  const [socket] = useState<Socket>(() => getSocket());
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Avoids attaching a second 'connect' listener if this effect re-runs
  // before the previous one's cleanup has fully unwound.
  const joinHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const instance = connectSocket();
    // Reset join state for the new roomId. Intentional: these are the
    // hook's own state and its defaults already match this shape, but
    // resetting is required when roomId changes mid-lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsJoined(false);
    setJoinError(null);

    const join = () => {
      instance.emit('room:join', { roomId }, (ack: JoinAck) => {
        setIsJoined(Boolean(ack?.ok));
        setJoinError(ack?.ok ? null : ack?.message || 'Could not join this room channel.');
      });
    };

    joinHandlerRef.current = join;

    // 'on' (not 'once'): a rejoin must also happen automatically after any
    // reconnect, since the server-side channel membership doesn't survive
    // a disconnect.
    instance.on('connect', join);
    if (instance.connected) join();

    return () => {
      instance.emit('room:leave', { roomId });
      if (joinHandlerRef.current) {
        instance.off('connect', joinHandlerRef.current);
      }
      setIsJoined(false);
      disconnectSocket();
    };
  }, [roomId]);

  return { socket, isJoined, joinError };
}