const mongoose = require('mongoose');
const Post = require('../models/Post');

let isConnected = false;

async function connect() {
  if (isConnected) return;

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/primal-event';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function savePost(event) {
  try {
    const post = new Post(Post.fromEvent(event));
    await post.save();
    return post;
  } catch (error) {
    if (error.code === 11000) {
      return null;
    }
    console.error('Error saving post:', error);
    throw error;
  }
}

async function getPosts(limit = 100, before = null) {
  try {
    const query = {};
    if (before) {
      query.created_at = { $lt: before };
    }
    
    const posts = await Post.find(query)
      .sort({ created_at: -1 })
      .limit(limit);
    
    return posts.map(post => post.toEvent());
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

async function getPostById(id) {
  try {
    const post = await Post.findOne({ id });
    return post ? post.toEvent() : null;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw error;
  }
}

module.exports = {
  connect,
  savePost,
  getPosts,
  getPostById,
  isConnected: () => isConnected
};
