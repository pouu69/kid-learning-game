// js/activities/letter-hunt.js
// Stage 1-2: Letter learning with VAK loop (see/hear/trace/hunt)
// Replaces LetterActivity for new content; LetterActivity still used for reviews
// Globals: CURRICULUM, LETTERS, Learning, speakText, playSound

var LetterHuntActivity = {
  _phase: 'intro',  // intro → trace → hunt → complete
  _guideTimer: null,
  _target: null,
  _canvasListeners: null,
  _timers: [],

  start: function(st, target) {
    this._cleanup();
    this._target = target;
    this._phase = 'intro';
    this._showIntro(st, target);
  },

  _cleanup: function() {
    if (this._guideTimer) {
      clearTimeout(this._guideTimer);
      this._guideTimer = null;
    }
    for (var i = 0; i < this._timers.length; i++) {
      clearTimeout(this._timers[i]);
    }
    this._timers = [];
    // Remove canvas pointer listeners
    if (this._canvasListeners) {
      var cl = this._canvasListeners;
      cl.canvas.removeEventListener('pointerdown', cl.onStart);
      cl.canvas.removeEventListener('pointermove', cl.onMove);
      cl.canvas.removeEventListener('pointerup', cl.onEnd);
      cl.canvas.removeEventListener('pointerleave', cl.onEnd);
      this._canvasListeners = null;
    }
    this._phase = 'intro';
  },

  _setTimeout: function(fn, ms) {
    var id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  },

  // Phase 1: Letter intro — show letter + associated word + sound
  _showIntro: function(st, target) {
    var self = this;
    var letter = target.data.letter;
    var letterInfo = LETTERS[letter];
    var consonantData = target.data;

    var container = document.createElement('div');
    container.className = 'letter-hunt-activity';

    // Phase label
    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = target.review ? '복습해보자!' : '새 글자를 배워보자!';
    if (target.review) {
      var badge = document.createElement('span');
      badge.className = 'review-badge';
      badge.textContent = '복습';
      label.appendChild(badge);
    }
    container.appendChild(label);

    // Big letter with tap-to-hear
    var bigLetter = document.createElement('div');
    bigLetter.className = 'letter-big';
    bigLetter.textContent = letter;
    bigLetter.onclick = function() { speakText(consonantData.sound, 0.7); };
    container.appendChild(bigLetter);

    // Letter name
    var nameLabel = document.createElement('div');
    nameLabel.className = 'letter-name-label';
    nameLabel.textContent = letterInfo ? letterInfo.name : '';
    container.appendChild(nameLabel);

    // Combined syllable display (e.g., ㄱ → 가)
    if (consonantData.combinedSyllable) {
      var syllableRow = document.createElement('div');
      syllableRow.className = 'letter-hunt-syllable';
      syllableRow.textContent = letter + ' + ㅏ = ' + consonantData.combinedSyllable;
      container.appendChild(syllableRow);
    }

    // Associated word hint
    if (consonantData.associatedWord) {
      var wordHint = document.createElement('div');
      wordHint.className = 'letter-hunt-word-hint';
      wordHint.textContent = consonantData.associatedWord;
      container.appendChild(wordHint);
    }

    // Sound button
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big sound-btn-wave';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() {
      soundBtn.classList.remove('sound-btn-press');
      void soundBtn.offsetWidth;
      soundBtn.classList.add('sound-btn-press');
      speakText(consonantData.sound, 0.7);
    };
    container.appendChild(soundBtn);

    // Next button (appears after delay, guarded by phase)
    this._guideTimer = setTimeout(function() {
      self._guideTimer = null;
      if (self._phase !== 'intro') return;
      var nextBtn = document.createElement('button');
      nextBtn.className = 'trace-check-btn';
      nextBtn.textContent = '따라 써보기';
      nextBtn.style.animation = 'popIn 0.3s ease';
      nextBtn.onclick = function() {
        self._phase = 'trace';
        self._showTrace(st, target);
      };
      container.appendChild(nextBtn);
    }, 1500);

    Learning.openPopup(container);
    this._setTimeout(function() { speakText(consonantData.sound, 0.7); }, 500);
  },

  // Phase 2: Trace the letter
  _showTrace: function(st, target) {
    var self = this;
    var letter = target.data.letter;
    var letterInfo = LETTERS[letter];
    if (!letterInfo || !letterInfo.strokes) {
      // No stroke data, skip to hunt
      this._phase = 'hunt';
      this._showHunt(st, target);
      return;
    }

    var container = document.createElement('div');
    container.className = 'letter-hunt-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '손가락으로 따라 써봐!';
    container.appendChild(label);

    // Tracing canvas
    var canvasSize = 200;
    var canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    canvas.className = 'trace-canvas';
    container.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var isDrawing = false;
    var strokeCount = 0;
    var requiredStrokes = letterInfo.strokes.length;

    // Draw ghost guide
    this._drawGuide(ctx, letterInfo, canvasSize);

    // Touch/pointer handlers with cached rect for perf
    var cachedRect = null;
    var onStart = function(e) {
      e.preventDefault();
      isDrawing = true;
      cachedRect = canvas.getBoundingClientRect();
      ctx.beginPath();
      var pos = self._getCanvasPosFromRect(e, canvas, cachedRect);
      ctx.moveTo(pos.x, pos.y);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#f8d848';
    };
    var onMove = function(e) {
      if (!isDrawing) return;
      e.preventDefault();
      var pos = self._getCanvasPosFromRect(e, canvas, cachedRect);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };
    var onEnd = function() {
      if (!isDrawing) return;
      isDrawing = false;
      strokeCount++;
      if (strokeCount >= requiredStrokes) {
        self._onTraceComplete(st, target, container);
      }
    };

    canvas.addEventListener('pointerdown', onStart);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
    canvas.addEventListener('pointerleave', onEnd);

    // Store references for cleanup
    this._canvasListeners = { canvas: canvas, onStart: onStart, onMove: onMove, onEnd: onEnd };

    Learning.openPopup(container);
  },

  _drawGuide: function(ctx, letterInfo, size) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    var scale = size / 100;

    for (var i = 0; i < letterInfo.strokes.length; i++) {
      var stroke = letterInfo.strokes[i];
      if (stroke[0] && stroke[0].circle) {
        var pt = stroke[0];
        ctx.beginPath();
        ctx.arc(pt.cx * scale, pt.cy * scale, pt.r * scale, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke[0].x * scale, stroke[0].y * scale);
        for (var j = 1; j < stroke.length; j++) {
          ctx.lineTo(stroke[j].x * scale, stroke[j].y * scale);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  _getCanvasPosFromRect: function(e, canvas, rect) {
    var clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    var clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  },

  _onTraceComplete: function(st, target, container) {
    var self = this;
    // Flash effect on canvas
    var canvas = container.querySelector('canvas');
    if (canvas) {
      canvas.style.boxShadow = '0 0 20px var(--gold)';
    }
    playSound('correct');
    speakText(target.data.combinedSyllable || target.data.sound, 0.7);

    this._setTimeout(function() {
      self._phase = 'hunt';
      self._showHunt(st, target);
    }, 800);
  },

  // Phase 3: Letter hunt — find the correct letter among distractors
  _showHunt: function(st, target) {
    var self = this;
    var correctLetter = target.data.letter;
    var isConsonant = target.type === 'consonant';

    var container = document.createElement('div');
    container.className = 'letter-hunt-activity';

    var label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = '어떤 글자일까?';
    container.appendChild(label);

    // Play the sound to identify
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big sound-btn-wave';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() { speakText(target.data.sound, 0.7); };
    container.appendChild(soundBtn);

    // Build 3 choices (correct + 2 distractors)
    var pool = isConsonant ? CURRICULUM.consonants : CURRICULUM.vowels;
    var choices = this._buildHuntChoices(correctLetter, pool);

    var choiceContainer = document.createElement('div');
    choiceContainer.className = 'letter-hunt-choices';

    // Event delegation
    choiceContainer.onclick = function(e) {
      var btn = e.target.closest('.letter-hunt-choice');
      if (!btn || btn.classList.contains('choice-locked')) return;

      var selected = btn.getAttribute('data-letter');
      self._handleHuntChoice(st, target, selected, choiceContainer);
    };

    for (var i = 0; i < choices.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'letter-hunt-choice';
      btn.setAttribute('data-letter', choices[i]);
      btn.textContent = choices[i];
      choiceContainer.appendChild(btn);
    }
    container.appendChild(choiceContainer);

    Learning.openPopup(container);
    this._setTimeout(function() { speakText(target.data.sound, 0.7); }, 500);
  },

  _buildHuntChoices: function(correct, pool) {
    var distractors = [];
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].letter !== correct) {
        distractors.push(pool[i].letter);
      }
    }
    // Shuffle and pick 2
    for (var j = distractors.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var temp = distractors[j];
      distractors[j] = distractors[k];
      distractors[k] = temp;
    }
    var selected = distractors.slice(0, 2);
    selected.push(correct);

    // Shuffle final choices
    for (var m = selected.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var t = selected[m];
      selected[m] = selected[n];
      selected[n] = t;
    }
    return selected;
  },

  _handleHuntChoice: function(st, target, selected, choiceContainer) {
    var correct = target.data.letter;
    var buttons = choiceContainer.querySelectorAll('.letter-hunt-choice');

    // Lock all
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.add('choice-locked');
    }

    if (selected === correct) {
      // Highlight correct
      for (var j = 0; j < buttons.length; j++) {
        if (buttons[j].getAttribute('data-letter') === correct) {
          buttons[j].classList.add('choice-correct');
        }
      }
      playSound('correct');

      var self = this;
      this._setTimeout(function() {
        self._cleanup();
        self._phase = 'complete';
        Learning.onLetterComplete(st, target);
      }, 800);
    } else {
      // Wrong — highlight wrong, then unlock after delay
      for (var k = 0; k < buttons.length; k++) {
        if (buttons[k].getAttribute('data-letter') === selected) {
          buttons[k].classList.add('choice-wrong');
        }
      }

      this._setTimeout(function() {
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].classList.remove('choice-locked', 'choice-wrong');
        }
        speakText(target.data.sound, 0.7);
      }, 800);
    }
  }
};
