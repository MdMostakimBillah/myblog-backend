// models/Post.js
import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  authorName: { // এখানে লেখকের ইউজারনেম সেভ হবে
    type: String,
    required: true
  },
  authorId: { // এটি আইডি দিয়ে খুঁজে বের করা আরও সহজ করে
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  status: {
    type: String,
    required: true
  },
  banner: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  firstParagraph: {
    type: String,
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,   
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now   
  }, 
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

const Post = mongoose.model("Post", postSchema);

export default Post;