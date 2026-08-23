// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCB7Ar-Tsj67jlRUxuBgKn8c91y9Cd_rRs",
  authDomain: "flappy-bird-5afd3.firebaseapp.com",
  projectId: "flappy-bird-5afd3",
  storageBucket: "flappy-bird-5afd3.firebasestorage.app",
  messagingSenderId: "929675346253",
  appId: "1:929675346253:web:9285146efc70fef9d0b704",
  measurementId: "G-FQ0BXZH66P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Load bird character image sprite
const birdImg = new Image();
birdImg.src = "https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/yellowbird-midflap.png";

// Bird variables
let bird = {
    x: 50,
    y: 200,
    width: 34,
    height: 24,
    gravity: 0.6,
    lift: -9.5,
    velocity: 0
};

// Pipes variables
let pipes = [];
let pipeWidth = 55;
let pipeGap = 150;
let pipeSpeed = 3;
let frameCount = 0;
let score = 0;
let isGameOver = false;
let globalLeaderboard = [];
let playerName = "";
let isWaitingForName = false;

// Controls (Keyboard & Touch)
document.addEventListener("keydown", function(e) {
    if (e.code === "Space") {
        e.preventDefault();
        flap();
    }
});

canvas.addEventListener("click", function() {
    flap();
});

function flap() {
    if (isWaitingForName) return;

    if (isGameOver) {
        resetGame();
    } else {
        bird.velocity = bird.lift;
    }
}

function resetGame() {
    bird.y = 200;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    frameCount = 0;
    isGameOver = false;
    isWaitingForName = false;
}

// Fetch Top 5 scores from Firebase Firestore
async function fetchLeaderboard() {
    try {
        const snapshot = await db.collection("leaderboard")
            .orderBy("score", "desc")
            .limit(5)
            .get();
        
        globalLeaderboard = [];
        snapshot.forEach(doc => {
            globalLeaderboard.push(doc.data());
        });
    } catch (e) {
        console.error("Error fetching leaderboard: ", e);
    }
}

