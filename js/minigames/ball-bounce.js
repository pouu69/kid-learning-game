// js/minigames/ball-bounce.js
// 공 튀기기 미니게임: 탭해서 공을 계속 튀기기
// Depends: PIXI (global), playSound, speakText

// Module-level flag: tutorial only shown once per session
var _tutorialShown = false;

// Native Korean counting words for 1-20 (bounce count announcement)
var BB_COUNT_WORDS = [
  '', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
  '열하나', '열둘', '열셋', '열넷', '열다섯', '열여섯', '열일곱', '열여덟', '열아홉', '스물'
];

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

  // Tutorial state
  _inTutorial: false,
  _tutorialTimers: null,   // array of timer IDs to cancel on cleanup
  _tutorialLayer: null,    // PIXI.Container holding tutorial-only graphics

  // Physics constants
  _gravity: 0.22,
  _bounceForce: -8,
  _ballRadius: 22,

  start: function(st, onComplete) {
    this._cleanup();
    this._st = st;
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

      // Tap handler: during tutorial ends it; during game, bounces ball
      app.canvas.addEventListener('pointerdown', function(e) {
        if (self._inTutorial) {
          self._endTutorial(e);
        } else {
          self._onTap(e);
        }
      });

      // 매번 튜토리얼 표시 (5세는 매번 가이드 필요)
      self._showTutorial();
      if (false) {
        self._tickInterval = setInterval(function() {
          self._tick();
        }, 16);
      }
    });
  },

  // ── Tutorial ──────────────────────────────────────────────────────────────

  _showTutorial: function() {
    if (!this._app) return;
    this._inTutorial = true;
    this._tutorialTimers = [];

    var self = this;
    var app = this._app;
    var w = app.screen.width;
    var h = app.screen.height;
    var r = this._ballRadius;

    // Layer for all tutorial-only elements (sits above ball)
    var layer = new PIXI.Container();
    app.stage.addChild(layer);
    this._tutorialLayer = layer;

    // Position ball at center
    this._ballX = w / 2;
    this._ballY = h * 0.45;
    if (this._ballGfx) {
      this._ballGfx.x = this._ballX;
      this._ballGfx.y = this._ballY;
    }

    // ── Gentle bob animation (JS-driven, no physics) ──
    var bobStart = Date.now();
    var bobInterval = setInterval(function() {
      if (!self._inTutorial || !self._ballGfx) {
        clearInterval(bobInterval);
        return;
      }
      var elapsed = (Date.now() - bobStart) / 1000;
      self._ballGfx.y = self._ballY + Math.sin(elapsed * 3) * 8;
    }, 16);
    this._tutorialTimers.push(bobInterval);

    // ── Finger graphic (👆 via PIXI.Text for simplicity) ──
    var finger = new PIXI.Text({
      text: '👆',
      style: { fontSize: 48 }
    });
    finger.anchor.set(0.5, 1);
    // Start off-screen below and to the right
    finger.x = this._ballX + 50;
    finger.y = this._ballY + 120;
    finger.alpha = 0;
    layer.addChild(finger);

    // ── "톡톡!" label ──
    var tokText = new PIXI.Text({
      text: '톡톡!',
      style: {
        fontFamily: '"DungGeunMo", monospace',
        fontSize: 28,
        fill: 0xfff176,
        fontWeight: 'bold',
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowBlur: 4,
        dropShadowDistance: 2
      }
    });
    tokText.anchor.set(0.5, 0.5);
    tokText.x = this._ballX + 55;
    tokText.y = this._ballY - r - 30;
    tokText.alpha = 0;
    layer.addChild(tokText);

    // ── "눌러봐!" prompt label (shown after demo, pulses) ──
    var promptText = new PIXI.Text({
      text: '눌러봐!',
      style: {
        fontFamily: '"DungGeunMo", monospace',
        fontSize: 32,
        fill: 0xffffff,
        fontWeight: 'bold',
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowBlur: 5,
        dropShadowDistance: 2
      }
    });
    promptText.anchor.set(0.5, 0.5);
    promptText.x = w / 2;
    promptText.y = this._ballY + r + 70;
    promptText.alpha = 0;
    layer.addChild(promptText);

    // ── Pulsing glow ring around ball (shown after demo) ──
    var glowRing = new PIXI.Graphics();
    glowRing.x = this._ballX;
    glowRing.y = this._ballY;
    glowRing.alpha = 0;
    layer.addChild(glowRing);

    var glowInterval = null;

    // Helper: draw a tap animation — finger slides to ball, taps, recoils
    function doTapAnimation(onDone) {
      // Fade finger in and slide toward ball center
      var startX = self._ballX + 50;
      var startY = self._ballY + 120;
      var endX = self._ballX + 5;
      var endY = self._ballGfx ? self._ballGfx.y + r + 2 : self._ballY + r + 2;

      finger.x = startX;
      finger.y = startY;
      finger.alpha = 1;

      var slideMs = 420;
      var slideStart = Date.now();

      var slideInterval = setInterval(function() {
        var t = Math.min(1, (Date.now() - slideStart) / slideMs);
        // ease-in-out
        var ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        finger.x = startX + (endX - startX) * ease;
        finger.y = startY + (endY - startY) * ease;
        if (t >= 1) {
          clearInterval(slideInterval);
          // "tap" — finger presses down
          finger.y = endY + 10;

          // Show 톡톡! text + burst
          tokText.alpha = 1;
          tokText.scale.set(1);
          self._spawnBurst(self._ballX, self._ballGfx ? self._ballGfx.y : self._ballY);
          playSound('correct');

          // Ball pop
          if (self._ballGfx) {
            self._ballGfx.scale.set(1.3);
          }

          // Fade out 톡톡! and recoil finger after 500ms
          var fadeTimer = setTimeout(function() {
            // Fade 톡톡!
            var fadeStart = Date.now();
            var fadeInterval = setInterval(function() {
              var ft = Math.min(1, (Date.now() - fadeStart) / 500);
              tokText.alpha = 1 - ft;
              if (ft >= 1) {
                clearInterval(fadeInterval);
                tokText.alpha = 0;
              }
            }, 16);
            self._tutorialTimers.push(fadeInterval);

            // Recoil finger upward
            finger.y = endY - 20;
            if (self._ballGfx) self._ballGfx.scale.set(1.0);

            // Fade finger out after another 300ms then call onDone
            var doneTimer = setTimeout(function() {
              finger.alpha = 0;
              if (onDone) onDone();
            }, 350);
            self._tutorialTimers.push(doneTimer);
          }, 500);
          self._tutorialTimers.push(fadeTimer);
        }
      }, 16);
      self._tutorialTimers.push(slideInterval);
    }

    // ── Sequence ──
    // t=0ms: speak
    var t0 = setTimeout(function() {
      if (!self._inTutorial) return;
      speakText('공을 톡톡 눌러봐!');
    }, 300);
    this._tutorialTimers.push(t0);

    // t=600ms: first tap demo
    var t1 = setTimeout(function() {
      if (!self._inTutorial) return;
      doTapAnimation(function() {
        // After first tap, pause 500ms then do second tap
        var t2 = setTimeout(function() {
          if (!self._inTutorial) return;
          doTapAnimation(function() {
            // After second tap, show pulsing prompt
            if (!self._inTutorial) return;

            // Pulsing glow ring
            var pulseStart = Date.now();
            glowInterval = setInterval(function() {
              if (!self._inTutorial || !glowRing.parent) {
                clearInterval(glowInterval);
                return;
              }
              var elapsed = (Date.now() - pulseStart) / 1000;
              var scale = 1 + Math.sin(elapsed * 4) * 0.18;
              var alpha = 0.55 + Math.sin(elapsed * 4) * 0.35;
              glowRing.clear();
              glowRing.circle(0, 0, r + 10);
              glowRing.stroke({ width: 4, color: 0xfff176, alpha: alpha });
              glowRing.x = self._ballX;
              glowRing.y = self._ballGfx ? self._ballGfx.y : self._ballY;
              glowRing.scale.set(scale);
            }, 16);
            self._tutorialTimers.push(glowInterval);

            glowRing.alpha = 1;

            // Fade prompt in
            promptText.y = self._ballY + r + 70;
            var fadeInStart = Date.now();
            var fadeInInterval = setInterval(function() {
              var ft = Math.min(1, (Date.now() - fadeInStart) / 400);
              promptText.alpha = ft;
              if (ft >= 1) {
                clearInterval(fadeInInterval);
                // Pulse prompt text
                var pulsePromptStart = Date.now();
                var pulsePromptInterval = setInterval(function() {
                  if (!self._inTutorial || !promptText.parent) {
                    clearInterval(pulsePromptInterval);
                    return;
                  }
                  var pe = (Date.now() - pulsePromptStart) / 1000;
                  promptText.scale.set(1 + Math.sin(pe * 3.5) * 0.1);
                }, 16);
                self._tutorialTimers.push(pulsePromptInterval);
              }
            }, 16);
            self._tutorialTimers.push(fadeInInterval);
          });
        }, 600);
        self._tutorialTimers.push(t2);
      });
    }, 600);
    this._tutorialTimers.push(t1);
  },

  _endTutorial: function(e) {
    if (!this._inTutorial) return;
    this._inTutorial = false;
    _tutorialShown = true;

    // Cancel all tutorial timers/intervals
    if (this._tutorialTimers) {
      for (var i = 0; i < this._tutorialTimers.length; i++) {
        clearInterval(this._tutorialTimers[i]);
        clearTimeout(this._tutorialTimers[i]);
      }
      this._tutorialTimers = null;
    }

    // Remove tutorial layer
    if (this._tutorialLayer) {
      if (this._tutorialLayer.parent) {
        this._tutorialLayer.parent.removeChild(this._tutorialLayer);
      }
      this._tutorialLayer.destroy({ children: true });
      this._tutorialLayer = null;
    }

    // Reset ball to natural position (center, just above mid)
    if (this._ballGfx) {
      this._ballGfx.scale.set(1.0);
      this._ballGfx.y = this._ballY;
    }

    // Start real physics loop
    var self = this;
    this._tickInterval = setInterval(function() {
      self._tick();
    }, 16);

    // Count this tap as bounce #1
    this._onTap(e);
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

    // 공 근처를 탭해야 튀김 (반경 80px 이내)
    var tapX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : this._ballX);
    var tapY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : this._ballY);
    var distX = tapX - this._ballX;
    var canvasRect = this._app && this._app.canvas ? this._app.canvas.getBoundingClientRect() : { top: 0, left: 0 };
    var distY = tapY - (this._ballY + canvasRect.top);
    var dist = Math.sqrt(distX * distX + distY * distY);
    if (dist > 80) return;  // 공에서 너무 멀면 무시

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

    // Milestone celebrations at 5, 10, 20 handle their own speech
    var isMilestone = (this._bounceCount === 5 || this._bounceCount === 10 || this._bounceCount === 20);
    if (isMilestone) {
      this._doMilestoneCelebration();
    } else {
      var word = BB_COUNT_WORDS[this._bounceCount] || String(this._bounceCount);
      speakText(word, 1.1);
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

    // "다시 할래?" popup with DOM buttons
    var self = this;
    var savedSt = this._st;
    var cb = this._onComplete;
    this._onComplete = null;

    setTimeout(function() {
      if (!self._overlay) return;
      var popup = document.createElement('div');
      popup.style.cssText = 'position:absolute;left:50%;bottom:18%;transform:translateX(-50%);display:flex;gap:16px;z-index:400;';

      var btnStyle = 'font-family:"DungGeunMo",monospace;font-size:1.3rem;color:#1a1830;border:none;border-radius:14px;padding:16px 28px;min-width:140px;cursor:pointer;box-shadow:0 5px 0 rgba(0,0,0,0.35);font-weight:bold;';

      var againBtn = document.createElement('button');
      againBtn.style.cssText = btnStyle + 'background:#f8d848;';
      againBtn.textContent = '다시 할래!';
      againBtn.onclick = function() {
        speakText('다시 해보자!', 0.9);
        self._cleanup();
        self.start(savedSt, cb);
      };

      var stopBtn = document.createElement('button');
      stopBtn.style.cssText = btnStyle + 'background:#88c8f8;';
      stopBtn.textContent = '그만할래';
      stopBtn.onclick = function() {
        self._cleanup();
        if (cb) cb(stars);
      };

      popup.appendChild(againBtn);
      popup.appendChild(stopBtn);
      self._overlay.appendChild(popup);
      self._resultPopup = popup;
    }, 1200);
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

    // Cancel any pending tutorial timers
    if (this._tutorialTimers) {
      for (var i = 0; i < this._tutorialTimers.length; i++) {
        clearInterval(this._tutorialTimers[i]);
        clearTimeout(this._tutorialTimers[i]);
      }
      this._tutorialTimers = null;
    }

    this._inTutorial = false;
    this._tutorialLayer = null;

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
    this._resultPopup = null;
  }
};
