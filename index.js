// Import des modules nécessaires
const express = require('express');
const { createServer } = require('http'); 
const { join } = require('path'); 
const { Server } = require('socket.io'); 

// Initialisation de l'application Express
const app = express();

// Création du serveur HTTP à partir de l'application Express
const server = createServer(app);

// Création d'une instance de Server avec le serveur HTTP et options
const io = new Server(server, {
    connectionStateRecovery: {}
});

// Définition du chemin vers le répertoire des avatars
const Path = join(__dirname, 'avatars');

// Middleware pour servir les fichiers statiques du répertoire des avatars
app.use(express.static(Path));

// Middleware pour servir les fichiers statiques du répertoire des styles
app.use(express.static(join(__dirname, 'styles')));

// Route pour servir le fichier HTML de l'application à la racine
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'app.html'));
});

// Map pour stocker les utilisateurs connectés avec leur socket ID
const connectedUsers = new Map();

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    let isTyping = false;

    // Événement pour définir le nom d'utilisateur
    socket.on('set username', (userData) => {
        const { username } = userData;
        connectedUsers.set(socket.id, { username });
        io.emit('user connected', username);
        updateUsersList();
    });

    // Événement pour la gestion des messages de chat
    socket.on('chat message', (msg) => {
        socket.emit('chat message', msg);
        socket.broadcast.emit('chat message', msg);
    });

    // Événement pour gérer la saisie de texte
    socket.on('typing', (username) => {
        if (!isTyping) {
            io.emit('typing', username);
            isTyping = true;
        }
    });

    // Événement pour arrêter la saisie de texte
    socket.on('stop typing', (username) => {
        if (isTyping) {
            io.emit('stop typing', username);
            isTyping = false;
        }
    });

    // Événement pour obtenir la liste des utilisateurs
    socket.on('get users', (callback) => {
        const usernames = [];
        connectedUsers.forEach(user => {
            const { username } = user;
            usernames.push(username);
        });
        callback(usernames);
    });

    // Événement pour gérer les messages privés
    socket.on('private message', (msg) => {
        const recipientSocket = connectedUsers.get(msg.to);
        if (recipientSocket) {
            recipientSocket.emit('private message', msg);
        }
    });

    // Gestion de la déconnexion d'un utilisateur
    socket.on('disconnect', () => {
        if (connectedUsers.has(socket.id)) {
            const { username } = connectedUsers.get(socket.id);
            connectedUsers.delete(socket.id);
            io.emit('user disconnected', username);
            updateUsersList();
        }
    });
});

// Fonction pour mettre à jour la liste des utilisateurs
function updateUsersList() {
    io.emit('get users', (usernames) => {
        io.emit('update users list', usernames);
    });
}

// Écoute du serveur sur le port 3000
server.listen(3000, () => {
    console.log('Serveur en cours d\'exécution sur http://localhost:3000');
});
