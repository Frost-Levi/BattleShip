# Battleship Game

A fully-featured, browser-based Battleship game with AI opponent, customizable rules, and power-ups system.

## Features

### Game Modes
- **PvP Mode**: Play against another player locally
- **AI Mode**: Challenge an AI opponent with 4 difficulty levels
  - Easy: Random targeting with bias toward edges
  - Medium: Checkerboard pattern strategy
  - Hard: Intelligent hunting near known hits
  - Impossible: Always finds and sinks ships

### Customizable Game Settings
- **Grid Sizes**: 7x7, 10x10, 12x12, 15x15
- **Shooting Rules**:
  - One Shot: 1 shot per turn
  - Two Shots: 2 shots per turn
  - Three Shots: 3 shots per turn
  - Shoot Till Miss: Keep shooting until you miss
  - Ship Fire: Number of shots = number of remaining ships
- **Fog of War**: Hide enemy hits until ships sink
- **Power-Ups System**: Earn power points to use special abilities
  - Sonar: Reveal a 3x3 area
  - Extra Shot: Take an extra shot
  - Cloak: Hide your cell hit feedback
  - Scope: See hidden feedback in fog of war

### Game Features
- Ship placement phase with validation
- Strategic battle phase with turn-based gameplay
- Hunt logic: AI intelligently hunts ships after getting a hit
- Power-up economy system
- Detailed game statistics and accuracy tracking
- Responsive design for various screen sizes

## Deployment

1. **Using Python**:
   ```powershell
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser

2. **Using Node.js HTTP Server**:
   ```powershell
   npx http-server
   ```

3. **Using VS Code Live Server Extension**:
   - Right-click `index.html` → Select "Open with Live Server"

## How to Play

### Setup Phase
1. Select game mode (PvP or AI)
2. Configure game settings (grid size, shooting rules, power-ups, fog of war)
3. Each player places their 5 ships on the board:
   - Carrier (5 cells)
   - Battleship (4 cells)
   - Cruiser (3 cells)
   - Submarine (3 cells)
   - Destroyer (2 cells)

### Battle Phase
1. Players take turns attacking enemy board cells
2. Hit: Ship cell is damaged
3. Miss: No damage
4. Sink: All cells of a ship are hit (awards power points if enabled)
5. Use power-ups strategically to gain advantages
6. First player to sink all enemy ships wins!

## File Structure

```
BattleShip/
├── index.html          # Main HTML file
├── style.css           # Styling
├── GameCode.js         # Game logic and AI system
└── README.md           # This file
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Any modern browser with ES6 support

## Technical Details

- **Pure JavaScript**: No external dependencies required
- **Responsive Design**: Works on desktop and tablet
- **AI Algorithm**: Difficulty-based targeting with hunt queues
- **State Management**: Centralized game state object

## License

Feel free to use this project for your own purposes! No attribution needed.

## AI Implementation

This project uses custom AI algorithms with difficulty-based strategies:

- **Easy AI**: Generates random targets with a slight bias toward board edges and corners for a relaxed challenge
- **Medium AI**: Uses a checkerboard pattern to efficiently cover the board while avoiding already-checked cells
- **Hard AI**: Implements intelligent hunt logic that prioritizes cells adjacent to known hits for strategic targeting
- **Impossible AI**: Direct ship targeting that always locates and eliminates vessels

The AI system includes:
- Hunt queue management for pursuing ships after initial hits
- Direction detection to follow ship orientations (horizontal/vertical)
- Adaptive targeting based on game rules and remaining ships

## Tools Used

- **GitHub Copilot**: AI-assisted code generation and debugging throughout development
- **Claude Haiku 4.5**: Multi-step task planning and complex feature implementation
- **VS Code**: Primary development environment

---

**Enjoy the game! Challenge the AI, customize your rules, and dominate the seas! **
