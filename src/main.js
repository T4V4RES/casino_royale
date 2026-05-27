import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { FPSControls } from './scene/FPSControls.js';

// RectAreaLight requires its uniforms library to be initialised once,
// before any RectAreaLight is created (used by the bar area light).
RectAreaLightUniformsLib.init();
import { TouchControls } from './scene/TouchControls.js';
import { buildCasinoWorld, getSpawnPosition, getSpawnLookAt } from './scene/CasinoWorld.js';
import { InteractionSystem } from './scene/InteractionSystem.js';
import { ATMSystem } from './scene/ATMSystem.js';
import { BarSystem } from './scene/BarSystem.js';
import { BlackjackController } from './controllers/BlackjackController.js';
import { PokerController } from './controllers/PokerController.js';
import { RouletteController } from './controllers/RouletteController.js';
import { AnimationManager } from './scene/AnimationManager.js';

/* ==================================================================
   Main entry – FPS Casino
   ================================================================== */

const quality = (() => {
    const ua = navigator.userAgent || '';
    const isTouchSmall = matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) <= 820;
    const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
    const lowCores = Number(navigator.hardwareConcurrency || 8) <= 4;
    const lowPower = isTouchSmall || lowMemory || lowCores;
    return {
        lowPower,
        pixelRatio: lowPower ? Math.min(window.devicePixelRatio || 1, 1.05) : Math.min(window.devicePixelRatio || 1, 1.75),
        shadows: !lowPower,
        animatedDecor: !lowPower,
        isMobileLike: /Android|iPhone|iPad|iPod/i.test(ua) || isTouchSmall,
    };
})();

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({
    antialias: !quality.lowPower,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(quality.pixelRatio);
renderer.shadowMap.enabled = quality.shadows;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
// Tone mapping cinematográfico (ICG-05). ACES é o standard moderno
// para preservar highlights de luzes emissivas (bulbos, neon).
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = quality.lowPower ? 1.0 : 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('canvas-wrap').appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
// Fundo violeta-escuro vinhoso → harmoniza com paredes/carpete bordeaux
scene.background = new THREE.Color(0x0A0610);
// Nevoeiro mais subtil e quente: dá profundidade sem comer contraste
scene.fog = new THREE.Fog(0x120A18, quality.lowPower ? 13 : 16, quality.lowPower ? 30 : 42);

// --- Environment map ---
// Probe-map gerado em runtime a partir de RoomEnvironment. Dá
// reflexões plausíveis em mármore/ouro/cromo/vidro sem necessidade
// de ray-tracing real (técnica complementar ao ICG-08, abordagem
// rasterizada via image-based lighting).
if (!quality.lowPower) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.38;
}

// --- Camera ---
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, quality.lowPower ? 45 : 100);
scene.add(camera);

// --- FPS Controls ---
const fps = new FPSControls(camera, renderer.domElement);
fps.bounds = { minX: -13.2, maxX: 13.2, minZ: -13.2, maxZ: 13.2 };

// --- Touch Controls (Mobile) ---
const touch = new TouchControls(renderer.domElement);

const mobileButtonPressAt = new WeakMap();
function bindPress(el, handler) {
    if (!el) return;
    const run = (e) => {
        if (el.disabled) return;
        const now = performance.now();
        const lastPress = mobileButtonPressAt.get(el);
        if (lastPress !== undefined && now - lastPress < 300) return;
        mobileButtonPressAt.set(el, now);
        handler(e);
    };
    el.addEventListener('click', run);
    el.addEventListener('touchend', (e) => {
        e.preventDefault();
        run(e);
    }, { passive: false });
}

// --- Build casino world ---
const { colliders, interactionZones } = buildCasinoWorld(scene, quality);
if (quality.lowPower) {
    scene.traverse((obj) => {
        if (obj.isMesh) {
            obj.castShadow = false;
            obj.receiveShadow = false;
            obj.frustumCulled = true;
        }
    });
} else {
    renderer.shadowMap.needsUpdate = true;
}
colliders.forEach(c => fps.addCollider(c));
const animatedSceneObjects = [];
scene.traverse((obj) => {
    if (obj.userData?.isFan) animatedSceneObjects.push(obj);
});

