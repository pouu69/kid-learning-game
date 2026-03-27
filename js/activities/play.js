// js/activities/play.js
// PuzzleActivity — 2D syllable block puzzle (stage 3: syllable composition)
// Globals: CURRICULUM, LETTERS, Learning, st, speakText, playSound

var PuzzleActivity = {
  _controller: null, // AbortController for drag cleanup

  start: function(st, wordData) {
    var self = this;
    if (this._controller) this._controller.abort();
    this._controller = new AbortController();

    var container = document.createElement('div');
    container.className = 'puzzle-activity';

    // Phase label
    var phaseLabel = document.createElement('div');
    phaseLabel.className = 'phase-label';
    phaseLabel.textContent = '글자를 만들어보자!';
    container.appendChild(phaseLabel);

    // Word hint row: sound button + meaning
    var hintRow = document.createElement('div');
    hintRow.style.cssText = 'display:flex;align-items:center;gap:14px;margin-bottom:0.5rem;';
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn sound-btn-big';
    soundBtn.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>';
    soundBtn.onclick = function() { speakText(wordData.word, 0.7); };
    hintRow.appendChild(soundBtn);
    var meaningLabel = document.createElement('div');
    meaningLabel.className = 'puzzle-meaning';
    meaningLabel.innerHTML = '<span style="font-size:1.8rem;font-weight:900">' + wordData.word + '</span><br><span style="font-size:1rem;color:#8a7e72">' + (wordData.meaning || '') + '</span>';
    hintRow.appendChild(meaningLabel);
    container.appendChild(hintRow);

    // Syllable blocks area
    var blocksArea = document.createElement('div');
    blocksArea.className = 'puzzle-blocks-area';

    var allSlots = [];
    var totalSlots = 0;
    var filledSlots = 0;

    // Create a block for each syllable
    for (var i = 0; i < wordData.syllables.length; i++) {
      var syl = wordData.syllables[i];
      var block = document.createElement('div');
      block.className = 'syllable-block block-' + syl.type;

      // Create slots based on type
      var choSlot = self._createSlot('cho', syl.cho);
      var jungSlot = self._createSlot('jung', syl.jung);
      block.appendChild(choSlot);
      block.appendChild(jungSlot);
      allSlots.push(choSlot, jungSlot);
      totalSlots += 2;

      if (syl.jong) {
        var jongSlot = self._createSlot('jong', syl.jong);
        jongSlot.classList.add('slot-jong');
        block.appendChild(jongSlot);
        allSlots.push(jongSlot);
        totalSlots++;
      }

      blocksArea.appendChild(block);
    }
    container.appendChild(blocksArea);

    // Draggable pieces area
    var piecesArea = document.createElement('div');
    piecesArea.className = 'puzzle-pieces-area';

    // Collect all needed letters
    var allPieces = [];
    for (var j = 0; j < wordData.syllables.length; j++) {
      var s = wordData.syllables[j];
      allPieces.push(s.cho);
      allPieces.push(s.jung);
      if (s.jong) allPieces.push(s.jong);
    }
    // Shuffle
    for (var k = allPieces.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = allPieces[k]; allPieces[k] = allPieces[r]; allPieces[r] = tmp;
    }

    // Progress counter
    var progressEl = document.createElement('div');
    progressEl.className = 'puzzle-progress';
    progressEl.innerHTML = '<span class="puzzle-progress-count">0</span> / <span>' + totalSlots + '</span>';
    container.appendChild(progressEl);

    var wrongAttempts = 0;

    // Create draggable pieces
    for (var m = 0; m < allPieces.length; m++) {
      var piece = self._createPiece(allPieces[m], allSlots, function(snappedLetter) {
        filledSlots++;

        // Update progress
        var countEl = progressEl.querySelector('.puzzle-progress-count');
        if (countEl) {
          countEl.textContent = filledSlots;
          countEl.style.animation = 'none';
          void countEl.offsetWidth;
          countEl.style.animation = 'popIn 0.3s ease';
        }

        // Speak the placed letter
        var lData = typeof LETTERS !== 'undefined' ? LETTERS[snappedLetter] : null;
        if (lData) speakText(lData.sound || snappedLetter, 0.8);

        if (filledSlots >= totalSlots) {
          // === Completion celebration ===
          progressEl.style.display = 'none';
          piecesArea.style.display = 'none';

          // Flash slots green
          var allSlotEls = container.querySelectorAll('.puzzle-slot');
          for (var f = 0; f < allSlotEls.length; f++) {
            allSlotEls[f].style.animation = 'none';
            void allSlotEls[f].offsetWidth;
            allSlotEls[f].style.animation = 'popIn 0.4s ease';
            allSlotEls[f].style.background = '#d8f0d0';
          }

          // Big word display with meaning
          var resultArea = document.createElement('div');
          resultArea.style.cssText = 'text-align:center;margin:1rem 0;animation:popIn 0.5s ease;';
          var bigWord = document.createElement('div');
          bigWord.style.cssText = 'font-size:4rem;font-weight:900;color:var(--text-light);font-family:var(--font-pixel);';
          bigWord.textContent = wordData.word;
          resultArea.appendChild(bigWord);

          // Star rating (3 stars max, lose 1 per 2 wrong attempts)
          var stars = Math.max(1, 3 - Math.floor(wrongAttempts / 2));
          var starRow = document.createElement('div');
          starRow.style.cssText = 'font-size:2.5rem;margin:0.5rem 0;';
          for (var si = 0; si < 3; si++) {
            var starSpan = document.createElement('span');
            starSpan.textContent = si < stars ? '\u2B50' : '\u2606';
            starSpan.style.cssText = 'margin:0 4px;animation:popIn ' + (0.3 + si * 0.15) + 's ease;display:inline-block;';
            starRow.appendChild(starSpan);
          }
          resultArea.appendChild(starRow);

          var praises = ['완벽해!', '대단해!', '잘했어!', '멋져!'];
          var praiseEl = document.createElement('div');
          praiseEl.style.cssText = 'font-size:1.4rem;color:var(--gold);font-family:var(--font-pixel);animation:popIn 0.7s ease;';
          praiseEl.textContent = praises[Math.floor(Math.random() * praises.length)];
          resultArea.appendChild(praiseEl);

          container.insertBefore(resultArea, blocksArea);

          if (typeof showCelebration === 'function') {
            showCelebration(window.innerWidth / 2, window.innerHeight / 2);
          }
          playSound('correct');
          speakText(wordData.word, 0.7);
          setTimeout(function() {
            if (self._controller) self._controller.abort();
            Learning.onWordComplete(st, wordData);
          }, 2200);
        }
      }, function() {
        // Wrong snap callback
        wrongAttempts++;
      });
      piecesArea.appendChild(piece);
    }
    container.appendChild(piecesArea);

    Learning.openPopup(container);

    // Auto play word sound
    setTimeout(function() { speakText(wordData.word, 0.7); }, 500);

    // Finger guide demo after 1 second
    setTimeout(function() {
      self._showDragGuide(piecesArea, blocksArea);
      speakText('글자를 끌어서 넣어봐!', 0.75);
    }, 1500);

    // Re-guide after 8 seconds of no interaction
    var idleTimer = setTimeout(function() {
      self._showDragGuide(piecesArea, blocksArea);
      speakText('이쪽으로 옮겨봐~', 0.75);
    }, 8000);

    container.addEventListener('pointerdown', function() {
      clearTimeout(idleTimer);
    }, { once: true });
  },

  _createSlot: function(role, expectedLetter) {
    var slot = document.createElement('div');
    slot.className = 'puzzle-slot puzzle-slot-' + role;
    slot.dataset.role = role;
    slot.dataset.expected = expectedLetter;
    slot.textContent = '?';
    return slot;
  },

  _createPiece: function(letter, allSlots, onSnap, onWrong) {
    var self = this;
    var piece = document.createElement('div');
    piece.className = 'puzzle-piece';
    piece.textContent = letter;
    piece.dataset.letter = letter;

    var isDragging = false;
    var startX, startY, origLeft, origTop;

    piece.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      isDragging = true;
      var rect = piece.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      piece.style.position = 'fixed';
      piece.style.left = origLeft + 'px';
      piece.style.top = origTop + 'px';
      piece.style.zIndex = '200';
      piece.classList.add('piece-dragging');
    });

    var moveHandler = function(e) {
      if (!isDragging) return;
      e.preventDefault();
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      piece.style.left = (origLeft + dx) + 'px';
      piece.style.top = (origTop + dy) + 'px';

      // Highlight nearest matching slot while dragging
      var pCx = origLeft + dx + piece.offsetWidth / 2;
      var pCy = origTop + dy + piece.offsetHeight / 2;
      for (var h = 0; h < allSlots.length; h++) {
        var hs = allSlots[h];
        if (hs.classList.contains('slot-filled')) { hs.classList.remove('slot-hover'); continue; }
        var hr = hs.getBoundingClientRect();
        var hd = Math.sqrt(Math.pow(pCx - (hr.left + hr.width/2), 2) + Math.pow(pCy - (hr.top + hr.height/2), 2));
        if (hd < 80 && hs.dataset.expected === piece.dataset.letter) {
          hs.classList.add('slot-hover');
        } else {
          hs.classList.remove('slot-hover');
        }
      }
    };

    var upHandler = function() {
      if (!isDragging) return;
      isDragging = false;
      piece.classList.remove('piece-dragging');

      // Remove all hover highlights
      for (var rh = 0; rh < allSlots.length; rh++) {
        allSlots[rh].classList.remove('slot-hover');
      }

      var pieceRect = piece.getBoundingClientRect();
      var pieceCx = pieceRect.left + pieceRect.width / 2;
      var pieceCy = pieceRect.top + pieceRect.height / 2;
      var snapped = false;
      var nearSlot = false;

      for (var s = 0; s < allSlots.length; s++) {
        var slot = allSlots[s];
        if (slot.classList.contains('slot-filled')) continue;

        var slotRect = slot.getBoundingClientRect();
        var slotCx = slotRect.left + slotRect.width / 2;
        var slotCy = slotRect.top + slotRect.height / 2;
        var dist = Math.sqrt((pieceCx - slotCx) * (pieceCx - slotCx) + (pieceCy - slotCy) * (pieceCy - slotCy));

        if (dist < 80) {
          nearSlot = true;
          if (slot.dataset.expected === piece.dataset.letter) {
            // Correct slot!
            slot.textContent = piece.dataset.letter;
            slot.classList.add('slot-filled');
            piece.style.display = 'none';
            playSound('click');
            snapped = true;
            onSnap(piece.dataset.letter);
            break;
          } else {
            // Wrong slot — shake the slot
            slot.style.animation = 'none';
            void slot.offsetWidth;
            slot.style.animation = 'cardShake 0.4s ease';
            if (onWrong) onWrong();
          }
        }
      }

      if (!snapped) {
        piece.style.position = '';
        piece.style.left = '';
        piece.style.top = '';
        piece.style.zIndex = '';
      }
    };

    document.addEventListener('pointermove', moveHandler, { signal: self._controller.signal });
    document.addEventListener('pointerup', upHandler, { signal: self._controller.signal });

    return piece;
  },

  _showDragGuide: function(piecesArea, blocksArea) {
    // Create animated finger that moves from first piece to first empty slot
    var firstPiece = piecesArea.querySelector('.puzzle-piece:not([style*="display: none"])');
    var firstSlot = blocksArea.querySelector('.puzzle-slot:not(.slot-filled)');
    if (!firstPiece || !firstSlot) return;

    var finger = document.createElement('div');
    finger.className = 'finger-guide-animated';

    var pieceRect = firstPiece.getBoundingClientRect();
    var slotRect = firstSlot.getBoundingClientRect();

    finger.style.position = 'fixed';
    finger.style.left = (pieceRect.left + pieceRect.width / 2 - 16) + 'px';
    finger.style.top = (pieceRect.top + pieceRect.height / 2 - 16) + 'px';
    finger.style.zIndex = '300';
    finger.style.transition = 'left 1s ease, top 1s ease';
    finger.style.pointerEvents = 'none';

    document.body.appendChild(finger);

    // Animate to slot
    setTimeout(function() {
      finger.style.left = (slotRect.left + slotRect.width / 2 - 16) + 'px';
      finger.style.top = (slotRect.top + slotRect.height / 2 - 16) + 'px';
    }, 200);

    // Remove after animation
    setTimeout(function() {
      if (finger.parentNode) finger.parentNode.removeChild(finger);
    }, 2500);
  }
};
