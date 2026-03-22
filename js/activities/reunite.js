var ReuniteActivity = {
  start: function(st, wordData) {
    var container = document.getElementById('learningContent');
    container.innerHTML = '';

    MeetActivity._updateDots(4);

    // Decompose all syllables
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

    // Show word
    var wordEl = document.createElement('div');
    wordEl.className = 'meet-word';
    wordEl.textContent = wordData.word;
    wordEl.style.marginBottom = '1.5rem';
    container.appendChild(wordEl);

    // Arrow
    var arrow = document.createElement('div');
    arrow.className = 'discover-arrow';
    arrow.textContent = '↓';
    container.appendChild(arrow);

    // Show decomposed letters with highlighting
    var lettersDiv = document.createElement('div');
    lettersDiv.className = 'reunite-letters';
    var known = st.learning.knownLetters;

    for (var j = 0; j < allLetters.length; j++) {
      var letterEl = document.createElement('span');
      letterEl.className = 'reunite-letter';
      letterEl.textContent = allLetters[j];
      if (known.indexOf(allLetters[j]) !== -1) {
        letterEl.classList.add('reunite-known');
      } else {
        letterEl.classList.add('reunite-new');
      }

      // Tap to hear
      (function(letter) {
        letterEl.onclick = function() {
          if (LETTERS[letter]) speakText(LETTERS[letter].sound);
          playSound('click');
        };
      })(allLetters[j]);

      lettersDiv.appendChild(letterEl);
    }
    container.appendChild(lettersDiv);

    // Message
    var msg = document.createElement('p');
    msg.className = 'reunite-message';
    var hasNew = wordData.letters.length > 0;
    msg.textContent = hasNew ? '새로운 글자를 발견했어!' : '이 글자들 다 알고 있어!';
    container.appendChild(msg);

    // Speak word
    setTimeout(function() { speakText(wordData.word); }, 500);

    // Complete button after brief delay
    setTimeout(function() {
      var btn = document.createElement('button');
      btn.className = 'btn-action';
      btn.textContent = '다음으로';
      btn.style.marginTop = '1.5rem';
      btn.onclick = function() {
        Learning.onPhaseComplete(st);
      };
      container.appendChild(btn);
    }, 2000);
  }
};