// --- Interaction system ---
const interaction = new InteractionSystem();
interaction.setZones(interactionZones);

// --- State ---
let state = 'splash';    // splash | exploring | blackjack | poker | roulette | atm | bar
let bjCtrl = null;
let pkCtrl = null;
let rtCtrl = null;
let playerChips = 1000;
let drinksCount = 0;
let soberAccumulator = 0;
let isBlackout = false;
const mobileLiteMode = quality.isMobileLike;

// --- Clock ---
const clock = new THREE.Clock();

// --- Transition animation manager ---
const transitionAnim = new AnimationManager();

// --- Saved FPS state (position/rotation before entering game) ---
let savedCamPos = null;
let savedCamQuat = null;

/* ==================================================================
   Place camera at spawn
   ================================================================== */
function teleportToSpawn() {
    const sp = getSpawnPosition();
    const la = getSpawnLookAt();
    camera.position.copy(sp);
    camera.lookAt(la);
}
teleportToSpawn();

/* ==================================================================
   Splash / Start screen – click to enter
   ================================================================== */
const splashEl = document.getElementById('splash-screen');
const lockHintEl = document.getElementById('lock-hint');

function enterCasino() {
    state = 'exploring';
    if (splashEl) splashEl.style.display = 'none';
    fps.enabled = true;
    interaction.showAll();
    document.getElementById('fps-hud').style.display = 'block';
    _updateFPSChipsDisplay();
    if (touch.isTouchDevice) {
        _hideLockHint();
        touch.setVisible(true);
        interaction.showCrosshair();
    } else {
        _showLockHint();
    }
}

if (splashEl) {
    bindPress(splashEl, enterCasino);
}

// Click anywhere on canvas → lock pointer
renderer.domElement.addEventListener('click', () => {
    if (state === 'exploring' && !fps.locked && !touch.isTouchDevice) {
        fps.lock();
    }
});

// Lock-hint overlay itself is clickable — redirect to canvas lock
if (lockHintEl) {
    bindPress(lockHintEl, () => {
        if (state === 'exploring' && !fps.locked) {
            _hideLockHint();
            fps.lock();
        }
    });
}

// Track pointer-lock changes to show/hide hint overlay
document.addEventListener('pointerlockchange', () => {
    if (state !== 'exploring') return;
    if (fps.locked) {
        _hideLockHint();
        interaction.showCrosshair();
    } else {
        _showLockHint();
    }
});

function _showLockHint() {
    if (lockHintEl) lockHintEl.style.display = 'flex';
}
function _hideLockHint() {
    if (lockHintEl) lockHintEl.style.display = 'none';
}

/* ==================================================================
   Interaction callbacks
   ================================================================== */
interaction.onInteract = (zoneName) => {
    if (state !== 'exploring') return;
    if (zoneName === 'blackjack') enterBlackjack();
    else if (zoneName === 'poker') enterPoker();
    else if (zoneName === 'roulette') enterRoulette();
    else if (zoneName === 'bar') enterBar();
    else if (zoneName === 'atm') enterATM();
    else if (zoneName.startsWith('slot-')) playSlotMachine(zoneName);
};

// Touch interact button
touch.onInteract = () => {
    if (state !== 'exploring') return;
    interaction.update(camera.position);
    interaction.interactActiveZone();
};

const SLOT_SYMBOL_COLORS = [0xD32F2F, 0x2E7D32, 0xFBC02D];
const SLOT_SYMBOL_EMISSIVES = [0x330000, 0x003300, 0x332200];

