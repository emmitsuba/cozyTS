const canvas = document.getElementById('tetrisCanvas');
const context = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('nextPieceCanvas');
const nextPieceContext = nextPieceCanvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const topScoresList = document.getElementById('topScoresList');
const durationDisplay = document.getElementById('duration');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const gameMusic = document.getElementById('gameMusic');
// === EASTER EGG DOM ===
const easterEggTrigger = document.getElementById('easterEggTrigger');
const easterEggOverlay = document.getElementById('easterEggOverlay');
const closeEasterEggButton = document.getElementById('closeEasterEgg');
const acceptCoffeeButton = document.getElementById('acceptCoffeeButton')
const coffeeCup = document.getElementById('coffeeCup');
// === FIM EASTER EGG DOM ===

const instructionsOverlay = document.getElementById('instructionsOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const configOverlay = document.getElementById('configOverlay');

const volumeSlider = document.getElementById('volumeSlider');
const muteCheckbox = document.getElementById('muteCheckbox');

const nameEntryOverlay = document.getElementById('nameEntryOverlay');
const playerNameInput = document.getElementById('playerNameInput');
const saveNameButton = document.getElementById('saveNameButton');
const cancelNameButton = document.getElementById('cancelNameButton');

const BLOCK_SIZE = 20;
const COLS = canvas.width / BLOCK_SIZE;
const ROWS = canvas.height / BLOCK_SIZE;
const DROP_SPEED = 1000;
const COLORS = [null, '#F8E7D5', '#5A4E42', '#D67A4F', '#C0985A', '#829177', '#7D5A5A', '#A05244'];

const TETROMINOES = [
    null,
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,0,1],[1,1,1],[0,0,0]],
    [[1,1],[1,1]],
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[1,1,1],[0,0,0]],
    [[1,1,0],[0,1,1],[0,0,0]]
];

let board;
let currentPiece;
let currentPieceColorId;
let currentPieceX;
let currentPieceY;
let nextPiece;
let score = 0;
let gameOver = false;
let gameInterval;
let gamePaused = false;
let timerInterval;
let startTime;
let latestScore = 0;

function showNameEntry(scoreToSave) {
    latestScore = scoreToSave;
    playerNameInput.value = '';
    nameEntryOverlay.classList.add('active');
    playerNameInput.focus();
}

function hideNameEntry() {
    nameEntryOverlay.classList.remove('active');
}

function loadHighScoresList() {
    const scoresJson = localStorage.getItem('tetrisTopScores');
    
    const records = scoresJson ? JSON.parse(scoresJson) : [];
    const highestScore = records.length > 0 ? records[0].score : 0;
    highScoreDisplay.textContent = highestScore;

    return records;
}

function saveNewHighScore() {
    const playerName = playerNameInput.value.trim().substring(0, 15) || 'Anônimo';
    const records = loadHighScoresList();
    
    const newRecord = { score: latestScore, name: playerName };

    records.push(newRecord);
    records.sort((a, b) => b.score - a.score);

    const finalRecords = records.slice(0, 10);

    localStorage.setItem('tetrisTopScores', JSON.stringify(finalRecords));

    hideNameEntry();
    displayTopScores(finalRecords);
}

function checkAndPromptHighScore() {
    const records = loadHighScoresList();
    const topN = 10;
    
    const isNewHighscore = records.length < topN || score > records[topN - 1].score;
    
    if (isNewHighscore) {
        showNameEntry(score);
    }
}

function displayTopScores(records) {
    topScoresList.innerHTML = '';

    records.forEach((record, index) => {
        const li = document.createElement('li');
        if (index < 3) {
            li.classList.add('top-three');
        }
        li.innerHTML = `
            <span>${record.name}</span>
            <span>${record.score}</span>
        `;
        topScoresList.appendChild(li);
    });
    
    highScoreDisplay.textContent = records[0] ? records[0].score : 0;
}


function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        if (!gamePaused && !gameOver) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            durationDisplay.textContent = formatTime(elapsed);
        }
    }, 1000);
}

