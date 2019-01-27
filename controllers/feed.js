const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;

  Post.find()
    .countDocuments()
    .then(count => {
      totalItems = count;
      return Post.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then(result => {
      res.status(200).json({
        message: 'Success',
        posts: result,
        totalItems: totalItems
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;

  Post.findById(postId)
    .then(postData => {
      if (!postData) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        throw error;
      }

      res.status(200).json({
        message: 'Success, post found',
        post: postData
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.createPost = (req, res, next) => {
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
  let postCreator;
  let postCreated;

  const post = new Post({
    title,
    content,
    imageUrl,
    creator,
    createdAt
  });

  post
    .save()
    .then(result => {
      console.log(result);

      postCreated = result;
      return User.findById(req.userId);
    })
    .then(user => {
      console.log(user);

      postCreator = user;
      user.posts.push(post);
      return user.save();
    })
    .then(result => {
      res.status(201).json({
        message: 'Success, A post was created!',
        post: postCreated,
        creator: { _id: postCreator._id, name: postCreator.name }
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = (req, res, next) => {
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

  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error('Error, Post no found!');
        error.statusCode = 404;
        throw error;
      }

      if (post.creator.toString() !== req.userId) {
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
      return post.save();
    })
    .then(result => {
      res.status(200).json({
        message: 'Success, Post Updated',
        post: result
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;

  Post.findById(postId)
    .then(post => {
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
      return Post.findByIdAndRemove(postId);
    })
    .then(result => {
      return User.findById(req.userId);
    })
    .then(user => {
      user.posts.pull(postId);
      return user.save();
    })
    .then(result => {
      res.status(200).json({
        message: 'Success, post eliminated!'
      });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

const deleteFile = filePath => {
  file = path.join(__dirname, '..', filePath);
  fs.unlink(file, err => console.log(err));
};
