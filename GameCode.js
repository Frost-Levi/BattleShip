// Game State
const gameState = {
    currentPlayer: 1,
    phase: 'welcome', // welcome, placement, battle, gameover
    player1: {
        board: [],
        ships: [],
        shots: 0,
        hits: 0
    },
    player2: {
        board: [],
        ships: [],
        shots: 0,
        hits: 0
    },
    shipTypes: [
        { name: 'Carrier', size: 5 },
        { name: 'Battleship', size: 4 },
        { name: 'Cruiser', size: 3 },
        { name: 'Submarine', size: 3 },
        { name: 'Destroyer', size: 2 }
    ],
    currentShipIndex: 0,
    isHorizontal: true,
    hasShot: false
};

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const playerTurnScreen = document.getElementById('player-turn-screen');
const placementScreen = document.getElementById('placement-screen');
const battleScreen = document.getElementById('battle-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const startGameBtn = document.getElementById('start-game-btn');
const playBtn = document.getElementById('play-btn');
const rotateBtn = document.getElementById('rotate-btn');
const donePlacementBtn = document.getElementById('done-placement-btn');
const endTurnBtn = document.getElementById('end-turn-btn');
const playAgainBtn = document.getElementById('play-again-btn');

const playerTurnText = document.getElementById('player-turn-text');
const placementTitle = document.getElementById('placement-title');
const currentShipInfo = document.getElementById('current-ship-info');
const battleTitle = document.getElementById('battle-title');
const winnerText = document.getElementById('winner-text');

// Initialize game
function initGame() {
    gameState.currentPlayer = 1;
    gameState.phase = 'welcome';
    gameState.currentShipIndex = 0;
    gameState.isHorizontal = true;
    
    gameState.player1 = {
        board: createEmptyBoard(),
        ships: [],
        shots: 0,
        hits: 0
    };
    
    gameState.player2 = {
        board: createEmptyBoard(),
        ships: [],
        shots: 0,
        hits: 0
    };
    
    showScreen('welcome');
}

// Create empty 10x10 board
function createEmptyBoard() {
    const board = [];
    for (let i = 0; i < 10; i++) {
        board[i] = [];
        for (let j = 0; j < 10; j++) {
            board[i][j] = {
                hasShip: false,
                isHit: false,
                shipId: null
            };
        }
    }
    return board;
}

// Screen management
function showScreen(screenName) {
    const screens = [welcomeScreen, playerTurnScreen, placementScreen, battleScreen, gameOverScreen];
    screens.forEach(screen => screen.classList.remove('active'));
    
    switch(screenName) {
        case 'welcome':
            welcomeScreen.classList.add('active');
            break;
        case 'playerTurn':
            playerTurnScreen.classList.add('active');
            playerTurnText.textContent = `Player ${gameState.currentPlayer} - Your Turn!`;
            break;
        case 'placement':
            gameState.phase = 'placement';
            placementScreen.classList.add('active');
            placementTitle.textContent = `Player ${gameState.currentPlayer} - Place Your Ships`;
            updateShipInfo();
            renderPlacementBoard();
            renderShipSelector();
            break;
        case 'battle':
            gameState.phase = 'battle';
            gameState.hasShot = false;
            battleScreen.classList.add('active');
            battleTitle.textContent = `Player ${gameState.currentPlayer} - Attack!`;
            renderBattleBoards();
            break;
        case 'gameover':
            gameOverScreen.classList.add('active');
            break;
    }
}

// Ship placement
function updateShipInfo() {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    const allPlaced = currentPlayerData.ships.length === gameState.shipTypes.length;
    
    if (!allPlaced && gameState.currentShipIndex < gameState.shipTypes.length) {
        const ship = gameState.shipTypes[gameState.currentShipIndex];
        const orientation = gameState.isHorizontal ? 'Horizontal' : 'Vertical';
        currentShipInfo.textContent = `Place your ${ship.name} (${ship.size} cells) - ${orientation} (Press R to rotate)`;
        donePlacementBtn.disabled = true;
    } else if (allPlaced) {
        currentShipInfo.textContent = 'All ships placed!';
        donePlacementBtn.disabled = false;
    }
}

function renderShipSelector() {
    const shipList = document.getElementById('ship-list');
    shipList.innerHTML = '';
    
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    const placedShipNames = currentPlayerData.ships.map(s => s.name);
    
    gameState.shipTypes.forEach((ship, index) => {
        const shipOption = document.createElement('div');
        shipOption.classList.add('ship-option');
        
        const isPlaced = placedShipNames.includes(ship.name);
        const isSelected = index === gameState.currentShipIndex;
        
        if (isPlaced) {
            shipOption.classList.add('placed');
        }
        if (isSelected) {
            shipOption.classList.add('selected');
        }
        
        shipOption.innerHTML = `
            <span class="ship-name">${ship.name}</span>
            <span class="ship-size">${ship.size} cells${isPlaced ? ' ✓' : ''}</span>
        `;
        
        shipOption.addEventListener('click', () => {
            // If clicking on a placed ship, remove it from the board to reposition
            if (isPlaced) {
                removeShipFromBoard(ship.name);
            }
            gameState.currentShipIndex = index;
            updateShipInfo();
            renderShipSelector();
            renderPlacementBoard();
            clearPreview();
        });
        
        shipList.appendChild(shipOption);
    });
}

function removeShipFromBoard(shipName) {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    
    // Find the ship
    const shipIndex = currentPlayerData.ships.findIndex(s => s.name === shipName);
    if (shipIndex === -1) return;
    
    const ship = currentPlayerData.ships[shipIndex];
    
    // Remove ship from board
    ship.cells.forEach(([row, col]) => {
        currentPlayerData.board[row][col].hasShip = false;
        currentPlayerData.board[row][col].shipId = null;
    });
    
    // Remove ship from ships array
    currentPlayerData.ships.splice(shipIndex, 1);
    
    // Update shipIds for remaining ships
    currentPlayerData.ships.forEach((s, idx) => {
        s.id = idx;
        s.cells.forEach(([row, col]) => {
            currentPlayerData.board[row][col].shipId = idx;
        });
    });
}

function renderPlacementBoard() {
    const placementBoard = document.getElementById('placement-board');
    placementBoard.innerHTML = '';
    
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            if (currentPlayerData.board[row][col].hasShip) {
                cell.classList.add('ship');
            }
            
            cell.addEventListener('mouseenter', handleCellHover);
            cell.addEventListener('mouseleave', clearPreview);
            cell.addEventListener('click', handleCellClick);
            
            placementBoard.appendChild(cell);
        }
    }
}

