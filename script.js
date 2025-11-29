/* script.js - Final full game engine
   Replaces the older JS. Supports head image loading, rip overlay, restart, etc.
*/

/* ===================== DATA ===================== */
const CLASSMATES = [
  { id: 29, name: "Mahindra Roshan", gender: "male", skin: "#8e6c4cff", hair: "#4a2511", glasses: true, weapon: "rifle", behavior: "aggressive" },
  { id: 43, name: "Rohith", gender: "male", skin: "#855f3eff", hair: "#1a0f0a", glasses: false, weapon: "pistol", behavior: "wanderer" },
  { id: 50, name: "Sri Gnana Guru", gender: "male", skin: "#937966ff", hair: "#0f0a05", glasses: false, weapon: "shotgun", behavior: "aggressive" },
  { id: 51, name: "Sutakar", gender: "male", skin: "#c5aa97ff", hair: "#1a1410", glasses: false, weapon: "pistol", behavior: "defensive" },
  { id: 5, name: "Carlos Rodriguez", gender: "male", skin: "#c68642", hair: "#2b1810", glasses: false, weapon: "rifle", behavior: "aggressive" },
  { id: 6, name: "Sarah Chen", gender: "female", skin: "#f3d6b8", hair: "#0a0805", glasses: true, weapon: "pistol", behavior: "defensive" },
  { id: 7, name: "Michael Brown", gender: "male", skin: "#654321", hair: "#0d0805", glasses: false, weapon: "shotgun", behavior: "wanderer" },
  { id: 8, name: "Priya Patel", gender: "female", skin: "#c09873", hair: "#120c08", glasses: false, weapon: "rifle", behavior: "aggressive" }
];

/* ===================== CONFIG ===================== */
const CONF = {
  W: 900, H: 600, // Default fallback
  worldW: 2000, worldH: 2000,
  playerSpeed: 220, npcSpeed: 65, bulletSpeed: 780,
  bulletTTL: 1.3, bombRadius: 70, bombDamage: 110,
  playerMaxHP: 200, npcMaxHP: 100,
  npcShootChance: 0.006, npcShootRange: 360, npcAggroRange: 260,
  maxNPC: 80,
  guns: {
    pistol: { damage: 24, speed: 780, rate: 160, spread: 0.05, color: '#9ca3af' },
    rifle: { damage: 18, speed: 950, rate: 90, spread: 0.02, color: '#4b5563' },
    shotgun: { damage: 14, speed: 700, rate: 600, spread: 0.25, count: 3, color: '#1f2937' }
  },
  difficulty: {
    easy: { damageMult: 0.5, aggroMult: 0.6, fireRateMult: 0.7, speedMult: 0.8 },
    medium: { damageMult: 1.0, aggroMult: 1.0, fireRateMult: 1.0, speedMult: 1.0 },
    hard: { damageMult: 1.5, aggroMult: 1.5, fireRateMult: 1.3, speedMult: 1.2 }
  }
};


/* ===================== UTILITIES ===================== */
const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* ===================== DOM REFS ===================== */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Panels
const mainMenu = document.getElementById('mainMenu');
const hud = document.getElementById('hud');
const notificationOverlay = document.getElementById('notificationOverlay');
const bottomBar = document.getElementById('bottomBar');

