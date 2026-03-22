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

      app.ticker.add(function() { self.animate(); });

      window.addEventListener('resize', function() { self.resize(); });
    });
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

  addLetterFlower: function(letter) {
    var self = this;
    // Skip if already exists
    for (var fi = 0; fi < this.letterFlowers.length; fi++) {
      if (this.letterFlowers[fi]._letter === letter) return;
    }

    var W = this.app.screen.width;
    var H = this.app.screen.height;
    var grassLineY = H * 0.60;

    var container = new PIXI.Container();
    container._letter = letter;

    // White circle background
    var bg = new PIXI.Graphics();
    bg.circle(0, 0, 20);
    bg.fill({ color: 0xffffff, alpha: 0.9 });
    bg.stroke({ color: 0xa8d8b0, width: 2 });
    container.addChild(bg);

    // Stem
    var stem = new PIXI.Graphics();
    stem.rect(-1.5, 0, 3, 18);
    stem.fill({ color: 0x68a870 });
    container.addChild(stem);

    // Letter text
    var style = new PIXI.TextStyle({
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#3a3028',
    });
    var txt = new PIXI.Text({ text: letter, style: style });
    txt.anchor.set(0.5, 0.5);
    container.addChild(txt);

    // Random position in grass area
    var px = W * 0.08 + Math.random() * W * 0.84;
    var py = grassLineY - 30 - Math.random() * H * 0.08;
    container.x = px;
    container.y = py;
    container._baseY = py;

    // Pointer interaction: tap to hear the letter sound
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', function() {
      var letterData = typeof LETTERS !== 'undefined' ? LETTERS[letter] : null;
      var sound = letterData ? letterData.sound : letter;
      if (typeof speakText === 'function') speakText(sound);
      // Small bounce
      container._bumpTimer = 12;
    });

    this.app.stage.addChild(container);
    this.letterFlowers.push(container);
  },

  syncLetterFlowers: function(knownLetters) {
    if (!knownLetters) return;
    for (var i = 0; i < knownLetters.length; i++) {
      this.addLetterFlower(knownLetters[i]);
    }
  },

  animate: function() {
    var self = this;
    self._frame++;
    var W = self.app.screen.width;

    // Drift clouds right, wrap around
    for (var i = 0; i < self.clouds.length; i++) {
      var c = self.clouds[i];
      c.x += c.speed;
      if (c.x - c.rx > W) {
        c.x = -c.rx;
      }
    }
    self._drawClouds();

    // Bob letter flowers up and down
    for (var fi = 0; fi < self.letterFlowers.length; fi++) {
      var flower = self.letterFlowers[fi];
      var bob = Math.sin(self._frame * 0.04 + fi * 1.2) * 4;
      if (flower._bumpTimer && flower._bumpTimer > 0) {
        flower._bumpTimer--;
        bob += Math.sin(flower._bumpTimer / 12 * Math.PI) * -8;
      }
      flower.y = flower._baseY + bob;
    }

    // Twinkle stars at night: subtle alpha oscillation on the starsGfx
    if (self._starsGfx && self._starsGfx.children && self._starsGfx.children.length === 0) {
      // stars are drawn directly on the graphics, vary overall alpha
      self._starsGfx.alpha = 0.7 + 0.3 * Math.abs(Math.sin(self._frame * 0.025));
    }

    // Update time of day every ~5 minutes (18000 frames at 60fps)
    if (self._frame % 18000 === 0) {
      self.updateTimeOfDay();
    }
  },

  resize: function() {
    this._buildClouds();
    this.updateTimeOfDay();
    // Reposition existing letter flowers
    var W = this.app.screen.width;
    var H = this.app.screen.height;
    var grassLineY = H * 0.60;
    for (var fi = 0; fi < this.letterFlowers.length; fi++) {
      var flower = this.letterFlowers[fi];
      var px = W * 0.08 + Math.random() * W * 0.84;
      var py = grassLineY - 30 - Math.random() * H * 0.08;
      flower.x = px;
      flower.y = py;
      flower._baseY = py;
    }
  },
};

// Color channel linear interpolation helper
function _lerpChannel(a, b, t) {
  return a + (b - a) * t;
}
