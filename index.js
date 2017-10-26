const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const httpserver = new http.Server(app);
const io = require('socket.io')(httpserver);
const redis = require('redis');

const port = process.env.PORT || 8080;

// Middleware to setup static folder
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

// Storing users
let chatters = [];

// Stroing message
let chatMessages = [];

// Read the credential from cred.json file
const client = redis.createClient();

    // On client ready
client.once('ready', () => {
        // Get users
  client.get('chat_users', (err, reply) => {
    if (err) {
      throw err;
    }
    if (reply) {
      chatters = JSON.parse(reply);
    }
  });

        // Getting messages
  client.get('chat_app_messages', (err, reply) => {
    if (err) {
      throw err;
    }
    if (reply) {
      chatMessages = JSON.parse(reply);
    }
  });
});

/**
 * Routes Starts here
 */
app.get('/', (req, res) => {
  res.sendFile('views/index.html', {
    root: __dirname
  });
});
// Join chat api
app.post('/join', (req, res) => {
  const username = req.body.username;

    // Validate username
  if (chatters.indexOf(username) === -1) {
    chatters.push(username);

        // Save in redis
    client.set('chat_users', JSON.stringify(chatters));
    res.send({
      chatters,
      status: 'OK'
    });
  } else {
    res.send({
      status: 'FAILED'
    });
  }
});

// Leave room api
app.post('/leave', (req, res) => {
  const username = req.body.username;
  chatters.splice(chatters.indexOf(username), 1);

	// Update redis
  client.set('chat_users', JSON.stringify(chatters));
  res.send({
    status: 'OK'
  });
});

// Storing the messages
app.post('/send_message', (req, res) => {
  const username = req.body.username;
  const message = req.body.message;
  chatMessages.push({
    message,
    sender: username
  });

	// Updating redis
  client.set('chat_app_messages', JSON.stringify(chatMessages));
  res.send({
    status: 'OK'
  });
});

// Get all messages
app.get('/get_messages', (req, res) => {
  res.send(chatMessages);
});

// Get all users
app.get('/get_chatters', (req, res) => {
  res.send(chatters);
});

/**
 * Socket Starts here
 */

io.on('connection', socket => {
    // Send message
  socket.on('message', data => {
    io.emit('send', data);
  });

    // Update users
  socket.on('update_chatter_count', data => {
    io.emit('count_chatters', data);
  });
});

// Start server
httpserver.listen(port, () => {
  console.log('Server is running on port : ' + port);
});
