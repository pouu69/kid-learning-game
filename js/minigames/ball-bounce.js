// js/minigames/ball-bounce.js
// 공 튀기기 미니게임: 탭해서 공을 계속 튀기기
// Depends: PIXI (global), playSound, speakText

var BallBounceGame = {
  _app: null,
  _overlay: null,
  _tickInterval: null,
  _onComplete: null,

  // Ball state
  _ballGfx: null,
  _ballX: 0,
  _ballY: 0,
  _ballVY: 0,
  _ballVX: 0,

  // Game state
  _bounceCount: 0,
  _gameOver: false,

  // UI elements
  _countText: null,
  _petText: null,

  // Physics constants
  _gravity: 0.35,
  _bounceForce: -10,
  _ballRadius: 22,

  start: function(st, onComplete) {
    this._cleanup();
    this._onComplete = onComplete;
    this._bounceCount = 0;
    this._gameOver = false;
    this._ballVX = 0;

    this._createOverlay();
    this._createGame();
  },

  _createOverlay: function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;background:rgba(26,24,48,0.92);';
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // Canvas container fills entire overlay
    var wrap = document.createElement('div');
    wrap.id = 'ball-bounce-canvas';
    wrap.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    overlay.appendChild(wrap);
  },

  _createGame: function() {
    var wrap = document.getElementById('ball-bounce-canvas');
    if (!wrap) return;
    var w = wrap.clientWidth || window.innerWidth;
    var h = wrap.clientHeight || window.innerHeight;

    var app = new PIXI.Application();
    var self = this;

    app.init({ width: w, height: h, backgroundAlpha: 0 }).then(function() {
      wrap.appendChild(app.canvas);
      self._app = app;

      // Initial ball position: upper-center area
      self._ballX = w / 2;
      self._ballY = h * 0.35;
      self._ballVY = 2;

      // Draw ball
      var ball = new PIXI.Graphics();
      ball.circle(0, 0, self._ballRadius);
      ball.fill(0xf8d848);
      ball.x = self._ballX;
      ball.y = self._ballY;
      app.stage.addChild(ball);
      self._ballGfx = ball;

      // Bounce count display (large, top center)
      var countText = new PIXI.Text({
        text: '0',
        style: {
          fontFamily: '"DungGeunMo", monospace',
          fontSize: 72,
          fill: 0xf8d848,
          fontWeight: 'bold',
          dropShadow: true,
          dropShadowColor: 0x000000,
          dropShadowBlur: 6,
          dropShadowDistance: 3
        }
      });
      countText.anchor.set(0.5, 0);
      countText.x = w / 2;
      countText.y = 20;
      app.stage.addChild(countText);
      self._countText = countText;

      // Pet face at bottom center
      var petText = new PIXI.Text({
        text: '(・ω・)',
        style: {
          fontFamily: '"DungGeunMo", monospace',
          fontSize: 36,
          fill: 0xffffff
        }
      });
      petText.anchor.set(0.5, 1);
      petText.x = w / 2;
      petText.y = h - 16;
      app.stage.addChild(petText);
      self._petText = petText;

      // Tap anywhere to bounce
      app.canvas.addEventListener('pointerdown', function(e) {
        self._onTap(e);
      });

      // Start physics loop
      self._tickInterval = setInterval(function() {
        self._tick();
      }, 16);
    });
  },

  _onTap: function(e) {
    if (this._gameOver) return;

    // Bounce ball upward
    this._ballVY = this._bounceForce;

    // Slight horizontal drift toward tap X
    var tapX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : this._ballX);
    var dx = tapX - this._ballX;
    this._ballVX = dx * 0.04;
    // Clamp horizontal speed
    if (this._ballVX > 4) this._ballVX = 4;
    if (this._ballVX < -4) this._ballVX = -4;

    this._bounceCount++;
    if (this._countText) {
      this._countText.text = String(this._bounceCount);
    }

    // Update pet face based on combo
    this._updatePetFace();
    playSound('correct');
  },

  _updatePetFace: function() {
    var faces;
    if (this._bounceCount >= 20) {
      faces = ['(*^▽^*)', '(≧◡≦)', '(＾▽＾)'];
    } else if (this._bounceCount >= 10) {
      faces = ['(^o^)', '(＾ω＾)', '(*≧ω≦)'];
    } else if (this._bounceCount >= 5) {
      faces = ['(・∀・)', '(^_^)', '(＾ー＾)'];
    } else {
      faces = ['(・ω・)', '(°▽°)', '(^_^)'];
    }
    var face = faces[this._bounceCount % faces.length];
    if (this._petText) {
      this._petText.text = face;
    }
  },

  _tick: function() {
    if (!this._app || this._gameOver) return;

    var w = this._app.screen.width;
    var h = this._app.screen.height;
    var r = this._ballRadius;

    // Apply gravity
    this._ballVY += this._gravity;

    // Apply damping to horizontal drift
    this._ballVX *= 0.98;

    // Move ball
    this._ballX += this._ballVX;
    this._ballY += this._ballVY;

    // Bounce off left/right walls
    if (this._ballX - r < 0) {
      this._ballX = r;
      this._ballVX = Math.abs(this._ballVX);
    }
    if (this._ballX + r > w) {
      this._ballX = w - r;
      this._ballVX = -Math.abs(this._ballVX);
    }

    // Bounce off ceiling
    if (this._ballY - r < 0) {
      this._ballY = r;
      this._ballVY = Math.abs(this._ballVY);
    }

    // Update ball graphic position
    if (this._ballGfx) {
      this._ballGfx.x = this._ballX;
      this._ballGfx.y = this._ballY;
    }

    // Pet follows ball horizontally
    if (this._petText) {
      this._petText.x = this._ballX;
      // Clamp to screen edges
      var halfPet = this._petText.width / 2;
      if (this._petText.x - halfPet < 8) this._petText.x = 8 + halfPet;
      if (this._petText.x + halfPet > w - 8) this._petText.x = w - 8 - halfPet;
    }

    // Game over: ball touches bottom
    if (this._ballY + r >= h) {
      this._gameOver = true;
      this._doGameOver();
    }
  },

  _doGameOver: function() {
    var count = this._bounceCount;
    var stars = 0;
    if (count >= 20) stars = 3;
    else if (count >= 10) stars = 2;
    else if (count >= 5) stars = 1;

    // Show positive ending message
    var msg = '와! ' + count + '번이나 튀겼어!';
    speakText(msg, 0.85);

    // Show result overlay inside the game
    if (this._app) {
      var w = this._app.screen.width;
      var h = this._app.screen.height;

      // Darken overlay
      var dim = new PIXI.Graphics();
      dim.rect(0, 0, w, h);
      dim.fill({ color: 0x000000, alpha: 0.55 });
      this._app.stage.addChild(dim);

      // Result text
      var resultText = new PIXI.Text({
        text: msg,
        style: {
          fontFamily: '"DungGeunMo", monospace',
          fontSize: 38,
          fill: 0xf8d848,
          fontWeight: 'bold',
          wordWrap: true,
          wordWrapWidth: w - 40,
          align: 'center'
        }
      });
      resultText.anchor.set(0.5, 0.5);
      resultText.x = w / 2;
      resultText.y = h / 2 - 40;
      this._app.stage.addChild(resultText);

      // Stars display
      var starStr = '';
      for (var i = 0; i < stars; i++) starStr += '★';
      for (var j = stars; j < 3; j++) starStr += '☆';

      var starText = new PIXI.Text({
        text: starStr,
        style: {
          fontFamily: '"DungGeunMo", monospace',
          fontSize: 52,
          fill: 0xffd700
        }
      });
      starText.anchor.set(0.5, 0.5);
      starText.x = w / 2;
      starText.y = h / 2 + 40;
      this._app.stage.addChild(starText);
    }

    // Call onComplete after short delay so user can see result
    var cb = this._onComplete;
    this._onComplete = null;
    var self = this;
    setTimeout(function() {
      self._cleanup();
      if (cb) cb(stars);
    }, 2200);
  },

  _cleanup: function() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }

    this._ballGfx = null;
    this._countText = null;
    this._petText = null;
    this._gameOver = false;

    if (this._app) {
      // Remove canvas event listener by replacing canvas (destroy handles this)
      this._app.destroy(true, { children: true });
      this._app = null;
    }

    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }
  }
};