// Menu Elements
const playerGrid = document.getElementById('playerGrid');
const enemyGrid = document.getElementById('enemyGrid');
const startBtn = document.getElementById('startBtn');
const randomBtn = document.getElementById('randomBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const showFPS = document.getElementById('showFPS');
const soundVol = document.getElementById('soundVol');

// HUD Elements
const hpStat = document.getElementById('hpStat');
const ammoStat = document.getElementById('ammoStat');
const bombStat = document.getElementById('bombStat');
const enemiesStat = document.getElementById('enemiesStat');

// Notification Elements
const notifyTitle = document.getElementById('notifyTitle');
const notifySub = document.getElementById('notifySub');

// Action Buttons
const rageBtn = document.getElementById('rageBtn');
const backToMenu = document.getElementById('backToMenu');

/* ===================== selection state ===================== */
let chosenPlayer = null;
let chosenEnemies = new Set();

/* ===================== HEAD PRELOAD ===================== */
const HEADS = {}; // id -> Image or null
function preloadHeadImages() {
  CLASSMATES.forEach(c => {
    const path = `assets/heads/${c.id}.png`;
    const img = new Image();
    img.onload = () => { HEADS[c.id] = img; /* console.log('loaded', path) */ };
    img.onerror = () => { HEADS[c.id] = null; };
    img.src = path;
  });
}
preloadHeadImages();

/* ===================== UI: cards ===================== */
function makeCard(c) {
  const d = document.createElement('div'); d.className = 'card'; d.dataset.id = c.id;
  const av = document.createElement('div'); av.className = 'avatar';
  av.style.background = c.skin;
  av.style.border = `4px solid ${c.hair}`;
  av.textContent = c.name.split(' ')[0].slice(0, 2).toUpperCase();
  d.appendChild(av);
  const nm = document.createElement('div'); nm.textContent = c.name; d.appendChild(nm);
  const sm = document.createElement('div'); sm.className = 'small'; sm.textContent = c.gender + (c.glasses ? ' • glasses' : '');
  d.appendChild(sm);
  return d;
}
function populatePlayers() {
  playerGrid.innerHTML = '';
  CLASSMATES.forEach(c => {
    const card = makeCard(c);
    card.onclick = () => {
      chosenPlayer = c;
      document.querySelectorAll('#playerGrid .card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      renderEnemies(); // Refresh enemies to exclude selected player
    }
    playerGrid.appendChild(card);
  });
}
populatePlayers();

randomBtn.onclick = () => {
  const idx = Math.floor(Math.random() * CLASSMATES.length);
  chosenPlayer = CLASSMATES[idx];
  document.querySelectorAll('#playerGrid .card').forEach(x => x.classList.remove('selected'));
  const sel = [...document.querySelectorAll('#playerGrid .card')].find(c => parseInt(c.dataset.id) === chosenPlayer.id);
  if (sel) sel.classList.add('selected');
  // Fixed syntax error from previous edit
  // toEnemyBtn logic removed


  // toEnemyBtn logic removed
};

// Removed toEnemyBtn logic as we now have a single screen
// toEnemyBtn.onclick = ...

function renderEnemies() {
  enemyGrid.innerHTML = '';
  if (!chosenPlayer) return;
  CLASSMATES.filter(x => x.id !== chosenPlayer.id).forEach(c => {
    const card = makeCard(c);
    if (chosenEnemies.has(c.id)) card.classList.add('selected');
    card.onclick = () => {
      if (chosenEnemies.has(c.id)) chosenEnemies.delete(c.id);
      else chosenEnemies.add(c.id);
      renderEnemies();
      startBtn.disabled = chosenEnemies.size === 0;
    };
    enemyGrid.appendChild(card);
  });
  startBtn.disabled = chosenEnemies.size === 0;
}
selectAllBtn.onclick = () => { chosenEnemies = new Set(CLASSMATES.filter(x => x.id !== chosenPlayer.id).map(x => x.id)); renderEnemies(); startBtn.disabled = false; };

/* ===================== AUDIO (WebAudio) ===================== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
function playShot(volume = 0.6) {
  try {
    ensureAudio();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1500, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.12);
    g.gain.setValueAtTime(volume * parseFloat(soundVol.value || 0.7), audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.2);
  } catch (e) { }
}
function playExplosion(volume = 0.8) {
  try {
    ensureAudio();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.6);
    g.gain.setValueAtTime(volume * parseFloat(soundVol.value || 0.7), audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.9);
  } catch (e) { }
}
function playFoot(volume = 0.12) {
  try {
    ensureAudio();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(220, audioCtx.currentTime);
    g.gain.setValueAtTime(volume * parseFloat(soundVol.value || 0.7), audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.12);
  } catch (e) { }
}

/* ===================== INPUT & CANVAS ===================== */
let GAME = null;

// canvas sizing
// canvas sizing
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (GAME) {
    GAME.viewW = canvas.width;
    GAME.viewH = canvas.height;
  }
}
window.addEventListener('resize', resizeCanvas);

// pointer, keyboard
const input = { keys: {}, pointer: { x: 0, y: 0, down: false }, screenX: 0, screenY: 0 };
window.addEventListener('keydown', e => {
  input.keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'b') doBomb();
});
window.addEventListener('keyup', e => input.keys[e.key.toLowerCase()] = false);

function getCanvasPos(evt) {
  const rect = canvas.getBoundingClientRect();
  let clientX = 0, clientY = 0;
  if (evt.touches && evt.touches.length > 0) { clientX = evt.touches[0].clientX; clientY = evt.touches[0].clientY; }
  else { clientX = evt.clientX || 0; clientY = evt.clientY || 0; }
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function updateInputCoords(e) {
  const p = getCanvasPos(e);
  input.screenX = p.x;
  input.screenY = p.y;
  // World coords updated in game loop based on camera
}

canvas.addEventListener('mousedown', e => { updateInputCoords(e); input.pointer.down = true; firePlayerBullet(); });
window.addEventListener('mouseup', e => input.pointer.down = false);
canvas.addEventListener('mousemove', e => { updateInputCoords(e); });
canvas.addEventListener('touchstart', e => {
  // Ignore if touching controls
  if (e.target.closest('.joystick') || e.target.closest('.action-btn')) return;
  e.preventDefault(); updateInputCoords(e); input.pointer.down = true; firePlayerBullet();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (e.target.closest('.joystick') || e.target.closest('.action-btn')) return;
  e.preventDefault(); updateInputCoords(e);
}, { passive: false });
canvas.addEventListener('touchend', e => {
  e.preventDefault(); input.pointer.down = false;
}, { passive: false });

/* mobile joystick (multi-touch) */
(function setupJoystick() {
  const joystickEl = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  if (!joystickEl) return;

  let touchId = null;
  let cx = 0, cy = 0;

  joystickEl.addEventListener('touchstart', e => {
    e.preventDefault(); e.stopPropagation();
    if (touchId !== null) return; // Already active

    const t = e.changedTouches[0];
    touchId = t.identifier;

    const r = joystickEl.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;

    updateStick(t.clientX, t.clientY);
  });

  joystickEl.addEventListener('touchmove', e => {
    e.preventDefault(); e.stopPropagation();
    if (touchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        updateStick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  });

  const endDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (touchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        touchId = null;
        stick.style.transform = '';
        joystickEl._dx = 0;
        joystickEl._dy = 0;
        break;
      }
    }
  };

  joystickEl.addEventListener('touchend', endDrag);
  joystickEl.addEventListener('touchcancel', endDrag);

  function updateStick(clientX, clientY) {
    const maxDist = 40;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const scale = dist > maxDist ? maxDist / dist : 1;

    const finalX = dx * scale;
    const finalY = dy * scale;

    stick.style.transform = `translate(${finalX}px, ${finalY}px)`;

    // Normalize output -1 to 1
    joystickEl._dx = finalX / maxDist;
    joystickEl._dy = finalY / maxDist;
  }
})();

