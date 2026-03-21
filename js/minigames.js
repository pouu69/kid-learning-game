// ===== MINI GAMES (HTML-based) =====

var _catchTimer = null;

function openMiniGame() {
    var games = ['rps', 'catch', 'quiz'];
    var pick = games[Math.floor(Math.random() * games.length)];

    var screen = document.getElementById('minigameScreen');
    screen.innerHTML = '';
    screen.style.display = 'flex';

    if (pick === 'rps') {
        buildRPS(screen);
    } else if (pick === 'catch') {
        buildCatchGame(screen);
    } else {
        buildQuizGame(screen);
    }
}

function closeMG() {
    var screen = document.getElementById('minigameScreen');
    screen.style.display = 'none';
    screen.innerHTML = '';
    if (_catchTimer) {
        clearInterval(_catchTimer);
        _catchTimer = null;
    }
}

// ===== ROCK PAPER SCISSORS =====
function buildRPS(screen) {
    var wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';

    var title = document.createElement('div');
    title.className = 'mg-title';
    title.textContent = '가위바위보';
    wrap.appendChild(title);

    var sub = document.createElement('div');
    sub.className = 'mg-subtitle';
    sub.textContent = '하나를 골라!';
    wrap.appendChild(sub);

    var btnRow = document.createElement('div');
    btnRow.className = 'rps-buttons';

    var names = ['가위', '바위', '보'];
    var resultDiv = document.createElement('div');
    resultDiv.className = 'mg-result';

    for (var i = 0; i < 3; i++) {
        var btn = document.createElement('button');
        btn.className = 'rps-btn';
        btn.textContent = names[i];
        btn.setAttribute('data-choice', i);
        btn.addEventListener('click', function () {
            var choice = parseInt(this.getAttribute('data-choice'));
            playRPS(choice, resultDiv);
            // Disable all buttons
            var allBtns = btnRow.querySelectorAll('.rps-btn');
            for (var j = 0; j < allBtns.length; j++) {
                allBtns[j].disabled = true;
            }
        });
        btnRow.appendChild(btn);
    }

    wrap.appendChild(btnRow);
    wrap.appendChild(resultDiv);
    screen.appendChild(wrap);
}

function playRPS(p, resultEl) {
    var comp = Math.floor(Math.random() * 3);
    var names = ['가위', '바위', '보'];
    var result;

    if (p === comp) {
        result = 'draw';
        resultEl.textContent = names[comp] + ' - 비겼다!';
    } else if ((p === 0 && comp === 2) || (p === 1 && comp === 0) || (p === 2 && comp === 1)) {
        result = 'win';
        resultEl.textContent = names[comp] + ' - 이겼다!';
    } else {
        result = 'lose';
        resultEl.textContent = names[comp] + ' - 졌다...';
    }

    if (result === 'win') {
        st.happiness = Math.min(100, st.happiness + 20);
        st.energy = Math.max(0, st.energy - 8);
        addExp(10);
        if (typeof sfxGood === 'function') sfxGood();
        if (typeof petHappyJump === 'function') petHappyJump();
    } else if (result === 'draw') {
        st.happiness = Math.min(100, st.happiness + 8);
        st.energy = Math.max(0, st.energy - 5);
        addExp(3);
        if (typeof sfxClick === 'function') sfxClick();
    } else {
        st.happiness = Math.min(100, st.happiness + 3);
        st.energy = Math.max(0, st.energy - 5);
        addExp(1);
        if (typeof sfxBad === 'function') sfxBad();
    }
    st.cd.play = 2000;
    updateUI();
    setTimeout(closeMG, 1200);
}

// ===== CATCH GAME =====
function buildCatchGame(screen) {
    var wrap = document.createElement('div');
    wrap.className = 'catch-container';

    var title = document.createElement('div');
    title.className = 'mg-title';
    title.textContent = '별 잡기';
    wrap.appendChild(title);

    var timerInfo = document.createElement('div');
    timerInfo.className = 'catch-info';
    timerInfo.textContent = '별을 터치해! 남은시간: 5';
    wrap.appendChild(timerInfo);

    var field = document.createElement('div');
    field.className = 'catch-field';
    wrap.appendChild(field);

    var scoreDiv = document.createElement('div');
    scoreDiv.className = 'catch-score';
    scoreDiv.textContent = '점수: 0';
    wrap.appendChild(scoreDiv);

    screen.appendChild(wrap);

    var score = { val: 0 };
    var timeLeft = { val: 5 };

    function spawnStar() {
        var star = document.createElement('div');
        star.className = 'catch-star';
        star.textContent = '*';
        var fieldW = field.offsetWidth;
        var fieldH = field.offsetHeight;
        star.style.left = (20 + Math.random() * (fieldW - 50)) + 'px';
        star.style.top = (10 + Math.random() * (fieldH - 40)) + 'px';

        star.addEventListener('click', function () {
            score.val++;
            scoreDiv.textContent = '점수: ' + score.val;
            if (star.parentNode) star.parentNode.removeChild(star);
            if (typeof sfxClick === 'function') sfxClick();
            if (timeLeft.val > 0) spawnStar();
        });

        field.appendChild(star);

        setTimeout(function () {
            if (star.parentNode) {
                star.parentNode.removeChild(star);
                if (timeLeft.val > 0) spawnStar();
            }
        }, 1200);
    }

    spawnStar();

    _catchTimer = setInterval(function () {
        timeLeft.val--;
        timerInfo.textContent = '별을 터치해! 남은시간: ' + timeLeft.val;
        if (timeLeft.val <= 0) {
            clearInterval(_catchTimer);
            _catchTimer = null;
            var h = Math.min(25, score.val * 5);
            st.happiness = Math.min(100, st.happiness + h);
            st.energy = Math.max(0, st.energy - 10);
            addExp(score.val * 3);
            st.cd.play = 2000;
            notify(score.val + '개 잡았다!');
            updateUI();
            setTimeout(closeMG, 800);
        }
    }, 1000);
}