async function playSlotMachine(zoneName) {
    const bet = 10;
    if (playerChips < bet) {
        showToast('Sem fichas suficientes para jogar slots');
        return;
    }

    const zone = interactionZones.find(z => z.name === zoneName);
    const slotReels = zone?.slotReels;
    if (slotReels?.some(r => r.spinning)) return;

    playerChips -= bet;
    _updateFPSChipsDisplay();

    const finalIdxs = [
        Math.floor(Math.random() * SLOT_SYMBOL_COLORS.length),
        Math.floor(Math.random() * SLOT_SYMBOL_COLORS.length),
        Math.floor(Math.random() * SLOT_SYMBOL_COLORS.length),
    ];

    if (slotReels) {
        const durations = [1100, 1450, 1750];
        await Promise.all(slotReels.map((sr, i) =>
            _animateSlotReel(sr, finalIdxs[i], durations[i])
        ));
    }

    const allMatch = finalIdxs[0] === finalIdxs[1] && finalIdxs[1] === finalIdxs[2];
    const prize = allMatch ? (finalIdxs[0] === 2 ? 250 : 100) : 0;
    playerChips += prize;
    _updateFPSChipsDisplay();
    showToast(prize > 0 ? `Slots: ganhaste $${prize}!` : `Slots: perdeste $${bet}`);
}

function _animateSlotReel(slotReel, finalIdx, duration) {
    return new Promise(resolve => {
        slotReel.spinning = true;
        const group = slotReel.group;
        const mat = slotReel.symbol.material;
        const t0 = performance.now();
        let lastColorChange = 0;
        let cycleIdx = 0;

        const step = () => {
            const now = performance.now();
            const t = Math.min((now - t0) / duration, 1);
            const ease = AnimationManager.easeOutCubic(t);

            // Vertical spin (≈8 full rotations, decelerating)
            group.rotation.x = Math.PI * 16 * ease;

            // Cycle symbol color while clearly spinning
            if (t < 0.88 && now - lastColorChange > 70) {
                cycleIdx = (cycleIdx + 1) % SLOT_SYMBOL_COLORS.length;
                mat.color.setHex(SLOT_SYMBOL_COLORS[cycleIdx]);
                mat.emissive.setHex(SLOT_SYMBOL_EMISSIVES[cycleIdx]);
                lastColorChange = now;
            }

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                group.rotation.x = 0;
                mat.color.setHex(SLOT_SYMBOL_COLORS[finalIdx]);
                mat.emissive.setHex(SLOT_SYMBOL_EMISSIVES[finalIdx]);
                slotReel.spinning = false;
                resolve();
            }
        };
        requestAnimationFrame(step);
    });
}

function showToast(message) {
    const el = document.getElementById('interaction-prompt');
    if (!el) return;
    const previous = el.textContent;
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        if (state === 'exploring') el.textContent = previous || '';
    }, 1200);
}

// Touch menu button
touch.onMenuToggle = () => {
    if (touch.isTouchDevice) {
        if (state === 'blackjack') exitBlackjack();
        else if (state === 'poker') exitPoker();
        else if (state === 'roulette') exitRoulette();
        else if (state === 'atm') atm.close();
        else if (state === 'bar') bar.close();
        return;
    }
    if (state === 'exploring' && lockHintEl) {
        if (fps.locked) {
            _showLockHint();
            fps.unlock();
        } else {
            _hideLockHint();
            fps.lock();
        }
    }
};

/* ==================================================================
   Enter / Exit Blackjack
   ================================================================== */
