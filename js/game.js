// ===== CONSTANTS =====
var MS_PER_HOUR = 3600000;
var MS_PER_DAY = 86400000;

// Helper: average of all 4 stats
function statAvg() {
    return (st.hunger + st.happiness + st.energy + st.clean) / 4;
}

// Helper: format age from birthTime
function formatAge(birthTime) {
    var ms = Date.now() - (birthTime || Date.now());
    var days = Math.floor(ms / MS_PER_DAY);
    return days > 0 ? days + '일' : Math.floor(ms / MS_PER_HOUR) + '시간';
}

// ===== GAME CONFIG & STATE =====
var STAGES = [
    { name: '알', exp: 50 },
    { name: '아기', exp: 150 },
    { name: '어린이', exp: 350 },
    { name: '청소년', exp: 600 },
    { name: '어른', exp: Infinity },
];

var ACTIONS = ['밥주기', '놀기', '자기', '씻기'];
var ACTION_KEYS = ['feed', 'play', 'sleep', 'clean'];
var selAction = 0;

var st = {
    name: '', hunger: 100, happiness: 100, energy: 100, clean: 100,
    exp: 0, stage: 0, sleeping: false, dead: false, poop: 0,
    lastUpdate: Date.now(),
    cd: { feed: 0, play: 0, sleep: 0, clean: 0 },
    birthTime: Date.now(),
};

// ===== DOM REFERENCES =====
var DOM = {};

function cacheDom() {
    DOM.nameScreen = document.getElementById('nameScreen');
    DOM.gameScreen = document.getElementById('gameScreen');
    DOM.deathScreen = document.getElementById('deathScreen');
    DOM.nameInput = document.getElementById('nameInput');
    DOM.petName = document.getElementById('petName');
    DOM.petStage = document.getElementById('petStage');
    DOM.moodText = document.getElementById('moodText');

    DOM.barHunger = document.getElementById('barHunger');
    DOM.barHappy = document.getElementById('barHappy');
    DOM.barEnergy = document.getElementById('barEnergy');
    DOM.barClean = document.getElementById('barClean');

    DOM.valHunger = document.getElementById('valHunger');
    DOM.valHappy = document.getElementById('valHappy');
    DOM.valEnergy = document.getElementById('valEnergy');
    DOM.valClean = document.getElementById('valClean');

    DOM.barExp = document.getElementById('barExp');
    DOM.valExp = document.getElementById('valExp');

    DOM.deathMsg = document.getElementById('deathMsg');

    DOM.actionItems = document.querySelectorAll('.action-item');
}

// ===== SCREEN SWITCHING =====
function showScreen(name) {
    DOM.nameScreen.style.display = (name === 'name') ? 'flex' : 'none';
    DOM.gameScreen.style.display = (name === 'game') ? 'flex' : 'none';
    DOM.deathScreen.style.display = (name === 'death') ? 'flex' : 'none';
}

function showDeath() {
    DOM.deathMsg.textContent = st.name + '(이)가 떠나버렸어요...\n' + formatAge(st.birthTime) + ' 동안 함께했어요.\n다음엔 더 잘 돌봐주세요!';
    showScreen('death');
    if (typeof sfxBad === 'function') sfxBad();
}

// ===== UPDATE UI =====
function updateUI() {
    if (!DOM.petName) return;

    DOM.petName.textContent = st.name;
    DOM.petStage.textContent = STAGES[st.stage].name + ' ' + formatAge(st.birthTime);

    // Stat bars
    var stats = [
        { bar: DOM.barHunger, val: DOM.valHunger, v: st.hunger },
        { bar: DOM.barHappy, val: DOM.valHappy, v: st.happiness },
        { bar: DOM.barEnergy, val: DOM.valEnergy, v: st.energy },
        { bar: DOM.barClean, val: DOM.valClean, v: st.clean },
    ];

    for (var i = 0; i < stats.length; i++) {
        var s = stats[i];
        s.bar.style.width = s.v + '%';
        s.val.textContent = Math.round(s.v);

        if (s.v < 20) {
            s.bar.classList.add('flash');
        } else {
            s.bar.classList.remove('flash');
        }
    }

    // EXP
    var need = STAGES[st.stage].exp;
    if (need === Infinity) {
        DOM.valExp.textContent = 'MAX';
        DOM.barExp.style.width = '100%';
    } else {
        DOM.valExp.textContent = Math.floor(st.exp) + '/' + need;
        DOM.barExp.style.width = ((st.exp / need) * 100) + '%';
    }

    // Mood
    var avg = statAvg();
    if (st.sleeping) DOM.moodText.textContent = 'z z z . . .';
    else if (avg >= 80) DOM.moodText.textContent = '~ 기분 좋다 ~';
    else if (avg >= 60) DOM.moodText.textContent = '괜찮아~';
    else if (avg >= 40) DOM.moodText.textContent = '음...';
    else if (avg >= 20) DOM.moodText.textContent = '기분 안좋아...';
    else DOM.moodText.textContent = '도와줘...';

    // Sleep label
    DOM.actionItems[2].textContent = st.sleeping ? '깨우기' : '자기';

    // Heart indicators
    updateHeart('heartHunger', st.hunger);
    updateHeart('heartHappy', st.happiness);
    updateHeart('heartEnergy', st.energy);
    updateHeart('heartClean', st.clean);

    // Pet overlays (PixiJS)
    if (typeof updatePetOverlays === 'function') updatePetOverlays();
}

