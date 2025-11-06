const { getPublicKey } = require('nostr-tools');
const crypto = require('crypto').webcrypto || require('crypto');

let privateKey;
let publicKey;

function isValidPrivateKey(hex) {
  if (!hex) return false;
  const cleanHex = hex.trim();
  return /^[0-9a-fA-F]{64}$/.test(cleanHex);
}

try {
  const envKey = process.env.NOSTR_PRIVATE_KEY;
  
  if (envKey) {
    if (!isValidPrivateKey(envKey)) {
      throw new Error('Invalid NOSTR_PRIVATE_KEY');
    }
    privateKey = envKey.trim();
    publicKey = getPublicKey(privateKey);
  }
} catch (error) {
  console.error('Error initializing Nostr keys:', error.message);
  process.exit(1);
}

function createTextNote(content, tags = []) {
  const event = {
    kind: 1,
    pubkey: publicKey,
    created_at: Math.floor(Date.now() / 1000),
    content: content.toString(),
    tags: []
  };

  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (!Array.isArray(tag) || tag.length === 0) continue;
      
      const tagName = tag[0]?.toString().toLowerCase();
      if (!tagName) continue;
      
      try {
        const cleanTag = tag.map(item => item?.toString().trim() || '');
        
        if (tagName === 'e') {
          if (cleanTag.length >= 2) {
            const eventId = cleanTag[1];
            const relayUrl = cleanTag[2] || '';
            const marker = cleanTag[3] || '';
            
            if (/^[0-9a-fA-F]+$/.test(eventId)) {
              event.tags.push(['e', eventId, relayUrl, marker].filter(Boolean));
            } else {
              console.warn(`Skipping invalid event tag (not hex):`, tag);
            }
          }
        } else if (tagName === 'p') {
          if (cleanTag.length >= 2) {
            const pubkey = cleanKey(cleanTag[1]);
            const relayUrl = cleanTag[2] || '';
            const petName = cleanTag[3] || '';
            
            if (/^[0-9a-fA-F]+$/.test(pubkey)) {
              event.tags.push(['p', pubkey, relayUrl, petName].filter(Boolean));
            } else {
              console.warn(`Skipping invalid pubkey tag (not hex):`, tag);
            }
          }
        } else {
          event.tags.push(cleanTag);
        }
      } catch (error) {
        console.warn('Error processing tag:', tag, error);
      }
    }
  }

  return event;
}

function cleanKey(key) {
  if (!key) return '';
  return key.startsWith('npub1') ? key : key;
}

module.exports = {
  createTextNote,
  publicKey 
};
