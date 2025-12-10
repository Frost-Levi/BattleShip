const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Store active games
const games = new Map();
const players = new Map();

// Game room class
class GameRoom {
    constructor(roomId, hostId, settings) {
        this.roomId = roomId;
        this.hostId = hostId;
        this.guestId = null;
        this.settings = settings;
        this.player1Ready = false;
        this.player2Ready = false;
        this.gameState = {
            phase: 'placement', // placement, battle, gameover
            currentPlayer: 1,
            player1: {
                id: hostId,
                board: [],
                ships: [],
                shots: 0,
                hits: 0,
                shipsPlaced: false
            },
            player2: {
                id: null,
                board: [],
                ships: [],
                shots: 0,
                hits: 0,
                shipsPlaced: false
            }
        };
    }

    addGuest(guestId) {
        this.guestId = guestId;
        this.gameState.player2.id = guestId;
    }

    isReady() {
        return this.guestId !== null && 
               this.gameState.player1.shipsPlaced && 
               this.gameState.player2.shipsPlaced;
    }

    areBothPlayersConfirmedReady() {
        return this.player1Ready && this.player2Ready && this.guestId !== null;
    }

    resetReadyFlags() {
        this.player1Ready = false;
        this.player2Ready = false;
    }
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new game room
    socket.on('create-room', (settings) => {
        const roomId = Math.random().toString(36).substring(7);
        const room = new GameRoom(roomId, socket.id, settings);
        
        games.set(roomId, room);
        players.set(socket.id, { roomId, playerNumber: 1 });
        
        socket.join(roomId);
        socket.emit('room-created', {
            roomId: roomId,
            settings: settings
        });
        
        console.log('Room created:', roomId, 'by', socket.id);
    });

    // Join an existing game room
    socket.on('join-room', (roomId) => {
        const room = games.get(roomId);
        
        if (!room) {
            socket.emit('join-error', 'Room not found');
            return;
        }
        
        if (room.guestId !== null) {
            socket.emit('join-error', 'Room is full');
            return;
        }
        
        room.addGuest(socket.id);
        players.set(socket.id, { roomId, playerNumber: 2 });
        
        socket.join(roomId);
        
        // Notify host that guest has joined
        io.to(room.hostId).emit('opponent-joined');
        
        // Notify guest of the game settings and show ready screen
        io.to(socket.id).emit('players-ready', {
            roomId: roomId,
            player1Id: room.gameState.player1.id,
            player2Id: room.gameState.player2.id,
            settings: room.settings
        });
        
        console.log('Player joined room:', roomId, 'player:', socket.id);
    });

