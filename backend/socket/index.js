const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Room = require('../models/Room');

let io = null;

const isRoomMember = (room, userId) => room.members.some((memberId) => memberId.toString() === userId);

/**
 * Sets up the Socket.IO server on top of the existing HTTP server.
 * Foundation (Prompt 1): authentication, room-membership authorization,
 * join/leave, and connection lifecycle. Feature emit helpers (Prompt 2)
 * are exported below and called from the relevant controllers/services.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // Matches the same origin the REST API's CORS should eventually be
      // pinned to. Defaults to '*' only when FRONTEND_URL isn't set, so
      // local development keeps working without extra setup.
      origin: process.env.FRONTEND_URL || '*',
    },
  });

  // Every socket connection is authenticated with the same JWT used for
  // REST requests — sockets never get a separate, weaker auth path.
  // Rejected connections never reach io.on('connection', ...) at all.
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Not authorized, no token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Matches the shape auth.middleware.js exposes on REST requests
      // (req.userId), so the rest of the codebase can rely on the same
      // identifier regardless of transport.
      socket.userId = decoded.id;
      return next();
    } catch {
      return next(new Error('Not authorized, invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // A user must be verified as an actual member of a room, fresh on every
    // join request, before they can join that room's channel. The
    // client-supplied roomId is never trusted on its own — membership is
    // re-checked against MongoDB every time, exactly like the REST API.
    socket.on('room:join', async ({ roomId } = {}, callback) => {
      try {
        if (!roomId) {
          if (typeof callback === 'function') callback({ ok: false, message: 'roomId is required' });
          return;
        }

        const room = await Room.findById(roomId);

        if (!room || !isRoomMember(room, socket.userId)) {
          // Deliberately generic: never confirms or denies whether the room
          // exists, only whether this connection is allowed in.
          if (typeof callback === 'function') {
            callback({ ok: false, message: 'You are not authorized to join this room channel' });
          }
          return;
        }

        socket.join(roomId);
        if (typeof callback === 'function') callback({ ok: true });
      } catch (error) {
        console.error('Socket room:join error:', error);
        if (typeof callback === 'function') {
          callback({ ok: false, message: 'Something went wrong joining the room channel' });
        }
      }
    });

    socket.on('room:leave', ({ roomId } = {}) => {
      if (roomId) socket.leave(roomId);
    });

    socket.on('disconnect', (reason) => {
      // No sensitive data logged — just enough to debug connection issues.
      console.log(`Socket disconnected (${reason}): user ${socket.userId}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

/**
 * Strips internal-only fields before anything goes out over a socket.
 * storageKey is the Cloudinary object key and must never reach the client.
 */
function sanitizeMediaForClient(media) {
  const plain = typeof media.toObject === 'function' ? media.toObject() : { ...media };
  delete plain.storageKey;
  return plain;
}

function emitMediaCreated(media) {
  if (!io || !media) return;
  const safeMedia = sanitizeMediaForClient(media);
  io.to(safeMedia.room.toString()).emit('media:created', {
    media: safeMedia,
    activity: `${safeMedia.uploader?.name || 'Someone'} uploaded a ${safeMedia.mediaType}.`,
  });
}

function emitMediaDeleted(roomId, mediaId) {
  if (!io || !roomId) return;
  io.to(roomId.toString()).emit('media:deleted', {
    mediaId: mediaId?.toString(),
    roomId: roomId.toString(),
  });
}

function emitMediaAnalysisUpdate(media) {
  if (!io || !media) return;
  const safeMedia = sanitizeMediaForClient(media);
  const event = safeMedia.aiStatus === 'completed' ? 'media:analysis-completed' : 'media:analysis-failed';
  io.to(safeMedia.room.toString()).emit(event, { media: safeMedia });
}

function emitMemberJoined(roomId, member) {
  if (!io || !roomId || !member) return;
  io.to(roomId.toString()).emit('room:member-joined', {
    member,
    activity: `${member.name} joined the room.`,
  });
}

function emitMemberLeft(roomId, member) {
  if (!io || !roomId || !member) return;
  io.to(roomId.toString()).emit('room:member-left', {
    member,
    activity: `${member.name} left the room.`,
  });
}

module.exports = {
  initSocket,
  getIO,
  emitMediaCreated,
  emitMediaDeleted,
  emitMediaAnalysisUpdate,
  emitMemberJoined,
  emitMemberLeft,
};