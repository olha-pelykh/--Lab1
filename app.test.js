/**
 * @jest-environment jsdom
 *
 * app.test.js — Baseline coverage tests for game.js (Tic-Tac-Toe)
 * ================================================================
 * Framework : Jest + JSDOM
 * Strategy  : All reachable branches are triggered through DOM interactions
 *             (clicks on gamecells / reset button) or by surgical
 *             document.querySelector mocks that simulate missing elements.
 *
 * ─── KNOWN UNREACHABLE CODE ─────────────────────────────────────────────────
 * The following items are structurally unreachable from tests WITHOUT
 * modifying game.js, so they will appear as uncovered in the report:
 *
 *   1. getGameBoardRows / getGameBoardColumns / getGameBoardDiagonals
 *      (lines 51-80) — defined inside the gameBoard IIFE but never called
 *      after the checkWinner refactor (dead code). Cannot be invoked from
 *      outside the closure.
 *
 *   2. highlightWinningCells validation guards (lines 243-250):
 *      – !Array.isArray(indices) || length === 0  → true branch
 *      – !indices.every(isValidIndex)             → true branch
 *      checkWinner() always produces valid indices; highlightWinningCells
 *      is a private closure method unreachable from tests directly.
 *
 *   3. parseSymbolToPlayer() default case (line 312-313) — only reachable
 *      with a symbol that is neither 'X' nor 'O', which never occurs in
 *      production gameplay.
 *
 * Every OTHER statement, branch, and function is covered below.
 * ────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// HTML FIXTURE  (mirrors index.html exactly)
// ═══════════════════════════════════════════════════════════════════════════
const HTML = `
<header><h1>Tic Tac Toe</h1></header>
<main>
  <p>Turn</p>
  <div class="scoreboard">
    <div class="score-card" id="score-player1">
      <span class="score-name">Player 1</span>
      <span class="score-value">0</span>
    </div>
    <div class="score-card" id="score-player2">
      <span class="score-name">Player 2</span>
      <span class="score-value">0</span>
    </div>
  </div>
  <div class="gameboard">
    <div class="gamecell" data-position="0"></div>
    <div class="gamecell" data-position="1"></div>
    <div class="gamecell" data-position="2"></div>
    <div class="gamecell" data-position="3"></div>
    <div class="gamecell" data-position="4"></div>
    <div class="gamecell" data-position="5"></div>
    <div class="gamecell" data-position="6"></div>
    <div class="gamecell" data-position="7"></div>
    <div class="gamecell" data-position="8"></div>
  </div>
  <button type="button">Reset</button>
</main>
<dialog class="names-dialog">
  <form>
    <p class="title">Let us start!</p>
    <p class="player-name">
      <label for="name1">Player 1 Name:</label>
      <input type="text" name="name1" id="name1" maxlength="15" required>
    </p>
    <p class="player-name">
      <label for="name2">Player 2 Name:</label>
      <input type="text" name="name2" id="name2" maxlength="15" required>
    </p>
    <button>Confirm</button>
  </form>
</dialog>
<dialog class="result-dialog">
  <h1>Player X Wins!</h1>
</dialog>
<footer><p>Made by Marc Frances</p></footer>
`;

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reset the DOM to the full HTML fixture and re-mock dialog prototype methods.
 * Must be called BEFORE loadModule() because game.js queries the DOM at the
 * top level the moment it is required.
 */
function setupDOM() {
    document.body.innerHTML = HTML;
    // JSDOM does not implement showModal / close; mock them on the prototype
    // so namesDialog.showModal() at module top level does not throw.
    HTMLDialogElement.prototype.showModal = jest.fn();
    HTMLDialogElement.prototype.close    = jest.fn();
}

/**
 * Clear the Jest module registry, then require game.js fresh.
 * Returns { Player, gameInitialization } from the module exports.
 * The module re-runs all top-level code (including showModal) on each call.
 */
function loadModule() {
    jest.resetModules();
    return require('./game.js');
}

