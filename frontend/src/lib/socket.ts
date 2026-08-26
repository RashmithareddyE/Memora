import { io, type Socket } from 'socket.io-client';
import { AUTH_TOKEN_STORAGE_KEY } from './apiClient';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Socket.IO connects to the server root, not the REST /api prefix.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

function createSocket(): Socket {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  const instance = io(SOCKET_URL, {
    auth: { token },
    autoConnect: false,
    // Built-in reconnection: retries with backoff rather than hammering
    // the server or looping forever.
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Diagnostics only — never logs the token or any auth payload.
  instance.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });
  instance.io.on('reconnect_attempt', (attempt) => {
    console.warn(`Socket reconnect attempt ${attempt}...`);
  });
  instance.io.on('reconnect_failed', () => {
    console.warn('Socket reconnect failed after max attempts.');
  });

  return instance;
}

/** Returns the shared socket instance, creating it (disconnected) if needed. */
export function getSocket(): Socket {
  if (!socket) {
    socket = createSocket();
  }
  return socket;
}

/** Connects the shared socket, refreshing the auth token first in case it changed. */
export function connectSocket(): Socket {
  const instance = getSocket();
  if (!instance.connected) {
    instance.auth = { token: localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) };
    instance.connect();
  }
  return instance;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}