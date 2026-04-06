// js/minigames/rps.js
// 가위바위보 미니게임: 3판 2선승제
// Depends: playSound, speakText (globals)

var _rpsTutorialShown = false;

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

    // 매번 튜토리얼 표시 (5세는 매번 가이드 필요)
    this._showTutorial();
  },

  _showTutorial: function() {
    var self = this;
    var overlay = this._overlay;
    if (!overlay) return;

    // 튜토리얼 동안 버튼 숨기기
    var btnRow = overlay.querySelector('#rps-btn-row');
    if (btnRow) btnRow.style.visibility = 'hidden';

    // 튜토리얼 전용 키프레임 추가 (중복 방지)
    if (!document.getElementById('rps-tutorial-styles')) {
      var tutStyle = document.createElement('style');
      tutStyle.id = 'rps-tutorial-styles';
      tutStyle.textContent = [
        '@keyframes rps-tut-finger{',
        '  0%   { transform: translateX(-90px); opacity: 0; }',
        '  10%  { opacity: 1; }',
        '  33%  { transform: translateX(-90px); }',
        '  50%  { transform: translateX(0px); }',
        '  67%  { transform: translateX(0px); }',
        '  83%  { transform: translateX(90px); }',
        '  100% { transform: translateX(90px); opacity: 1; }',
        '}',
        '@keyframes rps-tut-tap{',
        '  0%,60%  { opacity: 0.35; transform: scale(1); }',
        '  70%     { opacity: 1;    transform: scale(1.25); filter: drop-shadow(0 0 12px #f8d848); }',
        '  85%     { opacity: 1;    transform: scale(1.15); }',
        '  100%    { opacity: 1;    transform: scale(1.15); }',
        '}',
        '@keyframes rps-tut-fadein{',
        '  from { opacity: 0; }',
        '  to   { opacity: 1; }',
        '}',
        '@keyframes rps-tut-fadeout{',
        '  from { opacity: 1; }',
        '  to   { opacity: 0; }',
        '}'
      ].join('');
      document.head.appendChild(tutStyle);
    }

    // 튜토리얼 컨테이너
    var tut = document.createElement('div');
    tut.id = 'rps-tutorial';
    tut.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:20px',
      'z-index:10',
      'animation:rps-tut-fadein 0.4s ease'
    ].join(';');
    overlay.style.position = 'fixed';
    overlay.appendChild(tut);

    // "골라봐!" 텍스트
    var label = document.createElement('div');
    label.style.cssText = [
      'font-size:2rem',
      'color:#f8d848',
      'font-family:"DungGeunMo",monospace',
      'text-align:center',
      'letter-spacing:2px'
    ].join(';');
    label.textContent = '골라봐!';
    tut.appendChild(label);

    // 손 3개 행 (반투명)
    var handsRow = document.createElement('div');
    handsRow.style.cssText = [
      'display:flex',
      'gap:24px',
      'justify-content:center',
      'align-items:center',
      'position:relative'
    ].join(';');

    var handEmojis = ['✌️', '✊', '🖐️'];
    handEmojis.forEach(function(emoji, idx) {
      var hand = document.createElement('div');
      hand.style.cssText = [
        'font-size:4rem',
        'line-height:1',
        'opacity:0.35',
        'transition:opacity 0.2s,transform 0.2s,filter 0.2s',
        // 가운데(✊)만 tap 애니메이션
        idx === 1 ? 'animation:rps-tut-tap 2.5s ease 0.5s both' : ''
      ].join(';');
      hand.textContent = emoji;
      handsRow.appendChild(hand);
    });

    tut.appendChild(handsRow);

    // 가리키는 손가락 (👆) — 왼쪽→가운데 이동
    var finger = document.createElement('div');
    finger.style.cssText = [
      'font-size:3rem',
      'line-height:1',
      'margin-top:-8px',
      'animation:rps-tut-finger 2.5s ease 0.5s both'
    ].join(';');
    finger.textContent = '👆';
    tut.appendChild(finger);

    speakText('손 하나를 골라봐!', 0.9);

    // 2.5초 후 튜토리얼 사라지고 게임 시작
    setTimeout(function() {
      // 페이드아웃
      tut.style.animation = 'rps-tut-fadeout 0.4s ease forwards';
      setTimeout(function() {
        if (tut.parentNode) tut.parentNode.removeChild(tut);
        if (btnRow) btnRow.style.visibility = 'visible';
        speakText('가위바위보!', 0.9);
      }, 400);
    }, 2900);
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
      'font-family:"DungGeunMo",monospace',
      'transition:background 0.3s'
    ].join(';');
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // ── 스타일 태그 (중복 방지) ──────────────────
    if (!document.getElementById('rps-styles')) {
      var styleTag = document.createElement('style');
      styleTag.id = 'rps-styles';
      styleTag.textContent = [
        '@keyframes rps-pop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}',
        '@keyframes rps-countdown{0%{transform:scale(0.3);opacity:0}40%{transform:scale(1.3);opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(0.8);opacity:0}}',
        '@keyframes rps-choice-in{0%{transform:scale(0.2) translateY(-20px);opacity:0}60%{transform:scale(1.2) translateY(0);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}'
      ].join('');
      document.head.appendChild(styleTag);
    }

    // ── 상단: 하트 스코어보드 ──────────────────────
    var scoreboard = document.createElement('div');
    scoreboard.style.cssText = [
      'width:100%',
      'display:flex',
      'justify-content:space-around',
      'align-items:center'
    ].join(';');

    var playerHearts = document.createElement('div');
    playerHearts.id = 'rps-player-hearts';
    playerHearts.style.cssText = 'font-size:2rem;letter-spacing:4px;';
    playerHearts.textContent = '♡♡';

    var petHearts = document.createElement('div');
    petHearts.id = 'rps-pet-hearts';
    petHearts.style.cssText = 'font-size:2rem;letter-spacing:4px;';
    petHearts.textContent = '♡♡';

    scoreboard.appendChild(playerHearts);
    scoreboard.appendChild(petHearts);
    overlay.appendChild(scoreboard);

    // ── 중앙: 펫 선택 이모지 + 펫 얼굴 ──────────────
    var center = document.createElement('div');
    center.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'gap:8px',
      'flex:1',
      'justify-content:center'
    ].join(';');

    var petChoice = document.createElement('div');
    petChoice.id = 'rps-pet-choice';
    petChoice.style.cssText = [
      'font-size:4rem',
      'min-height:64px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'opacity:0'
    ].join(';');
    petChoice.textContent = '';

    var petFace = document.createElement('div');
    petFace.id = 'rps-pet-face';
    petFace.style.cssText = [
      'font-size:5rem',
      'min-height:80px',
      'display:flex',
      'align-items:center',
      'justify-content:center'
    ].join(';');
    petFace.textContent = '🐣';

    center.appendChild(petChoice);
    center.appendChild(petFace);
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
      { key: 'scissors', emoji: '✌️' },
      { key: 'rock',     emoji: '✊' },
      { key: 'paper',    emoji: '🖐️' }
    ];

    choices.forEach(function(choice) {
      var btn = document.createElement('button');
      btn.dataset.choice = choice.key;
      btn.style.cssText = [
        'width:100px',
        'height:100px',
        'border-radius:16px',
        'border:3px solid #f8d848',
        'background:#2a2848',
        'color:#f8d848',
        'font-family:"DungGeunMo",monospace',
        'font-size:4rem',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'cursor:pointer',
        'box-shadow:0 6px 0 #111028',
        'transition:transform 0.08s,box-shadow 0.08s',
        '-webkit-tap-highlight-color:transparent',
        'user-select:none',
        'line-height:1'
      ].join(';');
      btn.innerHTML = '<span style="font-size:4rem;line-height:1;pointer-events:none">' + choice.emoji + '</span>';

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
        playSound('tap');
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

  _updateHearts: function() {
    var playerHeartsEl = document.getElementById('rps-player-hearts');
    var petHeartsEl    = document.getElementById('rps-pet-hearts');
    if (playerHeartsEl) {
      playerHeartsEl.textContent = '♥'.repeat(this._playerScore) + '♡'.repeat(Math.max(0, this._winTarget - this._playerScore));
    }
    if (petHeartsEl) {
      petHeartsEl.textContent = '♥'.repeat(this._petScore) + '♡'.repeat(Math.max(0, this._winTarget - this._petScore));
    }
  },

  _flashBackground: function(color) {
    var overlay = this._overlay;
    if (!overlay) return;
    overlay.style.background = color;
    setTimeout(function() {
      overlay.style.background = '#1a1830';
    }, 300);
  },

  _showCountdown: function(callback) {
    var self = this;
    var overlay = this._overlay;
    if (!overlay) { callback(); return; }

    var countEl = document.createElement('div');
    countEl.id = 'rps-countdown';
    countEl.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'font-size:5rem',
      'color:#f8d848',
      'font-family:"DungGeunMo",monospace',
      'pointer-events:none',
      'z-index:10',
      'text-align:center'
    ].join(';');
    overlay.style.position = 'fixed';
    overlay.appendChild(countEl);

    var nums = ['3', '2', '1'];
    var idx = 0;

    function showNext() {
      if (idx >= nums.length) {
        if (countEl.parentNode) countEl.parentNode.removeChild(countEl);
        callback();
        return;
      }
      countEl.textContent = nums[idx];
      countEl.style.animation = 'none';
      // force reflow
      void countEl.offsetWidth;
      countEl.style.animation = 'rps-countdown 0.35s ease forwards';
      idx++;
      setTimeout(showNext, 350);
    }

    showNext();
  },

  _onPlayerChoice: function(playerKey) {
    if (this._busy) return;
    this._busy = true;
    this._setButtonsEnabled(false);

    var choices = ['scissors', 'rock', 'paper'];
    var petKey = choices[Math.floor(Math.random() * 3)];

    this._round++;

    var self = this;
    this._showCountdown(function() {
      self._showPetChoice(petKey, function() {
        self._showRoundResult(playerKey, petKey);
      });
    });
  },

  _choiceEmoji: function(key) {
    var map = { scissors: '✌️', rock: '✊', paper: '🖐️' };
    return map[key] || '';
  },

  _showPetChoice: function(petKey, callback) {
    var petChoiceEl = document.getElementById('rps-pet-choice');
    if (!petChoiceEl) { callback(); return; }

    petChoiceEl.textContent = this._choiceEmoji(petKey);
    petChoiceEl.style.opacity = '1';
    petChoiceEl.style.animation = 'none';
    void petChoiceEl.offsetWidth;
    petChoiceEl.style.animation = 'rps-choice-in 0.35s ease forwards';

    setTimeout(callback, 400);
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

    var petFace    = document.getElementById('rps-pet-face');
    var petChoiceEl = document.getElementById('rps-pet-choice');

    if (outcome === 'tie') {
      // 비김 → 재경기 (라운드 차감)
      this._round--;
      if (petFace) petFace.textContent = '😮';
      speakText('비겼다! 다시!', 0.9);
      setTimeout(function() {
        if (petFace) petFace.textContent = '🐣';
        if (petChoiceEl) { petChoiceEl.textContent = ''; petChoiceEl.style.opacity = '0'; }
        self._setButtonsEnabled(true);
        self._busy = false;
      }, 1000);
      return;
    }

    if (outcome === 'win') {
      this._playerScore++;
      if (petFace) petFace.textContent = '😢';
      this._flashBackground('rgba(72,168,104,0.4)');
      playSound('correct');
      speakText('이겼다!', 0.9);
    } else {
      this._petScore++;
      if (petFace) petFace.textContent = '😄';
      this._flashBackground('rgba(240,128,128,0.3)');
      playSound('wrong');
      speakText('졌어~', 0.8);
    }

    this._updateHearts();

    var matchOver = (this._playerScore >= this._winTarget) || (this._petScore >= this._winTarget) || (this._round >= this._maxRounds);

    if (matchOver) {
      setTimeout(function() {
        self._showMatchResult();
      }, 900);
    } else {
      setTimeout(function() {
        if (petFace) petFace.textContent = '🐣';
        if (petChoiceEl) { petChoiceEl.textContent = ''; petChoiceEl.style.opacity = '0'; }
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

    var petEmotion = playerWon ? '😢' : (isDraw ? '😮' : '😄');
    var starsCount = 2; // 사양: 항상 2별

    // 오버레이 내용 교체
    overlay.innerHTML = '';
    overlay.style.justifyContent = 'center';
    overlay.style.gap = '24px';
    overlay.style.background = playerWon ? 'rgba(72,168,104,0.25)' : (isDraw ? '#1a1830' : 'rgba(240,128,128,0.2)');

    var faceEl = document.createElement('div');
    faceEl.style.cssText = [
      'font-size:6rem',
      'animation:rps-pop 0.4s ease'
    ].join(';');
    faceEl.textContent = petEmotion;

    var starsEl = document.createElement('div');
    starsEl.style.cssText = [
      'font-size:3rem',
      'color:#f8d848',
      'letter-spacing:8px',
      'animation:rps-pop 0.4s ease 0.1s both'
    ].join(';');
    starsEl.textContent = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = [
      'margin-top:16px',
      'width:100px',
      'height:100px',
      'border-radius:50%',
      'border:4px solid #f8d848',
      'background:#2a2848',
      'color:#f8d848',
      'font-family:"DungGeunMo",monospace',
      'font-size:2.5rem',
      'cursor:pointer',
      'box-shadow:0 6px 0 #111028',
      '-webkit-tap-highlight-color:transparent',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'animation:rps-pop 0.4s ease 0.2s both'
    ].join(';');
    closeBtn.innerHTML = '<span style="font-size:2.5rem;line-height:1;pointer-events:none">✓</span>';

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

    overlay.appendChild(faceEl);
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