function handleCellHover(e) {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    if (currentPlayerData.ships.length >= gameState.shipTypes.length) return;
    if (gameState.currentShipIndex >= gameState.shipTypes.length) return;
    
    clearPreview();
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const ship = gameState.shipTypes[gameState.currentShipIndex];
    
    const cells = getShipCells(row, col, ship.size, gameState.isHorizontal);
    const isValid = isValidPlacement(cells);
    
    cells.forEach(([r, c]) => {
        const cellElement = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (cellElement) {
            cellElement.classList.add(isValid ? 'preview' : 'invalid-preview');
        }
    });
}

function clearPreview() {
    document.querySelectorAll('.preview, .invalid-preview').forEach(cell => {
        cell.classList.remove('preview', 'invalid-preview');
    });
}

function handleCellClick(e) {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    if (currentPlayerData.ships.length >= gameState.shipTypes.length) return;
    if (gameState.currentShipIndex >= gameState.shipTypes.length) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const ship = gameState.shipTypes[gameState.currentShipIndex];
    
    const cells = getShipCells(row, col, ship.size, gameState.isHorizontal);
    
    if (isValidPlacement(cells)) {
        placeShip(cells, ship);
        
        // Find next unplaced ship
        const placedShipNames = currentPlayerData.ships.map(s => s.name);
        let nextIndex = gameState.shipTypes.findIndex((s, i) => !placedShipNames.includes(s.name));
        if (nextIndex === -1) {
            nextIndex = gameState.shipTypes.length;
        }
        gameState.currentShipIndex = nextIndex;
        
        updateShipInfo();
        renderPlacementBoard();
        renderShipSelector();
    }
}

function getShipCells(row, col, size, isHorizontal) {
    const cells = [];
    for (let i = 0; i < size; i++) {
        if (isHorizontal) {
            cells.push([row, col + i]);
        } else {
            cells.push([row + i, col]);
        }
    }
    return cells;
}

function isValidPlacement(cells) {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    
    for (let [row, col] of cells) {
        if (row < 0 || row >= 10 || col < 0 || col >= 10) {
            return false;
        }
        if (currentPlayerData.board[row][col].hasShip) {
            return false;
        }
    }
    return true;
}

function placeShip(cells, shipType) {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    const shipId = currentPlayerData.ships.length;
    
    const ship = {
        id: shipId,
        name: shipType.name,
        cells: cells,
        hits: 0,
        sunk: false
    };
    
    currentPlayerData.ships.push(ship);
    
    cells.forEach(([row, col]) => {
        currentPlayerData.board[row][col].hasShip = true;
        currentPlayerData.board[row][col].shipId = shipId;
    });
}

