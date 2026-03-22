var PlayActivity = {
  start: function(st, wordData) {
    var activities = wordData.activities.play;
    if (!activities || activities.length === 0) {
      Learning.onPhaseComplete(st);
      return;
    }

    MeetActivity._updateDots(3);

    // Pick the first available activity
    var activity = activities[0];
    var container = document.getElementById('learningContent');
    container.innerHTML = '';

    if (activity.type === 'puzzle') {
      this._startPuzzle(container, activity, wordData, st);
    } else if (activity.type === 'coloring') {
      this._startColoring(container, activity, wordData, st);
    } else if (activity.type === 'soundMatch') {
      this._startSoundMatch(container, activity, wordData, st);
    }
  },

  _startPuzzle: function(container, activity, wordData, st) {
    var title = document.createElement('div');
    title.className = 'play-title';
    title.textContent = wordData.word + ' 만들기!';
    container.appendChild(title);

    var hint = document.createElement('p');
    hint.className = 'meet-hint';
    hint.textContent = '글자 조각을 끌어서 맞춰봐!';
    container.appendChild(hint);

    var pieces = activity.pieces;
    var known = st.learning.knownLetters;
    var unlearned = wordData.unlearnedLetters || [];

    // Target area
    var targetArea = document.createElement('div');
    targetArea.className = 'puzzle-target-area';
    var slots = [];
    for (var i = 0; i < pieces.length; i++) {
      var slot = document.createElement('div');
      slot.className = 'puzzle-slot';
      slot.dataset.index = i;
      slot.dataset.letter = pieces[i];

      // Pre-place unlearned letters
      if (unlearned.indexOf(pieces[i]) !== -1) {
        slot.textContent = pieces[i];
        slot.classList.add('puzzle-slot-filled');
        slot.classList.add('puzzle-slot-unlearned');
      }

      slots.push(slot);
      targetArea.appendChild(slot);
    }
    container.appendChild(targetArea);

    // Draggable pieces (shuffled)
    var pieceArea = document.createElement('div');
    pieceArea.className = 'puzzle-piece-area';

    var draggablePieces = [];
    for (var j = 0; j < pieces.length; j++) {
      if (unlearned.indexOf(pieces[j]) !== -1) continue; // skip pre-placed
      draggablePieces.push({ letter: pieces[j], index: j });
    }

    // Shuffle
    for (var k = draggablePieces.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = draggablePieces[k];
      draggablePieces[k] = draggablePieces[r];
      draggablePieces[r] = tmp;
    }

    var placedCount = pieces.length - draggablePieces.length; // pre-placed count

    for (var m = 0; m < draggablePieces.length; m++) {
      var piece = document.createElement('div');
      piece.className = 'puzzle-piece';
      piece.textContent = draggablePieces[m].letter;
      piece.dataset.letter = draggablePieces[m].letter;
      piece.dataset.originalIndex = draggablePieces[m].index;

      // Touch drag
      (function(pieceEl) {
        var startX, startY, origLeft, origTop;
        var isDragging = false;

        pieceEl.addEventListener('pointerdown', function(e) {
          e.preventDefault();
          isDragging = true;
          var rect = pieceEl.getBoundingClientRect();
          startX = e.clientX;
          startY = e.clientY;
          origLeft = rect.left;
          origTop = rect.top;
          pieceEl.style.position = 'fixed';
          pieceEl.style.left = origLeft + 'px';
          pieceEl.style.top = origTop + 'px';
          pieceEl.style.zIndex = '100';
          pieceEl.classList.add('puzzle-piece-dragging');
        });

        document.addEventListener('pointermove', function(e) {
          if (!isDragging) return;
          e.preventDefault();
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          pieceEl.style.left = (origLeft + dx) + 'px';
          pieceEl.style.top = (origTop + dy) + 'px';
        });

        document.addEventListener('pointerup', function(e) {
          if (!isDragging) return;
          isDragging = false;
          pieceEl.classList.remove('puzzle-piece-dragging');

          // Check if near any matching empty slot
          var pieceRect = pieceEl.getBoundingClientRect();
          var pieceCx = pieceRect.left + pieceRect.width / 2;
          var pieceCy = pieceRect.top + pieceRect.height / 2;
          var snapped = false;

          for (var s = 0; s < slots.length; s++) {
            if (slots[s].classList.contains('puzzle-slot-filled')) continue;
            if (slots[s].dataset.letter !== pieceEl.dataset.letter) continue;

            var slotRect = slots[s].getBoundingClientRect();
            var slotCx = slotRect.left + slotRect.width / 2;
            var slotCy = slotRect.top + slotRect.height / 2;
            var dist = Math.sqrt((pieceCx - slotCx) * (pieceCx - slotCx) + (pieceCy - slotCy) * (pieceCy - slotCy));

            if (dist < 60) {
              // Snap!
              slots[s].textContent = pieceEl.dataset.letter;
              slots[s].classList.add('puzzle-slot-filled');
              pieceEl.style.display = 'none';
              playSound('correct');
              if (LETTERS[pieceEl.dataset.letter]) {
                speakText(LETTERS[pieceEl.dataset.letter].sound);
              }
              placedCount++;
              snapped = true;

              // Check completion
              if (placedCount >= pieces.length) {
                setTimeout(function() {
                  speakText(wordData.word);
                  playSound('correct');
                  setTimeout(function() {
                    Learning.onPhaseComplete(st);
                  }, 1000);
                }, 500);
              }
              break;
            }
          }

          if (!snapped) {
            // Return to original position
            pieceEl.style.position = '';
            pieceEl.style.left = '';
            pieceEl.style.top = '';
            pieceEl.style.zIndex = '';
          }
        });
      })(piece);

      pieceArea.appendChild(piece);
    }
    container.appendChild(pieceArea);

    // Speak the word
    setTimeout(function() { speakText(wordData.word); }, 500);
  },

  _startColoring: function(container, activity, wordData, st) {
    var letter = activity.letter;
    var letterData = LETTERS[letter];
    if (!letterData) {
      Learning.onPhaseComplete(st);
      return;
    }

    var title = document.createElement('div');
    title.className = 'play-title';
    title.textContent = letter + ' 색칠하기!';
    container.appendChild(title);

    var canvasWrap = document.createElement('div');
    canvasWrap.className = 'coloring-canvas-wrap';
    var canvas = document.createElement('canvas');
    canvas.className = 'coloring-canvas';
    canvas.width = 300;
    canvas.height = 300;
    canvasWrap.appendChild(canvas);
    container.appendChild(canvasWrap);

    var ctx = canvas.getContext('2d');
    var scale = 3;

    // Draw letter outline
    ctx.strokeStyle = '#e0d8c8';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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

    // Coloring state
    var totalArea = 0;
    var filledPixels = new Set();
    var gridSize = 10;

    // Calculate total area (approximate by checking guide line pixels)
    var imageData = ctx.getImageData(0, 0, 300, 300);
    for (var y = 0; y < 300; y += gridSize) {
      for (var x = 0; x < 300; x += gridSize) {
        var idx = (y * 300 + x) * 4;
        if (imageData.data[idx + 3] > 50) totalArea++;
      }
    }
    if (totalArea === 0) totalArea = 1;

    var isDrawing = false;

    canvas.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      isDrawing = true;
      paint(e);
    });
    canvas.addEventListener('pointermove', function(e) {
      if (!isDrawing) return;
      e.preventDefault();
      paint(e);
    });
    canvas.addEventListener('pointerup', function() {
      isDrawing = false;
      checkCompletion();
    });
    canvas.addEventListener('pointerleave', function() {
      if (isDrawing) {
        isDrawing = false;
        checkCompletion();
      }
    });

    function paint(e) {
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      var y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
      ctx.fillStyle = '#f4b870';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Track filled cells
      var gx = Math.floor(x / gridSize);
      var gy = Math.floor(y / gridSize);
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          filledPixels.add((gy + dy) + ',' + (gx + dx));
        }
      }
    }

    function checkCompletion() {
      var coverage = filledPixels.size / totalArea;
      if (coverage >= 0.7) {
        playSound('correct');
        speakText(letterData.sound);
        var msg = document.createElement('div');
        msg.className = 'trace-success';
        msg.textContent = '잘했어!';
        container.appendChild(msg);
        setTimeout(function() {
          Learning.onPhaseComplete(st);
        }, 1200);
      }
    }

    setTimeout(function() { speakText(letterData.sound); }, 300);
  },

  _startSoundMatch: function(container, activity, wordData, st) {
    var choices = activity.choices;
    var currentIndex = 0;
    var wrongCount = 0;
    var self = this;

    function showQuestion() {
      if (currentIndex >= choices.length) {
        Learning.onPhaseComplete(st);
        return;
      }

      container.innerHTML = '';
      MeetActivity._updateDots(3);

      var target = choices[currentIndex];
      var targetData = LETTERS[target];
      if (!targetData) {
        currentIndex++;
        showQuestion();
        return;
      }

      var title = document.createElement('div');
      title.className = 'play-title';
      title.textContent = '어떤 소리일까?';
      container.appendChild(title);

      // Sound button
      var soundBtn = document.createElement('button');
      soundBtn.className = 'meet-sound-btn sound-match-btn';
      soundBtn.textContent = '듣기';
      soundBtn.onclick = function() { speakText(targetData.sound); };
      container.appendChild(soundBtn);

      // Choices (shuffle with distractors)
      var options = [target];
      var allLetterKeys = Object.keys(LETTERS);
      while (options.length < 3 && options.length < allLetterKeys.length) {
        var rand = allLetterKeys[Math.floor(Math.random() * allLetterKeys.length)];
        if (options.indexOf(rand) === -1) options.push(rand);
      }
      // Shuffle
      for (var i = options.length - 1; i > 0; i--) {
        var r = Math.floor(Math.random() * (i + 1));
        var tmp = options[i];
        options[i] = options[r];
        options[r] = tmp;
      }

      var choiceGrid = document.createElement('div');
      choiceGrid.className = 'sound-match-grid';

      for (var j = 0; j < options.length; j++) {
        var choiceEl = document.createElement('div');
        choiceEl.className = 'sound-choice';
        choiceEl.textContent = options[j];
        choiceEl.dataset.letter = options[j];

        (function(el, letter) {
          el.onclick = function() {
            if (letter === target) {
              el.classList.add('sound-choice-correct');
              playSound('correct');
              speakText(targetData.sound);
              wrongCount = 0;
              currentIndex++;
              setTimeout(showQuestion, 1000);
            } else {
              el.classList.add('sound-choice-wrong');
              wrongCount++;
              if (wrongCount >= 3) {
                // Highlight correct answer
                var allChoices = choiceGrid.querySelectorAll('.sound-choice');
                for (var c = 0; c < allChoices.length; c++) {
                  if (allChoices[c].dataset.letter === target) {
                    allChoices[c].classList.add('sound-choice-hint');
                  }
                }
              }
              setTimeout(function() {
                el.classList.remove('sound-choice-wrong');
                speakText(targetData.sound);
              }, 500);
            }
          };
        })(choiceEl, options[j]);

        choiceGrid.appendChild(choiceEl);
      }
      container.appendChild(choiceGrid);

      // Auto play sound
      setTimeout(function() { speakText(targetData.sound); }, 500);
    }

    showQuestion();
  }
};
