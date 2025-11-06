# Nostr Event Publisher Backend

A robust backend service for publishing and managing Nostr events. This service provides a REST API for interacting with the Nostr protocol, handling event creation, signing, and publishing to multiple relays.

## Features

- **Nostr Protocol Integration**: Full support for Nostr event creation and publishing
- **Multi-Relay Support**: Publish to multiple Nostr relays simultaneously
- **MongoDB Storage**: Persistent storage for all published events
- **RESTful API**: Easy-to-use endpoints for event management
- **Environment Configuration**: Simple configuration through environment variables

## Getting Started

### Prerequisites

- Node.js 20+ 
- MongoDB 6+
- npm package manager

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/Ahadinash07/primal-nostr.git
   cd backend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   # Create .env file or edit .env with your configuration
   ```

4. Start the development server
   ```bash
   npx nodemon or node src/server.js
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/primal-event
NOSTR_RELAYS=wss://relay.snort.social
NOSTR_PRIVATE_KEY=your_private_key_here
LOG_LEVEL=info
NODE_ENV=development
```

## API Endpoints

### POST /event
Publish a new Nostr event

**Request Body:**
```json
{
  "content": "Hello, Nostr!",
  "tags": ["tag1", "tag2"]
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "event_id_here",
  "results": [
    {
      "url": "wss://relay.snort.social",
      "success": true,
      "message": "Published successfully"
    }
  ]
}
```

### GET /feed
Retrieve published events

**Query Parameters:**
- `limit`: Number of events to return (default: 100)

**Response:**
```json
[
  {
    "id": "event_id",
    "pubkey": "sender_public_key",
    "content": "Hello, Nostr!",
    "created_at": 1630000000,
    "tags": ["tag1", "tag2"],
    "sig": "signature"
  }
]
```

## Project Structure

```
backend/
├── src/
│   ├── models/          # Database models
│   ├── services/        # Business logic
│   │   ├── nostr.js     # Nostr protocol implementation
│   │   └── database.js  # Database service
│   ├── utils/           # Utility functions
│   └── server.js        # Express server setup
├── .env                 # Environment variables
├── package.json         # Project dependencies
└── README.md            # This file
```

### Linting
```bash
npm run lint
# or
yarn lint
```

### Production Build
```bash
npm run build
# or
yarn build
```

## Acknowledgments

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)

---

Built by Ahadinash Khan
