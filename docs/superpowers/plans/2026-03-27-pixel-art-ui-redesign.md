# Pixel Art UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Tamagoji from picture-book/glass-morphism style to pixel art game aesthetic with non-literate UX patterns for 5-6 year olds.

**Architecture:** Replace all visual rendering (PixiJS Graphics procedural + CSS) with pixel-block style while preserving existing game logic, state management, and learning mechanics. DOM stays for HUD/buttons/learning; PixiJS stays for world/pet/effects.

**Tech Stack:** PixiJS 8.x (procedural Graphics API), vanilla JS, CSS3, localStorage, DungGeunMo font

**Spec:** `docs/superpowers/specs/2026-03-27-pixel-art-ui-redesign.md`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `index.html` | Font imports, meta theme-color, HUD markup | Modify |
| `css/styles.css` | All CSS: tokens, buttons, HUD, learning popups | Rewrite |
| `js/world.js` | Sky, grass, clouds, decorations, day/night, flowers | Modify |
| `js/renderer.js` | Pet sprite drawing, expressions, physics, behaviors | Modify |
| `js/sprites.js` | Pet stage descriptors (colors, sizes, features) | Modify |
| `js/pet.js` | Pet request logic, mood, speech | Modify (minor) |
| `js/effects.js` | Particles, sounds, screen transitions | Modify |
| `js/game.js` | Screen transitions, home update, learning entry | Modify |
| `js/learning.js` | Learning popup structure | Modify (CSS classes) |
| `js/activities/care.js` | Care mini-game visuals | Modify (CSS classes) |
| `js/activities/meet.js` | Meet activity visuals | Modify (CSS classes) |
| `js/activities/play.js` | Play activity visuals | Modify (CSS classes) |

---

## Task 1: Design Tokens & Font

**Files:**
- Modify: `index.html:11-13` (font imports)
- Modify: `css/styles.css:1-21` (design tokens)

- [ ] **Step 1: Replace font imports in index.html**

Replace the Google Fonts link with DungGeunMo + Noto Sans KR (fallback for learning content):

```html
<link href="https://cdn.jsdelivr.net/npm/dunggeunmo-font/dunggeunmo.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
```

Also update `<meta name="theme-color" content="#1a1830">`.

- [ ] **Step 2: Replace CSS design tokens**

Replace the `:root` block in `css/styles.css:4-21`:

```css
:root {
    /* Pixel art palette — Day */
    --sky-deep:    #3878c0;
    --sky-light:   #88c8f8;
    --grass-light: #68c048;
    --grass-deep:  #489030;

    /* Pixel art palette — Night */
    --sky-deep-n:    #0a0820;
    --sky-light-n:   #282858;
    --grass-light-n: #1a3818;
    --grass-deep-n:  #0c2008;

    /* UI chrome */
    --ui-bg:       #1a1830;
    --ui-border:   #6a4c9c;
    --ui-bg-n:     #0a0820;
    --ui-border-n: #383858;

    /* Accent colors */
    --gold:        #f8d848;
    --red:         #f86868;
    --purple:      #a888d0;
    --orange:      #f8c848;
    --blue:        #58b8f8;
    --text-light:  #f0e8ff;
    --text-dark:   #1a1830;

    /* Fonts */
    --font-pixel:  'DungGeunMo', monospace;
    --font-body:   'Noto Sans KR', sans-serif;

    --vh: 1vh;
}
```

- [ ] **Step 3: Update body and base styles**

Replace body styles to use pixel font and dark UI background:

```css
body {
    font-family: var(--font-pixel);
    background: var(--ui-bg);
    color: var(--text-light);
}
```

- [ ] **Step 4: Verify font loads**

