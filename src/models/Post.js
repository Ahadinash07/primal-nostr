const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  pubkey: { type: String, required: true },
  created_at: { 
    type: Number, 
    required: false,
    default: () => Math.floor(Date.now() / 1000) 
  },
  kind: { type: Number, required: true },
  tags: { type: [[String]], default: [] },
  content: { type: String, required: true },
  sig: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
  referencedEvents: { type: [String], default: [], index: true },
  referencedPubkeys: { type: [String], default: [], index: true }
});

postSchema.index({ pubkey: 1, created_at: -1 });
postSchema.index({ 'tags.0': 1, created_at: -1 });

postSchema.pre('save', function(next) {
  const referencedEvents = [];
  const referencedPubkeys = [];

  this.tags.forEach(tag => {
    if (tag[0] === 'e' && tag[1]) {
      referencedEvents.push(tag[1]);
    } else if (tag[0] === 'p' && tag[1]) {
      referencedPubkeys.push(tag[1]);
    }
  });

  this.referencedEvents = [...new Set(referencedEvents)];
  this.referencedPubkeys = [...new Set(referencedPubkeys)];
  
  next();
});

postSchema.statics.fromEvent = function(event) {
  return new this({
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags || [],
    content: event.content,
    sig: event.sig
  });
};

postSchema.methods.toEvent = function() {
  return {
    id: this.id,
    pubkey: this.pubkey,
    created_at: this.created_at,
    kind: this.kind,
    tags: this.tags,
    content: this.content,
    sig: this.sig
  };
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