var _heartCache = {};
function updateHeart(id, value) {
    if (!_heartCache[id]) {
        var el = document.getElementById(id);
        if (!el) return;
        _heartCache[id] = { el: el, icon: el.querySelector('.heart-icon') };
    }
    var cached = _heartCache[id];
    var el = cached.el;
    var icon = cached.icon;
    el.classList.remove('full', 'half', 'low');
    // Show as filled blocks: 5 levels
    var level = Math.ceil(value / 20); // 0~5
    var filled = '';
    for (var i = 0; i < 5; i++) {
        filled += i < level ? '|' : '.';
    }
    icon.textContent = filled;

    if (value >= 60) {
        el.classList.add('full');
    } else if (value >= 30) {
        el.classList.add('half');
    } else {
        el.classList.add('low');
    }
}

function updateActionLabels() {
    for (var i = 0; i < DOM.actionItems.length; i++) {
        if (i === selAction) {
            DOM.actionItems[i].classList.add('selected');
        } else {
            DOM.actionItems[i].classList.remove('selected');
        }
        // Show cooldown state
        if (st.cd[ACTION_KEYS[i]] > 0) {
            DOM.actionItems[i].classList.add('cooldown');
        } else {
            DOM.actionItems[i].classList.remove('cooldown');
        }
    }
}

// ===== GAME LOGIC =====
function tick() {
    if (st.dead) return;
    var now = Date.now();
    var dt = (now - st.lastUpdate) / 1000;
    st.lastUpdate = now;

    if (!st.sleeping) {
        st.hunger = Math.max(0, st.hunger - dt * 0.35);
        st.happiness = Math.max(0, st.happiness - dt * 0.25);
        st.energy = Math.max(0, st.energy - dt * 0.2);
        st.clean = Math.max(0, st.clean - dt * 0.18);
        // Poop rate increases when cleanliness is low
        var prevPoop = st.poop;
        var poopRate = st.clean < 30 ? 0.2 : 0.08;
        st.poop += dt * poopRate;
        if (prevPoop < 3 && st.poop >= 3) notify('씻겨줘!');
    } else {
        st.energy = Math.min(100, st.energy + dt * 1.5);
        st.hunger = Math.max(0, st.hunger - dt * 0.12);
        if (st.energy >= 100) {
            st.sleeping = false;
            notify('일어났다!');
        }
    }

    for (var k in st.cd) {
        if (st.cd[k] > 0) st.cd[k] = Math.max(0, st.cd[k] - dt * 1000);
    }

    if (st.poop >= 3) st.clean = Math.max(0, st.clean - dt * 0.4);

    if (st.hunger <= 0 && st.happiness <= 0) {
        st.dead = true;
        showDeath();
        return;
    }

    var avg = statAvg();
    if (avg > 70) addExp(dt * 0.15);

    // Low stat warnings (roughly every 30 seconds when low)
    if (!st.sleeping && Math.random() < 0.033) {
        if (st.hunger < 15) notify('배고파...');
        else if (st.energy < 15) notify('피곤해...');
        else if (st.clean < 15) notify('더러워...');
        else if (st.happiness < 15) notify('심심해...');
    }

    // Random events (roughly every 60 seconds)
    if (!st.sleeping && Math.random() < 0.016) {
        triggerRandomEvent();
    }

    updateUI();
    updateTimeOfDay();

    // Save every 10 ticks instead of every tick
    if (!tick._count) tick._count = 0;
    tick._count++;
    if (tick._count % 10 === 0) save();
}

