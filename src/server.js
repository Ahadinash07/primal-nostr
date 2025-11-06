require('dotenv').config();
const express = require('express');
const cors = require('cors');
const DatabaseService = require('./services/database');
const NostrService = require('./services/nostr');
const { createTextNote } = require('./utils/nostrHelpers');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

app.get('/feed', async (req, res) => {
  const { limit = 20 } = req.query;
  try {
    const posts = await DatabaseService.getPosts(parseInt(limit));
    return res.json(posts);
  } catch (error) {
    if (!isProduction) console.error('Feed error:', error);
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

app.post('/event', async (req, res) => {
  const { content, tags = [] } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  try {
    const event = createTextNote(content, tags);
    const result = await NostrService.publishEvent(event);
    return res.json({ success: true, ...result });
  } catch (error) {
    if (!isProduction) console.error('Event error:', error);
    return res.status(500).json({ 
      error: 'Failed to publish event',
      ...(isProduction ? {} : { details: error.message })
    });
  }
});

app.get('/relays', (req, res) => {
  return res.json({
    success: true,
    relays: NostrService.getConnectedRelays()
  });
});

app.use((err, req, res, next) => {
  if (!isProduction) console.error('Server error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    ...(isProduction ? {} : { message: err.message })
  });
});

async function startServer() {
  try {
    await DatabaseService.connect();
    
    if (!isProduction) {
      console.log('Checking relay connections...');
      await NostrService.checkRelayConnections();
    }
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      if (!isProduction) {
        const relays = NostrService.getConnectedRelays();
        for (const { url, connected, error } of relays) {
          const status = connected ? 'Connected' : `Disconnected${error ? ` (${error})` : ''}`;
          console.log(`- ${url}: ${status}`);
        }
      }
    });
    
    server.on('error', (error) => {
      console.error(error.code === 'EADDRINUSE' 
        ? `Port ${PORT} is already in use` 
        : `Server error: ${error.message}`
      );
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}
