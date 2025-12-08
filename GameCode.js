// Game State
const gameState = {
    currentPlayer: 1,
    phase: 'welcome', // welcome, settings, placement, battle, gameover
    gridSize: 10, // 7, 10, 12, or 15
    maxShips: 10, // Dynamic based on grid size
    shootingRule: 'oneshot', // oneshot, twoshots, threeshots, tillmiss, shipfire
    fogOfWar: false, // true = only see sunk ships, false = see hit/miss
    powerUpsEnabled: false, // true = enable power-ups system
    activePowerUp: null, // Currently active power-up for the turn
    sonarMode: false, // If sonar is active waiting for selection
    shipCounts: {
        'Carrier': 1,
        'Battleship': 1,
        'Cruiser': 1,
        'Submarine': 1,
        'Destroyer': 1
    },
    shotsThisTurn: 0,
    lastShotHit: false,
    player1: {
        board: [],
        ships: [],
        shots: 0,
        hits: 0,
        powerPoints: 2,
        usedPowerUpThisTurn: false,
        cloakActive: false,
        scopeActive: false,
        extraShotUsed: false,
        cloakedCells: [] // Array of [row, col] coordinates that are cloaked
    },
    player2: {
        board: [],
        ships: [],
        shots: 0,
        hits: 0,
        powerPoints: 2,
        usedPowerUpThisTurn: false,
        cloakActive: false,
        scopeActive: false,
        extraShotUsed: false,
        cloakedCells: [] // Array of [row, col] coordinates that are cloaked
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
const settingsScreen = document.getElementById('settings-screen');
const playerTurnScreen = document.getElementById('player-turn-screen');
const placementScreen = document.getElementById('placement-screen');
const battleScreen = document.getElementById('battle-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const startGameBtn = document.getElementById('start-game-btn');
const settingsBtn = document.getElementById('settings-btn');
const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
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
const ruleDescription = document.getElementById('rule-description');

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
        hits: 0,
        powerPoints: 2,
        usedPowerUpThisTurn: false,
        cloakActive: false,
        scopeActive: false,
        extraShotUsed: false,
        cloakedCells: []
    };
    
    gameState.player2 = {
        board: createEmptyBoard(),
        ships: [],
        shots: 0,
        hits: 0,
        powerPoints: 2,
        usedPowerUpThisTurn: false,
        cloakActive: false,
        scopeActive: false,
        extraShotUsed: false,
        cloakedCells: []
    };
    
    showScreen('welcome');
}

// Create empty board with specified grid size
function createEmptyBoard(size = gameState.gridSize) {
    const board = [];
    for (let i = 0; i < size; i++) {
        board[i] = [];
        for (let j = 0; j < size; j++) {
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
    const screens = [welcomeScreen, settingsScreen, playerTurnScreen, placementScreen, battleScreen, gameOverScreen];
    screens.forEach(screen => screen.classList.remove('active'));
    
    switch(screenName) {
        case 'welcome':
            gameState.phase = 'welcome';
            welcomeScreen.classList.add('active');
            break;
        case 'settings':
            gameState.phase = 'settings';
            settingsScreen.classList.add('active');
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
            gameState.shotsThisTurn = 0;
            gameState.lastShotHit = false;
            gameState.sonarMode = false;
            const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
            currentPlayerData.usedPowerUpThisTurn = false;
            currentPlayerData.scopeActive = false;
            currentPlayerData.extraShotUsed = false;
            battleScreen.classList.add('active');
            updateLegend();
            updateBattleTitle();
            renderBattleBoards();
            updatePowerUps();
            break;
        case 'gameover':
            gameOverScreen.classList.add('active');
            break;
    }
}

// Ship placement
function updateShipInfo() {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    const totalEnabledShips = Object.values(gameState.shipCounts).reduce((a, b) => a + b, 0);
    const allPlaced = currentPlayerData.ships.length === totalEnabledShips;
    
    if (!allPlaced && gameState.currentShipIndex < gameState.shipTypes.length) {
        const ship = gameState.shipTypes[gameState.currentShipIndex];
        
        // Skip ships with count 0
        if (gameState.shipCounts[ship.name] === 0) {
            currentShipInfo.textContent = 'All ships placed!';
            donePlacementBtn.disabled = false;
            return;
        }
        
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
    const placedShipCounts = {};
    
    // Count placed ships by name
    currentPlayerData.ships.forEach(ship => {
        placedShipCounts[ship.name] = (placedShipCounts[ship.name] || 0) + 1;
    });
    
    // Only show ships with count > 0
    gameState.shipTypes.forEach((ship, index) => {
        if (gameState.shipCounts[ship.name] === 0) return;
        
        const shipOption = document.createElement('div');
        shipOption.classList.add('ship-option');
        
        const placedCount = placedShipCounts[ship.name] || 0;
        const totalCount = gameState.shipCounts[ship.name];
        const allPlaced = placedCount >= totalCount;
        const isSelected = index === gameState.currentShipIndex;
        
        if (allPlaced) {
            shipOption.classList.add('placed');
        }
        if (isSelected) {
            shipOption.classList.add('selected');
        }
        
        shipOption.innerHTML = `
            <span class="ship-name">${ship.name}</span>
            <span class="ship-size">${ship.size} cells (${placedCount}/${totalCount})</span>
        `;
        
        shipOption.addEventListener('click', () => {
            // If clicking on a placed ship, remove it from the board to reposition
            if (placedCount > 0) {
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
    
    // Find the last ship with this name
    let shipIndex = -1;
    for (let i = currentPlayerData.ships.length - 1; i >= 0; i--) {
        if (currentPlayerData.ships[i].name === shipName) {
            shipIndex = i;
            break;
        }
    }
    
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
    
    // Remove old grid size classes and add new one
    placementBoard.classList.remove('grid-7x7', 'grid-10x10', 'grid-12x12', 'grid-15x15');
    placementBoard.classList.add(`grid-${gameState.gridSize}x${gameState.gridSize}`);
    
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
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
    const totalEnabledShips = Object.values(gameState.shipCounts).reduce((a, b) => a + b, 0);
    if (currentPlayerData.ships.length >= totalEnabledShips) return;
    if (gameState.currentShipIndex >= gameState.shipTypes.length) return;
    
    const ship = gameState.shipTypes[gameState.currentShipIndex];
    if (gameState.shipCounts[ship.name] === 0) return;
    
    clearPreview();
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
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
    const totalEnabledShips = Object.values(gameState.shipCounts).reduce((a, b) => a + b, 0);
    if (currentPlayerData.ships.length >= totalEnabledShips) return;
    if (gameState.currentShipIndex >= gameState.shipTypes.length) return;
    
    const ship = gameState.shipTypes[gameState.currentShipIndex];
    if (gameState.shipCounts[ship.name] === 0) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    const cells = getShipCells(row, col, ship.size, gameState.isHorizontal);
    
    if (isValidPlacement(cells)) {
        placeShip(cells, ship);
        
        // Find next ship that still needs to be placed
        const placedShipCounts = {};
        currentPlayerData.ships.forEach(s => {
            placedShipCounts[s.name] = (placedShipCounts[s.name] || 0) + 1;
        });
        
        let nextIndex = gameState.shipTypes.findIndex((s, i) => {
            const count = gameState.shipCounts[s.name];
            const placed = placedShipCounts[s.name] || 0;
            return count > 0 && placed < count;
        });
        
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
        if (row < 0 || row >= gameState.gridSize || col < 0 || col >= gameState.gridSize) {
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
    
    const gridSizeClass = `grid-${gameState.gridSize}x${gameState.gridSize}`;
    
    // Render own board (with ships visible)
    const ownBoard = document.getElementById('own-board');
    ownBoard.innerHTML = '';
    ownBoard.classList.remove('grid-7x7', 'grid-10x10', 'grid-12x12', 'grid-15x15');
    ownBoard.classList.add(gridSizeClass);
    
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
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
    enemyBoard.classList.remove('grid-7x7', 'grid-10x10', 'grid-12x12', 'grid-15x15');
    enemyBoard.classList.add(gridSizeClass);
    
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellData = enemyPlayerData.board[row][col];
            
            if (cellData.isHit) {
                // Check if this specific cell is cloaked
                const isCloaked = currentPlayerData.cloakedCells.some(([r, c]) => r === row && c === col);
                
                // Allow clicking cloaked cells or cells in fog of war to reveal/re-shoot
                if (isCloaked || gameState.fogOfWar) {
                    cell.addEventListener('click', handleAttack);
                }
                
                // Check if cloak or scope power-ups override display mode
                let showFeedback = !gameState.fogOfWar;
                if (isCloaked) {
                    showFeedback = false; // This cell is cloaked, hide feedback
                } else if (currentPlayerData.scopeActive) {
                    showFeedback = true; // You used scope, see feedback
                }
                
                // Display based on feedback mode
                if (!showFeedback) {
                    // Fog of war or cloak mode: only show sunk ships with marker for shots
                    if (cellData.hasShip && cellData.shipId !== null) {
                        const ship = enemyPlayerData.ships[cellData.shipId];
                        if (ship.sunk) {
                            cell.classList.add('sunk');
                        } else {
                            // Ship hit but not sunk - show marker
                            cell.classList.add('shot-marker');
                        }
                    } else {
                        // Water hit - show marker
                        cell.classList.add('shot-marker');
                    }
                } else {
                    // Normal mode or scope: show all hits and misses
                    cell.classList.add(cellData.hasShip ? 'hit' : 'miss');
                    
                    // Check if ship is sunk
                    if (cellData.hasShip && cellData.shipId !== null) {
                        const ship = enemyPlayerData.ships[cellData.shipId];
                        if (ship.sunk) {
                            cell.classList.add('sunk');
                        }
                    }
                }
            } else if (canShootMore() || gameState.sonarMode) {
                cell.addEventListener('click', handleAttack);
            }
            
            enemyBoard.appendChild(cell);
        }
    }
}

function handleAttack(e) {
    // Handle sonar mode
    if (gameState.sonarMode) {
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        revealSonarArea(row, col);
        return;
    }
    
    // Check if player has used all their shots for this turn
    if (!canShootMore()) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    const enemyPlayerData = gameState.currentPlayer === 1 ? gameState.player2 : gameState.player1;
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    
    const cellData = enemyPlayerData.board[row][col];
    
    // Check if this cell is cloaked - allow re-shooting to reveal
    // Cloaked cells are stored in currentPlayer's array (cells I shot that are hidden)
    const cloakedIndex = currentPlayerData.cloakedCells.findIndex(([r, c]) => r === row && c === col);
    
    // If already hit, check if it's cloaked (can be re-shot) or in fog of war (can be re-shot)
    if (cellData.isHit) {
        // Can re-shoot if it's cloaked OR if we're in fog of war
        if (cloakedIndex === -1 && !gameState.fogOfWar) {
            return; // Already hit and not cloaked and not in fog of war - can't shoot
        }
        
        // If we're here, it's either cloaked or in fog of war, so we can re-shoot
        currentPlayerData.shots++;
        gameState.shotsThisTurn++;
        
        // Show what was there
        if (cellData.hasShip) {
            alert('It was a HIT!');
        } else {
            alert('It was a MISS!');
        }
        
        // Remove from cloaked if it was cloaked
        if (cloakedIndex !== -1) {
            currentPlayerData.cloakedCells.splice(cloakedIndex, 1);
        }
        
        renderBattleBoards();
        updateBattleTitle();
        
        // Update power-ups to disable if no more shots
        if (gameState.powerUpsEnabled) {
            updatePowerUps();
        }
        
        // Check if player can take more shots
        if (!canShootMore()) {
            setTimeout(() => {
                endTurnBtn.disabled = false;
            }, 300);
        }
        return;
    }
    
    cellData.isHit = true;
    currentPlayerData.shots++;
    gameState.shotsThisTurn++;
    gameState.lastShotHit = cellData.hasShip;
    
    // If cloak is active, mark this cell as cloaked (so the current player can't see feedback)
    if (currentPlayerData.cloakActive) {
        currentPlayerData.cloakedCells.push([row, col]);
    }
    
    if (cellData.hasShip) {
        currentPlayerData.hits++;
        const ship = enemyPlayerData.ships[cellData.shipId];
        ship.hits++;
        
        if (ship.hits === ship.cells.length) {
            ship.sunk = true;
            alert(`You sunk the enemy's ${ship.name}!`);
            // Award power point for sinking a ship
            if (gameState.powerUpsEnabled) {
                currentPlayerData.powerPoints++;
                updatePowerUps();
            }
        }
    }
    
    renderBattleBoards();
    updateBattleTitle();
    
    // Update power-ups to disable if no more shots
    if (gameState.powerUpsEnabled) {
        updatePowerUps();
    }
    
    // Check for game over
    if (checkGameOver()) {
        endGame();
    } else {
        // Check if player can take more shots
        if (!canShootMore()) {
            // End turn after a short delay
            setTimeout(() => {
                endTurnBtn.disabled = false;
            }, 300);
        }
    }
}

function canShootMore() {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    let maxShots = 1;
    
    if (gameState.shootingRule === 'oneshot') {
        maxShots = 1;
    } else if (gameState.shootingRule === 'twoshots') {
        maxShots = 2;
    } else if (gameState.shootingRule === 'threeshots') {
        maxShots = 3;
    } else if (gameState.shootingRule === 'tillmiss') {
        return gameState.lastShotHit || gameState.shotsThisTurn === 0;
    } else if (gameState.shootingRule === 'shipfire') {
        // Count remaining (non-sunk) ships
        const remainingShips = currentPlayerData.ships.filter(ship => !ship.sunk).length;
        maxShots = remainingShips;
    }
    
    // Add extra shot if power-up was used
    if (currentPlayerData.extraShotUsed && gameState.shootingRule !== 'tillmiss') {
        maxShots++;
    }
    
    return gameState.shotsThisTurn < maxShots;
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

settingsBtn.addEventListener('click', () => {
    showScreen('settings');
});

backToWelcomeBtn.addEventListener('click', () => {
    showScreen('welcome');
});

// Settings radio buttons
document.querySelectorAll('input[name="shootingRules"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameState.shootingRule = e.target.value;
        updateRuleDescription();
    });
});

// Grid size radio buttons
document.querySelectorAll('input[name="gridSize"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameState.gridSize = parseInt(e.target.value);
        gameState.maxShips = parseInt(e.target.dataset.maxShips);
        updateShipCountDisplay();
    });
});

// Fog of War radio buttons
document.querySelectorAll('input[name="fogOfWar"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameState.fogOfWar = e.target.value === 'on';
    });
});

// Power-Ups radio buttons
document.querySelectorAll('input[name="powerUps"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        gameState.powerUpsEnabled = e.target.value === 'on';
    });
});

