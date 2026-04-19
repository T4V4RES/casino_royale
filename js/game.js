/*
 * Main Game Manager and Animation Loop
 * Orchestrates Three.js rendering, game state, and user interaction
 * Demonstrates real-time rendering and frame-independent animation (ICG_03)
 */

// ─────────────────────────────────────────────────────────
//  GLOBAL STATE
// ─────────────────────────────────────────────────────────
let scene, camera, renderer, clock, controls;

// Game states
const S = { MENU: 0, EXPLORING: 1, AT_TABLE: 2 };
let gState = S.MENU;

let balance = 1000;
let tables = [];
let activeTable = null;
let curGame = null;

const keys = { w: false, a: false, s: false, d: false };
let vel = new THREE.Vector3();

const SPEED = 7; // Movement speed (units/second)
const H = 1.72; // Eye height (human perspective)

// Camera animation state
let camAnim = null; // { fromP, toP, fromL, toL, t, dur }

// Deal animation queue
let dealAnims = [];

// ─────────────────────────────────────────────────────────
//  INITIALIZATION
// ─────────────────────────────────────────────────────────
/**
 * Main initialization function
 * Sets up scene, camera, renderer, lights, and event listeners
 */
function init() {
  // Scene with exponential fog (ICG_04: atmospheric perspective)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050404); // Very dark brown
  scene.fog = new THREE.FogExp2(0x050404, 0.04); // Exponential fog

  // Camera with perspective projection (from ICG_04)
  // Parameters: FOV=75°, aspect ratio, near plane=0.1, far plane=80
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 80);
  camera.position.z = 10;

  // Renderer with antialiasing and shadow mapping
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // Prevent oversampling
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
  document.getElementById('c').appendChild(renderer.domElement);

  clock = new THREE.Clock();

  // Build scene
  buildCasino();
  buildLights();
  buildControls();
  buildEventListeners();

  // Start animation loop
  animate();

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

// ─────────────────────────────────────────────────────────
//  GAME STATE & UI MANAGEMENT
// ─────────────────────────────────────────────────────────

function startGame() {
  document.getElementById('overlay').style.display = 'none';
  controls.lock(); // Enter pointer lock
  gState = S.EXPLORING;
}

function resumeGame() {
  controls.lock();
}

/**
 * Enters a table for a game
 * Animates camera transition and initializes game UI
 */
function enterTable(table) {
  if (gState !== S.EXPLORING) return;

  gState = S.AT_TABLE;
  activeTable = table;
  controls.unlock(); // Release mouse lock for UI interaction

  // Show UI elements
  document.getElementById('exitbtn').classList.add('on');
  document.getElementById('hint').classList.remove('on');
  document.getElementById('xhair').style.display = 'none';
  document.getElementById('resume').classList.remove('on');

  // This is wrong - should use table.camPos and table.camLook directly
  // Compute camera animation
  const wp = new THREE.Vector3();
  table.group.getWorldPosition(wp);
  const toPos = wp.clone().add(table.camPos);
  const toLook = wp.clone().add(table.camLook);

  // Current look-at direction
  const fromLook = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(camera.quaternion)
    .add(camera.position);

  // Start camera animation
  camAnim = {
    fromP: camera.position.clone(),
    toP: toPos,
    fromL: fromLook,
    toL: toLook,
    t: 0,
    dur: 1.3 // 1.3 second duration
  };

  // Initialize game
  curGame = table.game;
  curGame.start(balance);
  showPanel(table.type);
}

/**
 * Exits current table and returns to exploring mode
 */
function exitTable() {
  if (gState !== S.AT_TABLE) return;

  balance = curGame.getBalance();
  updateMoney();
  gState = S.EXPLORING;
  activeTable = null;
  curGame = null;
  camAnim = null;

  controls.lock(); // Re-enter pointer lock

  // Hide UI elements
  document.getElementById('exitbtn').classList.remove('on');
  document.getElementById('panel').classList.remove('on');
  document.getElementById('xhair').style.display = 'block';

  // Clean up card meshes
  tables.forEach(t => {
    if (t.group.userData.cardMeshes) {
      t.group.userData.cardMeshes.forEach(m => t.group.remove(m));
      t.group.userData.cardMeshes = [];
    }
  });
  dealAnims = [];
}

function updateMoney() {
  document.getElementById('mv').textContent = balance;
}

