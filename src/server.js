import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.send('Socket.IO Server is running');
});

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('send_message', (message) => {
        console.log('Message received:', message);
        // Tüm istemcilere mesajı gönder
        io.emit('receive_message', message);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} ✅`);
    console.log('Mongodb bağlantısı başarılı ✅');
    console.log('Socket sistemi çalışıyor ✅');
}); 