// Socket.IO client for online play
// 
// AUTO-DEPLOYMENT SUPPORT:
// - Local: Automatically connects to http://localhost:3000
// - Production: Automatically connects to your deployed server URL
// - No configuration needed - just deploy to Railway/Render and it works!

class OnlineManager {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.playerNumber = null;
        this.isOnline = false;
        this.isHost = false;
        this.serverUrl = this.getServerUrl();
    }

    getServerUrl() {
        // Auto-detect server URL based on environment
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Local development (localhost or 127.0.0.1)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        
        // Production - use current host
        return protocol + '//' + window.location.host;
    }

    connect() {
        if (this.socket) return;
        
        // Connect to server
        this.socket = io(this.serverUrl);
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server:', this.serverUrl);
        });

        this.socket.on('room-created', (data) => {
            this.roomId = data.roomId;
            this.playerNumber = 1;
            this.isHost = true;
            this.isOnline = true;
            
            // Show room code to player
            alert(`Room created! Room Code: ${data.roomId}\nShare this code with your opponent.`);
            
            // Move to settings screen
            gameState.gameMode = 'online';
            showScreen('settings');
        });

        this.socket.on('join-error', (message) => {
            alert(`Error: ${message}`);
        });

        this.socket.on('players-ready', (data) => {
            this.playerNumber = 2;
            this.isOnline = true;
            
            // Update game settings from host
            gameState.gridSize = data.settings.gridSize;
            gameState.shootingRule = data.settings.shootingRule;
            gameState.fogOfWar = data.settings.fogOfWar;
            gameState.powerUpsEnabled = data.settings.powerUpsEnabled;
            
            // Sync ship counts
            Object.keys(data.settings.shipCounts).forEach(shipName => {
                gameState.shipCounts[shipName] = data.settings.shipCounts[shipName];
            });
            
            // Start placement
            gameState.currentPlayer = 1;
            gameState.phase = 'placement';
            gameState.currentShipIndex = 0;
            gameState.isHorizontal = true;
            
            showScreen('playerTurn');
        });

        this.socket.on('both-players-ready', (data) => {
            gameState.phase = 'battle';
            gameState.currentPlayer = 1;
            showScreen('battle');
        });

        this.socket.on('shot-result', (data) => {
            const enemyPlayerData = gameState.currentPlayer === 1 ? gameState.player2 : gameState.player1;
            const cellData = enemyPlayerData.board[data.row][data.col];
            
            cellData.isHit = true;
            
            if (data.isHit) {
                gameState.currentPlayer === 1 ? gameState.player2.hits++ : gameState.player1.hits++;
                
                if (data.shipSunk) {
                    const ship = enemyPlayerData.ships[cellData.shipId];
                    if (ship) ship.sunk = true;
                }
            }
            
            // Update display
            renderBattleBoards();
            
            // Update who's turn it is
            const playerIndicator = document.getElementById('player-indicator');
            if (playerIndicator) {
                playerIndicator.textContent = `Player ${data.nextPlayer}'s Turn`;
            }
            
            if (data.gameOver) {
                gameState.winner = data.winner === this.playerNumber ? 'You' : 'Opponent';
                setTimeout(() => endGame(), 500);
            } else if (data.nextPlayer !== this.playerNumber) {
                // It's opponent's turn
                endTurnBtn.disabled = true;
                updateBattleTitle();
            } else {
                // It's your turn
                endTurnBtn.disabled = false;
                updateBattleTitle();
            }
        });

        this.socket.on('turn-ended', (data) => {
            gameState.currentPlayer = data.nextPlayer;
            updateBattleTitle();
            
            const playerIndicator = document.getElementById('player-indicator');
            if (playerIndicator) {
                playerIndicator.textContent = `Player ${data.nextPlayer}'s Turn`;
            }
        });

        this.socket.on('game-reset', () => {
            showScreen('playerTurn');
        });

        this.socket.on('opponent-disconnected', (data) => {
            alert(data.message);
            showScreen('welcome');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isOnline = false;
        });
    }

    createRoom(settings) {
        if (!this.socket) this.connect();
        
        this.socket.emit('create-room', {
            gridSize: settings.gridSize,
            shootingRule: settings.shootingRule,
            fogOfWar: settings.fogOfWar,
            powerUpsEnabled: settings.powerUpsEnabled,
            shipCounts: settings.shipCounts
        });
    }

    joinRoom(roomId) {
        if (!this.socket) this.connect();
        
        this.socket.emit('join-room', roomId);
    }

    updateBoard(board, ships) {
        if (!this.socket || !this.roomId) return;
        
        this.socket.emit('update-board', {
            board: board,
            ships: ships
        });
    }

    shoot(row, col) {
        if (!this.socket || !this.roomId) return;
        
        this.socket.emit('shoot', {
            row: row,
            col: col
        });
    }

    endTurn() {
        if (!this.socket || !this.roomId) return;
        
        this.socket.emit('end-turn', {});
    }

    playAgain() {
        if (!this.socket || !this.roomId) return;
        
        this.socket.emit('play-again', {});
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isOnline = false;
        }
    }
}

// Create global instance
const onlineManager = new OnlineManager();
