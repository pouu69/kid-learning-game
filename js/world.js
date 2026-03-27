// js/world.js
// World rendering: pixel art sky, grass, clouds, sun/moon, letter flowers

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
  _quizOverlay: null,

  init: function(container) {
    var self = this;
    var app = new PIXI.Application();
    self.app = app;

    return app.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: false,
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
      drop.rect(0, 0, 2, 8).fill({ color: 0x88aacc, alpha: 0.4 });
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

    // Remove old decorations container if it exists
    if (self._decoContainer) {
      self.app.stage.removeChild(self._decoContainer);
      self._decoContainer.destroy({ children: true });
    }
    self._decoContainer = new PIXI.Container();
    self.app.stage.addChild(self._decoContainer);

    // Pixel tree (left side) - brown rect trunk + 3 stacked green rects
    var tree = new PIXI.Graphics();
    var treeX = W * 0.12;
    var treeBaseY = H * 0.55;
    // Trunk
    tree.rect(treeX - 4, treeBaseY - 40, 8, 40);
    tree.fill({ color: 0x8b5e3c });
    // Foliage: 3 stacked green rects decreasing in width
    tree.rect(treeX - 20, treeBaseY - 56, 40, 16);
    tree.fill({ color: 0x48a030 });
    tree.rect(treeX - 16, treeBaseY - 70, 32, 16);
    tree.fill({ color: 0x58b838 });
    tree.rect(treeX - 10, treeBaseY - 82, 20, 14);
    tree.fill({ color: 0x68c048 });
    self._decoContainer.addChild(tree);

    // Pixel flowers: small colored rects on green rect stems
    var flowerColors = [0xf08080, 0xf8d870, 0xc8a8e8, 0xa8d8b0];
    for (var fi = 0; fi < 4; fi++) {
      var flower = new PIXI.Graphics();
      var fx = W * 0.25 + fi * (W * 0.12);
      var fy = H * 0.55 + Math.random() * (H * 0.08);
      // Stem
      flower.rect(fx - 1, fy - 14, 2, 14);
      flower.fill({ color: 0x48a030 });
      // Head: small colored rect
      flower.rect(fx - 3, fy - 20, 6, 6);
      flower.fill({ color: flowerColors[fi] });
      self._decoContainer.addChild(flower);
    }

    // Pixel fence (right side): brown rect posts + horizontal bars
    var fence = new PIXI.Graphics();
    var fenceStartX = W * 0.78;
    var fenceY = H * 0.55;
    for (var pi = 0; pi < 4; pi++) {
      var postX = fenceStartX + pi * 18;
      // Post
      fence.rect(postX, fenceY - 28, 4, 28);
      fence.fill({ color: 0x8b5e3c });
    }
    // Horizontal bars
    fence.rect(fenceStartX, fenceY - 22, 54, 4);
    fence.fill({ color: 0xa0724a });
    fence.rect(fenceStartX, fenceY - 12, 54, 4);
    fence.fill({ color: 0xa0724a });
    self._decoContainer.addChild(fence);

    // Pixel mushroom: red cap with white dots + beige stem
    var mush = new PIXI.Graphics();
    var mx = W * 0.70;
    var my = H * 0.56;
    // Stem
    mush.rect(mx - 3, my - 8, 6, 8);
    mush.fill({ color: 0xe8d8b0 });
    // Cap
    mush.rect(mx - 7, my - 14, 14, 6);
    mush.fill({ color: 0xd83030 });
    // White dots on cap
    mush.rect(mx - 4, my - 12, 2, 2);
    mush.fill({ color: 0xffffff });
    mush.rect(mx + 2, my - 12, 2, 2);
    mush.fill({ color: 0xffffff });
    self._decoContainer.addChild(mush);

    // Pixel birds (V-shaped rects) replacing butterfly
    self._birds = [];
    for (var bi = 0; bi < 3; bi++) {
      var bird = new PIXI.Graphics();
      // V-shape: two small angled rects
      bird.rect(-4, 0, 3, 2);
      bird.fill({ color: 0x303030 });
      bird.rect(1, 0, 3, 2);
      bird.fill({ color: 0x303030 });
      bird.rect(-5, 2, 2, 1);
      bird.fill({ color: 0x303030 });
      bird.rect(3, 2, 2, 1);
      bird.fill({ color: 0x303030 });
      bird.x = -20 - bi * 40;
      bird.y = H * 0.15 + bi * 20;
      bird._baseY = bird.y;
      bird._speed = 0.4 + bi * 0.15;
      bird._phase = bi * 1.5;
      self._decoContainer.addChild(bird);
      self._birds.push(bird);
    }
  },

  _buildClouds: function() {
    var W = this.app.screen.width;
    var H = this.app.screen.height;
    this.clouds = [];
    // Pixel clouds: groups of rects at different heights
    var configs = [
      { w: 48, h: 12, alpha: 0.7 },
      { w: 36, h: 10, alpha: 0.6 },
      { w: 56, h: 14, alpha: 0.55 },
    ];
    for (var i = 0; i < configs.length; i++) {
      this.clouds.push({
        x: (W * 0.15) + i * (W * 0.3) + Math.random() * W * 0.1,
        y: H * (0.08 + i * 0.05),
        w: configs[i].w,
        h: configs[i].h,
        alpha: configs[i].alpha,
        speed: 0.18 + i * 0.08,
      });
    }
  },

  updateTimeOfDay: function() {
    var hour = new Date().getHours();
    var W = this.app.screen.width;
    var H = this.app.screen.height;

    // 2-phase: day (7-19) and night
    var skyTop, skyBot, isNight;
    if (hour >= 7 && hour < 19) {
      skyTop = 0x3878c0;
      skyBot = 0x88c8f8;
      isNight = false;
    } else {
      skyTop = 0x0a0820;
      skyBot = 0x282858;
      isNight = true;
    }

    this._isNight = isNight;
    document.body.classList.toggle('night', isNight);

    // Draw sky as blocky gradient with fewer steps for pixel look
    var gfx = this._skyGfx;
    gfx.clear();
    var steps = 12;
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
    var celestialX = W * 0.82;
    var celestialY = H * 0.12;

    this._sunGfx.clear();
    this._moonGfx.clear();
    this._starsGfx.clear();

    if (!isNight) {
      // Pixel sun: square rect with 4 cross-ray rects
      var sunSize = 16;
      var sunGfx = this._sunGfx;
      // Main square body
      sunGfx.rect(celestialX - sunSize / 2, celestialY - sunSize / 2, sunSize, sunSize);
      sunGfx.fill({ color: 0xf0d060 });
      // Cross rays (4 directions)
      var rayLen = 10;
      var rayW = 4;
      // Top ray
      sunGfx.rect(celestialX - rayW / 2, celestialY - sunSize / 2 - rayLen, rayW, rayLen);
      sunGfx.fill({ color: 0xf0d060 });
      // Bottom ray
      sunGfx.rect(celestialX - rayW / 2, celestialY + sunSize / 2, rayW, rayLen);
      sunGfx.fill({ color: 0xf0d060 });
      // Left ray
      sunGfx.rect(celestialX - sunSize / 2 - rayLen, celestialY - rayW / 2, rayLen, rayW);
      sunGfx.fill({ color: 0xf0d060 });
      // Right ray
      sunGfx.rect(celestialX + sunSize / 2, celestialY - rayW / 2, rayLen, rayW);
      sunGfx.fill({ color: 0xf0d060 });
    } else {
      // Pixel crescent moon: overlapping rects
      var moonGfx = this._moonGfx;
      var moonW = 16;
      var moonH = 18;
      // Main moon body
      moonGfx.rect(celestialX - moonW / 2, celestialY - moonH / 2, moonW, moonH);
      moonGfx.fill({ color: 0xf0e8c0 });
      // Crescent shadow: overlapping rect to cut out right portion
      moonGfx.rect(celestialX - moonW / 2 + 6, celestialY - moonH / 2 - 2, moonW, moonH + 4);
      moonGfx.fill({ color: 0x282858 });

      // Stars: small white rects
      var starPositions = [
        [0.12, 0.07], [0.28, 0.04], [0.45, 0.09], [0.60, 0.05],
        [0.20, 0.15], [0.50, 0.18], [0.70, 0.12], [0.35, 0.22],
        [0.15, 0.25], [0.65, 0.20], [0.88, 0.28], [0.08, 0.18],
      ];
      for (var si = 0; si < starPositions.length; si++) {
        var sx = starPositions[si][0] * W;
        var sy = starPositions[si][1] * H;
        var starSize = 2 + Math.floor(Math.random() * 2);
        this._starsGfx.rect(sx, sy, starSize, starSize);
        this._starsGfx.fill({ color: 0xffffff, alpha: 0.6 + Math.random() * 0.4 });
      }
    }

    // Grass: flat horizontal rects with pixel tufts along top edge
    this._grassGfx.clear();
    var grassY = H * 0.55;
    var grassTopColor = isNight ? 0x1a3818 : 0x68c048;
    var grassBotColor = isNight ? 0x0c2008 : 0x489030;

    // Top half of grass
    this._grassGfx.rect(0, grassY, W, (H - grassY) / 2);
    this._grassGfx.fill({ color: grassTopColor });
    // Bottom half of grass
    this._grassGfx.rect(0, grassY + (H - grassY) / 2, W, (H - grassY) / 2);
    this._grassGfx.fill({ color: grassBotColor });

    // Pixel tufts along the grass line: lighter colored rects of varying height
    var tuftColor = isNight ? 0x284828 : 0x78d858;
    var tuftCount = Math.floor(W / 16);
    for (var ti = 0; ti < tuftCount; ti++) {
      var tx = ti * 16 + Math.floor(Math.random() * 6);
      var th = 4 + Math.floor(Math.random() * 8);
      var tw = 2 + Math.floor(Math.random() * 3);
      this._grassGfx.rect(tx, grassY - th, tw, th);
      this._grassGfx.fill({ color: tuftColor });
    }
  },

  _drawClouds: function() {
    var gfx = this._cloudGfx;
    gfx.clear();
    // No clouds at night
    if (this._isNight) return;
    for (var i = 0; i < this.clouds.length; i++) {
      var c = this.clouds[i];
      // Pixel cloud: group of white rects
      // Main body
      gfx.rect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
      gfx.fill({ color: 0xffffff, alpha: c.alpha });
      // Top bump left
      gfx.rect(c.x - c.w * 0.3, c.y - c.h, c.w * 0.35, c.h * 0.7);
      gfx.fill({ color: 0xffffff, alpha: c.alpha });
      // Top bump right
      gfx.rect(c.x + c.w * 0.05, c.y - c.h * 0.8, c.w * 0.25, c.h * 0.5);
      gfx.fill({ color: 0xffffff, alpha: c.alpha });
    }
  },

  // Flower color by type - single color per type for pixel style
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
    // Return a single deterministic color based on letter charCode
    var idx = letter.charCodeAt(0) % palette.length;
    return palette[idx];
  },

  _drawFlowerShape: function(gfx, cx, cy, petalColor, size) {
    // Pixel style: simple colored square
    gfx.rect(cx - size / 2, cy - size / 2, size, size);
    gfx.fill({ color: petalColor });
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

    var container = new PIXI.Container();
    container._letter = letter;

    // Pixel stem: green rect (2px wide, ~16px tall)
    var stem = new PIXI.Graphics();
    var stemH = 16;
    stem.rect(-1, 4, 2, stemH);
    stem.fill({ color: 0x48a030 });
    container.addChild(stem);

    // Pixel flower head: colored square (14x14px)
    var headSize = 14;
    var head = new PIXI.Graphics();
    head.rect(-headSize / 2, -headSize / 2, headSize, headSize);
    head.fill({ color: petalColor });
    container.addChild(head);

    // Letter text on center using DungGeunMo font
    var fontSize = isWord ? 10 : 12;
    var style = new PIXI.TextStyle({
      fontFamily: '"DungGeunMo", monospace',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: '#ffffff',
    });
    var txt = new PIXI.Text({ text: letter, style: style });
    txt.anchor.set(0.5, 0.5);
    container.addChild(txt);

    container.x = pos.x;
    container.y = pos.y;
    container._baseY = pos.y;

    // Tap handler with quiz interaction
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', function() {
      // If fewer than 3 known letters, just play TTS
      if (self.letterFlowers.length < 3) {
        var letterData = typeof LETTERS !== 'undefined' ? LETTERS[letter] : null;
        if (letterData) {
          if (typeof speakText === 'function') speakText(letterData.name, 0.8);
        } else {
          if (typeof speakText === 'function') speakText(letter, 0.8);
        }
        container._bumpTimer = 12;
        return;
      }

      // 3+ known letters: show quiz overlay
      self._showQuiz(letter, container);
    });

    // Entrance animation
    container.scale.set(0);
    container._growTimer = 20;

    this.app.stage.addChild(container);
    this.letterFlowers.push(container);
  },

  _showQuiz: function(correctLetter, flowerContainer) {
    var self = this;
    var W = self.app.screen.width;
    var H = self.app.screen.height;

    // Dismiss any existing quiz
    self._dismissQuiz();

    // Play TTS for the correct letter
    var letterData = typeof LETTERS !== 'undefined' ? LETTERS[correctLetter] : null;
    if (letterData) {
      if (typeof speakText === 'function') speakText(letterData.name, 0.8);
    } else {
      if (typeof speakText === 'function') speakText(correctLetter, 0.8);
    }

    // Collect 2 random wrong answers from other flowers
    var others = [];
    for (var i = 0; i < self.letterFlowers.length; i++) {
      var fl = self.letterFlowers[i]._letter;
      if (fl !== correctLetter) others.push(fl);
    }
    // Shuffle and pick 2
    for (var si = others.length - 1; si > 0; si--) {
      var j = Math.floor(Math.random() * (si + 1));
      var tmp = others[si];
      others[si] = others[j];
      others[j] = tmp;
    }
    var wrongAnswers = others.slice(0, 2);
    var choices = [correctLetter].concat(wrongAnswers);
    // Shuffle choices
    for (var ci = choices.length - 1; ci > 0; ci--) {
      var cj = Math.floor(Math.random() * (ci + 1));
      var ctmp = choices[ci];
      choices[ci] = choices[cj];
      choices[cj] = ctmp;
    }

    // Create overlay container
    var overlay = new PIXI.Container();
    overlay.eventMode = 'static';

    // Semi-transparent background
    var bg = new PIXI.Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x000000, alpha: 0.4 });
    bg.eventMode = 'static';
    overlay.addChild(bg);

    // Quiz buttons
    var btnSize = 56;
    var gap = 16;
    var totalW = choices.length * btnSize + (choices.length - 1) * gap;
    var startX = (W - totalW) / 2;
    var btnY = H * 0.45;

    for (var bi = 0; bi < choices.length; bi++) {
      (function(choiceLetter, idx) {
        var btn = new PIXI.Container();
        btn.eventMode = 'static';
        btn.cursor = 'pointer';

        var btnGfx = new PIXI.Graphics();
        var btnColor = self._getFlowerColor(choiceLetter);
        btnGfx.rect(0, 0, btnSize, btnSize);
        btnGfx.fill({ color: btnColor });
        btn.addChild(btnGfx);

        var btnTxt = new PIXI.Text({
          text: choiceLetter,
          style: new PIXI.TextStyle({
            fontFamily: '"DungGeunMo", monospace',
            fontSize: 22,
            fontWeight: 'bold',
            fill: '#ffffff',
          }),
        });
        btnTxt.anchor.set(0.5, 0.5);
        btnTxt.x = btnSize / 2;
        btnTxt.y = btnSize / 2;
        btn.addChild(btnTxt);

        btn.x = startX + idx * (btnSize + gap);
        btn.y = btnY;

        btn.on('pointerdown', function(e) {
          e.stopPropagation();
          if (choiceLetter === correctLetter) {
            // Correct: flower grows briefly + sparkle particles
            flowerContainer._bumpTimer = 12;
            flowerContainer.scale.set(1.3);
            setTimeout(function() {
              flowerContainer.scale.set(1);
            }, 400);
            // Emit sparkle rects
            self._emitSparkles(flowerContainer.x, flowerContainer.y);
            self._dismissQuiz();
          } else {
            // Wrong: flower dims + show correct answer large for 2 seconds
            flowerContainer.alpha = 0.4;
            self._showCorrectAnswer(correctLetter);
            setTimeout(function() {
              flowerContainer.alpha = 1;
              self._dismissQuiz();
            }, 2000);
          }
        });

        overlay.addChild(btn);
      })(choices[bi], bi);
    }

    self._quizOverlay = overlay;
    self.app.stage.addChild(overlay);
  },

  _showCorrectAnswer: function(letter) {
    var self = this;
    var W = self.app.screen.width;
    var H = self.app.screen.height;

    if (!self._quizOverlay) return;

    var correctTxt = new PIXI.Text({
      text: letter,
      style: new PIXI.TextStyle({
        fontFamily: '"DungGeunMo", monospace',
        fontSize: 64,
        fontWeight: 'bold',
        fill: '#ffffff',
      }),
    });
    correctTxt.anchor.set(0.5, 0.5);
    correctTxt.x = W / 2;
    correctTxt.y = H * 0.3;
    self._quizOverlay.addChild(correctTxt);
  },

  _emitSparkles: function(x, y) {
    var self = this;
    for (var i = 0; i < 8; i++) {
      var sparkle = new PIXI.Graphics();
      var sz = 2 + Math.floor(Math.random() * 3);
      sparkle.rect(-sz / 2, -sz / 2, sz, sz);
      sparkle.fill({ color: 0xf8f080 });
      sparkle.x = x;
      sparkle.y = y;
      sparkle._vx = (Math.random() - 0.5) * 4;
      sparkle._vy = -1 - Math.random() * 3;
      sparkle._life = 20 + Math.floor(Math.random() * 15);
      sparkle._maxLife = sparkle._life;
      self._ambientContainer.addChild(sparkle);
      self._ambientParticles.push(sparkle);
    }
  },

  _dismissQuiz: function() {
    if (this._quizOverlay) {
      this.app.stage.removeChild(this._quizOverlay);
      this._quizOverlay.destroy({ children: true });
      this._quizOverlay = null;
    }
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
      if (c.x - (c.w || 60) > W) {
        c.x = -(c.w || 60);
      }
    }
    // Redraw clouds every 2nd frame
    if (self._frame % 2 === 0) self._drawClouds();

    // Bob letter flowers and handle grow-in animation
    for (var fi = 0; fi < self.letterFlowers.length; fi++) {
      var flower = self.letterFlowers[fi];
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

    // Pixel birds drift
    if (self._birds) {
      for (var bi = 0; bi < self._birds.length; bi++) {
        var bird = self._birds[bi];
        bird.x += bird._speed;
        bird.y = bird._baseY + Math.sin(self._frame * 0.03 + bird._phase) * 8;
        if (bird.x > W + 30) {
          bird.x = -30 - bi * 40;
          bird._baseY = self.app.screen.height * (0.12 + Math.random() * 0.18);
          bird.y = bird._baseY;
        }
      }
    }

    // Twinkle stars at night
    if (self._starsGfx && self._isNight) {
      self._starsGfx.alpha = 0.7 + 0.3 * Math.abs(Math.sin(self._frame * 0.025));
    }

    // Animated grass blades
    self._drawGrassBlades();

    // Ambient particles (fireflies / particles)
    self._updateAmbientParticles();

    // Update time of day every ~5 minutes
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
    if (this._frame % 3 !== 0) return;
    gfx.clear();
    for (var i = 0; i < this._grassBlades.length; i++) {
      var b = this._grassBlades[i];
      var windSway = Math.sin(this._frame * 0.02 + b.phase) * 2;
      var totalSway = windSway + b.sway;
      // Pixel style: draw as small rects instead of lines
      gfx.rect(b.x + totalSway, b.y - b.h, 2, b.h);
      gfx.fill({ color: b.color });
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
    if (y < H * 0.50) return;
    var ripple = new PIXI.Graphics();
    // Pixel ripple: expanding rect outline
    ripple.rect(-4, -4, 8, 8);
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
      // Firefly: small green-yellow rect with glow effect
      p = new PIXI.Graphics();
      // Core rect
      p.rect(-1, -1, 3, 3);
      p.fill({ color: 0xc8e830, alpha: 0.9 });
      // Glow halo rect
      p.rect(-3, -3, 7, 7);
      p.fill({ color: 0xc8e830, alpha: 0.12 });
      p.x = Math.random() * W;
      p.y = H * 0.25 + Math.random() * H * 0.45;
      p._type = 'firefly';
      p._vx = (Math.random() - 0.5) * 0.6;
      p._vy = (Math.random() - 0.5) * 0.3;
      p._life = 200 + Math.random() * 200;
      p._phase = Math.random() * Math.PI * 2;
    } else {
      // Day: small white rect particles drifting
      p = new PIXI.Graphics();
      p.rect(-1, -1, 2, 2);
      p.fill({ color: 0xffffff, alpha: 0.6 });
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
    var spawnRate = this._isNight ? 120 : 180;
    if (this._frame % spawnRate === 0 && this._ambientParticles.length < 15) {
      this._spawnAmbientParticle();
    }

    for (var i = this._ambientParticles.length - 1; i >= 0; i--) {
      var p = this._ambientParticles[i];
      p._life--;

      var lifeRatio = p._life / p._maxLife;
      if (lifeRatio > 0.9) {
        p.alpha = (1 - lifeRatio) * 10;
      } else if (lifeRatio < 0.1) {
        p.alpha = lifeRatio * 10;
      } else {
        p.alpha = p._type === 'firefly' ?
          0.4 + 0.6 * Math.abs(Math.sin(this._frame * 0.06 + p._phase)) :
          0.6;
      }

      if (p._type === 'firefly') {
        p.x += p._vx + Math.sin(this._frame * 0.03 + p._phase) * 0.3;
        p.y += p._vy + Math.cos(this._frame * 0.025 + p._phase) * 0.2;
        if (p.x < 0 || p.x > W) p._vx *= -1;
      } else {
        p.x += p._vx;
        p.y += p._vy + Math.sin(this._frame * 0.02 + p._phase) * 0.15;
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
    this._addDecorations();
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
