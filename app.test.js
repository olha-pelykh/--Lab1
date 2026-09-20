/** @jest-environment jsdom */

const loadGame = ({includeScoreboard = true, includeGameboard = true, cellCount = 9, sparseGameCells = false} = {}) => {
    const scoreboard = includeScoreboard
        ? `
            <div class="scoreboard">
                <p data-score="player1">Player 1: 0</p>
                <p data-score="player2">Player 2: 0</p>
            </div>`
        : '';
    const cells = Array.from({length: cellCount}, (_, index) =>
        `<div class="gamecell" data-position="${index}"></div>`
    ).join('');
    const gameboard = includeGameboard
        ? `<div class="gameboard">${cells}</div>`
        : cells;

    document.body.innerHTML = `
        <main>
            <p>Turn</p>
            ${scoreboard}
            ${gameboard}
            <button type="button">Reset</button>
        </main>
        <dialog class="names-dialog">
            <form>
                <input id="name1" required>
                <input id="name2" required>
                <button type="button">Confirm</button>
            </form>
        </dialog>
        <dialog class="result-dialog">
            <h1>Result</h1>
        </dialog>
    `;

    HTMLDialogElement.prototype.showModal = function showModal() {
        this.open = true;
    };
    HTMLDialogElement.prototype.close = function close() {
        this.open = false;
    };

    const nativeQuerySelectorAll = document.querySelectorAll.bind(document);
    let restoreQuerySelectorAll = null;
    if (sparseGameCells) {
        const actualCells = Array.from(nativeQuerySelectorAll('.gamecell'));
        const sparseCells = actualCells.slice();
        let sparseCellReadCount = 0;
        Object.defineProperty(sparseCells, 2, {
            configurable: true,
            get: () => {
                sparseCellReadCount += 1;
                return sparseCellReadCount === 1 ? actualCells[2] : undefined;
            }
        });
        document.querySelectorAll = selector => (
            selector === '.gamecell' ? sparseCells : nativeQuerySelectorAll(selector)
        );
        restoreQuerySelectorAll = () => {
            document.querySelectorAll = nativeQuerySelectorAll;
        };
    }

    jest.resetModules();
    const game = require('./game.js');
    if (restoreQuerySelectorAll) restoreQuerySelectorAll();
    return game;
};

const getCells = () => Array.from(document.querySelectorAll('.gamecell'));

const startGame = (game, firstName = 'Alice', secondName = 'Bob') => {
    const firstPlayer = game.Player(firstName, 'X');
    const secondPlayer = game.Player(secondName, 'O');
    game.gameInitialization(firstPlayer, secondPlayer);
    return {firstPlayer, secondPlayer};
};