/* ===================== ENTITIES & PARTICLES ===================== */
class Bullet {
  constructor(x, y, vx, vy, damage, shooterId) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.damage = damage; this.shooterId = shooterId; this.ttl = CONF.bulletTTL; this.size = 4; }
}
class BombProjectile {
  constructor(x, y, tx, ty) {
    this.x = x; this.y = y;
    this.tx = tx; this.ty = ty;
    this.startX = x; this.startY = y;
    this.t = 0; this.duration = 0.8; // Time to reach target
    this.height = 120; // Arc height
    this.active = true;
  }
}
class RipMarker {
  constructor(x, y, name) { this.x = x; this.y = y; this.name = name; this.life = 10; } // Life just for potential fade, currently permanent
}
class Particle {
  constructor(x, y, vx, vy, life, color) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.color = color; }
}
const particles = [];

/* particles: explosion */
function spawnExplosion(x, y, count = 24) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = rand(80, 260);
    particles.push(new Particle(x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, rand(0.5, 1.2), ['#ffb4a2', '#ffd166', '#ff8fab'][Math.floor(Math.random() * 3)]));
  }
  GAME._bombFlash = { x: x, y: y, t: 0.9 };
  GAME.shake = 20; // Add screenshake
  playExplosion(0.9);
}

/* ===================== GAME LIFECYCLE ===================== */
function beginGame() {
  // Full screen world
  GAME = {
    w: CONF.worldW, h: CONF.worldH,
    viewW: window.innerWidth, viewH: window.innerHeight,
    camera: { x: 0, y: 0 },
    player: null, npcs: [], bullets: [], bombs: [], rips: [], bombsLeft: 2,
    running: true, lastTime: performance.now(),
    trees: [], _bombFlash: null, showRage: false,
    shake: 0, // Screenshake magnitude
    fps: { value: 60, frames: 0, last: 0 },
    modifiers: CONF.difficulty[document.getElementById('difficultySelect').value] || CONF.difficulty.medium
  };
  resizeCanvas();

  // create player entity and attach head sprite
  const pdat = chosenPlayer;
  GAME.player = {
    id: pdat.id, name: pdat.name, x: GAME.w / 2, y: GAME.h / 2, vx: 0, vy: 0,
    size: 20, skin: pdat.skin, hair: pdat.hair, gender: pdat.gender, glasses: pdat.glasses || false,
    headSprite: HEADS[pdat.id] || null, weapon: document.getElementById('startWeapon').value || pdat.weapon,
    hp: CONF.playerMaxHP, maxHP: CONF.playerMaxHP, alive: true, walkPhase: 0, walkTimer: 0, facing: 0
  };

  // trees
  GAME.trees = [];
  for (let t = 0; t < 6; t++) { const tx = rand(80, GAME.w - 80), ty = rand(80, GAME.h - 160), r = rand(38, 62); GAME.trees.push({ x: tx, y: ty, r: r }); }

  // spawn NPCs (attach headSprite if available)
  const spawnList = CLASSMATES.filter(x => chosenEnemies.has(x.id)).slice(0, CONF.maxNPC);
  spawnList.forEach((c, i) => {
    // Spawn away from player
    let sx, sy, d;
    do {
      sx = rand(40, GAME.w - 40);
      sy = rand(40, GAME.h - 40);
      d = dist(sx, sy, GAME.player.x, GAME.player.y);
    } while (d < 300);

    GAME.npcs.push({
      id: c.id, name: c.name,
      x: sx, y: sy,
      vx: 0, vy: 0, size: 18, skin: c.skin, hair: c.hair, glasses: c.glasses || false,
      headSprite: HEADS[c.id] || null, weapon: c.weapon, behavior: c.behavior,
      hp: CONF.npcMaxHP, maxHP: CONF.npcMaxHP, alive: true, target: null, wanderTimer: 0
    });
  });

  GAME.bullets = []; GAME.bombs = []; GAME.rips = []; GAME._bombFlash = null; GAME.showRage = false;

  // UI transitions
  mainMenu.style.display = 'none';
  hud.style.display = 'flex';
  notificationOverlay.style.display = 'none';
  bottomBar.style.display = 'none';

  // Show mobile controls if applicable
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 900) {
    const joy = document.getElementById('joystick');
    const am = document.getElementById('actionsMobile');
    if (joy) joy.style.display = 'block';
    if (am) am.style.display = 'flex';
  }

  // ensure pointer resets
  input.pointer.x = GAME.player.x; input.pointer.y = GAME.player.y; input.pointer.down = false;

  // start main loop
  GAME.lastTime = performance.now(); GAME.running = true; requestAnimationFrame(loop);
}

function stopGame() {
  if (!GAME) return;
  GAME.running = false;
  GAME = null;

  // UI transitions
  mainMenu.style.display = 'flex';
  hud.style.display = 'none';
  notificationOverlay.style.display = 'none';
  bottomBar.style.display = 'none';

  // Hide mobile controls
  const joy = document.getElementById('joystick');
  const am = document.getElementById('actionsMobile');
  if (joy) joy.style.display = 'none';
  if (am) am.style.display = 'none';
}

/* restart full: back to selection screen */
function restartFull() {
  stopGame();
  populatePlayers();
  chosenPlayer = null; chosenEnemies = new Set();
  startBtn.disabled = true;
}

/* ===================== EVENT LISTENERS ===================== */
// Consolidated below in EVENT HOOKS section

// Mobile Buttons
const mobileShoot = document.getElementById('mobileShoot');
const mobileBombBtn = document.getElementById('mobileBombBtn');
if (mobileShoot) {
  mobileShoot.addEventListener('touchstart', (e) => { e.preventDefault(); input.pointer.down = true; firePlayerBullet(); });
  mobileShoot.addEventListener('touchend', (e) => { e.preventDefault(); input.pointer.down = false; });
}
if (mobileBombBtn) {
  mobileBombBtn.addEventListener('touchstart', (e) => { e.preventDefault(); doBomb(); });
}

