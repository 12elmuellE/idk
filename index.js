window.addEventListener("load", function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const startButton = document.getElementById("startButton");
  const debugButton = document.getElementById("debugButton");

  let touchStartX = 0, isTouching = false;
  const gameWidth = canvas.width;
  const gameHeight = canvas.height;
  const playerWidth = 60;
  const playerHeight = 20;
  const playerSpeed = 8;
  const bulletSpeed = 12;
  const invaderWidth = 40;
  const invaderHeight = 30;
  const invaderRows = 5;
  const invaderCols = 10;
  const invaderSpacing = 20;
  const invaderDropSpeed = 30;

  window.gameWidth = gameWidth;
  window.gameHeight = gameHeight;

  let player, bullets, invaders, invaderMoveSpeed, invaderMoveDirection;
  let score, hiScore = 0, level = 1, lives;
  let gameRunning, gameState = "start";
  let keysPressed = {}, lastBulletTime = 0, bulletCooldown = 225;
  let invaderBullets = [], invaderShootingFrequency = 0.01;
  let shields = [], hitAnimation = false, hitAnimationStart = 0;
  let hitAnimationDuration = 1000, ufoPointsDisplay = [], explosions = [];

  window.player = player;
  window.bullets = bullets;
  window.invaders = invaders;
  window.score = score;
  window.lives = lives;
  window.createExplosion = createExplosion;
  window.invaderBullets = invaderBullets;
  
  function drawUfoPointsDisplay() {
    if (!ufoPointsDisplay || !Array.isArray(ufoPointsDisplay)) {
      ufoPointsDisplay = [];
      return;
    }

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.textAlign = "center";

    for (let i = ufoPointsDisplay.length - 1; i >= 0; i--) {
      const display = ufoPointsDisplay[i];
      if (!display) continue;

      const elapsed = Date.now() - display.startTime;

      if (elapsed < display.duration) {
        const opacity = 1 - elapsed / display.duration;
        ctx.globalAlpha = opacity;
        ctx.fillText(display.points.toString(), display.x + 30, display.y + 15);
      } else {
        ufoPointsDisplay.splice(i, 1);
      }
    }
    ctx.restore();
  }
  
  window.drawUfoPointsDisplay = drawUfoPointsDisplay;

  let ufo = {
    active: false,
    x: -60,
    y: 30,
    width: 60,
    height: 25,
    speed: 3,
    pointValue: 100,
    lastSpawnTime: 0,
    spawnInterval: 20000,
    soundInterval: 0,
  };

  try {
    const savedHiScore = localStorage.getItem("spaceInvadersHiScore");
    if (savedHiScore) hiScore = parseInt(savedHiScore);
  } catch (e) {
    console.error("Error loading high score:", e);
  }

  let touchControlsVisible = false;
  let touchLeftBtn, touchRightBtn, touchFireBtn;

  function createTouchControls() {
    if (touchControlsVisible) return;

    console.log("Creando controles táctiles para dispositivo móvil");
    const touchSettings = { enabled: true, buttonSize: 60, buttonOpacity: 0.5 };

    const controlsContainer = document.createElement("div");
    controlsContainer.id = "touch-controls";
    controlsContainer.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 0;
      width: 100%;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
      z-index: 1000;
    `;

    const moveControls = document.createElement("div");
    moveControls.style.cssText = `
      display: flex;
      gap: 10px;
      margin-left: 10px;
    `;

    touchLeftBtn = document.createElement("button");
    touchLeftBtn.innerHTML = "&larr;";
    touchLeftBtn.style.cssText = `
      width: ${touchSettings.buttonSize}px;
      height: ${touchSettings.buttonSize}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, ${touchSettings.buttonOpacity});
      border: 2px solid #00ff00;
      color: #00ff00;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    `;

    touchRightBtn = document.createElement("button");
    touchRightBtn.innerHTML = "&rarr;";
    touchRightBtn.style.cssText = touchLeftBtn.style.cssText;

    moveControls.appendChild(touchLeftBtn);
    moveControls.appendChild(touchRightBtn);

    const actionControls = document.createElement("div");
    actionControls.style.cssText = `margin-right: 10px;`;

    touchFireBtn = document.createElement("button");
    touchFireBtn.innerText = "FIRE";
    touchFireBtn.style.cssText = `
      width: ${touchSettings.buttonSize * 1.5}px;
      height: ${touchSettings.buttonSize}px;
      border-radius: 30px;
      background: rgba(255, 0, 0, ${touchSettings.buttonOpacity});
      border: 2px solid #ff0000;
      color: white;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      pointer-events: auto;
    `;

    actionControls.appendChild(touchFireBtn);
    controlsContainer.appendChild(moveControls);
    controlsContainer.appendChild(actionControls);
    document.querySelector(".game-wrapper").appendChild(controlsContainer);
    setupTouchButtonEvents();
    touchControlsVisible = true;
  }

  function setupTouchButtonEvents() {
    touchLeftBtn.addEventListener("touchstart", function (e) {
      e.preventDefault();
      keysPressed["ArrowLeft"] = true;
    });

    touchLeftBtn.addEventListener("touchend", function (e) {
      e.preventDefault();
      keysPressed["ArrowLeft"] = false;
    });

    touchRightBtn.addEventListener("touchstart", function (e) {
      e.preventDefault();
      keysPressed["ArrowRight"] = true;
    });

    touchRightBtn.addEventListener("touchend", function (e) {
      e.preventDefault();
      keysPressed["ArrowRight"] = false;
    });

    touchFireBtn.addEventListener("touchstart", function (e) {
      e.preventDefault();
      if (gameRunning) {
        const currentTime = Date.now();
        if (currentTime - lastBulletTime > bulletCooldown) {
          fireBullet();
          lastBulletTime = currentTime;
        }
      }
    });
  }

  canvas.addEventListener("touchstart", function (event) {
    event.preventDefault();
    touchStartX = event.touches[0].clientX;
    isTouching = true;
    if (!touchControlsVisible) createTouchControls();
    if (gameRunning && !touchControlsVisible) {
      const currentTime = Date.now();
      if (currentTime - lastBulletTime > bulletCooldown) {
        fireBullet();
        lastBulletTime = currentTime;
      }
    }
  });

  canvas.addEventListener("touchmove", function (event) {
    event.preventDefault();
    if (isTouching && gameRunning && !touchControlsVisible) {
      const touchX = event.touches[0].clientX;
      const diffX = touchX - touchStartX;
      if (diffX > 10) {
        keysPressed["ArrowRight"] = true;
        keysPressed["ArrowLeft"] = false;
      } else if (diffX < -10) {
        keysPressed["ArrowLeft"] = true;
        keysPressed["ArrowRight"] = false;
      } else {
        keysPressed["ArrowRight"] = false;
        keysPressed["ArrowLeft"] = false;
      }
      touchStartX = touchX;
    }
  });

  canvas.addEventListener("touchend", function (event) {
    event.preventDefault();
    if (!touchControlsVisible) {
      isTouching = false;
      keysPressed["ArrowRight"] = false;
      keysPressed["ArrowLeft"] = false;
    }
  });

  function initGame() {
    touchStartX = 0;
    isTouching = false;
    player = {
      x: gameWidth / 2 - playerWidth / 2,
      y: gameHeight - playerHeight - 20,
      width: playerWidth,
      height: playerHeight,
    };
    bullets = [];
    invaderBullets = [];
    initShields();
    score = 0;
    lives = 3;
    invaderMoveSpeed = 1;
    invaderMoveDirection = 1;

    invaders = [];
    for (let row = 0; row < invaderRows; row++) {
      for (let col = 0; col < invaderCols; col++) {
        invaders.push({
          x: col * (invaderWidth + invaderSpacing) + 50,
          y: row * (invaderHeight + invaderSpacing) + 50,
          width: invaderWidth,
          height: invaderHeight,
          type: row,
          alive: true,
        });
      }
    }
  }

  document.addEventListener("keydown", function (event) {
    keysPressed[event.key] = true;
    if (event.key === " " && gameRunning) {
      event.preventDefault();
      const currentTime = Date.now();
      if (currentTime - lastBulletTime > bulletCooldown) {
        fireBullet();
        lastBulletTime = currentTime;
      }
    }
  });

  document.addEventListener("keyup", function (event) {
    delete keysPressed[event.key];
  });

  startButton.addEventListener("click", function () {
    if (gameState === "start" || gameState === "gameover") {
      level = 1;
      initGame();
      gameRunning = true;
      gameState = "playing";
      startButton.innerText = "Pausar";
      requestAnimationFrame(gameLoop);
    } else if (gameState === "playing") {
      gameRunning = false;
      gameState = "paused";
      startButton.innerText = "Continuar";
      showPauseScreen();
    } else if (gameState === "paused") {
      gameRunning = true;
      gameState = "playing";
      startButton.innerText = "Pausar";
      requestAnimationFrame(gameLoop);
    }
  });

  debugButton.addEventListener("click", function () {
    if (window.errorHandler) {
      window.errorHandler.showDebugPanel();
    } else {
      console.error("Sistema de depuración no inicializado");
    }
  });

  let lastFrameTime = 0;
  const FPS = 60;
  const frameInterval = 1000 / FPS;

  function gameLoop(timestamp) {
    if (!gameRunning) return;

    window.player = player;
    window.bullets = bullets;
    window.invaders = invaders;
    window.score = score;
    window.lives = lives;
    window.keysPressed = keysPressed;
    window.bulletCooldown = bulletCooldown;
    window.lastBulletTime = lastBulletTime;
    window.gameRunning = gameRunning;
    window.fireBullet = fireBullet;
    window.playerSpeed = playerSpeed;
    window.bulletSpeed = bulletSpeed;
    window.hitAnimation = hitAnimation;
    window.hitAnimationStart = hitAnimationStart;
    window.hitAnimationDuration = hitAnimationDuration;

    const deltaTime = timestamp - lastFrameTime;
    if (deltaTime >= frameInterval) {
      lastFrameTime = timestamp - (deltaTime % frameInterval);

      updatePlayer();
      ctx.clearRect(0, 0, gameWidth, gameHeight);
      drawStars();
      drawPlayer();
      drawBullets();
      drawInvaders();
      drawInvaderBullets();
      drawShields();
      updateUfo();
      drawUfo();
      updateBullets();
      updateInvaders();
      updateInvaderBullets();

      try {
        checkCollisions();
        drawHUD();
        if (typeof drawUfoPoints === 'function') {
          drawUfoPoints();
        } else {
          drawUfoPointsDisplay();
        }
        updateAndDrawExplosions();
        checkWinCondition();

        if (score > hiScore) {
          hiScore = score;
          try {
            localStorage.setItem("spaceInvadersHiScore", hiScore.toString());
          } catch (e) {
            console.error("Error saving high score:", e);
          }
        }

        if (Math.random() < 0.03 && invaders.filter((inv) => inv.alive).length > 0) {
          playSound("invaderMove");
        }
      } catch (error) {
        console.error("Error en el bucle de juego:", error);
        if (window.errorHandler) {
          window.errorHandler.errorLog.push({
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
          });
        }
      }
    }
    requestAnimationFrame(gameLoop);
  }

  function updateUfo() {
    const currentTime = Date.now();
    if (!ufo.active) {
      if (currentTime - ufo.lastSpawnTime > ufo.spawnInterval) {
        ufo.active = true;
        ufo.x = -60;
        ufo.soundInterval = currentTime;
        const pointValues = [50, 100, 150, 200, 300];
        ufo.pointValue = pointValues[Math.floor(Math.random() * pointValues.length)];
      }
    }

    if (ufo.active) {
      ufo.x += ufo.speed;
      if (currentTime - ufo.soundInterval > 1000) {
        playSound("ufo");
        ufo.soundInterval = currentTime;
      }
      if (ufo.x > gameWidth + 60) {
        ufo.active = false;
        ufo.lastSpawnTime = currentTime;
      }
    }
  }

  function drawUfo() {
    if (!ufo.active) return;
    ctx.fillStyle = "#ff0000";
    const blockSize = ufo.width / 12;
    ctx.fillRect(ufo.x + blockSize * 4, ufo.y, blockSize * 4, blockSize);
    ctx.fillRect(ufo.x + blockSize * 2, ufo.y + blockSize, blockSize * 8, blockSize);
    ctx.fillRect(ufo.x, ufo.y + blockSize * 2, blockSize * 12, blockSize);
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(ufo.x + blockSize * (1 + i * 2), ufo.y + blockSize * 3, blockSize, blockSize);
    }
  }

  function updatePlayer() {
    if (keysPressed["ArrowLeft"] && player.x > 0) {
      player.x -= playerSpeed;
    }
    if (keysPressed["ArrowRight"] && player.x < gameWidth - player.width) {
      player.x += playerSpeed;
    }
  }

  function drawStars() {
    ctx.fillStyle = "white";
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * gameWidth;
      const y = Math.random() * gameHeight;
      const size = Math.random() * 2;
      ctx.fillRect(x, y, size, size);
    }
  }

  function drawPlayer() {
    const playerColor = "#00ff00";
    if (hitAnimation) {
      const elapsed = Date.now() - hitAnimationStart;
      if (elapsed < hitAnimationDuration) {
        ctx.fillStyle = Math.floor(elapsed / 150) % 2 === 0 ? "#ff0000" : playerColor;
      } else {
        hitAnimation = false;
        ctx.fillStyle = playerColor;
      }
    } else {
      ctx.fillStyle = playerColor;
    }

    const blockSize = player.width / 13;
    ctx.fillRect(player.x, player.y + player.height - blockSize, player.width, blockSize);
    ctx.fillRect(player.x + blockSize * 4, player.y + player.height - blockSize * 2, blockSize * 5, blockSize);
    ctx.fillRect(player.x + blockSize * 6, player.y, blockSize, player.height - blockSize * 2);
    ctx.fillRect(player.x + blockSize * 5, player.y + player.height - blockSize * 3, blockSize * 3, blockSize);
  }

  function drawHUD() {
    const hudPositions = {
      score: { x: 20, y: 30, fontSize: 18 },
      hiScore: { x: gameWidth / 2, y: 30, fontSize: 18 },
      level: { x: gameWidth - 20, y: 30, fontSize: 18 },
      lives: { x: 20, y: gameHeight - 20, fontSize: 16, iconSize: 20, spacing: 30 },
      credit: { x: gameWidth - 20, y: gameHeight - 20, fontSize: 14 },
    };

    ctx.fillStyle = "#ffffff";
    ctx.font = `${hudPositions.score.fontSize}px "Press Start 2P", monospace`;
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${score.toString().padStart(4, "0")}`, hudPositions.score.x, hudPositions.score.y);

    ctx.textAlign = "center";
    ctx.font = `${hudPositions.hiScore.fontSize}px "Press Start 2P", monospace`;
    ctx.fillText(`HI-SCORE: ${hiScore.toString().padStart(4, "0")}`, hudPositions.hiScore.x, hudPositions.hiScore.y);

    ctx.textAlign = "right";
    ctx.font = `${hudPositions.level.fontSize}px "Press Start 2P", monospace`;
    ctx.fillText(`NIVEL: ${level}`, hudPositions.level.x, hudPositions.level.y);

    ctx.textAlign = "left";
    ctx.font = `${hudPositions.lives.fontSize}px "Press Start 2P", monospace`;
    ctx.fillText(`P1:`, hudPositions.lives.x, hudPositions.lives.y);

    const lifeIconSize = hudPositions.lives.iconSize;
    const lifeSpacing = hudPositions.lives.spacing;
    for (let i = 0; i < lives; i++) {
      drawLifeIcon(hudPositions.lives.x + 40 + i * lifeSpacing, gameHeight - 30, lifeIconSize);
    }

    ctx.textAlign = "right";
    ctx.font = `${hudPositions.credit.fontSize}px "Press Start 2P", monospace`;
    ctx.fillText(`CREDIT: 00`, hudPositions.credit.x, hudPositions.credit.y);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gameHeight - 50);
    ctx.lineTo(gameWidth, gameHeight - 50);
    ctx.stroke();
  }

  function drawLifeIcon(x, y, size) {
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(x, y, size, size / 2);
    ctx.fillStyle = "#88ff88";
    ctx.fillRect(x + size / 2 - size / 6, y - size / 4, size / 3, size / 4);
  }

  function fireBullet() {
    const bullet = {
      x: player.x + player.width / 2 - 2,
      y: player.y - 10,
      width: 4,
      height: 15,
      color: "#00ffff",
    };
    bullets.push(bullet);
    playSound("shoot");
  }

  function drawBullets() {
    for (let bullet of bullets) {
      ctx.fillStyle = bullet.color;
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= bulletSpeed;
      if (bullets[i].y < 0) {
        bullets.splice(i, 1);
      }
    }
  }

  let invaderAnimFrame = 0;
  let lastInvaderAnimTime = 0;
  const invaderAnimInterval = 500;

  function drawInvaders() {
    const currentTime = Date.now();
    if (currentTime - lastInvaderAnimTime > invaderAnimInterval) {
      invaderAnimFrame = invaderAnimFrame === 0 ? 1 : 0;
      lastInvaderAnimTime = currentTime;
    }

    for (let invader of invaders) {
      if (invader.alive) {
        let color;
        switch (invader.type) {
          case 0: color = "#ff0000"; break;
          case 1: color = "#ff8800"; break;
          case 2: color = "#ffff00"; break;
          case 3: color = "#00ffff"; break;
          case 4: color = "#ff00ff"; break;
          default: color = "#ffffff";
        }

        ctx.fillStyle = color;

        if (invader.type === 0 || invader.type === 1) {
          drawSquidInvader(invader.x, invader.y, invader.width, invader.height, color, invaderAnimFrame);
        } else if (invader.type === 2 || invader.type === 3) {
          drawCrabInvader(invader.x, invader.y, invader.width, invader.height, color, invaderAnimFrame);
        } else {
          drawOctopusInvader(invader.x, invader.y, invader.width, invader.height, color, invaderAnimFrame);
        }
      }
    }
  }

  function drawSquidInvader(x, y, width, height, color, frame) {
    const blockSize = width / 8;
    ctx.fillStyle = color;

    if (frame === 0) {
      ctx.fillRect(x + blockSize * 3, y, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 2, y + blockSize, blockSize * 4, blockSize);
      ctx.fillRect(x + blockSize, y + blockSize * 2, blockSize * 6, blockSize);
      ctx.fillRect(x, y + blockSize * 3, blockSize * 8, blockSize);

      ctx.fillRect(x, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 2, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 5, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 7, y + blockSize * 4, blockSize, blockSize);
    } else {
      ctx.fillRect(x + blockSize * 3, y, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 2, y + blockSize, blockSize * 4, blockSize);
      ctx.fillRect(x + blockSize, y + blockSize * 2, blockSize * 6, blockSize);
      ctx.fillRect(x, y + blockSize * 3, blockSize * 8, blockSize);

      ctx.fillRect(x + blockSize, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 3, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 4, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 6, y + blockSize * 4, blockSize, blockSize);
    }
  }

  function drawCrabInvader(x, y, width, height, color, frame) {
    const blockSize = width / 10;
    ctx.fillStyle = color;

    if (frame === 0) {
      ctx.fillRect(x + blockSize * 2, y, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 6, y, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize, y + blockSize, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 4, y + blockSize, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 8, y + blockSize, blockSize, blockSize);
      ctx.fillRect(x, y + blockSize * 2, blockSize * 10, blockSize);
      ctx.fillRect(x, y + blockSize * 3, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 3, y + blockSize * 3, blockSize * 4, blockSize);
      ctx.fillRect(x + blockSize * 8, y + blockSize * 3, blockSize * 2, blockSize);
      ctx.fillRect(x, y + blockSize * 4, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 8, y + blockSize * 4, blockSize * 2, blockSize);
    } else {
      ctx.fillRect(x + blockSize * 2, y, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 6, y, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 1, y + blockSize, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 4, y + blockSize, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 8, y + blockSize, blockSize, blockSize);
      ctx.fillRect(x, y + blockSize * 2, blockSize * 10, blockSize);
      ctx.fillRect(x + blockSize, y + blockSize * 3, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 3, y + blockSize * 3, blockSize * 4, blockSize);
      ctx.fillRect(x + blockSize * 7, y + blockSize * 3, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 8, y + blockSize * 4, blockSize, blockSize);
    }
  }

  function drawOctopusInvader(x, y, width, height, color, frame) {
    const blockSize = width / 10;
    ctx.fillStyle = color;

    if (frame === 0) {
      ctx.fillRect(x + blockSize * 3, y, blockSize * 4, blockSize);
      ctx.fillRect(x + blockSize, y + blockSize, blockSize * 8, blockSize);
      ctx.fillRect(x, y + blockSize * 2, blockSize * 10, blockSize);
      ctx.fillRect(x, y + blockSize * 3, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 3, y + blockSize * 3, blockSize * 4, blockSize);
      ctx.fillRect(x + blockSize * 8, y + blockSize * 3, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 3, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 6, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 8, y + blockSize * 4, blockSize, blockSize);
    } else {
      ctx.fillRect(x + blockSize * 3, y, blockSize * 4, blockSize);
      ctx.fillRect(x + blockSize, y + blockSize, blockSize * 8, blockSize);
      ctx.fillRect(x, y + blockSize * 2, blockSize * 10, blockSize);
      ctx.fillRect(x, y + blockSize * 3, blockSize * 2, blockSize);
      ctx.fillRect(x + blockSize * 3, y + blockSize * 3, blockSize * 4, blockSize);
      ctx.fillRect(x + blockSize * 8, y + blockSize * 3, blockSize * 2, blockSize);
      ctx.fillRect(x, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 2, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 7, y + blockSize * 4, blockSize, blockSize);
      ctx.fillRect(x + blockSize * 9, y + blockSize * 4, blockSize, blockSize);
    }
  }

  function updateInvaders() {
    let moveDown = false;
    let aliveInvaders = invaders.filter((invader) => invader.alive);

    if (aliveInvaders.length > 0) {
      let leftmost = Math.min(...aliveInvaders.map((invader) => invader.x));
      let rightmost = Math.max(...aliveInvaders.map((invader) => invader.x + invader.width));

      if (rightmost >= gameWidth) {
        invaderMoveDirection = -1;
        moveDown = true;
      } else if (leftmost <= 0) {
        invaderMoveDirection = 1;
        moveDown = true;
      }
    }

    for (let invader of invaders) {
      if (invader.alive) {
        invader.x += invaderMoveSpeed * invaderMoveDirection;
        if (moveDown) invader.y += invaderDropSpeed;
        if (Math.random() < invaderShootingFrequency) fireInvaderBullet(invader);
      }
    }

    if (aliveInvaders.length > 0 && aliveInvaders.length < (invaderRows * invaderCols) / 2) {
      invaderMoveSpeed = 1.5;
    }
  }

  function fireInvaderBullet(invader) {
    let canShoot = true;
    const ix = invader.x + invader.width / 2;

    for (let other of invaders) {
      if (other.alive && other !== invader && other.y > invader.y &&
          ix >= other.x && ix <= other.x + other.width) {
        canShoot = false;
        break;
      }
    }

    if (canShoot) {
      invaderBullets.push({
        x: invader.x + invader.width / 2 - 2,
        y: invader.y + invader.height,
        width: 4,
        height: 10,
        color: "#ff8844",
      });
    }
  }

  function drawInvaderBullets() {
    for (let bullet of invaderBullets) {
      ctx.fillStyle = bullet.color;
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  }

  function updateInvaderBullets() {
    for (let i = invaderBullets.length - 1; i >= 0; i--) {
      invaderBullets[i].y += bulletSpeed / 1.5;
      if (invaderBullets[i].y > gameHeight) {
        invaderBullets.splice(i, 1);
      }
    }
  }

  function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (ufo.active && bullets[i] && checkCollision(bullets[i], ufo)) {
        ufo.active = false;
        ufo.lastSpawnTime = Date.now();
        bullets.splice(i, 1);
        score += ufo.pointValue;
        showUfoPoints(ufo.x, ufo.y, ufo.pointValue);
        createExplosion(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2);
        playSound("explosion");
        continue;
      }

      for (let j = 0; j < invaders.length; j++) {
        if (invaders[j].alive && bullets[i] && checkCollision(bullets[i], invaders[j])) {
          createExplosion(invaders[j].x + invaders[j].width / 2, invaders[j].y + invaders[j].height / 2);
          invaders[j].alive = false;
          bullets.splice(i, 1);
          let points = (5 - invaders[j].type) * 10;
          score += points;
          playSound("explosion");
          break;
        }
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      for (let j = shields.length - 1; j >= 0; j--) {
        for (let k = shields[j].blocks.length - 1; k >= 0; k--) {
          const block = shields[j].blocks[k];
          if (block.health > 0 && bullets[i] && checkCollision(bullets[i], block)) {
            damageShieldBlock(j, k);
            bullets.splice(i, 1);
            break;
          }
        }
        if (!bullets[i]) break;
      }
    }

    for (let i = invaderBullets.length - 1; i >= 0; i--) {
      if (checkCollision(invaderBullets[i], player)) {
        invaderBullets.splice(i, 1);
        lives--;

        if (lives <= 0) {
          gameRunning = false;
          gameState = "gameover";

          if (score > hiScore) {
            hiScore = score;
            try {
              localStorage.setItem("spaceInvadersHiScore", hiScore.toString());
            } catch (e) {
              console.error("Error saving high score:", e);
            }
            showGameOverScreen(true);
          } else {
            showGameOverScreen(false);
          }

          startButton.innerText = "Jugar de nuevo";
        } else {
          hitAnimation = true;
          hitAnimationStart = Date.now();
          canvas.style.transform = "translateX(5px)";
          setTimeout(() => {
            canvas.style.transform = "translateX(-5px)";
            setTimeout(() => {
              canvas.style.transform = "translateX(0)";
            }, 50);
          }, 50);
          playSound("hit");
        }
      }
    }

    for (let i = invaderBullets.length - 1; i >= 0; i--) {
      for (let j = shields.length - 1; j >= 0; j--) {
        for (let k = shields[j].blocks.length - 1; k >= 0; k--) {
          const block = shields[j].blocks[k];
          if (block.health > 0 && invaderBullets[i] && checkCollision(invaderBullets[i], block)) {
            damageShieldBlock(j, k);
            invaderBullets.splice(i, 1);
            break;
          }
        }
        if (!invaderBullets[i]) break;
      }
    }

    for (let invader of invaders) {
      if (invader.alive && invader.y + invader.height >= player.y) {
        gameRunning = false;
        alert("¡Los invasores han llegado! Juego Terminado. Puntuación: " + score);
        startButton.innerText = "Jugar de nuevo";
        break;
      }
    }

    function showUfoPoints(x, y, points) {
      ufoPointsDisplay.push({
        x: x,
        y: y,
        points: points,
        duration: 1000,
        startTime: Date.now(),
      });
    }

    function drawUfoPoints() {
      if (!ufoPointsDisplay || !Array.isArray(ufoPointsDisplay)) {
        ufoPointsDisplay = [];
        return;
      }

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign = "center";

      for (let i = ufoPointsDisplay.length - 1; i >= 0; i--) {
        const display = ufoPointsDisplay[i];
        if (!display) continue;

        const elapsed = Date.now() - display.startTime;

        if (elapsed < display.duration) {
          const opacity = 1 - elapsed / display.duration;
          ctx.globalAlpha = opacity;
          ctx.fillText(display.points.toString(), display.x + 30, display.y + 15);
        } else {
          ufoPointsDisplay.splice(i, 1);
        }
      }
      ctx.restore();
    }
  }

  function checkCollision(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function checkWinCondition() {
    const remainingInvaders = invaders.filter((invader) => invader.alive).length;

    if (remainingInvaders === 0 && gameRunning) {
      level++;
      showLevelCompleteScreen();
      invaderMoveSpeed += 0.5;
      invaderShootingFrequency += 0.004;
      gameRunning = false;

      setTimeout(() => {
        const currentScore = score;
        const currentLives = lives;
        initGame();
        score = currentScore;
        lives = currentLives;
        gameRunning = true;
        gameState = "playing";
        gameLoop();
      }, 3000);
    }
  }

  function showLevelCompleteScreen() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    drawStars();
    ctx.fillStyle = "#00ff00";
    ctx.font = '40px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText("NIVEL COMPLETADO", gameWidth / 2, gameHeight / 2 - 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillText(`PUNTUACIÓN: ${score}`, gameWidth / 2, gameHeight / 2 + 20);
    ctx.fillStyle = "#00ffff";
    ctx.fillText(`PREPARANDO NIVEL ${level}...`, gameWidth / 2, gameHeight / 2 + 70);
  }

  function showGameOverScreen(isNewHighScore) {
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    drawStars();

    const titleSize = 50;
    const scoreSize = 24;
    const instructionSize = 20;

    const restartText = "PRESIONA INICIAR PARA JUGAR DE NUEVO";

    ctx.fillStyle = "#ff0000";
    ctx.font = `${titleSize}px "Press Start 2P", monospace`;
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", gameWidth / 2, gameHeight / 2 - 50);

    ctx.fillStyle = "#ffffff";
    ctx.font = `${scoreSize}px "Press Start 2P", monospace`;
    ctx.fillText(`PUNTUACIÓN: ${score}`, gameWidth / 2, gameHeight / 2 + 20);

    if (isNewHighScore) {
      ctx.fillStyle = "#ffff00";
      ctx.fillText("¡NUEVA PUNTUACIÓN MÁXIMA!", gameWidth / 2, gameHeight / 2 + 70);
    }

    ctx.fillStyle = "#00ff00";
    ctx.font = `${instructionSize}px "Press Start 2P", monospace`;
    ctx.fillText(restartText, gameWidth / 2, gameHeight / 2 + 120);
  }

  function showPauseScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    const titleSize = 40;
    const instructionSize = 16;
    const continueText = "PRESIONA CONTINUAR PARA SEGUIR";

    ctx.fillStyle = "#ffffff";
    ctx.font = `${titleSize}px "Press Start 2P", monospace`;
    ctx.textAlign = "center";
    ctx.fillText("JUEGO PAUSADO", gameWidth / 2, gameHeight / 2 - 40);

    ctx.font = `${instructionSize}px "Press Start 2P", monospace`;
    ctx.fillText(continueText, gameWidth / 2, gameHeight / 2 + 40);
  }

  function createExplosion(x, y) {
    explosions.push({
      x: x,
      y: y,
      radius: 5,
      maxRadius: 20,
      alpha: 1,
      growing: true,
    });
  }

  function updateAndDrawExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
      const explosion = explosions[i];

      if (explosion.growing) {
        explosion.radius += 2;
        if (explosion.radius >= explosion.maxRadius) {
          explosion.growing = false;
        }
      } else {
        explosion.alpha -= 0.1;
        if (explosion.alpha <= 0) {
          explosions.splice(i, 1);
          continue;
        }
      }

      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${explosion.alpha})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 100, 0, ${explosion.alpha})`;
      ctx.fill();
    }
  }

  let audioContext;

  function initAudio() {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log("Web Audio API not supported in this browser");
    }
  }

  function playSound(type) {
    try {
      if (!audioContext) {
        try {
          initAudio();
        } catch (e) {
          return;
        }
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case "shoot":
          oscillator.type = "square";
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(60, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;

        case "explosion":
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;

        case "hit":
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1, audioContext.currentTime + 0.5);
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.5);
          break;

        case "shield":
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(250, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;

        case "ufo":
          oscillator.type = "square";
          oscillator.frequency.setValueAtTime(180, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(180, audioContext.currentTime + 0.4);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.6);
          break;

        case "invaderMove":
          oscillator.type = "square";
          oscillator.frequency.setValueAtTime(70 + Math.random() * 20, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
      }
    } catch (error) {
      console.error("Error al reproducir sonido:", error);
    }
  }

  function initShields() {
    shields = [];
    const shieldWidth = 80;
    const shieldHeight = 60;
    const shieldY = gameHeight - 150;
    const spacing = (gameWidth - 4 * shieldWidth) / 5;

    for (let i = 0; i < 4; i++) {
      const xPos = spacing + i * (shieldWidth + spacing);
      shields.push(createShield(xPos, shieldY, shieldWidth, shieldHeight));
    }
  }

  function createShield(x, y, width, height) {
    const shield = {
      x: x,
      y: y,
      width: width,
      height: height,
      blocks: [],
    };

    const blockWidth = width / 12;
    const blockHeight = height / 8;
    const shieldPattern = [
      "  ********  ",
      " ********** ",
      "************",
      "************",
      "************",
      "***      ***",
      "**        **",
    ];

    for (let row = 0; row < shieldPattern.length; row++) {
      for (let col = 0; col < shieldPattern[0].length; col++) {
        if (shieldPattern[row][col] === "*") {
          shield.blocks.push({
            x: x + col * blockWidth,
            y: y + row * blockHeight,
            width: blockWidth,
            height: blockHeight,
            health: 4,
            row: row,
            col: col,
          });
        }
      }
    }

    return shield;
  }

  function drawShields() {
    for (let shield of shields) {
      for (let block of shield.blocks) {
        if (block.health > 0) {
          switch (block.health) {
            case 4: ctx.fillStyle = "#00ff00"; break;
            case 3: ctx.fillStyle = "#88ff00"; break;
            case 2: ctx.fillStyle = "#aaff00"; break;
            case 1: ctx.fillStyle = "#ff9900"; break;
          }
          ctx.fillRect(block.x, block.y, block.width, block.height);
        }
      }
    }
  }

  function damageShieldBlock(shieldIndex, blockIndex) {
    const block = shields[shieldIndex].blocks[blockIndex];
    block.health--;

    if (block.health <= 0) {
      playSound("shield");
      const shield = shields[shieldIndex];
      const neighborOffsets = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ];

      if (Math.random() < 0.2) {
        for (const offset of neighborOffsets) {
          const neighborRow = block.row + offset.row;
          const neighborCol = block.col + offset.col;
          const neighborBlock = shield.blocks.find(
            (b) => b.row === neighborRow && b.col === neighborCol && b.health > 0
          );
          if (neighborBlock && neighborBlock.health > 1) {
            neighborBlock.health = Math.max(1, neighborBlock.health - 1);
          }
        }
      }
    }
  }

  showStartScreen();

  function drawPointsTable(x, y) {
    const invaderSize = 30;
    const textX = x + 50;
    ctx.textAlign = "left";

    ctx.fillStyle = "#ff0000";
    const ufoBlockSize = 2.5;
    const ufoX = x + 10;
    const ufoY = y;

    ctx.fillRect(ufoX + ufoBlockSize * 4, ufoY, ufoBlockSize * 4, ufoBlockSize);
    ctx.fillRect(ufoX + ufoBlockSize * 2, ufoY + ufoBlockSize, ufoBlockSize * 8, ufoBlockSize);
    ctx.fillRect(ufoX, ufoY + ufoBlockSize * 2, ufoBlockSize * 12, ufoBlockSize);
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(ufoX + ufoBlockSize * (1 + i * 2), ufoY + ufoBlockSize * 3, ufoBlockSize, ufoBlockSize);
    }

    ctx.fillStyle = "white";
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText("= ? PUNTOS", textX, y + 10);

    ctx.fillStyle = "#ff0000";
    drawSquidInvader(x, y + 40, invaderSize, invaderSize, "#ff0000", 0);
    ctx.fillStyle = "white";
    ctx.fillText("= 30 PUNTOS", textX, y + 40 + invaderSize / 2);

    ctx.fillStyle = "#ffff00";
    drawCrabInvader(x, y + 80, invaderSize, invaderSize, "#ffff00", 0);
    ctx.fillStyle = "white";
    ctx.fillText("= 20 PUNTOS", textX, y + 80 + invaderSize / 2);

    ctx.fillStyle = "#00ffff";
    drawOctopusInvader(x, y + 120, invaderSize, invaderSize, "#00ffff", 0);
    ctx.fillStyle = "white";
    ctx.fillText("= 10 PUNTOS", textX, y + 120 + invaderSize / 2);
  }

  function showStartScreen() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    drawStars();

    ctx.fillStyle = "#ffffff";
    ctx.font = '60px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText("SPACE", gameWidth / 2, gameHeight / 2 - 120);
    ctx.fillText("INVADERS", gameWidth / 2, gameHeight / 2 - 60);
    ctx.font = '14px "Press Start 2P", monospace';

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gameWidth / 2 - 300, gameHeight / 2);
    ctx.lineTo(gameWidth / 2 + 300, gameHeight / 2);
    ctx.stroke();

    drawPointsTable(gameWidth / 2 - 180, gameHeight / 2 + 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText("CONTROLES:", gameWidth / 2, gameHeight / 2 + 180);
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText("← → PARA MOVER", gameWidth / 2, gameHeight / 2 + 210);
    ctx.fillText("ESPACIO PARA DISPARAR", gameWidth / 2, gameHeight / 2 + 230);

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = "#ffff00";
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText("PRESIONA INICIAR", gameWidth / 2, gameHeight / 2 + 280);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillText(`MÁXIMA PUNTUACIÓN: ${hiScore.toString().padStart(4, "0")}`, gameWidth / 2, gameHeight / 2 - 180);

    ctx.textAlign = "left";
    ctx.fillText("1UP", 20, 30);
    ctx.textAlign = "center";
    ctx.fillText("HI-SCORE", gameWidth / 2, 30);

    ctx.textAlign = "right";
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(`CREDIT: 00`, gameWidth - 20, gameHeight - 20);
  }

  window.showStartScreen = showStartScreen;

  localStorage.setItem('spaceInvadersVersion', '1.0');
});