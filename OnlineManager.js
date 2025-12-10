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
        this.playerNumber = null; // 1 or 2 - whose turn it is
        this.myPlayerNumber = null; // Which player am I (1 or 2)
        this.isOnline = false;
        this.isHost = false;
        this.serverUrl = this.getServerUrl();
        this.isReady = false;
        this.opponentReady = false;
        this.opponentConnected = false; // Track if opponent has joined
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
            this.myPlayerNumber = 1; // I am Player 1
            this.playerNumber = 1; // Currently player 1's turn
            this.isHost = true;
            this.isOnline = true;
            this.isReady = false;
            this.opponentReady = false;
            this.opponentConnected = false;
            
            // Set game state to player 1
            gameState.currentPlayer = 1;
            gameState.isOnline = true;
            
            // Move to settings screen
            gameState.gameMode = 'online';
            
            // Show room code in settings screen
            setTimeout(() => {
                showSettingsWithRoomCode(data.roomId);
            }, 100);
        });

        this.socket.on('join-error', (message) => {
            alert(`Error: ${message}`);
        });
        
        this.socket.on('opponent-joined', () => {
            this.opponentConnected = true;
            // Don't change screen - host stays on settings screen
            updateReadyStatus();
        });

        this.socket.on('players-ready', (data) => {
            this.myPlayerNumber = 2; // I am Player 2
            this.playerNumber = 1; // Player 1 starts
            this.isOnline = true;
            this.isReady = false;
            this.opponentConnected = true; // Host has connected
            this.opponentReady = false; // Host hasn't confirmed yet
            
            // Update game settings from host
            gameState.gridSize = data.settings.gridSize;
            gameState.shootingRule = data.settings.shootingRule;
            gameState.fogOfWar = data.settings.fogOfWar;
            gameState.powerUpsEnabled = data.settings.powerUpsEnabled;
            gameState.isOnline = true;
            
            // Sync ship counts
            Object.keys(data.settings.shipCounts).forEach(shipName => {
                gameState.shipCounts[shipName] = data.settings.shipCounts[shipName];
            });
            
            // Update rules display on ready-up screen
            updateRuleDescription();
            
            // Show ready screen for Player 2 only
            showScreen('readyUp');
            updateReadyStatus();
        });
        
        this.socket.on('opponent-ready', () => {
            this.opponentReady = true;
            updateReadyStatus();
        });
        
        this.socket.on('both-players-confirmed', () => {
            // Start placement
            gameState.currentPlayer = this.myPlayerNumber;
            gameState.phase = 'placement';
            gameState.currentShipIndex = 0;
            gameState.isHorizontal = true;
            showScreen('playerTurn');
        });

        this.socket.on('placement-done', (data) => {
            // Other player finished placement
            showScreen('waitingForPlacement');
        });
        
        this.socket.on('both-players-placed', (data) => {
            // Both players finished placement, start battle
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
            
            // If it's opponent's turn, show waiting screen
            if (data.nextPlayer !== this.myPlayerNumber) {
                showScreen('waitingForTurn');
            } else {
                // It's our turn, show battle screen
                updateBattleTitle();
                showScreen('battle');
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
    
    confirmReady() {
        if (!this.socket || !this.roomId) return;
        this.isReady = true;
        this.socket.emit('player-ready', {});
    }
    
    sendPlacementDone() {
        if (!this.socket || !this.roomId) return;
        this.socket.emit('placement-done', {});
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
