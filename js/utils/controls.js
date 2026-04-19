/*
 * Player Controls System
 * Implements first-person navigation using PointerLockControls
 * Demonstrates interaction concepts from ICG_04_3D_Viewing.pdf
 */

/**
 * Initializes PointerLockControls for first-person movement
 * PointerLockControls uses a yaw object (camera parent) to manage orientation
 * Based on Three.js examples: https://threejs.org/docs/#examples/en/controls/PointerLockControls
 */
function buildControls() {
  // PointerLockControls wraps camera in a yaw group for mouse look
  controls = new THREE.PointerLockControls(camera, renderer.domElement);
  
  // Initialize position at eye level (H = 1.72m) at casino entrance
  controls.getObject().position.set(0, H, 9);
  scene.add(controls.getObject());

  // Handle pointer lock events
  controls.addEventListener('lock', () => {
    if (gState === S.EXPLORING) {
      document.getElementById('resume').classList.remove('on');
    }
  });

  controls.addEventListener('unlock', () => {
    if (gState === S.EXPLORING) {
      // Show resume overlay if accidentally clicking out
      document.getElementById('resume').classList.add('on');
    }
  });
}

/**
 * Builds keyboard event listeners for player movement and interaction
 * W/A/S/D for movement, E to interact, ESC to exit
 */
function buildEventListeners() {
  document.addEventListener('keydown', e => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'KeyE') tryInteract();
    if (e.code === 'Escape' && gState === S.AT_TABLE) exitTable();
  });

  document.addEventListener('keyup', e => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyD') keys.d = false;
  });
}

/**
 * Updates player movement based on key inputs
 * Frame-independent movement using delta time (from ICG_03 slides)
 * Includes velocity damping for smooth deceleration
 */
function updateMovement(dt) {
  if (gState !== S.EXPLORING || !controls.isLocked) return;

  // Apply velocity damping (friction)
  vel.x -= vel.x * 9 * dt;
  vel.z -= vel.z * 9 * dt;

  // Get movement input (forward/backward and left/right)
  const fwd = Number(keys.w) - Number(keys.s);
  const rgt = Number(keys.d) - Number(keys.a);

  if (fwd) vel.z -= fwd * SPEED * dt * 60;
  if (rgt) vel.x -= rgt * SPEED * dt * 60;

  // Apply velocity to camera position
  controls.moveForward(-vel.z * dt);
  controls.moveRight(-vel.x * dt);

  // Clamp position within casino bounds (32x32 unit area)
  const p = controls.getObject().position;
  p.x = Math.max(-14, Math.min(14, p.x));
  p.z = Math.max(-14, Math.min(14, p.z));
  p.y = H; // Keep eye level constant
}

/**
 * Attempts interaction when player presses E
 * Finds nearest table within interaction radius
 */
function tryInteract() {
  if (gState !== S.EXPLORING) return;

  const playerPos = controls.getObject().position;
  let best = null, bestDist = Infinity;

  // Find closest table within interaction radius
  tables.forEach(table => {
    const worldPos = new THREE.Vector3();
    table.group.getWorldPosition(worldPos);
    const dist = playerPos.distanceTo(worldPos);

    if (dist < table.r && dist < bestDist) {
      bestDist = dist;
      best = table;
    }
  });

  if (best) enterTable(best);
}

/**
 * Checks proximity to tables and shows hint text
 * Called every frame in EXPLORING state
 */
function checkProximity() {
  if (gState !== S.EXPLORING) return;

  const playerPos = controls.getObject().position;
  const hint = document.getElementById('hint');
  const names = { blackjack: 'Blackjack', roulette: 'Roulette', poker: 'Poker' };
  let nearestTable = null;

  // Check which table (if any) player is near
  tables.forEach(table => {
    const worldPos = new THREE.Vector3();
    table.group.getWorldPosition(worldPos);
    if (playerPos.distanceTo(worldPos) < table.r) {
      nearestTable = table;
    }
  });

  if (nearestTable) {
    hint.textContent = `Press E — ${names[nearestTable.type]}`;
    hint.classList.add('on');
  } else {
    hint.classList.remove('on');
  }
}
