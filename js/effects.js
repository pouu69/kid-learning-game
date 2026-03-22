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

function showCelebration(x, y) {
  showStarParticles(x, y, 25);
  if (typeof World === 'undefined' || !World.app) return;
  var colors = [0xf4b870, 0xf08080, 0xa8d8b0, 0x88c8e8, 0xc8a0d8, 0xf0d060];
  for (var i = 0; i < 12; i++) {
    var circle = new PIXI.Graphics();
    var color = colors[Math.floor(Math.random() * colors.length)];
    var size = 4 + Math.random() * 8;
    circle.circle(0, 0, size).fill({ color: color });
    circle.x = x + (Math.random() - 0.5) * 120;
    circle.y = y + (Math.random() - 0.5) * 100;
    circle.alpha = 0.9;
    circle._vx = (Math.random() - 0.5) * 3;
    circle._vy = -2 - Math.random() * 3;
    circle._life = 50 + Math.random() * 30;
    World.app.stage.addChild(circle);
    (function(c) {
      var ticker = function() {
        c.x += c._vx;
        c.y += c._vy;
        c._vy += 0.05;
        c.alpha -= 0.012;
        c._life--;
        if (c._life <= 0) {
          World.app.stage.removeChild(c);
          World.app.ticker.remove(ticker);
          c.destroy();
        }
      };
      World.app.ticker.add(ticker);
    })(circle);
  }
}

function flashScreen() {
  var flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:white;opacity:0.6;z-index:9999;pointer-events:none;transition:opacity 0.5s';
  document.body.appendChild(flash);
  setTimeout(function() { flash.style.opacity = '0'; }, 50);
  setTimeout(function() { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 600);
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
