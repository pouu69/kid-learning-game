// js/minigames/letter-rain.js
// 글자비 미니게임: 배운 글자는 탭, 안 배운 글자는 피하기
// Depends: PIXI (global), CURRICULUM, playSound, speakText

var LetterRainGame = {
  _app: null,
  _container: null,
  _letters: [],
  _score: 0,
  _combo: 0,
  _timer: null,
  _duration: 15000,
  _spawnInterval: null,
  _tickInterval: null,
  _onComplete: null,
  _knownSet: null,
  _knownLetters: null,
  _allLetters: null,
  _overlay: null,

  start: function(st, onComplete) {
    this._cleanup();
    this._score = 0;
    this._combo = 0;
    this._onComplete = onComplete;

    // 배운 글자 세트 구성
    var known = (st.learning.knownConsonants || []).concat(st.learning.knownVowels || []);
    this._knownSet = {};
    for (var i = 0; i < known.length; i++) {
      this._knownSet[known[i]] = true;
    }

    if (known.length < 2) {
      if (onComplete) onComplete(0);
      return;
    }

    var allLetters = [];
    for (var c = 0; c < CURRICULUM.consonants.length; c++) {
      allLetters.push(CURRICULUM.consonants[c].letter);
    }
    for (var v = 0; v < CURRICULUM.vowels.length; v++) {
      allLetters.push(CURRICULUM.vowels[v].letter);
    }
    this._allLetters = allLetters;
    this._knownLetters = known;

    this._createOverlay();
    this._createGame();
  },

  _createOverlay: function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:300;background:rgba(26,24,48,0.92);';
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // HUD
    var hud = document.createElement('div');
    hud.style.cssText = 'position:absolute;top:10px;left:0;width:100%;z-index:310;display:flex;justify-content:space-between;padding:0 20px;box-sizing:border-box;font-family:"DungGeunMo",monospace;color:#f8d848;font-size:1.2rem;pointer-events:none;';
    hud.innerHTML = '<span id="lr-score">0</span><span id="lr-timer">15</span>';
    overlay.appendChild(hud);

    // Canvas container
    var wrap = document.createElement('div');
    wrap.id = 'letter-rain-canvas';
    wrap.style.cssText = 'position:absolute;top:44px;left:0;width:100%;height:calc(100% - 44px);';
    overlay.appendChild(wrap);
  },

  _createGame: function() {
    var wrap = document.getElementById('letter-rain-canvas');
    if (!wrap) return;
    var w = wrap.clientWidth || window.innerWidth;
    var h = wrap.clientHeight || (window.innerHeight - 44);

    var app = new PIXI.Application();
    var self = this;
    app.init({ width: w, height: h, backgroundAlpha: 0 }).then(function() {
      wrap.appendChild(app.canvas);
      self._app = app;
      self._container = new PIXI.Container();
      app.stage.addChild(self._container);
      self._startLoop();
    });
  },

  _startLoop: function() {
    var self = this;
    var elapsed = 0;

    this._spawnInterval = setInterval(function() {
      self._spawnLetter();
    }, 800);

    this._tickInterval = setInterval(function() {
      self._tick();
    }, 33);

    var timerEl = document.getElementById('lr-timer');
    this._timer = setInterval(function() {
      elapsed += 1000;
      var remaining = Math.max(0, Math.ceil((self._duration - elapsed) / 1000));
      if (timerEl) timerEl.textContent = remaining;
      if (elapsed >= self._duration) {
        self._end();
      }
    }, 1000);

    // 시작 안내
    speakText('글자를 잡아!', 0.8);
  },

  _spawnLetter: function() {
    if (!this._app || !this._container) return;
    var w = this._app.screen.width;

    // 70% 배운 글자, 30% 안 배운 글자
    var isKnown = Math.random() < 0.7;
    var letter;
    if (isKnown && this._knownLetters.length > 0) {
      letter = this._knownLetters[Math.floor(Math.random() * this._knownLetters.length)];
    } else {
      letter = this._allLetters[Math.floor(Math.random() * this._allLetters.length)];
    }

    var known = !!this._knownSet[letter];
    var fontSize = 36;
    var text = new PIXI.Text({ text: letter, style: {
      fontFamily: '"DungGeunMo", monospace',
      fontSize: fontSize,
      fill: known ? 0x48a868 : 0xf08080,
      fontWeight: 'bold'
    }});
    text.x = 20 + Math.random() * (w - 60);
    text.y = -fontSize;
    text.interactive = true;
    text.cursor = 'pointer';

    var self = this;
    text.on('pointerdown', function() {
      self._onTap(this, letter, known);
    });

    text._speed = 1.2 + Math.random() * 0.8;
    text._letter = letter;
    text._known = known;

    this._container.addChild(text);
    this._letters.push(text);
  },

  _tick: function() {
    if (!this._app) return;
    var h = this._app.screen.height;
    for (var i = this._letters.length - 1; i >= 0; i--) {
      var t = this._letters[i];
      t.y += t._speed;
      if (t.y > h + 40) {
        this._container.removeChild(t);
        t.destroy();
        this._letters.splice(i, 1);
        if (t._known) this._combo = 0;
      }
    }
  },

  _onTap: function(textObj, letter, known) {
    if (known) {
      this._score += 10 + this._combo * 5;
      this._combo++;
      playSound('correct');
      if (this._combo >= 3) {
        this._score += 15;
        speakText('잘한다!', 0.8);
        this._combo = 0;
      }
    } else {
      this._combo = 0;
      var pool = CURRICULUM.consonants.concat(CURRICULUM.vowels);
      for (var p = 0; p < pool.length; p++) {
        if (pool[p].letter === letter) {
          speakText(pool[p].sound.split('.')[0], 0.7);
          break;
        }
      }
    }

    var scoreEl = document.getElementById('lr-score');
    if (scoreEl) scoreEl.textContent = this._score;

    // 글자 제거
    var idx = this._letters.indexOf(textObj);
    if (idx !== -1) this._letters.splice(idx, 1);
    if (this._container && textObj.parent) this._container.removeChild(textObj);
    textObj.destroy();
  },

  _end: function() {
    var score = this._score;
    var cb = this._onComplete;
    this._onComplete = null;
    this._cleanup();
    var stars = Math.min(5, Math.floor(score / 30));
    if (cb) cb(stars);
  },

  _cleanup: function() {
    if (this._spawnInterval) { clearInterval(this._spawnInterval); this._spawnInterval = null; }
    if (this._tickInterval) { clearInterval(this._tickInterval); this._tickInterval = null; }
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    for (var i = 0; i < this._letters.length; i++) {
      if (this._letters[i] && this._letters[i].destroy) this._letters[i].destroy();
    }
    this._letters = [];
    if (this._container) { this._container.destroy({ children: true }); this._container = null; }
    if (this._app) {
      this._app.destroy(true, { children: true });
      this._app = null;
    }
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }
  }
};
