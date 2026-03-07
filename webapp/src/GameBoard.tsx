import { useState } from 'react';
import './GameBoard.css';

type PlayerTurn = 'P1' | 'P2';
type CellValue = '.' | 'B' | 'R';

export default function GameBoard() {
  const BOARD_SIZE = 11;
  // Calculate the total number of cells in the triangular board
  const TOTAL_CELLS = (BOARD_SIZE * (BOARD_SIZE + 1)) / 2;

  // State to track the board's cell values and the current player's turn
  const [board, setBoard] = useState<CellValue[]>(Array(TOTAL_CELLS).fill('.'));
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>('P1');

  // Handles clicking a cell: places a token if empty, then switches the turn
  const handleCellClick = (index: number) => {
    if (board[index] !== '.') return;
    const newBoard = [...board];
    newBoard[index] = currentTurn === 'P1' ? 'B' : 'R';
    setBoard(newBoard);
    setCurrentTurn(currentTurn === 'P1' ? 'P2' : 'P1');
  };

  const renderBoard = () => {
    const rows = [];
    let currentIndex = 0;
    
    // Dynamic width for responsive hexagons
    const hexWidth = 'clamp(30px, 8.5vmin, 130px)';

    // Loop through each row to build the triangular shape
    for (let row = 0; row < BOARD_SIZE; row++) {
      const rowCells = [];
      const cellsInThisRow = row + 1; // Number of cells increases by 1 each row

      for (let i = 0; i < cellsInThisRow; i++) {
        const cellIndex = currentIndex;
        const cellValue = board[cellIndex];

        // Determine the appropriate CSS class based on the cell's state
        let cellClass = 'hex-cell ';
        if (cellValue === '.') cellClass += 'hex-empty';
        else if (cellValue === 'B') cellClass += 'hex-p1';
        else if (cellValue === 'R') cellClass += 'hex-p2';

        rowCells.push(
          <button
            key={cellIndex}
            className={cellClass}
            style={{ width: hexWidth }} 
            onClick={() => handleCellClick(cellIndex)}
          >
            {cellValue === '.' ? '' : cellValue}
          </button>
        );
        currentIndex++;
      }

      rows.push(
        <div 
          key={row} 
          className="hex-row" 
          // Apply a negative margin-top to interlock the hexagon rows perfectly
          style={{ 
            marginTop: row === 0 ? '0' : `calc(${hexWidth} * -0.208 + 2px)` 
          }}
        >
          {rowCells}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="game-container">
      
      {/* TOP BAR: Game title and profile navigation */}
      <div className="game-top-bar">
        <h1 className="game-title">GAME Y</h1>
        <div className="game-profile-btn" title="Stats / Profile">
          Profile 👤
        </div>
      </div>

      <div className="game-main-layout">
        
        {/* LEFT SIDEBAR: Active turn indicator and chat panel */}
        <div className="game-sidebar">
          <div className={`game-panel ${currentTurn === 'P1' ? 'turn-p1' : 'turn-p2'}`}>
            <div className={`game-panel-header ${currentTurn === 'P1' ? 'text-p1' : 'text-p2'}`}>
              {currentTurn === 'P1' ? 'P1 TURN' : 'P2 TURN'}
            </div>
            <div style={{ fontSize: 'clamp(12px, 1vw, 16px)', color: '#aaa' }}>
              {currentTurn === 'P1' ? '(Blue)' : '(Red)'}
            </div>
          </div>
          
          <div className="game-panel chat-panel">
            <div className="game-panel-header" style={{ color: '#ccc' }}>CHAT</div>
            <div className="chat-content">...</div>
          </div>
        </div>

        {/* CENTER COLUMN: Main game board and background container */}
        <div className="board-column">
          <div className="board-wrapper">
            <div className="board-relative">
              
              {/* Triangular SVG background holding the hexagonal grid */}
              <svg 
                className="board-svg-bg"
                preserveAspectRatio="none" 
                viewBox="0 0 100 100" 
              >
                <polygon 
                  points="50,4 0,98 100,98" 
                  fill="#0a0a0a" 
                  stroke="#555555" 
                  strokeWidth="0.8" 
                  vectorEffect="nonScalingStroke" 
                />
              </svg>

              {/* The generated hexagonal grid overlay */}
              <div className="board-grid">
                {renderBoard()}
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Player statistics and action buttons */}
        <div className="game-sidebar">
          
          <div className="game-panel p1-card">
            <div className="game-panel-header text-p1">P1: USERN.</div>
            <div style={{ fontSize: 'clamp(12px, 1vw, 18px)', color: '#aaa' }}>Pts: 0</div>
          </div>

          <button className="game-action-btn btn-undo">UNDO</button>
          <button className="game-action-btn btn-end">END TURN</button>

          <div className="game-panel p2-card">
            <div className="game-panel-header text-p2">P2 (Bot)</div>
            <div style={{ fontSize: 'clamp(12px, 1vw, 18px)', color: '#aaa' }}>Pts: 0</div>
          </div>

        </div>

      </div>
    </div>
  );
}