// Ship count inputs
document.querySelectorAll('.ship-count').forEach(input => {
    input.addEventListener('change', (e) => {
        const shipName = e.target.dataset.ship;
        const count = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
        gameState.shipCounts[shipName] = count;
        e.target.value = count;
        updateShipCountDisplay();
    });
    
    // Update display on input event
    input.addEventListener('input', updateShipCountDisplay);
});

function updateShipCountDisplay() {
    const totalShips = Object.values(gameState.shipCounts).reduce((a, b) => a + b, 0);
    const shipCountDisplay = document.getElementById('ship-count-display');
    const shipErrorMessage = document.getElementById('ship-error-message');
    
    shipCountDisplay.textContent = `Total Ships: ${totalShips}/${gameState.maxShips}`;
    
    // Check for invalid settings - must have at least 1 ship and not exceed maxShips for grid
    const isValid = totalShips > 0 && totalShips <= gameState.maxShips;
    
    if (!isValid) {
        shipErrorMessage.style.display = 'block';
        startGameBtn.disabled = true;
    } else {
        shipErrorMessage.style.display = 'none';
        startGameBtn.disabled = false;
    }
}

function updateRuleDescription() {
    const descriptions = {
        oneshot: 'Get one shot per turn',
        twoshots: 'Get two shots per turn',
        threeshots: 'Get three shots per turn',
        tillmiss: 'Keep shooting until you miss a shot',
        shipfire: `Get ${gameState.player1.ships.length || 5} shots per turn (one per ship)`
    };
    ruleDescription.textContent = descriptions[gameState.shootingRule];
}

