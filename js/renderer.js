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
  _feedAnimTimer: 0,   // feeding animation countdown
  _chewCount: 0,       // chew cycles remaining

  // Physics / drag-drop system
  _isDragging: false,
  _physicsMode: false,  // true when pet is in freefall after drag release
  _velX: 0,
  _velY: 0,
  _physX: 0,            // absolute X position during physics
  _physY: 0,            // absolute Y position during physics
  _lastPointerX: 0,
  _lastPointerY: 0,
  _prevPointerX: 0,
  _prevPointerY: 0,
  _groundY: 0,          // computed ground level
  _bounceCount: 0,
  _squashTimer: 0,      // squash-stretch on landing

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

    // Shadow under pet (scaled for larger body)
    var shadow = new PIXI.Graphics();
    shadow.ellipse(0, 0, 50, 14).fill({ color: 0x000000, alpha: 0.12 });
    shadow.y = 80;
    container.addChildAt(shadow, 0);
    self._shadow = shadow;

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

    // Pointer interaction: drag pet or tap to pet
    container.eventMode = 'static';
    container.cursor = 'pointer';
    self._groundY = H * 0.52;

    // Drag state
    var dragStartTime = 0;
    var dragMoved = false;

    container.on('pointerdown', function(e) {
      if (self._stage === 0) {
        // Egg: just wiggle, no drag
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

      // Excited reaction: eyes go wide
      self._pettedTimer = 60;
      self.setExpression('happy');
    });

    // Stage-level move and up handlers
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

      // Move pet to pointer position
      self._physX = px;
      self._physY = py;
      self.container.x = px;
      self.container.y = py;

      // Tilt pet based on horizontal drag direction
      self.container.rotation = Math.max(-0.3, Math.min(0.3, dx * 0.03));
    });

    app.stage.on('pointerup', function() {
      if (!self._isDragging) return;
      self._isDragging = false;

      var elapsed = Date.now() - dragStartTime;

      if (!dragMoved && elapsed < 300) {
        // Short tap without drag: pet action
        self._physicsMode = false;
        if (typeof handleAction === 'function') handleAction('pet');
        return;
      }

      // Calculate throw velocity from last pointer movement
      self._velX = (self._lastPointerX - self._prevPointerX) * 0.8;
      self._velY = (self._lastPointerY - self._prevPointerY) * 0.8;

      // Cap velocity
      var maxVel = 18;
      self._velX = Math.max(-maxVel, Math.min(maxVel, self._velX));
      self._velY = Math.max(-maxVel, Math.min(maxVel, self._velY));

      // Enter physics mode: gravity pulls pet down
      self._physicsMode = true;
      self._bounceCount = 0;
      self._physX = self.container.x;
      self._physY = self.container.y;

      // Surprised face during freefall
      if (self._physY < self._groundY - 20) {
        self.setExpression('sad'); // wide-eyed surprise
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

    // Don't override mood/expression during drag or physics freefall
    if (self._isDragging || self._physicsMode) return;

    // Track sleeping transitions
    var wasSleeping = self._mood === 'sleeping';
    var isSleeping = (st && st.sleeping);

    // Update expression based on mood
    var mood = typeof Pet !== 'undefined' ? Pet.getMood(st) : 'neutral';
    if (self._pettedTimer > 0) {
      self._pettedTimer--;
      mood = 'happy';
    }

    // Handle sleep/wake transitions
    if (isSleeping && !wasSleeping) {
      // Pet just fell asleep — run sleep animation
      self._sleepAnimating = true;
      self.sleepAnim();
      self._mood = 'sleeping'; // track state without calling setExpression
    } else if (!isSleeping && wasSleeping) {
      // Pet just woke up — restore visuals
      self._sleepAnimating = false;
      self.wakeAnim();
      mood = 'happy';
    }

    // Don't override expression during sleep transition animation
    if (!self._sleepAnimating && mood !== self._mood) {
      self.setExpression(mood);
    }

    // Update zzz visibility
    if (self._zzz) {
      self._zzz.visible = isSleeping;
    }

    // Wander speed based on energy
    var avg = 50;
    if (st) {
      avg = (st.hunger + st.mood + (100 - st.sleepy)) / 3;
    }
    self._wanderSpeed = avg >= 60 ? 0.04 : avg >= 30 ? 0.02 : 0.01;

    // Movement is handled in animate() at 60fps for smoothness
  },

  animate: function() {
    var self = this;
    if (!self.container) return;
    self._frame++;

    var W = self._app ? self._app.screen.width : 600;
    var H = self._app ? self._app.screen.height : 600;
    self._groundY = H * 0.52;

    // === Physics / Drag mode ===
    if (self._isDragging) {
      // Position is set directly by pointermove handler
      // Add squash-stretch effect while held
      if (self.body) {
        self.body.scale.set(1.05, 0.95);
      }
      // Shadow stretches based on height above ground
      if (self._shadow) {
        var heightAbove = self._groundY - self.container.y;
        var shadowScale = Math.max(0.3, 1 - heightAbove * 0.003);
        self._shadow.y = self._groundY - self.container.y + 80;
        self._shadow.scale.set(shadowScale, shadowScale * 0.6);
        self._shadow.alpha = Math.max(0.03, 0.12 * shadowScale);
      }
    } else if (self._physicsMode) {
      // Apply gravity
      var gravity = 0.6;
      self._velY += gravity;

      // Air resistance
      self._velX *= 0.995;

      // Update position
      self._physX += self._velX;
      self._physY += self._velY;

      // Wall bouncing
      var margin = 40;
      if (self._physX < margin) {
        self._physX = margin;
        self._velX = Math.abs(self._velX) * 0.6;
      } else if (self._physX > W - margin) {
        self._physX = W - margin;
        self._velX = -Math.abs(self._velX) * 0.6;
      }

      // Ground collision
      if (self._physY >= self._groundY) {
        self._physY = self._groundY;
        self._bounceCount++;

        if (Math.abs(self._velY) > 2) {
          // Bounce! Dampen velocity
          self._velY = -self._velY * 0.45;
          self._velX *= 0.7;

          // Squash on impact
          self._squashTimer = 8;

          // Landing particles (dust puffs)
          if (self._app) {
            for (var di = 0; di < 4; di++) {
              var dust = new PIXI.Graphics();
              dust.circle(0, 0, 3 + Math.random() * 4);
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

          // Sound on bounce
          if (self._bounceCount <= 3 && typeof playSound === 'function') {
            playSound('click');
          }
        } else {
          // Velocity too small, settle on ground
          self._velY = 0;
          self._velX *= 0.8;

          if (Math.abs(self._velX) < 0.5) {
            // Done bouncing — return to normal mode
            self._physicsMode = false;
            self._wanderX = self._physX - W / 2;
            self._wanderTargetX = self._wanderX;
            self.setExpression('happy');
            self._pettedTimer = 60;
            // Restore body scale
            if (self.body) self.body.scale.set(1, 1);
          }
        }
      }

      self.container.x = self._physX;
      self.container.y = self._physY;

      // Rotation based on velocity (tilt in direction of movement)
      self.container.rotation = Math.max(-0.4, Math.min(0.4, self._velX * 0.03));

      // Squash-stretch during freefall
      if (self.body) {
        if (self._squashTimer > 0) {
          self._squashTimer--;
          var sq = self._squashTimer / 8;
          self.body.scale.set(1 + sq * 0.25, 1 - sq * 0.15);
        } else if (self._velY < -1) {
          // Stretching upward
          self.body.scale.set(0.92, 1.08);
        } else if (self._velY > 3) {
          // Squishing downward
          self.body.scale.set(1.08, 0.92);
        } else {
          self.body.scale.set(1, 1);
        }
      }

      // Shadow follows horizontally, stays at ground
      if (self._shadow) {
        var heightAbove = self._groundY - self._physY;
        var shadowScale = Math.max(0.3, 1 - heightAbove * 0.003);
        self._shadow.y = self._groundY - self._physY + 80;
        self._shadow.scale.set(shadowScale, shadowScale * 0.6);
        self._shadow.alpha = Math.max(0.03, 0.12 * shadowScale);
      }

      // Change expression based on velocity
      if (self._velY < -3 && self._mood !== 'happy') {
        self.setExpression('happy'); // wheee going up
      } else if (self._velY > 5 && self._mood !== 'sad') {
        self.setExpression('sad'); // falling fast - scared
      }

    } else {
      // === Normal idle mode ===
      // Idle bob
      var bob = Math.sin(self._frame * 0.055) * 5;
      self.container.y = self._groundY + self._jumpY + bob;

      // Smooth wander left/right
      var spd = self._wanderSpeed || 0.03;
      if (self._mood === 'sleeping') {
        self._wanderX *= 0.97;
      } else {
        self._wanderX += (self._wanderTargetX - self._wanderX) * spd;
      }
      self.container.x = W / 2 + self._wanderX;

      // Restore body scale gently
      if (self.body && !self._isDragging) {
        // Breathing handled below in idle behaviors
      }

      // Shadow follows pet but stays grounded
      if (self._shadow) {
        self._shadow.y = 80 - self._jumpY * 0.3;
        self._shadow.scale.set(1 - Math.abs(self._jumpY) * 0.005, 0.6);
        self._shadow.alpha = 0.12;
      }
    }

    // Blink logic (skip when sleeping — eyes are already closed)
    self._blinkTimer++;
    if (self._mood !== 'sleeping' && !self._isBlinking && self._blinkTimer >= self._blinkInterval) {
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
        // Don't reopen eyes if pet fell asleep during the blink
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
    } else {
      self.container.rotation *= 0.8;
    }

    // Zzz float animation
    if (self._zzz && self._zzz.visible) {
      self._zzz.y = -60 + Math.sin(self._frame * 0.04) * 6;
      self._zzz.alpha = 0.5 + 0.5 * Math.abs(Math.sin(self._frame * 0.04));
    }

    // === Dynamic idle behaviors — pet should feel alive! ===
    if (self._mood !== 'sleeping' && self._stage > 0) {
      // Wander more frequently (every ~120 frames = 2 sec)
      if (self._frame % 120 === 0) {
        self._wanderTargetX = (Math.random() - 0.5) * 100;
      }

      // Random actions cycle — pick one every ~180 frames (3 sec)
      if (self._frame % 180 === 0 && self._pettedTimer <= 0) {
        var roll = Math.random();
        if (roll < 0.25) {
          // Small hop
          self._jumpTimer = 10;
        } else if (roll < 0.4) {
          // Head tilt / wiggle
          self._wiggleTimer = 8;
        } else if (roll < 0.5 && self._mood === 'happy') {
          // Happy: double hop
          self._jumpTimer = 14;
          setTimeout(function() { self._jumpTimer = 10; }, 400);
        } else if (roll < 0.55 && self._mood === 'happy') {
          // Emit a music note
          self.emitParticles('note', 1);
        }
      }

      // Breathing scale animation — gentle pulse on body
      if (self.body) {
        var breathe = 1 + Math.sin(self._frame * 0.03) * 0.015;
        self.body.scale.set(breathe, 1 + Math.sin(self._frame * 0.03 + 0.5) * 0.02);
      }

      // Ear wiggle for stages with ears (every ~240 frames)
      // Use guard flag to prevent ticker accumulation
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

      // Arm wave for stages with arms (every ~360 frames)
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

      // Need-based behaviors (every ~150 frames = 2.5 sec)
      if (self._frame % 150 === 0 && self._needType) {
        if (self._needType === 'hungry') {
          self.emitParticles('sweat', 1);
          self._wiggleTimer = 3; // small shiver
        } else if (self._needType === 'sleepy') {
          self._wiggleTimer = 4;
          // Head droops slightly (guarded)
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
          // Restless hop
          self._jumpTimer = 6;
          self._wanderTargetX = (Math.random() - 0.5) * 120;
        }
      }
    }

    // Chew animation (from feedAnim)
    if (self._feedAnimTimer > 0) {
      self._feedAnimTimer--;
      if (self._feedAnimTimer === 0 && self._chewCount > 0) {
        self._chewCount--;
        // Toggle mouth open/close
        if (self.mouth) {
          var stageIdx = Math.min(self._stage || 0, PET_STAGES.length - 1);
          var data = PET_STAGES[stageIdx];
          var bW = data.bodyW;
          var bH = data.bodyH;
          var hx = bW / 2;
          var hy = bH / 2;
          var eyeR = data.eyeSize || 11;
          var eyeY = -hy * 0.30;
          self.mouth.clear();
          if (self._chewCount % 2 === 0) {
            // Open
            self.mouth.ellipse(0, eyeY + eyeR * 3.2, eyeR * 1.4, eyeR * 0.8);
            self.mouth.fill({ color: 0x3a3028 });
          } else {
            // Closed smile
            self.mouth.arc(0, eyeY + eyeR * 2.8, eyeR * 1.4, 0.15, Math.PI - 0.15);
            self.mouth.stroke({ color: 0x3a3028, width: 2.5 });
          }
        }
        if (self._chewCount > 0) {
          self._feedAnimTimer = 12; // ~200ms per chew
        } else {
          // Done chewing: restore happy expression
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

  // Progressive crack lines on egg (called each tap during hatch)
  addCrack: function(tapCount) {
    var self = this;
    if (!self.body || self._stage !== 0) return;

    var data = PET_STAGES[0];
    var bW = data.bodyW;
    var bH = data.bodyH;

    // Draw crack lines that increase with each tap
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

    // Small chip particles fly off
    if (self._app) {
      for (var p = 0; p < tapCount; p++) {
        var chip = new PIXI.Graphics();
        var chipSize = 3 + Math.random() * 4;
        chip.poly([0, 0, chipSize, -chipSize * 0.5, chipSize * 0.7, chipSize]);
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

    // Screen shake effect
    self._wiggleTimer = 8 + tapCount * 2;
  },

  // Egg shell burst effect on hatch completion
  eggBurst: function() {
    var self = this;
    if (!self._app || !self.container) return;

    var data = PET_STAGES[0];
    var bW = data.bodyW;
    var bH = data.bodyH;
    var cx = self.container.x;
    var cy = self.container.y;

    // Create many shell fragments flying outward
    var shellColor = data.color;
    var strokeColor = data.strokeColor || 0xd8b898;
    for (var i = 0; i < 12; i++) {
      var frag = new PIXI.Graphics();
      var fw = 8 + Math.random() * 12;
      var fh = 6 + Math.random() * 10;
      frag.roundRect(-fw / 2, -fh / 2, fw, fh, 3);
      frag.fill({ color: shellColor });
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

    // Flash white circle expanding from center
    var flash = new PIXI.Graphics();
    flash.circle(0, 0, 10);
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
    // No click sound here — petted fires on every canvas tap, too noisy
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

  // Feeding animation: food icon falls into open mouth, then pet chews, hearts float up
  feedAnim: function() {
    var self = this;
    if (!self._app || !self.container) return;

    // Open mouth wide
    if (self.mouth) {
      self.mouth.clear();
      var stageIdx = Math.min(self._stage || 0, PET_STAGES.length - 1);
      var data = PET_STAGES[stageIdx];
      var bW = data.bodyW;
      var bH = data.bodyH;
      var hx = bW / 2;
      var hy = bH / 2;
      var eyeR = data.eyeSize || 11;
      var eyeY = -hy * 0.30;
      // Wide open mouth (ellipse)
      self.mouth.ellipse(0, eyeY + eyeR * 3.2, eyeR * 1.6, eyeR * 1.0);
      self.mouth.fill({ color: 0x3a3028 });
    }

    // Food icon (rice bowl emoji representation: orange circle with white dot)
    var food = new PIXI.Graphics();
    food.circle(0, 0, 10).fill({ color: 0xf4b870 });
    food.circle(0, 0, 6).fill({ color: 0xffffff });
    food.x = self.container.x;
    food.y = self.container.y - 100;
    food.alpha = 1;
    self._app.stage.addChild(food);

    var stageIdx2 = Math.min(self._stage || 0, PET_STAGES.length - 1);
    var data2 = PET_STAGES[stageIdx2];
    var mouthY = self.container.y - data2.bodyH * 0.10;

    // Animate food falling into mouth
    var fallTicker = function() {
      food.y += 6;
      if (food.y >= mouthY) {
        self._app.stage.removeChild(food);
        self._app.ticker.remove(fallTicker);
        food.destroy();
        // Start chewing
        self._chewCount = 3;
        self._feedAnimTimer = 1;
        // Float hearts up
        self._floatHearts();
      }
    };
    self._app.ticker.add(fallTicker);
  },

  // Float hearts up from pet (used by feeding and petted)
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

  // Sleep animation: pet closes eyes slowly, Zzz floats, background dims
  sleepAnim: function() {
    var self = this;
    if (!self.container) return;

    // Gradually close eyes by scaling down over 500ms
    var steps = 30; // ~500ms at 60fps
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
        // Switch to sleeping expression which draws flat lines
        self._sleepAnimating = false;
        self.setExpression('sleeping');
        if (self.leftHighlight)  self.leftHighlight.alpha  = 0;
        if (self.rightHighlight) self.rightHighlight.alpha = 0;
      }
    };
    if (self._app) self._app.ticker.add(closeTicker);

    // Dim overlay on world canvas
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
      // Store reference to remove on wake
      self._sleepOverlay = overlay;
    }
  },

  // Remove sleep overlay when pet wakes
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
    // Restore eye highlights
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

    // Remove existing
    self.hidePixiBubble();

    var bubble = new PIXI.Container();

    // Measure text first
    var style = new PIXI.TextStyle({
      fontFamily: '"Gaegu", cursive',
      fontSize: 18,
      fontWeight: '700',
      fill: '#3a3028',
    });
    var txt = new PIXI.Text({ text: text, style: style });
    txt.anchor.set(0.5, 0.5);

    var padX = 16;
    var padY = 10;
    var bw = txt.width + padX * 2;
    var bh = txt.height + padY * 2;

    // Bubble background
    var bg = new PIXI.Graphics();
    bg.roundRect(-bw / 2, -bh / 2, bw, bh, 14);
    bg.fill({ color: 0xffffff, alpha: 0.95 });
    bg.stroke({ color: 0xe8d8c8, width: 2 });
    // Tail triangle
    bg.moveTo(-6, bh / 2);
    bg.lineTo(0, bh / 2 + 8);
    bg.lineTo(6, bh / 2);
    bg.closePath();
    bg.fill({ color: 0xffffff, alpha: 0.95 });

    bubble.addChild(bg);
    bubble.addChild(txt);

    bubble.x = 0;
    bubble.y = -110;
    bubble.alpha = 0;
    bubble._fadeIn = true;

    self.container.addChild(bubble);
    self._pixiBubble = bubble;
    self._pixiBubbleTimer = duration || 180; // ~3 seconds at 60fps
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
