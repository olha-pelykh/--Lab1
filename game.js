const gameCells = document.querySelectorAll('.gamecell');
const resetButton = document.querySelector('main button');

const namesDialog = document.querySelector('.names-dialog');
const namesDialogButton = namesDialog.querySelector('button');

const Player = (name, symbol) => {
    let score = 0;

    const getSymbol = () => symbol;
    const getName = () => name;
    const getScore = () => score;
    const increaseScore = () => {
        score += 1;
    };

    // Expose only controlled operations so the score cannot be mutated externally.
    return Object.freeze({getSymbol, getName, getScore, increaseScore});
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
    const gameBoard = (() => {
        let gameBoardArray = [null, null, null, null, null, null, null, null, null];
    
        const addToArray = (symbol, position) => {
            gameBoardArray[position] = symbol;
        }
    
        const clearArray = () => {
            gameBoardArray = [null, null, null, null, null, null, null, null, null];
        }
    
        const checkWinner = () => {
            const winningCombinations = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];
    
            const result = {
                hasSomeoneWon: false,
                tie: false,
                winnerSymbol: '',
                winningIndexes: [],
            };
            
            // Return the indexes so the display layer can highlight the exact line.
            for (const combination of winningCombinations) {
                const [firstIndex, secondIndex, thirdIndex] = combination;
                const firstSymbol = gameBoardArray[firstIndex];
                if (firstSymbol !== null
                    && firstSymbol === gameBoardArray[secondIndex]
                    && firstSymbol === gameBoardArray[thirdIndex]) {
                    result.hasSomeoneWon = true;
                    result.winnerSymbol = firstSymbol;
                    result.winningIndexes = combination;
                    return result;
                }
            }
    
            //Checks tie
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
        const gameboardElement = document.querySelector('.gameboard');
        const player1Score = document.querySelector('[data-score="player1"]');
        const player2Score = document.querySelector('[data-score="player2"]');
    
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

        const updateScore = (firstPlayer, secondPlayer) => {
            if (!player1Score || !player2Score) {
                console.warn('Score containers are missing from the page.');
                return;
            }

            player1Score.textContent = `${firstPlayer.getName()}: ${firstPlayer.getScore()}`;
            player2Score.textContent = `${secondPlayer.getName()}: ${secondPlayer.getScore()}`;
        }

        const showWinningLine = (winningIndexes) => {
            const validIndexes = Array.isArray(winningIndexes)
                && winningIndexes.length > 0
                && winningIndexes.every(index => Number.isInteger(index) && index >= 0 && index <= 8);

            if (!validIndexes || !gameboardElement) {
                if (!gameboardElement) console.warn('Gameboard element is missing from the page.');
                return;
            }

            const missingCell = winningIndexes.some(index => !gameCells[index]);
            if (missingCell) {
                console.warn('A winning combination references a missing game cell.');
                return;
            }

            const combinationClass = {
                '0,1,2': 'winning-row-top',
                '3,4,5': 'winning-row-middle',
                '6,7,8': 'winning-row-bottom',
                '0,3,6': 'winning-column-left',
                '1,4,7': 'winning-column-middle',
                '2,5,8': 'winning-column-right',
                '0,4,8': 'winning-diagonal-down',
                '2,4,6': 'winning-diagonal-up'
            }[winningIndexes.join(',')];

            if (combinationClass) gameboardElement.classList.add(combinationClass);
        }
    
        const cleanGameboard = () => {
            gameCells.forEach(cell => {cell.textContent = ''})
            if (gameboardElement) {
                gameboardElement.className = 'gameboard';
            }
        }
    
        return {addPlayerSymbol, changePlayerTurnTitle, showResultDialog, updateScore, showWinningLine, cleanGameboard};
        
    })();
    
    const game = ((firstPlayer, secondPlayer) => {
        let currentPlayer = firstPlayer;
        let gameEnded = false;
    
        //Initialization of PlayerTurnTitle
        displayController.changePlayerTurnTitle(`${currentPlayer.getName()}'s Turn`);
        displayController.updateScore(firstPlayer, secondPlayer);
    
    
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
                winnerPlayer.increaseScore();
                displayController.updateScore(player1, player2);
                displayController.showWinningLine(winnerObj.winningIndexes);
                const message = `${winnerPlayer.getName()} Wins!`;
                displayController.showResultDialog(message);
                res.gameEnded = true;
            }
            else if (winnerObj.tie) {
                const message = `It's a Tie`;
                displayController.showResultDialog(message);
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {Player, gameInitialization};
}