// Save score to Firebase
async function saveScoreToFirebase(name, finalScore) {
    if (!name.trim()) return;
    try {
        await db.collection("leaderboard").add({
            name: name.substring(0, 10),
            score: finalScore,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        fetchLeaderboard();
    } catch (e) {
        console.error("Error saving score: ", e);
    }
}

// Game Loop: Update physics and objects
function update() {
    if (isGameOver || isWaitingForName) return;

    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Check ground or ceiling collision
    if (bird.y + bird.height >= canvas.height || bird.y <= 0) {
        triggerGameOver();
    }

    // Generate pipes
    if (frameCount % 90 === 0) {
        let minHeight = 60;
        let maxHeight = canvas.height - pipeGap - 60;
        let height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        
        pipes.push({
            x: canvas.width,
            top: height,
            bottom: canvas.height - height - pipeGap,
            passed: false
        });
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;

        // Check collision with pipes
        if (
            bird.x < pipes[i].x + pipeWidth &&
            bird.x + bird.width > pipes[i].x &&
            (bird.y < pipes[i].top || bird.y + bird.height > canvas.height - pipes[i].bottom)
        ) {
            triggerGameOver();
        }

        // Add score when passing a pipe
        if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
            score++;
            pipes[i].passed = true;
        }

        // Remove off-screen pipes
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }

    frameCount++;
}

function triggerGameOver() {
    isGameOver = true;
    isWaitingForName = true;
    
    setTimeout(() => {
        let inputName = prompt("Game Over! Enter your name for the Global Leaderboard:", "Player");
        if (inputName) {
            playerName = inputName;
            saveScoreToFirebase(playerName, score);
        }
        isWaitingForName = false;
    }, 100);
}

// Game Loop: Draw graphics, Mario-style pipes with gold coin tops, character image, and leaderboard
function draw() {
    // Classic Mario sky blue background
    ctx.fillStyle = "#5c94fc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Mario-style green pipes with Gold Coins
    for (let i = 0; i < pipes.length; i++) {
        // Main pipe body (Bright Mario Green)
        ctx.fillStyle = "#00aa00";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;

        // Top Pipe Body
        ctx.fillRect(pipes[i].x, 0, pipeWidth, pipes[i].top);
        ctx.strokeRect(pipes[i].x, 0, pipeWidth, pipes[i].top);
        ctx.fillStyle = "#00cc00";
        ctx.fillRect(pipes[i].x - 4, pipes[i].top - 25, pipeWidth + 8, 25);
        ctx.strokeRect(pipes[i].x - 4, pipes[i].top - 25, pipeWidth + 8, 25);

        // Top Pipe Lip (Gold Style)
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(pipes[i].x - 4, pipes[i].top - 25, pipeWidth + 8, 25);
        ctx.strokeRect(pipes[i].x - 4, pipes[i].top - 25, pipeWidth + 8, 25);
        
        // Gold highlight line
        ctx.fillStyle = "#f39c12";
        ctx.fillRect(pipes[i].x, pipes[i].top - 20, pipeWidth, 4);

        // Bottom Pipe Body
        ctx.fillStyle = "#00aa00";
        ctx.fillRect(pipes[i].x, canvas.height - pipes[i].bottom, pipeWidth, pipes[i].bottom);
        ctx.strokeRect(pipes[i].x, canvas.height - pipes[i].bottom, pipeWidth, pipes[i].bottom);
        ctx.fillStyle = "#00cc00";
        ctx.fillRect(pipes[i].x - 4, canvas.height - pipes[i].bottom, pipeWidth + 8, 25);
        ctx.strokeRect(pipes[i].x - 4, canvas.height - pipes[i].bottom, pipeWidth + 8, 25);
        
        // Bottom gold highlight line
        ctx.fillStyle = "#f39c12";
        ctx.fillRect(pipes[i].x, canvas.height - pipes[i].bottom + 5, pipeWidth, 4);

        // Draw Gold Coin in the middle of the gap
        let coinX = pipes[i].x + pipeWidth / 2;
        let coinY = pipes[i].top + pipeGap / 2;

        ctx.fillStyle = "#f1c40f";
        ctx.strokeStyle = "#d35400";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(coinX, coinY, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f39c12";
        ctx.beginPath();
        ctx.arc(coinX, coinY, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px 'Courier New'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", coinX, coinY);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }

    // Draw the real bird character image
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    
    let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (bird.velocity / 10)));
    ctx.rotate(rotation);

    ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    
    ctx.restore();

    // Score display (Retro style)
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px 'Courier New'";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText("SCORE: " + score, 20, 40);
    ctx.fillText("SCORE: " + score, 20, 40);

    // Game Over & Leaderboard overlay
    if (isGameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 30px 'Courier New'";
        ctx.textAlign = "center";
        ctx.strokeText("GAME OVER", canvas.width / 2, 80);
        ctx.fillText("GAME OVER", canvas.width / 2, 80);

        ctx.fillStyle = "#fff";
        ctx.font = "18px 'Courier New'";
        ctx.fillText("Your Score: " + score, canvas.width / 2, 120);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 20px 'Courier New'";
        ctx.fillText("🌍 GLOBAL LEADERBOARD", canvas.width / 2, 180);

        ctx.font = "16px 'Courier New'";
        ctx.fillStyle = "#fff";
        let startY = 220;
        if (globalLeaderboard.length === 0) {
            ctx.fillText("Loading scores...", canvas.width / 2, startY + 20);
        } else {
            for (let j = 0; j < globalLeaderboard.length; j++) {
                let entry = globalLeaderboard[j];
                ctx.fillText(`${j + 1}. ${entry.name} - ${entry.score}`, canvas.width / 2, startY);
                startY += 35;
            }
        }

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 16px 'Courier New'";
        ctx.fillText("Click to restart", canvas.width / 2, 540);
        
        ctx.textAlign = "left";
    }
}

// Automatically run the game loop
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

fetchLeaderboard();
loop();