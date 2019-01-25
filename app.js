const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();

const authRoutes = require('./routes/auth');
const feddRoutes = require('./routes/feed');

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'image');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getSeconds().toString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
  }
};

app.use(bodyParser.json());

app.use(
  multer({ storage: diskStorage, fileFilter: fileFilter }).single('image')
);

app.use('/image', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, PUT, POST, PATCH, DELETE, OPTION'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/auth', authRoutes);
app.use('/feed', feddRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode;
  const message = error.message;
  res.status(status).json({ message: message });
});

mongoose
  .connect(
    'mongodb+srv://igil:SyjxkzZUAIuboJJp@cluster0-l40tt.mongodb.net/test?retryWrites=true',
    { useNewUrlParser: true }
  )
  .then(result => {
    console.log('Conected!');
    app.listen(8080);
  })
  .catch(err => {
    console.log(err);
  });
