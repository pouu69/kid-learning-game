// js/renderer.js
// Pet renderer — draws the pet character on top of World's stage
// Pixel-art style: all shapes use rect() instead of roundRect/ellipse/circle

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
  _needType: null,      // current need: 'hungry'|'bored'|'sleepy'|null
  _needFrame: 0,
  _feedAnimTimer: 0,    // feeding animation countdown
  _chewCount: 0,        // chew cycles remaining

  // Physics / drag-drop system
  _isDragging: false,
  _physicsMode: false,
  _velX: 0,
  _velY: 0,
  _physX: 0,
  _physY: 0,
  _lastPointerX: 0,
  _lastPointerY: 0,
  _prevPointerX: 0,
  _prevPointerY: 0,
  _groundY: 0,
  _bounceCount: 0,
  _squashTimer: 0,

  // Task 4: State behavior system
  _stateAction: null,       // 'hungry_wobble'|'sleepy_nod'|'sad_crouch'|null
  _stateActionFrame: 0,
  _needIconGfx: null,       // floating icon above pet
  _stateZzzList: [],         // floating Z rects for sleepy_nod
  _stateArrow: null,         // bouncing arrow indicator

  // Task 5: Pixel particle system
  _particles: [],
  _celebrateFlashTimer: 0,
  _shakeTimer: 0,
  _shakeIntensity: 0,

  init: function(app, st) {
    var self = this;
    self._app = app;

    var container = new PIXI.Container();
    self.container = container;

    var W = app.screen.width;
    var H = app.screen.height;
    container.x = W / 2;
    container.y = H * 0.52;

    app.stage.addChild(container);

    // Shadow under pet — flat rect for pixel art style
    var shadow = new PIXI.Graphics();
    shadow.rect(-30, 0, 60, 8).fill({ color: 0x000000, alpha: 0.12 });
    shadow.y = 80;
    container.addChildAt(shadow, 0);
    self._shadow = shadow;

    self.buildPet(st ? st.stage : 0);

    // Zzz text for sleeping — DungGeunMo font
    var zStyle = new PIXI.TextStyle({
      fontFamily: '"DungGeunMo", monospace',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#a888d0',
    });
    var zzz = new PIXI.Text({ text: 'z z z', style: zStyle });
    zzz.anchor.set(0, 1);
    zzz.x = 30;
    zzz.y = -60;
    zzz.visible = false;
    container.addChild(zzz);
    self._zzz = zzz;

    // Pointer interaction: drag pet or tap to pet
    container.eventMode = 'static';
    container.cursor = 'pointer';
    self._groundY = H * 0.52;

    // Drag state
    var dragStartTime = 0;
    var dragMoved = false;

    container.on('pointerdown', function(e) {
      if (self._stage === 0) {
        if (typeof handleAction === 'function') handleAction('pet');
        return;
      }
      self._isDragging = true;
      self._physicsMode = false;
      dragMoved = false;
      dragStartTime = Date.now();

      var px = e.global.x;
      var py = e.global.y;
      self._lastPointerX = px;
      self._lastPointerY = py;
      self._prevPointerX = px;
      self._prevPointerY = py;
      self._physX = self.container.x;
      self._physY = self.container.y;
      self._velX = 0;
      self._velY = 0;

      self._pettedTimer = 60;
      self.setExpression('happy');
    });

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    app.stage.on('pointermove', function(e) {
      if (!self._isDragging) return;
      var px = e.global.x;
      var py = e.global.y;

      var dx = px - self._lastPointerX;
      var dy = py - self._lastPointerY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;

      self._prevPointerX = self._lastPointerX;
      self._prevPointerY = self._lastPointerY;
      self._lastPointerX = px;
      self._lastPointerY = py;

      self._physX = px;
      self._physY = py;
      self.container.x = px;
      self.container.y = py;

      self.container.rotation = Math.max(-0.3, Math.min(0.3, dx * 0.03));
    });

    app.stage.on('pointerup', function() {
      if (!self._isDragging) return;
      self._isDragging = false;

      var elapsed = Date.now() - dragStartTime;

      if (!dragMoved && elapsed < 300) {
        // Short tap without drag: pet action + sparkle particles
        self._physicsMode = false;
        self.emitPixelParticles('sparkle', 8);
        if (typeof handleAction === 'function') handleAction('pet');
        return;
      }

      self._velX = (self._lastPointerX - self._prevPointerX) * 0.8;
      self._velY = (self._lastPointerY - self._prevPointerY) * 0.8;

      var maxVel = 18;
      self._velX = Math.max(-maxVel, Math.min(maxVel, self._velX));
      self._velY = Math.max(-maxVel, Math.min(maxVel, self._velY));

      self._physicsMode = true;
      self._bounceCount = 0;
      self._physX = self.container.x;
      self._physY = self.container.y;

      if (self._physY < self._groundY - 20) {
        self.setExpression('sad');
      }
    });

    app.stage.on('pointerupoutside', function() {
      if (!self._isDragging) return;
      self._isDragging = false;
      self._physicsMode = true;
      self._bounceCount = 0;
      self._physX = self.container.x;
      self._physY = self.container.y;
      self._velX = 0;
      self._velY = 0;
    });

    self._blinkInterval = 180 + Math.floor(Math.random() * 120);

    app.ticker.add(function() { self.animate(); });
  },

  buildPet: function(stage) {
    var self = this;
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
    if (self.wings)          { self.container.removeChild(self.wings);          self.wings.destroy(); }

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
    var strokeCol = data.strokeColor || 0xe8d0b8;
    var sw = data.strokeW || 4;

    // === BODY (pixel rect with border) ===
    var body = new PIXI.Graphics();
    if (stage === 0) {
      // Egg: rect body with stroke border
      body.rect(-hx - sw, -hy - sw, bW + sw * 2, bH + sw * 2);
      body.fill({ color: strokeCol });
      body.rect(-hx, -hy, bW, bH);
      body.fill({ color: col });
      // Zigzag crack line
      body.moveTo(-10, -bH * 0.05);
      body.lineTo(-5,  bH * 0.08);
      body.lineTo( 2, -bH * 0.03);
      body.lineTo( 8,  bH * 0.07);
      body.lineTo(12, -bH * 0.02);
      body.stroke({ color: 0xc8a080, width: 3 });
    } else {
      // Outer rect (stroke border)
      body.rect(-hx - sw, -hy - sw, bW + sw * 2, bH + sw * 2);
      body.fill({ color: strokeCol });
      // Inner rect (body fill)
      body.rect(-hx, -hy, bW, bH);
      body.fill({ color: col });
    }
    self.container.addChildAt(body, 0);
    self.body = body;

    if (stage === 0) return; // Egg has no face

    // === WINGS (stage 7 only) — behind body ===
    if (data.hasWings) {
      var wings = new PIXI.Graphics();
      var wingW = 16;
      var wingH = 28;
      // Left wing — angled rects
      wings.rect(-hx - wingW - 4, -hy * 0.3, wingW, wingH);
      wings.fill({ color: 0xc0e0f8 });
      wings.rect(-hx - wingW - 4 - 2, -hy * 0.3 - 2, wingW + 4, wingH + 4);
      wings.stroke({ color: 0x90b8d8, width: 2 });
      // Right wing
      wings.rect(hx + 4, -hy * 0.3, wingW, wingH);
      wings.fill({ color: 0xc0e0f8 });
      wings.rect(hx + 4 - 2, -hy * 0.3 - 2, wingW + 4, wingH + 4);
      wings.stroke({ color: 0x90b8d8, width: 2 });
      self.container.addChildAt(wings, 0); // behind body
      self.wings = wings;
    }

    // === EARS (stages 3+) — small rects above body corners ===
    if (data.hasEars) {
      var ears = new PIXI.Graphics();
      var earW = 12;
      var earH = 14;
      // Left ear
      ears.rect(-hx + 4, -hy - earH + 2, earW, earH);
      ears.fill({ color: col });
      ears.rect(-hx + 4 - 2, -hy - earH, earW + 4, earH + 4);
      ears.stroke({ color: strokeCol, width: 2 });
      // Right ear
      ears.rect(hx - 4 - earW, -hy - earH + 2, earW, earH);
      ears.fill({ color: col });
      ears.rect(hx - 4 - earW - 2, -hy - earH, earW + 4, earH + 4);
      ears.stroke({ color: strokeCol, width: 2 });
      self.container.addChildAt(ears, 0); // behind body
      self.ears = ears;
    }

    // === CROWN (stages 6+) — 3 rect blocks in stepped pyramid ===
    if (data.hasCrown) {
      var crown = new PIXI.Graphics();
      var crownColor = 0xf0c030;
      var crownStroke = 0xd8a820;
      // Center block (tallest)
      crown.rect(-6, -hy - 18, 12, 14);
      crown.fill({ color: crownColor });
      // Left block
      crown.rect(-20, -hy - 12, 12, 8);
      crown.fill({ color: crownColor });
      // Right block
      crown.rect(8, -hy - 12, 12, 8);
      crown.fill({ color: crownColor });
      // Border around all
      crown.rect(-22, -hy - 20, 44, 22);
      crown.stroke({ color: crownStroke, width: 2 });
      self.container.addChild(crown);
      self.crown = crown;
    }

    // === ARMS (stages 5+) — small rects to left/right sides ===
    if (data.hasArms) {
      var arms = new PIXI.Graphics();
      var armW = 10;
      var armH = 20;
      // Left arm
      arms.rect(-hx - armW, -armH * 0.3, armW, armH);
      arms.fill({ color: col });
      arms.rect(-hx - armW - 2, -armH * 0.3 - 2, armW + 4, armH + 4);
      arms.stroke({ color: strokeCol, width: 2 });
      // Right arm
      arms.rect(hx, -armH * 0.3, armW, armH);
      arms.fill({ color: col });
      arms.rect(hx - 2, -armH * 0.3 - 2, armW + 4, armH + 4);
      arms.stroke({ color: strokeCol, width: 2 });
      self.container.addChild(arms);
      self.arms = arms;
    }

    // === FEET (stages 2+) — small rects below body ===
    if (data.hasFeet) {
      var feet = new PIXI.Graphics();
      var footW = 14;
      var footH = 8;
      // Left foot
      feet.rect(-hx * 0.55, hy, footW, footH);
      feet.fill({ color: col });
      feet.rect(-hx * 0.55 - 2, hy - 2, footW + 4, footH + 4);
      feet.stroke({ color: strokeCol, width: 2 });
      // Right foot
      feet.rect(hx * 0.55 - footW, hy, footW, footH);
      feet.fill({ color: col });
      feet.rect(hx * 0.55 - footW - 2, hy - 2, footW + 4, footH + 4);
      feet.stroke({ color: strokeCol, width: 2 });
      self.container.addChild(feet);
      self.feet = feet;
    }

    // === CHEEKS — small colored rects with low alpha ===
    var cheekW = 10;
    var cheekH = 6;
    var leftCheek = new PIXI.Graphics();
    leftCheek.rect(-hx * 0.6, hy * 0.15, cheekW, cheekH);
    leftCheek.fill({ color: 0xf0a8a0, alpha: 0.4 });
    self.container.addChild(leftCheek);
    self.leftCheek = leftCheek;

    var rightCheek = new PIXI.Graphics();
    rightCheek.rect(hx * 0.6 - cheekW, hy * 0.15, cheekW, cheekH);
    rightCheek.fill({ color: 0xf0a8a0, alpha: 0.4 });
    self.container.addChild(rightCheek);
    self.rightCheek = rightCheek;

    // === EYES — small dark rects with white highlight rect (top-left pixel) ===
    var eyeSize = data.eyeSize || 8;
    var eyeY = -hy * 0.30;
    var eyeOffX = hx * 0.40;

    var leftEye = new PIXI.Graphics();
    leftEye.rect(-eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);
    leftEye.fill({ color: 0x3a3028 });
    self.container.addChild(leftEye);
    self.leftEye = leftEye;

    var rightEye = new PIXI.Graphics();
    rightEye.rect(eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);
    rightEye.fill({ color: 0x3a3028 });
    self.container.addChild(rightEye);
    self.rightEye = rightEye;

    // Eye highlights — small white rect at top-left of each eye
    var hlSize = Math.max(2, Math.floor(eyeSize * 0.35));
    var leftHL = new PIXI.Graphics();
    leftHL.rect(-eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, hlSize, hlSize);
    leftHL.fill({ color: 0xffffff });
    self.container.addChild(leftHL);
    self.leftHighlight = leftHL;

    var rightHL = new PIXI.Graphics();
    rightHL.rect(eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, hlSize, hlSize);
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

    var eyeSize = data.eyeSize || 8;
    var eyeY = -hy * 0.30;
    var eyeOffX = hx * 0.40;
    var hlSize = Math.max(2, Math.floor(eyeSize * 0.35));

    if (mood === 'sleeping') {
      // Horizontal line rects for closed eyes
      self.leftEye.rect(-eyeOffX - eyeSize / 2, eyeY - 1, eyeSize, 3);
      self.leftEye.fill({ color: 0x3a3028 });
      self.rightEye.rect(eyeOffX - eyeSize / 2, eyeY - 1, eyeSize, 3);
      self.rightEye.fill({ color: 0x3a3028 });
      // Small rect mouth (like a tiny "o")
      self.mouth.rect(-2, eyeY + eyeSize * 2.5, 4, 4);
      self.mouth.fill({ color: 0x3a3028 });
      if (self._zzz) self._zzz.visible = true;
      return;
    }

    if (self._zzz) self._zzz.visible = false;

    if (mood === 'happy') {
      // Rect eyes
      self.leftEye.rect(-eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);
      self.leftEye.fill({ color: 0x3a3028 });
      self.rightEye.rect(eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);
      self.rightEye.fill({ color: 0x3a3028 });
      // Highlights
      self.leftHighlight.rect(-eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, hlSize, hlSize);
      self.leftHighlight.fill({ color: 0xffffff });
      self.rightHighlight.rect(eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, hlSize, hlSize);
      self.rightHighlight.fill({ color: 0xffffff });
      // Wide rect mouth opening
      var mouthW = eyeSize * 2;
      var mouthH = eyeSize * 0.8;
      self.mouth.rect(-mouthW / 2, eyeY + eyeSize * 2, mouthW, mouthH);
      self.mouth.fill({ color: 0x3a3028 });

    } else if (mood === 'neutral') {
      // Standard rect eyes
      self.leftEye.rect(-eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);
      self.leftEye.fill({ color: 0x3a3028 });
      self.rightEye.rect(eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);
      self.rightEye.fill({ color: 0x3a3028 });
      // Highlights
      self.leftHighlight.rect(-eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, hlSize, hlSize);
      self.leftHighlight.fill({ color: 0xffffff });
      self.rightHighlight.rect(eyeOffX - eyeSize / 2, eyeY - eyeSize / 2, hlSize, hlSize);
      self.rightHighlight.fill({ color: 0xffffff });
      // Thin line mouth
      self.mouth.rect(-eyeSize, eyeY + eyeSize * 2.5, eyeSize * 2, 2);
      self.mouth.fill({ color: 0x3a3028 });

    } else if (mood === 'sad') {
      // Rect eyes positioned slightly lower
      self.leftEye.rect(-eyeOffX - eyeSize / 2, eyeY - eyeSize / 2 + 2, eyeSize, eyeSize - 2);
      self.leftEye.fill({ color: 0x3a3028 });
      self.rightEye.rect(eyeOffX - eyeSize / 2, eyeY - eyeSize / 2 + 2, eyeSize, eyeSize - 2);
      self.rightEye.fill({ color: 0x3a3028 });
      // Highlights
      self.leftHighlight.rect(-eyeOffX - eyeSize / 2, eyeY - eyeSize / 2 + 2, hlSize, hlSize);
      self.leftHighlight.fill({ color: 0xffffff });
      self.rightHighlight.rect(eyeOffX - eyeSize / 2, eyeY - eyeSize / 2 + 2, hlSize, hlSize);
      self.rightHighlight.fill({ color: 0xffffff });
      // Small flat mouth
      self.mouth.rect(-eyeSize * 0.6, eyeY + eyeSize * 2.8, eyeSize * 1.2, 2);
      self.mouth.fill({ color: 0x3a3028 });
    }
  },

  // Task 4: Update state behavior based on pet's request
  updateStateBehavior: function(request) {
    var self = this;
    if (request === 'hungry') {
      self._stateAction = 'hungry_wobble';
    } else if (request === 'sleepy') {
      self._stateAction = 'sleepy_nod';
    } else if (request === 'bored') {
      self._stateAction = 'sad_crouch';
    } else {
      self._stateAction = null;
    }
    self._stateActionFrame = 0;
    // Clean up state visuals when clearing
    if (!self._stateAction) {
      self._cleanupStateVisuals();
    }
  },

  _cleanupStateVisuals: function() {
    var self = this;
    // Remove floating icon
    if (self._needIconGfx && self.container) {
      self.container.removeChild(self._needIconGfx);
      self._needIconGfx.destroy();
      self._needIconGfx = null;
    }
    // Remove floating Z rects
    for (var i = 0; i < self._stateZzzList.length; i++) {
      if (self._app) {
        self._app.stage.removeChild(self._stateZzzList[i]);
        self._stateZzzList[i].destroy();
      }
    }
    self._stateZzzList = [];
    // Remove arrow
    if (self._stateArrow && self.container) {
      self.container.removeChild(self._stateArrow);
      self._stateArrow.destroy();
      self._stateArrow = null;
    }
  },

  // Task 5: Pixel particle system
  emitPixelParticles: function(type, count) {
    var self = this;
    if (!self._app || !self.container) return;
    var n = Math.min(count || 5, 20);

    var colors = {
      star: [0xf0d060, 0xf0c030, 0xd8b020],
      heart: [0xf08080, 0xe06060, 0xd04040],
      sparkle: [0xffffff, 0xf8f0c0, 0xf0e8a0]
    };
    var palette = colors[type] || colors.sparkle;

    for (var i = 0; i < n; i++) {
      // Cap at 20 total particles
      if (self._particles.length >= 20) break;

      var size = 3 + Math.floor(Math.random() * 4);
      var p = new PIXI.Graphics();
      var color = palette[Math.floor(Math.random() * palette.length)];
      p.rect(0, 0, size, size).fill({ color: color });
      p.x = self.container.x + (Math.random() - 0.5) * 40;
      p.y = self.container.y - 20 + (Math.random() - 0.5) * 30;
      p._vx = (Math.random() - 0.5) * 4;
      p._vy = -2 - Math.random() * 3;
      p._life = 40 + Math.floor(Math.random() * 20);
      p._maxLife = p._life;
      p.alpha = 1;
      self._app.stage.addChild(p);
      self._particles.push(p);
    }
  },

  // Task 5: Celebrate method
  celebrate: function() {
    var self = this;
    self._jumpTimer = 20;
    self._jumpY = -40;
    self.setExpression('happy');
    // Emit 12 star particles in burst
    self.emitPixelParticles('star', 12);
    // Flash body brighter for 10 frames
    self._celebrateFlashTimer = 10;
    // Show celebration particles at pet position
    if (typeof showCelebration === 'function' && self._app) {
      var cx = self.container.x;
      var cy = self.container.y - 30;
      showCelebration(cx, cy);
    }
  },

  // Task 5: Screen shake
  screenShake: function(intensity) {
    var self = this;
    self._shakeTimer = 20;
    self._shakeIntensity = intensity || 4;
  },

  update: function(st) {
    var self = this;
    if (!self.container || !self._app) return;

    if (self._isDragging || self._physicsMode) return;

    var wasSleeping = self._mood === 'sleeping';
    var isSleeping = (st && st.sleeping);

    var mood = typeof Pet !== 'undefined' ? Pet.getMood(st) : 'neutral';
    if (self._pettedTimer > 0) {
      self._pettedTimer--;
      mood = 'happy';
    }

    if (isSleeping && !wasSleeping) {
      self._sleepAnimating = true;
      self.sleepAnim();
      self._mood = 'sleeping';
    } else if (!isSleeping && wasSleeping) {
      self._sleepAnimating = false;
      self.wakeAnim();
      mood = 'happy';
    }

    if (!self._sleepAnimating && mood !== self._mood) {
      self.setExpression(mood);
    }

    if (self._zzz) {
      self._zzz.visible = isSleeping;
    }

    var avg = 50;
    if (st) {
      avg = (st.hunger + st.mood + (100 - st.sleepy)) / 3;
    }
    self._wanderSpeed = avg >= 60 ? 0.04 : avg >= 30 ? 0.02 : 0.01;
  },

  animate: function() {
    var self = this;
    if (!self.container) return;
    self._frame++;

    var W = self._app ? self._app.screen.width : 600;
    var H = self._app ? self._app.screen.height : 600;
    self._groundY = H * 0.52;

    // === Screen shake (Task 5) ===
    if (self._shakeTimer > 0 && self._app) {
      self._shakeTimer--;
      var shakeX = (Math.random() - 0.5) * self._shakeIntensity * 2;
      var shakeY = (Math.random() - 0.5) * self._shakeIntensity * 2;
      self._app.stage.x = shakeX;
      self._app.stage.y = shakeY;
      if (self._shakeTimer <= 0) {
        self._app.stage.x = 0;
        self._app.stage.y = 0;
      }
    }

    // === Celebrate flash (Task 5) ===
    if (self._celebrateFlashTimer > 0 && self.body) {
      self._celebrateFlashTimer--;
      self.body.alpha = 0.7 + 0.3 * Math.sin(self._celebrateFlashTimer * 1.2);
      if (self._celebrateFlashTimer <= 0) {
        self.body.alpha = 1;
      }
    }

    // === Update pixel particles (Task 5) ===
    for (var pi = self._particles.length - 1; pi >= 0; pi--) {
      var part = self._particles[pi];
      part.x += part._vx;
      part.y += part._vy;
      part._vy += 0.08; // gravity
      part._life--;
      part.alpha = Math.max(0, part._life / part._maxLife);
      if (part._life <= 0) {
        if (self._app) self._app.stage.removeChild(part);
        part.destroy();
        self._particles.splice(pi, 1);
      }
    }

    // === Physics / Drag mode ===
    if (self._isDragging) {
      if (self.body) {
        self.body.scale.set(1.05, 0.95);
      }
      if (self._shadow) {
        var heightAbove = self._groundY - self.container.y;
        var shadowScale = Math.max(0.3, 1 - heightAbove * 0.003);
        self._shadow.y = self._groundY - self.container.y + 80;
        self._shadow.scale.set(shadowScale, shadowScale * 0.6);
        self._shadow.alpha = Math.max(0.03, 0.12 * shadowScale);
      }
    } else if (self._physicsMode) {
      var gravity = 0.6;
      self._velY += gravity;
      self._velX *= 0.995;

      self._physX += self._velX;
      self._physY += self._velY;

      var margin = 40;
      if (self._physX < margin) {
        self._physX = margin;
        self._velX = Math.abs(self._velX) * 0.6;
      } else if (self._physX > W - margin) {
        self._physX = W - margin;
        self._velX = -Math.abs(self._velX) * 0.6;
      }

      if (self._physY >= self._groundY) {
        self._physY = self._groundY;
        self._bounceCount++;

        if (Math.abs(self._velY) > 2) {
          self._velY = -self._velY * 0.45;
          self._velX *= 0.7;
          self._squashTimer = 8;

          if (self._app) {
            for (var di = 0; di < 4; di++) {
              var dust = new PIXI.Graphics();
              dust.rect(0, 0, 4 + Math.random() * 4, 3);
              dust.fill({ color: 0xd0c8b0, alpha: 0.5 });
              dust.x = self._physX + (Math.random() - 0.5) * 30;
              dust.y = self._groundY + 80;
              dust._vx = (Math.random() - 0.5) * 3;
              dust._vy = -1 - Math.random() * 2;
              dust._life = 20;
              self._app.stage.addChild(dust);
              (function(d) {
                var t = function() {
                  d.x += d._vx;
                  d.y += d._vy;
                  d._vy += 0.05;
                  d._life--;
                  d.alpha = d._life / 20 * 0.5;
                  d.scale.set(1 + (20 - d._life) * 0.05);
                  if (d._life <= 0) {
                    self._app.stage.removeChild(d);
                    self._app.ticker.remove(t);
                    d.destroy();
                  }
                };
                self._app.ticker.add(t);
              })(dust);
            }
          }

          if (self._bounceCount <= 3 && typeof playSound === 'function') {
            playSound('click');
          }
        } else {
          self._velY = 0;
          self._velX *= 0.8;

          if (Math.abs(self._velX) < 0.5) {
            self._physicsMode = false;
            self._wanderX = self._physX - W / 2;
            self._wanderTargetX = self._wanderX;
            self.setExpression('happy');
            self._pettedTimer = 60;
            if (self.body) self.body.scale.set(1, 1);
          }
        }
      }

      self.container.x = self._physX;
      self.container.y = self._physY;
      self.container.rotation = Math.max(-0.4, Math.min(0.4, self._velX * 0.03));

      if (self.body) {
        if (self._squashTimer > 0) {
          self._squashTimer--;
          var sq = self._squashTimer / 8;
          self.body.scale.set(1 + sq * 0.25, 1 - sq * 0.15);
        } else if (self._velY < -1) {
          self.body.scale.set(0.92, 1.08);
        } else if (self._velY > 3) {
          self.body.scale.set(1.08, 0.92);
        } else {
          self.body.scale.set(1, 1);
        }
      }

      if (self._shadow) {
        var heightAbove2 = self._groundY - self._physY;
        var shadowScale2 = Math.max(0.3, 1 - heightAbove2 * 0.003);
        self._shadow.y = self._groundY - self._physY + 80;
        self._shadow.scale.set(shadowScale2, shadowScale2 * 0.6);
        self._shadow.alpha = Math.max(0.03, 0.12 * shadowScale2);
      }

      if (self._velY < -3 && self._mood !== 'happy') {
        self.setExpression('happy');
      } else if (self._velY > 5 && self._mood !== 'sad') {
        self.setExpression('sad');
      }

    } else {
      // === Normal idle mode (or state action override) ===

      // Task 4: State action behaviors override normal idle
      if (self._stateAction) {
        self._stateActionFrame++;
        var sf = self._stateActionFrame;

        if (self._stateAction === 'hungry_wobble') {
          // Rotate body left/right
          self.container.rotation = Math.sin(sf * 0.08) * 0.15;
          // Every ~180 frames: squash body briefly
          if (sf % 180 < 10) {
            if (self.body) self.body.scale.set(1.1, 0.6);
          } else {
            if (self.body) self.body.scale.set(1, 1);
          }
          // Idle bob still applies
          var bob = Math.sin(sf * 0.055) * 5;
          self.container.y = self._groundY + self._jumpY + bob;
          // Wander normally
          var spd = self._wanderSpeed || 0.03;
          self._wanderX += (self._wanderTargetX - self._wanderX) * spd;
          self.container.x = W / 2 + self._wanderX;
          // Draw floating bowl icon above head
          if (!self._needIconGfx) {
            var bowl = new PIXI.Graphics();
            // Simple pixel bowl: bottom rect + rim
            bowl.rect(-10, 2, 20, 8);
            bowl.fill({ color: 0xf4b870 });
            bowl.rect(-12, 0, 24, 4);
            bowl.fill({ color: 0xf4b870 });
            // Rice inside
            bowl.rect(-8, -2, 16, 4);
            bowl.fill({ color: 0xffffff });
            self.container.addChild(bowl);
            self._needIconGfx = bowl;
          }
          // Animate icon position
          var data = PET_STAGES[Math.min(self._stage, PET_STAGES.length - 1)];
          self._needIconGfx.y = -(data.bodyH / 2) - 30 + Math.sin(sf * 0.06) * 4;

        } else if (self._stateAction === 'sleepy_nod') {
          // Forward/back rotation
          self.container.rotation = Math.sin(sf * 0.04) * 0.2;
          // Slow down wander speed by 70%
          var spdSlow = (self._wanderSpeed || 0.03) * 0.3;
          self._wanderX += (self._wanderTargetX - self._wanderX) * spdSlow;
          self.container.x = W / 2 + self._wanderX;
          var bob2 = Math.sin(sf * 0.04) * 3;
          self.container.y = self._groundY + self._jumpY + bob2;
          // Spawn large "Z" text rects that float upward every 60 frames (max 3)
          if (sf % 60 === 0 && self._stateZzzList.length < 3 && self._app) {
            var zGfx = new PIXI.Graphics();
            var zSize = 10 + Math.floor(Math.random() * 6);
            // Draw a blocky "Z" shape using rects
            zGfx.rect(0, 0, zSize, 3).fill({ color: 0xa888d0 });
            zGfx.rect(zSize - 3, 3, 3, zSize - 6).fill({ color: 0xa888d0 });
            zGfx.rect(0, zSize - 3, zSize, 3).fill({ color: 0xa888d0 });
            zGfx.x = self.container.x + 20 + Math.random() * 20;
            zGfx.y = self.container.y - 50;
            zGfx._life = 90;
            zGfx._vy = -0.8;
            self._app.stage.addChild(zGfx);
            self._stateZzzList.push(zGfx);
          }
          // Update floating Z's
          for (var zi = self._stateZzzList.length - 1; zi >= 0; zi--) {
            var zz = self._stateZzzList[zi];
            zz.y += zz._vy;
            zz._life--;
            zz.alpha = Math.max(0, zz._life / 90);
            if (zz._life <= 0) {
              if (self._app) self._app.stage.removeChild(zz);
              zz.destroy();
              self._stateZzzList.splice(zi, 1);
            }
          }

        } else if (self._stateAction === 'sad_crouch') {
          // Move pet toward left 15% of screen, stop wandering
          var targetX = -W * 0.35;
          self._wanderX += (targetX - self._wanderX) * 0.02;
          self.container.x = W / 2 + self._wanderX;
          // Flip scaleX to -1 (face away)
          self.container.scale.x = -1;
          var bob3 = Math.sin(sf * 0.04) * 2;
          self.container.y = self._groundY + self._jumpY + bob3;
          self.container.rotation = 0;
          // Draw dark cloud icon above head
          if (!self._needIconGfx) {
            var cloud = new PIXI.Graphics();
            // Gray cloud rects
            cloud.rect(-12, -6, 24, 10).fill({ color: 0x888888 });
            cloud.rect(-8, -12, 16, 8).fill({ color: 0x999999 });
            cloud.rect(-16, -4, 8, 6).fill({ color: 0x999999 });
            // Raindrop rects below
            cloud.rect(-6, 8, 3, 5).fill({ color: 0x88b8e8 });
            cloud.rect(3, 10, 3, 5).fill({ color: 0x88b8e8 });
            self.container.addChild(cloud);
            self._needIconGfx = cloud;
          }
          var dataC = PET_STAGES[Math.min(self._stage, PET_STAGES.length - 1)];
          self._needIconGfx.y = -(dataC.bodyH / 2) - 24 + Math.sin(sf * 0.05) * 3;
        }

        // Task 4: Bouncing arrow indicator below pet when state action is active
        if (!self._stateArrow) {
          var arrow = new PIXI.Graphics();
          var arrowColor = 0xf4b870; // default hungry color
          if (self._stateAction === 'sleepy_nod') arrowColor = 0xa888d0;
          if (self._stateAction === 'sad_crouch') arrowColor = 0x68c048;
          // Down-pointing arrow using pixel rects
          arrow.rect(-6, 0, 12, 4).fill({ color: arrowColor });
          arrow.rect(-4, 4, 8, 4).fill({ color: arrowColor });
          arrow.rect(-2, 8, 4, 4).fill({ color: arrowColor });
          self.container.addChild(arrow);
          self._stateArrow = arrow;
        }
        var arrowData = PET_STAGES[Math.min(self._stage, PET_STAGES.length - 1)];
        self._stateArrow.y = arrowData.bodyH / 2 + 16 + Math.sin(sf * 0.1) * 4;

        // Shadow in state mode
        if (self._shadow) {
          self._shadow.y = 80 - self._jumpY * 0.3;
          self._shadow.scale.set(1 - Math.abs(self._jumpY) * 0.005, 0.6);
          self._shadow.alpha = 0.12;
        }

      } else {
        // Normal idle (no state action)
        // Restore scaleX if it was flipped by sad_crouch
        if (self.container.scale.x < 0) self.container.scale.x = 1;

        var bob4 = Math.sin(self._frame * 0.055) * 5;
        self.container.y = self._groundY + self._jumpY + bob4;

        var spd2 = self._wanderSpeed || 0.03;
        if (self._mood === 'sleeping') {
          self._wanderX *= 0.97;
        } else {
          self._wanderX += (self._wanderTargetX - self._wanderX) * spd2;
        }
        self.container.x = W / 2 + self._wanderX;

        if (self._shadow) {
          self._shadow.y = 80 - self._jumpY * 0.3;
          self._shadow.scale.set(1 - Math.abs(self._jumpY) * 0.005, 0.6);
          self._shadow.alpha = 0.12;
        }
      }
    }

    // Blink logic
    self._blinkTimer++;
    if (self._mood !== 'sleeping' && !self._isBlinking && self._blinkTimer >= self._blinkInterval) {
      self._isBlinking = true;
      self._blinkTimer = 0;
      self._blinkInterval = 180 + Math.floor(Math.random() * 120);
      if (self.leftEye)  self.leftEye.scale.y  = 0.15;
      if (self.rightEye) self.rightEye.scale.y  = 0.15;
      if (self.leftHighlight)  self.leftHighlight.visible  = false;
      if (self.rightHighlight) self.rightHighlight.visible = false;
      setTimeout(function() {
        self._isBlinking = false;
        if (self._mood === 'sleeping') return;
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
    } else if (!self._stateAction) {
      self.container.rotation *= 0.8;
    }

    // Zzz float animation
    if (self._zzz && self._zzz.visible) {
      self._zzz.y = -60 + Math.sin(self._frame * 0.04) * 6;
      self._zzz.alpha = 0.5 + 0.5 * Math.abs(Math.sin(self._frame * 0.04));
    }

    // === Dynamic idle behaviors ===
    if (self._mood !== 'sleeping' && self._stage > 0 && !self._stateAction) {
      if (self._frame % 120 === 0) {
        var W = self._app ? self._app.screen.width : 800;
        self._wanderTargetX = (Math.random() - 0.5) * W * 0.6;
      }

      if (self._frame % 180 === 0 && self._pettedTimer <= 0) {
        var roll = Math.random();
        if (roll < 0.25) {
          self._jumpTimer = 10;
        } else if (roll < 0.4) {
          self._wiggleTimer = 8;
        } else if (roll < 0.5 && self._mood === 'happy') {
          self._jumpTimer = 14;
          setTimeout(function() { self._jumpTimer = 10; }, 400);
        } else if (roll < 0.55 && self._mood === 'happy') {
          self.emitParticles('note', 1);
        }
      }

      // Breathing scale animation
      if (self.body && self._celebrateFlashTimer <= 0) {
        var breathe = 1 + Math.sin(self._frame * 0.03) * 0.015;
        self.body.scale.set(breathe, 1 + Math.sin(self._frame * 0.03 + 0.5) * 0.02);
      }

      // Ear wiggle
      if (self.ears && self._frame % 240 === 0 && !self._earAnimating) {
        self._earAnimating = true;
        var earWiggle = 8;
        var earTick = function() {
          earWiggle--;
          self.ears.rotation = Math.sin(earWiggle * 0.8) * 0.12 * (earWiggle / 8);
          if (earWiggle <= 0) {
            self.ears.rotation = 0;
            self._earAnimating = false;
            if (self._app) self._app.ticker.remove(earTick);
          }
        };
        if (self._app) self._app.ticker.add(earTick);
      }

      // Arm wave
      if (self.arms && self._frame % 360 === 0 && !self._armAnimating) {
        self._armAnimating = true;
        var armWave = 12;
        var armTick = function() {
          armWave--;
          self.arms.rotation = Math.sin(armWave * 0.5) * 0.15 * (armWave / 12);
          if (armWave <= 0) {
            self.arms.rotation = 0;
            self._armAnimating = false;
            if (self._app) self._app.ticker.remove(armTick);
          }
        };
        if (self._app) self._app.ticker.add(armTick);
      }

      // Need-based behaviors
      if (self._frame % 150 === 0 && self._needType) {
        if (self._needType === 'hungry') {
          self.emitParticles('sweat', 1);
          self._wiggleTimer = 3;
        } else if (self._needType === 'sleepy') {
          self._wiggleTimer = 4;
          if (self.container && !self._droopAnimating) {
            self._droopAnimating = true;
            var droopTimer = 15;
            var droopTick = function() {
              droopTimer--;
              self.container.rotation = Math.sin(droopTimer * 0.2) * 0.06;
              if (droopTimer <= 0) {
                self.container.rotation = 0;
                self._droopAnimating = false;
                if (self._app) self._app.ticker.remove(droopTick);
              }
            };
            if (self._app) self._app.ticker.add(droopTick);
          }
        } else if (self._needType === 'bored') {
          self._jumpTimer = 6;
          var Wb = self._app ? self._app.screen.width : 800;
          self._wanderTargetX = (Math.random() - 0.5) * Wb * 0.7;
        }
      }
    }

    // Chew animation (from feedAnim)
    if (self._feedAnimTimer > 0) {
      self._feedAnimTimer--;
      if (self._feedAnimTimer === 0 && self._chewCount > 0) {
        self._chewCount--;
        if (self.mouth) {
          var stageIdx = Math.min(self._stage || 0, PET_STAGES.length - 1);
          var chewData = PET_STAGES[stageIdx];
          var bW = chewData.bodyW;
          var bH = chewData.bodyH;
          var hy = bH / 2;
          var eyeR = chewData.eyeSize || 8;
          var eyeY = -hy * 0.30;
          self.mouth.clear();
          if (self._chewCount % 2 === 0) {
            // Open — rect mouth
            self.mouth.rect(-eyeR * 1.2, eyeY + eyeR * 2, eyeR * 2.4, eyeR * 1.2);
            self.mouth.fill({ color: 0x3a3028 });
          } else {
            // Closed — thin line
            self.mouth.rect(-eyeR, eyeY + eyeR * 2.5, eyeR * 2, 2);
            self.mouth.fill({ color: 0x3a3028 });
          }
        }
        if (self._chewCount > 0) {
          self._feedAnimTimer = 12;
        } else {
          setTimeout(function() {
            self.setExpression('happy');
          }, 300);
        }
      }
    }

    // PixiJS speech bubble animation
    if (self._pixiBubble) {
      if (self._pixiBubble._fadeIn) {
        self._pixiBubble.alpha = Math.min(1, self._pixiBubble.alpha + 0.08);
        if (self._pixiBubble.alpha >= 1) self._pixiBubble._fadeIn = false;
      }
      self._pixiBubble.y = -110 + Math.sin(self._frame * 0.04) * 3;
      self._pixiBubbleTimer--;
      if (self._pixiBubbleTimer <= 20) {
        self._pixiBubble.alpha = Math.max(0, self._pixiBubbleTimer / 20);
      }
      if (self._pixiBubbleTimer <= 0) {
        self.hidePixiBubble();
      }
    }

    // Need bubble animation
    if (self._needBubble) {
      self._needFrame++;
      self._needBubble.y = -85 + Math.sin(self._needFrame * 0.06) * 10;
      var pulse = 1.0 + 0.2 * Math.abs(Math.sin(self._needFrame * 0.08));
      self._needBubble.scale.set(pulse);
      self._needBubble.rotation = Math.sin(self._needFrame * 0.1) * 0.08;
      if (self._needFrame % 40 === 0 && self._app) {
        var sparkle = new PIXI.Graphics();
        sparkle.rect(0, 0, 5, 5).fill({ color: 0xf0d060 });
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

  addCrack: function(tapCount) {
    var self = this;
    if (!self.body || self._stage !== 0) return;

    var data = PET_STAGES[0];
    var bW = data.bodyW;
    var bH = data.bodyH;

    var crack = new PIXI.Graphics();
    var cx = (Math.random() - 0.5) * bW * 0.4;
    var cy = (Math.random() - 0.5) * bH * 0.3;
    var segments = 2 + tapCount;

    crack.moveTo(cx, cy);
    for (var i = 0; i < segments; i++) {
      cx += (Math.random() - 0.5) * 16;
      cy += 6 + Math.random() * 8;
      crack.lineTo(cx, cy);
    }
    crack.stroke({ color: 0x8a6040, width: 2 });

    self.container.addChild(crack);

    if (self._app) {
      for (var p = 0; p < tapCount; p++) {
        var chip = new PIXI.Graphics();
        var chipSize = 3 + Math.random() * 4;
        chip.rect(0, 0, chipSize, chipSize);
        chip.fill({ color: 0xf0e0c0 });
        chip.x = self.container.x + cx;
        chip.y = self.container.y + cy;
        chip._vx = (Math.random() - 0.5) * 4;
        chip._vy = -2 - Math.random() * 3;
        chip._life = 30;
        self._app.stage.addChild(chip);
        (function(c) {
          var t = function() {
            c.x += c._vx;
            c.y += c._vy;
            c._vy += 0.15;
            c.rotation += 0.1;
            c._life--;
            c.alpha = c._life / 30;
            if (c._life <= 0) {
              self._app.stage.removeChild(c);
              self._app.ticker.remove(t);
              c.destroy();
            }
          };
          self._app.ticker.add(t);
        })(chip);
      }
    }

    self._wiggleTimer = 8 + tapCount * 2;
  },

  eggBurst: function() {
    var self = this;
    if (!self._app || !self.container) return;

    var data = PET_STAGES[0];
    var bW = data.bodyW;
    var bH = data.bodyH;
    var cx = self.container.x;
    var cy = self.container.y;

    var shellColor = data.color;
    var strokeColor = data.strokeColor || 0xd8b898;
    for (var i = 0; i < 12; i++) {
      var frag = new PIXI.Graphics();
      var fw = 8 + Math.random() * 12;
      var fh = 6 + Math.random() * 10;
      frag.rect(-fw / 2, -fh / 2, fw, fh);
      frag.fill({ color: shellColor });
      frag.rect(-fw / 2 - 1, -fh / 2 - 1, fw + 2, fh + 2);
      frag.stroke({ color: strokeColor, width: 1 });

      frag.x = cx + (Math.random() - 0.5) * bW * 0.6;
      frag.y = cy + (Math.random() - 0.5) * bH * 0.4;
      var angle = Math.atan2(frag.y - cy, frag.x - cx);
      frag._vx = Math.cos(angle) * (3 + Math.random() * 4);
      frag._vy = Math.sin(angle) * (3 + Math.random() * 4) - 2;
      frag._life = 40 + Math.random() * 20;
      frag._rotSpeed = (Math.random() - 0.5) * 0.3;

      self._app.stage.addChild(frag);
      (function(f) {
        var t = function() {
          f.x += f._vx;
          f.y += f._vy;
          f._vy += 0.12;
          f.rotation += f._rotSpeed;
          f._life--;
          if (f._life < 15) f.alpha = f._life / 15;
          if (f._life <= 0) {
            self._app.stage.removeChild(f);
            self._app.ticker.remove(t);
            f.destroy();
          }
        };
        self._app.ticker.add(t);
      })(frag);
    }

    var flash = new PIXI.Graphics();
    flash.rect(-10, -10, 20, 20);
    flash.fill({ color: 0xffffff, alpha: 0.9 });
    flash.x = cx;
    flash.y = cy;
    flash._life = 20;
    self._app.stage.addChild(flash);
    var flashTicker = function() {
      flash._life--;
      flash.scale.set(1 + (20 - flash._life) * 0.4);
      flash.alpha = flash._life / 20 * 0.8;
      if (flash._life <= 0) {
        self._app.stage.removeChild(flash);
        self._app.ticker.remove(flashTicker);
        flash.destroy();
      }
    };
    self._app.ticker.add(flashTicker);

    if (typeof playSound === 'function') playSound('evolve');
  },

  petted: function() {
    var self = this;
    self._pettedTimer = 120;
    self.setExpression('happy');
    self._jumpTimer = 14;
    // Emit pixel heart particles instead of text hearts
    self.emitPixelParticles('heart', 6);
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
  },

  showNeed: function(needType) {
    var self = this;
    if (self._needType === needType) return;
    self._needType = needType;
    self._needFrame = 0;

    if (self._needBubble && self.container) {
      self.container.removeChild(self._needBubble);
      self._needBubble.destroy({ children: true });
      self._needBubble = null;
    }

    if (!needType || !self.container) return;

    // Hide speech bubble when need bubble is shown
    self.hidePixiBubble();

    var bubble = new PIXI.Container();
    bubble.y = -100;
    bubble.x = 50;

    // Thought bubble background — pixel rect style
    var bg = new PIXI.Graphics();
    bg.rect(-28, -28, 56, 56).fill({ color: 0xffffff, alpha: 0.95 });
    bg.rect(-28 - 2, -28 - 2, 60, 60).stroke({ color: 0xe0d0c0, width: 2 });
    // Small rects for thought trail
    bg.rect(-14, 20, 10, 8).fill({ color: 0xffffff, alpha: 0.9 });
    bg.rect(-8, 28, 6, 5).fill({ color: 0xffffff, alpha: 0.85 });
    bubble.addChild(bg);

    var icon = new PIXI.Graphics();
    if (needType === 'hungry') {
      // Pixel rice bowl
      icon.rect(-12, 2, 24, 10).fill({ color: 0xf4b870 });
      icon.rect(-14, 0, 28, 4).fill({ color: 0xf4b870 });
      icon.rect(-10, -4, 20, 6).fill({ color: 0xffffff });
      // Steam — small rects
      icon.rect(-5, -12, 3, 5).fill({ color: 0xcccccc, alpha: 0.5 });
      icon.rect(2, -14, 3, 5).fill({ color: 0xcccccc, alpha: 0.5 });
    } else if (needType === 'sleepy') {
      var zzz = new PIXI.Text({ text: 'Z', style: { fontFamily: '"DungGeunMo", monospace', fontSize: 20, fill: 0xa888d0, fontWeight: 'bold' } });
      zzz.anchor.set(0.5);
      zzz.x = -6; zzz.y = -4;
      bubble.addChild(zzz);
      var zz2 = new PIXI.Text({ text: 'z', style: { fontFamily: '"DungGeunMo", monospace', fontSize: 14, fill: 0xa888d0, fontWeight: 'bold' } });
      zz2.anchor.set(0.5);
      zz2.x = 8; zz2.y = -12;
      bubble.addChild(zz2);
    } else if (needType === 'bored') {
      // Pixel play ball — rect-based
      icon.rect(-10, -10, 20, 20).fill({ color: 0x68c048 });
      icon.rect(-10 - 2, -10 - 2, 24, 24).stroke({ color: 0x88b890, width: 2 });
      // Star on ball — small rect cross
      icon.rect(-2, -6, 4, 12).fill({ color: 0xf0d060 });
      icon.rect(-6, -2, 12, 4).fill({ color: 0xf0d060 });
    }
    bubble.addChild(icon);

    bubble.eventMode = 'static';
    bubble.cursor = 'pointer';
    bubble.hitArea = new PIXI.Rectangle(-40, -40, 80, 80);
    bubble.on('pointerdown', function() {
      if (typeof playSound === 'function') playSound('click');
      if (self._app && self.container) {
        var bx = self.container.x + bubble.x;
        var by = self.container.y + bubble.y;
        if (typeof showStarParticles === 'function') {
          showStarParticles(bx, by, 8);
        }
      }
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

  feedAnim: function() {
    var self = this;
    if (!self._app || !self.container) return;

    if (self.mouth) {
      self.mouth.clear();
      var stageIdx = Math.min(self._stage || 0, PET_STAGES.length - 1);
      var data = PET_STAGES[stageIdx];
      var bH = data.bodyH;
      var hy = bH / 2;
      var eyeR = data.eyeSize || 8;
      var eyeY = -hy * 0.30;
      self.mouth.rect(-eyeR * 1.4, eyeY + eyeR * 1.8, eyeR * 2.8, eyeR * 1.4);
      self.mouth.fill({ color: 0x3a3028 });
    }

    var food = new PIXI.Graphics();
    food.rect(-8, -8, 16, 16).fill({ color: 0xf4b870 });
    food.rect(-4, -4, 8, 8).fill({ color: 0xffffff });
    food.x = self.container.x;
    food.y = self.container.y - 100;
    food.alpha = 1;
    self._app.stage.addChild(food);

    var stageIdx2 = Math.min(self._stage || 0, PET_STAGES.length - 1);
    var data2 = PET_STAGES[stageIdx2];
    var mouthY = self.container.y - data2.bodyH * 0.10;

    var fallTicker = function() {
      food.y += 6;
      if (food.y >= mouthY) {
        self._app.stage.removeChild(food);
        self._app.ticker.remove(fallTicker);
        food.destroy();
        self._chewCount = 3;
        self._feedAnimTimer = 1;
        self._floatHearts();
      }
    };
    self._app.ticker.add(fallTicker);
  },

  _floatHearts: function() {
    var self = this;
    if (!self._app || !self.container) return;
    var heartTexts = ['\u2665', '\u2665', '\u2665'];
    for (var i = 0; i < heartTexts.length; i++) {
      (function(idx) {
        setTimeout(function() {
          var heart = new PIXI.Text({
            text: heartTexts[idx],
            style: { fontSize: 14 + Math.random() * 8, fill: 0xf08080, fontWeight: 'bold' }
          });
          heart.x = self.container.x + (Math.random() - 0.5) * 40;
          heart.y = self.container.y - 30;
          heart.alpha = 1;
          heart._vy = -1.2 - Math.random() * 0.8;
          heart._vx = (Math.random() - 0.5) * 0.8;
          heart._life = 55;
          self._app.stage.addChild(heart);
          var ticker = function() {
            heart.x += heart._vx;
            heart.y += heart._vy;
            heart.alpha -= 0.018;
            heart._life--;
            if (heart._life <= 0) {
              self._app.stage.removeChild(heart);
              self._app.ticker.remove(ticker);
              heart.destroy();
            }
          };
          self._app.ticker.add(ticker);
        }, idx * 200);
      })(i);
    }
  },

  sleepAnim: function() {
    var self = this;
    if (!self.container) return;

    var steps = 30;
    var step = 0;
    var closeTicker = function() {
      step++;
      var t = step / steps;
      if (self.leftEye)  self.leftEye.scale.y  = Math.max(0.05, 1 - t);
      if (self.rightEye) self.rightEye.scale.y = Math.max(0.05, 1 - t);
      if (self.leftHighlight)  self.leftHighlight.alpha  = Math.max(0, 1 - t);
      if (self.rightHighlight) self.rightHighlight.alpha = Math.max(0, 1 - t);
      if (step >= steps) {
        if (self._app) self._app.ticker.remove(closeTicker);
        self._sleepAnimating = false;
        self.setExpression('sleeping');
        if (self.leftHighlight)  self.leftHighlight.alpha  = 0;
        if (self.rightHighlight) self.rightHighlight.alpha = 0;
      }
    };
    if (self._app) self._app.ticker.add(closeTicker);

    if (typeof World !== 'undefined' && World.app) {
      var overlay = new PIXI.Graphics();
      var W = World.app.screen.width;
      var H = World.app.screen.height;
      overlay.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.0 });
      World.app.stage.addChildAt(overlay, 1);
      var dimStep = 0;
      var dimTicker = function() {
        dimStep++;
        overlay.alpha = Math.min(0.25, dimStep * 0.008);
        if (dimStep >= 32) {
          World.app.ticker.remove(dimTicker);
        }
      };
      World.app.ticker.add(dimTicker);
      self._sleepOverlay = overlay;
    }
  },

  wakeAnim: function() {
    var self = this;
    if (self._sleepOverlay && typeof World !== 'undefined' && World.app) {
      var ov = self._sleepOverlay;
      var undimTicker = function() {
        ov.alpha -= 0.015;
        if (ov.alpha <= 0) {
          World.app.stage.removeChild(ov);
          World.app.ticker.remove(undimTicker);
          ov.destroy();
        }
      };
      World.app.ticker.add(undimTicker);
      self._sleepOverlay = null;
    }
    if (self.leftHighlight)  self.leftHighlight.alpha  = 1;
    if (self.rightHighlight) self.rightHighlight.alpha = 1;
  },

  // === PixiJS Speech Bubble ===
  _pixiBubble: null,
  _pixiBubbleText: null,
  _pixiBubbleTimer: 0,

  showPixiBubble: function(text, duration) {
    var self = this;
    if (!self._app || !self.container) return;

    // Don't show speech if need bubble is active
    if (self._needBubble) return;

    self.hidePixiBubble();

    var bubble = new PIXI.Container();

    var style = new PIXI.TextStyle({
      fontFamily: '"DungGeunMo", monospace',
      fontSize: 18,
      fontWeight: '700',
      fill: '#1a1830',
    });
    var txt = new PIXI.Text({ text: text, style: style });
    txt.anchor.set(0.5, 0.5);

    var padX = 16;
    var padY = 10;
    var bw = txt.width + padX * 2;
    var bh = txt.height + padY * 2;

    // Pixel-art bubble background — rect with border
    var bg = new PIXI.Graphics();
    bg.rect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, bh + 4);
    bg.fill({ color: 0x6a4c9c });
    bg.rect(-bw / 2, -bh / 2, bw, bh);
    bg.fill({ color: 0xffffff, alpha: 0.95 });
    // Tail — pixel triangle using rects
    bg.rect(-3, bh / 2, 6, 4).fill({ color: 0xffffff, alpha: 0.95 });
    bg.rect(-1, bh / 2 + 4, 2, 4).fill({ color: 0xffffff, alpha: 0.95 });

    bubble.addChild(bg);
    bubble.addChild(txt);

    bubble.x = 0;
    bubble.y = -100;
    bubble.alpha = 0;
    bubble._fadeIn = true;

    self.container.addChild(bubble);
    self._pixiBubble = bubble;
    self._pixiBubbleTimer = duration || 180;
  },

  hidePixiBubble: function() {
    if (this._pixiBubble && this.container) {
      this.container.removeChild(this._pixiBubble);
      this._pixiBubble.destroy({ children: true });
      this._pixiBubble = null;
    }
    this._pixiBubbleTimer = 0;
  },

  // === Emotion particles (hearts, stars, sweat drops) ===
  emitParticles: function(type, count) {
    var self = this;
    if (!self._app || !self.container) return;
    var n = count || 5;
    var configs = {
      heart:  { text: '\u2665', color: 0xf08080, size: 14 },
      star:   { text: '\u2605', color: 0xf0d060, size: 14 },
      sweat:  { text: '\u2022', color: 0x88b8e8, size: 10 },
      note:   { text: '\u266A', color: 0xc8a0d8, size: 16 },
    };
    var cfg = configs[type] || configs.star;

    for (var i = 0; i < n; i++) {
      (function(idx) {
        setTimeout(function() {
          var p = new PIXI.Text({
            text: cfg.text,
            style: { fontSize: cfg.size + Math.random() * 6, fill: cfg.color, fontWeight: 'bold' }
          });
          p.x = self.container.x + (Math.random() - 0.5) * 50;
          p.y = self.container.y - 30;
          p.alpha = 1;
          p._vx = (Math.random() - 0.5) * 1.5;
          p._vy = -1.5 - Math.random() * 1;
          p._life = 50;
          self._app.stage.addChild(p);
          var ticker = function() {
            p.x += p._vx;
            p.y += p._vy;
            p._vy += 0.02;
            p.alpha -= 0.02;
            p.rotation += 0.03;
            p._life--;
            if (p._life <= 0) {
              self._app.stage.removeChild(p);
              self._app.ticker.remove(ticker);
              p.destroy();
            }
          };
          self._app.ticker.add(ticker);
        }, idx * 120);
      })(i);
    }
  },
};
