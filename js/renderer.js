// js/renderer.js
// Pet renderer — draws the pet character on top of World's stage

var PetRenderer = {
  container: null,
  body: null,
  leftEye: null,
  rightEye: null,
  leftHighlight: null,
  rightHighlight: null,
  mouth: null,
  leftCheek: null,
  rightCheek: null,
  _zzz: null,
  _blinkTimer: 0,
  _blinkInterval: 0,
  _isBlinking: false,
  _wanderX: 0,
  _wanderTargetX: 0,
  _wanderTimer: 0,
  _jumpY: 0,
  _jumpTimer: 0,
  _mood: 'happy',
  _frame: 0,
  _pettedTimer: 0,
  _wiggleTimer: 0,
  _app: null,
  _stage: 0,
  _needBubble: null,   // PixiJS container for need thought bubble
  _needType: null,     // current need: 'hungry'|'bored'|'sleepy'|null
  _needFrame: 0,

  init: function(app, st) {
    var self = this;
    self._app = app;

    var container = new PIXI.Container();
    self.container = container;

    // Position: center-bottom of screen, above grass
    var W = app.screen.width;
    var H = app.screen.height;
    container.x = W / 2;
    container.y = H * 0.52;

    app.stage.addChild(container);

    self.buildPet(st ? st.stage : 0);

    // Zzz text for sleeping
    var zStyle = new PIXI.TextStyle({
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#6880a0',
    });
    var zzz = new PIXI.Text({ text: 'z z z', style: zStyle });
    zzz.anchor.set(0, 1);
    zzz.x = 30;
    zzz.y = -60;
    zzz.visible = false;
    container.addChild(zzz);
    self._zzz = zzz;

    // Pointer interaction: tap pet to pet it
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', function() {
      if (typeof handleAction === 'function') handleAction('pet');
    });

    // Set random initial blink interval (180–300 frames)
    self._blinkInterval = 180 + Math.floor(Math.random() * 120);

    app.ticker.add(function() { self.animate(); });
  },

  buildPet: function(stage) {
    var self = this;
    // Remove old pet parts (not the zzz)
    if (self.body)           { self.container.removeChild(self.body);           self.body.destroy(); }
    if (self.leftEye)        { self.container.removeChild(self.leftEye);        self.leftEye.destroy(); }
    if (self.rightEye)       { self.container.removeChild(self.rightEye);       self.rightEye.destroy(); }
    if (self.leftHighlight)  { self.container.removeChild(self.leftHighlight);  self.leftHighlight.destroy(); }
    if (self.rightHighlight) { self.container.removeChild(self.rightHighlight); self.rightHighlight.destroy(); }
    if (self.mouth)          { self.container.removeChild(self.mouth);          self.mouth.destroy(); }
    if (self.leftCheek)      { self.container.removeChild(self.leftCheek);      self.leftCheek.destroy(); }
    if (self.rightCheek)     { self.container.removeChild(self.rightCheek);     self.rightCheek.destroy(); }
    if (self.feet)           { self.container.removeChild(self.feet);           self.feet.destroy(); }
    if (self.ears)           { self.container.removeChild(self.ears);           self.ears.destroy(); }
    if (self.arms)           { self.container.removeChild(self.arms);           self.arms.destroy(); }
    if (self.crown)          { self.container.removeChild(self.crown);          self.crown.destroy(); }

    self._drawBody(stage);
  },

  _drawBody: function(stage) {
    var self = this;
    self._stage = stage;
    var data = PET_STAGES[Math.min(stage, PET_STAGES.length - 1)];
    var bW = data.bodyW;
    var bH = data.bodyH;
    var hx = bW / 2;
    var hy = bH / 2;
    var col = data.color;

    // === BODY ===
    var strokeCol = data.strokeColor || 0xe8d0b8;
    var body = new PIXI.Graphics();
    if (stage === 0) {
      // Egg: taller oval
      body.ellipse(0, 0, bW / 2, bH / 2);
      body.fill({ color: col });
      body.stroke({ color: strokeCol, width: 2 });
      // Crack line (zigzag)
      body.moveTo(-8, -bH * 0.05);
      body.lineTo(-4,  bH * 0.05);
      body.lineTo( 2, -bH * 0.02);
      body.lineTo( 7,  bH * 0.06);
      body.stroke({ color: 0xc8a080, width: 2 });
    } else {
      // Rounded rectangle body
      var rx = bW * parseFloat(data.bodyRadius) / 100;
      body.roundRect(-hx, -hy, bW, bH, rx);
      body.fill({ color: col });
      body.stroke({ color: strokeCol, width: 2 });
    }
    self.container.addChildAt(body, 0);
    self.body = body;

    if (stage === 0) return; // Egg has no face

    // === EARS (stages 3+) ===
    if (data.hasEars) {
      var ears = new PIXI.Graphics();
      // Left ear
      ears.ellipse(-hx * 0.85, -hy * 0.85, bW * 0.12, bH * 0.14);
      ears.fill({ color: col });
      ears.stroke({ color: strokeCol, width: 1.5 });
      // Right ear
      ears.ellipse(hx * 0.85, -hy * 0.85, bW * 0.12, bH * 0.14);
      ears.fill({ color: col });
      ears.stroke({ color: strokeCol, width: 1.5 });
      self.container.addChildAt(ears, 0); // behind body
      self.ears = ears;
    }

    // === CROWN (stages 6+) ===
    if (data.hasCrown) {
      var crown = new PIXI.Graphics();
      var cw = bW * 0.55;
      crown.moveTo(-cw / 2, -hy - 4);
      crown.lineTo(-cw / 2, -hy - 16);
      crown.lineTo(-cw / 6, -hy - 8);
      crown.lineTo(0,        -hy - 20);
      crown.lineTo( cw / 6, -hy - 8);
      crown.lineTo( cw / 2, -hy - 16);
      crown.lineTo( cw / 2, -hy - 4);
      crown.closePath();
      crown.fill({ color: 0xf0c030 });
      crown.stroke({ color: 0xd8a820, width: 1.5 });
      self.container.addChild(crown);
      self.crown = crown;
    }

    // === ARMS (stages 5+) ===
    if (data.hasArms) {
      var arms = new PIXI.Graphics();
      // Left arm
      arms.ellipse(-hx - bW * 0.08, 0, bW * 0.10, bH * 0.18);
      arms.fill({ color: col });
      arms.stroke({ color: strokeCol, width: 1.5 });
      // Right arm
      arms.ellipse(hx + bW * 0.08, 0, bW * 0.10, bH * 0.18);
      arms.fill({ color: col });
      arms.stroke({ color: strokeCol, width: 1.5 });
      self.container.addChild(arms);
      self.arms = arms;
    }

    // === FEET (stages 2+) ===
    if (data.hasFeet) {
      var feet = new PIXI.Graphics();
      // Left foot
      feet.ellipse(-hx * 0.45, hy + bH * 0.07, bW * 0.15, bH * 0.09);
      feet.fill({ color: col });
      feet.stroke({ color: strokeCol, width: 1.5 });
      // Right foot
      feet.ellipse(hx * 0.45, hy + bH * 0.07, bW * 0.15, bH * 0.09);
      feet.fill({ color: col });
      feet.stroke({ color: strokeCol, width: 1.5 });
      self.container.addChild(feet);
      self.feet = feet;
    }

    // === CHEEKS ===
    var cheekSize = bW * 0.13;
    var leftCheek = new PIXI.Graphics();
    leftCheek.ellipse(-hx * 0.55, hy * 0.25, cheekSize, cheekSize * 0.6);
    leftCheek.fill({ color: 0xf0a8a0, alpha: 0.55 });
    self.container.addChild(leftCheek);
    self.leftCheek = leftCheek;

    var rightCheek = new PIXI.Graphics();
    rightCheek.ellipse(hx * 0.55, hy * 0.25, cheekSize, cheekSize * 0.6);
    rightCheek.fill({ color: 0xf0a8a0, alpha: 0.55 });
    self.container.addChild(rightCheek);
    self.rightCheek = rightCheek;

    // === EYES ===
    var eyeSize = data.eyeSize || 11;
    var eyeY = -hy * 0.30;
    var eyeOffX = hx * 0.40;

    var leftEye = new PIXI.Graphics();
    leftEye.circle(-eyeOffX, eyeY, eyeSize);
    leftEye.fill({ color: 0x3a3028 });
    self.container.addChild(leftEye);
    self.leftEye = leftEye;

    var rightEye = new PIXI.Graphics();
    rightEye.circle(eyeOffX, eyeY, eyeSize);
    rightEye.fill({ color: 0x3a3028 });
    self.container.addChild(rightEye);
    self.rightEye = rightEye;

    // Eye highlights
    var leftHL = new PIXI.Graphics();
    leftHL.circle(-eyeOffX + eyeSize * 0.3, eyeY - eyeSize * 0.3, eyeSize * 0.35);
    leftHL.fill({ color: 0xffffff });
    self.container.addChild(leftHL);
    self.leftHighlight = leftHL;

    var rightHL = new PIXI.Graphics();
    rightHL.circle(eyeOffX + eyeSize * 0.3, eyeY - eyeSize * 0.3, eyeSize * 0.35);
    rightHL.fill({ color: 0xffffff });
    self.container.addChild(rightHL);
    self.rightHighlight = rightHL;

    // === MOUTH ===
    var mouth = new PIXI.Graphics();
    self.container.addChild(mouth);
    self.mouth = mouth;

    self.setExpression('happy');
  },

  setExpression: function(mood) {
    var self = this;
    self._mood = mood;

    if (!self.leftEye || !self.mouth) return;

    // Derive eye geometry from current stage data to stay consistent with _drawBody
    var stageIdx = Math.min(self._stage || 0, PET_STAGES.length - 1);
    var data = PET_STAGES[stageIdx];
    var bW = data.bodyW;
    var bH = data.bodyH;
    var hx = bW / 2;
    var hy = bH / 2;

    self.leftEye.clear();
    self.rightEye.clear();
    self.leftHighlight.clear();
    self.rightHighlight.clear();
    self.mouth.clear();

    var eyeR = data.eyeSize || 11;
    var eyeY = -hy * 0.30;
    var eyeOffX = hx * 0.40;

    if (mood === 'sleeping') {
      // Closed horizontal lines
      self.leftEye.rect(-eyeOffX - eyeR, eyeY - 1.5, eyeR * 2, 3);
      self.leftEye.fill({ color: 0x3a3028 });
      self.rightEye.rect(eyeOffX - eyeR, eyeY - 1.5, eyeR * 2, 3);
      self.rightEye.fill({ color: 0x3a3028 });
      // No highlights, no mouth shown clearly
      if (self._zzz) self._zzz.visible = true;
      return;
    }

    if (self._zzz) self._zzz.visible = false;

    if (mood === 'happy') {
      // Round eyes
      self.leftEye.circle(-eyeOffX, eyeY, eyeR);
      self.leftEye.fill({ color: 0x3a3028 });
      self.rightEye.circle(eyeOffX, eyeY, eyeR);
      self.rightEye.fill({ color: 0x3a3028 });
      // Highlights
      self.leftHighlight.circle(-eyeOffX + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35);
      self.leftHighlight.fill({ color: 0xffffff });
      self.rightHighlight.circle(eyeOffX + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35);
      self.rightHighlight.fill({ color: 0xffffff });
      // Wide smile arc
      self.mouth.arc(0, eyeY + eyeR * 2.8, eyeR * 1.4, 0.15, Math.PI - 0.15);
      self.mouth.stroke({ color: 0x3a3028, width: 2.5 });

    } else if (mood === 'neutral') {
      // Round eyes
      self.leftEye.circle(-eyeOffX, eyeY, eyeR);
      self.leftEye.fill({ color: 0x3a3028 });
      self.rightEye.circle(eyeOffX, eyeY, eyeR);
      self.rightEye.fill({ color: 0x3a3028 });
      // Highlights
      self.leftHighlight.circle(-eyeOffX + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35);
      self.leftHighlight.fill({ color: 0xffffff });
      self.rightHighlight.circle(eyeOffX + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35);
      self.rightHighlight.fill({ color: 0xffffff });
      // Flat mouth
      self.mouth.moveTo(-eyeR * 1.0, eyeY + eyeR * 2.8);
      self.mouth.lineTo( eyeR * 1.0, eyeY + eyeR * 2.8);
      self.mouth.stroke({ color: 0x3a3028, width: 2.5 });

    } else if (mood === 'sad') {
      // Droopy eyes — slightly squinted
      self.leftEye.ellipse(-eyeOffX, eyeY, eyeR, eyeR * 0.7);
      self.leftEye.fill({ color: 0x3a3028 });
      self.rightEye.ellipse(eyeOffX, eyeY, eyeR, eyeR * 0.7);
      self.rightEye.fill({ color: 0x3a3028 });
      self.leftHighlight.circle(-eyeOffX + eyeR * 0.3, eyeY - eyeR * 0.2, eyeR * 0.3);
      self.leftHighlight.fill({ color: 0xffffff });
      self.rightHighlight.circle(eyeOffX + eyeR * 0.3, eyeY - eyeR * 0.2, eyeR * 0.3);
      self.rightHighlight.fill({ color: 0xffffff });
      // Frown arc (upside-down smile)
      self.mouth.arc(0, eyeY + eyeR * 4.2, eyeR * 1.3, Math.PI + 0.15, -0.15);
      self.mouth.stroke({ color: 0x3a3028, width: 2.5 });
    }
  },

  update: function(st) {
    var self = this;
    if (!self.container || !self._app) return;

    // Update expression based on mood
    var mood = typeof Pet !== 'undefined' ? Pet.getMood(st) : 'neutral';
    if (self._pettedTimer > 0) {
      self._pettedTimer--;
      mood = 'happy';
    }
    if (mood !== self._mood) {
      self.setExpression(mood);
    }

    // Update zzz visibility
    if (self._zzz) {
      self._zzz.visible = (st && st.sleeping);
    }

    // Wander: determine energy from stats
    var avg = 50;
    if (st) {
      avg = (st.hunger + st.mood + (100 - st.sleepy)) / 3;
    }
    var speed = avg >= 60 ? 0.05 : avg >= 30 ? 0.025 : 0.012;

    self._wanderTimer++;
    var interval = avg >= 60 ? 80 : 180;
    if (self._wanderTimer >= interval) {
      self._wanderTimer = 0;
      var range = avg >= 60 ? 60 : 25;
      self._wanderTargetX = (Math.random() - 0.5) * range;
    }

    if (st && st.sleeping) {
      self._wanderX *= 0.96;
    } else {
      self._wanderX += (self._wanderTargetX - self._wanderX) * speed;
    }

    var W = self._app.screen.width;
    self.container.x = W / 2 + self._wanderX;
    // container.y is managed by animate() which also applies bob + _jumpY
  },

  animate: function() {
    var self = this;
    if (!self.container) return;
    self._frame++;

    // Idle bob
    var bob = Math.sin(self._frame * 0.055) * 3;
    self.container.y = (self._app ? self._app.screen.height * 0.52 : 300) + self._jumpY + bob;

    // Blink logic
    self._blinkTimer++;
    if (!self._isBlinking && self._blinkTimer >= self._blinkInterval) {
      self._isBlinking = true;
      self._blinkTimer = 0;
      self._blinkInterval = 180 + Math.floor(Math.random() * 120);
      // Squish eyes for 150ms
      if (self.leftEye)  self.leftEye.scale.y  = 0.15;
      if (self.rightEye) self.rightEye.scale.y  = 0.15;
      if (self.leftHighlight)  self.leftHighlight.visible  = false;
      if (self.rightHighlight) self.rightHighlight.visible = false;
      setTimeout(function() {
        self._isBlinking = false;
        if (self.leftEye)  self.leftEye.scale.y  = 1;
        if (self.rightEye) self.rightEye.scale.y  = 1;
        if (self.leftHighlight)  self.leftHighlight.visible  = true;
        if (self.rightHighlight) self.rightHighlight.visible = true;
      }, 150);
    }

    // Jump decay
    if (self._jumpTimer > 0) {
      self._jumpTimer--;
      self._jumpY = -Math.sin((1 - self._jumpTimer / 20) * Math.PI) * 40;
    } else {
      self._jumpY *= 0.85;
    }

    // Wiggle (egg tap)
    if (self._wiggleTimer > 0) {
      self._wiggleTimer--;
      self.container.rotation = Math.sin(self._wiggleTimer * 0.6) * 0.18 * (self._wiggleTimer / 15);
    } else {
      self.container.rotation *= 0.8;
    }

    // Zzz float animation
    if (self._zzz && self._zzz.visible) {
      self._zzz.y = -60 + Math.sin(self._frame * 0.04) * 6;
      self._zzz.alpha = 0.5 + 0.5 * Math.abs(Math.sin(self._frame * 0.04));
    }

    // Need bubble — strong pulse + sparkle to attract attention
    if (self._needBubble) {
      self._needFrame++;
      // Big bounce up and down
      self._needBubble.y = -85 + Math.sin(self._needFrame * 0.06) * 10;
      // Strong scale pulse (1.0 → 1.25 → 1.0)
      var pulse = 1.0 + 0.2 * Math.abs(Math.sin(self._needFrame * 0.08));
      self._needBubble.scale.set(pulse);
      // Rotate slightly back and forth
      self._needBubble.rotation = Math.sin(self._needFrame * 0.1) * 0.08;
      // Spawn sparkle every ~40 frames
      if (self._needFrame % 40 === 0 && self._app) {
        var sparkle = new PIXI.Graphics();
        sparkle.star(0, 0, 5, 6, 3).fill({ color: 0xf0d060 });
        sparkle.x = self.container.x + self._needBubble.x + (Math.random() - 0.5) * 40;
        sparkle.y = self.container.y + self._needBubble.y + (Math.random() - 0.5) * 30;
        sparkle.alpha = 1;
        sparkle._life = 30;
        self._app.stage.addChild(sparkle);
        (function(s) {
          var t = function() {
            s.y -= 0.8;
            s.alpha -= 0.033;
            s.rotation += 0.1;
            s._life--;
            if (s._life <= 0) {
              self._app.stage.removeChild(s);
              self._app.ticker.remove(t);
              s.destroy();
            }
          };
          self._app.ticker.add(t);
        })(sparkle);
      }
    }
  },

  wiggle: function() {
    this._wiggleTimer = 15;
  },

  celebrate: function() {
    var self = this;
    self._jumpTimer = 20;
    self.setExpression('happy');
    // Show celebration particles at pet position
    if (typeof showCelebration === 'function' && self._app) {
      var cx = self.container.x;
      var cy = self.container.y - 30;
      showCelebration(cx, cy);
    }
  },

  petted: function() {
    var self = this;
    self._pettedTimer = 120; // ~2 seconds at 60fps
    self.setExpression('happy');
    // Bounce
    self._jumpTimer = 14;
    // Float hearts up from pet
    if (typeof World !== 'undefined' && World.app && self.container) {
      var heartTexts = ['\u2665', '\u2665', '\u2665'];
      for (var i = 0; i < heartTexts.length; i++) {
        (function(idx) {
          setTimeout(function() {
            var heart = new PIXI.Text({
              text: heartTexts[idx],
              style: { fontSize: 16 + Math.random() * 10, fill: 0xf08080, fontWeight: 'bold' }
            });
            heart.x = self.container.x + (Math.random() - 0.5) * 40;
            heart.y = self.container.y - 20;
            heart.alpha = 1;
            heart._vy = -1.2 - Math.random() * 0.8;
            heart._vx = (Math.random() - 0.5) * 0.8;
            heart._life = 55;
            World.app.stage.addChild(heart);
            var ticker = function() {
              heart.x += heart._vx;
              heart.y += heart._vy;
              heart.alpha -= 0.018;
              heart._life--;
              if (heart._life <= 0) {
                World.app.stage.removeChild(heart);
                World.app.ticker.remove(ticker);
                heart.destroy();
              }
            };
            World.app.ticker.add(ticker);
          }, idx * 180);
        })(i);
      }
    }
    if (typeof playSound === 'function') playSound('click');
  },

  // Show/hide need thought bubble above pet (PixiJS drawn)
  showNeed: function(needType) {
    var self = this;
    if (self._needType === needType) return;
    self._needType = needType;
    self._needFrame = 0;

    // Remove old bubble
    if (self._needBubble && self.container) {
      self.container.removeChild(self._needBubble);
      self._needBubble.destroy({ children: true });
      self._needBubble = null;
    }

    if (!needType || !self.container) return;

    var bubble = new PIXI.Container();
    bubble.y = -80;
    bubble.x = 30;

    // Thought bubble background (cloud shape)
    var bg = new PIXI.Graphics();
    bg.circle(0, 0, 28).fill({ color: 0xffffff, alpha: 0.95 });
    // Small circles for thought trail
    bg.circle(-12, 22, 6).fill({ color: 0xffffff, alpha: 0.9 });
    bg.circle(-6, 30, 4).fill({ color: 0xffffff, alpha: 0.85 });
    bubble.addChild(bg);

    // Draw icon based on need type
    var icon = new PIXI.Graphics();
    if (needType === 'hungry') {
      // Rice bowl: bowl shape + steam lines
      icon.roundRect(-14, 2, 28, 14, 4).fill({ color: 0xf4b870 });
      icon.ellipse(0, 2, 16, 5).fill({ color: 0xf4b870 });
      // Rice inside
      icon.ellipse(0, -1, 12, 6).fill({ color: 0xffffff });
      // Steam lines
      icon.moveTo(-6, -10).quadraticCurveTo(-6, -16, -3, -16).stroke({ color: 0xcccccc, width: 1.5, alpha: 0.6 });
      icon.moveTo(0, -12).quadraticCurveTo(0, -18, 3, -18).stroke({ color: 0xcccccc, width: 1.5, alpha: 0.6 });
      icon.moveTo(6, -10).quadraticCurveTo(6, -16, 9, -16).stroke({ color: 0xcccccc, width: 1.5, alpha: 0.6 });
    } else if (needType === 'sleepy') {
      // Zzz text
      var zzz = new PIXI.Text({ text: 'Z', style: { fontSize: 20, fill: 0xc8a0d8, fontWeight: 'bold' } });
      zzz.anchor.set(0.5);
      zzz.x = -6; zzz.y = -4;
      bubble.addChild(zzz);
      var zz2 = new PIXI.Text({ text: 'z', style: { fontSize: 14, fill: 0xc8a0d8, fontWeight: 'bold' } });
      zz2.anchor.set(0.5);
      zz2.x = 8; zz2.y = -12;
      bubble.addChild(zz2);
    } else if (needType === 'bored') {
      // Play ball
      icon.circle(0, -2, 12).fill({ color: 0xa8d8b0 });
      icon.circle(0, -2, 12).stroke({ color: 0x88b890, width: 1.5 });
      // Star on ball
      icon.star(0, -2, 5, 4, 3).fill({ color: 0xf0d060 });
    }
    bubble.addChild(icon);

    // Make interactive — tap to pop bubble and enter learning
    bubble.eventMode = 'static';
    bubble.cursor = 'pointer';
    bubble.hitArea = new PIXI.Circle(0, 0, 40);
    bubble.on('pointerdown', function() {
      // Pop effect: scale up then disappear
      if (typeof playSound === 'function') playSound('click');
      // Burst particles from bubble
      if (self._app && self.container) {
        var bx = self.container.x + bubble.x;
        var by = self.container.y + bubble.y;
        if (typeof showStarParticles === 'function') {
          showStarParticles(bx, by, 8);
        }
      }
      // Quick scale-up then hide
      bubble.scale.set(1.5);
      bubble.alpha = 0.5;
      setTimeout(function() {
        self.hideNeed();
        if (typeof handleActionClick === 'function') {
          handleActionClick();
        }
      }, 200);
    });

    self._needBubble = bubble;
    self.container.addChild(bubble);
  },

  hideNeed: function() {
    this.showNeed(null);
  },
};
