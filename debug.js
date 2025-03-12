
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.fixedIssues = [];
    this.active = true;
    this.autoFixEnabled = true;
    this.lastGameState = null;
    this.errorPatterns = new Map();
    this.errorCount = {};
    this.successfulFixes = {};
    this.pendingFunctions = new Set();
    this.setupErrorCapture();
    this.registerCommonErrorPatterns();
    console.log("[Sistema de Depuración] Inicializado");
  }

  setupErrorCapture() {
    window.addEventListener('error', (event) => {
      if (!this.active) return true;

      const error = {
        message: event.message,
        source: event.filename,
        lineNumber: event.lineno,
        colNumber: event.colno,
        timestamp: Date.now(),
        stack: event.error ? event.error.stack : null
      };

      
      const isDuplicate = this.errorLog.some(e => 
        e.message === error.message && 
        Date.now() - new Date(e.timestamp).getTime() < 5000
      );
      
      if (!isDuplicate) {
        this.errorLog.push(error);
        console.warn("[Sistema de Depuración] Error detectado:", error.message);
        
        const button = document.getElementById('debugButton');
        if (button && !button.classList.contains('error-detected')) {
          button.classList.add('error-detected');
          setTimeout(() => button.classList.remove('error-detected'), 3000);
        }
        
        this.errorCount[error.message] = (this.errorCount[error.message] || 0) + 1;
        
        if (this.autoFixEnabled) {
          this.attemptFix(error);
        }
      }
      
      event.preventDefault();
      return true;
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (!this.active) return;

      const error = {
        type: 'promise',
        message: event.reason ? (event.reason.message || 'Promesa rechazada') : 'Promesa rechazada',
        timestamp: Date.now(),
        stack: event.reason && event.reason.stack ? event.reason.stack : null
      };

      this.errorLog.push(error);
      console.warn("[Sistema de Depuración] Promesa rechazada:", error.message);
      
      this.errorCount[error.message] = (this.errorCount[error.message] || 0) + 1;
      
      if (this.autoFixEnabled) {
        this.attemptFix(error);
      }
      
      event.preventDefault();
    });

    this.setupGameMonitoring();
  }

  registerCommonErrorPatterns() {
    this.addErrorPattern(
      /Cannot read propert(?:y|ies) of (null|undefined)/i,
      (error) => {
        const propMatch = error.message.match(/of (?:null|undefined) \(reading ['"](.+)['"]\)/i);
        const propName = propMatch ? propMatch[1] : null;
        
        if (propName === 'style') {
          this.fixDOMElementStyleError();
          return true;
        }
        
        this.verifyEssentialVariables();
        return true;
      }
    );
    
    this.addErrorPattern(
      /(\w+) is not a function/i,
      (error) => {
        const functionMatch = error.message.match(/(\w+) is not a function/i);
        const functionName = functionMatch ? functionMatch[1] : null;
        
        if (functionName) {
          return this.restoreMissingFunction(functionName);
        }
        return false;
      }
    );
    
    this.addErrorPattern(
      /drawUfoPoints/i,
      (error) => {
        this.restoreDrawUfoPointsFunction();
        return true;
      }
    );
    
    this.addErrorPattern(
      /Maximum call stack size exceeded/i,
      () => {
        if (window.gameRunning) {
          window.gameRunning = false;
          setTimeout(() => {
            window.gameRunning = true;
            if (typeof window.gameLoop === 'function') {
              requestAnimationFrame(window.gameLoop);
            }
          }, 1000);
        }
        this.fixedIssues.push({
          error: 'Recursión infinita detectada',
          fix: 'Ciclo de juego reiniciado con retraso',
          timestamp: new Date().toISOString()
        });
        return true;
      }
    );
    
    this.addErrorPattern(
      /(canvas|ctx|context).* (undefined|null)/i,
      () => {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
          try {
            window.ctx = canvas.getContext('2d');
            this.fixedIssues.push({
              error: 'Contexto de canvas perdido',
              fix: 'Contexto de canvas restaurado',
              timestamp: new Date().toISOString()
            });
            return true;
          } catch (e) {
            console.error('[Sistema de Depuración] Error al restaurar contexto:', e);
          }
        }
        return false;
      }
    );
    
    this.addErrorPattern(
      /undefined is not an object/i,
      () => {
        this.verifyEssentialVariables();
        return true;
      }
    );
    
    this.addErrorPattern(
      /cannot set property/i,
      () => {
        this.verifyEssentialObjects();
        return true;
      }
    );
    
    this.addErrorPattern(
      /Type error/i,
      () => {
        this.verifyEssentialVariables();
        this.verifyVariableTypes();
        return true;
      }
    );
  }

  addErrorPattern(pattern, fixFunction) {
    this.errorPatterns.set(pattern, fixFunction);
  }

  setupGameMonitoring() {
    let lastFrameTime = Date.now();
    let frameCounter = 0;
    let lowFPSCounter = 0;
    let lastHealthCheck = Date.now();
    
    const checkGamePerformance = () => {
      if (!window.gameRunning) {
        this.lastGameState = window.gameState || "unknown";
        requestAnimationFrame(checkGamePerformance);
        return;
      }
      
      const now = Date.now();
      const elapsed = now - lastFrameTime;
      
      if (now - lastHealthCheck > 10000) {
        this.performHealthCheck();
        lastHealthCheck = now;
      }
      
      if (elapsed > 100) {
        lowFPSCounter++;
        if (lowFPSCounter > 30) {
          this.errorLog.push({
            type: 'performance',
            message: `Bajo rendimiento detectado: ${Math.floor(1000 / elapsed)} FPS`,
            timestamp: new Date().toISOString()
          });
          this.optimizePerformance();
          lowFPSCounter = 0;
        }
      } else {
        lowFPSCounter = 0;
      }
      
      if (elapsed > 5000 && window.gameRunning) {
        this.errorLog.push({
          type: 'freeze',
          message: 'Congelación del juego detectada',
          timestamp: new Date().toISOString()
        });
        this.recoverFromFreeze();
      }
      
      lastFrameTime = now;
      frameCounter++;
      
      if (frameCounter >= 100) {
        this.checkGameState();
        frameCounter = 0;
      }
      
      requestAnimationFrame(checkGamePerformance);
    };
    
    requestAnimationFrame(checkGamePerformance);
  }

  performHealthCheck() {
    this.verifyEssentialVariables();
    this.verifyScreenBoundaries();
    this.checkAsyncFunctions();
    this.monitorResourceUsage();
    
    this.ensureEventListeners();
    
    this.checkRequiredFunctions();
  }

  checkRequiredFunctions() {
    const requiredFunctions = [
      'gameLoop', 'updatePlayer', 'drawPlayer', 'checkCollisions', 'drawUfoPoints', 'drawUfoPointsDisplay'
    ];
    
    for (const funcName of requiredFunctions) {
      if (typeof window[funcName] !== 'function') {
        console.warn(`[Sistema de Depuración] Función requerida no encontrada: ${funcName}`);
        this.pendingFunctions.add(funcName);
        
        if (funcName === 'drawUfoPoints' || funcName === 'drawUfoPointsDisplay') {
          this.restoreDrawUfoPointsFunction();
        }
      }
    }
  }

  monitorResourceUsage() {
    if (window.bullets && window.bullets.length > 100) {
      console.warn('[Sistema de Depuración] Número excesivo de balas detectado');
      window.bullets = window.bullets.slice(-50);
      this.fixedIssues.push({
        error: 'Acumulación excesiva de balas',
        fix: 'Se redujo el número de balas para mejorar el rendimiento',
        timestamp: new Date().toISOString()
      });
    }
    
    if (window.explosions && window.explosions.length > 20) {
      window.explosions = window.explosions.slice(-10);
      this.fixedIssues.push({
        error: 'Acumulación excesiva de explosiones',
        fix: 'Limpieza de explosiones para mejorar rendimiento',
        timestamp: new Date().toISOString()
      });
    }
  }

  ensureEventListeners() {
    if (window.gameRunning && !window.keysPressed) {
      window.keysPressed = {};
      
      document.addEventListener("keydown", function(event) {
        window.keysPressed[event.key] = true;
        if (event.key === " " && window.gameRunning) {
          event.preventDefault();
          if (typeof window.fireBullet === 'function') {
            window.fireBullet();
          }
        }
      });
      
      document.addEventListener("keyup", function(event) {
        delete window.keysPressed[event.key];
      });
      
      this.fixedIssues.push({
        error: 'Event listeners perdidos',
        fix: 'Se restauraron los event listeners del teclado',
        timestamp: new Date().toISOString()
      });
    }
  }

  checkAsyncFunctions() {
    if (this.pendingFunctions.size > 0) {
      console.warn('[Sistema de Depuración] Funciones pendientes:', Array.from(this.pendingFunctions));
      
      for (const funcName of this.pendingFunctions) {
        this.restoreMissingFunction(funcName);
      }
    }
  }

  checkGameState() {
    if (!window.gameRunning) return;
    
    this.verifyEssentialVariables();
    this.verifyScreenBoundaries();
    this.verifyCollisions();
    this.verifyGameFlow();
  }

  verifyGameFlow() {
    if (window.invaders && Array.isArray(window.invaders)) {
      const aliveInvaders = window.invaders.filter(inv => inv && inv.alive);
      
      if (aliveInvaders.length === 0 && window.gameState === "playing") {
        console.log('[Sistema de Depuración] Todos los invasores eliminados, avanzando nivel');
        
        if (typeof window.checkWinCondition === 'function') {
          window.checkWinCondition();
        } else {
          this.improviseWinCondition();
        }
      }
    }
  }

  improviseWinCondition() {
    if (!window.level) window.level = 1;
    window.level++;
    
    if (typeof window.initGame === 'function') {
      const currentScore = window.score || 0;
      const currentLives = window.lives || 3;
      
      window.gameRunning = false;
      setTimeout(() => {
        try {
          window.initGame();
          window.score = currentScore;
          window.lives = currentLives;
          window.gameRunning = true;
          window.gameState = "playing";
          
          if (typeof window.gameLoop === 'function') {
            requestAnimationFrame(window.gameLoop);
          }
        } catch (e) {
          console.error('[Sistema de Depuración] Error al avanzar nivel:', e);
        }
      }, 3000);
      
      this.fixedIssues.push({
        error: 'Nivel completado sin avance detectado',
        fix: 'Avance automático al siguiente nivel',
        timestamp: new Date().toISOString()
      });
    }
  }

  verifyEssentialVariables() {
    const essentialVars = [
      {name: 'player', fix: () => this.createDefaultPlayer(), validate: (val) => val && typeof val.x === 'number' && typeof val.y === 'number'},
      {name: 'bullets', fix: () => window.bullets = [], validate: (val) => Array.isArray(val)},
      {name: 'invaders', fix: () => this.createDefaultInvaders(), validate: (val) => Array.isArray(val)},
      {name: 'invaderBullets', fix: () => window.invaderBullets = [], validate: (val) => Array.isArray(val)},
      {name: 'score', fix: () => window.score = 0, validate: (val) => typeof val === 'number'},
      {name: 'lives', fix: () => window.lives = 3, validate: (val) => typeof val === 'number' && val >= 0},
      {name: 'gameState', fix: () => window.gameState = "playing", validate: (val) => typeof val === 'string'},
      {name: 'ufoPointsDisplay', fix: () => window.ufoPointsDisplay = [], validate: (val) => Array.isArray(val)},
      {name: 'explosions', fix: () => window.explosions = [], validate: (val) => Array.isArray(val)},
      {name: 'keysPressed', fix: () => window.keysPressed = {}, validate: (val) => val && typeof val === 'object'},
      {name: 'gameWidth', fix: () => window.gameWidth = 800, validate: (val) => typeof val === 'number'},
      {name: 'gameHeight', fix: () => window.gameHeight = 600, validate: (val) => typeof val === 'number'},
      {name: 'drawUfoPointsDisplay', fix: () => this.restoreDrawUfoPointsFunction(), validate: (val) => typeof val === 'function'}
    ];
    
    for (const varInfo of essentialVars) {
      const isUndefined = typeof window[varInfo.name] === 'undefined' || window[varInfo.name] === null;
      const isInvalid = !isUndefined && varInfo.validate && !varInfo.validate(window[varInfo.name]);
      
      if (isUndefined || isInvalid) {
        console.warn(`[Sistema de Depuración] Variable ${varInfo.name} ${isUndefined ? 'no encontrada' : 'inválida'}. Restaurando...`);
        varInfo.fix();
        this.fixedIssues.push({
          error: `Variable ${varInfo.name} ${isUndefined ? 'no encontrada' : 'inválida'}`,
          fix: `${varInfo.name} restaurada a valor por defecto`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  verifyEssentialObjects() {
    
    if (window.player) {
      const requiredProps = ['x', 'y', 'width', 'height'];
      let playerFixed = false;
      
      for (const prop of requiredProps) {
        if (typeof window.player[prop] !== 'number') {
          playerFixed = true;
          if (prop === 'width') window.player.width = 60;
          else if (prop === 'height') window.player.height = 20;
          else if (prop === 'x') window.player.x = (window.gameWidth || 800) / 2 - 30;
          else if (prop === 'y') window.player.y = (window.gameHeight || 600) - 40;
        }
      }
      
      if (playerFixed) {
        this.fixedIssues.push({
          error: 'Objeto player con propiedades faltantes',
          fix: 'Propiedades del jugador restauradas',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  verifyVariableTypes() {
    if (window.score !== undefined && typeof window.score !== 'number') {
      try {
        window.score = parseInt(window.score) || 0;
        this.fixedIssues.push({
          error: 'Score con tipo incorrecto',
          fix: 'Convertido score a número',
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        window.score = 0;
      }
    }
    
    if (window.lives !== undefined && typeof window.lives !== 'number') {
      try {
        window.lives = parseInt(window.lives) || 3;
        this.fixedIssues.push({
          error: 'Lives con tipo incorrecto',
          fix: 'Convertido lives a número',
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        window.lives = 3;
      }
    }
  }

  createDefaultPlayer() {
    window.player = {
      x: (window.gameWidth || 800) / 2 - 30,
      y: (window.gameHeight || 600) - 40,
      width: 60,
      height: 20
    };
  }

  createDefaultInvaders() {
    window.invaders = [];
    const rows = 5;
    const cols = 10;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        window.invaders.push({
          x: col * (40 + 20) + 50,
          y: row * (30 + 20) + 50,
          width: 40,
          height: 30,
          type: row,
          alive: true
        });
      }
    }
  }

  verifyScreenBoundaries() {
    if (!window.player || !window.gameWidth) return;
    
    if (window.player.x < 0) {
      window.player.x = 0;
      this.fixedIssues.push({
        error: 'Posición de jugador incorrecta',
        fix: 'Jugador reposicionado dentro de los límites (izquierda)',
        timestamp: new Date().toISOString()
      });
    }
    
    if (window.player.x > window.gameWidth - window.player.width) {
      window.player.x = window.gameWidth - window.player.width;
      this.fixedIssues.push({
        error: 'Posición de jugador incorrecta',
        fix: 'Jugador reposicionado dentro de los límites (derecha)',
        timestamp: new Date().toISOString()
      });
    }
  }

  verifyCollisions() {
    if (!window.invaders || !window.player) return;
    
    for (const invader of window.invaders) {
      if (invader.alive && invader.y + invader.height >= window.gameHeight - 60) {
        for (const inv of window.invaders) {
          if (inv.alive) inv.y -= 50;
        }
        this.fixedIssues.push({
          error: 'Invasores demasiado abajo',
          fix: 'Invasores reposicionados más arriba',
          timestamp: new Date().toISOString()
        });
        break;
      }
    }
  }

  optimizePerformance() {
    if (window.bullets && window.bullets.length > 10) {
      window.bullets = window.bullets.slice(-5);
      this.fixedIssues.push({
        error: 'Demasiadas balas activas',
        fix: 'Limpieza de balas para mejorar rendimiento',
        timestamp: new Date().toISOString()
      });
    }
    
    if (window.invaderBullets && window.invaderBullets.length > 15) {
      window.invaderBullets = window.invaderBullets.slice(-8);
      this.fixedIssues.push({
        error: 'Demasiadas balas de invasores',
        fix: 'Limpieza de balas de invasores para mejorar rendimiento',
        timestamp: new Date().toISOString()
      });
    }
    
    // Reducir explosiones
    if (window.explosions && window.explosions.length > 10) {
      window.explosions = window.explosions.slice(-5);
    }
    
    // Reducir complejidad de renderizado
    this.reducedGraphicsMode = true;
    setTimeout(() => {
      this.reducedGraphicsMode = false;
    }, 5000);
  }

  recoverFromFreeze() {
    if (!window.gameRunning) return;
    
    console.warn("[Sistema de Depuración] Intentando recuperar el juego congelado...");
    
    this.verifyEssentialVariables();
    
    if (typeof window.gameLoop === 'function') {
      requestAnimationFrame(window.gameLoop);
      this.fixedIssues.push({
        error: 'Congelación del juego detectada',
        fix: 'Ciclo de juego reiniciado',
        timestamp: new Date().toISOString()
      });
    }
  }

  fixDOMElementStyleError() {
    const possibleElements = ['canvas', 'startButton', 'debugButton'];
    let fixed = false;
    
    for (const elementId of possibleElements) {
      const element = document.getElementById(elementId);
      if (!element) {
        console.warn(`[Sistema de Depuración] Elemento ${elementId} no encontrado`);
        
        if (elementId === 'canvas') {
          const canvas = document.createElement('canvas');
          canvas.id = 'gameCanvas';
          canvas.width = 800;
          canvas.height = 600;
          document.querySelector('.game-wrapper')?.appendChild(canvas);
          fixed = true;
        }
      }
    }
    
    if (fixed) {
      this.fixedIssues.push({
        error: 'Error de acceso a style de elemento DOM',
        fix: 'Elementos DOM restaurados',
        timestamp: new Date().toISOString()
      });
      return true;
    }
    
    return false;
  }

  restoreDrawUfoPointsFunction() {
    window.drawUfoPoints = function() {
      if (!window.ufoPointsDisplay || !Array.isArray(window.ufoPointsDisplay)) {
        window.ufoPointsDisplay = [];
        return;
      }
      
      const canvas = document.getElementById('gameCanvas');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      
      for (let i = window.ufoPointsDisplay.length - 1; i >= 0; i--) {
        const display = window.ufoPointsDisplay[i];
        if (!display) continue;
        
        const elapsed = Date.now() - display.startTime;
        
        if (elapsed < display.duration) {
          const opacity = 1 - elapsed / display.duration;
          ctx.globalAlpha = opacity;
          ctx.fillText(display.points.toString(), display.x + 30, display.y + 15);
        } else {
          window.ufoPointsDisplay.splice(i, 1);
        }
      }
      ctx.restore();
    };
    
    window.drawUfoPointsDisplay = window.drawUfoPoints;
    
    this.pendingFunctions.delete('drawUfoPoints');
    this.pendingFunctions.delete('drawUfoPointsDisplay');
    
    this.fixedIssues.push({
      error: 'Función drawUfoPoints no encontrada',
      fix: 'Función drawUfoPoints restaurada',
      timestamp: new Date().toISOString()
    });
    
    this.successfulFixes['drawUfoPoints'] = (this.successfulFixes['drawUfoPoints'] || 0) + 1;
    
    return true;
  }

  restoreMissingFunction(functionName) {
    let success = false;
    
    switch (functionName) {
      case 'drawUfoPoints':
      case 'drawUfoPointsDisplay':
        success = this.restoreDrawUfoPointsFunction();
        break;
        
      case 'checkCollision':
        window.checkCollision = function(a, b) {
          return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
          );
        };
        success = true;
        break;
        
      case 'createExplosion':
        window.createExplosion = function(x, y) {
          if (!window.explosions) window.explosions = [];
          window.explosions.push({
            x: x,
            y: y,
            radius: 5,
            maxRadius: 20,
            alpha: 1,
            growing: true,
          });
        };
        success = true;
        break;
        
      case 'fireBullet':
        window.fireBullet = function() {
          if (!window.bullets) window.bullets = [];
          if (!window.player) return;
          
          const bullet = {
            x: window.player.x + window.player.width / 2 - 2,
            y: window.player.y - 10,
            width: 4,
            height: 15,
            color: "#00ffff",
          };
          window.bullets.push(bullet);
          
          if (typeof window.playSound === 'function') {
            window.playSound("shoot");
          }
        };
        success = true;
        break;
    }
    
    if (success) {
      this.fixedIssues.push({
        error: `Función ${functionName} no encontrada`,
        fix: `Función ${functionName} restaurada`,
        timestamp: new Date().toISOString()
      });
      
      this.successfulFixes[functionName] = (this.successfulFixes[functionName] || 0) + 1;
      
      this.pendingFunctions.delete(functionName);
    }
    
    return success;
  }

  attemptFix(error) {
    if (!error || !error.message) return false;

    for (const [pattern, fixFunction] of this.errorPatterns.entries()) {
      if (pattern.test(error.message)) {
        if (fixFunction(error)) {
          console.log(`[Sistema de Depuración] Error corregido: ${error.message}`);
          return true;
        }
      }
    }

    this.learnFromError(error);

    return this.applyGenericFix();
  }

  learnFromError(error) {
    const errorSignature = this.getErrorSignature(error);
    
    if (this.errorCount[errorSignature] >= 3) {
      console.log(`[Sistema de Depuración] Error recurrente detectado: ${errorSignature}`);
      
      if (this.errorCount[errorSignature] > 5) {
        console.warn(`[Sistema de Depuración] Error persistente, aplicando solución`);
        return this.applyDrasticFix();
      }
    }
  }

  getErrorSignature(error) {
    if (!error.message) return 'unknown';
    
    return error.message.replace(/\d+/g, 'X').replace(/["'](.*?)["']/g, "'X'");
  }

  applyDrasticFix() {
    if (window.gameState === "playing" && window.gameRunning) {
      const savedScore = window.score || 0;
      const savedLives = Math.max(1, (window.lives || 3) - 1); 
      
      
      if (typeof window.initGame === 'function') {
        console.warn("[Sistema de Depuración] Reiniciando completamente el juego debido a errores persistentes");
        
        window.gameRunning = false;
        setTimeout(() => {
          try {
            window.initGame();
            window.score = savedScore;
            window.lives = savedLives;
            window.gameRunning = true;
            window.gameState = "playing";
            
            if (typeof window.gameLoop === 'function') {
              requestAnimationFrame(window.gameLoop);
            }
            
            this.fixedIssues.push({
              error: 'Errores persistentes detectados',
              fix: 'Reinicio completo del juego (con penalización)',
              timestamp: new Date().toISOString()
            });
          } catch (e) {
            console.error("[Sistema de Depuración] Error al aplicar solución drástica:", e);
          }
        }, 1000);
        
        return true;
      }
    }
    
    return false;
  }

  applyGenericFix() {
    if (this.errorLog.length > 10) {
      if (window.gameState === "playing" && window.gameRunning) {
        const savedScore = window.score || 0;
        const savedLives = window.lives || 3;
        
        if (typeof window.initGame === 'function') {
          window.initGame();
          window.score = savedScore;
          window.lives = savedLives;
          
          this.fixedIssues.push({
            error: 'Múltiples errores detectados',
            fix: 'Reinicio parcial del juego manteniendo puntuación',
            timestamp: new Date().toISOString()
          });
          
          console.log("[Sistema de Depuración] Reinicio parcial aplicado");
          return true;
        }
      }
    }
    
    return false;
  }

  showDebugPanel() {
    const existingPanel = document.getElementById('debug-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      border: 2px solid #00ff00;
      padding: 20px;
      font-family: 'Press Start 2P', monospace;
      font-size: 12px;
      z-index: 2000;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
    `;

    let content = '<h2 style="text-align: center; margin-bottom: 20px; color: #00ff00;">SISTEMA DE DEPURACIÓN</h2>';
    
    content += `
      <div style="display: flex; justify-content: space-around; margin-bottom: 25px; text-align: center;">
        <div>
          <div style="font-size: 24px; color: ${this.errorLog.length > 0 ? '#ff5555' : '#00ff00'}">${this.errorLog.length}</div>
          <div style="margin-top: 10px;">Errores</div>
        </div>
        <div>
          <div style="font-size: 24px; color: #00ff00">${this.fixedIssues.length}</div>
          <div style="margin-top: 10px;">Correcciones</div>
        </div>
        <div>
          <div style="font-size: 24px; color: ${window.gameRunning ? '#00ff00' : '#ffff00'}">${window.gameRunning ? 'ACTIVO' : 'PAUSA'}</div>
          <div style="margin-top: 10px;">Estado</div>
        </div>
      </div>
    `;

    content += `
      <div style="margin-bottom: 20px; border-top: 1px solid #00aa00; padding-top: 15px;">
        <h3 style="margin-bottom: 10px; color: #88ff88;">Variables de Juego:</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>Puntuación: <span style="color: #ffffff;">${window.score || 0}</span></div>
          <div>Vidas: <span style="color: #ffffff;">${window.lives || 0}</span></div>
          <div>Invasores: <span style="color: #ffffff;">${window.invaders ? window.invaders.filter(i => i.alive).length : 0} / ${window.invaders ? window.invaders.length : 0}</span></div>
          <div>Balas: <span style="color: #ffffff;">${window.bullets ? window.bullets.length : 0}</span></div>
          <div>Balas enemigas: <span style="color: #ffffff;">${window.invaderBullets ? window.invaderBullets.length : 0}</span></div>
          <div>Estado: <span style="color: #ffffff;">${window.gameState || 'desconocido'}</span></div>
        </div>
      </div>
    `;

    content += `
      <div style="margin-bottom: 20px; text-align: center; border-top: 1px solid #00aa00; padding-top: 15px;">
        <h3 style="margin-bottom: 15px; color: #88ff88;">Acciones:</h3>
        <button id="debug-restore-game" style="background: #003300; color: white; border: 2px solid #00aa00; padding: 10px 15px; margin: 5px; font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer;">Restaurar Juego</button>
        <button id="debug-clear-log" style="background: #330000; color: white; border: 2px solid #aa0000; padding: 10px 15px; margin: 5px; font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer;">Limpiar Registro</button>
        <button id="debug-toggle-fixes" style="background: ${this.autoFixEnabled ? '#886600' : '#008800'}; color: white; border: 2px solid #ffaa00; padding: 10px 15px; margin: 5px; font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer;">Auto-Corrección: ${this.autoFixEnabled ? 'ON' : 'OFF'}</button>
        <button id="debug-verify-all" style="background: #003366; color: white; border: 2px solid #0066cc; padding: 10px 15px; margin: 5px; font-family: 'Press Start 2P', monospace; font-size: 10px; cursor: pointer;">Verificar Todo</button>
      </div>
    `;

    if (this.errorLog.length > 0) {
      content += `
        <div style="margin-bottom: 20px; border-top: 1px solid #00aa00; padding-top: 15px;">
          <h3 style="margin-bottom: 10px; color: #88ff88;">Últimos Errores:</h3>
          <div style="background: #001100; border: 1px solid #004400; padding: 10px; max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 11px;">
      `;
      
      const recentErrors = this.errorLog.slice(-5).reverse();
      for (const error of recentErrors) {
        const time = new Date(error.timestamp).toLocaleTimeString();
        content += `<div style="margin-bottom: 8px; border-bottom: 1px dotted #004400; padding-bottom: 5px;">
          <span style="color: #aaaaaa;">[${time}]</span> <span style="color: #ff5555;">${error.message || 'Error desconocido'}</span>
        </div>`;
      }
      
      content += `
          </div>
        </div>
      `;
    }

    if (this.fixedIssues.length > 0) {
      content += `
        <div style="margin-bottom: 20px; border-top: 1px solid #00aa00; padding-top: 15px;">
          <h3 style="margin-bottom: 10px; color: #88ff88;">Últimas Correcciones:</h3>
          <div style="background: #001100; border: 1px solid #004400; padding: 10px; max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 11px;">
      `;
      
      const recentFixes = this.fixedIssues.slice(-5).reverse();
      for (const fix of recentFixes) {
        const time = new Date(fix.timestamp).toLocaleTimeString();
        content += `<div style="margin-bottom: 8px; border-bottom: 1px dotted #004400; padding-bottom: 5px;">
          <span style="color: #aaaaaa;">[${time}]</span> <span style="color: #00ff00;">${fix.fix || 'Corrección aplicada'}</span>
        </div>`;
      }
      
      content += `
          </div>
        </div>
      `;
    }

    
    if (Object.keys(this.successfulFixes).length > 0) {
      content += `
        <div style="margin-bottom: 20px; border-top: 1px solid #00aa00; padding-top: 15px;">
          <h3 style="margin-bottom: 10px; color: #88ff88;">Estadísticas de Reparación:</h3>
          <div style="background: #001100; border: 1px solid #004400; padding: 10px; font-family: monospace; font-size: 11px;">
      `;
      
      for (const [funcName, count] of Object.entries(this.successfulFixes)) {
        content += `<div style="margin-bottom: 5px;">
          <span style="color: #00ffaa;">${funcName}:</span> <span style="color: #ffffff;">${count} reparaciones</span>
        </div>`;
      }
      
      content += `
          </div>
        </div>
      `;
    }

    content += `
      <div style="text-align: center; margin-top: 20px;">
        <button id="close-debug" style="background: #aa0000; color: white; border: none; padding: 12px 25px; font-family: 'Press Start 2P', monospace; font-size: 14px; cursor: pointer;">CERRAR</button>
      </div>
    `;

    panel.innerHTML = content;
    document.body.appendChild(panel);

    document.getElementById('close-debug').addEventListener('click', () => {
      document.body.removeChild(panel);
    });
    
    document.getElementById('debug-clear-log').addEventListener('click', () => {
      this.clearLog();
      this.showDebugPanel();
    });
    
    document.getElementById('debug-toggle-fixes').addEventListener('click', () => {
      this.autoFixEnabled = !this.autoFixEnabled;
      console.log(`[Sistema de Depuración] Auto-corrección ${this.autoFixEnabled ? 'activada' : 'desactivada'}`);
      this.showDebugPanel();
    });
    
    document.getElementById('debug-restore-game').addEventListener('click', () => {
      this.restoreGame();
      this.showDebugPanel();
    });
    
    document.getElementById('debug-verify-all').addEventListener('click', () => {
      this.performFullVerification();
      this.showDebugPanel();
    });
  }

  performFullVerification() {
    console.log("[Sistema de Depuración] Iniciando verificación completa...");
    
    
    this.verifyEssentialVariables();
    this.verifyEssentialObjects();
    this.verifyVariableTypes();
    this.verifyScreenBoundaries();
    this.verifyCollisions();
    this.verifyGameFlow();
    this.checkRequiredFunctions();
    this.monitorResourceUsage();
    this.ensureEventListeners();
    
    
    this.verifyDOMIntegrity();
    
    console.log("[Sistema de Depuración] Verificación completa finalizada");
    
    this.fixedIssues.push({
      error: 'Verificación manual solicitada',
      fix: 'Verificación completa ejecutada',
      timestamp: new Date().toISOString()
    });
  }

  verifyDOMIntegrity() {
    const essentialElements = ['gameCanvas', 'startButton', 'debugButton'];
    
    for (const elementId of essentialElements) {
      if (!document.getElementById(elementId)) {
        console.warn(`[Sistema de Depuración] Elemento ${elementId} no encontrado en el DOM`);
        
        if (elementId === 'gameCanvas') {
          const gameWrapper = document.querySelector('.game-wrapper');
          if (gameWrapper) {
            const canvas = document.createElement('canvas');
            canvas.id = 'gameCanvas';
            canvas.width = 800;
            canvas.height = 600;
            canvas.className = 'gameCanvas';
            gameWrapper.appendChild(canvas);
            
            this.fixedIssues.push({
              error: 'Canvas no encontrado en el DOM',
              fix: 'Canvas recreado',
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
  }

  restoreGame() {
    try {
      console.log("[Sistema de Depuración] Intentando restaurar el juego...");
      
      this.verifyEssentialVariables();
      
      if (window.gameState === "paused") {
        window.gameRunning = true;
        window.gameState = "playing";
        const startButton = document.getElementById('startButton');
        if (startButton) startButton.innerText = "Pausar";
        
        if (typeof window.gameLoop === 'function') {
          requestAnimationFrame(window.gameLoop);
        }
      } else if (window.gameState === "gameover") {
        if (typeof window.initGame === 'function') {
          window.initGame();
          window.gameRunning = true;
          window.gameState = "playing";
          const startButton = document.getElementById('startButton');
          if (startButton) startButton.innerText = "Pausar";
          
          if (typeof window.gameLoop === 'function') {
            requestAnimationFrame(window.gameLoop);
          }
        }
      } else {
        if (typeof window.showStartScreen === 'function') {
          window.showStartScreen();
        }
      }
      
      this.fixedIssues.push({
        error: 'Restauración manual solicitada',
        fix: 'Juego restaurado manualmente',
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (e) {
      console.error('[Sistema de Depuración] Error en restauración manual:', e);
      return false;
    }
  }

  clearLog() {
    this.errorLog = [];
    this.fixedIssues = [];
    console.log('[Sistema de Depuración] Registro limpiado');
  }
}

window.errorHandler = new ErrorHandler();

setInterval(() => {
  if (window.errorHandler && window.errorHandler.autoFixEnabled && window.gameRunning) {
    window.errorHandler.verifyEssentialVariables();
    window.errorHandler.verifyScreenBoundaries();
    window.errorHandler.verifyCollisions();
  }
}, 5000);