/* ===================== ACTIONS ===================== */
function firePlayerBullet() {
  if (!GAME || !GAME.player || !GAME.player.alive) return;
  const p = GAME.player;
  const gun = CONF.guns[p.weapon || 'pistol'];

  const tx = input.pointer.x || (p.x + 1);
  const ty = input.pointer.y || p.y;
  const baseAng = Math.atan2(ty - p.y, tx - p.x);

  const count = gun.count || 1;
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * gun.spread;
    const ang = baseAng + spread;
    GAME.bullets.push(new Bullet(
      p.x + Math.cos(ang) * (p.size + 12),
      p.y + Math.sin(ang) * (p.size + 12),
      Math.cos(ang) * gun.speed,
      Math.sin(ang) * gun.speed,
      gun.damage,
      p.id
    ));
  }
  playShot(0.6);
}

function fireEnemyBullet(shooter, target) {
  if (!GAME) return;
  const gun = CONF.guns[shooter.weapon || 'pistol'];
  const baseAng = Math.atan2(target.y - shooter.y, target.x - shooter.x);

  const count = gun.count || 1;
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * (gun.spread + 0.1); // Enemies have slightly worse aim
    const ang = baseAng + spread;
    GAME.bullets.push(new Bullet(
      shooter.x + Math.cos(ang) * (shooter.size + 12),
      shooter.y + Math.sin(ang) * (shooter.size + 12),
      Math.cos(ang) * gun.speed * 0.8, // Slower enemy bullets
      Math.sin(ang) * gun.speed * 0.8,
      gun.damage * (GAME.modifiers ? GAME.modifiers.damageMult : 1),
      shooter.id
    ));
  }
  playShot(0.3);
}

function doBomb() {
  if (!GAME) return;
  if (GAME.bombsLeft <= 0) return;
  GAME.bombsLeft--;

  // Throw bomb towards cursor
  const p = GAME.player;
  // If pointer never moved, default to facing direction or slightly ahead
  let tx = input.pointer.x;
  let ty = input.pointer.y;

  if (tx === 0 && ty === 0) {
    tx = p.x + Math.cos(p.facing) * 150;
    ty = p.y + Math.sin(p.facing) * 150;
  }

  // Clamp range
  const d = dist(p.x, p.y, tx, ty);
  const maxRange = 350;
  if (d > maxRange) {
    const ang = Math.atan2(ty - p.y, tx - p.x);
    tx = p.x + Math.cos(ang) * maxRange;
    ty = p.y + Math.sin(ang) * maxRange;
  }

  GAME.bombs.push(new BombProjectile(p.x, p.y - 20, tx, ty));
}

function explodeBomb(x, y) {
  spawnExplosion(x, y, 36);
  // damage small radius only
  GAME.npcs.forEach(n => {
    if (!n.alive) return;
    const d = dist(n.x, n.y, x, y);
    if (d <= CONF.bombRadius) {
      n.hp -= CONF.bombDamage;
      if (n.hp <= 0) {
        n.alive = false;
        spawnExplosion(n.x, n.y, 12);
        GAME.rips.push(new RipMarker(n.x, n.y, n.name));
      }
    }
  });
  // Victory handled in update loop
}

/* respawn enemies only (rage) */
function respawnEnemies() {
  if (!GAME) return;
  const desired = Array.from(chosenEnemies);
  GAME.npcs = [];
  desired.forEach((id) => {
    const c = CLASSMATES.find(x => x.id === id);
    if (!c) return;

    // Spawn away from player
    let sx, sy, d;
    do {
      sx = rand(40, GAME.w - 40);
      sy = rand(40, GAME.h - 40);
      d = dist(sx, sy, GAME.player.x, GAME.player.y);
    } while (d < 300);

    GAME.npcs.push({ id: c.id, name: c.name, x: sx, y: sy, vx: 0, vy: 0, size: 18, skin: c.skin, hair: c.hair, glasses: c.glasses || false, headSprite: HEADS[c.id] || null, weapon: c.weapon, behavior: c.behavior, hp: CONF.npcMaxHP, maxHP: CONF.npcMaxHP, alive: true, target: null, wanderTimer: 0 });
  });
  GAME.bombsLeft = 2;
  GAME.showRage = false;

  // UI Reset
  notificationOverlay.style.display = 'none';
  bottomBar.style.display = 'none';
  rageBtn.style.display = 'block'; // Ensure visible if it was hidden
}

/* player death */
function onPlayerDeath() {
  // Seamless death: Game continues, show overlay
  notifyTitle.textContent = "ELIMINATED";
  notifyTitle.className = "notify-title defeat";
  notifySub.textContent = "Spectating Mode Active";
  notificationOverlay.style.display = 'flex';
  bottomBar.style.display = 'flex';

  // Add RIP for player
  GAME.rips.push(new RipMarker(GAME.player.x, GAME.player.y, GAME.player.name));
}