function loadVolume() {
    const savedVolume = parseFloat(localStorage.getItem('tetrisVolume')) || 0.5;
    const savedMute = localStorage.getItem('tetrisMute') === 'true';

    volumeSlider.value = savedVolume;
    muteCheckbox.checked = savedMute;
    
    gameMusic.volume = savedVolume;
    gameMusic.muted = savedMute;
}

function togglePause() {
    if (gameOver) return;
    
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        clearInterval(gameInterval);
        gameMusic.pause();
        pauseButton.textContent = 'CONTINUAR (P)';
        pauseOverlay.classList.add('active');
    } else {
        gameInterval = setInterval(moveDown, DROP_SPEED);
        if (!gameMusic.muted) gameMusic.play().catch(() => {});
        pauseButton.textContent = 'PAUSAR (P)';
        pauseOverlay.classList.remove('active');
        draw();
    }
}

function drawBlock(x, y, color, ctx) {
    if (ctx === undefined) ctx = context;
    
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0) {
                drawBlock(c, r, COLORS[board[r][c]]);
            }
        }
    }

    if (currentPiece) {
        for (let r = 0; r < currentPiece.length; r++) {
            for (let c = 0; c < currentPiece[r].length; c++) {
                if (currentPiece[r][c] === 1) {
                    drawBlock(currentPieceX + c, currentPieceY + r, COLORS[currentPieceColorId]);
                }
            }
        }
    }
}

function drawNextPiece() {
    nextPieceContext.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    const nextPieceColorId = TETROMINOES.indexOf(nextPiece);
    const offset = 0.5;
    
    for (let r = 0; r < nextPiece.length; r++) {
        for (let c = 0; c < nextPiece[r].length; c++) {
            if (nextPiece[r][c] === 1) {
                drawBlock(c + offset, r + offset, COLORS[nextPieceColorId], nextPieceContext);
            }
        }
    }
}


function generateNewPiece() {
    const nextIndex = TETROMINOES.indexOf(nextPiece);
    currentPiece = nextPiece;
    currentPieceColorId = nextIndex;
    
    currentPieceX = Math.floor(COLS / 2) - Math.floor(currentPiece.length / 2);
    currentPieceY = 0;

    const randomIndex = Math.floor(Math.random() * (TETROMINOES.length - 1)) + 1;
    nextPiece = TETROMINOES[randomIndex];
    drawNextPiece();

    if (checkCollision(0, 0, currentPiece)) {
        gameOver = true;
        clearInterval(gameInterval);
        clearInterval(timerInterval);
        gameMusic.pause();
        
        checkAndPromptHighScore();

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#F8E7D5';
        context.font = 'bold 20px Upheaval';
        context.textAlign = 'center';
        context.fillText('FIM DE JOGO!', canvas.width / 2, canvas.height / 2);
        
        startButton.textContent = 'RECOMEÇAR';
        startButton.disabled = false;
        pauseButton.disabled = true;
    }
}

function checkCollision(dx, dy, newPiece) {
    for (let r = 0; r < newPiece.length; r++) {
        for (let c = 0; c < newPiece[r].length; c++) {
            if (newPiece[r][c] === 1) {
                const newX = currentPieceX + c + dx;
                const newY = currentPieceY + r + dy;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function moveDown() {
    if (gameOver || gamePaused) return;

    if (!checkCollision(0, 1, currentPiece)) {
        currentPieceY++;
    } else {
        freezePiece();
        checkAndClearLines();
        generateNewPiece();
    }
    draw();
}

function freezePiece() {
    for (let r = 0; r < currentPiece.length; r++) {
        for (let c = 0; c < currentPiece[r].length; c++) {
            if (currentPiece[r][c] === 1) {
                const boardY = currentPieceY + r;
                const boardX = currentPieceX + c;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPieceColorId;
                }
            }
        }
    }
}

function checkAndClearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            linesCleared++;
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            r++;
        }
    }
    if (linesCleared > 0) {
        score += linesCleared * 100 * linesCleared;
        scoreDisplay.textContent = score;
    }
}

function rotate() {
    const N = currentPiece.length;
    const rotatedPiece = Array.from({ length: N }, () => Array(N).fill(0));
    
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            rotatedPiece[c][N - 1 - r] = currentPiece[r][c];
        }
    }

    if (!checkCollision(0, 0, rotatedPiece)) {
        currentPiece = rotatedPiece;
    }
    draw();
}

