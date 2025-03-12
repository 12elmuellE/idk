

class TouchControlSystem {
  constructor() {
    this.enabled = false;
    this.controlsVisible = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isTouching = false;
    this.controlElements = {
      container: null,
      leftBtn: null,
      rightBtn: null,
      fireBtn: null
    };
    
    
    this.settings = {
      buttonSize: 60,
      buttonOpacity: 0.6,
      buttonGap: 10,
      fireButtonScale: 1.5,
      animationDuration: 2
    };
    
    console.log('[Controles Táctiles] Sistema inicializado');
  }
  
  initialize() {
    if (this.enabled) return;
    
    
    const isMobile = window.responsiveSystem ? 
                    window.responsiveSystem.isMobileDevice() : 
                    ('ontouchstart' in window);
    
    if (!isMobile) {
      console.log('[Controles Táctiles] No se detectó dispositivo táctil');
      return;
    }
    
    this.enabled = true;
    
    if (window.responsiveSystem) {
      const touchSettings = window.responsiveSystem.getTouchSettings();
      this.settings.buttonSize = touchSettings.buttonSize || this.settings.buttonSize;
      this.settings.buttonOpacity = touchSettings.buttonOpacity || this.settings.buttonOpacity;
    }
    
    this.createTouchControls();
    
    this.setupCanvasTouchEvents();
    
    console.log('[Controles Táctiles] Activados');
  }
  
  createTouchControls() {
    if (this.controlsVisible) return;
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.error('[Controles Táctiles] No se encontró el canvas');
      return;
    }
    
    const isLandscape = window.innerWidth > window.innerHeight;
    
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'touch-controls';
    controlsContainer.style.cssText = `
      position: fixed;
      ${isLandscape ? 'bottom: 5px;' : 'bottom: 10px;'}
      left: 0;
      width: 100%;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
      z-index: 1000;
    `;
    
    const moveControls = document.createElement('div');
    moveControls.style.cssText = `
      display: flex;
      gap: ${this.settings.buttonGap}px;
      margin-left: 20px;
    `;
    
    const touchLeftBtn = document.createElement('button');
    touchLeftBtn.innerHTML = "&larr;";
    touchLeftBtn.style.cssText = `
      width: ${this.settings.buttonSize * 0.8}px;
      height: ${this.settings.buttonSize * 0.8}px;
      border-radius: 50%;
      background: rgba(0, 0, 0, ${this.settings.buttonOpacity + 0.1});
      border: 2px solid #00ff00;
      color: #00ff00;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
    `;
    
    
    const touchRightBtn = document.createElement('button');
    touchRightBtn.innerHTML = "&rarr;";
    touchRightBtn.style.cssText = touchLeftBtn.style.cssText;
    
    moveControls.appendChild(touchLeftBtn);
    moveControls.appendChild(touchRightBtn);
    
    const actionControls = document.createElement('div');
    actionControls.style.cssText = `
      margin-right: 20px;
    `;
    
    const touchFireBtn = document.createElement('button');
    touchFireBtn.innerText = "FIRE";
    touchFireBtn.style.cssText = `
      width: ${this.settings.buttonSize * this.settings.fireButtonScale}px;
      height: ${this.settings.buttonSize}px;
      border-radius: 30px;
      background: rgba(255, 0, 0, ${this.settings.buttonOpacity});
      border: 2px solid #ff0000;
      color: white;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      pointer-events: auto;
      animation: fireButtonPulse ${this.settings.animationDuration}s infinite;
      user-select: none;
      -webkit-user-select: none;
      position: fixed;
      bottom: 10px;
      right: 10px;
    `;
    
    actionControls.appendChild(touchFireBtn);
    
    controlsContainer.appendChild(moveControls);
    controlsContainer.appendChild(actionControls);
    
    const gameWrapper = document.querySelector('.game-wrapper');
    if (gameWrapper) {
      gameWrapper.appendChild(controlsContainer);
    } else {
      document.body.appendChild(controlsContainer);
    }
    