var RANDOM_EVENTS = [
    { msg: '뭔가 발견했다!', hunger: 0, happy: 5, energy: 0, clean: 0, exp: 3 },
    { msg: '나비를 쫓았다~', hunger: 0, happy: 8, energy: -5, clean: 0, exp: 2 },
    { msg: '낮잠이 오는걸...', hunger: 0, happy: 0, energy: -10, clean: 0, exp: 0 },
    { msg: '맛있는 냄새가!', hunger: -8, happy: 3, energy: 0, clean: 0, exp: 0 },
    { msg: '비가 왔다!', hunger: 0, happy: -3, energy: 0, clean: 5, exp: 1 },
    { msg: '친구를 만났다!', hunger: 0, happy: 12, energy: -3, clean: 0, exp: 5 },
];

function triggerRandomEvent() {
    var evt = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    notify(evt.msg);
    st.hunger = Math.max(0, Math.min(100, st.hunger + (evt.hunger || 0)));
    st.happiness = Math.max(0, Math.min(100, st.happiness + (evt.happy || 0)));
    st.energy = Math.max(0, Math.min(100, st.energy + (evt.energy || 0)));
    st.clean = Math.max(0, Math.min(100, st.clean + (evt.clean || 0)));
    if (evt.exp > 0) addExp(evt.exp);
    if (typeof petHappyJump === 'function') petHappyJump();
}

// Day/night cycle - pet viewport background changes
var _petAreaEl = null;
var _lastTodHour = -1;
function updateTimeOfDay() {
    if (!_petAreaEl) _petAreaEl = document.querySelector('.pet-area');
    if (!_petAreaEl) return;
    var petArea = _petAreaEl;
    var hour = new Date().getHours();
    if (hour === _lastTodHour) return;
    _lastTodHour = hour;
    var bgColor, canvasBg;
    // 6-18: day, 18-21: sunset, 21-6: night
    if (hour >= 6 && hour < 18) {
        bgColor = '#c8d8b0';
        canvasBg = 0xc8d8b0;
    } else if (hour >= 18 && hour < 21) {
        bgColor = '#a8b098';
        canvasBg = 0xa8b098;
    } else {
        bgColor = '#6a7860';
        canvasBg = 0x6a7860;
    }
    petArea.style.background = bgColor;
    // Also update PixiJS canvas background
    if (R && R.app && R.app.renderer) {
        try { R.app.renderer.background.color = canvasBg; } catch(e) {}
    }
}

function addExp(n) {
    st.exp += n;
    var need = STAGES[st.stage].exp;
    if (st.exp >= need && st.stage < STAGES.length - 1) {
        st.stage++;
        st.exp = 0;
        notify(st.name + ' -> ' + STAGES[st.stage].name + ' 성장!');
        if (typeof celebrateEvolution === 'function') celebrateEvolution();
        if (typeof sfxEvolve === 'function') sfxEvolve();
    }
}

// ===== ACTIONS =====
function doAction(key) {
    if (key === 'status') { showStatOverlay(); return; }
    if (st.dead || st.cd[key] > 0) return;

    switch (key) {
        case 'feed':
            if (st.hunger >= 95) { notify('배불러!'); return; }
            st.hunger = Math.min(100, st.hunger + 25);
            st.clean = Math.max(0, st.clean - 3);
            addExp(5);
            floatText('+밥');
            st.cd.feed = 3000;
            if (typeof petEatAnim === 'function') petEatAnim();
            break;
        case 'play':
            if (st.energy < 15) { notify('너무 피곤해...'); return; }
            openMiniGame();
            return;
        case 'sleep':
            if (st.sleeping) {
                st.sleeping = false;
                notify('일어났다!');
            } else {
                if (st.energy >= 95) { notify('잠이 안 와!'); return; }
                st.sleeping = true;
            }
            st.cd.sleep = 2000;
            break;
        case 'clean':
            if (st.clean >= 95 && st.poop < 1) { notify('깨끗해!'); return; }
            st.clean = Math.min(100, st.clean + 30);
            st.poop = 0;
            addExp(3);
            floatText('+청결');
            st.cd.clean = 3000;
            if (typeof petCleanAnim === 'function') petCleanAnim();
            break;
    }
    if (navigator.vibrate) navigator.vibrate(20);
    if (typeof sfxClick === 'function') sfxClick();
    updateUI();
}

function showStatOverlay() {
    var ov = document.getElementById('statOverlay');
    if (!ov) return;

    // Show first, then update (so it's always visible even if update fails)
    ov.style.display = 'flex';

    try {
        var bars = [
            { bar: 'barHunger2', val: 'valHunger2', v: st.hunger },
            { bar: 'barHappy2', val: 'valHappy2', v: st.happiness },
            { bar: 'barEnergy2', val: 'valEnergy2', v: st.energy },
            { bar: 'barClean2', val: 'valClean2', v: st.clean },
        ];
        for (var i = 0; i < bars.length; i++) {
            var b = bars[i];
            var barEl = document.getElementById(b.bar);
            var valEl = document.getElementById(b.val);
            if (barEl) barEl.style.width = b.v + '%';
            if (valEl) valEl.textContent = Math.round(b.v);
        }
        var need = STAGES[st.stage].exp;
        var expBar = document.getElementById('barExp2');
        var expVal = document.getElementById('valExp2');
        if (need === Infinity) {
            if (expVal) expVal.textContent = 'MAX';
            if (expBar) expBar.style.width = '100%';
        } else {
            if (expVal) expVal.textContent = Math.floor(st.exp) + '/' + need;
            if (expBar) expBar.style.width = ((st.exp / need) * 100) + '%';
        }
    } catch(e) {}
}

