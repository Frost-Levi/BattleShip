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
            // Host stays on settings screen, just update the status
            if (gameState.phase === 'settings') {
                updateReadyStatus();
            }
        });

        this.socket.on('players-ready', (data) => {
            this.roomId = data.roomId; // Set roomId from server
            this.myPlayerNumber = 2; // I am Player 2
            this.playerNumber = 1; // Player 1 starts
            this.isOnline = true;
            this.isReady = false;
            this.opponentConnected = true; // Host has connected
            this.opponentReady = false; // Host hasn't confirmed yet
            
            console.log('Joined room, roomId:', this.roomId);
            
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
            
            // Reset ready states for new room
            this.isReady = false;
            this.opponentReady = false;
            
            // Update rules display on ready-up screen
            updateReadyUpRulesDisplay();
            updateRuleDescription();
            
            // Show ready screen for Player 2 only
            showScreen('readyUp');
            updateReadyStatus();
        });
        
        this.socket.on('opponent-ready', (data) => {
            console.log('Opponent-ready received:', data, 'My player number:', this.myPlayerNumber);
            // Only set opponentReady if the ready player is NOT me
            if (data.playerNumber !== this.myPlayerNumber) {
                this.opponentReady = true;
                console.log('Opponent is ready!');
            } else {
                console.log('This is my own ready signal, ignoring');
            }
            updateReadyStatus();
        });
        
        this.socket.on('settings-updated', (settings) => {
            console.log('Settings updated from host:', settings);
            // Update local game state with new settings
            gameState.gridSize = settings.gridSize;
            gameState.shootingRule = settings.shootingRule;
            gameState.fogOfWar = settings.fogOfWar;
            gameState.powerUpsEnabled = settings.powerUpsEnabled;
            
            // Sync ship counts
            Object.keys(settings.shipCounts).forEach(shipName => {
                gameState.shipCounts[shipName] = settings.shipCounts[shipName];
            });
            
            // Update display on ready-up screen if visible
            updateReadyUpRulesDisplay();
        });
        
        this.socket.on('both-players-confirmed', () => {
            console.log('Both players confirmed! Starting placement phase...');
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
        
        this.socket.on('both-players-ready', () => {
            console.log('Both players ready - starting battle!');
            gameState.phase = 'battle';
            gameState.currentPlayer = 1;
            showScreen('battle');
            renderBattleBoards();
        });

        this.socket.on('shot-result', (data) => {
            console.log('Shot result received:', {row: data.row, col: data.col, hit: data.isHit, shipSunk: data.shipSunk, nextPlayer: data.nextPlayer, myPlayer: this.myPlayerNumber});
            
            // Determine which board to update
            // If nextPlayer changed, then the previous player just shot
            // If I shot (my turn just ended), update enemy board
            // If opponent shot, update my own board on the server's reflection
            
            const myPlayerNumber = this.myPlayerNumber;
            let boardToUpdate, cellData;
            
            // Update the current player from server
            gameState.currentPlayer = data.nextPlayer;
            
            // The shot was made, now it's nextPlayer's turn
            // If nextPlayer is NOT me, then I just shot (update enemy board)
            // If nextPlayer IS me, then opponent just shot (update my own board)
            if (data.nextPlayer !== myPlayerNumber) {
                // I just shot - update enemy board to show hit/miss
                const enemyPlayerData = myPlayerNumber === 1 ? gameState.player2 : gameState.player1;
                cellData = enemyPlayerData.board[data.row][data.col];
                console.log('I shot - updating enemy board at', data.row, data.col, 'Hit:', data.isHit);
                
                // Mark the cell as hit on enemy board
                if (cellData) {
                    cellData.isHit = true;
                    // CRITICAL: Set hasShip based on server's authoritative response
                    // The client doesn't know enemy ship positions, so trust the server
                    cellData.hasShip = data.isHit;
                    console.log('Updated enemy cell - hasShip set to:', cellData.hasShip);
                    
                    // Update hit tracking
                    if (data.isHit) {
                        const currentPlayerData = myPlayerNumber === 1 ? gameState.player1 : gameState.player2;
                        currentPlayerData.hits++;
                        
                        if (data.shipSunk && cellData.shipId !== null) {
                            const ship = enemyPlayerData.ships[cellData.shipId];
                            if (ship) {
                                ship.sunk = true;
                                alert(`You sunk the enemy's ${ship.name}!`);
                            }
                        }
                    }
                }
            } else {
                // Opponent just shot - update MY board to show where they hit
                const myBoardData = myPlayerNumber === 1 ? gameState.player1 : gameState.player2;
                cellData = myBoardData.board[data.row][data.col];
                console.log('Opponent shot my board at', data.row, data.col, '- hit:', data.isHit);
                
                // Mark the cell as hit on my own board
                if (cellData) {
                    cellData.isHit = true;
                    
                    // If opponent hit my ship, update the ship
                    if (data.isHit && cellData.shipId !== null) {
                        const ship = myBoardData.ships[cellData.shipId];
                        if (ship) {
                            ship.hits++;
                            if (data.shipSunk) {
                                ship.sunk = true;
                            }
                        }
                    }
                }
            }
            
            // Update display
            renderBattleBoards();
            updateBattleTitle();
            
            // Update who's turn it is
            const playerIndicator = document.getElementById('player-indicator');
            if (playerIndicator) {
                if (data.nextPlayer === this.myPlayerNumber) {
                    playerIndicator.textContent = 'Your Turn!';
                    playerIndicator.style.background = '#4CAF50';
                } else {
                    playerIndicator.textContent = 'Opponent\'s Turn';
                    playerIndicator.style.background = '#f44336';
                }
            }
            
            if (data.gameOver) {
                gameState.winner = data.winner === this.myPlayerNumber ? 'You' : 'Opponent';
                setTimeout(() => endGame(), 500);
            } else if (data.nextPlayer !== this.myPlayerNumber) {
                // It's opponent's turn
                console.log('Opponent\'s turn after shot - waiting');
                // Stay on battle screen but can't shoot
            } else {
                // It's your turn
                console.log('Your turn after shot - you can shoot');
            }
        });

        this.socket.on('turn-ended', (data) => {
            console.log('Turn ended. Next player:', data.nextPlayer, 'My player:', this.myPlayerNumber);
            gameState.currentPlayer = data.nextPlayer;
            
            // If it's opponent's turn, show waiting screen
            if (data.nextPlayer !== this.myPlayerNumber) {
                console.log('Opponent\'s turn - showing waiting screen');
                showScreen('waitingForTurn');
            } else {
                // It's our turn, show battle screen
                console.log('Your turn - showing battle screen');
                updateBattleTitle();
                showScreen('battle');
                renderBattleBoards();
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
        
        console.log('Confirming ready - Player:', this.myPlayerNumber, 'Room:', this.roomId);
        
        // Re-enable button for future rooms
        const readyConfirmBtn = document.getElementById('ready-confirm-btn');
        if (readyConfirmBtn) {
            readyConfirmBtn.disabled = true;
            readyConfirmBtn.textContent = 'Ready!';
        }
        
        this.socket.emit('player-ready', {});
    }
    
    sendPlacementDone() {
        if (!this.socket || !this.roomId) return;
        this.socket.emit('placement-done', {});
    }

    joinRoom(roomId) {
        if (!this.socket) this.connect();
        
        // Reset ready state for new room
        this.isReady = false;
        this.opponentReady = false;
        this.opponentConnected = false;
        
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

    updateSettings(settings) {
        if (!this.socket || !this.roomId || !this.isHost) return;
        
        this.socket.emit('update-settings', settings);
    }

    disconnect() {
        if (this.socket) {
            console.log('Disconnecting from room:', this.roomId);
            this.socket.disconnect();
            this.socket = null;
            this.isOnline = false;
            this.roomId = null;
            this.isHost = false;
            this.isReady = false;
            this.opponentReady = false;
            this.opponentConnected = false;
        }
    }
}

// Create global instance
const onlineManager = new OnlineManager();
