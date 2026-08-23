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

// Bird variables
let bird = {
    x: 50,
    y: 150,
    width: 24,
    height: 24,
    gravity: 0.6,
    lift: -9.5,
    velocity: 0
};

// Pipes variables
let pipes = [];
let pipeWidth = 45;
let pipeGap = 130;
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
    bird.y = 150;
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

// Game Loop: Update
function update() {
    if (isGameOver || isWaitingForName) return;

    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    if (bird.y + bird.height >= canvas.height || bird.y <= 0) {
        triggerGameOver();
    }

    if (frameCount % 90 === 0) {
        let minHeight = 50;
        let maxHeight = canvas.height - pipeGap - 50;
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

        if (
            bird.x < pipes[i].x + pipeWidth &&
            bird.x + bird.width > pipes[i].x &&
            (bird.y < pipes[i].top || bird.y + bird.height > canvas.height - pipes[i].bottom)
        ) {
            triggerGameOver();
        }

        if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
            score++;
            pipes[i].passed = true;
        }

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

// Game Loop: Draw (Graphics & Leaderboard)
function draw() {
    ctx.fillStyle = "#70c5ce";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < pipes.length; i++) {
        ctx.fillStyle = "#2ecc71";
        ctx.strokeStyle = "#27ae60";
        ctx.lineWidth = 2;

        ctx.fillRect(pipes[i].x, 0, pipeWidth, pipes[i].top);
        ctx.strokeRect(pipes[i].x, 0, pipeWidth, pipes[i].top);

        ctx.fillRect(pipes[i].x, canvas.height - pipes[i].bottom, pipeWidth, pipes[i].bottom);
        ctx.strokeRect(pipes[i].x, canvas.height - pipes[i].bottom, pipeWidth, pipes[i].bottom);
    }

    ctx.fillStyle = "#f1c40f";
    ctx.strokeStyle = "#d35400";
    ctx.lineWidth = 2;
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    ctx.strokeRect(bird.x, bird.y, bird.width, bird.height);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px Arial";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText("Score: " + score, 15, 30);
    ctx.shadowBlur = 0;

    if (isGameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, 60);

        ctx.fillStyle = "#fff";
        ctx.font = "16px Arial";
        ctx.fillText("Your Score: " + score, canvas.width / 2, 95);

        ctx.fillStyle = "#e67e22";
        ctx.font = "bold 18px Arial";
        ctx.fillText("🌍 GLOBAL LEADERBOARD", canvas.width / 2, 145);

        ctx.font = "15px Arial";
        ctx.fillStyle = "#fff";
        let startY = 180;
        if (globalLeaderboard.length === 0) {
            ctx.fillText("Loading scores...", canvas.width / 2, startY + 20);
        } else {
            for (let j = 0; j < globalLeaderboard.length; j++) {
                let entry = globalLeaderboard[j];
                ctx.fillText(`${j + 1}. ${entry.name} - ${entry.score}`, canvas.width / 2, startY);
                startY += 30;
            }
        }

        ctx.fillStyle = "#f1c40f";
        ctx.font = "15px Arial";
        ctx.fillText("Click to restart", canvas.width / 2, 550);
        
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