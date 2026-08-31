# Just Chess - Global Online Chess Platform

Professional chess web application with online multiplayer, Elo ratings, tournaments, friends, chat, clubs, and multilingual support.

## Features

### Core Gameplay
- ♟️ Online multiplayer chess with matchmaking
- ⚡ Real-time gameplay with Socket.io
- 👥 PeerJS P2P multiplayer support
- ⏱️ Multiple time controls (1 min to 30 min)
- 🤝 Draw offers and resignations
- 📄 PGN export
- 🎨 Chess.com-style interface

### Social Features
- 🏅 Tournament system
- 👥 Friends list and friend requests
- 💬 Real-time chat (direct and group)
- 🏠 Chess clubs with members
- 📊 Player profiles and statistics

### Technical
- 🏆 Elo rating system
- 🌍 6 languages: Uzbek, English, Russian, Spanish, German, French
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🔐 Secure authentication with JWT + bcrypt
- 📊 Game history and statistics
- 🔒 Rate limiting and input validation
- 🗄️ PostgreSQL database with JSON fallback
- 🔴 Redis adapter for Socket.io scaling

## Tech Stack

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Chess.js (move validation)
- Chessboard.js (board UI)
- Socket.io client (real-time)
- Chart.js (statistics)
- i18next (internationalization)
- PeerJS (P2P connections)

**Backend:**
- Node.js + Express
- Socket.io (WebSocket)
- PostgreSQL (database)
- Redis (Socket.io adapter)
- JWT (authentication)
- bcrypt (password hashing)
- express-rate-limit (rate limiting)
- helmet (security)

## Quick Start

### Local Development

1. Clone the repository:
```bash
git clone <repo-url>
cd shaxmat-sayti
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/justchess
JWT_SECRET=your_secret_key_here
```

5. Setup database (optional):
```bash
# Create PostgreSQL database
createdb justchess

# Run schema
psql -d justchess -f schema.sql
psql -d justchess -f schema-extended.sql
```

6. Start the server:
```bash
npm start
```

7. Open browser:
```
http://localhost:3000
```

## Deployment

### Option 1: Railway (Recommended)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Create new project from GitHub repo
4. Add PostgreSQL plugin
5. Add Redis plugin (optional)
6. Set environment variables
7. Deploy!

### Option 2: Render

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repo
5. Add PostgreSQL database
6. Set environment variables
7. Deploy!

### Option 3: Docker

```bash
docker-compose up -d
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment | No | `development` |
| `PORT` | Server port | No | `3000` |
| `DATABASE_URL` | PostgreSQL connection | Yes* | - |
| `REDIS_URL` | Redis connection | No* | - |
| `JWT_SECRET` | JWT signing secret | Yes | `justchess_secret_key_2024` |

*Required for production. Falls back to JSON file storage if not available.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Game
- `POST /api/games` - Save game result
- `GET /api/users/:username/games` - Get game history

### Stats
- `GET /api/stats/:username` - Get user stats
- `GET /api/leaderboard` - Get top players
- `POST /api/ratings/update` - Update Elo rating

### Matchmaking
- `POST /api/matchmaking/join` - Join matchmaking queue
- `POST /api/matchmaking/leave` - Leave matchmaking queue

### Tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments` - List tournaments
- `GET /api/tournaments/:id` - Get tournament details
- `POST /api/tournaments/:id/join` - Join tournament
- `POST /api/tournaments/:id/start` - Start tournament
- `GET /api/tournaments/:id/standings` - Get standings

### Friends
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept` - Accept friend request
- `GET /api/friends` - Get friends list
- `GET /api/friends/requests` - Get pending requests

### Chat
- `GET /api/chat/messages` - Get messages
- `POST /api/chat/messages` - Send message

### Clubs
- `POST /api/clubs` - Create club
- `GET /api/clubs` - List clubs
- `GET /api/clubs/:id` - Get club details
- `POST /api/clubs/:id/join` - Join club
- `GET /api/clubs/:id/members` - Get members

## Socket.io Events

### Client → Server
- `create-room` - Create new game room
- `join-room` - Join existing room
- `make-move` - Send chess move
- `offer-draw` - Offer draw
- `accept-draw` - Accept draw
- `decline-draw` - Decline draw
- `leave-room` - Leave room
- `join-tournament-room` - Join tournament chat
- `join-chat-room` - Join chat room
- `send-chat-message` - Send chat message

### Server → Client
- `room-created` - Room created
- `room-joined` - Joined room
- `opponent-connected` - Opponent joined
- `opponent-move` - Receive move
- `draw-offered` - Draw offer received
- `draw-accepted` - Draw accepted
- `draw-declined` - Draw declined
- `opponent-disconnected` - Opponent left
- `game-ended` - Game over
- `chat-message` - New chat message
- `friend-request-received` - New friend request

## Project Structure

```
shaxmat-sayti/
├── server.js              # Express + Socket.io + PostgreSQL + JWT
├── index.html             # Main HTML (all views)
├── script.js              # Global state, auth, UI
├── board.js               # Chess game logic, timers
├── views.js               # Leaderboard, history views
├── rating.js              # Elo rating system
├── sound.js               # Audio effects
├── online.js              # Socket.io, PeerJS, matchmaking
├── profil.js              # Profile page, Chart.js
├── languages.js           # i18n translations (6 languages)
├── social.js              # Tournaments, friends, chat, clubs
├── package.json           # Dependencies
├── schema.sql             # PostgreSQL schema
├── schema-extended.sql    # Extended schema (tournaments, friends, chat, clubs)
├── Dockerfile             # Docker image
├── docker-compose.yml     # Docker stack
├── .env.example           # Environment variables
├── .gitignore             # Git ignore rules
├── Procfile               # Deployment (Railway/Render)
└── README.md              # Documentation
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

ISC