function enterBlackjack() {
    if (state !== 'exploring') return;
    state = 'blackjack';
    savedCamPos = camera.position.clone();
    savedCamQuat = camera.quaternion.clone();

    touch.reset();
    touch.setVisible(false);
    fps.stopMovement();
    fps.enabled = false;
    fps.unlock();
    interaction.hideAll();
    document.getElementById('fps-hud').style.display = 'none';

    const zone = interactionZones.find(z => z.name === 'blackjack');
    // Overhead gameplay view for clearer cards/animations
    const seatPos = new THREE.Vector3(zone.position.x, 5.4, zone.position.z + 2.2);
    const lookTarget = new THREE.Vector3(zone.position.x, 0.9, zone.position.z);

    // Smooth camera walk to seat
    transitionAnim.smoothCameraMove(camera, seatPos, lookTarget, mobileLiteMode ? 120 : 700).then(() => {
        document.getElementById('bj-hud').style.display = 'block';

        try {
            bjCtrl = new BlackjackController(scene, camera, zone.position, { liteMode: mobileLiteMode });
            bjCtrl.playerChips = playerChips;
            bjCtrl.init();
            bjCtrl._updateBetUI();
        } catch (err) {
            console.error('Blackjack enter error:', err);
            showToast('Erro ao abrir Blackjack');
            exitBlackjack();
        }
    }).catch(err => {
        console.error('Blackjack camera error:', err);
        exitBlackjack();
    });
}

function exitBlackjack() {
    if (bjCtrl) {
        playerChips = bjCtrl.playerChips;
        bjCtrl.dispose();
        bjCtrl = null;
    }
    document.getElementById('bj-hud').style.display = 'none';
    document.getElementById('bj-message').style.display = 'none';
    _returnToExploring();
}

/* ==================================================================
   Enter / Exit Poker
   ================================================================== */
function enterPoker() {
    if (state !== 'exploring') return;
    state = 'poker';
    savedCamPos = camera.position.clone();
    savedCamQuat = camera.quaternion.clone();

    touch.reset();
    touch.setVisible(false);
    fps.stopMovement();
    fps.enabled = false;
    fps.unlock();
    interaction.hideAll();
    document.getElementById('fps-hud').style.display = 'none';

    const zone = interactionZones.find(z => z.name === 'poker');
    // Overhead gameplay view for clearer cards/animations
    const seatPos = new THREE.Vector3(zone.position.x, 5.4, zone.position.z + 2.2);
    const lookTarget = new THREE.Vector3(zone.position.x, 0.9, zone.position.z);

    transitionAnim.smoothCameraMove(camera, seatPos, lookTarget, mobileLiteMode ? 120 : 700).then(() => {
        document.getElementById('pk-hud').style.display = 'block';

        try {
            pkCtrl = new PokerController(scene, camera, zone.position, { liteMode: mobileLiteMode });
            pkCtrl.playerChips = playerChips;
            pkCtrl.init();
            pkCtrl.startRound().catch(err => {
                console.error('Poker start error:', err);
                showToast('Erro ao iniciar Poker');
            });
        } catch (err) {
            console.error('Poker enter error:', err);
            showToast('Erro ao abrir Poker');
            exitPoker();
        }
    }).catch(err => {
        console.error('Poker camera error:', err);
        exitPoker();
    });
}

function exitPoker() {
    if (pkCtrl) {
        playerChips = pkCtrl.playerChips;
        pkCtrl.dispose();
        pkCtrl = null;
    }
    document.getElementById('pk-hud').style.display = 'none';
    document.getElementById('pk-message').style.display = 'none';
    _returnToExploring();
}

/* ==================================================================
   Enter / Exit Roulette
   ================================================================== */
function enterRoulette() {
    if (state !== 'exploring') return;
    state = 'roulette';
    savedCamPos = camera.position.clone();
    savedCamQuat = camera.quaternion.clone();

    touch.reset();
    touch.setVisible(false);
    fps.stopMovement();
    fps.enabled = false;
    fps.unlock();
    interaction.hideAll();
    document.getElementById('fps-hud').style.display = 'none';

    const zone = interactionZones.find(z => z.name === 'roulette');
    // Overhead view for roulette so player can clearly see wheel spin and ball landing
    const seatPos = new THREE.Vector3(zone.position.x, 5.2, zone.position.z + 2.1);
    const lookTarget = new THREE.Vector3(zone.position.x, 0.95, zone.position.z);

    transitionAnim.smoothCameraMove(camera, seatPos, lookTarget, mobileLiteMode ? 120 : 700).then(() => {
        document.getElementById('rt-hud').style.display = 'block';

        try {
            rtCtrl = new RouletteController(scene, camera, zone.position, { liteMode: mobileLiteMode });
            rtCtrl.playerChips = playerChips;
            rtCtrl.init();
        } catch (err) {
            console.error('Roulette enter error:', err);
            showToast('Erro ao abrir Roleta');
            exitRoulette();
        }
    }).catch(err => {
        console.error('Roulette camera error:', err);
        exitRoulette();
    });
}

