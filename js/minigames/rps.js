// js/minigames/rps.js
// 가위바위보 미니게임: 3판 2선승제
// Depends: playSound, speakText (globals)

var RPSGame = {
  _overlay: null,
  _onComplete: null,
  _playerScore: 0,
  _petScore: 0,
  _round: 0,
  _maxRounds: 3,
  _winTarget: 2,
  _busy: false,

  start: function(st, onComplete) {
    this._cleanup();
    this._onComplete = onComplete;
    this._playerScore = 0;
    this._petScore = 0;
    this._round = 0;
    this._busy = false;

    this._createOverlay();
    speakText('가위바위보!', 0.9);
  },

  _createOverlay: function() {
    var self = this;
    var overlay = document.createElement('div');
    overlay.id = 'rps-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'z-index:300',
      'background:#1a1830',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:space-between',
      'padding:24px 16px 32px',
      'box-sizing:border-box',
      'font-family:"DungGeunMo",monospace'
    ].join(';');
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // ── 상단: 스코어보드 ──────────────────────
    var scoreboard = document.createElement('div');
    scoreboard.style.cssText = [
      'width:100%',
      'display:flex',
      'justify-content:space-between',
      'align-items:center',
      'color:#f8d848',
      'font-size:1.1rem'
    ].join(';');
    scoreboard.innerHTML = [
      '<span id="rps-player-label">나</span>',
      '<span id="rps-score">0 : 0</span>',
      '<span id="rps-pet-label">펫</span>'
    ].join('');
    overlay.appendChild(scoreboard);

    // ── 중앙: 펫 이모티콘 + 결과 텍스트 ──────
    var center = document.createElement('div');
    center.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'gap:12px'
    ].join(';');

    var petFace = document.createElement('div');
    petFace.id = 'rps-pet-face';
    petFace.style.cssText = [
      'font-size:3.5rem',
      'color:#f8d848',
      'letter-spacing:4px',
      'min-height:64px',
      'display:flex',
      'align-items:center',
      'justify-content:center'
    ].join(';');
    petFace.textContent = '^_^';

    var resultText = document.createElement('div');
    resultText.id = 'rps-result';
    resultText.style.cssText = [
      'font-size:1.6rem',
      'color:#f8d848',
      'min-height:40px',
      'text-align:center',
      'letter-spacing:2px'
    ].join(';');
    resultText.textContent = '골라봐!';

    var choicesRow = document.createElement('div');
    choicesRow.id = 'rps-choices-display';
    choicesRow.style.cssText = [
      'display:flex',
      'gap:24px',
      'font-size:1.2rem',
      'color:#aaaacc',
      'min-height:36px',
      'align-items:center'
    ].join(';');
    choicesRow.textContent = '';

    center.appendChild(petFace);
    center.appendChild(resultText);
    center.appendChild(choicesRow);
    overlay.appendChild(center);

    // ── 하단: 버튼 3개 ────────────────────────
    var btnRow = document.createElement('div');
    btnRow.id = 'rps-btn-row';
    btnRow.style.cssText = [
      'display:flex',
      'gap:20px',
      'justify-content:center',
      'width:100%'
    ].join(';');

    var choices = [
      { key: 'scissors', label: '가위', emoji: '✌' },
      { key: 'rock',     label: '바위', emoji: '✊' },
      { key: 'paper',    label: '보',   emoji: '🖐' }
    ];

    choices.forEach(function(choice) {
      var btn = document.createElement('button');
      btn.dataset.choice = choice.key;
      btn.style.cssText = [
        'width:90px',
        'height:90px',
        'border-radius:12px',
        'border:3px solid #f8d848',
        'background:#2a2848',
        'color:#f8d848',
        'font-family:"DungGeunMo",monospace',
        'font-size:1rem',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'gap:4px',
        'cursor:pointer',
        'box-shadow:0 6px 0 #111028',
        'transition:transform 0.08s,box-shadow 0.08s',
        '-webkit-tap-highlight-color:transparent',
        'user-select:none'
      ].join(';');
      btn.innerHTML = '<span style="font-size:2rem;line-height:1">' + choice.emoji + '</span><span>' + choice.label + '</span>';

      btn.addEventListener('pointerdown', function() {
        btn.style.transform = 'translateY(4px)';
        btn.style.boxShadow = '0 2px 0 #111028';
      });
      btn.addEventListener('pointerup', function() {
        btn.style.transform = '';
        btn.style.boxShadow = '0 6px 0 #111028';
      });
      btn.addEventListener('pointercancel', function() {
        btn.style.transform = '';
        btn.style.boxShadow = '0 6px 0 #111028';
      });
      btn.addEventListener('click', function() {
        self._onPlayerChoice(choice.key);
      });

      btnRow.appendChild(btn);
    });

    overlay.appendChild(btnRow);
  },

  _setButtonsEnabled: function(enabled) {
    if (!this._overlay) return;
    var btns = this._overlay.querySelectorAll('#rps-btn-row button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].style.pointerEvents = enabled ? 'auto' : 'none';
      btns[i].style.opacity = enabled ? '1' : '0.4';
    }
  },

  _onPlayerChoice: function(playerKey) {
    if (this._busy) return;
    this._busy = true;
    this._setButtonsEnabled(false);

    var choices = ['scissors', 'rock', 'paper'];
    var petKey = choices[Math.floor(Math.random() * 3)];

    this._round++;
    this._showRoundResult(playerKey, petKey);
  },

  _choiceLabel: function(key) {
    var map = { scissors: '가위', rock: '바위', paper: '보' };
    return map[key] || key;
  },

  // returns 'win' | 'lose' | 'tie'
  _judge: function(player, pet) {
    if (player === pet) return 'tie';
    if (
      (player === 'scissors' && pet === 'paper') ||
      (player === 'rock'     && pet === 'scissors') ||
      (player === 'paper'    && pet === 'rock')
    ) {
      return 'win';
    }
    return 'lose';
  },

  _showRoundResult: function(playerKey, petKey) {
    var self = this;
    var outcome = this._judge(playerKey, petKey);

    var petFace   = document.getElementById('rps-pet-face');
    var resultEl  = document.getElementById('rps-result');
    var choicesEl = document.getElementById('rps-choices-display');
    var scoreEl   = document.getElementById('rps-score');

    // 선택 표시
    if (choicesEl) {
      choicesEl.textContent = '나: ' + this._choiceLabel(playerKey) + '  펫: ' + this._choiceLabel(petKey);
    }

    if (outcome === 'tie') {
      // 비김 → 재경기 (라운드 차감)
      this._round--;
      if (petFace)  petFace.textContent  = 'O_O';
      if (resultEl) {
        resultEl.style.color = '#f8d848';
        resultEl.textContent = '비겼다!';
      }
      speakText('비겼다! 다시!', 0.9);
      setTimeout(function() {
        if (petFace)  petFace.textContent  = '^_^';
        if (resultEl) resultEl.textContent = '골라봐!';
        if (choicesEl) choicesEl.textContent = '';
        self._setButtonsEnabled(true);
        self._busy = false;
      }, 1000);
      return;
    }

    if (outcome === 'win') {
      this._playerScore++;
      if (petFace) petFace.textContent = 'T_T';
      if (resultEl) {
        resultEl.style.color = '#48a868';
        resultEl.textContent = '이겼다!';
      }
      playSound('correct');
      speakText('이겼다!', 0.9);
    } else {
      this._petScore++;
      if (petFace) petFace.textContent = 'V_V';
      if (resultEl) {
        resultEl.style.color = '#f08080';
        resultEl.textContent = '졌어~';
      }
      playSound('wrong');
      speakText('졌어~', 0.8);
    }

    // 스코어 업데이트
    if (scoreEl) {
      scoreEl.textContent = this._playerScore + ' : ' + this._petScore;
    }

    // 승부 판정
    var matchOver = (this._playerScore >= this._winTarget) || (this._petScore >= this._winTarget) || (this._round >= this._maxRounds);

    if (matchOver) {
      setTimeout(function() {
        self._showMatchResult();
      }, 900);
    } else {
      setTimeout(function() {
        if (petFace)  petFace.textContent  = '^_^';
        if (resultEl) resultEl.textContent = '골라봐!';
        if (choicesEl) choicesEl.textContent = '';
        self._setButtonsEnabled(true);
        self._busy = false;
      }, 900);
    }
  },

  _showMatchResult: function() {
    var self = this;
    var overlay = this._overlay;
    if (!overlay) return;

    var playerWon = this._playerScore > this._petScore;
    var isDraw    = this._playerScore === this._petScore;

    var bgColor    = playerWon ? '#48a868' : (isDraw ? '#f8d848' : '#f08080');
    var titleText  = playerWon ? '승리!' : (isDraw ? '무승부!' : '패배...');
    var petEmotion = playerWon ? 'T_T' : (isDraw ? 'O_O' : '^O^');
    var starsCount = 2; // 사양: 항상 2별

    // 오버레이 내용 교체
    overlay.innerHTML = '';
    overlay.style.justifyContent = 'center';
    overlay.style.gap = '20px';

    var titleEl = document.createElement('div');
    titleEl.style.cssText = [
      'font-size:3rem',
      'color:' + bgColor,
      'font-family:"DungGeunMo",monospace',
      'letter-spacing:4px',
      'animation:rps-pop 0.3s ease'
    ].join(';');
    titleEl.textContent = titleText;

    var faceEl = document.createElement('div');
    faceEl.style.cssText = [
      'font-size:3.5rem',
      'color:#f8d848',
      'font-family:"DungGeunMo",monospace',
      'letter-spacing:4px'
    ].join(';');
    faceEl.textContent = petEmotion;

    var scoreEl = document.createElement('div');
    scoreEl.style.cssText = [
      'font-size:1.4rem',
      'color:#aaaacc',
      'font-family:"DungGeunMo",monospace'
    ].join(';');
    scoreEl.textContent = '나 ' + this._playerScore + ' : ' + this._petScore + ' 펫';

    var starsEl = document.createElement('div');
    starsEl.style.cssText = [
      'font-size:2.4rem',
      'color:#f8d848',
      'letter-spacing:8px'
    ].join(';');
    starsEl.textContent = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = [
      'margin-top:16px',
      'padding:14px 36px',
      'border-radius:12px',
      'border:3px solid #f8d848',
      'background:#2a2848',
      'color:#f8d848',
      'font-family:"DungGeunMo",monospace',
      'font-size:1.1rem',
      'cursor:pointer',
      'box-shadow:0 6px 0 #111028',
      '-webkit-tap-highlight-color:transparent'
    ].join(';');
    closeBtn.textContent = '확인';
    closeBtn.addEventListener('pointerdown', function() {
      closeBtn.style.transform = 'translateY(4px)';
      closeBtn.style.boxShadow = '0 2px 0 #111028';
    });
    closeBtn.addEventListener('pointerup', function() {
      closeBtn.style.transform = '';
      closeBtn.style.boxShadow = '0 6px 0 #111028';
    });
    closeBtn.addEventListener('click', function() {
      var cb = self._onComplete;
      self._cleanup();
      if (cb) cb(starsCount);
    });

    // 팝 애니메이션 keyframes (중복 방지)
    if (!document.getElementById('rps-styles')) {
      var styleTag = document.createElement('style');
      styleTag.id = 'rps-styles';
      styleTag.textContent = '@keyframes rps-pop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}';
      document.head.appendChild(styleTag);
    }

    overlay.appendChild(titleEl);
    overlay.appendChild(faceEl);
    overlay.appendChild(scoreEl);
    overlay.appendChild(starsEl);
    overlay.appendChild(closeBtn);

    if (playerWon) {
      playSound('correct');
      speakText('잘했어! 이겼다!', 0.9);
    } else if (isDraw) {
      speakText('무승부!', 0.9);
    } else {
      playSound('wrong');
      speakText('다음엔 이길 수 있어!', 0.8);
    }
  },

  _cleanup: function() {
    this._busy = false;
    this._playerScore = 0;
    this._petScore = 0;
    this._round = 0;
    this._onComplete = null;
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }
  }
};
