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

    // Word sound button at top
    var soundBtn = document.createElement('button');
    soundBtn.className = 'sound-btn';
    soundBtn.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>';
    soundBtn.onclick = function() { speakText(wordData.word, 0.7); };
    container.appendChild(soundBtn);

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

    // Create draggable pieces
    for (var m = 0; m < allPieces.length; m++) {
      var piece = self._createPiece(allPieces[m], allSlots, function() {
        filledSlots++;
        if (filledSlots >= totalSlots) {
          // All slots filled! Word complete
          playSound('correct');
          speakText(wordData.word, 0.7);
          setTimeout(function() {
            if (self._controller) self._controller.abort();
            Learning.onWordComplete(st, wordData);
          }, 1200);
        }
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
      speakText('여기에 넣어봐', 0.7);
    }, 1500);

    // Re-guide after 10 seconds of no interaction
    var idleTimer = setTimeout(function() {
      self._showDragGuide(piecesArea, blocksArea);
      speakText('여기에 넣어봐', 0.7);
    }, 10000);

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

  _createPiece: function(letter, allSlots, onSnap) {
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
    };

    var upHandler = function() {
      if (!isDragging) return;
      isDragging = false;
      piece.classList.remove('piece-dragging');

      var pieceRect = piece.getBoundingClientRect();
      var pieceCx = pieceRect.left + pieceRect.width / 2;
      var pieceCy = pieceRect.top + pieceRect.height / 2;
      var snapped = false;

      for (var s = 0; s < allSlots.length; s++) {
        var slot = allSlots[s];
        if (slot.classList.contains('slot-filled')) continue;
        if (slot.dataset.expected !== piece.dataset.letter) continue;

        var slotRect = slot.getBoundingClientRect();
        var slotCx = slotRect.left + slotRect.width / 2;
        var slotCy = slotRect.top + slotRect.height / 2;
        var dist = Math.sqrt((pieceCx - slotCx) * (pieceCx - slotCx) + (pieceCy - slotCy) * (pieceCy - slotCy));

        if (dist < 60) {
          slot.textContent = piece.dataset.letter;
          slot.classList.add('slot-filled');
          piece.style.display = 'none';
          playSound('click');
          var letterData = LETTERS[piece.dataset.letter];
          if (letterData) speakText(letterData.sound || piece.dataset.letter, 0.7);
          snapped = true;
          onSnap();
          break;
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