function updateBattleTitle() {
    const rule = gameState.shootingRule;
    let shots = gameState.shotsThisTurn;
    let maxShots = 1;
    
    if (rule === 'twoshots') maxShots = 2;
    else if (rule === 'threeshots') maxShots = 3;
    else if (rule === 'shipfire') {
        const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
        // Count remaining (non-sunk) ships for ship fire
        maxShots = currentPlayerData.ships.filter(ship => !ship.sunk).length;
    } else if (rule === 'tillmiss') maxShots = '∞';
    
    if (maxShots === '∞') {
        battleTitle.textContent = `Player ${gameState.currentPlayer} - Attack! (Shot: ${shots + 1})`;
    } else {
        battleTitle.textContent = `Player ${gameState.currentPlayer} - Attack! (${shots}/${maxShots})`;
    }
}

function updateLegend() {
    const normalLegend = document.getElementById('legend-normal');
    const fogOfWarLegend = document.getElementById('legend-fog-of-war');
    
    if (gameState.fogOfWar) {
        normalLegend.style.display = 'none';
        fogOfWarLegend.style.display = 'block';
    } else {
        normalLegend.style.display = 'block';
        fogOfWarLegend.style.display = 'none';
    }
}

// Power-Ups System
function updatePowerUps() {
    const powerUpsContainer = document.getElementById('power-ups-container');
    const powerPointsDisplay = document.getElementById('power-points');
    const sonarBtn = document.getElementById('sonar-btn');
    const extraShotBtn = document.getElementById('extra-shot-btn');
    const cloakBtn = document.getElementById('cloak-btn');
    const scopeBtn = document.getElementById('scope-btn');
    
    if (!gameState.powerUpsEnabled) {
        powerUpsContainer.style.display = 'none';
        return;
    }
    
    powerUpsContainer.style.display = 'block';
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    powerPointsDisplay.textContent = `Power Points: ${currentPlayerData.powerPoints}`;
    
    // Show Cloak or Scope based on fog of war setting
    if (gameState.fogOfWar) {
        cloakBtn.style.display = 'none';
        scopeBtn.style.display = 'flex';
    } else {
        cloakBtn.style.display = 'flex';
        scopeBtn.style.display = 'none';
    }
    
    // Enable/disable buttons based on power points, usage, and whether shots remain
    const hasMoreShots = canShootMore();
    const canUsePowerUp = currentPlayerData.powerPoints > 0 && !currentPlayerData.usedPowerUpThisTurn && hasMoreShots;
    sonarBtn.disabled = !canUsePowerUp;
    extraShotBtn.disabled = !canUsePowerUp;
    cloakBtn.disabled = !canUsePowerUp;
    scopeBtn.disabled = !canUsePowerUp;
}

