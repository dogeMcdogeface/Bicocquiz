const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

class Room {
    constructor(leader, theme = 'default theme', questions = []) {
        this.players = [leader];
        this.leader = leader;
        this.theme = theme;
        this.questions = questions;
    }
}

const rooms = {};
const connectedUsers = {};

io.on('connection', (socket) => {
    console.log('+ A user connected');
    connectedUsers[socket.id] = null;

    // Emit update to admin
    io.emit('updateAdmin', { rooms, connectedUsers });

    socket.on('joinRoom', ({ room, username }) => {
        connectedUsers[socket.id] = username;

        if (!rooms[room]) {
            rooms[room] = new Room(username);
        } else {
            rooms[room].players.push(username);
        }

        socket.join(room);

        console.log(`+ User ${username} joined room: ${room}`);

        io.emit('updateAdmin', { rooms, connectedUsers });

        const interval = setInterval(() => {
            io.to(room).emit('roomInfo', {
                room,
                players: rooms[room].players,
                leader: rooms[room].leader,
                theme: rooms[room].theme,
                questions: rooms[room].questions,
            });
        }, 1000);

        socket.on('disconnect', () => {
            console.log(`- User ${username} left room: ${room}`);
            rooms[room].players = rooms[room].players.filter(user => user !== username);
            if (rooms[room].players.length === 0) {
                delete rooms[room];
            }
            delete connectedUsers[socket.id];
            io.emit('updateAdmin', { rooms, connectedUsers });
            clearInterval(interval);
        });
    });

    socket.on('disconnect', () => {
        console.log('- A user disconnected');
        delete connectedUsers[socket.id];
        io.emit('updateAdmin', { rooms, connectedUsers });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