/** Dispatch a MouseEvent click on the gamecell at the given data-position. */
function clickCell(position) {
    const sel  = '.gamecell[data-position="' + position + '"]';
    const cell = document.querySelector(sel);
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** Dispatch a MouseEvent click on the Reset button. */
function clickReset() {
    document.querySelector('main button')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

// ── Preset game sequences (verified tie-free until the declared outcome) ──────

/**
 * X wins on row-0.
 * Sequence : X:0, O:3, X:1, O:4, X:2
 * Board    : X | X | X
 *            O | O | _
 *            _ | _ | _
 */
function playXWinsRow0() {
    clickCell(0); clickCell(3);
    clickCell(1); clickCell(4);
    clickCell(2);
}

/**
 * Full board, no winner (tie).
 * Sequence : X:0, O:1, X:2, O:3, X:5, O:4, X:6, O:8, X:7
 * Board    : X | O | X
 *            O | O | X
 *            X | X | O
 */
function playTie() {
    clickCell(0); clickCell(1);
    clickCell(2); clickCell(3);
    clickCell(5); clickCell(4);
    clickCell(6); clickCell(8);
    clickCell(7);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. PLAYER FACTORY  (lines 7-18)
// ═══════════════════════════════════════════════════════════════════════════
describe('Player factory', () => {
    let Player;

    beforeAll(() => {
        setupDOM();
        ({ Player } = loadModule());
    });

    test('getSymbol() returns the assigned symbol', () => {
        expect(Player('Alice', 'X').getSymbol()).toBe('X');
        expect(Player('Bob',   'O').getSymbol()).toBe('O');
    });

    test('getName() returns the player name', () => {
        expect(Player('Alice', 'X').getName()).toBe('Alice');
    });

    test('getScore() starts at 0', () => {
        expect(Player('Alice', 'X').getScore()).toBe(0);
    });

    test('incrementScore() increases score by 1 per call', () => {
        const p = Player('Alice', 'X');
        p.incrementScore();
        expect(p.getScore()).toBe(1);
        p.incrementScore();
        expect(p.getScore()).toBe(2);
    });

    test('score is not directly accessible as a plain property (encapsulation)', () => {
        const p = Player('Alice', 'X');
        expect(p.score).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. MODULE TOP LEVEL — namesDialog.showModal() (line 21)
// ═══════════════════════════════════════════════════════════════════════════
describe('Module top level', () => {
    test('namesDialog.showModal() is invoked immediately when the module loads', () => {
        setupDOM();
        loadModule();
        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. NAMES DIALOG — confirm button click handler (lines 22-33)
// ═══════════════════════════════════════════════════════════════════════════
describe('Names dialog — confirm button', () => {
    beforeEach(() => {
        setupDOM();
        loadModule();
    });

    test('valid form: closes dialog and initialises game (if-branch, line 26-31)', () => {
        const form = document.querySelector('.names-dialog form');
        jest.spyOn(form, 'checkValidity').mockReturnValue(true);
        document.querySelector('#name1').value = 'Alice';
        document.querySelector('#name2').value = 'Bob';

        document.querySelector('.names-dialog button')
            .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        // Dialog must close and game title must update
        expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
        expect(document.querySelector('main p').textContent).toBe("Alice's Turn");
    });

    test('invalid form: dialog stays open, game not started (else / skip branch)', () => {
        const form = document.querySelector('.names-dialog form');
        jest.spyOn(form, 'checkValidity').mockReturnValue(false);

        document.querySelector('.names-dialog button')
            .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
        expect(document.querySelector('main p').textContent).toBe('Turn');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. gameInitialization — INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════
describe('gameInitialization — initial state', () => {
    let Player, gameInitialization;

    beforeEach(() => {
        setupDOM();
        ({ Player, gameInitialization } = loadModule());
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
    });

    test('sets turn title to first player', () => {
        expect(document.querySelector('main p').textContent).toBe("Alice's Turn");
    });

    test('populates scoreboard with player names (lines 193-206 body covered)', () => {
        expect(document.querySelector('#score-player1 .score-name').textContent)
            .toBe('Alice');
        expect(document.querySelector('#score-player2 .score-name').textContent)
            .toBe('Bob');
    });

    test('scoreboard score values start at 0', () => {
        expect(document.querySelector('#score-player1 .score-value').textContent).toBe('0');
        expect(document.querySelector('#score-player2 .score-value').textContent).toBe('0');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. checkWinner — GAME IN PROGRESS  (lines 141-142)
//    This is the "no winner yet, board not full" return path.
//    It fires after every non-decisive move via processGameResult.
//    Specifically targets the previously uncovered `return result` at line 142.
// ═══════════════════════════════════════════════════════════════════════════
describe('checkWinner — game in progress (lines 141-142)', () => {
    beforeEach(() => {
        setupDOM();
        const { Player, gameInitialization } = loadModule();
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
    });

    test('after 1 move: no winner or tie, turn switches to player 2', () => {
        // checkWinner is called; board not full, no combo complete → line 142
        clickCell(0);
        expect(document.querySelector('main p').textContent).toBe("Bob's Turn");
        expect(document.querySelector('.gameboard').hasAttribute('data-win-line')).toBe(false);
    });

    test('after 2 moves: still no result, turn switches back to player 1', () => {
        clickCell(0); clickCell(4);
        expect(document.querySelector('main p').textContent).toBe("Alice's Turn");
    });

    test('after 4 non-winning moves: board not full, no winner yet', () => {
        clickCell(0); clickCell(3);
        clickCell(1); clickCell(4);
        expect(document.querySelector('main p').textContent).toBe("Alice's Turn");
        expect(document.querySelector('.gameboard').hasAttribute('data-win-line')).toBe(false);
    });

    test('areItemsOfArrayEqual null-branch: all-null combos exercise arr[i]===null OR-side', () => {
        // First move triggers checkWinner.  Combos like [3,4,5] are [null,null,null].
        // i=0: null!==null is false → null===null is true → early return (null OR-branch).
        clickCell(0);
        // If we reach here the null branch did not throw.
        expect(true).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. checkWinner — ALL 8 WINNING COMBINATIONS
// ═══════════════════════════════════════════════════════════════════════════
describe('checkWinner — win detection (all 8 combinations)', () => {
    let Player, gameInitialization;

    beforeEach(() => {
        setupDOM();
        ({ Player, gameInitialization } = loadModule());
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
    });

    function assertXWin(lineKey) {
        expect(document.querySelector('.result-dialog h1').textContent)
            .toBe('Alice Wins!');
        expect(document.querySelector('.gameboard').getAttribute('data-win-line'))
            .toBe(lineKey);
        expect(document.querySelector('main p').textContent).toBe('Game End');
    }

    // ── Rows ────────────────────────────────────────────────────────────────
    test('row-0 win: X at positions 0,1,2', () => {
        clickCell(0); clickCell(3); clickCell(1); clickCell(4); clickCell(2);
        assertXWin('row-0');
    });

    test('row-1 win: X at positions 3,4,5', () => {
        clickCell(3); clickCell(0); clickCell(4); clickCell(1); clickCell(5);
        assertXWin('row-1');
    });

    test('row-2 win: X at positions 6,7,8', () => {
        clickCell(6); clickCell(0); clickCell(7); clickCell(1); clickCell(8);
        assertXWin('row-2');
    });

    // ── Columns ─────────────────────────────────────────────────────────────
    test('col-0 win: X at positions 0,3,6', () => {
        clickCell(0); clickCell(1); clickCell(3); clickCell(2); clickCell(6);
        assertXWin('col-0');
    });

    test('col-1 win: X at positions 1,4,7', () => {
        clickCell(1); clickCell(0); clickCell(4); clickCell(2); clickCell(7);
        assertXWin('col-1');
    });

    test('col-2 win: X at positions 2,5,8', () => {
        clickCell(2); clickCell(0); clickCell(5); clickCell(1); clickCell(8);
        assertXWin('col-2');
    });

    // ── Diagonals ───────────────────────────────────────────────────────────
    test('diag-main win: X at positions 0,4,8', () => {
        clickCell(0); clickCell(1); clickCell(4); clickCell(2); clickCell(8);
        assertXWin('diag-main');
    });

    test('diag-anti win: X at positions 2,4,6', () => {
        clickCell(2); clickCell(0); clickCell(4); clickCell(1); clickCell(6);
        assertXWin('diag-anti');
    });

    // ── O wins — covers parseSymbolToPlayer player2 branch ──────────────────
    test('O wins row-0: covers parseSymbolToPlayer player2 case', () => {
        // X:3, O:0, X:4, O:1, X:8, O:2
        clickCell(3); clickCell(0);
        clickCell(4); clickCell(1);
        clickCell(8); clickCell(2);
        expect(document.querySelector('.result-dialog h1').textContent).toBe('Bob Wins!');
        expect(document.querySelector('.gameboard').getAttribute('data-win-line')).toBe('row-0');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. checkWinner — TIE  (lines 137-139)
// ═══════════════════════════════════════════════════════════════════════════
describe('checkWinner — tie (lines 137-139)', () => {
    beforeEach(() => {
        setupDOM();
        const { Player, gameInitialization } = loadModule();
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
    });

    test('detects tie when board is full with no winner', () => {
        playTie();
        expect(document.querySelector('.result-dialog h1').textContent).toBe("It's a Tie");
        expect(document.querySelector('main p').textContent).toBe('Game End');
    });

    test('tie does not set data-win-line on the gameboard', () => {
        playTie();
        expect(document.querySelector('.gameboard').hasAttribute('data-win-line')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. SCORE TRACKING  (lines 331-333)
// ═══════════════════════════════════════════════════════════════════════════
describe('Score tracking', () => {
    let Player, gameInitialization;

    beforeEach(() => {
        setupDOM();
        ({ Player, gameInitialization } = loadModule());
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
    });

    test('player1 score increments when X wins (winnerId===player1 branch)', () => {
        playXWinsRow0();
        expect(document.querySelector('#score-player1 .score-value').textContent).toBe('1');
        expect(document.querySelector('#score-player2 .score-value').textContent).toBe('0');
    });

    test('player2 score increments when O wins (winnerId===player2 branch)', () => {
        clickCell(3); clickCell(0); clickCell(4); clickCell(1); clickCell(8); clickCell(2);
        expect(document.querySelector('#score-player2 .score-value').textContent).toBe('1');
        expect(document.querySelector('#score-player1 .score-value').textContent).toBe('0');
    });

    test('tie does not change either score', () => {
        playTie();
        expect(document.querySelector('#score-player1 .score-value').textContent).toBe('0');
        expect(document.querySelector('#score-player2 .score-value').textContent).toBe('0');
    });

    test('scores persist across rounds (cleanGame does not wipe scores)', () => {
        // Round 1: X (Alice) wins
        playXWinsRow0();
        expect(document.querySelector('#score-player1 .score-value').textContent).toBe('1');

        clickReset();
        // After reset currentPlayer is Bob (O) — he goes first in round 2.
        // O:0, X:3, O:1, X:4, O:2  → O wins row-0.
        clickCell(0); clickCell(3); clickCell(1); clickCell(4); clickCell(2);

        expect(document.querySelector('#score-player2 .score-value').textContent).toBe('1');
        // Alice's score from round 1 was NOT wiped
        expect(document.querySelector('#score-player1 .score-value').textContent).toBe('1');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. doPlayerTurn — GUARD CLAUSES  (lines 354, 357)
// ═══════════════════════════════════════════════════════════════════════════
describe('doPlayerTurn — guard clauses', () => {
    let Player, gameInitialization;

    beforeEach(() => {
        setupDOM();
        ({ Player, gameInitialization } = loadModule());
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
    });

    test('gameEnded guard (line 354): clicks after game ends are silently ignored', () => {
        playXWinsRow0();   // gameEnded = true
        clickCell(5);      // must be a no-op
        expect(document.querySelector('.gamecell[data-position="5"]').textContent).toBe('');
    });

    test('isCellTaken guard (line 357): clicking an occupied cell is a no-op', () => {
        clickCell(0);      // X occupies position 0
        clickCell(0);      // O tries the same cell
        expect(document.querySelector('.gamecell[data-position="0"]').textContent).toBe('X');
        // Turn did not advance for O — still Bob's turn
        expect(document.querySelector('main p').textContent).toBe("Bob's Turn");
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. changePlayerTurn — TERNARY BRANCHES  (lines 348-349)
// ═══════════════════════════════════════════════════════════════════════════
describe('changePlayerTurn — ternary branches', () => {
    beforeEach(() => {
        setupDOM();
        const { Player, gameInitialization } = loadModule();
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
    });

    test('gameEnded=false branch: displays next player turn message', () => {
        clickCell(0);
        expect(document.querySelector('main p').textContent).toBe("Bob's Turn");
    });

    test('gameEnded=true branch: displays "Game End" after a win', () => {
        playXWinsRow0();   // sets gameEnded=true before changePlayerTurn runs
        expect(document.querySelector('main p').textContent).toBe('Game End');
    });

    test('currentPlayer ternary: firstPlayer→secondPlayer and secondPlayer→firstPlayer', () => {
        clickCell(0);      // Alice → Bob  (firstPlayer→secondPlayer branch)
        expect(document.querySelector('main p').textContent).toBe("Bob's Turn");
        clickCell(4);      // Bob → Alice  (secondPlayer→firstPlayer branch)
        expect(document.querySelector('main p').textContent).toBe("Alice's Turn");
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. cleanGame — RESET BUTTON  (lines 364-368)
// ═══════════════════════════════════════════════════════════════════════════
describe('cleanGame — reset button', () => {
    let Player, gameInitialization;

    beforeEach(() => {
        setupDOM();
        ({ Player, gameInitialization } = loadModule());
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
    });

    test('clears all cell textContent', () => {
        clickCell(0); clickCell(4);
        clickReset();
        document.querySelectorAll('.gamecell').forEach(cell =>
            expect(cell.textContent).toBe('')
        );
    });

    test('removes gamecell--winner class from all cells', () => {
        playXWinsRow0();   // winning cells receive the class
        clickReset();
        document.querySelectorAll('.gamecell').forEach(cell =>
            expect(cell.classList.contains('gamecell--winner')).toBe(false)
        );
    });

    test('removes data-win-line attribute from .gameboard', () => {
        playXWinsRow0();
        clickReset();
        expect(document.querySelector('.gameboard').hasAttribute('data-win-line')).toBe(false);
    });

    test('updates turn title to the current player after reset', () => {
        clickCell(0);      // Alice → Bob's turn; currentPlayer is now Bob
        clickReset();
        expect(document.querySelector('main p').textContent).toBe("Bob's Turn");
    });

    test('allows new moves after reset (gameEnded is set back to false)', () => {
        playXWinsRow0();   // gameEnded = true
        clickReset();      // gameEnded = false
        clickCell(0);      // should succeed
        expect(document.querySelector('.gamecell[data-position="0"]').textContent).not.toBe('');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. winnerDialog CLICK HANDLER — backdrop click closes dialog (lines 156-159)
// ═══════════════════════════════════════════════════════════════════════════
describe('winnerDialog — click handler', () => {
    let Player, gameInitialization;

    beforeEach(() => {
        setupDOM();
        ({ Player, gameInitialization } = loadModule());
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
        HTMLDialogElement.prototype.close.mockClear();
    });

    test('clicking the dialog element itself closes it (event.target === dialog)', () => {
        const dialog = document.querySelector('.result-dialog');
        // Target IS the dialog element itself
        dialog.dispatchEvent(new MouseEvent('click', { bubbles: false }));
        expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
    });

    test('clicking a child element does NOT close the dialog (else branch)', () => {
        const h1 = document.querySelector('.result-dialog h1');
        // Bubbles up to dialog but event.target is h1, not the dialog
        h1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. initScoreboard — MISSING DOM ELEMENTS  (lines 193-207)
//     Specifically covers the body of initScoreboard (lines 193-196) and
//     the two inner branches (!card on line 200, if(nameEl) on line 206).
// ═══════════════════════════════════════════════════════════════════════════
describe('initScoreboard — missing DOM elements', () => {

    test('!card branch (line 200): warns and skips when score card is absent', () => {
        setupDOM();
        document.getElementById('score-player1').remove();
        document.getElementById('score-player2').remove();
        const { Player, gameInitialization } = loadModule();
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        expect(() => {
            gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
        }).not.toThrow();

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('score-player1')
        );
        console.warn.mockRestore();
    });

    test('if(nameEl) false branch (line 206): does not throw when .score-name is absent', () => {
        setupDOM();
        // Remove .score-name spans so nameEl === null inside the forEach
        document.querySelectorAll('.score-name').forEach(el => el.remove());
        const { Player, gameInitialization } = loadModule();

        expect(() => {
            gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
        }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. cleanGameboard — if(gameboard) FALSE BRANCH  (line 183)
// ═══════════════════════════════════════════════════════════════════════════
describe('cleanGameboard — missing .gameboard element (line 183)', () => {
    test('does not throw when .gameboard has been removed from the DOM', () => {
        setupDOM();
        const { Player, gameInitialization } = loadModule();
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));

        // gameCells NodeList was captured at module load and still holds references
        // to the detached cell nodes, so forEach runs safely on them.
        document.querySelector('.gameboard').remove();

        expect(() => clickReset()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. updateScore — MISSING DOM ELEMENTS  (lines 217-226)
// ═══════════════════════════════════════════════════════════════════════════
describe('updateScore — missing DOM elements', () => {

    test('!card branch (line 217): warns when score card is removed before win', () => {
        setupDOM();
        const { Player, gameInitialization } = loadModule();
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        document.getElementById('score-player1').remove();
        playXWinsRow0();   // triggers updateScore for player1

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('score-player1')
        );
        console.warn.mockRestore();
    });

    test('!scoreEl branch (line 222): warns when .score-value is removed before win', () => {
        setupDOM();
        const { Player, gameInitialization } = loadModule();
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        document.querySelector('#score-player1 .score-value').remove();
        playXWinsRow0();

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('.score-value')
        );
        console.warn.mockRestore();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. highlightWinningCells — DOM GUARDS AND CATCH BLOCKS  (lines 258-277)
//
//     highlightWinningCells is a private closure method called only from
//     processGameResult.  All branches are reached by triggering real wins
//     while the DOM is surgically modified via document.querySelector mocks.
//
//     IMPORTANT: the pre-fetched winningCell reference means clickCell() is
//     not affected by querySelector mocks set up afterwards, because
//     makePlayerMove() works with e.target (not a fresh querySelector call).
// ═══════════════════════════════════════════════════════════════════════════
describe('highlightWinningCells — DOM guard branches and catch blocks', () => {

    /**
     * Initialise a fresh game and play 4 moves so one more click at
     * position 2 will win row-0 for X.  Returns a direct reference to
     * that cell element so it can be dispatched without querySelector.
     */
    function setupNearWin() {
        setupDOM();
        const { Player, gameInitialization } = loadModule();
        gameInitialization(Player('Alice', 'X'), Player('Bob', 'O'));
        clickCell(0); clickCell(3);
        clickCell(1); clickCell(4);
        return document.querySelector('.gamecell[data-position="2"]');
    }

    // ── if(!cell) guard (line 258) ───────────────────────────────────────────
    test('warns when a winning gamecell is absent from DOM (if(!cell) branch)', () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        const winningCell = setupNearWin();

        // Cells 0 and 1 have already been played and will not be clicked again.
        // Removing them causes highlightWinningCells to get null for them.
        document.querySelector('.gamecell[data-position="0"]').remove();
        document.querySelector('.gamecell[data-position="1"]').remove();

        winningCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('data-position="0"')
        );
        console.warn.mockRestore();
    });

    // ── if(!gameboard) guard (line 271) ─────────────────────────────────────
    test('warns when .gameboard returns null from querySelector (if(!gameboard) branch)', () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        const winningCell = setupNearWin();

        const origQS = document.querySelector.bind(document);
        jest.spyOn(document, 'querySelector').mockImplementation(function(sel) {
            if (sel === '.gameboard') return null;
            return origQS(sel);
        });

        winningCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(console.warn).toHaveBeenCalledWith(
            'highlightWinningCells: .gameboard element not found; line will not be drawn.'
        );
        console.warn.mockRestore();
        jest.restoreAllMocks();
    });

    // ── catch block 1 (lines 264-266) ───────────────────────────────────────
    test('catch block fires when querySelector throws inside the cell forEach', () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        const winningCell = setupNearWin(); // grab ref BEFORE mocking

        const origQS = document.querySelector.bind(document);
        jest.spyOn(document, 'querySelector').mockImplementation(function(sel) {
            // Throw only when highlightWinningCells queries cells by data-position
            if (sel && sel.indexOf('gamecell[data-position') !== -1) {
                throw new Error('simulated DOM exception');
            }
            return origQS(sel);
        });

        // makePlayerMove uses e.target directly, so this dispatch works fine
        winningCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(console.warn).toHaveBeenCalledWith(
            'highlightWinningCells: unexpected error while adding winner class.',
            expect.any(Error)
        );
        console.warn.mockRestore();
        jest.restoreAllMocks();
    });

    // ── catch block 2 (lines 276-278) ───────────────────────────────────────
    test('catch block fires when gameboard.setAttribute throws', () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        const winningCell = setupNearWin();
        const realGameboard = document.querySelector('.gameboard');

        const origQS = document.querySelector.bind(document);
        jest.spyOn(document, 'querySelector').mockImplementation(function(sel) {
            if (sel === '.gameboard') {
                // Return a Proxy that throws when setAttribute is called
                return new Proxy(realGameboard, {
                    get: function(target, prop) {
                        if (prop === 'setAttribute') {
                            return function() { throw new Error('setAttribute error'); };
                        }
                        var val = target[prop];
                        return typeof val === 'function' ? val.bind(target) : val;
                    },
                });
            }
            return origQS(sel);
        });

        winningCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(console.warn).toHaveBeenCalledWith(
            'highlightWinningCells: unexpected error while setting win-line attribute.',
            expect.any(Error)
        );
        console.warn.mockRestore();
        jest.restoreAllMocks();
    });
});