function useSonar() {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    if (currentPlayerData.powerPoints < 1 || currentPlayerData.usedPowerUpThisTurn) return;
    
    currentPlayerData.powerPoints--;
    currentPlayerData.usedPowerUpThisTurn = true;
    gameState.sonarMode = true;
    
    alert('Sonar activated! Click a cell to reveal a 3x3 area around it.');
    updatePowerUps();
}

function revealSonarArea(row, col) {
    const enemyPlayerData = gameState.currentPlayer === 1 ? gameState.player2 : gameState.player1;
    const enemyBoard = document.getElementById('enemy-board');
    let shipsFound = [];
    
    // Check 3x3 area
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < gameState.gridSize && c >= 0 && c < gameState.gridSize) {
                const cellData = enemyPlayerData.board[r][c];
                const cellElement = enemyBoard.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                
                if (cellElement) {
                    cellElement.classList.add('sonar-reveal');
                    setTimeout(() => cellElement.classList.remove('sonar-reveal'), 2000);
                }
                
                if (cellData.hasShip && cellData.shipId !== null) {
                    const ship = enemyPlayerData.ships[cellData.shipId];
                    if (!shipsFound.includes(ship.name)) {
                        shipsFound.push(ship.name);
                    }
                }
            }
        }
    }
    
    gameState.sonarMode = false;
    
    if (shipsFound.length > 0) {
        alert(`Sonar detected: ${shipsFound.join(', ')}`);
    } else {
        alert('Sonar detected: No ships in area');
    }
}

