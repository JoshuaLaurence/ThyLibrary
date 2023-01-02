require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const port = process.env.PORT || 5001;

const { Server } = require('socket.io');
const io = new Server(http);

let clients = {};

io.on('connection', (client) => {
	console.log(
		'User ' +
			client.id +
			' connected, there are ' +
			io.engine.clientsCount +
			' clients connected'
	);
	client.on('saveName', (name) => {
		clients[client.id].name = name;
		io.sockets.emit('newNames', clients);
	});

	client.on('currentlyReading', (book) => {
		clients[client.id].currentlyReading = book;
		io.sockets.emit('usersReading', clients);
	});

	client.on('newBook', () => {
		console.log('newBookAdded');
		io.sockets.emit('reconstructBooks', client.id);
	});

	clients[client.id] = {
		position: [0, 0, 0],
		rotation: [0, 0, 0],
		name: 'Steve',
		currentlyReading: '',
	};
	client.emit(
		'introduction',
		client.id,
		io.engine.clientsCount,
		Object.keys(clients),
		clients
	);
	io.sockets.emit(
		'newUserConnected',
		io.engine.clientsCount,
		client.id,
		Object.keys(clients),
		clients
	);

	client.on('move', (pos, rot) => {
		clients[client.id].position = pos;
		clients[client.id].rotation = rot;
		io.sockets.emit('userPositions', clients);
	});

	client.on('disconnect', () => {
		//Delete this client from the object
		delete clients[client.id];
		console.log(clients);

		io.sockets.emit(
			'userDisconnected',
			io.engine.clientsCount,
			client.id,
			Object.keys(clients)
		);

		console.log(
			'User ' +
				client.id +
				' dissconeted, there are ' +
				io.engine.clientsCount +
				' clients connected'
		);
	});
});

app.use(express.static(__dirname + '/public'));
app.use(
	'/build/',
	express.static(path.join(__dirname, 'node_modules/three/build'))
);
app.use(
	'/jsm/',
	express.static(path.join(__dirname, 'node_modules/three/examples/jsm'))
);

http.listen(port);
console.log(port);
