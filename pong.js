const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const PADDLE_WIDTH = 15, PADDLE_HEIGHT = 100;
const BALL_RADIUS = 10;
const PLAYER_X = 20, COMPUTER_X = canvas.width - PADDLE_WIDTH - 20;
const PADDLE_SPEED = 6, COMPUTER_SPEED = 4;

// Trail effect history
const ballTrail = [];
const TRAIL_LENGTH = 15;

// Game State
let playerY = (canvas.height - PADDLE_HEIGHT) / 2;
let computerY = (canvas.height - PADDLE_HEIGHT) / 2;
let ballX = canvas.width / 2, ballY = canvas.height / 2;
let ballSpeedX = 6 * (Math.random() > 0.5 ? 1 : -1);
let ballSpeedY = 4 * (Math.random() > 0.5 ? 1 : -1);
let playerScore = 0, computerScore = 0;
let upPressed = false, downPressed = false;
let ballColorHue = 0;

// Drawing Functions
function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color, glow = false) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    if (glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    ctx.fill();
    ctx.restore();
}

function drawNet() {
    ctx.strokeStyle = "#fff";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Net
    drawNet();

    // Paddles
    drawRect(PLAYER_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, "#fff");
    drawRect(COMPUTER_X, computerY, PADDLE_WIDTH, PADDLE_HEIGHT, "#fff");

    // Ball trail (draw oldest first, most transparent)
    for (let i = 0; i < ballTrail.length; i++) {
        const {x, y, hue} = ballTrail[i];
        ctx.save();
        ctx.globalAlpha = (i + 1) / (ballTrail.length * 2); // lower alpha for older trail
        drawCircle(x, y, BALL_RADIUS + i * 0.5, `hsl(${hue}, 85%, 60%)`);
        ctx.restore();
    }

    // Ball with glow and cycling color
    drawCircle(ballX, ballY, BALL_RADIUS, `hsl(${ballColorHue}, 85%, 60%)`, true);
}

// Paddle Movement (Mouse & Keyboard)
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    let mouseY = e.clientY - rect.top;
    playerY = mouseY - PADDLE_HEIGHT / 2;
    if (playerY < 0) playerY = 0;
    if (playerY > canvas.height - PADDLE_HEIGHT) playerY = canvas.height - PADDLE_HEIGHT;
});

window.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') upPressed = true;
    if (e.key === 'ArrowDown') downPressed = true;
});
window.addEventListener('keyup', e => {
    if (e.key === 'ArrowUp') upPressed = false;
    if (e.key === 'ArrowDown') downPressed = false;
});

// Collision Detection
function ballCollidesWithPaddle(paddleX, paddleY) {
    return (
        ballX + BALL_RADIUS > paddleX &&
        ballX - BALL_RADIUS < paddleX + PADDLE_WIDTH &&
        ballY + BALL_RADIUS > paddleY &&
        ballY - BALL_RADIUS < paddleY + PADDLE_HEIGHT
    );
}

// Ball & Game Logic
function update() {
    // Move player paddle via keyboard
    if (upPressed) playerY -= PADDLE_SPEED;
    if (downPressed) playerY += PADDLE_SPEED;
    if (playerY < 0) playerY = 0;
    if (playerY > canvas.height - PADDLE_HEIGHT) playerY = canvas.height - PADDLE_HEIGHT;

    // Move computer paddle
    if (computerY + PADDLE_HEIGHT/2 < ballY - 15) {
        computerY += COMPUTER_SPEED;
    } else if (computerY + PADDLE_HEIGHT/2 > ballY + 15) {
        computerY -= COMPUTER_SPEED;
    }
    if (computerY < 0) computerY = 0;
    if (computerY > canvas.height - PADDLE_HEIGHT) computerY = canvas.height - PADDLE_HEIGHT;

    // Move ball
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Wall collision
    if (ballY - BALL_RADIUS < 0 || ballY + BALL_RADIUS > canvas.height) {
        ballSpeedY = -ballSpeedY;
        ballY += ballSpeedY;
    }

    // Paddle collisions
    if (ballCollidesWithPaddle(PLAYER_X, playerY)) {
        ballSpeedX = Math.abs(ballSpeedX);
        // Add "spin" based on where the ball hit the paddle
        let impact = (ballY - (playerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
        ballSpeedY = 5 * impact;
        // Change color on hit
        ballColorHue = (ballColorHue + 40) % 360;
    }
    if (ballCollidesWithPaddle(COMPUTER_X, computerY)) {
        ballSpeedX = -Math.abs(ballSpeedX);
        let impact = (ballY - (computerY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
        ballSpeedY = 5 * impact;
        ballColorHue = (ballColorHue + 40) % 360;
    }

    // Score update
    if (ballX - BALL_RADIUS < 0) {
        computerScore++;
        resetBall();
    }
    if (ballX + BALL_RADIUS > canvas.width) {
        playerScore++;
        resetBall();
    }

    // Update scoreboard
    document.getElementById('playerScore').textContent = playerScore;
    document.getElementById('computerScore').textContent = computerScore;

    // Ball trail (push new, keep max length)
    ballTrail.push({x: ballX, y: ballY, hue: ballColorHue});
    if (ballTrail.length > TRAIL_LENGTH) ballTrail.shift();

    // Cycle color smoothly
    ballColorHue = (ballColorHue + 1) % 360;
}

function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeedX = 6 * (Math.random() > 0.5 ? 1 : -1);
    ballSpeedY = 4 * (Math.random() > 0.5 ? 1 : -1);
    // Reset color hue randomly for fun
    ballColorHue = Math.floor(Math.random() * 360);
    ballTrail.length = 0;
}

// Main Game Loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();