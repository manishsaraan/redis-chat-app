const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const httpserver = new http.Server(app);
const io = require('socket.io')(httpserver);

const fs = require('fs');

const redis = require('redis');

let creds = '';
const port = process.env.PORT || 8080;

// Middleware to setup static folder
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

// Storing users
let chatters = [];

// Stroing message
let chat_messages = [];

// Read the credential from cred.json file
fs.readFile('creds.json', (err, data) => {
  if (err) {
    throw err;
  }
  creds = JSON.parse(data);
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
        chat_messages = JSON.parse(reply);
      }
    });
  });
});

/**
 * Routes Starts here
 */

// join chat api
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
app.post('/leave', (err, res) => {
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
  chat_messages.push({
    message,
    sender: username
  });

	// Updating redis
  client.set('chat_app_messages', JSON.stringify(chat_messages));
  res.send({
    status: 'OK'
  });
});

// Get all messages
app.get('/get_messages', (req, res) => {
  res.send(chat_messages);
});

/**
 * Socket Starts here
 */

io.on('connection', function(socket) {
    //send message
    socket.on('message', function(data) {
        io.emit('send', data);
    });
    
    //update users
    socket.on('update_chatter_count', function(data) {
        io.emit('count_chatters', data);
    });
});




// Start server
httpserver.listen(port, () => {
  console.log('Server is running on port : ' + port);
});
