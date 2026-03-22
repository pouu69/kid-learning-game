// js/activities/meet.js
// Phase 1: Meet — 단어 전체 보기, TTS 발음, 터치로 펫에게 먹이기
// Globals: speakText, playSound (effects.js), Learning (learning.js)

var MeetActivity = {
  start: function(st, wordData) {
    var container = document.getElementById('learningContent');
    container.innerHTML = '';

    // 펫이 원하는 것 말풍선
    var bubble = document.createElement('div');
    bubble.className = 'meet-bubble';
    bubble.textContent = this._getRequestText(wordData);
    container.appendChild(bubble);

    // 그림 자리 (지금은 의미 텍스트로 표시)
    var illust = document.createElement('div');
    illust.className = 'meet-illustration';
    illust.textContent = wordData.meaning;
    container.appendChild(illust);

    // 큰 단어 표시
    var wordEl = document.createElement('div');
    wordEl.className = 'meet-word';
    wordEl.textContent = wordData.word;
    container.appendChild(wordEl);

    // 다시 듣기 버튼
    var soundBtn = document.createElement('button');
    soundBtn.className = 'meet-sound-btn';
    soundBtn.textContent = '다시 듣기';
    soundBtn.onclick = function() { speakText(wordData.word); };
    container.appendChild(soundBtn);

    // 힌트 문구
    var hint = document.createElement('p');
    hint.className = 'meet-hint';
    hint.textContent = '같이 말해볼까? 글자를 터치해봐!';
    container.appendChild(hint);

    // 단어 터치 → 펫에게 날아감 → 단계 완료
    wordEl.onclick = function() {
      playSound('correct');
      speakText(wordData.word);
      wordEl.classList.add('meet-word-fly');
      setTimeout(function() {
        Learning.onPhaseComplete(st);
      }, 1000);
    };

    // 화면 진입 시 자동 발음
    setTimeout(function() { speakText(wordData.word); }, 500);

    // 진행 점 업데이트
    this._updateDots(1);
  },

  _getRequestText: function(wordData) {
    var req = wordData.petRequest;
    if (req === 'hungry') return '배고파...';
    if (req === 'thirsty') return '목 말라...';
    if (req === 'sleepy') return '졸려...';
    return '같이 놀자~';
  },

  _updateDots: function(current) {
    var dots = document.getElementById('progressDots');
    if (!dots) return;
    dots.innerHTML = '';
    for (var i = 1; i <= 4; i++) {
      var dot = document.createElement('div');
      dot.className = 'progress-dot' + (i <= current ? ' active' : '');
      dots.appendChild(dot);
    }
  }
};