// Battle phase
function renderBattleBoards() {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    const enemyPlayerData = gameState.currentPlayer === 1 ? gameState.player2 : gameState.player1;
    
    // Render own board (with ships visible)
    const ownBoard = document.getElementById('own-board');
    ownBoard.innerHTML = '';
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            
            const cellData = currentPlayerData.board[row][col];
            
            if (cellData.hasShip) {
                cell.classList.add('ship');
            }
            if (cellData.isHit) {
                cell.classList.add(cellData.hasShip ? 'hit' : 'miss');
            }
            
            // Check if ship is sunk
            if (cellData.hasShip && cellData.shipId !== null) {
                const ship = currentPlayerData.ships[cellData.shipId];
                if (ship.sunk) {
                    cell.classList.add('sunk');
                }
            }
            
            ownBoard.appendChild(cell);
        }
    }
    
    // Render enemy board (ships hidden)
    const enemyBoard = document.getElementById('enemy-board');
    enemyBoard.innerHTML = '';
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellData = enemyPlayerData.board[row][col];
            
            if (cellData.isHit) {
                cell.classList.add(cellData.hasShip ? 'hit' : 'miss');
                
                // Check if ship is sunk
                if (cellData.hasShip && cellData.shipId !== null) {
                    const ship = enemyPlayerData.ships[cellData.shipId];
                    if (ship.sunk) {
                        cell.classList.add('sunk');
                    }
                }
            } else {
                cell.addEventListener('click', handleAttack);
            }
            
            enemyBoard.appendChild(cell);
        }
    }
}

function handleAttack(e) {
    // Only allow one shot per turn
    if (gameState.hasShot) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    const enemyPlayerData = gameState.currentPlayer === 1 ? gameState.player2 : gameState.player1;
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    
    const cellData = enemyPlayerData.board[row][col];
    
    if (cellData.isHit) return; // Already hit
    
    cellData.isHit = true;
    currentPlayerData.shots++;
    gameState.hasShot = true;
    
    if (cellData.hasShip) {
        currentPlayerData.hits++;
        const ship = enemyPlayerData.ships[cellData.shipId];
        ship.hits++;
        
        if (ship.hits === ship.cells.length) {
            ship.sunk = true;
            alert(`You sunk the enemy's ${ship.name}!`);
        }
    }
    
    renderBattleBoards();
    
    // Check for game over
    if (checkGameOver()) {
        endGame();
    } else {
        endTurnBtn.disabled = false;
    }
}

function checkGameOver() {
    const enemyPlayerData = gameState.currentPlayer === 1 ? gameState.player2 : gameState.player1;
    return enemyPlayerData.ships.every(ship => ship.sunk);
}

function endGame() {
    const winner = gameState.currentPlayer;
    winnerText.textContent = `Player ${winner} Wins!`;
    
    document.getElementById('p1-shots').textContent = gameState.player1.shots;
    document.getElementById('p1-hits').textContent = gameState.player1.hits;
    document.getElementById('p1-accuracy').textContent = 
        gameState.player1.shots > 0 ? ((gameState.player1.hits / gameState.player1.shots) * 100).toFixed(1) : 0;
    
    document.getElementById('p2-shots').textContent = gameState.player2.shots;
    document.getElementById('p2-hits').textContent = gameState.player2.hits;
    document.getElementById('p2-accuracy').textContent = 
        gameState.player2.shots > 0 ? ((gameState.player2.hits / gameState.player2.shots) * 100).toFixed(1) : 0;
    
    showScreen('gameover');
}

// Event Listeners
startGameBtn.addEventListener('click', () => {
    gameState.currentPlayer = 1;
    showScreen('playerTurn');
});

playBtn.addEventListener('click', () => {
    if (gameState.currentShipIndex === 0) {
        // Starting placement
        showScreen('placement');
    } else {
        // Starting battle turn
        showScreen('battle');
    }
});

rotateBtn.addEventListener('click', () => {
    gameState.isHorizontal = !gameState.isHorizontal;
    clearPreview();
    updateShipInfo();
});

// Keyboard support for R key rotation
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r' && gameState.phase === 'placement') {
        if (gameState.currentShipIndex < gameState.shipTypes.length) {
            gameState.isHorizontal = !gameState.isHorizontal;
            clearPreview();
            updateShipInfo();
        }
    }
});

donePlacementBtn.addEventListener('click', () => {
    if (gameState.currentPlayer === 1) {
        // Player 1 done, now Player 2's turn
        gameState.currentPlayer = 2;
        gameState.currentShipIndex = 0;
        gameState.isHorizontal = true;
        showScreen('playerTurn');
    } else {
        // Both players done, start battle
        gameState.currentPlayer = 1;
        showScreen('playerTurn');
    }
});

endTurnBtn.addEventListener('click', () => {
    // Switch players
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    endTurnBtn.disabled = true;
    showScreen('playerTurn');
});

playAgainBtn.addEventListener('click', () => {
    initGame();
});

// Initialize on load
initGame();