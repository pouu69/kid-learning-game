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

  // Visual effects
  _trailContainer: null,
  _trailPositions: null,  // array of {x, y, time}
  _burstContainer: null,
  _countScaleTimer: null,

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
    this._trailPositions = [];

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

      // Trail container (behind ball)
      var trailContainer = new PIXI.Container();
      app.stage.addChild(trailContainer);
      self._trailContainer = trailContainer;

      // Draw ball with face
      var ball = new PIXI.Graphics();
      self._drawBallFace(ball, self._ballRadius);
      ball.x = self._ballX;
      ball.y = self._ballY;
      app.stage.addChild(ball);
      self._ballGfx = ball;

      // Burst container (on top of ball)
      var burstContainer = new PIXI.Container();
      app.stage.addChild(burstContainer);
      self._burstContainer = burstContainer;

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

      // Pet face at bottom center — bigger font (48px)
      var petText = new PIXI.Text({
        text: '(・ω・)',
        style: {
          fontFamily: '"DungGeunMo", monospace',
          fontSize: 48,
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

  // Draw ball as circle with two simple eyes
  _drawBallFace: function(gfx, r) {
    gfx.clear();
    // Main body
    gfx.circle(0, 0, r);
    gfx.fill(0xf8d848);
    // Eye whites (left and right)
    var eyeOffX = r * 0.3;
    var eyeOffY = r * 0.15;
    var eyeR = r * 0.22;
    gfx.circle(-eyeOffX, -eyeOffY, eyeR);
    gfx.fill(0xffffff);
    gfx.circle(eyeOffX, -eyeOffY, eyeR);
    gfx.fill(0xffffff);
    // Pupils
    var pupilR = eyeR * 0.55;
    gfx.circle(-eyeOffX, -eyeOffY + eyeR * 0.1, pupilR);
    gfx.fill(0x222222);
    gfx.circle(eyeOffX, -eyeOffY + eyeR * 0.1, pupilR);
    gfx.fill(0x222222);
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

    // Record trail position
    if (this._trailPositions) {
      this._trailPositions.push({ x: this._ballX, y: this._ballY, time: Date.now() });
    }

    // Ball scale pop (1.3x for 100ms)
    if (this._ballGfx) {
      this._ballGfx.scale.set(1.3);
      var ballRef = this._ballGfx;
      setTimeout(function() {
        if (ballRef) ballRef.scale.set(1.0);
      }, 100);
    }

    // Burst effect
    this._spawnBurst(this._ballX, this._ballY);

    // Update count display
    if (this._countText) {
      this._countText.text = String(this._bounceCount);
    }

    // Milestone celebrations at 5, 10, 20
    if (this._bounceCount === 5 || this._bounceCount === 10 || this._bounceCount === 20) {
      this._doMilestoneCelebration();
    }

    // Update pet face based on combo
    this._updatePetFace();
    playSound('correct');
  },

  _spawnBurst: function(cx, cy) {
    if (!this._burstContainer || !this._app) return;
    var burst = new PIXI.Graphics();
    var lineLen = 18;
    var lineWidth = 3;
    // 4 lines radiating outward (up, down, left, right + diagonals)
    var angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI / 4, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    for (var i = 0; i < 4; i++) {
      var a = angles[i];
      var startDist = this._ballRadius + 4;
      burst.moveTo(Math.cos(a) * startDist, Math.sin(a) * startDist);
      burst.lineTo(Math.cos(a) * (startDist + lineLen), Math.sin(a) * (startDist + lineLen));
      burst.stroke({ width: lineWidth, color: 0xfff176, alpha: 1 });
    }
    burst.x = cx;
    burst.y = cy;
    this._burstContainer.addChild(burst);

    // Fade out and remove after 150ms
    var elapsed = 0;
    var interval = setInterval(function() {
      elapsed += 16;
      if (burst && burst.parent) {
        burst.alpha = Math.max(0, 1 - elapsed / 150);
        if (elapsed >= 150) {
          burst.parent.removeChild(burst);
          burst.destroy();
          clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, 16);
  },

  _doMilestoneCelebration: function() {
    speakText('잘한다!');

    // Screen flash (white overlay 0.1s)
    if (this._app) {
      var w = this._app.screen.width;
      var h = this._app.screen.height;
      var flash = new PIXI.Graphics();
      flash.rect(0, 0, w, h);
      flash.fill({ color: 0xffffff, alpha: 0.55 });
      this._app.stage.addChild(flash);
      setTimeout(function() {
        if (flash && flash.parent) {
          flash.parent.removeChild(flash);
          flash.destroy();
        }
      }, 100);
    }

    // Count number briefly at 2x size then shrink back
    if (this._countText) {
      var ct = this._countText;
      if (this._countScaleTimer) {
        clearTimeout(this._countScaleTimer);
        this._countScaleTimer = null;
      }
      ct.scale.set(2.0);
      this._countScaleTimer = setTimeout(function() {
        if (ct) ct.scale.set(1.0);
      }, 350);
    }
  },

  _updateTrail: function() {
    if (!this._trailContainer || !this._trailPositions) return;
    var now = Date.now();
    // Remove old trail entries (older than 300ms)
    this._trailPositions = this._trailPositions.filter(function(p) {
      return now - p.time < 300;
    });

    // Clear existing trail graphics
    this._trailContainer.removeChildren();

    // Draw up to 3 most recent positions as fading afterimages
    var positions = this._trailPositions.slice(-3);
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var age = now - p.time;
      var alpha = (1 - age / 300) * 0.35;
      if (alpha <= 0) continue;
      var trail = new PIXI.Graphics();
      trail.circle(0, 0, this._ballRadius);
      trail.fill({ color: 0xf8d848, alpha: alpha });
      trail.x = p.x;
      trail.y = p.y;
      this._trailContainer.addChild(trail);
    }
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

    // Update trail afterimages
    this._updateTrail();

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

  _spawnConfetti: function(w, h) {
    if (!this._app) return;
    var colors = [0xff4444, 0x44aaff, 0x44dd44, 0xffd700, 0xff88cc, 0x88ffee, 0xff8800];
    var pieces = [];

    for (var i = 0; i < 20; i++) {
      var piece = new PIXI.Graphics();
      var color = colors[i % colors.length];
      piece.rect(0, 0, 10, 14);
      piece.fill(color);
      piece.x = Math.random() * w;
      piece.y = -20 - Math.random() * 60;
      piece._vy = 2 + Math.random() * 3;
      piece._vx = (Math.random() - 0.5) * 3;
      this._app.stage.addChild(piece);
      pieces.push(piece);
    }

    var elapsed = 0;
    var interval = setInterval(function() {
      elapsed += 16;
      for (var j = 0; j < pieces.length; j++) {
        var p = pieces[j];
        if (!p || !p.parent) continue;
        p._vy += 0.15;
        p.x += p._vx;
        p.y += p._vy;
        p.rotation += 0.08;
        p.alpha = Math.max(0, 1 - elapsed / 2000);
      }
      if (elapsed >= 2000) {
        for (var k = 0; k < pieces.length; k++) {
          if (pieces[k] && pieces[k].parent) {
            pieces[k].parent.removeChild(pieces[k]);
            pieces[k].destroy();
          }
        }
        clearInterval(interval);
      }
    }, 16);
  },

  _doGameOver: function() {
    var count = this._bounceCount;
    // Minimum 1 star for trying
    var stars;
    if (count >= 20) stars = 3;
    else if (count >= 10) stars = 2;
    else stars = 1;  // always at least 1 for trying

    // Show positive ending message
    var msg = '와! ' + count + '번이나 튀겼어!';
    speakText(msg, 0.85);

    // Show result overlay inside the game
    if (this._app) {
      var w = this._app.screen.width;
      var h = this._app.screen.height;

      // Spawn confetti
      this._spawnConfetti(w, h);

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

    if (this._countScaleTimer) {
      clearTimeout(this._countScaleTimer);
      this._countScaleTimer = null;
    }

    this._ballGfx = null;
    this._countText = null;
    this._petText = null;
    this._trailContainer = null;
    this._burstContainer = null;
    this._trailPositions = [];
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