/* ===================== UPDATE (AI + physics) ===================== */
function update(dt) {
  if (!GAME) return;

  // Screenshake decay
  if (GAME.shake > 0) GAME.shake *= 0.9;
  if (GAME.shake < 0.5) GAME.shake = 0;

  const pv = GAME.player;

  // Update Camera to follow player
  GAME.camera.x = clamp(pv.x - GAME.viewW / 2, 0, GAME.w - GAME.viewW);
  GAME.camera.y = clamp(pv.y - GAME.viewH / 2, 0, GAME.h - GAME.viewH);

  // Update Input World Coords
  input.pointer.x = input.screenX + GAME.camera.x;
  input.pointer.y = input.screenY + GAME.camera.y;

  // Player Input (Only if alive)
  if (pv.alive) {
    let mx = 0, my = 0;
    if (input.keys['arrowleft'] || input.keys['a']) mx -= 1;
    if (input.keys['arrowright'] || input.keys['d']) mx += 1;
    if (input.keys['arrowup'] || input.keys['w']) my -= 1;
    if (input.keys['arrowdown'] || input.keys['s']) my += 1;

    // Mobile Joystick Input
    const joystickEl = document.getElementById('joystick');
    if (joystickEl && (joystickEl._dx || joystickEl._dy)) {
      mx += joystickEl._dx || 0;
      my += joystickEl._dy || 0;
    }

    const norm = Math.hypot(mx, my) || 1;
    pv.vx = (mx / norm) * CONF.playerSpeed;
    pv.vy = (my / norm) * CONF.playerSpeed;
    pv.x += pv.vx * dt; pv.y += pv.vy * dt;
    pv.x = clamp(pv.x, pv.size, GAME.w - pv.size); pv.y = clamp(pv.y, pv.size, GAME.h - pv.size);

    if (typeof input.pointer.x !== 'undefined' && typeof input.pointer.y !== 'undefined') {
      pv.facing = Math.atan2(input.pointer.y - pv.y, input.pointer.x - pv.x);
    }

    // walking animation
    pv.walkTimer += dt;
    if (Math.hypot(pv.vx, pv.vy) > 1) {
      if (pv.walkTimer > 0.16) { pv.walkTimer = 0; pv.walkPhase = (pv.walkPhase + 1) % 2; playFoot(0.09); }
    } else { pv.walkPhase = 0; pv.walkTimer = 0; }

    // auto-fire while pointer down
    if (input.pointer.down) {
      const gun = CONF.guns[pv.weapon || 'pistol'];
      if (!pv._lastShot || performance.now() - pv._lastShot > gun.rate) { firePlayerBullet(); pv._lastShot = performance.now(); }
    }
  }

  // bullets -> collisions with NPCs
  for (let i = GAME.bullets.length - 1; i >= 0; i--) {
    const b = GAME.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt;
    if (b.ttl <= 0) { GAME.bullets.splice(i, 1); continue; }
    // hit NPCs
    if (b.shooterId === pv.id) { // Player bullet
      for (let j = 0; j < GAME.npcs.length; j++) {
        const n = GAME.npcs[j];
        if (!n.alive) continue;
        if (Math.hypot(b.x - n.x, b.y - n.y) < n.size + 4) {
          // NPC vs NPC damage (low)
          n.hp -= Math.max(1, b.damage * 0.15);
          GAME.bullets.splice(i, 1);
          if (n.hp <= 0) {
            n.alive = false;
            spawnExplosion(n.x, n.y, 18);
            GAME.rips.push(new RipMarker(n.x, n.y, n.name));
          }
          else {
            // Spark effect for hit
            particles.push(new Particle(b.x, b.y, rand(-50, 50), rand(-50, 50), 0.2, '#fff'));
          }
          break;
        }
      }
    } else { // Enemy bullet
      if (Math.hypot(b.x - pv.x, b.y - pv.y) < pv.size + 4) {
        pv.hp -= b.damage; GAME.bullets.splice(i, 1);
        if (pv.hp <= 0) { pv.hp = 0; pv.alive = false; onPlayerDeath(); }
      }
    }
  }

  // update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // update bombs
  for (let i = GAME.bombs.length - 1; i >= 0; i--) {
    const b = GAME.bombs[i];
    b.t += dt / b.duration;
    if (b.t >= 1) {
      explodeBomb(b.tx, b.ty);
      GAME.bombs.splice(i, 1);
    } else {
      // parabolic arc
      const l = b.t;
      b.x = b.startX + (b.tx - b.startX) * l;
      b.y = b.startY + (b.ty - b.startY) * l - Math.sin(l * Math.PI) * b.height;
    }
  }

  // NPC AI with behaviors
  let aliveCount = 0;
  GAME.npcs.forEach(n => {
    if (!n.alive) return;
    aliveCount++;

    // 1. Determine Target
    // Default target is player
    let target = GAME.player;
    let targetDist = dist(n.x, n.y, target.x, target.y);

    // Behavior modifiers
    if (n.behavior === 'aggressive') {
      // Aggressive: Focus player if close, otherwise attack random NPC
      if (targetDist > 400) {
        // Find nearest other NPC
        let nearest = null; let minD = Infinity;
        GAME.npcs.forEach(other => {
          if (other !== n && other.alive) {
            const d = dist(n.x, n.y, other.x, other.y);
            if (d < minD) { minD = d; nearest = other; }
          }
        });
        if (nearest && minD < 300) { target = nearest; targetDist = minD; }
      }
    } else if (n.behavior === 'defensive') {
      // Defensive: Run from player if close
    } else if (n.behavior === 'wanderer') {
      // Wanderer: Randomly pick a target occasionally
      if (Math.random() < 0.01) {
        const potentialTargets = [GAME.player, ...GAME.npcs.filter(x => x !== n && x.alive)];
        n._tempTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
      }
      if (n._tempTarget && n._tempTarget.alive) {
        target = n._tempTarget;
        targetDist = dist(n.x, n.y, target.x, target.y);
      }
    }

    // 2. Movement Logic
    let ax = 0, ay = 0;
    // Avoid trees
    GAME.trees.forEach(tr => {
      const d = Math.hypot(n.x - tr.x, n.y - tr.y);
      const minD = tr.r + n.size + 8;
      if (d < minD && d > 0) {
        const push = (minD - d) / minD;
        ax += (n.x - tr.x) / d * push * 120;
        ay += (n.y - tr.y) / d * push * 120;
      }
    });

    // Avoid other NPCs (crowd separation)
    GAME.npcs.forEach(other => {
      if (other === n || !other.alive) return;
      const d = dist(n.x, n.y, other.x, other.y);
      if (d < 40 && d > 0) {
        const push = (40 - d) / 40;
        ax += (n.x - other.x) / d * push * 80;
        ay += (n.y - other.y) / d * push * 80;
      }
    });

    let desiredVx = 0, desiredVy = 0;

    const mods = GAME.modifiers || { aggroMult: 1, speedMult: 1, fireRateMult: 1 };

    if (n.behavior === 'defensive' && targetDist < 200) {
      // Run away
      desiredVx = -(target.x - n.x) / targetDist * CONF.npcSpeed * mods.speedMult;
      desiredVy = -(target.y - n.y) / targetDist * CONF.npcSpeed * mods.speedMult;
    } else if (targetDist > 100 && targetDist < CONF.npcAggroRange * mods.aggroMult) {
      // Chase
      desiredVx = (target.x - n.x) / targetDist * CONF.npcSpeed * mods.speedMult;
      desiredVy = (target.y - n.y) / targetDist * CONF.npcSpeed * mods.speedMult;
    } else {
      // Wander / Idle
      if (!n.wanderTarget || n.wanderTimer <= 0) {
        n.wanderTarget = { x: rand(40, GAME.w - 40), y: rand(40, GAME.h - 40) };
        n.wanderTimer = rand(1, 3);
      }
      const wdx = n.wanderTarget.x - n.x;
      const wdy = n.wanderTarget.y - n.y;
      const wd = Math.hypot(wdx, wdy) || 1;
      desiredVx = (wdx / wd) * (CONF.npcSpeed * 0.5);
      desiredVy = (wdy / wd) * (CONF.npcSpeed * 0.5);
      n.wanderTimer -= dt;
    }

    n.vx = desiredVx + ax;
    n.vy = desiredVy + ay;

    n.x += n.vx * dt; n.y += n.vy * dt;
    n.x = clamp(n.x, n.size, GAME.w - n.size); n.y = clamp(n.y, n.size, GAME.h - n.size);

    // 3. Shooting Logic
    // Shoot if target is within range and line of sight (simple distance check)
    if (targetDist < CONF.npcShootRange) {
      // Higher chance if aggressive
      const chance = ((n.behavior === 'aggressive') ? CONF.npcShootChance * 1.5 : CONF.npcShootChance) * mods.fireRateMult;
      if (Math.random() < chance) {
        fireEnemyBullet(n, target);
      }
    }
  });

  // victory detection
  if (aliveCount === 0 && !GAME.showRage) {
    GAME.showRage = true;
    notifyTitle.textContent = "VICTORY";
    notifyTitle.className = "notify-title victory";
    notifySub.textContent = "All enemies eliminated";
    notificationOverlay.style.display = 'flex';
    bottomBar.style.display = 'flex';
  }

  // HUD update
  hpStat.textContent = `HP: ${Math.round(GAME.player.hp)}/${GAME.player.maxHP}`;
  enemiesStat.textContent = `Enemies: ${GAME.npcs.filter(n => n.alive).length}`;
  bombStat.textContent = `Bombs: ${GAME.bombsLeft}`;
}

