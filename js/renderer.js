// ===== PIXI RENDERER - Pet canvas only =====

var R = null;

function createRenderer() {
    var container = document.getElementById('petCanvas');
    var rect = container.getBoundingClientRect();
    var canvasW = Math.floor(rect.width);
    var canvasH = Math.floor(rect.height);

    var app = new PIXI.Application();

    var initPromise = app.init({
        width: canvasW,
        height: canvasH,
        backgroundColor: 0xc8d8b0,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: false,
    });

    R = {
        app: app,
        W: canvasW,
        H: canvasH,
        frame: 0,
        petContainer: null,
        ready: false,
    };

    return initPromise.then(function () {
        container.appendChild(app.canvas);

        // Make canvas fill the container
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';

        buildPetScene();
        R.ready = true;
        return R;
    });
}

function buildPetScene() {
    var centerX = R.W / 2;
    var centerY = R.H / 2;

    var petContainer = new PIXI.Container();
    petContainer.x = centerX;
    petContainer.y = centerY;
    R.app.stage.addChild(petContainer);
    R.petContainer = petContainer;

    var petGfx = new PIXI.Graphics();
    petContainer.addChild(petGfx);
    R._petGfx = petGfx;

    // Tap-to-pet interaction
    // Create invisible hit area covering the pet
    var hitArea = new PIXI.Graphics();
    hitArea.rect(-R.W * 0.4, -R.H * 0.4, R.W * 0.8, R.H * 0.8);
    hitArea.fill({ color: 0xffffff, alpha: 0.001 });
    hitArea.eventMode = 'static';
    hitArea.cursor = 'pointer';
    hitArea.on('pointerdown', function() {
        if (st.sleeping) return;
        // Pet reacts - small jump
        wander.jumpTimer = 15;
        // Float a heart-like symbol
        if (typeof floatText === 'function') floatText('~');
        if (typeof sfxClick === 'function') sfxClick();
        // Small happiness boost
        st.happiness = Math.min(100, st.happiness + 1);
    });
    petContainer.addChild(hitArea);

    // Pixel scale based on canvas size
    var maxDim = Math.min(R.W, R.H);
    R._px = Math.max(3, Math.floor(maxDim / 32));

    // Zzz text
    var zStyle = new PIXI.TextStyle({
        fontFamily: '"Press Start 2P", monospace',
        fontSize: Math.max(12, R._px * 2.2),
        fill: '#2d3a1d',
    });
    var zzz = new PIXI.Text({ text: 'Z z Z', style: zStyle });
    zzz.anchor.set(0.5);
    zzz.x = R._px * 8;
    zzz.y = -R._px * 8;
    zzz.visible = false;
    petContainer.addChild(zzz);
    R._zzz = zzz;

    // Poop indicator
    var pStyle = new PIXI.TextStyle({
        fontFamily: '"Press Start 2P", monospace',
        fontSize: Math.max(10, R._px * 1.6),
        fill: '#2d3a1d',
    });
    var poop = new PIXI.Text({ text: 'o~', style: pStyle });
    poop.anchor.set(0.5);
    poop.x = R._px * 9;
    poop.y = R._px * 7;
    poop.visible = false;
    petContainer.addChild(poop);
    R._poop = poop;

    // Ground line
    var ground = new PIXI.Graphics();
    var groundY = R._px * 11;
    for (var dx = -R._px * 12; dx < R._px * 12; dx += R._px * 1.5) {
        ground.rect(dx, groundY, R._px * 0.8, 2);
    }
    ground.fill({ color: 0x5a6b42 });
    petContainer.addChild(ground);

    // Small grass tufts along the ground
    var grass = new PIXI.Graphics();
    var grassPositions = [-10, -7, -3, 2, 6, 9];
    for (var gi = 0; gi < grassPositions.length; gi++) {
        var gx = grassPositions[gi] * R._px;
        var gy = groundY - 1;
        // Each tuft is 2-3 small vertical lines
        grass.rect(gx, gy - R._px * 0.8, 1, R._px * 0.8);
        grass.rect(gx + 2, gy - R._px * 1.2, 1, R._px * 1.2);
        grass.rect(gx + 4, gy - R._px * 0.6, 1, R._px * 0.6);
    }
    grass.fill({ color: 0x6a7a52 });
    petContainer.addChild(grass);
}

// ===== PET WANDERING STATE =====
var wander = { x: 0, y: 0, targetX: 0, targetY: 0, timer: 0, interval: 60, jumpY: 0, jumpTimer: 0 };

function updateWander() {
    if (st.sleeping) {
        wander.x *= 0.97;
        wander.y *= 0.97;
        wander.jumpY *= 0.95;
        return;
    }

    // Mood affects behavior
    var avg = (st.hunger + st.happiness + st.energy + st.clean) / 4;
    var speed = avg >= 60 ? 0.06 : avg >= 30 ? 0.03 : 0.015;
    var jumpChance = avg >= 60 ? 0.25 : avg >= 30 ? 0.1 : 0.02;

    wander.timer++;
    var interval = avg >= 60 ? (30 + Math.random() * 60) : (80 + Math.random() * 160);
    if (wander.timer >= interval) {
        wander.timer = 0;
        var range = avg >= 60 ? R._px * 10 : R._px * 4;
        wander.targetX = (Math.random() - 0.5) * range;
        wander.targetY = (Math.random() - 0.5) * range * 0.4;

        if (Math.random() < jumpChance) {
            wander.jumpTimer = 20;
        }
    }

    // Smooth movement (speed based on mood)
    wander.x += (wander.targetX - wander.x) * speed;
    wander.y += (wander.targetY - wander.y) * speed;

    // Jump animation
    if (wander.jumpTimer > 0) {
        wander.jumpTimer--;
        wander.jumpY = -Math.sin(wander.jumpTimer / 20 * Math.PI) * R._px * 4;
    } else {
        wander.jumpY *= 0.9;
    }
}