function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    scoreDisplay.textContent = score;
    gameOver = false;
    gamePaused = false;
    durationDisplay.textContent = '00:00';

    clearInterval(gameInterval);
    clearInterval(timerInterval);

    if (!gameMusic.muted) gameMusic.play().catch(e => console.log('Música não pôde iniciar sem interação.'));
    startTimer();

    const initialIndex = Math.floor(Math.random() * (TETROMINOES.length - 1)) + 1;
    nextPiece = TETROMINOES[initialIndex];
    generateNewPiece();
    
    gameInterval = setInterval(moveDown, DROP_SPEED);
    
    startButton.textContent = 'REINICIAR';
    startButton.disabled = true;
    pauseButton.disabled = false;
    
    pauseOverlay.classList.remove('active');
    configOverlay.classList.remove('active');
    
    draw();
}


document.addEventListener('DOMContentLoaded', () => {
    const initialRecords = loadHighScoresList();
    displayTopScores(initialRecords);

    const initialIndex = Math.floor(Math.random() * (TETROMINOES.length - 1)) + 1;
    nextPiece = TETROMINOES[initialIndex];
    drawNextPiece();
    draw();
    
    coffeeCup.style.display = 'none'; 
});

// === EASTER EGG LISTENERS ===
easterEggTrigger.addEventListener('click', () => {
    if (!gameOver && !gamePaused) {
        togglePause();
    }
    
    pauseOverlay.classList.remove('active');
    
    easterEggOverlay.classList.add('active');

    coffeeCup.style.display = 'none'; 
});

closeEasterEggButton.addEventListener('click', () => {
    easterEggOverlay.classList.remove('active');
    
    if (gamePaused) {
        pauseOverlay.classList.add('active');
    }
});

acceptCoffeeButton.addEventListener('click', () => {
    easterEggOverlay.classList.remove('active');
    
    coffeeCup.style.display = 'block'; 

    if (gamePaused) {
        pauseOverlay.classList.add('active');
    }
});
// === FIM EASTER EGG LISTENERS ===

startButton.addEventListener('click', () => {
    instructionsOverlay.classList.remove('active');
    resetGame();
});

document.getElementById('closeInstructions').addEventListener('click', () => {
    instructionsOverlay.classList.remove('active');
});

pauseButton.addEventListener('click', togglePause);
document.getElementById('resumeButton').addEventListener('click', togglePause);

document.getElementById('configButton').addEventListener('click', () => {
    if (!gameOver && !gamePaused) {
        togglePause();
    }
    configOverlay.classList.add('active');
});

document.getElementById('saveConfig').addEventListener('click', () => {
    configOverlay.classList.remove('active');
});

volumeSlider.addEventListener('input', (e) => {
    gameMusic.volume = e.target.value;
    localStorage.setItem('tetrisVolume', e.target.value);
    muteCheckbox.checked = false;
    gameMusic.muted = false;
    localStorage.setItem('tetrisMute', 'false');
});

muteCheckbox.addEventListener('change', (e) => {
    gameMusic.muted = e.target.checked;
    localStorage.setItem('tetrisMute', e.target.checked);
});

saveNameButton.addEventListener('click', saveNewHighScore);
cancelNameButton.addEventListener('click', hideNameEntry);
playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        saveNewHighScore();
    }
});


document.addEventListener('keydown', e => {
    if (gameOver) return;

    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }

    if (gamePaused) return;

    if (e.key === 'ArrowLeft') {
        if (!checkCollision(-1, 0, currentPiece)) currentPieceX--;
    } else if (e.key === 'ArrowRight') {
        if (!checkCollision(1, 0, currentPiece)) currentPieceX++;
    } else if (e.key === 'ArrowDown') {
        if (!checkCollision(0, 1, currentPiece)) {
            currentPieceY++;
            score += 1;
            scoreDisplay.textContent = score;
        } else {
            freezePiece();
            checkAndClearLines();
            generateNewPiece();
        }
    } else if (e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        rotate();
    }
    
    draw();
});