    // Update settings (host only)
    socket.on('update-settings', (settings) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;
        
        const room = games.get(playerInfo.roomId);
        if (!room) return;
        
        // Only host can update settings
        if (playerInfo.playerNumber !== 1) return;
        
        room.settings = settings;
        
        // Broadcast updated settings to guest
        if (room.guestId) {
            io.to(room.guestId).emit('settings-updated', settings);
        }
        
        console.log('Settings updated in room:', playerInfo.roomId, settings);
    });

    // Player confirms ready from settings screen
    socket.on('player-ready', () => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;
        
        const room = games.get(playerInfo.roomId);
        if (!room) return;
        
        console.log('Player ready:', socket.id, 'Player number:', playerInfo.playerNumber);
        
        const playerNumber = playerInfo.playerNumber;
        if (playerNumber === 1) {
            room.player1Ready = true;
        } else {
            room.player2Ready = true;
        }
        
        console.log('Ready state - P1:', room.player1Ready, 'P2:', room.player2Ready, 'Guest exists:', !!room.guestId);
        
        // Notify the other player that this player is ready
        const otherPlayerId = playerNumber === 1 ? room.guestId : room.hostId;
        if (otherPlayerId) {
            io.to(playerInfo.roomId).emit('opponent-ready', {
                playerNumber: playerNumber
            });
            console.log('Sent opponent-ready to room:', playerInfo.roomId);
        }
        
        // Check if both players have confirmed ready
        if (room.areBothPlayersConfirmedReady()) {
            console.log('Both players confirmed ready! Starting game...');
            io.to(playerInfo.roomId).emit('both-players-confirmed', {
                phase: 'placement'
            });
            room.resetReadyFlags();
        } else {
            console.log('Waiting for other player...');
        }
    });

    // Get room info
    socket.on('get-room-info', (roomId) => {
        const room = games.get(roomId);
        if (room) {
            socket.emit('room-info', {
                roomId: roomId,
                hostId: room.hostId,
                guestId: room.guestId,
                settings: room.settings,
                phase: room.gameState.phase
            });
        }
    });

    // Update board (when ships are placed)
    socket.on('update-board', (data) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;
        
        const room = games.get(playerInfo.roomId);
        if (!room) return;
        
        const playerNumber = playerInfo.playerNumber;
        const playerKey = `player${playerNumber}`;
        
        room.gameState[playerKey].board = data.board;
        room.gameState[playerKey].ships = data.ships;
        room.gameState[playerKey].shipsPlaced = true;
        
        console.log(`Player ${playerNumber} ships placed. P1 placed: ${room.gameState.player1.shipsPlaced}, P2 placed: ${room.gameState.player2.shipsPlaced}`);
        
        // Check if both players have placed ships
        if (room.isReady()) {
            console.log('Both players ready! Starting battle...');
            io.to(playerInfo.roomId).emit('both-players-ready', {
                phase: 'battle'
            });
        }
    });
    
    // Handle placement done (backup signal)
    socket.on('placement-done', () => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;
        
        const room = games.get(playerInfo.roomId);
        if (!room) return;
        
        const playerNumber = playerInfo.playerNumber;
        const playerKey = `player${playerNumber}`;
        
        console.log(`Player ${playerNumber} confirmed placement done.`);
        
        // Check if both players have placed ships
        if (room.isReady()) {
            console.log('Both players ready! Starting battle...');
            io.to(playerInfo.roomId).emit('both-players-ready', {
                phase: 'battle'
            });
        }
    });

    // Process shot
    socket.on('shoot', (data) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;
        
        const room = games.get(playerInfo.roomId);
        if (!room) return;
        
        const attackingPlayer = playerInfo.playerNumber;
        const defendingPlayer = attackingPlayer === 1 ? 2 : 1;
        const defendingPlayerKey = `player${defendingPlayer}`;
        
        // Update shot result
        const cellData = room.gameState[defendingPlayerKey].board[data.row][data.col];
        cellData.isHit = true;
        
        const isHit = cellData.hasShip;
        const shipId = cellData.shipId;
        
        let shipSunk = false;
        if (isHit && shipId !== null) {
            const ship = room.gameState[defendingPlayerKey].ships[shipId];
            ship.hits++;
            
            if (ship.hits === ship.size) {
                ship.sunk = true;
                shipSunk = true;
            }
        }
        
        // Check for game over
        const allShipsSunk = room.gameState[defendingPlayerKey].ships.every(ship => ship.sunk);
        
        // Broadcast shot result to both players
        io.to(playerInfo.roomId).emit('shot-result', {
            row: data.row,
            col: data.col,
            isHit: isHit,
            shipSunk: shipSunk,
            gameOver: allShipsSunk,
            winner: allShipsSunk ? attackingPlayer : null,
            nextPlayer: room.gameState.currentPlayer === 1 ? 2 : 1
        });
        
        if (!allShipsSunk) {
            // Update current player
            room.gameState.currentPlayer = room.gameState.currentPlayer === 1 ? 2 : 1;
        }
    });

    // End turn
    socket.on('end-turn', (data) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;
        
        const room = games.get(playerInfo.roomId);
        if (!room) return;
        
        // Switch current player
        room.gameState.currentPlayer = room.gameState.currentPlayer === 1 ? 2 : 1;
        
        // Notify both players
        io.to(playerInfo.roomId).emit('turn-ended', {
            nextPlayer: room.gameState.currentPlayer
        });
    });

    // Play again
    socket.on('play-again', () => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;
        
        const room = games.get(playerInfo.roomId);
        if (!room) return;
        
        // Reset game state
        room.gameState.phase = 'placement';
        room.gameState.currentPlayer = 1;
        room.gameState.player1.shipsPlaced = false;
        room.gameState.player2.shipsPlaced = false;
        room.gameState.player1.shots = 0;
        room.gameState.player1.hits = 0;
        room.gameState.player2.shots = 0;
        room.gameState.player2.hits = 0;
        room.gameState.player1.board = [];
        room.gameState.player2.board = [];
        room.gameState.player1.ships = [];
        room.gameState.player2.ships = [];
        
        io.to(playerInfo.roomId).emit('game-reset');
    });

    // Disconnect
    socket.on('disconnect', () => {
        const playerInfo = players.get(socket.id);
        
        if (playerInfo) {
            const room = games.get(playerInfo.roomId);
            
            if (room) {
                // Notify other player that opponent disconnected
                io.to(playerInfo.roomId).emit('opponent-disconnected', {
                    message: 'Your opponent has disconnected'
                });
                
                // Clean up if both players are gone
                const otherPlayerId = playerInfo.playerNumber === 1 ? room.guestId : room.hostId;
                if (otherPlayerId && !players.has(otherPlayerId)) {
                    games.delete(playerInfo.roomId);
                }
            }
            
            players.delete(socket.id);
        }
        
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