// ===== QUIZ =====
var QUIZZES = [
    { q: '하늘은 무슨 색?', a: ['파란색', '빨간색', '초록색'], c: 0 },
    { q: '1 + 1 = ?', a: ['1', '2', '3'], c: 1 },
    { q: '강아지 소리는?', a: ['야옹', '꿀꿀', '멍멍'], c: 2 },
    { q: '바나나 색은?', a: ['빨간색', '노란색', '파란색'], c: 1 },
    { q: '눈은 몇 개?', a: ['1개', '2개', '3개'], c: 1 },
    { q: '무지개는 몇 색?', a: ['5', '7', '10'], c: 1 },
    { q: '지구 모양은?', a: ['세모', '네모', '동그라미'], c: 2 },
    { q: '비는 어디서?', a: ['구름', '땅', '별'], c: 0 },
    { q: '사과 색은?', a: ['파란색', '초록색', '빨간색'], c: 2 },
    { q: '고양이 소리?', a: ['멍멍', '야옹', '꼬끼오'], c: 1 },
    { q: '일주일은 며칠?', a: ['5일', '7일', '10일'], c: 1 },
    { q: '물은 어떤 맛?', a: ['달아', '써', '맛없어'], c: 2 },
    { q: '태양은 어디서 뜰까?', a: ['동쪽', '서쪽', '남쪽'], c: 0 },
    { q: '코끼리 코는?', a: ['짧다', '길다', '없다'], c: 1 },
    { q: '봄 다음 계절은?', a: ['겨울', '가을', '여름'], c: 2 },
    { q: '2 + 3 = ?', a: ['4', '5', '6'], c: 1 },
    { q: '우유 색은?', a: ['검정', '하양', '빨강'], c: 1 },
    { q: '달은 언제 보여?', a: ['낮', '밤', '아침'], c: 1 },
    { q: '다리는 몇 개?', a: ['1개', '2개', '4개'], c: 1 },
    { q: '펭귄은 날 수?', a: ['있다', '없다', '가끔'], c: 1 },
];

function buildQuizGame(screen) {
    var wrap = document.createElement('div');
    wrap.className = 'quiz-container';

    var title = document.createElement('div');
    title.className = 'mg-title';
    title.textContent = '퀴즈';
    wrap.appendChild(title);

    var q = QUIZZES[Math.floor(Math.random() * QUIZZES.length)];

    var question = document.createElement('div');
    question.className = 'quiz-question';
    question.textContent = q.q;
    wrap.appendChild(question);

    var resultDiv = document.createElement('div');
    resultDiv.className = 'mg-result';

    for (var i = 0; i < q.a.length; i++) {
        var btn = document.createElement('button');
        btn.className = 'quiz-btn';
        btn.textContent = q.a[i];
        btn.setAttribute('data-idx', i);
        btn.setAttribute('data-correct', q.c);
        btn.addEventListener('click', function () {
            var sel = parseInt(this.getAttribute('data-idx'));
            var correct = parseInt(this.getAttribute('data-correct'));
            ansQuiz(sel, correct);
            // Disable all buttons
            var allBtns = wrap.querySelectorAll('.quiz-btn');
            for (var j = 0; j < allBtns.length; j++) {
                allBtns[j].disabled = true;
            }
        });
        wrap.appendChild(btn);
    }

    wrap.appendChild(resultDiv);
    screen.appendChild(wrap);
}

function ansQuiz(sel, correct) {
    if (sel === correct) {
        st.happiness = Math.min(100, st.happiness + 15);
        addExp(8);
        notify('정답!');
        if (typeof sfxGood === 'function') sfxGood();
    } else {
        st.happiness = Math.min(100, st.happiness + 5);
        addExp(2);
        notify('틀렸어~');
        if (typeof sfxBad === 'function') sfxBad();
    }
    st.energy = Math.max(0, st.energy - 5);
    st.cd.play = 2000;
    updateUI();
    setTimeout(closeMG, 1000);
}