const playPositions = positions => {
    const cells = getCells();
    positions.forEach(position => {
        cells[position].dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
};

describe('Player factory', () => {
    test('keeps score private and exposes controlled score operations', () => {
        const {Player} = loadGame();
        const player = Player('Alice', 'X');

        expect(player.getName()).toBe('Alice');
        expect(player.getSymbol()).toBe('X');
        expect(player.getScore()).toBe(0);
        expect(Object.isFrozen(player)).toBe(true);

        player.increaseScore();
        expect(player.getScore()).toBe(1);
        expect(player.score).toBeUndefined();
    });
});

describe('game initialization and form handling', () => {
    test('does not initialize when the names form is invalid', () => {
        const game = loadGame();
        const confirmButton = document.querySelector('.names-dialog button');
        const form = document.querySelector('.names-dialog form');

        confirmButton.click();

        expect(form.checkValidity()).toBe(false);
        expect(document.querySelector('main p').textContent).toBe('Turn');
        expect(game.Player).toBeDefined();
    });

    test('initializes the game with valid names', () => {
        const game = loadGame();
        document.querySelector('#name1').value = 'Alice';
        document.querySelector('#name2').value = 'Bob';
        const confirmButton = document.querySelector('.names-dialog button');

        confirmButton.click();

        expect(document.querySelector('.names-dialog').open).toBe(false);
        expect(document.querySelector('main p').textContent).toBe("Alice's Turn");
        expect(document.querySelector('[data-score="player1"]').textContent).toBe('Alice: 0');
        expect(document.querySelector('[data-score="player2"]').textContent).toBe('Bob: 0');
        expect(game.gameInitialization).toEqual(expect.any(Function));
    });
});

describe('gameplay results', () => {
    const winningCases = [
        [[0, 3, 1, 4, 2], 'winning-row-top'],
        [[3, 0, 4, 1, 5], 'winning-row-middle'],
        [[6, 0, 7, 1, 8], 'winning-row-bottom'],
        [[0, 1, 3, 2, 6], 'winning-column-left'],
        [[1, 0, 4, 2, 7], 'winning-column-middle'],
        [[2, 0, 5, 1, 8], 'winning-column-right'],
        [[0, 1, 4, 2, 8], 'winning-diagonal-down'],
        [[2, 0, 4, 1, 6], 'winning-diagonal-up']
    ];

    test.each(winningCases)('draws the line for %s', (positions, winningClass) => {
        const game = loadGame();
        const {firstPlayer, secondPlayer} = startGame(game);

        playPositions(positions);

        const gameboard = document.querySelector('.gameboard');
        expect(gameboard.classList.contains(winningClass)).toBe(true);
        expect(firstPlayer.getScore()).toBe(1);
        expect(secondPlayer.getScore()).toBe(0);
        expect(document.querySelector('.result-dialog h1').textContent).toBe('Alice Wins!');
        expect(document.querySelector('main p').textContent).toBe('Game End');

        const firstCellText = getCells()[positions[0]].textContent;
        getCells()[positions[0]].dispatchEvent(new MouseEvent('click', {bubbles: true}));
        expect(getCells()[positions[0]].textContent).toBe(firstCellText);
    });

    test('shows a tie without increasing either score', () => {
        const game = loadGame();
        const {firstPlayer, secondPlayer} = startGame(game);

        playPositions([0, 1, 2, 4, 3, 5, 7, 6, 8]);

        expect(firstPlayer.getScore()).toBe(0);
        expect(secondPlayer.getScore()).toBe(0);
        expect(document.querySelector('.result-dialog h1').textContent).toBe("It's a Tie");
        expect(document.querySelector('main p').textContent).toBe('Game End');
    });

    test('increments the second player score when O wins', () => {
        const game = loadGame();
        const {firstPlayer, secondPlayer} = startGame(game);

        playPositions([0, 1, 3, 4, 8, 7]);

        expect(firstPlayer.getScore()).toBe(0);
        expect(secondPlayer.getScore()).toBe(1);
        expect(document.querySelector('.result-dialog h1').textContent).toBe('Bob Wins!');
    });

    test('throws the invalid-symbol error when no player matches the winner symbol', () => {
        const game = loadGame();
        const firstPlayer = {
            getName: () => 'Alice',
            getSymbol: jest.fn()
                .mockReturnValueOnce('X')
                .mockReturnValueOnce('X')
                .mockReturnValueOnce('X')
                .mockReturnValueOnce('X')
                .mockReturnValueOnce('X')
                .mockReturnValueOnce('X')
                .mockReturnValue('Z'),
            getScore: () => 0,
            increaseScore: jest.fn()
        };
        const secondPlayer = {
            getName: () => 'Bob',
            getSymbol: () => 'O',
            getScore: () => 0,
            increaseScore: jest.fn()
        };
        const errors = [];
        const errorHandler = event => {
            errors.push(event.error);
            event.preventDefault();
        };
        window.addEventListener('error', errorHandler);
        game.gameInitialization(firstPlayer, secondPlayer);

        playPositions([0, 3, 1, 4, 2]);

        window.removeEventListener('error', errorHandler);
        expect(errors[0]).toEqual(expect.any(Error));
        expect(errors[0].message).toBe('Invalid symbol provided');
    });

    test('ignores a move on an occupied cell', () => {
        const game = loadGame();
        startGame(game);
        const cell = getCells()[0];

        cell.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        cell.dispatchEvent(new MouseEvent('click', {bubbles: true}));

        expect(cell.textContent).toBe('X');
        expect(document.querySelector('main p').textContent).toBe("Bob's Turn");
    });

    test('resets the board, winning line, and current game state', () => {
        const game = loadGame();
        startGame(game);
        playPositions([0, 3, 1, 4, 2]);

        document.querySelector('main button').click();

        expect(document.querySelector('.gameboard').className).toBe('gameboard');
        expect(getCells().every(cell => cell.textContent === '')).toBe(true);
        expect(document.querySelector('main p').textContent).toBe("Bob's Turn");
    });

    test('closes the result dialog when its backdrop target is clicked', () => {
        const game = loadGame();
        startGame(game);
        playPositions([0, 3, 1, 4, 2]);

        const resultDialog = document.querySelector('.result-dialog');
        resultDialog.dispatchEvent(new MouseEvent('click', {bubbles: true}));

        expect(resultDialog.open).toBe(false);
    });
});

describe('defensive DOM handling', () => {
    test('warns and continues when score containers are missing', () => {
        const game = loadGame({includeScoreboard: false});
        const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

        startGame(game);

        expect(warning).toHaveBeenCalledWith('Score containers are missing from the page.');
        warning.mockRestore();
    });

    test('warns and continues when the gameboard element is missing', () => {
        const game = loadGame({includeGameboard: false});
        const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
        startGame(game);

        playPositions([0, 3, 1, 4, 2]);

        expect(warning).toHaveBeenCalledWith('Gameboard element is missing from the page.');
        warning.mockRestore();
    });

    test('warns when a winning combination references a missing cell', () => {
        const game = loadGame({sparseGameCells: true});
        const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
        startGame(game);

        playPositions([0, 3, 1, 4, 2]);

        expect(warning).toHaveBeenCalledWith('A winning combination references a missing game cell.');
        warning.mockRestore();
    });
});
