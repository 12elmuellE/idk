
class ResponsiveGameSystem {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.gameContainer = document.querySelector('.game-container');
    this.gameWrapper = document.querySelector('.game-wrapper');
    
    this.originalWidth = 800;
    this.originalHeight = 600;
    
    this.scaleFactor = 1;
    
    this.initialize();
  }
  
  initialize() {
    window.addEventListener('resize', this.resizeGame.bind(this));
    
    this.resizeGame();
    
    console.log('[Sistema Responsivo] Inicializado');
  }
  
  resizeGame() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const marginSpace = windowWidth <= 768 ? 30 : 50; 
    const availableHeight = windowHeight - marginSpace;
    
    let widthScale = (windowWidth - 40) / this.originalWidth;
    let heightScale = (availableHeight - 40) / this.originalHeight;
    
    this.scaleFactor = Math.min(widthScale, heightScale);
    
    const minScale = windowWidth <= 768 ? 0.4 : 0.5;
    const maxScale = windowWidth <= 768 ? 0.8 : 0.9;
    this.scaleFactor = Math.max(minScale, Math.min(this.scaleFactor, maxScale));
    
    this.gameWrapper.style.width = `${this.originalWidth * this.scaleFactor}px`;
    this.gameWrapper.style.height = `${this.originalHeight * this.scaleFactor}px`;
    
    this.gameWrapper.style.margin = '0 auto';
    this.gameWrapper.style.boxSizing = 'border-box';
    this.gameWrapper.style.border = 'none';
    this.gameWrapper.style.overflow = 'hidden'; 
    
    this.canvas.style.width = `${this.originalWidth * this.scaleFactor}px`;
    this.canvas.style.height = `${this.originalHeight * this.scaleFactor}px`;
    this.canvas.style.borderWidth = windowWidth <= 768 ? '1px' : '2px'; 
    
    const responsiveEvent = new CustomEvent('gameResized', {
      detail: {
        scaleFactor: this.scaleFactor,
        width: this.originalWidth * this.scaleFactor,
        height: this.originalHeight * this.scaleFactor
      }
    });
    window.dispatchEvent(responsiveEvent);
    
    this.adjustTextSizes();
    
    console.log(`[Sistema Responsivo] Juego escalado a ${this.scaleFactor.toFixed(2)}x`);
  }
  
  adjustTextSizes() {
    const titleScale = Math.max(0.7, this.scaleFactor);
    document.querySelector('h1').style.fontSize = `${2 * titleScale}rem`;
    
    
    const instructions = document.querySelector('.instructions p');
    if (instructions) {
      instructions.style.fontSize = `${0.8 * Math.max(0.8, this.scaleFactor)}rem`;
    }
    
    const buttons = document.querySelectorAll('button');
    const buttonScale = Math.max(0.6, this.scaleFactor);
    buttons.forEach(button => {
      button.style.fontSize = `${1 * buttonScale}rem`;
      button.style.padding = `${10 * buttonScale}px ${20 * buttonScale}px`;
    });
  }
  
  getHUDPositions() {
    
      score: {
        x: 20,
        y: 30,
        fontSize: Math.max(14, 18 * this.scaleFactor)
      },
      hiScore: {
        x: this.originalWidth / 2,
        y: 30,
        fontSize: Math.max(14, 18 * this.scaleFactor)
      },
      level: {
        x: this.originalWidth - 20,
        y: 30,
        fontSize: Math.max(14, 18 * this.scaleFactor)
      },
      lives: {
        x: 20,
        y: this.originalHeight - 20,
        fontSize: Math.max(14, 16 * this.scaleFactor),
        iconSize: Math.max(15, 20 * this.scaleFactor),
        spacing: Math.max(20, 30 * this.scaleFactor)
      },
      credit: {
        x: this.originalWidth - 20,
        y: this.originalHeight - 20,
        fontSize: Math.max(10, 14 * this.scaleFactor)
      }
    };
  }
  
  getScaleFactor() {
    return this.scaleFactor;
  }
  
  isMobileDevice() {
    return window.innerWidth < 768;
  }
  
  
  getTouchSettings() {
    return {
      enabled: this.isMobileDevice(),
      buttonSize: Math.max(40, 70 * this.scaleFactor), 
      buttonOpacity: 0.7,
      buttonGap: Math.max(3, 8 * this.scaleFactor)
    };
  }
  
  optimizeForDevice() {
    const isMobile = this.isMobileDevice();
    
    if (isMobile) {
      const pcInstructions = document.querySelector('.instructions p');
      if (pcInstructions) {
        pcInstructions.innerHTML = 'Usa los controles táctiles para jugar';
      }
      
      const touchControls = document.getElementById('touch-controls');
      if (touchControls) {
        touchControls.style.display = 'flex';
      } else {
      }
    }
    
    if (isMobile) {
      const isLandscape = window.innerWidth > window.innerHeight;
      
      if (!isLandscape) {
        this.showOrientationMessage();
      } else {
        this.hideOrientationMessage();
      }
      
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          const nowLandscape = window.innerWidth > window.innerHeight;
          if (!nowLandscape) {
            this.showOrientationMessage();
          } else {
            this.hideOrientationMessage();
          }
          this.resizeGame();
        }, 300);
      });
    }
    
    console.log(`[Sistema Responsivo] Optimización para ${isMobile ? 'móvil' : 'escritorio'} aplicada`);
  }
  
  showOrientationMessage() {
    let orientationMsg = document.getElementById('orientation-message');
    
    if (!orientationMsg) {
      orientationMsg = document.createElement('div');
      orientationMsg.id = 'orientation-message';
      orientationMsg.innerHTML = '<div>Para una mejor experiencia, gira tu dispositivo</div>';
      orientationMsg.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: 'Press Start 2P', monospace;
        font-size: 16px;
        text-align: center;
        padding: 20px;
      `;
      
      document.body.appendChild(orientationMsg);
    } else {
      orientationMsg.style.display = 'flex';
    }
  }
  
  hideOrientationMessage() {
    const orientationMsg = document.getElementById('orientation-message');
    if (orientationMsg) {
      orientationMsg.style.display = 'none';
    }
  }
}

window.responsiveSystem = new ResponsiveGameSystem();

window.addEventListener('load', () => {
  if (window.responsiveSystem) {
    window.responsiveSystem.optimizeForDevice();
  }
});
