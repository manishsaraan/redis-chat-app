const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const httpserver = http.Server(app);
const io = require('socket.io')(httpserver);

const fs = require('fs');

const creds = '';
const port = process.env.PORT || 8080;

// Middleware to setup static folder
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
	extended: true
}));

// Storing users
const chatters = [];

// Stroing message
const chat_messages = [];


//Read the credential from cred.json file
fs.readFile('creds.json',function(err, data){
    if(err) throw err;
    creds = JSON.parse(data);
    client = redis.createClient();

    //on client ready
    client.once('ready',function(){
    	//get users
    	client.get('chat_users',function(err, reply){
    		if(reply){
    			chatters = JSON.parse(reply);
    		}
    	});

    	//getting messages
    	client.get('chat_app_messages',function(err, reply){
    		if(reply){
    			chat_messages = JSON.parse(reply);
    		}
    	});
    });

});

/**
 * Routes Starts here
 */

//join chat api
app.post('/join',function(req, res){
    var username = req.body.username;

    //validate username
    if(chatters.indexOf(username) === -1){
    	chatters.push(username);

    	//save in redis
    	client.set('chat_users',JSON.stringify(chatters));
    	res.send({
    		 'chatters' : chatters,
    		 'status'  : 'OK'
    	});
    }
    else
    {
        res.send({    		 
    		 'status'  : 'FAILED'
    	})
    }
});

//leave room api
app.post('/leave',function(err, res){
	var username = req.body.username;
	chatters.splice(chatters.indexOf(username), 1);

	//update redis
	client.set('chat_users',JSON.stringify(chatters));
	res.send({
        'status': 'OK'
    });
});

//storing the messages
app.post('/send_message',function(req, res){
	var username = req.body.username;
	var message = req.body.message;
	chat_messages.push({
		message :  message,
		sender  :  username
	});

	//updating redis
	client.set('chat_app_messages',JSON.stringify(chat_messages));
	res.send({
        'status': 'OK'
    });
});

//get all messages
app.get('/get_messages',function(req, res){
	res.send(chat_messages);
});

/**
 * Routes ends here
 */

// Start server
httpserver.listen(port, () => {
	console.log('Server is running on port : ' + port);
});