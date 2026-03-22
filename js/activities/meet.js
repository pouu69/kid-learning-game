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

  // Phase 1: Show the letter big + play sound + pet reacts
  _showLetter: function(st, target) {
    var self = this;
    var letter = target.data.letter;

    var container = document.createElement('div');
    container.className = 'letter-activity';

    // Big letter display
    var bigLetter = document.createElement('div');
    bigLetter.className = 'letter-big';
    bigLetter.textContent = letter;
    container.appendChild(bigLetter);

    // Sound button (speaker icon, no text)
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn';
    soundBtn.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() { speakText(target.data.sound, 0.7); };
    container.appendChild(soundBtn);

    // "Next" button (arrow icon, no text) — appears after 2 seconds
    setTimeout(function() {
      var nextBtn = document.createElement('button');
      nextBtn.className = 'guide-next-btn';
      nextBtn.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
      nextBtn.onclick = function() {
        self._traceLetter(st, target);
      };
      container.appendChild(nextBtn);
      // Finger guide pointing to next button
      self._showFingerGuide(nextBtn);
    }, 2000);

    Learning.openPopup(container);

    // Auto play sound
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
    canvas.width = 300;
    canvas.height = 300;
    canvasWrap.appendChild(canvas);
    container.appendChild(canvasWrap);

    Learning.openPopup(container);

    var ctx = canvas.getContext('2d');
    var scale = 3;

    // Draw dotted guide
    function drawGuide() {
      ctx.clearRect(0, 0, 300, 300);
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#c8c0b0';
      ctx.lineWidth = 4;
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
      }
      ctx.setLineDash([]);
    }
    drawGuide();

    // Animated stroke order guide (arrow along path)
    self._animateStrokeGuide(canvas, letterData, scale);

    // Generate checkpoints
    var checkpoints = [];
    for (var s = 0; s < letterData.strokes.length; s++) {
      var pts = self._generateCheckpoints(letterData.strokes[s], 10, scale);
      for (var cp = 0; cp < pts.length; cp++) {
        checkpoints.push({ x: pts[cp].x, y: pts[cp].y, hit: false });
      }
    }

    var isDrawing = false;
    var hitRadius = 300 * 0.15;

    function onStart(e) {
      e.preventDefault();
      isDrawing = true;
      ctx.strokeStyle = '#3a3028';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      var rect = canvas.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      x = x * (canvas.width / rect.width);
      y = y * (canvas.height / rect.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function onMove(e) {
      if (!isDrawing) return;
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      x = x * (canvas.width / rect.width);
      y = y * (canvas.height / rect.height);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
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

    function onEnd() {
      if (!isDrawing) return;
      isDrawing = false;
      var hitCount = 0;
      for (var i = 0; i < checkpoints.length; i++) {
        if (checkpoints[i].hit) hitCount++;
      }
      var coverage = checkpoints.length > 0 ? hitCount / checkpoints.length : 1;
      if (coverage >= 0.7) {
        playSound('correct');
        speakText(target.data.sound, 0.7);
        setTimeout(function() { self._distinguishLetter(st, target); }, 1000);
      } else {
        // Show finger guide again
        speakText('다시 해볼까', 0.7);
        setTimeout(function() {
          drawGuide();
          for (var i = 0; i < checkpoints.length; i++) checkpoints[i].hit = false;
          self._animateStrokeGuide(canvas, letterData, scale);
        }, 800);
      }
    }

    canvas.addEventListener('pointerdown', onStart);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
    canvas.addEventListener('pointerleave', onEnd);

    // Voice guide
    setTimeout(function() { speakText('따라 그려봐', 0.7); }, 500);

    // Auto re-guide after 10 seconds
    self._guideTimeout = setTimeout(function() {
      self._animateStrokeGuide(canvas, letterData, scale);
      speakText('따라 그려봐', 0.7);
    }, 10000);
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

    // Sound button at top — plays the target letter sound
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big';
    soundBtn.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
    soundBtn.onclick = function() { speakText(target.data.sound, 0.7); };
    container.appendChild(soundBtn);

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
            el.classList.add('choice-wrong');
            wrongCount++;
            if (wrongCount >= 3) {
              // Highlight correct answer
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

  // Utility: animate stroke order on canvas
  _animateStrokeGuide: function(canvas, letterData, scale) {
    var ctx = canvas.getContext('2d');
    // Draw arrow along first stroke
    if (!letterData.strokes || letterData.strokes.length === 0) return;
    var stroke = letterData.strokes[0];
    if (stroke[0] && stroke[0].circle) return; // skip circle animation for now
    if (stroke.length < 2) return;

    var startX = stroke[0].x * scale;
    var startY = stroke[0].y * scale;
    var endX = stroke[stroke.length - 1].x * scale;
    var endY = stroke[stroke.length - 1].y * scale;

    // Draw start dot
    ctx.fillStyle = '#f4b870';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(startX, startY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Animate dot moving along path
    var progress = 0;
    function animDot() {
      if (progress > 1) return;
      progress += 0.03;
      var x = startX + (endX - startX) * progress;
      var y = startY + (endY - startY) * progress;
      ctx.fillStyle = '#f4b870';
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      if (progress <= 1) requestAnimationFrame(animDot);
    }
    animDot();
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
