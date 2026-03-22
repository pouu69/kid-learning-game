// js/effects.js
// TTS 발음 + 효과음 + 파티클

function speakText(text, rate) {
  if (!('speechSynthesis' in window)) return;
  var u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = rate || 0.8;
  u.pitch = 1.1;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

var _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return _audioCtx;
}

function playSound(type) {
  var ctx = getAudioCtx();
  if (!ctx) return;
  try {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;

    if (type === 'correct') {
      osc.frequency.value = 523;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = function() { osc.disconnect(); gain.disconnect(); };
      setTimeout(function() {
        var o2 = ctx.createOscillator();
        var g2 = ctx.createGain();
        o2.connect(g2);
        g2.connect(ctx.destination);
        o2.frequency.value = 659;
        o2.type = 'sine';
        g2.gain.value = 0.15;
        g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        o2.start();
        o2.stop(ctx.currentTime + 0.3);
        o2.onended = function() { o2.disconnect(); g2.disconnect(); };
      }, 150);
    } else if (type === 'click') {
      osc.frequency.value = 800;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
      osc.onended = function() { osc.disconnect(); gain.disconnect(); };
    } else if (type === 'evolve') {
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.value = 0.2;
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      osc.onended = function() { osc.disconnect(); gain.disconnect(); };
    }
  } catch(e) {}
}

function showStarParticles(x, y, count) {
  if (typeof World === 'undefined' || !World.app) return;
  var n = Math.min(count || 15, 50);
  for (var i = 0; i < n; i++) {
    var star = new PIXI.Text({
      text: '*',
      style: { fontSize: 12 + Math.random() * 12, fill: 0xf0d060, fontWeight: 'bold' }
    });
    star.x = x + (Math.random() - 0.5) * 100;
    star.y = y + (Math.random() - 0.5) * 80;
    star.alpha = 0.8;
    star._vx = (Math.random() - 0.5) * 2;
    star._vy = -1 - Math.random() * 2;
    star._life = 60;
    World.app.stage.addChild(star);

    (function(s) {
      var ticker = function() {
        s.x += s._vx;
        s.y += s._vy;
        s._vy += 0.03;
        s.alpha -= 0.013;
        s._life--;
        if (s._life <= 0) {
          World.app.stage.removeChild(s);
          World.app.ticker.remove(ticker);
          s.destroy();
        }
      };
      World.app.ticker.add(ticker);
    })(star);
  }
}
