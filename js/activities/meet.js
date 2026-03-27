// js/activities/meet.js
// LetterActivity — handles consonant AND vowel learning (stages 1 & 2)
// Globals: CURRICULUM, LETTERS, Learning, st, speakText, playSound

var LetterActivity = {
  _guideTimeout: null,
  _phase: 1, // 1=show, 2=trace, 3=distinguish

  start: function(st, target) {
    this._phase = 1;
    this._showLetter(st, target);
  },

  // Phase 1: Show the letter big + name + sound + example
  _showLetter: function(st, target) {
    var self = this;
    var letter = target.data.letter;
    var letterData = LETTERS[letter];

    var container = document.createElement('div');
    container.className = 'letter-activity';

    // Phase label
    var phaseLabel = document.createElement('div');
    phaseLabel.className = 'phase-label';
    phaseLabel.textContent = (target.review) ? '복습해보자!' : '새 글자를 배워보자!';
    container.appendChild(phaseLabel);

    if (target.review) {
      var badge = document.createElement('span');
      badge.className = 'review-badge';
      badge.textContent = '복습';
      phaseLabel.appendChild(badge);
    }

    // Big letter display (tappable to hear sound)
    var bigLetter = document.createElement('div');
    bigLetter.className = 'letter-big';
    bigLetter.textContent = letter;
    bigLetter.onclick = function() { speakText(target.data.sound, 0.7); };
    container.appendChild(bigLetter);

    // Letter name below (e.g. "기역", "니은")
    var nameLabel = document.createElement('div');
    nameLabel.className = 'letter-name-label';
    nameLabel.textContent = letterData ? letterData.name : '';
    container.appendChild(nameLabel);

    // Sound button with text
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big sound-btn-wave';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() {
      soundBtn.classList.remove('sound-btn-press');
      void soundBtn.offsetWidth;
      soundBtn.classList.add('sound-btn-press');
      speakText(target.data.sound, 0.7);
    };
    container.appendChild(soundBtn);

    // "따라 써보기" button — appears after 2 seconds
    setTimeout(function() {
      var nextBtn = document.createElement('button');
      nextBtn.className = 'trace-check-btn';
      nextBtn.textContent = '따라 써보기';
      nextBtn.style.animation = 'popIn 0.3s ease';
      nextBtn.onclick = function() {
        self._traceLetter(st, target);
      };
      container.appendChild(nextBtn);
    }, 2000);

    Learning.openPopup(container);

    // Auto play sound with name
    setTimeout(function() { speakText(target.data.sound, 0.7); }, 500);
  },

  // Phase 2: Trace the letter with finger
  _traceLetter: function(st, target) {
    var self = this;
    var letter = target.data.letter;
    var letterData = LETTERS[letter];
    if (!letterData) { self._distinguishLetter(st, target); return; }

    var container = document.createElement('div');
    container.className = 'letter-activity';

    // Small reference letter at top
    var refLetter = document.createElement('div');
    refLetter.className = 'letter-ref';
    refLetter.textContent = letter;
    container.appendChild(refLetter);

    // Trace canvas
    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'trace-canvas-wrap';
    var canvas = document.createElement('canvas');
    canvas.className = 'trace-canvas';
    canvas.width = 400;
    canvas.height = 400;
    canvasWrap.appendChild(canvas);
    container.appendChild(canvasWrap);

    Learning.openPopup(container);

    var ctx = canvas.getContext('2d');
    var scale = 4;

    // Draw dotted guide
    function drawGuide() {
      ctx.clearRect(0, 0, 400, 400);
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#6a4c9c';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      for (var s = 0; s < letterData.strokes.length; s++) {
        var stroke = letterData.strokes[s];
        if (stroke[0] && stroke[0].circle) {
          ctx.beginPath();
          ctx.arc(stroke[0].cx * scale, stroke[0].cy * scale, stroke[0].r * scale, 0, Math.PI * 2);
          ctx.stroke();
        } else if (stroke.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(stroke[0].x * scale, stroke[0].y * scale);
          for (var p = 1; p < stroke.length; p++) {
            ctx.lineTo(stroke[p].x * scale, stroke[p].y * scale);
          }
          ctx.stroke();
        }
        // Show stroke number at start of each stroke
        ctx.setLineDash([]);
        ctx.fillStyle = '#a888d0';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var numX, numY;
        if (stroke[0] && stroke[0].circle) {
          numX = stroke[0].cx * scale;
          numY = (stroke[0].cy - stroke[0].r) * scale - 12;
        } else {
          numX = stroke[0].x * scale;
          numY = stroke[0].y * scale - 12;
        }
        ctx.fillText((s + 1).toString(), numX, numY);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        ctx.setLineDash([6, 6]);
      }
      ctx.setLineDash([]);
    }
    drawGuide();

    // Animated stroke order guide (arrow along path)
    self._animateStrokeGuide(canvas, letterData, scale);

    // Generate checkpoints (more points + tighter radius = must trace accurately)
    var checkpoints = [];
    for (var s = 0; s < letterData.strokes.length; s++) {
      var pts = self._generateCheckpoints(letterData.strokes[s], 20, scale);
      for (var cp = 0; cp < pts.length; cp++) {
        checkpoints.push({ x: pts[cp].x, y: pts[cp].y, hit: false });
      }
    }

    var isDrawing = false;
    var failCount = 0;
    var hitRadius = 30;

    function onStart(e) {
      e.preventDefault();
      // Stop the animated stroke guide on first touch
      if (self._currentGuideStop) self._currentGuideStop.value = true;
      if (self._guideTimeout) { clearTimeout(self._guideTimeout); self._guideTimeout = null; }
      isDrawing = true;
      ctx.setLineDash([]);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#f8d848';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX || (e.touches && e.touches[0].clientX) || 0) - rect.left;
      var y = (e.clientY || (e.touches && e.touches[0].clientY) || 0) - rect.top;
      x = x * (canvas.width / rect.width);
      y = y * (canvas.height / rect.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Track hits silently (no green dots while drawing)
      _checkHit(x, y);
    }

    function onMove(e) {
      if (!isDrawing) return;
      e.preventDefault();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#f8d848';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX || (e.touches && e.touches[0].clientX) || 0) - rect.left;
      var y = (e.clientY || (e.touches && e.touches[0].clientY) || 0) - rect.top;
      x = x * (canvas.width / rect.width);
      y = y * (canvas.height / rect.height);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      _checkHit(x, y);
    }

    function onEnd() {
      isDrawing = false;
    }

    // Silently track which checkpoints are hit (no visual feedback during drawing)
    function _checkHit(x, y) {
      for (var i = 0; i < checkpoints.length; i++) {
        if (!checkpoints[i].hit) {
          var dx = x - checkpoints[i].x;
          var dy = y - checkpoints[i].y;
          if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
            checkpoints[i].hit = true;
          }
        }
      }
    }

    // Evaluate coverage and show result
    function evaluateTrace() {
      var hitCount = 0;
      for (var i = 0; i < checkpoints.length; i++) {
        if (checkpoints[i].hit) hitCount++;
      }
      var coverage = checkpoints.length > 0 ? hitCount / checkpoints.length : 1;

      if (coverage >= 0.5) {
        // Success — flash canvas green briefly
        canvas.style.borderColor = '#48a868';
        canvas.style.boxShadow = '0 0 16px rgba(72,168,104,0.6)';
        playSound('correct');
        speakText(target.data.sound, 0.7);
        setTimeout(function() { self._distinguishLetter(st, target); }, 1000);
      } else {
        failCount++;
        if (failCount >= 3) {
          // Auto-pass after 3 attempts
          speakText('잘했어! 다음으로 가자~', 0.75);
          setTimeout(function() { self._distinguishLetter(st, target); }, 1200);
        } else {
          // Retry — flash canvas red briefly, then reset
          canvas.style.borderColor = '#f08080';
          canvas.style.boxShadow = '0 0 16px rgba(240,128,128,0.4)';
          speakText('한 번 더 써볼까?', 0.75);
          setTimeout(function() {
            canvas.style.borderColor = '';
            canvas.style.boxShadow = '';
            drawGuide();
            for (var i = 0; i < checkpoints.length; i++) checkpoints[i].hit = false;
            self._animateStrokeGuide(canvas, letterData, scale);
          }, 1000);
        }
      }
    }

    canvas.addEventListener('pointerdown', onStart);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
    canvas.addEventListener('pointerleave', onEnd);

    // Button row: 다시 + 확인
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;width:100%;margin-top:0.5rem;';

    var retryBtn = document.createElement('button');
    retryBtn.className = 'trace-retry-btn';
    retryBtn.innerHTML = '&#8634; 다시';
    retryBtn.onclick = function() {
      drawGuide();
      for (var i = 0; i < checkpoints.length; i++) checkpoints[i].hit = false;
      canvas.style.borderColor = '';
      canvas.style.boxShadow = '';
    };
    btnRow.appendChild(retryBtn);

    var checkBtn = document.createElement('button');
    checkBtn.className = 'trace-check-btn';
    checkBtn.innerHTML = '&#10003; 확인';
    checkBtn.onclick = function() { evaluateTrace(); };
    btnRow.appendChild(checkBtn);

    container.appendChild(btnRow);

    // Voice guide with encouraging message
    setTimeout(function() { speakText('손가락으로 따라 그려봐!', 0.75); }, 500);

    // Auto re-guide after 8 seconds with encouragement
    self._guideTimeout = setTimeout(function() {
      self._animateStrokeGuide(canvas, letterData, scale);
      speakText('천천히 따라 그려봐~', 0.75);
    }, 8000);
  },

  // Phase 3: Distinguish this letter from similar ones
  _distinguishLetter: function(st, target) {
    var self = this;
    var letter = target.data.letter;
    var isConsonant = target.type === 'consonant';

    // Pick 2 distractors from same category
    var pool = isConsonant ? CURRICULUM.consonants : CURRICULUM.vowels;
    var choices = [letter];
    for (var i = 0; i < pool.length && choices.length < 3; i++) {
      if (pool[i].letter !== letter) choices.push(pool[i].letter);
    }
    // Shuffle
    for (var k = choices.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = choices[k]; choices[k] = choices[r]; choices[r] = tmp;
    }

    var container = document.createElement('div');
    container.className = 'letter-activity';

    // Phase label — question
    var phaseLabel = document.createElement('div');
    phaseLabel.className = 'phase-label';
    phaseLabel.textContent = '어떤 글자일까?';
    container.appendChild(phaseLabel);

    // Sound button — plays the target letter sound
    var soundRow = document.createElement('div');
    soundRow.style.cssText = 'display:flex;align-items:center;gap:12px;';
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big sound-btn-wave';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() {
      soundBtn.classList.remove('sound-btn-press');
      void soundBtn.offsetWidth;
      soundBtn.classList.add('sound-btn-press');
      speakText(target.data.sound, 0.7);
    };
    soundRow.appendChild(soundBtn);
    var soundHint = document.createElement('span');
    soundHint.className = 'sound-hint-text';
    soundHint.textContent = '소리를 듣고 골라봐!';
    soundRow.appendChild(soundHint);
    container.appendChild(soundRow);

    // Choice grid
    var grid = document.createElement('div');
    grid.className = 'distinguish-grid';

    var wrongCount = 0;

    for (var j = 0; j < choices.length; j++) {
      var choiceEl = document.createElement('div');
      choiceEl.className = 'distinguish-choice';
      choiceEl.textContent = choices[j];
      choiceEl.dataset.letter = choices[j];

      (function(el, ch) {
        el.onclick = function() {
          if (ch === letter) {
            el.classList.add('choice-correct');
            playSound('correct');
            speakText(target.data.sound, 0.7);
            setTimeout(function() {
              Learning.onLetterComplete(st, target);
            }, 1000);
          } else {
            el.classList.remove('choice-wrong');
            void el.offsetWidth;
            el.classList.add('choice-wrong');
            playSound('wrong');
            wrongCount++;
            if (wrongCount >= 2) {
              // Pulse-hint the correct answer after 2 wrong answers
              var allChoices = grid.querySelectorAll('.distinguish-choice');
              for (var c = 0; c < allChoices.length; c++) {
                if (allChoices[c].dataset.letter === letter) {
                  allChoices[c].classList.add('choice-hint');
                }
              }
            }
            setTimeout(function() {
              el.classList.remove('choice-wrong');
              speakText(target.data.sound, 0.7);
            }, 500);
          }
        };
      })(choiceEl, choices[j]);

      grid.appendChild(choiceEl);
    }
    container.appendChild(grid);

    Learning.openPopup(container);

    // Auto play target sound
    setTimeout(function() { speakText(target.data.sound, 0.7); }, 500);

    // Finger guide on the speaker button
    self._showFingerGuide(soundBtn);
  },

  // Utility: show animated finger pointing at element
  _showFingerGuide: function(targetEl) {
    if (!targetEl) return;
    var finger = document.createElement('div');
    finger.className = 'finger-guide';
    targetEl.style.position = targetEl.style.position || 'relative';
    targetEl.appendChild(finger);
    setTimeout(function() {
      if (finger.parentNode) finger.parentNode.removeChild(finger);
    }, 3000);
  },

  // Utility: animate stroke order on canvas — full multi-stroke demo
  _animateStrokeGuide: function(canvas, letterData, scale) {
    var ctx = canvas.getContext('2d');
    var strokes = letterData.strokes;
    if (!strokes || strokes.length === 0) return;

    var self = this;
    var stopped = { value: false };
    self._currentGuideStop = stopped;

    // Draw each stroke sequentially with delays (no requestAnimationFrame)
    function drawStrokeAtIndex(idx) {
      if (stopped.value || idx >= strokes.length) return;
      var stroke = strokes[idx];
      var num = idx + 1;

      ctx.setLineDash([]);
      ctx.strokeStyle = '#f8d848';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke[0] && stroke[0].circle) {
        var cx = stroke[0].cx * scale;
        var cy = stroke[0].cy * scale;
        var r = stroke[0].r * scale;

        // Number
        ctx.fillStyle = '#f8d848';
        ctx.font = 'bold 18px "DungGeunMo", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), cx, cy - r - 12);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';

        // Draw full circle at once
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Start dot
        ctx.fillStyle = '#f8d848';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(cx + r, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

      } else if (stroke.length >= 2) {
        var startX = stroke[0].x * scale;
        var startY = stroke[0].y * scale;
        var endX = stroke[stroke.length - 1].x * scale;
        var endY = stroke[stroke.length - 1].y * scale;

        // Number at start
        ctx.fillStyle = '#f8d848';
        ctx.font = 'bold 18px "DungGeunMo", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var numOX = startX < 200 ? -16 : 16;
        var numOY = startY < 200 ? -16 : 16;
        ctx.fillText(num.toString(), startX + numOX, startY + numOY);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';

        // Start dot
        ctx.fillStyle = '#f8d848';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(startX, startY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Draw full stroke line at once
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (var p = 1; p < stroke.length; p++) {
          ctx.lineTo(stroke[p].x * scale, stroke[p].y * scale);
        }
        ctx.stroke();

        // End arrow dot
        ctx.fillStyle = '#f8d848';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Draw next stroke after delay
      setTimeout(function() { drawStrokeAtIndex(idx + 1); }, 600);
    }

    // Start after popup has rendered
    setTimeout(function() {
      if (!stopped.value) drawStrokeAtIndex(0);
    }, 500);
  },

  _generateCheckpoints: function(stroke, count, scale) {
    var points = [];
    if (stroke[0] && stroke[0].circle) {
      for (var i = 0; i < count; i++) {
        var angle = (i / count) * Math.PI * 2;
        points.push({
          x: stroke[0].cx * scale + Math.cos(angle) * stroke[0].r * scale,
          y: stroke[0].cy * scale + Math.sin(angle) * stroke[0].r * scale
        });
      }
    } else if (stroke.length >= 2) {
      for (var j = 0; j <= count; j++) {
        var t = j / count;
        var segIdx = Math.min(Math.floor(t * (stroke.length - 1)), stroke.length - 2);
        var localT = (t * (stroke.length - 1)) - segIdx;
        var x = stroke[segIdx].x + (stroke[segIdx + 1].x - stroke[segIdx].x) * localT;
        var y = stroke[segIdx].y + (stroke[segIdx + 1].y - stroke[segIdx].y) * localT;
        points.push({ x: x * scale, y: y * scale });
      }
    }
    return points;
  }
};