function hideStatOverlay() {
    var ov = document.getElementById('statOverlay');
    if (ov) ov.style.display = 'none';
}

// ===== BUTTONS =====
function btnPrev() {
    selAction = (selAction + ACTIONS.length - 1) % ACTIONS.length;
    updateActionLabels();
}

function btnNext() {
    selAction = (selAction + 1) % ACTIONS.length;
    updateActionLabels();
}

function btnOk() {
    doAction(ACTION_KEYS[selAction]);
}

// ===== SAVE / LOAD =====
function save() {
    var data = {};
    for (var k in st) data[k] = st[k];
    data.lastUpdate = Date.now();
    localStorage.setItem('tamagoji', JSON.stringify(data));
}

function load() {
    var d = localStorage.getItem('tamagoji');
    if (d) {
        var s = JSON.parse(d);
        for (var k in s) st[k] = s[k];
        st.lastUpdate = Date.now();
        st.cd = { feed: 0, play: 0, sleep: 0, clean: 0 };
        return true;
    }
    return false;
}

// ===== DEATH / RESET =====
function resetGame() {
    if (!confirm('정말 다시 시작할까요?')) return;
    localStorage.removeItem('tamagoji');
    st = {
        name: '', hunger: 100, happiness: 100, energy: 100, clean: 100,
        exp: 0, stage: 0, sleeping: false, dead: false, poop: 0,
        lastUpdate: Date.now(), cd: { feed: 0, play: 0, sleep: 0, clean: 0 },
        birthTime: Date.now(),
    };
    selAction = 0;
    showScreen('name');
    DOM.nameInput.value = '';
}

// ===== START =====
function startGame() {
    var name = DOM.nameInput.value.trim();
    if (!name) {
        DOM.nameInput.style.borderColor = '#5a1d1d';
        return;
    }
    st.name = name;
    st.lastUpdate = Date.now();
    showScreen('game');

    // Initialize PixiJS renderer after game screen is visible
    if (!R || !R.ready) {
        createRenderer().then(function () {
            R.app.ticker.add(function () {
                drawPet();
            });
            updateUI();
            updateActionLabels();
        });
    } else {
        updateUI();
        updateActionLabels();
    }

    notify(name + ' 탄생!');
    save();

    // First-play hints
    setTimeout(function() { notify('< > 로 메뉴를 고르고 OK!'); }, 3000);
    setTimeout(function() { notify('배고프면 밥을 줘요~'); }, 6000);
}

function init() {
    cacheDom();

    // Event listeners
    document.getElementById('nameStartBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', resetGame);
    document.getElementById('btnPrev').addEventListener('click', btnPrev);
    document.getElementById('btnOk').addEventListener('click', btnOk);
    document.getElementById('btnNext').addEventListener('click', btnNext);
    document.getElementById('closeStatBtn').addEventListener('click', hideStatOverlay);
    document.getElementById('statBtn').addEventListener('click', showStatOverlay);

    DOM.nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') startGame();
    });

    // Action item click handlers
    for (var i = 0; i < DOM.actionItems.length; i++) {
        DOM.actionItems[i].addEventListener('click', function () {
            var idx = parseInt(this.getAttribute('data-idx'));
            selAction = idx;
            updateActionLabels();
            doAction(ACTION_KEYS[idx]);
        });
    }

    // Keyboard controls
    document.addEventListener('keydown', function (e) {
        if (DOM.nameScreen.style.display !== 'none') return;
        if (DOM.gameScreen.style.display === 'none') return;
        if (e.key === 'ArrowLeft') btnPrev();
        else if (e.key === 'ArrowRight') btnNext();
        else if (e.key === 'Enter' || e.key === ' ') btnOk();
    });

    // Check saved game
    if (load() && st.name) {
        showScreen('game');
        createRenderer().then(function () {
            R.app.ticker.add(function () {
                drawPet();
            });
            updateUI();
            updateActionLabels();
            if (st.dead) showDeath();
        });
    } else {
        showScreen('name');
    }

    setInterval(tick, 1000);
}

init();
