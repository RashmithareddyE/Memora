const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Room = require('../models/Room');

let io = null;

const isRoomMember = (room, userId) => room.members.some((memberId) => memberId.toString() === userId);

/**
 * Sets up the Socket.IO server on top of the existing HTTP server.
 * Foundation only (Phase 14, Prompt 1): authentication, room-membership
 * authorization, join/leave, and connection lifecycle. No feature events
 * (media/AI/member-activity) are emitted yet — that's Prompt 2, built on
 * top of this.
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
      // (req.userId), so future code can rely on the same identifier.
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

module.exports = { initSocket, getIO };