function exitRoulette() {
    if (rtCtrl) {
        playerChips = rtCtrl.playerChips;
        rtCtrl.dispose();
        rtCtrl = null;
    }
    document.getElementById('rt-hud').style.display = 'none';
    document.getElementById('rt-message').style.display = 'none';
    _returnToExploring();
}

/* ==================================================================
   Enter / Exit ATM
   ================================================================== */
const atm = new ATMSystem((amount) => {
    playerChips += amount;
    atm.updateBalance(playerChips);
    _updateFPSChipsDisplay();
});

const bar = new BarSystem(() => {
    if (isBlackout) return;
    drinksCount += 1;
    soberAccumulator = 0;
    const drunkLevel = Math.min(1, drinksCount / 20);
    fps.setDrunkLevel(drunkLevel);
    bar.update(drinksCount, _getDrunkStatus(drunkLevel));

    if (drinksCount >= 20) {
        _triggerBlackout();
    }
}, scene, camera);

function enterATM() {
    state = 'atm';
    savedCamPos = camera.position.clone();
    savedCamQuat = camera.quaternion.clone();

    fps.enabled = false;
    fps.unlock();
    interaction.hideAll();
    document.getElementById('fps-hud').style.display = 'none';

    const zone = interactionZones.find(z => z.name === 'atm');
    const seatPos = zone.approachPos.clone();
    const lookTarget = zone.lookAt.clone();

    transitionAnim.smoothCameraMove(camera, seatPos, lookTarget, 500).then(() => {
        atm.open(playerChips);
    });
}

atm.onClose = () => {
    if (state !== 'atm') return;
    _returnToExploring();
};

/* ==================================================================
   Enter / Exit Bar
   ================================================================== */
function enterBar() {
    state = 'bar';
    savedCamPos = camera.position.clone();
    savedCamQuat = camera.quaternion.clone();

    fps.enabled = false;
    fps.unlock();
    interaction.hideAll();
    document.getElementById('fps-hud').style.display = 'none';

    const zone = interactionZones.find(z => z.name === 'bar');
    const seatPos = zone.approachPos.clone();
    const lookTarget = zone.lookAt.clone();

    transitionAnim.smoothCameraMove(camera, seatPos, lookTarget, 500).then(() => {
        bar.open(drinksCount, _getDrunkStatus(fps.drunkLevel));
    });
}

bar.onClose = () => {
    if (state !== 'bar') return;
    _returnToExploring();
};

function _getDrunkStatus(level) {
    if (level < 0.08) return 'Sóbrio';
    if (level < 0.25) return 'Leve';
    if (level < 0.45) return 'Alegre';
    if (level < 0.7) return 'Tocado';
    if (level < 0.95) return 'Bêbado';
    return 'Alcoólico';
}

function _decaySobriety(delta) {
    if (isBlackout || drinksCount <= 0) return;
    soberAccumulator += delta;
    if (soberAccumulator < 60) return;

    const removed = Math.floor(soberAccumulator / 60);
    soberAccumulator -= removed * 60;
    drinksCount = Math.max(0, drinksCount - removed);

    const drunkLevel = Math.min(1, drinksCount / 20);
    fps.setDrunkLevel(drunkLevel);
    if (bar.isOpen) {
        bar.update(drinksCount, _getDrunkStatus(drunkLevel));
    }
}

