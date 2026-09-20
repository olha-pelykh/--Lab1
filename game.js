const gameCells = document.querySelectorAll('.gamecell');
const resetButton = document.querySelector('main button');

const namesDialog = document.querySelector('.names-dialog');
const namesDialogButton = namesDialog.querySelector('button');

const Player = (name, symbol) => {
    const getSymbol = () => symbol;
    const getName = () => name;

    // Private score counter — not exposed as a raw property,
    // so external code cannot mutate it directly.
    let score = 0;
    const getScore = () => score;
    const incrementScore = () => { score += 1; };

    return {getSymbol, getName, getScore, incrementScore};
}

//Inicialization of Players
namesDialog.showModal();
namesDialogButton.addEventListener('click', (event) => {
    const form = namesDialog.querySelector('form');
    const player1Name = form.querySelector('#name1');
    const player2Name = form.querySelector('#name2');
    if (form.checkValidity()) {
        event.preventDefault(); // Don't want to submit this form
        const player1 = Player(player1Name.value, 'X');
        const player2 = Player(player2Name.value, 'O');
        namesDialog.close();
        gameInitialization(player1, player2);
    } 
});

//Game Initialization after player names being chosen
function gameInitialization(player1, player2) {
    // Populate the scoreboard name labels as soon as player objects exist.
    // This call is placed here (before the IIFEs) so displayController can
    // reference it once it is ready inside gameInitialization's scope.
    const gameBoard = (() => {
        let gameBoardArray = [null, null, null, null, null, null, null, null, null];
    
        const addToArray = (symbol, position) => {
            gameBoardArray[position] = symbol;
        }
    
        const clearArray = () => {
            gameBoardArray = [null, null, null, null, null, null, null, null, null];
        }
    
        const getGameBoardRows = () => {
            const copyGameArray = [...gameBoardArray];
            const res = [];
            for (let i = 0; i < gameBoardArray.length / 3; i++) {
                res.push(copyGameArray.splice(0, 3));
            }
            return res;
        }
    
        const getGameBoardColumns = () => {
            const copyGameArray = [...gameBoardArray];
            const res = [[],[],[]];
            for (let i = 0; i < gameBoardArray.length; i++) {
                if (i % 3 === 0) {
                    res[0].push(copyGameArray[i]);
                } else if (i % 3 === 1) {
                    res[1].push(copyGameArray[i]);
                } else {
                    res[2].push(copyGameArray[i]);
                }
            }
            return res;
        }
    
        const getGameBoardDiagonals = () => {
            const copyGameArray = [...gameBoardArray];
            const diagonal1 = [copyGameArray[0], copyGameArray[4], copyGameArray[8]];
            const diagonal2 = [copyGameArray[2], copyGameArray[4], copyGameArray[6]];
            return [diagonal1, diagonal2];
        }
    
        const areItemsOfArrayEqual = (arr) => {
            const res = {
                areItemsEqual: null,
                winnerSymbol: ''
            };
            for (let i = 0; i < arr.length - 1; i++) {
                if (arr[i] !== arr[i + 1] || arr[i] === null) {
                    res.areItemsEqual = false;
                    return res;
                }
            }
            res.areItemsEqual = true;
            res.winnerSymbol = arr[0];
            return res;
        } 
    
        const checkWinner = () => {
            // Static lookup table: every possible winning combination with its board indices.
            // Stored here (not outside) to keep it private to the gameBoard closure.
            const WIN_COMBINATIONS = [
                // Rows
                { indices: [0, 1, 2], lineKey: 'row-0' },
                { indices: [3, 4, 5], lineKey: 'row-1' },
                { indices: [6, 7, 8], lineKey: 'row-2' },
                // Columns
                { indices: [0, 3, 6], lineKey: 'col-0' },
                { indices: [1, 4, 7], lineKey: 'col-1' },
                { indices: [2, 5, 8], lineKey: 'col-2' },
                // Diagonals
                { indices: [0, 4, 8], lineKey: 'diag-main' },
                { indices: [2, 4, 6], lineKey: 'diag-anti' },
            ];

            const result = {
                hasSomeoneWon: false,
                tie: false,
                winnerSymbol: '',
                winningIndices: [],  // board indices (0–8) of the three winning cells
                winLineKey: '',      // CSS data-attribute value used to draw the strike-through
            };

            // Check every winning combination against the current board state
            for (const combo of WIN_COMBINATIONS) {
                const cells = combo.indices.map(i => gameBoardArray[i]);
                const localRes = areItemsOfArrayEqual(cells);
                if (localRes.areItemsEqual) {
                    result.hasSomeoneWon = true;
                    result.winnerSymbol = localRes.winnerSymbol;
                    result.winningIndices = combo.indices;
                    result.winLineKey = combo.lineKey;
                    return result;
                }
            }

            // Tie: no nulls remain but no one won
            if (!gameBoardArray.includes(null)) {
                result.tie = true;
                return result;
            }

            return result;
        }
    
        return {addToArray, clearArray, checkWinner};
    
    })();
    
    
    const displayController = (() => {
        const playerTurnTitle = document.querySelector('main p');
        const winnerDialog = document.querySelector('.result-dialog');
        const winnerDialogMessage = winnerDialog.querySelector('h1');
    
        // Close dialog when click outside form
        winnerDialog.addEventListener('click', (event) => {
            if (event.target === winnerDialog) {
                winnerDialog.close();
            }
        });
        
        const addPlayerSymbol = (target, symbol) => {
            target.textContent = symbol;
        }
    
        const changePlayerTurnTitle = (message) => {
            playerTurnTitle.textContent = message;
        }
    
        const showResultDialog = (message) => {
            winnerDialogMessage.textContent = message;
            winnerDialog.showModal();
        }
    
        const cleanGameboard = () => {
            gameCells.forEach(cell => {
                cell.textContent = '';
                // Remove any winning-cell highlight applied in a previous round
                cell.classList.remove('gamecell--winner');
            });
            // Clear the CSS strike-through line from the gameboard element
            const gameboard = document.querySelector('.gameboard');
            if (gameboard) gameboard.removeAttribute('data-win-line');
        }

        /**
         * Writes each player's name into their score card.
         * Called once after player objects are created.
         * Emits console.warn (instead of throwing) when a score card is absent,
         * so missing DOM elements never crash the rest of the game.
         */
        const initScoreboard = (player1, player2) => {
            const cards = [
                { id: 'score-player1', player: player1 },
                { id: 'score-player2', player: player2 },
            ];

            cards.forEach(({ id, player }) => {
                const card = document.getElementById(id);
                if (!card) {
                    console.warn(`Score card element #${id} not found in the DOM. Score display skipped.`);
                    return;
                }
                // Write the player's chosen name into the label
                const nameEl = card.querySelector('.score-name');
                if (nameEl) nameEl.textContent = player.getName();
            });
        };

        /**
         * Reads the current score from a player object and updates the DOM.
         * @param {Object} player  - Player factory object with getScore().
         * @param {string} cardId  - ID of the score-card element to update.
         */
        const updateScore = (player, cardId) => {
            const card = document.getElementById(cardId);
            if (!card) {
                console.warn(`Score card element #${cardId} not found. Score update skipped.`);
                return;
            }
            const scoreEl = card.querySelector('.score-value');
            if (!scoreEl) {
                console.warn(`'.score-value' element not found inside #${cardId}. Score update skipped.`);
                return;
            }
            scoreEl.textContent = player.getScore();
        };
    
        /**
         * Highlights the three cells that formed the winning combination and
         * draws a CSS strike-through line over the gameboard.
         *
         * @param {number[]} indices  - Board indices (0–8) of the winning cells.
         * @param {string}   lineKey  - Data-attribute value that drives the CSS line.
         *
         * Validation rules:
         *   • indices must be a non-empty array
         *   • every index must be an integer in the range [0, 8]
         * Missing DOM elements are handled gracefully — no runtime errors are thrown.
         */
        const highlightWinningCells = (indices, lineKey) => {
            // --- Input validation ---
            if (!Array.isArray(indices) || indices.length === 0) {
                console.warn('highlightWinningCells: indices must be a non-empty array.');
                return;
            }
            const isValidIndex = (idx) => Number.isInteger(idx) && idx >= 0 && idx <= 8;
            if (!indices.every(isValidIndex)) {
                console.warn('highlightWinningCells: all indices must be integers between 0 and 8.', indices);
                return;
            }

            // --- Apply winner class to each winning cell ---
            try {
                indices.forEach(idx => {
                    // gameCells is a NodeList keyed by DOM order which matches data-position
                    const cell = document.querySelector(`.gamecell[data-position="${idx}"]`);
                    if (!cell) {
                        console.warn(`highlightWinningCells: cell with data-position="${idx}" not found.`);
                        return;
                    }
                    cell.classList.add('gamecell--winner');
                });
            } catch (err) {
                console.warn('highlightWinningCells: unexpected error while adding winner class.', err);
            }

            // --- Set data-win-line on the gameboard to trigger the CSS strike line ---
            try {
                const gameboard = document.querySelector('.gameboard');
                if (!gameboard) {
                    console.warn('highlightWinningCells: .gameboard element not found; line will not be drawn.');
                    return;
                }
                gameboard.setAttribute('data-win-line', lineKey);
            } catch (err) {
                console.warn('highlightWinningCells: unexpected error while setting win-line attribute.', err);
            }
        };

        return {addPlayerSymbol, changePlayerTurnTitle, showResultDialog, cleanGameboard, initScoreboard, updateScore, highlightWinningCells};
        
    })();
    
    // Initialise the scoreboard labels with player names once displayController is ready.
    displayController.initScoreboard(player1, player2);

    const game = ((firstPlayer, secondPlayer) => {
        let currentPlayer = firstPlayer;
        let gameEnded = false;
    
        //Initialization of PlayerTurnTitle
        displayController.changePlayerTurnTitle(`${currentPlayer.getName()}'s Turn`);
    
    
        const makePlayerMove = (cell, player) => {
            if(cell.textContent !== '') return true;
    
            displayController.addPlayerSymbol(cell, player.getSymbol() );
            gameBoard.addToArray(player.getSymbol(), cell.dataset.position);
            return false;
        }
    
        const parseSymbolToPlayer = (symbol, player1, player2) => {
            switch (symbol) {
                case player1.getSymbol():
                    return player1;
        
                case player2.getSymbol():
                    return player2;
    
                default:
                    throw new Error('Invalid symbol provided');
            }
        }
    
        const processGameResult = (player1, player2) => {
            const res = {gameEnded: false};
            
            const winnerObj = gameBoard.checkWinner();
            if (winnerObj.hasSomeoneWon) {
                const winnerPlayer = parseSymbolToPlayer(winnerObj.winnerSymbol, player1, player2);
                const message = `${winnerPlayer.getName()} Wins!`;

                // Draw the visual strike-through before showing the dialog
                displayController.highlightWinningCells(winnerObj.winningIndices, winnerObj.winLineKey);
                displayController.showResultDialog(message);

                // Increment the winner's score and reflect the change in the UI.
                // The score-card ID matches the order in which players were created.
                winnerPlayer.incrementScore();
                const winnerId = winnerPlayer === player1 ? 'score-player1' : 'score-player2';
                displayController.updateScore(winnerPlayer, winnerId);

                res.gameEnded = true;
            }
            else if (winnerObj.tie) {
                const message = `It's a Tie`;
                displayController.showResultDialog(message);
                // Ties do not award a point to either player.
                res.gameEnded = true;
            }
    
            return res;
        }
    
        const changePlayerTurn = () => {
            currentPlayer = currentPlayer === firstPlayer ? secondPlayer : firstPlayer;
            const message = gameEnded ? 'Game End' : `${currentPlayer.getName()}'s Turn`;
            displayController.changePlayerTurnTitle(message);
        }
    
        const doPlayerTurn = function(e) {
            if(gameEnded) return;
            
            const isCellTaken = makePlayerMove(e.target, currentPlayer);
            if(isCellTaken) return;
    
            const result = processGameResult(firstPlayer, secondPlayer);
            gameEnded = result.gameEnded;
            changePlayerTurn();
        }
    
        const cleanGame = function() {
            displayController.cleanGameboard();
            gameBoard.clearArray();
            displayController.changePlayerTurnTitle(`${currentPlayer.getName()}'s Turn`);
            gameEnded = false;
        }
    
        return {doPlayerTurn, cleanGame};
    
    })(player1, player2);
        
    resetButton.addEventListener('click', game.cleanGame);
    
    gameCells.forEach(cell => {
        cell.addEventListener('click', game.doPlayerTurn);
    });
}

// ─── Test-only export ────────────────────────────────────────────────────────
// Allows Jest to import top-level symbols.  Has zero effect in the browser
// because the `module` global does not exist there.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Player, gameInitialization };
}