function showPanel(type) {
  const panel = document.getElementById('panel');
  panel.classList.add('on');

  document.getElementById('ptitle').textContent =
    type === 'blackjack' ? '🃏 BLACKJACK' :
      type === 'roulette' ? '🎰 ROULETTE' : '♠ TEXAS HOLD\'EM';

  curGame.renderUI();
}

function addMsg(txt) {
  const el = document.createElement('div');
  el.className = 'msg';
  el.textContent = txt;
  document.getElementById('msgs').appendChild(el);
  setTimeout(() => el.remove(), 3400); // Auto-remove after 3.4s
}

// ─────────────────────────────────────────────────────────
//  ANIMATION & UPDATE FUNCTIONS
// ─────────────────────────────────────────────────────────

/**
 * Easing function: ease-in-out cubic
 * Provides smooth interpolation for animations
 */
function eio(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Updates camera position if transitioning between states
 * Smooth interpolation using easing function
 */
function updateCamera(dt) {
  if (!camAnim) return;

  camAnim.t = Math.min(camAnim.t + dt / camAnim.dur, 1);
  const eased = eio(camAnim.t);

  camera.position.lerpVectors(camAnim.fromP, camAnim.toP, eased);
  const lookAt = new THREE.Vector3().lerpVectors(camAnim.fromL, camAnim.toL, eased);
  camera.lookAt(lookAt);

  if (camAnim.t >= 1) camAnim = null; // Animation complete
}

/**
 * Updates roulette wheel animations
 * Demonstrates transform rotation in update loop (ICG_03)
 */
function updateRouletteWheels(dt) {
  tables.forEach(t => {
    if (t.type !== 'roulette') return;

    const tg = t.group;
    const wg = tg.userData.wheelGroup;
    if (!wg) return;

    const spinner = wg.userData.spinner;
    const ball = wg.userData.ball;
    if (!spinner || !ball) return;

    // Idle rotation
    spinner.rotation.y += 0.25 * dt;

    if (!tg.userData.spinning) return;

    // Spin animation
    tg.userData.spinT = (tg.userData.spinT || 0) + dt;
    const progress = tg.userData.spinT / tg.userData.spinDur;

    // Wheel: accelerate then decelerate
    const wheelSpeed = tg.userData.wheelSpd * (progress < 0.3 ? progress / 0.3 : 1) * Math.max(0, 1 - progress * 0.6);
    spinner.rotation.y += wheelSpeed * dt;

    // Ball: orbits opposite direction, spirals inward
    const ballSpeed = tg.userData.ballSpd * Math.max(0.05, 1 - progress * 0.9);
    tg.userData.ballAngle += ballSpeed * dt;

    // Ball radius decreases over time
    const rInner = 0.88 - (0.88 - 0.28) * Math.min(1, Math.max(0, (progress - 0.5) / 0.5));
    const ballY = progress < 0.85 ? 0.07 + Math.abs(Math.sin(tg.userData.ballAngle * 2)) * 0.06 : 0.025;

    ball.position.x = Math.cos(tg.userData.ballAngle) * rInner;
    ball.position.z = Math.sin(tg.userData.ballAngle) * rInner;
    ball.position.y = ballY;

    if (tg.userData.spinT >= tg.userData.spinDur) {
      tg.userData.spinning = false;
      ball.position.set(0.25, 0.02, 0.1); // Settle
    }
  });
}

/**
 * Updates card deal animations
 * Cards fall from above onto table surface
 */
function updateDealAnims(dt) {
  dealAnims = dealAnims.filter(m => {
    m.userData.elapsed = (m.userData.elapsed || 0) + dt;
    const e = m.userData.elapsed;

    if (e < 0) return true; // Not started yet

    const p = Math.min(e / 0.28, 1); // Over 0.28 seconds
    m.position.y = 1.6 - (1.6 - m.userData.targetY) * eio(p);

    return p < 1; // Keep in array while animating
  });
}

// ─────────────────────────────────────────────────────────
//  MAIN ANIMATION LOOP
// ─────────────────────────────────────────────────────────
/**
 * Main render loop
 * Called every frame using requestAnimationFrame
 * Updates game state and renders scene
 */
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta(); // Frame-independent delta time (ICG_03)

  // Update systems
  updateMovement(dt);
  updateCamera(dt);
  updateRouletteWheels(dt);
  updateDealAnims(dt);

  // Check proximity hints while exploring
  if (gState === S.EXPLORING) checkProximity();

  // Render frame
  renderer.render(scene, camera);
}

// ─────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────
window.addEventListener('load', init);