function _triggerBlackout() {
    if (isBlackout) return;
    const wasBar = state === 'bar';
    isBlackout = true;
    state = 'blackout';

    if (wasBar) {
        bar.playBlackoutFall();
    }

    fps.enabled = false;
    fps.unlock();
    interaction.hideAll();
    document.getElementById('fps-hud').style.display = 'none';

    const overlay = document.getElementById('blackout-overlay');
    const msg = document.getElementById('blackout-message');
    if (msg) msg.textContent = 'Coma alcoólico';

    const startPos = camera.position.clone();
    const startQ = camera.quaternion.clone();
    const startEuler = new THREE.Euler().setFromQuaternion(startQ, 'YXZ');
    const endEuler = new THREE.Euler(startEuler.x - 0.95, startEuler.y, 0.38, 'YXZ');
    const endQ = new THREE.Quaternion().setFromEuler(endEuler);

    const duration = 1100;
    const t0 = performance.now();
    const fallStep = () => {
        const t = Math.min((performance.now() - t0) / duration, 1);
        const e = AnimationManager.easeInOutCubic(t);

        camera.position.lerpVectors(startPos, new THREE.Vector3(startPos.x, startPos.y - 0.42, startPos.z), e);
        camera.quaternion.slerpQuaternions(startQ, endQ, e);

        if (t < 1) {
            requestAnimationFrame(fallStep);
            return;
        }

        if (overlay) {
            overlay.style.display = 'flex';
            requestAnimationFrame(() => overlay.classList.add('show'));
        }

        setTimeout(() => {
            window.location.reload();
        }, 1800);
    };

    requestAnimationFrame(fallStep);
}

/* ==================================================================
   Return to exploring
   ================================================================== */
function _returnToExploring() {
    state = 'exploring';
    // Smooth return to saved position
    if (savedCamPos && savedCamQuat) {
        const targetPos = savedCamPos.clone();
        const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(savedCamQuat);
        const lookTarget = targetPos.clone().add(lookDir);
        transitionAnim.smoothCameraMove(camera, targetPos, lookTarget, 500).then(() => {
            camera.quaternion.copy(savedCamQuat);
            touch.reset();
            touch.setVisible(true);
            fps.stopMovement();
            fps.enabled = true;
            fps.euler.setFromQuaternion(camera.quaternion);
            interaction.showAll();
            document.getElementById('fps-hud').style.display = 'block';
            _updateFPSChipsDisplay();
            if (touch.isTouchDevice) _hideLockHint();
            else _showLockHint();
        });
    } else {
        touch.reset();
        touch.setVisible(true);
        fps.stopMovement();
        fps.enabled = true;
        interaction.showAll();
        document.getElementById('fps-hud').style.display = 'block';
        _updateFPSChipsDisplay();
        if (touch.isTouchDevice) _hideLockHint();
        else _showLockHint();
    }
}

function _updateFPSChipsDisplay() {
    const el = document.getElementById('fps-chips');
    if (el) el.textContent = `$${playerChips}`;
}

/* ==================================================================
   Back-to-menu (exit game) buttons
   ================================================================== */
document.querySelectorAll('.btn-back-menu').forEach(btn => {
    bindPress(btn, () => {
        if (state === 'blackjack') exitBlackjack();
        else if (state === 'poker') exitPoker();
        else if (state === 'roulette') exitRoulette();
        else if (state === 'bar') bar.close();
    });
});

/* ==================================================================
   Roulette bindings
   ================================================================== */
const rouletteGridEl = document.getElementById('rt-number-grid');
if (rouletteGridEl) {
    for (let num = 0; num <= 36; num++) {
        const btn = document.createElement('button');
        btn.className = 'rt-number-btn';
        btn.dataset.num = String(num);
        btn.textContent = String(num);
        if (num === 0) btn.classList.add('rt-num-green');
        else {
            const redNums = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
            btn.classList.add(redNums.has(num) ? 'rt-num-red' : 'rt-num-black');
        }
        bindPress(btn, () => {
            if (!rtCtrl) return;
            const amount = parseInt(document.getElementById('rt-bet-amount')?.value || '50');
            rtCtrl.placeBet(amount, 'number', num);
        });
        rouletteGridEl.appendChild(btn);
    }
}