    this.setupTouchButtonEvents(touchLeftBtn, touchRightBtn, touchFireBtn);
    
    this.controlElements = {
      container: controlsContainer,
      leftBtn: touchLeftBtn,
      rightBtn: touchRightBtn,
      fireBtn: touchFireBtn
    };
    
    this.controlsVisible = true;
  }
  
  setupTouchButtonEvents(leftBtn, rightBtn, fireBtn) {
    if (!window.keysPressed) window.keysPressed = {};
    
    leftBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      window.keysPressed["ArrowLeft"] = true;
    });
    
    leftBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      window.keysPressed["ArrowLeft"] = false;
    });
    
    rightBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      window.keysPressed["ArrowRight"] = true;
    });
    
    rightBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      window.keysPressed["ArrowRight"] = false;
    });
    
    fireBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (window.gameRunning && typeof window.fireBullet === 'function') {
        const currentTime = Date.now();
        const bulletCooldown = window.bulletCooldown || 225;
        if (!window.lastBulletTime || (currentTime - window.lastBulletTime > bulletCooldown)) {
          window.fireBullet();
          window.lastBulletTime = currentTime;
        }
      }
    });
  }
  
  setupCanvasTouchEvents() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    canvas.addEventListener("touchstart", (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
      this.isTouching = true;
      
      if (event.touches[0].clientY < canvas.height / 2) {
        if (window.gameRunning && typeof window.fireBullet === 'function') {
          const currentTime = Date.now();
          const bulletCooldown = window.bulletCooldown || 225;
          if (!window.lastBulletTime || (currentTime - window.lastBulletTime > bulletCooldown)) {
            window.fireBullet();
            window.lastBulletTime = currentTime;
          }
        }
      }
    });
    
    canvas.addEventListener("touchmove", (event) => {
      if (!this.enabled || !this.isTouching) return;
      event.preventDefault();
      
      const touchX = event.touches[0].clientX;
      const diffX = touchX - this.touchStartX;
      
      if (Math.abs(diffX) > 10) {
        if (diffX > 0) {
          window.keysPressed["ArrowRight"] = true;
          window.keysPressed["ArrowLeft"] = false;
        } else {
          window.keysPressed["ArrowLeft"] = true;
          window.keysPressed["ArrowRight"] = false;
        }
        
        this.touchStartX = touchX;
      }
    });
    
    canvas.addEventListener("touchend", (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      
      this.isTouching = false;
      window.keysPressed["ArrowRight"] = false;
      window.keysPressed["ArrowLeft"] = false;
    });
    
    document.addEventListener('touchmove', (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });
  }
  
  show() {
    if (!this.controlElements.container) return;
    this.controlElements.container.style.display = 'flex';
    this.controlsVisible = true;
  }
  
  hide() {
    if (!this.controlElements.container) return;
    this.controlElements.container.style.display = 'none';
    this.controlsVisible = false;
  }
  
  toggle() {
    if (this.enabled) {
      this.enabled = false;
      this.hide();
      console.log('[Controles Táctiles] Desactivados');
    } else {
      this.enabled = true;
      this.initialize();
      this.show();
      console.log('[Controles Táctiles] Activados');
    }
    return this.enabled;
  }
  
  destroy() {
    if (this.controlElements.container) {
      this.controlElements.container.remove();
      this.controlElements = {
        container: null,
        leftBtn: null,
        rightBtn: null,
        fireBtn: null
      };
    }
    this.controlsVisible = false;
    this.enabled = false;
  }
}


window.touchControlSystem = new TouchControlSystem();


window.addEventListener('load', () => {
  if (window.touchControlSystem) {
    
    const isMobile = window.responsiveSystem ? 
                    window.responsiveSystem.isMobileDevice() : 
                    ('ontouchstart' in window);
    
    if (isMobile) {
      setTimeout(() => {
        window.touchControlSystem.initialize();
      }, 1000); 
    }
  }
});