function useExtraShot() {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    if (currentPlayerData.powerPoints < 1 || currentPlayerData.usedPowerUpThisTurn) return;
    
    currentPlayerData.powerPoints--;
    currentPlayerData.usedPowerUpThisTurn = true;
    currentPlayerData.extraShotUsed = true;
    
    alert('Extra shot granted! You have one additional shot this turn.');
    updatePowerUps();
}

function useCloak() {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    const enemyPlayerData = gameState.currentPlayer === 1 ? gameState.player2 : gameState.player1;
    if (currentPlayerData.powerPoints < 1 || currentPlayerData.usedPowerUpThisTurn) return;
    
    currentPlayerData.powerPoints--;
    currentPlayerData.usedPowerUpThisTurn = true;
    enemyPlayerData.cloakActive = true;
    
    alert('Cloak activated! Your opponent will not see feedback for their entire next turn.');
    updatePowerUps();
}

function useScope() {
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    if (currentPlayerData.powerPoints < 1 || currentPlayerData.usedPowerUpThisTurn) return;
    
    currentPlayerData.powerPoints--;
    currentPlayerData.usedPowerUpThisTurn = true;
    currentPlayerData.scopeActive = true;
    
    alert('Scope activated! You will see hit/miss feedback this turn.');
    updatePowerUps();
}

// Power-up button event listeners
document.getElementById('sonar-btn').addEventListener('click', useSonar);
document.getElementById('extra-shot-btn').addEventListener('click', useExtraShot);
document.getElementById('cloak-btn').addEventListener('click', useCloak);
document.getElementById('scope-btn').addEventListener('click', useScope);

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
    // Reset turn-specific flags before switching players
    const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
    currentPlayerData.extraShotUsed = false;
    currentPlayerData.scopeActive = false;
    currentPlayerData.cloakActive = false; // Reset cloak after turn ends
    
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
updateShipCountDisplay();