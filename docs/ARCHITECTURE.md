# Architecture / Request Flow

## Authentication
1. Client sends signup details to `POST /api/auth/signup`.
2. Server validates input and hashes the password with bcrypt.
3. User document is stored in MongoDB.
4. Client sends credentials to `POST /api/auth/login`.
5. Server compares password with bcrypt and signs a JWT.
6. Client sends `Authorization: Bearer <token>` to protected routes.
7. `protect` middleware verifies JWT and loads the current user.

## Notes authorization
Every Notes endpoint runs through `protect`. Database queries include the logged-in user's ID (`owner`), so notes are private to their owner.

## Real-time chat
1. Socket.IO client connects with a JWT in `handshake.auth.token`.
2. `authenticateSocket` verifies the JWT and attaches the user to the socket.
3. Client joins a room using `join-room`.
4. Client emits `chat-message`; server broadcasts `new-message` to the room.

## Event-driven design
The shared `eventBus` is a Node.js `EventEmitter`. Auth and chat actions emit named events. `server.js` listens and logs them.