Open in iPad Safari. Confirm DungGeunMo renders Korean text in pixel style. Check fallback to monospace if CDN fails.

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: replace design tokens with pixel art palette and DungGeunMo font"
```

---

## Task 2: World — Sky, Grass & Day/Night

**Files:**
- Modify: `js/world.js:209-306` (`updateTimeOfDay()` — sky, sun/moon/stars, grass)

- [ ] **Step 1: Rewrite `updateTimeOfDay()` to 2-phase day/night**

Replace `world.js:209-306`. Key changes:
- Remove sunset case (lines 222-227)
- Change boundary to hour >= 7 && hour < 19 for day
- Use spec colors: day sky `0x3878c0` → `0x88c8f8`, night `0x0a0820` → `0x282858`
- Draw sky as flat pixel-block strips (fewer steps, wider bands for blocky feel)
- Pixel-style sun: square with cross rays (`rect` calls, not `circle`)
- Pixel-style crescent moon: overlapping rects
- Stars as small white rects (not circles)
- Grass: flat horizontal rects (not ellipse hills). Top edge: alternating height blocks for grass tufts

```javascript
updateTimeOfDay: function() {
    var hour = new Date().getHours();
    var W = this.app.screen.width;
    var H = this.app.screen.height;
    var isNight = !(hour >= 7 && hour < 19);
    this._isNight = isNight;

    var skyTop = isNight ? 0x0a0820 : 0x3878c0;
    var skyBot = isNight ? 0x282858 : 0x88c8f8;

    // Sky: 12 horizontal strips for blocky pixel gradient
    var gfx = this._skyGfx;
    gfx.clear();
    var steps = 12;
    for (var i = 0; i < steps; i++) {
        var t = i / (steps - 1);
        var r = Math.round(_lerpChannel(skyTop >> 16 & 0xff, skyBot >> 16 & 0xff, t));
        var g = Math.round(_lerpChannel(skyTop >> 8  & 0xff, skyBot >> 8  & 0xff, t));
        var b = Math.round(_lerpChannel(skyTop       & 0xff, skyBot       & 0xff, t));
        var col = (r << 16) | (g << 8) | b;
        var stripY = Math.floor(H * 0.55 * i / steps);
        var stripH = Math.ceil(H * 0.55 / steps) + 1;
        gfx.rect(0, stripY, W, stripH);
        gfx.fill({ color: col });
    }

    // Sun or Moon
    this._sunGfx.clear();
    this._moonGfx.clear();
    this._starsGfx.clear();
    var cx = W * 0.85;
    var cy = H * 0.10;

    if (!isNight) {
        // Pixel sun: center square + 4 ray rects
        var ss = 14;
        this._sunGfx.rect(cx - ss, cy - ss, ss * 2, ss * 2);
        this._sunGfx.fill({ color: 0xf8e060 });
        // Rays
        this._sunGfx.rect(cx - 2, cy - ss - 6, 4, 6).fill({ color: 0xf8e060 });
        this._sunGfx.rect(cx - 2, cy + ss, 4, 6).fill({ color: 0xf8e060 });
        this._sunGfx.rect(cx - ss - 6, cy - 2, 6, 4).fill({ color: 0xf8e060 });
        this._sunGfx.rect(cx + ss, cy - 2, 6, 4).fill({ color: 0xf8e060 });
    } else {
        // Pixel crescent moon
        this._moonGfx.rect(cx - 10, cy - 12, 20, 24);
        this._moonGfx.fill({ color: 0xf8f0c0 });
        this._moonGfx.rect(cx - 4, cy - 14, 18, 22);
        this._moonGfx.fill({ color: skyTop }); // cut-out

        // Stars: small rects
        var starPos = [
            [0.12,0.07],[0.28,0.04],[0.45,0.09],[0.60,0.05],
            [0.20,0.15],[0.50,0.18],[0.70,0.12],[0.35,0.22],
        ];
        for (var si = 0; si < starPos.length; si++) {
            var sx = starPos[si][0] * W;
            var sy = starPos[si][1] * H;
            var sz = 2 + Math.floor(Math.random() * 2);
            this._starsGfx.rect(sx, sy, sz, sz);
            this._starsGfx.fill({ color: 0xf8f0c0, alpha: 0.5 + Math.random() * 0.5 });
        }
    }

    // Grass: flat rect with pixel tufts
    this._grassGfx.clear();
    var grassY = Math.floor(H * 0.55);
    // Main grass body
    this._grassGfx.rect(0, grassY, W, H - grassY);
    this._grassGfx.fill({ color: isNight ? 0x1a3818 : 0x68c048 });
    // Darker bottom
    this._grassGfx.rect(0, grassY + (H - grassY) * 0.5, W, (H - grassY) * 0.5);
    this._grassGfx.fill({ color: isNight ? 0x0c2008 : 0x489030 });
    // Pixel tufts along top edge
    var tuftW = 12;
    var tuftColor = isNight ? 0x285020 : 0x78d058;
    for (var ti = 0; ti < W; ti += tuftW * 2) {
        var th = 4 + Math.floor(Math.random() * 8);
        this._grassGfx.rect(ti, grassY - th, tuftW, th);
        this._grassGfx.fill({ color: tuftColor });
    }
},
```

- [ ] **Step 2: Rewrite `_addDecorations()` with pixel-style objects**

Replace `world.js:117-186`. New decorations:
- **Pixel tree** (left side): brown rect trunk + 3 stacked green rects (triangle approximation)
- **Pixel flowers**: small colored squares on green stem rects
- **Pixel fence** (right side): brown rect posts + horizontal bars
- **Pixel mushroom**: red rect cap with white square dots + beige rect stem
- Remove butterfly (replace with birds or remove)

- [ ] **Step 3: Rewrite `_buildClouds()` and `_drawClouds()` with pixel blocks**

Replace `world.js:188-323`. Pixel clouds = groups of white rects at different heights:

```javascript
_drawClouds: function() {
    var gfx = this._cloudGfx;
    gfx.clear();
    if (this._isNight) return; // No clouds at night
    for (var i = 0; i < this.clouds.length; i++) {
        var c = this.clouds[i];
        var bw = 8; // block width
        // Bottom row (widest)
        gfx.rect(c.x - bw*2, c.y, bw*4, bw);
        gfx.fill({ color: 0xffffff, alpha: c.alpha });
        // Middle row
        gfx.rect(c.x - bw*2.5, c.y - bw, bw*5, bw);
        gfx.fill({ color: 0xffffff, alpha: c.alpha });
        // Top row (narrowest)
        gfx.rect(c.x - bw, c.y - bw*2, bw*2, bw);
        gfx.fill({ color: 0xffffff, alpha: c.alpha });
    }
},
```

- [ ] **Step 4: Update `_spawnAmbientParticle()` for pixel fireflies**

Replace `world.js:618-662`. Night fireflies = small green-yellow rects with glow. Day = remove dandelion seeds (or make them pixel squares).

- [ ] **Step 5: Verify day/night**

Temporarily change the hour check to test both modes. Verify pixel sky, sun/moon, grass, clouds, decorations render correctly on iPad.

- [ ] **Step 6: Commit**

```bash
git add js/world.js
git commit -m "feat: pixel art world with 2-phase day/night, blocky sky, grass, clouds, decorations"
```

---

## Task 3: Pet Sprite — Pixel Art Rendering

**Files:**
- Modify: `js/sprites.js:1-61` (stage descriptors)
- Modify: `js/renderer.js:223-372` (`_drawBody()`, `setExpression()`)

- [ ] **Step 1: Update `PET_STAGES` pixel art parameters**

Replace `sprites.js`. Keep 8 entries (renderer clamps to valid range). Update colors and add pixel-specific data:

```javascript
var PET_STAGES = [
  { name: '알', bodyW: 60, bodyH: 72, hasEyes: false, hasFeet: false,
    color: 0xf8e8d0, strokeColor: 0xd8b898, strokeW: 4 },
  { name: '갓 태어남', bodyW: 64, bodyH: 64, hasEyes: true, hasFeet: false,
    color: 0xf8f0c0, strokeColor: 0xe0d090, strokeW: 4, eyeSize: 8 },
  { name: '아기', bodyW: 68, bodyH: 70, hasEyes: true, hasFeet: true,
    color: 0xf8d8c8, strokeColor: 0xe0b0a0, strokeW: 4, eyeSize: 8 },
  { name: '호기심쟁이', bodyW: 72, bodyH: 76, hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf8c878, strokeColor: 0xd09840, strokeW: 4, eyeSize: 9 },
  { name: '말하기 시작', bodyW: 76, bodyH: 82, hasEyes: true, hasFeet: true, hasEars: true,
    color: 0xf0b888, strokeColor: 0xd89060, strokeW: 4, eyeSize: 9 },
  { name: '수다쟁이', bodyW: 80, bodyH: 88, hasEyes: true, hasFeet: true, hasEars: true, hasArms: true,
    color: 0xe8a898, strokeColor: 0xc88070, strokeW: 4, eyeSize: 9 },
  { name: '글자 요리사', bodyW: 84, bodyH: 92, hasEyes: true, hasFeet: true, hasEars: true, hasArms: true, hasCrown: true,
    color: 0xd0b8e8, strokeColor: 0xb090c8, strokeW: 4, eyeSize: 9 },
  { name: '다 큰 펫', bodyW: 90, bodyH: 98, hasEyes: true, hasFeet: true, hasEars: true, hasArms: true, hasCrown: true, hasWings: true,
    color: 0xa8d0f0, strokeColor: 0x80b0d8, strokeW: 4, eyeSize: 10 },
];
```

Note: Sizes reduced from original (120-194px) because pixel art uses smaller, chunkier shapes. The rendering will use `rect()` instead of `roundRect()`/`ellipse()`.

- [ ] **Step 2: Rewrite `_drawBody()` with pixel block rendering**

Replace `renderer.js:223-372`. Key changes:
- Body: `rect()` with thick border (stroke or double-rect technique) instead of `roundRect()`
- Eyes: Small rects with white highlight square (top-left pixel)
- Mouth: Rect-based expressions
- Ears: Small rects above body
- Feet: Small rects below body
- Arms: Small rects to sides
- Crown: Stepped rect pyramid (3 blocks)
- Cheeks: Small colored rects with low alpha
- All positions relative to `data.bodyW` / `data.bodyH`

- [ ] **Step 3: Rewrite `setExpression()` with pixel expressions**

Replace `renderer.js:374+`. Pixel expressions:
- **happy**: eyes = rects, mouth = wide rect gap
- **sad**: eyes = rects (lower), mouth = small rect
- **sleeping**: eyes = horizontal line rects, mouth = small circle-approximation
- **neutral**: standard rect eyes, no mouth gap

- [ ] **Step 4: Update shadow**

Replace `renderer.js:66-70`. Shadow = flat dark rect instead of ellipse:

```javascript
var shadow = new PIXI.Graphics();
shadow.rect(-30, 0, 60, 8);
shadow.fill({ color: 0x000000, alpha: 0.12 });
shadow.y = 50;
```

- [ ] **Step 5: Update zzz text to pixel font**

Replace `renderer.js:75-87`. Change font to DungGeunMo:

```javascript
var zStyle = new PIXI.TextStyle({
    fontFamily: '"DungGeunMo", monospace',
    fontSize: 16,
    fontWeight: 'bold',
    fill: '#a888d0',
});
```

- [ ] **Step 6: Verify all 8 evolution stages render**

Manually set `st.stage` to 0-7 in console and call `PetRenderer.buildPet(N)`. Verify each stage looks correct in pixel style.

- [ ] **Step 7: Commit**

```bash
git add js/sprites.js js/renderer.js
git commit -m "feat: pixel art pet sprites with block-based rendering for all 8 stages"
```

---

## Task 4: Pet Behaviors — Exaggerated State Actions

**Files:**
- Modify: `js/renderer.js` (animate function, ~line 400+)
- Modify: `js/pet.js:7-13` (minor: no logic change, just reference)

- [ ] **Step 1: Add state behavior properties to PetRenderer**

Add new properties at top of `PetRenderer` object:

```javascript
_stateAction: null,     // 'hungry_wobble'|'sleepy_nod'|'sad_crouch'|null
_stateActionFrame: 0,
_needIconGfx: null,     // floating icon above pet (bowl/Z/cloud)
```

- [ ] **Step 2: Add `updateStateBehavior(request)` method**

New method that sets `_stateAction` based on `Pet.request`:
- `'hungry'` → pet wobbles side-to-side, then flops down. Draw empty bowl icon above head.
- `'sleepy'` → pet nods forward/back (rotation oscillation), getting slower. Large Z rects float up.
- `'bored'` → pet walks to corner, turns away (flip scaleX). Dark cloud icon above head.
- `null` → normal idle (walk + occasional jump)

- [ ] **Step 3: Implement hungry behavior in `animate()`**

In the animate loop, when `_stateAction === 'hungry_wobble'`:
- Rotate body left/right: `container.rotation = Math.sin(frame * 0.08) * 0.15`
- Every 180 frames: flop down (scaleY squash to 0.6, y offset +20)
- Floating bowl icon: rect-based pixel bowl graphic, bobs up/down above pet

- [ ] **Step 4: Implement sleepy behavior in `animate()`**

When `_stateAction === 'sleepy_nod'`:
- Forward/back nod: `container.rotation = Math.sin(frame * 0.04) * 0.2`
- Slow down wander speed by 70%
- Large Z rects float upward and fade (spawn every 60 frames, max 3)

- [ ] **Step 5: Implement sad/bored behavior in `animate()`**

When `_stateAction === 'sad_crouch'`:
- Pet walks to left 15% of screen, stops
- FlipX (face away from center): `container.scale.x = -1`
- Dark cloud icon: gray rect cloud above head, small rect "rain drops" underneath

- [ ] **Step 6: Add "pet points at button" indicator**

When a state action is active, draw a small bouncing arrow (pixel rects) below the pet, pointing downward toward the care bar. The arrow matches the color of the relevant button (red for feed, purple for sleep, etc).

- [ ] **Step 7: Connect to game loop**

In `game.js` `updateHome()` (or wherever `Pet.updateRequest()` is called), after updating request, call:

```javascript
if (typeof PetRenderer !== 'undefined') {
    PetRenderer.updateStateBehavior(Pet.request);
}
```

- [ ] **Step 8: Verify each state**

Set stats manually via console:
- `st.hunger = 20; updateHome(st);` → verify hungry behavior
- `st.sleepy = 85; updateHome(st);` → verify sleepy behavior
- `st.mood = 30; updateHome(st);` → verify sad behavior

- [ ] **Step 9: Commit**

```bash
git add js/renderer.js js/game.js
git commit -m "feat: exaggerated pet state behaviors for non-literate UX"
```

---

## Task 5: Tap Effects & Celebration Particles

**Files:**
- Modify: `js/renderer.js` (pointerdown handler, ~line 98-103)
- Modify: `js/effects.js` (particle system)

- [ ] **Step 1: Add pixel particle system to PetRenderer**

Add `emitPixelParticles(type, count)` method. Types:
- `'star'`: gold rect particles that burst outward + fade
- `'heart'`: red rect particles (2x2 cross shape approximation)
- `'sparkle'`: white/yellow rect particles that twinkle (alpha oscillation)

Each particle: `{ gfx, x, y, vx, vy, life, maxLife }`

- [ ] **Step 2: Wire tap to particle emission**

In the existing `pointerdown` → `handleAction('pet')` flow, after the action:
- Emit 6-8 mixed sparkle/star particles around tap position
- Play `playSound('pop')` — a short high-pitched beep

- [ ] **Step 3: Add celebration effect for care completion**

New function `PetRenderer.celebrate()`:
- Pet jumps high (jumpY = -40)
- Emit 12 star particles in burst pattern
- Flash pet body brighter for 10 frames
- Play `playSound('success')`

- [ ] **Step 4: Add screen shake for critical state**

New function `PetRenderer.screenShake(intensity)`:
- Oscillate `World.app.stage.x` and `.y` by ±intensity pixels for 20 frames
- Called when hunger < 15, mood < 20, or sleepy > 90

- [ ] **Step 5: Verify effects**

Tap pet → sparkles. Complete a care action → celebration. Set extreme stats → screen shake.

- [ ] **Step 6: Commit**

```bash
git add js/renderer.js js/effects.js
git commit -m "feat: pixel particle effects for tap, celebration, and screen shake"
```

---

## Task 6: HUD — Pixel Stat Bars & Name Badge

**Files:**
- Modify: `index.html:42-73` (HUD markup)
- Modify: `css/styles.css` (HUD styles)
- Modify: `js/game.js` (updateHome stat display logic)

- [ ] **Step 1: Replace HUD markup**

Replace SVG circular gauges (`index.html:51-73`) with horizontal pixel bars:

```html
<div class="stat-gauges pixel-panel" id="statGauges">
    <div class="stat-bar">
        <span class="stat-icon" style="color: var(--red);">&#9829;</span>
        <div class="stat-bar-track"><div class="stat-bar-fill stat-fill-hunger" id="fillHunger"></div></div>
    </div>
    <div class="stat-bar">
        <span class="stat-icon" style="color: var(--orange);">&#9786;</span>
        <div class="stat-bar-track"><div class="stat-bar-fill stat-fill-mood" id="fillMood"></div></div>
    </div>
    <div class="stat-bar">
        <span class="stat-icon" style="color: var(--purple);">&#9790;</span>
        <div class="stat-bar-track"><div class="stat-bar-fill stat-fill-sleepy" id="fillSleepy"></div></div>
    </div>