document.querySelectorAll('.rt-color-btn').forEach(btn => {
    bindPress(btn, () => {
        if (!rtCtrl) return;
        const amount = parseInt(document.getElementById('rt-bet-amount')?.value || '50');
        rtCtrl.placeBet(amount, 'color', btn.dataset.color);
    });
});

bindPress(document.getElementById('rt-clear-bet'), () => rtCtrl?.clearBet());
bindPress(document.getElementById('rt-spin'), () => rtCtrl?.spin());

/* ==================================================================
   Blackjack button bindings
   ================================================================== */
document.querySelectorAll('.chip-btn').forEach(btn => {
    bindPress(btn, () => {
        if (bjCtrl) bjCtrl.placeBet(parseInt(btn.dataset.value));
    });
});
bindPress(document.getElementById('bj-clear-bet'), () => bjCtrl?.clearBet());
bindPress(document.getElementById('bj-deal'), () => bjCtrl?.deal());
bindPress(document.getElementById('bj-hit'), () => bjCtrl?.hit());
bindPress(document.getElementById('bj-stand'), () => bjCtrl?.stand());
bindPress(document.getElementById('bj-double'), () => bjCtrl?.doubleDown());
bindPress(document.getElementById('bj-new-round-btn'), () => bjCtrl?.newRound());

/* ==================================================================
   Poker button bindings
   ================================================================== */
bindPress(document.getElementById('pk-fold'), () => pkCtrl?.playerFold());
bindPress(document.getElementById('pk-check'), () => pkCtrl?.playerCheck());
bindPress(document.getElementById('pk-call'), () => pkCtrl?.playerCall());
bindPress(document.getElementById('pk-raise'), () => pkCtrl?.playerRaise());
bindPress(document.getElementById('pk-allin'), () => pkCtrl?.playerAllIn());
bindPress(document.getElementById('pk-start-round-btn'), () => pkCtrl?.startRound());

/* ==================================================================
   ESC to exit current game
   ================================================================== */
document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        if (state === 'blackjack') exitBlackjack();
        else if (state === 'poker') exitPoker();
        else if (state === 'roulette') exitRoulette();
        else if (state === 'bar') bar.close();
        // ATM handles its own ESC via ATMSystem
        // When exploring, ESC releases pointer lock (browser default) —
        // the pointerlockchange listener above handles showing the hint.
    }
});

/* ==================================================================
   Animation loop
   ================================================================== */
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    _decaySobriety(delta);

    if (state === 'exploring') {
        if (touch.isTouchDevice) {
            const look = touch.getLookDelta();
            if (look.x || look.y) {
                fps.rotateBy(look.x, look.y, 1.9);
            }
        }

        // Sync touch controls with FPS
        const touchInput = touch.getMovementInput();
        if (touch.isTouchDevice) {
            fps.moveForward = touchInput.forward;
            fps.moveBackward = touchInput.backward;
            fps.moveLeft = touchInput.left;
            fps.moveRight = touchInput.right;
            fps.isSprinting = touchInput.sprint;
        }
        
        fps.update(delta);
        interaction.update(camera.position);
    }

    if (bjCtrl) bjCtrl.update();
    if (pkCtrl) pkCtrl.update();
    if (rtCtrl) rtCtrl.update();
    if (bar) bar.update3D();
    animatedSceneObjects.forEach((obj) => {
        obj.rotation.y += (obj.userData.spinSpeed || 1.6) * delta;
    });

    renderer.render(scene, camera);
}
animate();

/* ==================================================================
   Resize
   ================================================================== */
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(quality.pixelRatio);
});
