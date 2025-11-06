const { getPublicKey, getEventHash, getSignature, SimplePool } = require('nostr-tools');
const Post = require('../models/Post');

if (typeof WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}
const POOL_TIMEOUT = 10000;
const DEFAULT_RELAYS = ['wss://relay.snort.social'];

class NostrService {
  constructor() {
    this.pool = new SimplePool();
    this.relayUrls = this.initializeRelays();
    this.relayStatus = new Map(
      this.relayUrls.map(url => [url, { connected: false, error: null }])
    );
  }

  initializeRelays() {
    return [
      ...new Set([
        ...(process.env.NOSTR_RELAYS?.split(',').map(s => s.trim()) || []),
        ...DEFAULT_RELAYS
      ].filter(url => 
        url && 
        url.trim() !== '' && 
        !url.includes('nos.lol')
      ))
    ];
  }

  getConnectedRelays() {
    return Array.from(this.relayStatus.entries())
      .map(([url, status]) => ({
        url,
        connected: status.connected,
        ...(status.error && { error: status.error })
      }));
  }

  async publishEvent(event) {
    if (!event || typeof event !== 'object') {
      throw new Error('Event must be an object');
    }

    const required = { kind: 'number', content: 'string' };
    for (const [field, type] of Object.entries(required)) {
      if (typeof event[field] !== type) {
        throw new Error(`Invalid event: ${field} must be a ${type}`);
      }
    }

    // Prepare event
    const preparedEvent = {
      ...event,
      pubkey: event.pubkey || getPublicKey(process.env.NOSTR_PRIVATE_KEY),
      created_at: event.created_at || Math.floor(Date.now() / 1000),
      id: event.id || getEventHash({ ...event, id: undefined, sig: undefined }),
      sig: event.sig || getSignature(
        { ...event, id: undefined, sig: undefined },
        process.env.NOSTR_PRIVATE_KEY
      )
    };

    // Save to database
    this.saveToDatabase(preparedEvent).catch(console.error);

    // Publish to relays
    const results = await this.publishToRelays(preparedEvent);
    
    return {
      eventId: preparedEvent.id,
      publishedTo: results.filter(r => r.success).length,
      totalRelays: results.length,
      results
    };
  }

  async saveToDatabase(event) {
    try {
      const post = new Post(Post.fromEvent(event));
      await post.save();
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  async checkRelayConnections() {
    const checkPromises = this.relayUrls.map(async (url) => {
      try {
        const relay = await this.pool.ensureRelay(url);
        this.relayStatus.set(url, { 
          connected: true,
          error: null
        });
        relay.close();
        return { url, connected: true };
      } catch (error) {
        this.relayStatus.set(url, {
          connected: false,
          error: error.message
        });
        return { url, connected: false, error: error.message };
      }
    });

    return Promise.allSettled(checkPromises);
  }

  async publishToRelays(event) {
    const results = [];
    
    await Promise.allSettled(
      this.relayUrls.map(url => 
        this.publishToRelay(url, event, results)
          .catch(error => {
            results.push({
              url,
              success: false,
              error: error.message
            });
          })
      )
    );
    
    return results;
  }

  async publishToRelay(url, event, results) {
    try {
      const relay = await this.pool.ensureRelay(url);
      
      this.relayStatus.set(url, { 
        ...(this.relayStatus.get(url) || {}),
        connected: true,
        error: null
      });
      
      const pub = relay.publish(event);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.relayStatus.set(url, { 
            ...(this.relayStatus.get(url) || {}),
            connected: false,
            error: 'Publish timeout'
          });
          reject(new Error('Publish timeout'));
        }, POOL_TIMEOUT);

        pub.on('ok', () => {
          clearTimeout(timeout);
          results.push({
            url,
            success: true,
            message: 'Published successfully'
          });
          resolve();
        });

        pub.on('failed', (reason) => {
          clearTimeout(timeout);
          this.relayStatus.set(url, { 
            ...(this.relayStatus.get(url) || {}),
            connected: false,
            error: reason || 'Publish failed'
          });
          reject(new Error(reason || 'Publish failed'));
        });
      });
    } catch (error) {
      this.relayStatus.set(url, { 
        ...(this.relayStatus.get(url) || {}),
        connected: false,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new NostrService();