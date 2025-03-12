

window.addEventListener("load", function() {
  startGame();

  function startGame() {
    localStorage.setItem('spaceInvadersVersion', '1.0');

    const featureButton = document.getElementById('featureButton');
    if (featureButton) {
      featureButton.style.display = 'none';
    }

    const versionInfo = document.querySelector('.info p');
    if (versionInfo) {
      versionInfo.textContent = 'Versión 1.0 - Clásica por mi';
    }

    if (window.responsiveSystem && window.responsiveSystem.isMobileDevice()) {
      createTouchControls();
    }

    const startButton = document.getElementById('startButton');
    if (startButton) {
      startButton.click();
    }
  }

  function createTouchControls() {
    if (!window.responsiveSystem) return;

    const isMobile = window.responsiveSystem.isMobileDevice();
    if (!isMobile) return;

    console.log('Creando controles táctiles para dispositivo móvil');

    const touchSettings = window.responsiveSystem.getTouchSettings();

    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'touch-controls';

    controlsContainer.innerHTML = `
      <div style="display: flex; gap: 10px; margin-left: 10px;">
        <button id="touch-left" style="width: ${touchSettings.buttonSize}px; height: ${touchSettings.buttonSize}px; border-radius: 50%; background: rgba(255, 255, 255, ${touchSettings.buttonOpacity}); border: 2px solid #00ff00; color: #00ff00; font-size: 24px;">&larr;</button>
        <button id="touch-right" style="width: ${touchSettings.buttonSize}px; height: ${touchSettings.buttonSize}px; border-radius: 50%; background: rgba(255, 255, 255, ${touchSettings.buttonOpacity}); border: 2px solid #00ff00; color: #00ff00; font-size: 24px;">&rarr;</button>
      </div>
      <div style="margin-right: 10px;">
        <button id="touch-fire" style="width: ${touchSettings.buttonSize * 1.5}px; height: ${touchSettings.buttonSize}px; border-radius: 30px; background: rgba(255, 0, 0, ${touchSettings.buttonOpacity}); border: 2px solid #ff0000; color: white; font-family: 'Press Start 2P', monospace; font-size: 14px;">FIRE</button>
      </div>
    `;

    const gameWrapper = document.querySelector('.game-wrapper');
    if (gameWrapper) {
      gameWrapper.appendChild(controlsContainer);
    }

    setupTouchButtonEvents();
  }

  function setupTouchButtonEvents() {
    const touchLeftBtn = document.getElementById('touch-left');
    const touchRightBtn = document.getElementById('touch-right');
    const touchFireBtn = document.getElementById('touch-fire');

    if (!touchLeftBtn || !touchRightBtn || !touchFireBtn) return;

    touchLeftBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (window.keysPressed) window.keysPressed['ArrowLeft'] = true;
    });

    touchLeftBtn.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (window.keysPressed) window.keysPressed['ArrowLeft'] = false;
    });

    touchRightBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (window.keysPressed) window.keysPressed['ArrowRight'] = true;
    });

    touchRightBtn.addEventListener('touchend', function(e) {
      e.preventDefault();
      if (window.keysPressed) window.keysPressed['ArrowRight'] = false;
    });

    touchFireBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (window.gameRunning && typeof window.fireBullet === 'function') {
        const currentTime = Date.now();
        if (window.lastBulletTime && (currentTime - window.lastBulletTime > window.bulletCooldown)) {
          window.fireBullet();
          window.lastBulletTime = currentTime;
        }
      }
    });
  }
});
