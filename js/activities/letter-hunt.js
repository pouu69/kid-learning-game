// js/activities/letter-hunt.js
// Stage 1-2: Letter learning with VAK loop (see/hear/trace/hunt)
// Replaces LetterActivity for new content; LetterActivity still used for reviews
// Globals: CURRICULUM, LETTERS, Learning, speakText, playSound
// Shared: shuffleArray, buildChoices, createSoundButton, handleChoiceResult, applyTimerMixin

var LetterHuntActivity = {
  _phase: 'intro',  // intro -> trace -> hunt -> complete
  _guideTimer: null,
  _target: null,
  _canvasListeners: null,

  start: function(st, target) {
    this._cleanup();
    this._target = target;
    this._phase = 'intro';
    this._showIntro(st, target);
  },

  // Override _cleanup after mixin to preserve canvas cleanup
  _cleanupExtra: function() {
    if (this._guideTimer) {
      clearTimeout(this._guideTimer);
      this._guideTimer = null;
    }
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

  // Phase 1: Letter intro — show letter + associated word + sound
  _showIntro: function(st, target) {
    var self = this;
    var letter = target.data.letter;
    var letterInfo = LETTERS[letter];
    var consonantData = target.data;

    var container = document.createElement('div');
    container.className = 'letter-hunt-activity';

    // Phase label with voice
    var label = document.createElement('div');
    label.className = 'phase-label';
    var labelText = target.review ? '복습해보자!' : '새 글자를 배워보자!';
    label.textContent = labelText;
    speakText(labelText, 0.7);
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

    // Combined syllable display (e.g., ㄱ -> 가)
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
    var soundBtn = createSoundButton(function() {
      soundBtn.classList.remove('sound-btn-press');
      void soundBtn.offsetWidth;
      soundBtn.classList.add('sound-btn-press');
      speakText(consonantData.sound, 0.7);
    });
    container.appendChild(soundBtn);

    // Next button (appears after delay, guarded by phase) — icon+voice UX
    this._guideTimer = setTimeout(function() {
      self._guideTimer = null;
      if (self._phase !== 'intro') return;
      var nextBtn = document.createElement('button');
      nextBtn.className = 'trace-check-btn';
      nextBtn.innerHTML = '<span style="font-size:1.5em">\u270F</span><br><span style="font-size:0.75em">\uB530\uB77C \uC368\uBCF4\uAE30</span>';
      nextBtn.style.animation = 'popIn 0.3s ease';
      nextBtn.onclick = function() {
        self._phase = 'trace';
        self._showTrace(st, target);
      };
      speakText('따라 써보기', 0.7);
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
    speakText('손가락으로 따라 써봐!', 0.7);
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
    speakText('어떤 글자일까?', 0.7);
    container.appendChild(label);

    // Play the sound to identify
    var soundBtn = createSoundButton(function() {
      speakText(target.data.sound, 0.7);
    });
    container.appendChild(soundBtn);

    // Build 3 choices using shared utility
    var pool = isConsonant ? CURRICULUM.consonants : CURRICULUM.vowels;
    var letterPool = [];
    for (var p = 0; p < pool.length; p++) {
      letterPool.push(pool[p].letter);
    }
    var choices = buildChoices(correctLetter, letterPool, 2);

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

  _handleHuntChoice: function(st, target, selected, choiceContainer) {
    var correct = target.data.letter;
    var buttons = choiceContainer.querySelectorAll('.letter-hunt-choice');
    var self = this;

    handleChoiceResult(
      this, buttons, 'data-letter', selected, correct,
      function() {
        self._cleanup();
        self._phase = 'complete';
        Learning.onLetterComplete(st, target);
      },
      function() {
        speakText(target.data.sound, 0.7);
      }
    );
  }
};

applyTimerMixin(LetterHuntActivity);

// Override _cleanup to add canvas-specific teardown
(function() {
  var mixinCleanup = LetterHuntActivity._cleanup;
  LetterHuntActivity._cleanup = function() {
    mixinCleanup.call(this);
    this._cleanupExtra();
  };
})();