/* ===================== RENDERING ===================== */
function renderBackground() {
  const w = GAME.w, h = GAME.h; // World size
  const cam = GAME.camera;

  // Optimize: Only draw visible area? 
  // For now, draw full world but clipped by canvas.
  // Actually, we are translated, so we draw at world coords.

  ctx.fillStyle = '#2b6b36'; ctx.fillRect(0, 0, w, h);

  // Grid pattern (world space)
  for (let i = 0; i < w / 100; i++) {
    for (let j = 0; j < h / 100; j++) {
      if ((i + j) % 2 === 0) {
        ctx.fillStyle = '#2e7039';
        ctx.fillRect(i * 100, j * 100, 100, 100);
      }
    }
  }

  // Random patches (simplified for performance)
  // ... (omitted for speed, grid is enough for now)

  // draw trees
  GAME.trees.forEach(tr => drawTree(tr.x, tr.y, tr.r));
}

function drawTree(x, y, r) {
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(x - 12, y + r * 0.3, 24, r * 0.5);
  ctx.fillStyle = '#1f7a3a';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - r * 0.45, y + r * 0.2, r * 0.55, r * 0.45, -0.2, 0, Math.PI * 2); ctx.fill();
}

/* draw chibi (procedural or head image) */
/* draw chibi (procedural or head image) */
function drawChibi(entity, isPlayer = false) {
  const x = entity.x, y = entity.y;
  const size = isPlayer ? (entity.size * 1.1) : entity.size;
  const gun = CONF.guns[entity.weapon || 'pistol'];

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(x, y + size * 0.85, size * 1.35, size * 0.45, 0, 0, Math.PI * 2); ctx.fill();

  // legs movement (enhanced)
  const speed = Math.hypot(entity.vx, entity.vy);
  const isMoving = speed > 10;
  const phase = entity.walkPhase || 0;

  // Body lean
  const lean = isMoving ? (speed / CONF.playerSpeed) * 0.15 : 0;
  const facing = Math.atan2(entity.vy, entity.vx); // Movement direction for lean

  ctx.save();
  // Apply lean if moving
  if (isMoving) {
    ctx.translate(x, y + size * 0.6);
    ctx.rotate(lean * Math.cos(phase * Math.PI)); // Bobbing lean
    ctx.translate(-x, -(y + size * 0.6));
  }

  // Legs
  const legOffset = isMoving ? Math.sin(phase * Math.PI) * 6 : 0;
  ctx.fillStyle = '#111827';
  // Left leg
  ctx.fillRect(x - size * 0.5, y + size * 0.62 + legOffset, size * 0.46, size * 0.28);
  // Right leg
  ctx.fillRect(x + size * 0.04, y + size * 0.62 - legOffset, size * 0.46, size * 0.28);

  // Torso
  ctx.fillStyle = entity.hair || '#444';
  ctx.fillRect(x - size * 0.6, y - size * 0.18, size * 1.2, size * 0.9);

  // Gun (drawn before head so it looks held)
  ctx.save();
  ctx.translate(x + size * 0.4, y + size * 0.2);
  // Aim gun at target or movement direction
  let aimAngle = 0;
  if (isPlayer && typeof input.pointer.x !== 'undefined') {
    aimAngle = Math.atan2(input.pointer.y - y, input.pointer.x - x);
  } else if (entity.vx !== 0 || entity.vy !== 0) {
    aimAngle = Math.atan2(entity.vy, entity.vx);
  }
  ctx.rotate(aimAngle);

  // Draw Gun
  ctx.fillStyle = gun.color;
  if (entity.weapon === 'pistol') {
    ctx.fillRect(0, -3, 12, 6);
  } else if (entity.weapon === 'rifle') {
    ctx.fillRect(0, -3, 24, 5);
    ctx.fillStyle = '#222'; ctx.fillRect(4, 2, 6, 4); // Mag
  } else if (entity.weapon === 'shotgun') {
    ctx.fillRect(0, -4, 18, 8);
    ctx.fillStyle = '#374151'; ctx.fillRect(2, -4, 8, 8); // Pump
  }
  ctx.restore();

  // HEAD: either real image or procedural
  const headW = size * 1.6, headH = size * 1.2;
  // Bob head slightly
  const headBob = isMoving ? Math.abs(Math.sin(phase * Math.PI)) * 2 : 0;
  const headY = y - size * 1.08 - headH / 2 + headBob;

  if (entity.headSprite) {
    try {
      ctx.drawImage(entity.headSprite, x - headW / 2, headY, headW, headH);
    } catch (e) {
      drawProceduralHead(entity, x, y + headBob, size, headW, headH);
    }
  } else {
    drawProceduralHead(entity, x, y + headBob, size, headW, headH);
  }

  // female ponytail
  if (entity.gender === 'female') {
    if (!entity._tail) entity._tail = { ax: x + headW * 0.5, ay: y - size * 0.5, vx: 0, vy: 0 };
    const tx = x + headW * 0.45, ty = y - size * 0.55;
    entity._tail.vx += (tx - entity._tail.ax) * 6 * 0.016;
    entity._tail.vy += (ty - entity._tail.ay) * 6 * 0.016 + 0.6;
    entity._tail.vx *= 0.88; entity._tail.vy *= 0.88;
    entity._tail.ax += entity._tail.vx; entity._tail.ay += entity._tail.vy;
    ctx.fillStyle = entity.hair || '#111';
    ctx.beginPath(); ctx.ellipse(entity._tail.ax, entity._tail.ay, headW * 0.16, headH * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(entity._tail.ax + 6, entity._tail.ay + 8, headW * 0.12, headH * 0.09, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  // eyes & mouth
  const eyeY = y - size * 0.66 + headBob;
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(x - size * 0.25, eyeY, size * 0.095, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + size * 0.25, eyeY, size * 0.095, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4b2e1b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, eyeY + size * 0.14, size * 0.16, 0.05, Math.PI - 0.05); ctx.stroke();

  // glasses
  if (entity.glasses) {
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x - size * 0.25, eyeY, size * 0.14, size * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + size * 0.25, eyeY, size * 0.14, size * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - size * 0.12, eyeY); ctx.lineTo(x + size * 0.12, eyeY); ctx.stroke();
  }

  ctx.restore(); // Restore lean transform

  // NAME (Higher)
  ctx.fillStyle = '#fff'; ctx.font = `${isPlayer ? '12px' : '11px'} sans-serif`; ctx.textAlign = 'center';
  ctx.fillText((isPlayer ? (entity.name + ' (You)') : entity.name), x, y - size * 2.8);

  // HP bar (Higher, hide if dead)
  if (entity.alive) {
    const barW = isPlayer ? 88 : 44;
    const hpPct = Math.max(0, entity.hp / (entity.maxHP || 100));
    ctx.fillStyle = '#111'; ctx.fillRect(x - barW / 2, y - size * 2.5, barW, 8);
    ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(x - barW / 2, y - size * 2.5, barW * hpPct, 8);
  }
}

function drawProceduralHead(entity, x, y, size, headW, headH) {
  // procedural head shapes (skin + hair top)
  ctx.fillStyle = entity.skin || '#f0c7a2';
  ctx.beginPath(); ctx.ellipse(x, y - size * 0.6, headW * 0.5, headH * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = entity.hair || '#222';
  ctx.beginPath(); ctx.ellipse(x, y - size * 0.73, headW * 0.52, headH * 0.45, 0, Math.PI, Math.PI * 2); ctx.fill();
}

/* bomb flash */
function renderBombFlash() {
  if (GAME._bombFlash && GAME._bombFlash.t > 0) {
    const bf = GAME._bombFlash;
    const a = bf.t;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,150,50,${a * 0.22})`;
    ctx.arc(bf.x, bf.y, CONF.bombRadius * (1 - a * 0.6), 0, Math.PI * 2); ctx.fill();
    GAME._bombFlash.t -= 0.04;
    if (GAME._bombFlash.t <= 0) GAME._bombFlash = null;
  }
}

/* minimap */
/* minimap */
function renderMiniMap() {
  // Dynamic size: 20% of screen width, max 150px, min 80px
  const size = Math.max(80, Math.min(150, GAME.viewW * 0.2));
  const mw = size, mh = size;
  const px = GAME.viewW - mw - 20, py = 20;

  ctx.save();
  // Static UI - No camera transform needed here as render() restores context before calling this.

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#000'; ctx.fillRect(px, py, mw, mh);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(px, py, mw, mh);

  const sx = mw / GAME.w, sy = mh / GAME.h;

  // Trees
  GAME.trees.forEach(t => { ctx.fillStyle = '#1f7a3a'; ctx.beginPath(); ctx.arc(px + t.x * sx, py + t.y * sy, 2, 0, Math.PI * 2); ctx.fill(); });

  // NPCs
  ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  GAME.npcs.forEach(n => {
    if (!n.alive) return;
    const nx = px + n.x * sx;
    const ny = py + n.y * sy;
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(nx - 2, ny - 2, 4, 4);
    // Name
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(n.name.split(' ')[0], nx, ny - 6);
  });

  // Player
  const plx = px + GAME.player.x * sx;
  const ply = py + GAME.player.y * sy;
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(plx, ply, 3, 0, Math.PI * 2); ctx.fill();
  // Player Name
  ctx.fillStyle = '#ffd166';
  ctx.fillText("YOU", plx, ply - 6);

  // Viewport Rect
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(px + GAME.camera.x * sx, py + GAME.camera.y * sy, GAME.viewW * sx, GAME.viewH * sy);

  ctx.restore();
}
// End of renderBackground context restore (for screenshake)
// Actually, renderBackground is called first, so we should restore at the END of the main render loop.
// But since we want shake to affect everything, we should apply it in 'render' and restore it there.
// Let's revert the save/restore in renderBackground and move it to 'render'.

/* main render */
/* main render */
/* main render */
function render() {
  if (!GAME) return;

  ctx.save(); // Start Shake
  if (GAME.shake > 0) {
    const dx = (Math.random() - 0.5) * GAME.shake;
    const dy = (Math.random() - 0.5) * GAME.shake;
    ctx.translate(dx, dy);
  }

  // Apply Camera
  ctx.translate(-GAME.camera.x, -GAME.camera.y);

  renderBackground();

  // Draw RIPs
  GAME.rips.forEach(r => {
    ctx.fillStyle = '#555';
    ctx.fillRect(r.x - 12, r.y - 10, 24, 28); // Tombstone
    ctx.beginPath(); ctx.arc(r.x, r.y - 10, 12, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ccc'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("RIP", r.x, r.y);
    ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif';
    ctx.fillText(r.name.split(' ')[0], r.x, r.y + 12);
  });

  GAME.npcs.forEach(n => { if (n.alive) drawChibi(n, false); });

  // Draw Bombs
  GAME.bombs.forEach(b => {
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill();
    // fuse
    ctx.strokeStyle = '#f00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x, b.y - 6); ctx.lineTo(b.x + 4, b.y - 10); ctx.stroke();

    // Trajectory shadow/line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.tx, b.ty); ctx.stroke(); ctx.setLineDash([]);
  });

  GAME.bullets.forEach(b => {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = (b.shooterId === GAME.player.id) ? '#ffd166' : '#ff6b6b';
    ctx.fillRect(-6, -3, 12, 6); ctx.restore();
  });

  if (GAME.player.alive) drawChibi(GAME.player, true);
  particles.forEach(p => { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.life * 3), 0, Math.PI * 2); ctx.fill(); });
  renderBombFlash();

  ctx.restore(); // Restore Shake

  renderMiniMap(); // Draw UI on top of shake (optional, or shake it too)
}

/* ===================== MAIN LOOP ===================== */
function loop(now) {
  if (!GAME || !GAME.running) return;
  const dt = Math.min(0.05, (now - GAME.lastTime) / 1000);
  GAME.lastTime = now;
  GAME.fps.frames++;
  if (now - GAME.fps.last > 1000) { GAME.fps.value = GAME.fps.frames; GAME.fps.frames = 0; GAME.fps.last = now; if (showFPS && showFPS.checked) fpsStat.textContent = `FPS: ${GAME.fps.value}`; }
  update(dt);
  render();
  if (GAME.running) requestAnimationFrame(loop);
}

/* ===================== RIP overlay (DOM) ===================== */
// Removed legacy RIP overlay logic
function showRip(name) {
  // Optional: Add floating text or log
}

/* ===================== GAME OVER / VICTORY overlay ===================== */
// Removed legacy Game Over logic (handled by notificationOverlay)

/* ===================== EVENT HOOKS (UI) ===================== */
startBtn.onclick = () => {
  if (!chosenPlayer) { alert('Pick a chibi first'); return; }
  if (chosenEnemies.size === 0) { alert('Pick at least one enemy'); return; }
  beginGame();
};
backToMenu.onclick = () => { restartFull(); };
rageBtn.onclick = () => { if (GAME) respawnEnemies(); };
// bombBtn removed from DOM, handled by key/mobile

// Removed legacy restartOverlayBtn, returnMenuBtn, restartBtn, closeRip logic

/* mobile control wiring (shoot/bomb) */
if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 900) {
  const ms = document.getElementById('mobileShoot');
  const mb = document.getElementById('mobileBombBtn');
  const joy = document.getElementById('joystick');
  const am = document.getElementById('actionsMobile');

  if (ms) ms.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); input.pointer.down = true; firePlayerBullet(); });
  if (ms) ms.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); input.pointer.down = false; });
  if (mb) mb.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); doBomb(); });

  // Show mobile controls - REMOVED from here, now handled in beginGame/stopGame
  // if (joy) joy.style.display = 'block';
  // if (am) am.style.display = 'flex';
}

/* initial state */
// document.getElementById('dataPreview').textContent = JSON.stringify(CLASSMATES, null, 2); // Removed
// document.getElementById('enemyPanel').style.display = 'none'; // Removed
resizeCanvas();

/* expose useful functions to console for debugging */
window.__GAME = () => GAME;
window.__RELOAD_HEADS = () => { preloadHeadImages(); alert('Started head preload'); };

/* done */
