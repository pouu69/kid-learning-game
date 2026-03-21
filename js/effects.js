// ===== EFFECTS (CSS-based + Audio) =====

// Simple beep sounds using Web Audio API
var _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) {
        try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return _audioCtx;
}

function playBeep(freq, duration, vol) {
    var ctx = getAudioCtx();
    if (!ctx) return;
    try {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq || 440;
        gain.gain.value = vol || 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.1));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + (duration || 0.1));
    } catch(e) {}
}

function sfxClick() { playBeep(800, 0.05, 0.06); }
function sfxGood() { playBeep(523, 0.08, 0.06); setTimeout(function(){ playBeep(659, 0.08, 0.06); }, 80); setTimeout(function(){ playBeep(784, 0.12, 0.06); }, 160); }
function sfxBad() { playBeep(300, 0.15, 0.06); setTimeout(function(){ playBeep(200, 0.2, 0.06); }, 150); }
function sfxEvolve() { playBeep(523, 0.1, 0.08); setTimeout(function(){ playBeep(659, 0.1, 0.08); }, 120); setTimeout(function(){ playBeep(784, 0.1, 0.08); }, 240); setTimeout(function(){ playBeep(1047, 0.2, 0.08); }, 360); }

var _notifTimeout = null;

function notify(msg) {
    var el = document.getElementById('notification');
    if (!el) return;

    el.textContent = msg;

    // Reset animation
    el.classList.remove('show');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('show');

    clearTimeout(_notifTimeout);
    _notifTimeout = setTimeout(function () {
        el.classList.remove('show');
    }, 1800);
}

function floatText(text) {
    var container = document.getElementById('floatContainer');
    var petArea = document.getElementById('petCanvas');
    if (!container || !petArea) return;

    var rect = petArea.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 60) + 'px';
    el.style.top = (rect.top + rect.height * 0.35) + 'px';
    container.appendChild(el);

    setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
    }, 850);
}
