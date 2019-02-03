const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const io = require('../socket');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    const totalItems = await Post.find().countDocuments();

    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: 'Success',
      posts: posts,
      totalItems: totalItems
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const postData = await Post.findById(postId);

    if (!postData) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      message: 'Success, post found',
      post: postData
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is not valid');
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error('Image file missing!');
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path.replace('\\', '/');
  const creator = req.userId;
  const createdAt = new Date();

  const post = new Post({
    title,
    content,
    imageUrl,
    creator,
    createdAt
  });

  try {
    const result = await post.save();

    const user = await User.findById(req.userId);

    user.posts.push(post);

    const saveResult = await user.save();

    const socket = io.getIo();
    socket.emit('posts', {
      action: 'create',
      post: { ...post._doc, creator: { _id: user._id, name: user.name } }
    });

    res.status(201).json({
      message: 'Success, A post was created!',
      post: post,
      creator: { _id: req.userId, name: user.name }
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const errors = validationResult(req);
  const postId = req.params.postId;

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is not valid');
    error.statusCode = 422;
    throw error;
  }

  const updatedTitle = req.body.title;
  const updatedContent = req.body.content;

  //this is in case not new file was added, the frontend should be able to provide the old path as text;
  let updatedImageUrl = req.body.image;

  //this is in case a new file was piked
  if (req.file) {
    updatedImageUrl = req.file.path.replace('\\', '/');
  }

  if (!updatedImageUrl) {
    const error = new Error('No image was selected');
    error.statusCode = 422;
    throw error;
  }
  try {
    const post = await Post.findById(postId).populate('creator');

    if (!post) {
      const error = new Error('Error, Post no found!');
      error.statusCode = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('User Not Authorized to Update Post');
      error.statusCode = 401;
      throw error;
    }

    if (updatedImageUrl !== post.imageUrl) {
      deleteFile(post.imageUrl);
    }

    post.title = updatedTitle;
    post.content = updatedContent;
    post.imageUrl = updatedImageUrl;

    const saveResult = await post.save();

    const socket = io.getIo();
    socket.emit('posts', { action: 'update', post: saveResult });

    res.status(200).json({
      message: 'Success, Post Updated',
      post: saveResult
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error('Post not found');
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error('User Not Authorized to Delete Post');
      error.statusCode = 401;
      throw error;
    }

    deleteFile(post.imageUrl);

    const deleteResult = await Post.findByIdAndRemove(postId);

    const user = await User.findById(req.userId);
    user.posts.pull(postId);

    const saveResult = await user.save();

    //const socket = io.getIo();
    io.getIo().emit('posts', { action: 'delete', post: postId });

    res.status(200).json({
      message: 'Success, post eliminated!'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const deleteFile = filePath => {
  file = path.join(__dirname, '..', filePath);
  fs.unlink(file, err => console.log(err));
};
