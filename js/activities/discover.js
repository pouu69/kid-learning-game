var DiscoverActivity = {
  start: function(st, wordData) {
    var container = document.getElementById('learningContent');
    container.innerHTML = '';
    var self = this;

    // Update progress dots
    MeetActivity._updateDots(2);

    // Show the whole word first
    var wordEl = document.createElement('div');
    wordEl.className = 'meet-word';
    wordEl.textContent = wordData.word;
    container.appendChild(wordEl);

    var hint = document.createElement('p');
    hint.className = 'meet-hint';
    hint.textContent = '이 글자 안에 뭐가 숨어있을까?';
    container.appendChild(hint);

    // After 1.5s, decompose
    setTimeout(function() {
      self._showDecomposition(container, wordData, st);
    }, 1500);
  },

  _showDecomposition: function(container, wordData, st) {
    container.innerHTML = '';
    MeetActivity._updateDots(2);

    // Decompose all syllables into letters
    var allLetters = [];
    for (var i = 0; i < wordData.syllables.length; i++) {
      var syl = wordData.syllables[i];
      for (var c = 0; c < syl.length; c++) {
        var d = decomposeHangul(syl.charAt(c));
        if (d) {
          for (var k = 0; k < d.length; k++) allLetters.push(d[k]);
        }
      }
    }

    // Show word at top (smaller)
    var wordSmall = document.createElement('div');
    wordSmall.className = 'discover-word-small';
    wordSmall.textContent = wordData.word;
    container.appendChild(wordSmall);

    // Arrow
    var arrow = document.createElement('div');
    arrow.className = 'discover-arrow';
    arrow.textContent = '↓';
    container.appendChild(arrow);

    // Show decomposed letters grid
    var grid = document.createElement('div');
    grid.className = 'discover-grid';
    var known = st.learning.knownLetters;
    var unlearned = wordData.unlearnedLetters || [];

    for (var j = 0; j < allLetters.length; j++) {
      var letterEl = document.createElement('div');
      letterEl.className = 'discover-letter';
      letterEl.textContent = allLetters[j];

      if (unlearned.indexOf(allLetters[j]) !== -1) {
        letterEl.classList.add('discover-unlearned');
        letterEl.title = '나중에 배울 거야~';
      } else if (known.indexOf(allLetters[j]) !== -1) {
        letterEl.classList.add('discover-known');
      } else {
        letterEl.classList.add('discover-new');
      }

      // Tap to hear sound
      (function(letter) {
        letterEl.onclick = function() {
          if (LETTERS[letter]) {
            speakText(LETTERS[letter].sound);
          }
          playSound('click');
        };
      })(allLetters[j]);

      grid.appendChild(letterEl);
    }
    container.appendChild(grid);

    // Speak each letter with delay
    var speakIndex = 0;
    function speakNext() {
      if (speakIndex < allLetters.length) {
        var l = allLetters[speakIndex];
        if (LETTERS[l]) speakText(LETTERS[l].sound);
        speakIndex++;
        setTimeout(speakNext, 800);
      }
    }
    setTimeout(speakNext, 500);

    // Start tracing if there are new letters to trace
    var toTrace = wordData.activities.discover.trace || [];
    if (toTrace.length > 0) {
      var self = this;
      var traceBtn = document.createElement('button');
      traceBtn.className = 'btn-action';
      traceBtn.style.marginTop = '1.5rem';
      traceBtn.textContent = '따라 그려보자!';
      traceBtn.onclick = function() {
        self._startTracing(container, toTrace, 0, st);
      };
      container.appendChild(traceBtn);
    } else {
      // No tracing needed, just complete after viewing
      var completeBtn = document.createElement('button');
      completeBtn.className = 'btn-action';
      completeBtn.style.marginTop = '1.5rem';
      completeBtn.textContent = '다음으로';
      completeBtn.onclick = function() {
        Learning.onPhaseComplete(st);
      };
      container.appendChild(completeBtn);
    }
  },

  _startTracing: function(container, lettersToTrace, index, st) {
    if (index >= lettersToTrace.length) {
      Learning.onPhaseComplete(st);
      return;
    }

    container.innerHTML = '';
    MeetActivity._updateDots(2);
    var letter = lettersToTrace[index];
    var letterData = LETTERS[letter];
    if (!letterData) {
      this._startTracing(container, lettersToTrace, index + 1, st);
      return;
    }

    var self = this;

    // Letter name
    var title = document.createElement('div');
    title.className = 'discover-trace-title';
    title.textContent = letter + ' 따라 그리기';
    container.appendChild(title);

    // Canvas for tracing
    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'trace-canvas-wrap';
    var canvas = document.createElement('canvas');
    canvas.className = 'trace-canvas';
    canvas.width = 300;
    canvas.height = 300;
    canvasWrap.appendChild(canvas);
    container.appendChild(canvasWrap);

    var ctx = canvas.getContext('2d');
    var scale = 3; // 100 coord -> 300 px

    // Draw guide (dotted lines)
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

    // Generate checkpoints for all strokes
    var checkpoints = [];
    for (var s = 0; s < letterData.strokes.length; s++) {
      var stroke = letterData.strokes[s];
      var pts = self._generateCheckpoints(stroke, 10, scale);
      for (var cp = 0; cp < pts.length; cp++) {
        checkpoints.push({ x: pts[cp].x, y: pts[cp].y, hit: false });
      }
    }

    // Drawing state
    var isDrawing = false;
    var path = [];
    var hitRadius = 300 * 0.15;

    function onStart(e) {
      e.preventDefault();
      isDrawing = true;
      path = [];
      var rect = canvas.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      path.push({ x: x, y: y });
      ctx.strokeStyle = '#3a3028';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function onMove(e) {
      if (!isDrawing) return;
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      path.push({ x: x, y: y });
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);

      // Check hits
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

    function onEnd(e) {
      if (!isDrawing) return;
      isDrawing = false;

      // Check coverage
      var hitCount = 0;
      for (var i = 0; i < checkpoints.length; i++) {
        if (checkpoints[i].hit) hitCount++;
      }
      var coverage = checkpoints.length > 0 ? hitCount / checkpoints.length : 1;

      if (coverage >= 0.7) {
        // Success!
        playSound('correct');
        speakText(letterData.sound);

        var successMsg = document.createElement('div');
        successMsg.className = 'trace-success';
        successMsg.textContent = '잘했어!';
        container.appendChild(successMsg);

        setTimeout(function() {
          self._startTracing(container, lettersToTrace, index + 1, st);
        }, 1200);
      } else {
        // Try again
        var retryMsg = document.createElement('div');
        retryMsg.className = 'trace-retry';
        retryMsg.textContent = '한 번 더!';
        container.appendChild(retryMsg);

        setTimeout(function() {
          if (retryMsg.parentNode) retryMsg.parentNode.removeChild(retryMsg);
          drawGuide();
          // Reset checkpoints
          for (var i = 0; i < checkpoints.length; i++) {
            checkpoints[i].hit = false;
          }
        }, 800);
      }
    }

    canvas.addEventListener('pointerdown', onStart);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
    canvas.addEventListener('pointerleave', onEnd);

    // Speak the letter sound
    setTimeout(function() { speakText(letterData.sound); }, 300);
  },

  _generateCheckpoints: function(stroke, count, scale) {
    var points = [];
    if (stroke[0] && stroke[0].circle) {
      // Circle checkpoints
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
        var segIndex = Math.min(Math.floor(t * (stroke.length - 1)), stroke.length - 2);
        var localT = (t * (stroke.length - 1)) - segIndex;
        var x = stroke[segIndex].x + (stroke[segIndex + 1].x - stroke[segIndex].x) * localT;
        var y = stroke[segIndex].y + (stroke[segIndex + 1].y - stroke[segIndex].y) * localT;
        points.push({ x: x * scale, y: y * scale });
      }
    }
    return points;
  }
};