</div>
```

- [ ] **Step 2: Replace pet-info badge markup**

Update `index.html:44-47`:

```html
<div class="pet-info pixel-panel" id="petInfo">
    <span class="pixel-star">&#9733;</span>
    <span class="pet-name" id="petNameLabel"></span>
    <span class="pet-level" id="petStageLabel"></span>
</div>
```

- [ ] **Step 3: Write pixel HUD CSS**

```css
.pixel-panel {
    background: var(--ui-bg);
    border: 3px solid var(--ui-border);
    border-radius: 4px;
    box-shadow: 0 3px 0 #0a0818;
    padding: 6px 10px;
}

.stat-bar { display: flex; align-items: center; gap: 4px; }
.stat-icon { font-family: var(--font-pixel); font-size: 12px; width: 14px; text-align: center; }
.stat-bar-track {
    width: 52px; height: 8px;
    background: #0a0818;
    border-radius: 1px;
    overflow: hidden;
}
.stat-bar-fill {
    height: 100%;
    transition: width 0.3s ease;
    position: relative;
}
.stat-bar-fill::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: rgba(255,255,255,0.3);
}
.stat-fill-hunger { background: linear-gradient(90deg, var(--red), #f8a8a8); }
.stat-fill-mood { background: linear-gradient(90deg, var(--orange), #f8e888); }
.stat-fill-sleepy { background: linear-gradient(90deg, var(--purple), #c8b0e8); }

.pet-info {
    display: flex; align-items: center; gap: 6px;
    border-color: var(--gold);
}
.pixel-star { color: var(--gold); font-size: 14px; }
.pet-name { color: var(--text-light); font-family: var(--font-pixel); font-size: 14px; font-weight: bold; }
.pet-level {
    background: var(--gold); color: var(--text-dark);
    font-family: var(--font-pixel); font-size: 9px; font-weight: bold;
    padding: 1px 4px; border-radius: 2px;
}

/* Blink animation for low stats */
@keyframes statBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.stat-bar-fill.low { animation: statBlink 1s ease infinite; }
```

- [ ] **Step 4: Update `updateHome()` in game.js**

Replace SVG gauge update logic with simple width percentage:

```javascript
document.getElementById('fillHunger').style.width = st.hunger + '%';
document.getElementById('fillMood').style.width = st.mood + '%';
document.getElementById('fillSleepy').style.width = (100 - st.sleepy) + '%';

// Add/remove .low class for blink
document.getElementById('fillHunger').classList.toggle('low', st.hunger < 30);
document.getElementById('fillMood').classList.toggle('low', st.mood < 40);
document.getElementById('fillSleepy').classList.toggle('low', st.sleepy > 80);
```

- [ ] **Step 5: Remove old SVG gauge CSS**

Delete all `.stat-gauge`, `.gauge-ring`, `.gauge-fill`, `.gauge-bg`, `.gauge-icon` rules from `styles.css`.

- [ ] **Step 6: Verify HUD**

Check pixel stat bars render, fill correctly, blink on low values. Name badge shows with gold border.

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css js/game.js
git commit -m "feat: pixel art HUD with horizontal stat bars and name badge"
```

---

## Task 7: Care Bar — Pixel Buttons

**Files:**
- Modify: `index.html` (care bar markup)
- Modify: `css/styles.css` (button styles)

- [ ] **Step 1: Replace care bar markup**

Replace existing care bar buttons with pixel-styled versions. Each button has an icon container + text label:

```html
<div class="care-bar">
    <button class="care-btn" data-action="feed" onclick="handleAction('feed')">
        <div class="care-icon care-icon-feed"></div>
        <span>밥</span>
    </button>
    <button class="care-btn" data-action="sleep" onclick="handleAction('sleep')">
        <div class="care-icon care-icon-sleep"></div>
        <span>잠</span>
    </button>
    <button class="care-btn" data-action="wash" onclick="handleAction('wash')">
        <div class="care-icon care-icon-wash"></div>
        <span>씻기</span>
    </button>
    <button class="care-btn care-btn-learn" data-action="learn" onclick="handleAction('learn')">
        <div class="care-icon care-icon-learn">ㄱ</div>
        <span>배우기</span>
    </button>
</div>
```

- [ ] **Step 2: Write pixel button CSS**

```css
.care-bar {
    background: var(--ui-bg);
    border-top: 3px solid var(--ui-border);
    padding: 8px 10px;
    display: flex;
    gap: 6px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

.care-btn {
    flex: 1;
    background: linear-gradient(180deg, #383058 0%, #282048 100%);
    border: 3px solid var(--ui-border);
    border-radius: 6px;
    padding: 8px 4px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    box-shadow: 0 3px 0 #181028;
    min-height: 56px;
    position: relative;
    font-family: var(--font-pixel);
    color: var(--text-light);
    font-size: 11px;
    font-weight: bold;
    touch-action: manipulation;
}

.care-btn:active {
    box-shadow: none;
    transform: translateY(3px);
}

.care-btn-learn {
    background: linear-gradient(180deg, #6a4c9c 0%, #483868 100%);
    border-color: #8868c0;
    box-shadow: 0 3px 0 #2a1848;
}
.care-btn-learn span { color: #f8e888; }

.care-icon {
    width: 26px; height: 26px;
    border: 2px solid;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.care-icon-feed { background: var(--red); border-color: #c04848; }
.care-icon-sleep { background: var(--purple); border-color: #7858a0; }
.care-icon-wash { background: var(--blue); border-color: #3888c0; }
.care-icon-learn {
    background: var(--gold); border-color: #d0a830;
    font-family: var(--font-pixel); font-size: 14px; font-weight: bold;
    color: var(--text-dark);
}

/* Bounce animation for urgent buttons */
@keyframes btnBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
}
.care-btn.urgent {
    animation: btnBounce 0.8s ease infinite;
}
.care-btn .badge {
    position: absolute; top: -6px; right: -4px;
    background: #f83838; border: 2px solid #c02020;
    border-radius: 4px; width: 16px; height: 16px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-family: var(--font-pixel); font-size: 9px; font-weight: bold;
}
```

- [ ] **Step 3: Add urgent button logic in `updateHome()`**

```javascript
// Toggle urgent class and badge on care buttons
var feedBtn = document.querySelector('[data-action="feed"]');
var sleepBtn = document.querySelector('[data-action="sleep"]');
feedBtn.classList.toggle('urgent', st.hunger < 30);
sleepBtn.classList.toggle('urgent', st.sleepy > 80);
// Add ! badge dynamically
```

- [ ] **Step 4: Remove old care bar CSS**

Delete all `.care-actions`, `.action-btn`, previous button styles.

- [ ] **Step 5: Verify buttons**

Test all 4 buttons respond to tap. Test 3D press effect (shadow disappears on `:active`). Test bounce animation on urgent. Touch targets are 56px+.

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css js/game.js
git commit -m "feat: pixel art care bar with 3D press effect and urgent bounce"
```

---

## Task 8: Learning Screen — Pixel CSS Skin

**Files:**
- Modify: `css/styles.css` (learning popup styles)
- Modify: `js/learning.js` (CSS class names if changed)
- Modify: `js/activities/meet.js` (CSS class names)
- Modify: `js/activities/play.js` (CSS class names)

- [ ] **Step 1: Rewrite learning popup CSS**

Replace all `.learning-popup`, `.popup-container`, `.activity-*` styles with pixel art equivalents:

```css
.learning-popup {
    position: fixed; inset: 0;
    background: rgba(10, 8, 32, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.popup-container {
    background: var(--ui-bg);
    border: 4px solid var(--ui-border);
    border-radius: 6px;
    box-shadow: 0 4px 0 #0a0818;
    width: 90%;
    max-width: 500px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 16px;
}

.popup-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.popup-back {
    background: #383058;
    border: 3px solid var(--ui-border);
    border-radius: 4px;
    box-shadow: 0 2px 0 #181028;
    color: var(--text-light);
    font-family: var(--font-pixel);
    font-size: 14px;
    padding: 6px 10px;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
}
.popup-back:active { box-shadow: none; transform: translateY(2px); }

/* Progress stars */
.progress-stars {
    display: flex; gap: 4px;
}
.progress-star {
    font-family: var(--font-pixel);
    font-size: 16px;
    color: #383058;
}
.progress-star.filled { color: var(--gold); }

/* Letter display */
.letter-display {
    font-family: var(--font-pixel);
    font-size: 72px;
    color: var(--gold);
    text-align: center;
    padding: 24px;
    text-shadow: 0 4px 0 #a08020;
}

/* Puzzle blocks */
.puzzle-block {
    background: #383058;
    border: 3px solid var(--ui-border);
    border-radius: 4px;
    box-shadow: 0 3px 0 #181028;
    font-family: var(--font-pixel);
    color: var(--text-light);
    min-width: 56px;
    min-height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: grab;
}
.puzzle-block:active { box-shadow: none; transform: translateY(3px); }

.puzzle-slot {
    background: #0a0818;
    border: 3px dashed var(--ui-border);
    border-radius: 4px;
    min-width: 56px;
    min-height: 56px;
}
.puzzle-slot.filled {
    border-style: solid;
    border-color: var(--gold);
    background: #282048;
}
```

- [ ] **Step 2: Add mini-pet to learning screen**

In `learning.js`, when opening popup, add a small pixel pet sprite (CSS-based, not PixiJS) in the corner:

```css
.mini-pet {
    position: absolute;
    bottom: 8px;
    right: 12px;
    width: 32px; height: 28px;
    background: var(--gold);
    border: 2px solid #d09840;
    border-radius: 4px;
}
.mini-pet::before {
    content: '';
    position: absolute;
    top: 8px; left: 6px;
    width: 5px; height: 5px;
    background: var(--text-dark);
    box-shadow: 11px 0 0 var(--text-dark);
}
```

- [ ] **Step 3: Update activity JS files for class names**

Scan `meet.js`, `play.js`, `care.js` for any inline styles or class names that need updating. Replace any references to old glass/picture-book classes with new pixel classes.

- [ ] **Step 4: Verify learning flow**

Run through: tap 배우기 → learning popup opens → meet activity → play activity. All styled in pixel art.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css js/learning.js js/activities/meet.js js/activities/play.js js/activities/care.js
git commit -m "feat: pixel art CSS skin for learning screen and activities"
```

---

## Task 9: Screen Transitions — Pixel Wipe

**Files:**
- Modify: `js/effects.js` (new transition function)
- Modify: `js/game.js` (use transition on screen change)
- Modify: `css/styles.css` (transition overlay CSS)

- [ ] **Step 1: Add pixel wipe overlay to HTML**

Add at bottom of `<body>` in `index.html`:

```html
<div id="pixelWipe" class="pixel-wipe"></div>
```

- [ ] **Step 2: Write pixel wipe CSS**

```css
.pixel-wipe {
    position: fixed; inset: 0;
    z-index: 9999;
    pointer-events: none;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(12, 1fr);
    opacity: 0;
}
.pixel-wipe.active { opacity: 1; pointer-events: all; }

.pixel-wipe-block {
    background: var(--ui-bg);
    transform: scale(0);
    transition: transform 0.06s ease;
}
.pixel-wipe-block.show { transform: scale(1.1); }
```

- [ ] **Step 3: Write `pixelWipeTransition()` function**

Add to `effects.js`:

```javascript
function pixelWipeTransition(callback) {
    var wipe = document.getElementById('pixelWipe');
    wipe.innerHTML = '';
    wipe.classList.add('active');

    // Create grid blocks
    var cols = 8, rows = 12;
    var blocks = [];
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var block = document.createElement('div');
            block.className = 'pixel-wipe-block';
            wipe.appendChild(block);
            blocks.push({ el: block, delay: (r + c) * 30 });
        }
    }

    // Phase 1: blocks appear (wipe in)
    blocks.forEach(function(b) {
        setTimeout(function() { b.el.classList.add('show'); }, b.delay);
    });

    // Phase 2: callback at peak, then blocks disappear (wipe out)
    var peakDelay = (rows + cols) * 30 + 100;
    setTimeout(function() {
        if (callback) callback();
        blocks.forEach(function(b) {
            setTimeout(function() { b.el.classList.remove('show'); }, b.delay);
        });
        setTimeout(function() {
            wipe.classList.remove('active');
            wipe.innerHTML = '';
        }, (rows + cols) * 30 + 200);
    }, peakDelay);
}
```

- [ ] **Step 4: Use transition for home ↔ learning**

In `game.js`, when `handleAction('learn')` is called:

```javascript
// Pet walks right (PixiJS animation)
PetRenderer.walkOffScreen('right', function() {
    pixelWipeTransition(function() {
        showScreen('learning');
    });
});
```

On back from learning:

```javascript
pixelWipeTransition(function() {
    showScreen('home');
    PetRenderer.walkOnScreen('left');
});
```

- [ ] **Step 5: Add `walkOffScreen` / `walkOnScreen` to PetRenderer**

Simple animation: slide container.x to off-screen over 30 frames, then callback.

- [ ] **Step 6: Verify transitions**

Tap 배우기 → pet walks right → pixel wipe → learning screen. Tap back → pixel wipe → pet walks in from left.

- [ ] **Step 7: Commit**

```bash
git add index.html css/styles.css js/effects.js js/game.js js/renderer.js
git commit -m "feat: pixel wipe screen transition and pet walk animation"
```

---

## Task 10: Naming Screen — Pixel Reskin

**Files:**
- Modify: `index.html:21-38` (naming screen markup)
- Modify: `css/styles.css` (naming screen styles)

- [ ] **Step 1: Update naming screen CSS to pixel style**

```css
#namingScreen {
    background: var(--ui-bg);
    display: flex;
    align-items: center;
    justify-content: center;
}

.naming-inner {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.naming-title {
    font-family: var(--font-pixel);
    font-size: 28px;
    color: var(--gold);
    text-shadow: 0 3px 0 #a08020;
}

.naming-subtitle {
    font-family: var(--font-pixel);
    font-size: 14px;
    color: var(--text-light);
    opacity: 0.7;
}

.naming-input {
    background: #0a0818;
    border: 3px solid var(--ui-border);
    border-radius: 4px;
    padding: 12px 16px;
    font-family: var(--font-pixel);
    font-size: 20px;
    color: var(--text-light);
    text-align: center;
    width: 200px;
    outline: none;
}
.naming-input:focus { border-color: var(--gold); }

.btn-primary {
    background: linear-gradient(180deg, #6a4c9c 0%, #483868 100%);
    border: 3px solid #8868c0;
    border-radius: 6px;
    box-shadow: 0 3px 0 #2a1848;
    color: var(--gold);
    font-family: var(--font-pixel);
    font-size: 16px;
    padding: 12px 32px;
    cursor: pointer;
    min-height: 48px;
}
.btn-primary:active { box-shadow: none; transform: translateY(3px); }
```

- [ ] **Step 2: Replace egg animation**

Replace `.naming-egg` CSS float animation with pixel-style bounce:

```css
.naming-egg {
    width: 60px; height: 72px;
    background: #f8e8d0;
    border: 4px solid #d8b898;
    border-radius: 6px;
    margin: 16px auto;
    animation: eggBounce 1.5s ease infinite;
}
@keyframes eggBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
}
```

- [ ] **Step 3: Verify naming screen**

Open app fresh (clear localStorage). See pixel-style naming screen, input works, submit creates pet.

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: pixel art naming screen"
```

---

## Task 11: Letter Flowers — Pixel Style & Quiz

**Files:**
- Modify: `js/world.js:391-466` (flower rendering)
- Modify: `js/world.js:325-356` (flower colors)

- [ ] **Step 1: Rewrite flower rendering to pixel blocks**

Replace `addLetterFlower()`. New pixel flowers:
- Stem: green rect (2x16px)
- Head: colored square (14x14px) with 1px white highlight
- Letter text: DungGeunMo font, smaller size

- [ ] **Step 2: Add tap quiz interaction**

Extend the existing `pointerdown` handler on flowers. When tapped:
- If fewer than 3 known letters: just play TTS pronunciation (existing behavior)
- If 3+ known letters: show PixiJS overlay with 3 rect buttons (1 correct + 2 random from known)
- Correct: flower grows + sparkle particles + increment `letterStats` review count
- Wrong: flower dims briefly + show correct answer large for 2 seconds

- [ ] **Step 3: Verify flower quiz**

Learn 3+ letters, go to home, tap a flower. Quiz appears. Test correct and wrong answers.

- [ ] **Step 4: Commit**

```bash
git add js/world.js
git commit -m "feat: pixel letter flowers with tap quiz for in-world review"
```

---

## Task 12: CSS Cleanup & Global Polish

**Files:**
- Modify: `css/styles.css` (full cleanup pass)

- [ ] **Step 1: Remove all old picture-book / glass styles**

Delete: `.glass`, old gradient backgrounds, old button styles, old font references, old color variables. Search for any remaining `Gaegu` or `#fdf8f0` references.

- [ ] **Step 2: Add night mode CSS class**

```css
body.night .pixel-panel { background: var(--ui-bg-n); border-color: var(--ui-border-n); }
body.night .care-bar { background: var(--ui-bg-n); border-color: var(--ui-border-n); }
body.night .care-btn { background: linear-gradient(180deg, #282048, #181038); border-color: #483868; }
```

Toggle class in `updateTimeOfDay()`: `document.body.classList.toggle('night', isNight)`.

- [ ] **Step 3: Verify full flow end-to-end**

1. Clear localStorage, open app
2. Naming screen → enter name → home screen (day)
3. Check HUD (stats, name badge)
4. Check pet walks around, jumps, blinks
5. Set hunger low → pet hungry behavior + button bounce
6. Tap feed → mini-game → celebrate
7. Tap learn → pixel wipe → learning popup
8. Complete activity → stars → back to home
9. Tap flower → quiz
10. Change time to 8 PM → night mode

- [ ] **Step 4: iPad Safari specific fixes**

Test on iPad Safari. Fix any:
- Safe area insets not applying
- Touch events not registering
- Fonts not loading
- Performance issues with particles

- [ ] **Step 5: Commit**

```bash
git add css/styles.css js/world.js js/game.js
git commit -m "feat: CSS cleanup, night mode toggle, and final polish"
```

---

## Task 13: Care Mini-Game Visuals

**Files:**
- Modify: `js/activities/care.js` (feed/sleep/wash mini-game visuals)
- Modify: `css/styles.css` (mini-game specific styles)

- [ ] **Step 1: Update feed mini-game visuals**

Replace food items with pixel-style rect icons. Update the drop animation CSS. Ensure the pet chew animation works with new pixel body.

- [ ] **Step 2: Update sleep mini-game visuals**

Star tapping: replace round stars with pixel diamond shapes (rotated squares). Lullaby tone effect stays.

- [ ] **Step 3: Update wash mini-game visuals**

Bubble/foam effects: replace ellipse bubbles with small pixel squares that float up. "Clean sparkle" = white pixel squares fading in/out.

- [ ] **Step 4: Verify all 3 mini-games**

Run each care mini-game. Verify pixel visuals, touch interactions, and stat updates.

- [ ] **Step 5: Commit**

```bash
git add js/activities/care.js css/styles.css
git commit -m "feat: pixel art care mini-game visuals"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Full regression test**

Run through entire app flow on iPad Safari:
1. Fresh install (naming → hatch → home)
2. All 3 care actions (feed, sleep, wash)
3. Learning flow (meet, trace, puzzle for 3+ letters)
4. Return to home, tap flowers, quiz
5. Day/night transition
6. Pet evolution (set wordCount = 5, verify stage change)
7. Background/foreground cycle
8. Screen rotation (if applicable)

- [ ] **Step 2: Performance check**

Monitor memory usage. Ensure:
- Particle count stays under 20
- No PixiJS Graphics leak (destroyed properly)
- Animation frame rate stays 60fps on iPad

- [ ] **Step 3: Accessibility check**

- All touch targets ≥ 56px
- Color contrast sufficient in both day/night
- VoiceOver can read button labels (font-pixel text)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass for pixel art UI redesign"
```
