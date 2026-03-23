// js/world.js
// World rendering: sky, grass, clouds, sun/moon, letter flowers

var World = {
  app: null,
  _skyGfx: null,
  _grassGfx: null,
  _cloudGfx: null,
  _sunGfx: null,
  _moonGfx: null,
  _starsGfx: null,
  clouds: [],
  letterFlowers: [],
  _frame: 0,
  _weather: 'clear',
  _rainDrops: [],
  _ambientParticles: [],
  _isNight: false,
  _grassBlades: [],
  _touchRipples: [],

  init: function(container) {
    var self = this;
    var app = new PIXI.Application();
    self.app = app;

    return app.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(function() {
      container.appendChild(app.canvas);
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.display = 'block';

      self._skyGfx    = new PIXI.Graphics();
      self._starsGfx  = new PIXI.Graphics();
      self._cloudGfx  = new PIXI.Graphics();
      self._sunGfx    = new PIXI.Graphics();
      self._moonGfx   = new PIXI.Graphics();
      self._grassGfx  = new PIXI.Graphics();

      app.stage.addChild(self._skyGfx);
      app.stage.addChild(self._starsGfx);
      app.stage.addChild(self._cloudGfx);
      app.stage.addChild(self._sunGfx);
      app.stage.addChild(self._moonGfx);
      app.stage.addChild(self._grassGfx);

      self._buildClouds();
      self.updateTimeOfDay();
      self._addDecorations();

      // Interactive grass blades layer
      self._grassBladesGfx = new PIXI.Graphics();
      app.stage.addChild(self._grassBladesGfx);
      self._buildGrassBlades();

      // Ambient particles layer (above grass, below pet)
      self._ambientContainer = new PIXI.Container();
      app.stage.addChild(self._ambientContainer);

      // Touch ripple handling
      app.canvas.addEventListener('pointerdown', function(e) {
        var rect = app.canvas.getBoundingClientRect();
        var x = (e.clientX - rect.left) * (app.screen.width / rect.width);
        var y = (e.clientY - rect.top) * (app.screen.height / rect.height);
        self._addTouchRipple(x, y);
        self._swayGrassNear(x, y);
      });

      app.ticker.add(function() { self.animate(); });

      window.addEventListener('resize', function() { self.resize(); });

      // Day/night update every 60 seconds
      setInterval(function() { self.updateTimeOfDay(); }, 60000);

      // Weather change every 5 minutes
      setInterval(function() {
        var rand = Math.random();
        if (rand < 0.7) {
          if (self._weather !== 'clear') { self._stopRain(); self._weather = 'clear'; }
        } else {
          if (self._weather === 'clear') { self._startRain(); self._weather = 'rain'; }
        }
      }, 300000);
    });
  },

  _startRain: function() {
    var self = this;
    var W = self.app.screen.width;
    var H = self.app.screen.height;
    for (var i = 0; i < 20; i++) {
      var drop = new PIXI.Graphics();
      drop.rect(0, 0, 1.5, 8).fill({ color: 0x88aacc, alpha: 0.4 });
      drop.x = Math.random() * W;
      drop.y = Math.random() * H * 0.5;
      drop._speed = 3 + Math.random() * 2;
      self._rainDrops.push(drop);
      self.app.stage.addChild(drop);
    }
  },

  _stopRain: function() {
    for (var i = 0; i < this._rainDrops.length; i++) {
      this.app.stage.removeChild(this._rainDrops[i]);
      this._rainDrops[i].destroy();
    }
    this._rainDrops = [];
  },

  _addDecorations: function() {
    var self = this;
    var W = self.app.screen.width;
    var H = self.app.screen.height;

    // Grass tufts scattered on the hill area
    for (var i = 0; i < 5; i++) {
      var tuft = new PIXI.Graphics();
      var tx = 20 + Math.random() * (W - 40);
      var ty = H * 0.52 + Math.random() * (H * 0.28);
      // Left blade
      tuft.fill({ color: 0x88b888 });
      tuft.moveTo(tx, ty);
      tuft.lineTo(tx - 3, ty - 8 - Math.random() * 6);
      tuft.lineTo(tx + 3, ty);
      tuft.fill();
      // Right blade
      tuft.fill({ color: 0x78a878 });
      tuft.moveTo(tx + 4, ty);
      tuft.lineTo(tx + 6, ty - 10 - Math.random() * 5);
      tuft.lineTo(tx + 8, ty);
      tuft.fill();
      self.app.stage.addChild(tuft);
    }

    // Small decorative flowers (5-petal shapes)
    var flowerColors = [0xf4a8a8, 0xf8d870, 0xc8a8e8, 0xf0b888, 0xa8d8b0];
    for (var fi = 0; fi < 6; fi++) {
      var flower = new PIXI.Graphics();
      var fx = 25 + (fi / 5) * (W - 50) + (Math.random() - 0.5) * 30;
      var fy = H * 0.56 + Math.random() * (H * 0.20);
      var fc = flowerColors[fi % flowerColors.length];
      // Stem
      flower.rect(fx - 1, fy - 8, 2, 12);
      flower.fill({ color: 0x68a870 });
      // Leaf
      flower.ellipse(fx + 3, fy - 2, 4, 2);
      flower.fill({ color: 0x88b888 });
      // Petals (5 around center)
      for (var p = 0; p < 5; p++) {
        var angle = (p / 5) * Math.PI * 2 - Math.PI / 2;
        var petalX = fx + Math.cos(angle) * 5;
        var petalY = fy - 8 + Math.sin(angle) * 5;
        flower.ellipse(petalX, petalY, 4, 3);
        flower.fill({ color: fc });
      }
      // Center
      flower.circle(fx, fy - 8, 2.5);
      flower.fill({ color: 0xf8f0a0 });
      self.app.stage.addChild(flower);
    }

    // Butterfly: a small shape that drifts across in a sine wave
    self._butterfly = new PIXI.Graphics();
    // Left wing
    self._butterfly.ellipse(-6, 0, 7, 5);
    self._butterfly.fill({ color: 0xf0a0d0, alpha: 0.85 });
    // Right wing
    self._butterfly.ellipse(6, 0, 7, 5);
    self._butterfly.fill({ color: 0xd0a0f0, alpha: 0.85 });
    // Body
    self._butterfly.rect(-1, -4, 2, 8);
    self._butterfly.fill({ color: 0x806060 });

    self._butterfly.x = -30;
    self._butterfly.y = H * 0.25;
    self._butterflyBaseY = H * 0.25;
    self._butterflyFrame = 0;
    self.app.stage.addChild(self._butterfly);
  },

  _buildClouds: function() {
    var W = this.app.screen.width;
    var H = this.app.screen.height;
    this.clouds = [];
    var configs = [
      { rx: 55, ry: 22, alpha: 0.65 },
      { rx: 44, ry: 18, alpha: 0.55 },
      { rx: 62, ry: 20, alpha: 0.50 },
    ];
    for (var i = 0; i < configs.length; i++) {
      this.clouds.push({
        x: (W * 0.15) + i * (W * 0.3) + Math.random() * W * 0.1,
        y: H * (0.08 + i * 0.05),
        rx: configs[i].rx,
        ry: configs[i].ry,
        alpha: configs[i].alpha,
        speed: 0.18 + i * 0.08,
      });
    }
  },

  updateTimeOfDay: function() {
    var hour = new Date().getHours();
    var W = this.app.screen.width;
    var H = this.app.screen.height;

    // Determine palette
    var skyTop, skyBot, isNight, isSunset;
    if (hour >= 6 && hour < 18) {
      // Day
      skyTop = 0x88c8e8;
      skyBot = 0xb8ddf0;
      isNight = false;
      isSunset = false;
    } else if (hour >= 18 && hour < 21) {
      // Sunset
      skyTop = 0xf0a870;
      skyBot = 0xd88860;
      isNight = false;
      isSunset = true;
    } else {
      // Night
      skyTop = 0x2a2848;
      skyBot = 0x3a3868;
      isNight = true;
      isSunset = false;
    }

    this._isNight = isNight;

    // Draw sky as horizontal gradient strips
    var gfx = this._skyGfx;
    gfx.clear();
    var steps = 50;
    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1);
      var r = Math.round(_lerpChannel(skyTop >> 16 & 0xff, skyBot >> 16 & 0xff, t));
      var g = Math.round(_lerpChannel(skyTop >> 8  & 0xff, skyBot >> 8  & 0xff, t));
      var b = Math.round(_lerpChannel(skyTop       & 0xff, skyBot       & 0xff, t));
      var col = (r << 16) | (g << 8) | b;
      var stripY = Math.floor(H * i / steps);
      var stripH = Math.ceil(H / steps) + 1;
      gfx.rect(0, stripY, W, stripH);
      gfx.fill({ color: col });
    }

    // Sun or moon
    var sunR = 22;
    var moonR = 16;
    var celestialX = W * 0.82;
    var celestialY = H * 0.12;

    this._sunGfx.clear();
    this._moonGfx.clear();
    this._starsGfx.clear();

    if (!isNight && !isSunset) {
      this._sunGfx.circle(celestialX, celestialY, sunR);
      this._sunGfx.fill({ color: 0xf0d060 });
    } else if (isSunset) {
      // Deeper sun near horizon
      this._sunGfx.circle(celestialX, H * 0.20, sunR + 4);
      this._sunGfx.fill({ color: 0xf07830 });
    } else {
      // Night: moon + stars
      this._moonGfx.circle(celestialX, celestialY, moonR);
      this._moonGfx.fill({ color: 0xf0e8c0 });
      // Crescent shadow
      this._moonGfx.circle(celestialX + moonR * 0.35, celestialY - moonR * 0.15, moonR * 0.75);
      this._moonGfx.fill({ color: 0x3a3868 });

      // Stars
      var starPositions = [
        [0.12, 0.07], [0.28, 0.04], [0.45, 0.09], [0.60, 0.05],
        [0.20, 0.15], [0.50, 0.18], [0.70, 0.12], [0.35, 0.22],
        [0.15, 0.25], [0.65, 0.20], [0.88, 0.28], [0.08, 0.18],
      ];
      for (var si = 0; si < starPositions.length; si++) {
        var sx = starPositions[si][0] * W;
        var sy = starPositions[si][1] * H;
        var sr = 1 + Math.random() * 1.5;
        this._starsGfx.circle(sx, sy, sr);
        this._starsGfx.fill({ color: 0xffffff, alpha: 0.6 + Math.random() * 0.4 });
      }
    }

    // Grass: two overlapping ellipses at bottom
    this._grassGfx.clear();
    var grassLineY = H * 0.55;
    // Back hill (slightly higher)
    this._grassGfx.ellipse(W * 0.35, grassLineY + H * 0.08, W * 0.65, H * 0.22);
    this._grassGfx.fill({ color: 0xa8d8b0 });
    // Front hill
    this._grassGfx.ellipse(W * 0.62, grassLineY + H * 0.10, W * 0.70, H * 0.20);
    this._grassGfx.fill({ color: 0x98c8a0 });
    // Fill bottom area below hills
    this._grassGfx.rect(0, grassLineY + H * 0.18, W, H - (grassLineY + H * 0.18));
    this._grassGfx.fill({ color: 0x98c8a0 });
  },

  _drawClouds: function() {
    var gfx = this._cloudGfx;
    gfx.clear();
    for (var i = 0; i < this.clouds.length; i++) {
      var c = this.clouds[i];
      // Main cloud body
      gfx.ellipse(c.x, c.y, c.rx, c.ry);
      gfx.fill({ color: 0xffffff, alpha: c.alpha });
      // Puff on top-left
      gfx.ellipse(c.x - c.rx * 0.3, c.y - c.ry * 0.4, c.rx * 0.55, c.ry * 0.75);
      gfx.fill({ color: 0xffffff, alpha: c.alpha });
      // Puff on top-right
      gfx.ellipse(c.x + c.rx * 0.25, c.y - c.ry * 0.3, c.rx * 0.45, c.ry * 0.65);
      gfx.fill({ color: 0xffffff, alpha: c.alpha });
    }
  },

  // Flower color palettes by type
  _flowerColors: {
    consonant: [0xf08080, 0xf4a8a8, 0xe88888, 0xf09090, 0xd87878],
    vowel:     [0x88b8e8, 0xa0c8f0, 0x78a8d8, 0x90b0e0, 0x80a0d0],
    word:      [0xc8a0d8, 0xd8b0e8, 0xb890c8, 0xe0b8f0, 0xb080c0],
  },

  _getFlowerColor: function(letter) {
    var isConsonant = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.indexOf(letter) !== -1;
    var isVowel = 'ㅏㅓㅗㅜㅡㅣㅐㅔ'.indexOf(letter) !== -1;
    var palette = isConsonant ? this._flowerColors.consonant :
                  isVowel ? this._flowerColors.vowel :
                  this._flowerColors.word;
    return palette[Math.floor(Math.random() * palette.length)];
  },

  _drawFlowerShape: function(gfx, cx, cy, petalColor, centerColor, size, petalCount) {
    var n = petalCount || 5;
    var petalR = size * 0.45;
    var centerR = size * 0.32;
    // Draw petals
    for (var i = 0; i < n; i++) {
      var angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      var px = cx + Math.cos(angle) * (size * 0.35);
      var py = cy + Math.sin(angle) * (size * 0.35);
      gfx.ellipse(px, py, petalR, petalR * 0.75);
      gfx.fill({ color: petalColor, alpha: 0.9 });
    }
    // Center
    gfx.circle(cx, cy, centerR);
    gfx.fill({ color: centerColor });
  },

  _getFlowerSlot: function(index) {
    var W = this.app.screen.width;
    var H = this.app.screen.height;
    var grassTop = H * 0.62;
    var grassBot = H * 0.92;
    var cols = Math.max(3, Math.floor(W / 130));
    var row = Math.floor(index / cols);
    var col = index % cols;
    var cellW = (W - 30) / cols;
    var maxRows = Math.floor((grassBot - grassTop) / 60);
    var rowH = Math.min(60, (grassBot - grassTop) / Math.max(maxRows, 3));
    var px = 15 + col * cellW + cellW / 2 + (row % 2 ? cellW * 0.25 : 0);
    var py = grassTop + row * rowH + rowH / 2;
    // Keep flowers away from pet center (W/2, H*0.52)
    var petCx = W / 2;
    var petCy = H * 0.52;
    var dx = px - petCx;
    var dy = py - petCy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 80) {
      // Push flower outward from pet
      var angle = Math.atan2(dy, dx);
      px = petCx + Math.cos(angle) * 85;
      py = petCy + Math.sin(angle) * 85;
    }
    // Clamp
    if (px < 20) px = 20;
    if (px > W - 20) px = W - 20;
    if (py > grassBot) py = grassBot - 10;
    if (py < grassTop) py = grassTop + 10;
    return { x: px, y: py };
  },

  addLetterFlower: function(letter) {
    var self = this;
    for (var fi = 0; fi < this.letterFlowers.length; fi++) {
      if (this.letterFlowers[fi]._letter === letter) return;
    }

    var flowerIndex = this.letterFlowers.length;
    var pos = this._getFlowerSlot(flowerIndex);
    var petalColor = this._getFlowerColor(letter);
    var isWord = letter.length > 1;
    var flowerSize = isWord ? 42 : 36;

    var container = new PIXI.Container();
    container._letter = letter;

    // Stem
    var stem = new PIXI.Graphics();
    var stemH = 22 + Math.random() * 10;
    stem.rect(-2, 4, 4, stemH);
    stem.fill({ color: 0x68a870 });
    // Leaf
    stem.ellipse(5, stemH * 0.5, 8, 4);
    stem.fill({ color: 0x88b888 });
    container.addChild(stem);

    // Flower head
    var head = new PIXI.Graphics();
    var petalCount = isWord ? 6 : 5;
    self._drawFlowerShape(head, 0, 0, petalColor, 0xf8f0a0, flowerSize, petalCount);
    container.addChild(head);

    // Letter text on center
    var fontSize = isWord ? 18 : 22;
    var style = new PIXI.TextStyle({
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: '#3a3028',
    });
    var txt = new PIXI.Text({ text: letter, style: style });
    txt.anchor.set(0.5, 0.5);
    container.addChild(txt);

    container.x = pos.x;
    container.y = pos.y;
    container._baseY = pos.y;

    // Tap to hear letter name
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', function() {
      var letterData = typeof LETTERS !== 'undefined' ? LETTERS[letter] : null;
      if (letterData) {
        // Speak the letter name (e.g. "기역") then sound
        if (typeof speakText === 'function') speakText(letterData.name, 0.8);
      } else {
        // Word: speak the word
        if (typeof speakText === 'function') speakText(letter, 0.8);
      }
      container._bumpTimer = 12;
    });

    // Entrance animation
    container.scale.set(0);
    container._growTimer = 20;

    this.app.stage.addChild(container);
    this.letterFlowers.push(container);
  },

  syncLetterFlowers: function(knownLetters) {
    if (!knownLetters) return;
    for (var i = 0; i < knownLetters.length; i++) {
      this.addLetterFlower(knownLetters[i]);
    }
  },

  addWordFlower: function(word) {
    this.addLetterFlower(word);
  },

  animate: function() {
    var self = this;
    self._frame++;
    var W = self.app.screen.width;

    // Move rain drops
    for (var r = 0; r < self._rainDrops.length; r++) {
      var d = self._rainDrops[r];
      d.y += d._speed;
      d.x -= 0.5;
      if (d.y > self.app.screen.height) {
        d.y = -10;
        d.x = Math.random() * self.app.screen.width;
      }
    }

    // Drift clouds right, wrap around
    for (var i = 0; i < self.clouds.length; i++) {
      var c = self.clouds[i];
      c.x += c.speed;
      if (c.x - c.rx > W) {
        c.x = -c.rx;
      }
    }
    // Redraw clouds every 2nd frame (they move slowly)
    if (self._frame % 2 === 0) self._drawClouds();

    // Bob letter flowers and handle grow-in animation
    for (var fi = 0; fi < self.letterFlowers.length; fi++) {
      var flower = self.letterFlowers[fi];
      // Grow-in animation for newly added flowers
      if (flower._growTimer && flower._growTimer > 0) {
        flower._growTimer--;
        var gt = 1 - (flower._growTimer / 20);
        var eased = gt < 0.5 ? 2 * gt * gt : -1 + (4 - 2 * gt) * gt;
        var overshoot = eased > 0.8 ? 1 + (1 - eased) * 0.5 : eased;
        flower.scale.set(Math.min(overshoot, 1.1));
        if (flower._growTimer <= 0) flower.scale.set(1);
      }
      var bob = Math.sin(self._frame * 0.04 + fi * 1.2) * 3;
      if (flower._bumpTimer && flower._bumpTimer > 0) {
        flower._bumpTimer--;
        bob += Math.sin(flower._bumpTimer / 12 * Math.PI) * -8;
      }
      flower.y = flower._baseY + bob;
    }

    // Butterfly drift
    if (self._butterfly) {
      self._butterflyFrame = (self._butterflyFrame || 0) + 1;
      self._butterfly.x += 0.55;
      self._butterfly.y = self._butterflyBaseY + Math.sin(self._butterflyFrame * 0.04) * 22;
      // Wing flap: scale y alternates
      self._butterfly.scale.y = 0.7 + 0.3 * Math.abs(Math.sin(self._butterflyFrame * 0.18));
      // Wrap around when off-screen
      if (self._butterfly.x > W + 30) {
        self._butterfly.x = -30;
        self._butterflyBaseY = self.app.screen.height * (0.18 + Math.random() * 0.20);
        self._butterfly.y = self._butterflyBaseY;
        self._butterflyFrame = 0;
      }
    }

    // Twinkle stars at night: subtle alpha oscillation on the starsGfx
    if (self._starsGfx && self._starsGfx.children && self._starsGfx.children.length === 0) {
      self._starsGfx.alpha = 0.7 + 0.3 * Math.abs(Math.sin(self._frame * 0.025));
    }

    // Animated grass blades
    self._drawGrassBlades();

    // Ambient particles (fireflies / dandelion seeds)
    self._updateAmbientParticles();

    // Update time of day every ~5 minutes (18000 frames at 60fps)
    if (self._frame % 18000 === 0) {
      self.updateTimeOfDay();
    }
  },

  // === Interactive grass blades ===
  _buildGrassBlades: function() {
    var W = this.app.screen.width;
    var H = this.app.screen.height;
    var grassTop = H * 0.54;
    this._grassBlades = [];
    var count = Math.floor(W / 28);
    for (var i = 0; i < count; i++) {
      this._grassBlades.push({
        x: (i / count) * W + Math.random() * 10,
        y: grassTop + Math.random() * (H * 0.15),
        h: 10 + Math.random() * 14,
        sway: 0,
        swayTarget: 0,
        color: Math.random() > 0.5 ? 0x78a878 : 0x88b888,
        phase: Math.random() * Math.PI * 2,
      });
    }
  },

  _drawGrassBlades: function() {
    var gfx = this._grassBladesGfx;
    if (!gfx) return;
    // Throttle: redraw every 3rd frame for performance
    if (this._frame % 3 !== 0) return;
    gfx.clear();
    for (var i = 0; i < this._grassBlades.length; i++) {
      var b = this._grassBlades[i];
      var windSway = Math.sin(this._frame * 0.02 + b.phase) * 2;
      var totalSway = windSway + b.sway;
      gfx.moveTo(b.x, b.y);
      gfx.lineTo(b.x + totalSway, b.y - b.h);
      gfx.stroke({ color: b.color, width: 2, cap: 'round' });
      b.sway *= 0.92;
    }
  },

  _swayGrassNear: function(tx, ty) {
    for (var i = 0; i < this._grassBlades.length; i++) {
      var b = this._grassBlades[i];
      var dx = b.x - tx;
      var dy = b.y - ty;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        var strength = (1 - dist / 80) * 12;
        b.sway = dx > 0 ? strength : -strength;
      }
    }
  },

  // === Touch ripples ===
  _addTouchRipple: function(x, y) {
    var H = this.app.screen.height;
    if (y < H * 0.50) return; // Only on grass area
    var ripple = new PIXI.Graphics();
    ripple.circle(0, 0, 5);
    ripple.stroke({ color: 0xffffff, width: 2, alpha: 0.4 });
    ripple.x = x;
    ripple.y = y;
    ripple._life = 25;
    ripple._maxLife = 25;
    this._ambientContainer.addChild(ripple);
    this._touchRipples.push(ripple);
  },

  // === Ambient particles ===
  _spawnAmbientParticle: function() {
    var W = this.app.screen.width;
    var H = this.app.screen.height;
    var p;
    if (this._isNight) {
      // Firefly: tiny glowing dot
      p = new PIXI.Graphics();
      p.circle(0, 0, 2);
      p.fill({ color: 0xf0e870, alpha: 0.8 });
      // Glow halo
      p.circle(0, 0, 6);
      p.fill({ color: 0xf0e870, alpha: 0.15 });
      p.x = Math.random() * W;
      p.y = H * 0.25 + Math.random() * H * 0.45;
      p._type = 'firefly';
      p._vx = (Math.random() - 0.5) * 0.6;
      p._vy = (Math.random() - 0.5) * 0.3;
      p._life = 200 + Math.random() * 200;
      p._phase = Math.random() * Math.PI * 2;
    } else {
      // Dandelion seed: small white puff
      p = new PIXI.Graphics();
      // Seed body
      p.circle(0, 0, 1.5);
      p.fill({ color: 0xffffff, alpha: 0.7 });
      // Fluffy lines
      for (var a = 0; a < 5; a++) {
        var angle = (a / 5) * Math.PI * 2;
        p.moveTo(0, 0);
        p.lineTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
        p.stroke({ color: 0xffffff, width: 0.5, alpha: 0.5 });
      }
      p.x = -10;
      p.y = H * 0.15 + Math.random() * H * 0.35;
      p._type = 'seed';
      p._vx = 0.3 + Math.random() * 0.4;
      p._vy = (Math.random() - 0.5) * 0.15;
      p._life = 300 + Math.random() * 200;
      p._phase = Math.random() * Math.PI * 2;
    }
    p.alpha = 0;
    p._maxLife = p._life;
    this._ambientContainer.addChild(p);
    this._ambientParticles.push(p);
  },

  _updateAmbientParticles: function() {
    var W = this.app.screen.width;
    // Spawn new particles periodically
    var spawnRate = this._isNight ? 120 : 180;
    if (this._frame % spawnRate === 0 && this._ambientParticles.length < 15) {
      this._spawnAmbientParticle();
    }

    for (var i = this._ambientParticles.length - 1; i >= 0; i--) {
      var p = this._ambientParticles[i];
      p._life--;

      // Fade in/out
      var lifeRatio = p._life / p._maxLife;
      if (lifeRatio > 0.9) {
        p.alpha = (1 - lifeRatio) * 10; // fade in
      } else if (lifeRatio < 0.1) {
        p.alpha = lifeRatio * 10; // fade out
      } else {
        p.alpha = p._type === 'firefly' ?
          0.4 + 0.6 * Math.abs(Math.sin(this._frame * 0.06 + p._phase)) :
          0.6;
      }

      if (p._type === 'firefly') {
        // Fireflies drift in gentle curves
        p.x += p._vx + Math.sin(this._frame * 0.03 + p._phase) * 0.3;
        p.y += p._vy + Math.cos(this._frame * 0.025 + p._phase) * 0.2;
        // Reverse direction at edges
        if (p.x < 0 || p.x > W) p._vx *= -1;
      } else {
        // Dandelion seeds float right with gentle wave
        p.x += p._vx;
        p.y += p._vy + Math.sin(this._frame * 0.02 + p._phase) * 0.15;
        p.rotation = Math.sin(this._frame * 0.03 + p._phase) * 0.3;
      }

      if (p._life <= 0) {
        this._ambientContainer.removeChild(p);
        p.destroy();
        this._ambientParticles.splice(i, 1);
      }
    }

    // Update touch ripples
    for (var r = this._touchRipples.length - 1; r >= 0; r--) {
      var rp = this._touchRipples[r];
      rp._life--;
      var t = 1 - (rp._life / rp._maxLife);
      rp.scale.set(1 + t * 3);
      rp.alpha = (1 - t) * 0.4;
      if (rp._life <= 0) {
        this._ambientContainer.removeChild(rp);
        rp.destroy();
        this._touchRipples.splice(r, 1);
      }
    }
  },

  resize: function() {
    this._buildClouds();
    this._buildGrassBlades();
    this.updateTimeOfDay();
    // Reposition flowers using grid layout
    for (var fi = 0; fi < this.letterFlowers.length; fi++) {
      var pos = this._getFlowerSlot(fi);
      this.letterFlowers[fi].x = pos.x;
      this.letterFlowers[fi].y = pos.y;
      this.letterFlowers[fi]._baseY = pos.y;
    }
    // Clear ambient particles on resize
    for (var ai = this._ambientParticles.length - 1; ai >= 0; ai--) {
      this._ambientContainer.removeChild(this._ambientParticles[ai]);
      this._ambientParticles[ai].destroy();
    }
    this._ambientParticles = [];
  },
};

// Color channel linear interpolation helper
function _lerpChannel(a, b, t) {
  return a + (b - a) * t;
}