// ===== DRAW PET =====
function drawPet() {
    if (!R || !R.ready || !R._petGfx) return;

    R.frame++;
    var names = ['egg', 'baby', 'child', 'teen', 'adult'];
    var sprite = SPRITES[names[st.stage]];
    var px = R._px;

    updateWander();

    var bounce = st.sleeping
        ? Math.sin(R.frame * 0.03) * 2
        : Math.sin(R.frame * 0.06) * 3;

    // Apply wandering + jump offset to pet container
    R.petContainer.x = R.W / 2 + wander.x;
    R.petContainer.y = R.H / 2 + wander.y + wander.jumpY;

    R._petGfx.clear();

    var offsetX = -10 * px;
    var offsetY = -10 * px;

    for (var y = 0; y < 20; y++) {
        for (var x = 0; x < 20; x++) {
            if (sprite[y][x]) {
                R._petGfx.rect(offsetX + x * px, offsetY + y * px + bounce, px, px);
            }
        }
    }
    R._petGfx.fill('#3a4a2a');

    // Sad tears
    var avg = (st.hunger + st.happiness + st.energy + st.clean) / 4;
    if (avg < 25 && !st.sleeping && st.stage > 0) {
        var tearSize = Math.max(2, px * 0.4);
        R._petGfx.rect(offsetX + 6 * px + 2, offsetY + 7 * px + bounce + px, tearSize, px);
        R._petGfx.rect(offsetX + 13 * px + 2, offsetY + 7 * px + bounce + px, tearSize, px);
        R._petGfx.fill('#3a4a2a');
    }

    // Zzz animation
    if (st.sleeping && R._zzz.visible) {
        var zFloat = Math.sin(R.frame * 0.04) * R._px * 1.5;
        R._zzz.y = -R._px * 7 + zFloat;
        R._zzz.alpha = 0.4 + 0.6 * Math.abs(Math.sin(R.frame * 0.04));
    }
}

// ===== PET STATE UPDATES (called from game.js) =====
function updatePetOverlays() {
    if (!R || !R.ready) return;
    R._zzz.visible = st.sleeping;
    R._poop.visible = st.poop >= 3;
}

// ===== CELEBRATION EFFECT (particles in canvas) =====
function celebrateEvolution() {
    if (!R || !R.petContainer) return;
    var symbols = ['*', '+', '.', 'o'];
    var px = R._px;
    for (var i = 0; i < 12; i++) {
        (function (delay) {
            setTimeout(function () {
                var sym = symbols[Math.floor(Math.random() * symbols.length)];
                var style = new PIXI.TextStyle({
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: Math.max(8, px * (1.2 + Math.random() * 0.8)),
                    fill: '#2d3a1d',
                });
                var t = new PIXI.Text({ text: sym, style: style });
                t.anchor.set(0.5);
                var angle = (Math.PI * 2 / 12) * delay / 80;
                var radius = px * 5;
                t.x = Math.cos(angle) * radius * 0.5;
                t.y = Math.sin(angle) * radius * 0.5;
                R.petContainer.addChild(t);

                var startX = t.x;
                var startY = t.y;
                var elapsed = 0;
                var ticker = function (dt) {
                    elapsed += dt.deltaTime * 16.67;
                    var p = elapsed / 600;
                    t.x = startX + Math.cos(angle) * radius * p;
                    t.y = startY + Math.sin(angle) * radius * p - px * 3 * p;
                    t.alpha = 1 - p;
                    t.rotation = p * 2;
                    if (p >= 1) {
                        PIXI.Ticker.shared.remove(ticker);
                        if (t.parent) t.parent.removeChild(t);
                        t.destroy();
                    }
                };
                PIXI.Ticker.shared.add(ticker);
            }, delay);
        })(i * 80);
    }
}

// ===== PET ACTION ANIMATIONS =====

// Eating animation: pet bobs up and down rapidly (nom nom)
function petEatAnim() {
    if (!R || !R.petContainer) return;
    var count = 0;
    var ticker = function(dt) {
        count += dt.deltaTime * 16.67;
        var phase = count / 80;
        R.petContainer.scale.y = 1 + Math.sin(phase * Math.PI * 2) * 0.08;
        R.petContainer.scale.x = 1 - Math.sin(phase * Math.PI * 2) * 0.05;
        if (count >= 600) {
            R.petContainer.scale.set(1, 1);
            PIXI.Ticker.shared.remove(ticker);
        }
    };
    PIXI.Ticker.shared.add(ticker);
}

// Cleaning animation: pet spins/shakes
function petCleanAnim() {
    if (!R || !R.petContainer) return;
    var count = 0;
    var ticker = function(dt) {
        count += dt.deltaTime * 16.67;
        var p = count / 500;
        R.petContainer.rotation = Math.sin(p * Math.PI * 6) * 0.15 * (1 - p);
        if (count >= 500) {
            R.petContainer.rotation = 0;
            PIXI.Ticker.shared.remove(ticker);
        }
    };
    PIXI.Ticker.shared.add(ticker);
}

// Happy jump animation (after winning game)
function petHappyJump() {
    if (!R || !R.petContainer) return;
    var count = 0;
    var baseY = R.petContainer.y;
    var ticker = function(dt) {
        count += dt.deltaTime * 16.67;
        var p = count / 400;
        wander.jumpY = -Math.abs(Math.sin(p * Math.PI * 3)) * R._px * 5 * (1 - p);
        if (count >= 400) {
            wander.jumpY = 0;
            PIXI.Ticker.shared.remove(ticker);
        }
    };
    PIXI.Ticker.shared.add(ticker);
}
