import * as THREE from 'three';
import { RouletteGame } from '../games/RouletteGame.js';
import { createCharacter, attachNamePlateTo, createChipStack } from '../scene/SceneElements.js';
import { AnimationManager } from '../scene/AnimationManager.js';

const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const SLOT_ANGLE_OFFSET = -Math.PI / 2;

export class RouletteController {
    constructor(scene, camera, tablePos) {
        this.scene = scene;
        this.camera = camera;
        this.tablePos = tablePos || new THREE.Vector3(0, 0, 0);

        this.game = new RouletteGame();
        this.anim = new AnimationManager();

        this.playerChips = 1000;
        this.currentBet = null;
        this.busy = false;

        this.sceneObjects = [];
        this.croupier = null;
        this.wheelGroup = null;
        this.ballPivot = null;
        this.ball = null;
        this.ballGlow = null;
        this.winningMarker = null;
        this.betStack = null;
        this._winMarkerPulseStart = 0;
        this._spinCancelled = false;
        this.wheelIndicator = null;
        this.wheelRotor = null;
        this._spinData = null;
        this._spinTickId = null;
    }

    init() {
        const ox = this.tablePos.x;
        const oz = this.tablePos.z;

        // Croupier
        this.croupier = createCharacter('Dealer', 0x1A1A1A, [ox, 0.02, oz - 4.1], [ox, 0, oz]);
        this.scene.add(this.croupier);
        this.anim.registerCharacter(this.croupier);
        this.sceneObjects.push(this.croupier);

        const croupierPlate = attachNamePlateTo(this.croupier, 'Croupier', '∞');
        this.sceneObjects.push(croupierPlate);

        this._buildWheel();
        this._updateUI();
    }

    _createNumberLabelMesh(num) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const txt = String(num);
        ctx.clearRect(0, 0, size, size);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 98px Arial';
        ctx.strokeStyle = num === 0 ? '#0f2f17' : '#101010';
        ctx.lineWidth = 10;
        ctx.lineJoin = 'round';
        ctx.strokeText(txt, size * 0.5, size * 0.5);
        ctx.fillStyle = num === 0 ? '#38C172' : '#ffffff';
        ctx.fillText(txt, size * 0.5, size * 0.5);

        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 4;

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.12,
            depthWrite: false,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -6,
            polygonOffsetUnits: -6,
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.10), material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 70;
        return mesh;
    }

    _buildWheel() {
        const ox = this.tablePos.x;
        const oz = this.tablePos.z;

        this.wheelGroup = new THREE.Group();

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(1.25, 1.4, 0.22, 42),
            new THREE.MeshPhysicalMaterial({ color: 0x3E2723, roughness: 0.35, clearcoat: 0.5 })
        );
        base.position.y = 0.9;
        base.castShadow = true;
        this.wheelGroup.add(base);

        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(1.18, 0.08, 12, 52),
            new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.2, metalness: 0.8 })
        );
        rim.position.y = 1.02;
        rim.rotation.x = Math.PI / 2;
        this.wheelGroup.add(rim);

        const wheelDisk = new THREE.Mesh(
            new THREE.CylinderGeometry(1.05, 1.05, 0.08, 42),
            new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.45, metalness: 0.2 })
        );
        wheelDisk.position.y = 1.02;
        wheelDisk.castShadow = true;
        this.wheelGroup.add(wheelDisk);

        const redNums = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
        for (let i = 0; i < WHEEL_ORDER.length; i++) {
            const num = WHEEL_ORDER[i];
            const ang = SLOT_ANGLE_OFFSET + (i / WHEEL_ORDER.length) * Math.PI * 2;
            const col = num === 0 ? 0x1f8c3b : (redNums.has(num) ? 0xb62828 : 0x141414);
            const pocket = new THREE.Mesh(
                new THREE.BoxGeometry(0.11, 0.028, 0.22),
                new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.25 })
            );
            pocket.position.set(Math.cos(ang) * 0.90, 1.056, Math.sin(ang) * 0.90);
            pocket.rotation.y = -ang;
            this.wheelGroup.add(pocket);

            const label = this._createNumberLabelMesh(num);
            if (label) {
                label.position.set(Math.cos(ang) * 0.90, 1.072, Math.sin(ang) * 0.90);
                label.rotation.z = -ang + Math.PI * 0.5;
                this.wheelGroup.add(label);
            }
        }

        const spindle = new THREE.Mesh(
            new THREE.ConeGeometry(0.14, 0.26, 18),
            new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.15, metalness: 0.8 })
        );
        spindle.position.y = 1.2;
        this.wheelGroup.add(spindle);

        const wheelTick = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.06, 0.22),
            new THREE.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x00E5FF, emissiveIntensity: 0.85 })
        );
        wheelTick.position.set(0, 1.12, 1.03);
        this.wheelGroup.add(wheelTick);

        this.wheelRotor = null;

        this.winningMarker = new THREE.Mesh(
            new THREE.TorusGeometry(0.08, 0.012, 8, 24),
            new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                emissive: 0xFFD700,
                emissiveIntensity: 0.55,
                roughness: 0.25,
                metalness: 0.65,
            })
        );
        this.winningMarker.rotation.x = Math.PI / 2;
        this.winningMarker.visible = false;
        this.wheelGroup.add(this.winningMarker);

        this.wheelGroup.position.set(ox, 0, oz);
        this.scene.add(this.wheelGroup);
        this.sceneObjects.push(this.wheelGroup);

        this.wheelIndicator = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.18, 12),
            new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xC59B2B, emissiveIntensity: 0.55 })
        );
        this.wheelIndicator.position.set(ox, 1.62, oz + 1.15);
        this.wheelIndicator.rotation.x = Math.PI;
        this.scene.add(this.wheelIndicator);
        this.sceneObjects.push(this.wheelIndicator);

        this.ballPivot = new THREE.Group();
        this.ballPivot.position.set(ox, 0, oz);

        this.ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 24, 24),
            new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.22, metalness: 0.05 })
        );
        this.ball.position.set(1.18, 1.13, 0);
        this.ball.renderOrder = 10;
        this.ball.castShadow = true;
        this.ballPivot.add(this.ball);

        this.ballGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0x9dd3ff, emissive: 0x6aa9e0, emissiveIntensity: 0.25, transparent: true, opacity: 0.22 })
        );
        this.ballGlow.position.copy(this.ball.position);
        this.ballGlow.renderOrder = 9;
        this.ballPivot.add(this.ballGlow);

        this.scene.add(this.ballPivot);
        this.sceneObjects.push(this.ballPivot);
    }

    placeBet(amount, type, value) {
        if (this.busy) return;
        if (amount <= 0 || this.playerChips < amount) return;

        if (this.currentBet) {
            this.playerChips += this.currentBet.amount;
        }

        this.currentBet = { amount, type, value };
        this.playerChips -= amount;

        this._markSelectedBet(type, value);
        this._updateBetStack();
        this._updateUI();
    }

    clearBet() {
        if (this.busy) return;
        if (!this.currentBet) return;

        this.playerChips += this.currentBet.amount;
        this.currentBet = null;
        this._clearSelectedBet();
        this._removeBetStack();
        this._updateUI();
    }

    async spin() {
        if (this.busy || !this.currentBet) return;
        this.busy = true;
        this._spinCancelled = false;
        this._spinData = null;
        const betSnapshot = { ...this.currentBet };
        let result = null;
        let pocketAngle = 0;

        try {
            if (this.winningMarker) this.winningMarker.visible = false;

            const msgEl = document.getElementById('rt-message');
            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.className = 'game-message msg-push rt-spin-message';
                msgEl.textContent = '🎯 A girar...';
            }

            result = this.game.spin(betSnapshot);
            const pocketIndex = WHEEL_ORDER.indexOf(result.winningNumber);
            pocketAngle = SLOT_ANGLE_OFFSET + ((pocketIndex >= 0 ? pocketIndex : 0) / WHEEL_ORDER.length) * Math.PI * 2;

            this.ball.position.set(1.18, 1.13, 0);
            if (this.ballGlow) {
                this.ballGlow.position.copy(this.ball.position);
                this.ballGlow.material.opacity = 0.22;
            }

            const animPromise = this._animateSpinToPocket(pocketAngle);
            this.anim.characterReact(this.croupier, 'think').catch(() => {});
            const animOk = await animPromise;
            if (!animOk) {
                await this._animateEmergencySpin(pocketAngle);
            }
            if (this.wheelGroup && this.ballPivot && this.ball) {
                this.ballPivot.rotation.y = this.wheelGroup.rotation.y + pocketAngle;
                this.ball.position.set(0.90, 1.09, 0);
            }
            this._showWinningPocketMarker(pocketAngle);

            this.playerChips += result.payout;

            this._showResult(result, betSnapshot.amount);
            this.currentBet = null;
            this._clearSelectedBet();
            this._removeBetStack();
            this._updateUI();

            if (result.win) {
                this.anim.characterReact(this.croupier, 'shake').catch(() => {});
            } else {
                this.anim.characterReact(this.croupier, 'nod').catch(() => {});
            }
        } catch (err) {
            console.error('Roulette spin error:', err);
            // If we already had a computed result, finish the round anyway
            if (result) {
                if (this.ballPivot && this.ball) {
                    this.ballPivot.rotation.y = (this.wheelGroup?.rotation?.y || 0) + pocketAngle;
                    this.ball.position.set(0.86, 1.08, 0);
                    if (this.ballGlow) this.ballGlow.position.copy(this.ball.position);
                }
                this._showWinningPocketMarker(pocketAngle);
                this.playerChips += result.payout;
                this._showResult(result, betSnapshot.amount);
                this.currentBet = null;
                this._clearSelectedBet();
                this._removeBetStack();
                this._updateUI();
            } else {
                const msgEl = document.getElementById('rt-message');
                if (msgEl) {
                    msgEl.className = 'game-message msg-lose';
                    msgEl.textContent = 'Erro na roleta. Tenta novamente.';
                    msgEl.style.display = 'block';
                }
            }
        } finally {
            this.busy = false;
        }
    }

    async _animateSpinToPocket(pocketAngle) {
        if (!this.wheelGroup || !this.ballPivot || !this.ball) return false;

        return new Promise(resolve => {
            const duration = 12500;
            const startTs = performance.now();
            const startWheel = this.wheelGroup.rotation.y;
            const startBall = this.ballPivot.rotation.y;
            const wheelTravel = Math.PI * 2 * (2.8 + Math.random() * 0.35);
            const finalWheel = startWheel + wheelTravel;
            const finalBallBase = finalWheel + pocketAngle;
            const ballLaps = 11 + Math.floor(Math.random() * 4);
            const finalBall = finalBallBase - Math.PI * 2 * ballLaps;
            
            this._spinData = {
                active: true,
                resolve,
                startTs,
                duration,
                startWheel,
                startBall,
                wheelTravel,
                finalWheel,
                finalBall,
                finalBallBase,
                rattlePhase: Math.random() * Math.PI * 2,
            };
            
            const tick = () => {
                if (!this._spinData?.active || this._spinCancelled) {
                    if (this._spinTickId) cancelAnimationFrame(this._spinTickId);
                    if (this._spinData?.active) {
                        this._spinData.active = false;
                        this._spinData.resolve(false);
                    }
                    return;
                }
                
                const now = performance.now();
                const t = Math.min((now - this._spinData.startTs) / this._spinData.duration, 1);
                const gainEnd = 0.24;
                const releaseEnd = 0.48;
                const houseEnd = 0.90;
                const settleEnd = 0.985;
                const wheelEase = 1 - Math.pow(1 - t, 2.4);

                // Update wheel
                const wheelAngle = this._spinData.startWheel + this._spinData.wheelTravel * wheelEase;
                this.wheelGroup.rotation.y = wheelAngle;

                const rOuter = 1.18;
                const rInner = 1.03;
                const rPocket = 0.90;
                const yOuter = 1.135;
                const yInner = 1.108;
                const yPocket = 1.09;

                let ballAngle;
                let radius;
                let y;

                if (t < gainEnd) {
                    // The wheel starts moving and the ball accelerates on the outer rail.
                    const u = t / gainEnd;
                    const e = u * u;
                    const travel = (this._spinData.finalBall - this._spinData.startBall) * 0.18;
                    ballAngle = this._spinData.startBall + travel * e;
                    radius = rOuter;
                    y = yOuter;
                } else if (t < releaseEnd) {
                    // The croupier releases the ball into the inner track.
                    const u = (t - gainEnd) / (releaseEnd - gainEnd);
                    const e = AnimationManager.easeInOutCubic(u);
                    const angleA = this._spinData.startBall + (this._spinData.finalBall - this._spinData.startBall) * 0.18;
                    const angleB = this._spinData.startBall + (this._spinData.finalBall - this._spinData.startBall) * 0.50;
                    ballAngle = angleA + (angleB - angleA) * (1 - Math.pow(1 - u, 1.45));
                    radius = rOuter + (rInner - rOuter) * e;
                    y = yOuter + (yInner - yOuter) * e;
                } else if (t < houseEnd) {
                    // The ball runs over the numbered houses and steadily loses energy.
                    const u = (t - releaseEnd) / (houseEnd - releaseEnd);
                    const e = 1 - Math.pow(1 - u, 2.65);
                    const angleA = this._spinData.startBall + (this._spinData.finalBall - this._spinData.startBall) * 0.50;
                    const angleB = this._spinData.finalBall - Math.PI * 1.15;
                    const decay = 1 - u;
                    const houseRattle = Math.sin(u * Math.PI * 34 + this._spinData.rattlePhase) * 0.035 * decay;
                    ballAngle = angleA + (angleB - angleA) * e + houseRattle;
                    radius = rInner + (rPocket + 0.025 - rInner) * e + Math.sin(u * Math.PI * 18) * 0.008 * decay;
                    y = yInner + (yPocket + 0.012 - yInner) * e + Math.abs(Math.sin(u * Math.PI * 20)) * 0.018 * decay;
                } else if (t < settleEnd) {
                    // Last low-energy crawl across the separators before the ball drops.
                    const u = (t - houseEnd) / (settleEnd - houseEnd);
                    const e = 1 - Math.pow(1 - u, 3.2);
                    const angleA = this._spinData.finalBall - Math.PI * 1.15;
                    const angleB = this._spinData.finalBall;
                    const decay = Math.exp(-3.5 * u);
                    const lowHop = Math.sin(u * Math.PI * 9 + this._spinData.rattlePhase) * 0.026 * decay;
                    ballAngle = angleA + (angleB - angleA) * e + lowHop;
                    radius = rPocket + 0.025 + (rPocket - (rPocket + 0.025)) * e + Math.sin(u * Math.PI * 5) * 0.004 * decay;
                    y = yPocket + 0.012 + (yPocket - (yPocket + 0.012)) * e + Math.abs(Math.sin(u * Math.PI * 7)) * 0.008 * decay;
                } else {
                    // Small final vibration inside the selected house.
                    const u = (t - settleEnd) / (1 - settleEnd);
                    const decay = Math.exp(-7 * u);
                    const lastHop = Math.sin(u * Math.PI * 2.5) * 0.004 * decay;
                    ballAngle = this._spinData.finalBall + lastHop;
                    radius = rPocket + Math.sin(u * Math.PI * 4) * 0.004 * decay;
                    y = yPocket + Math.abs(Math.sin(u * Math.PI * 5)) * 0.010 * decay;
                }

                this.ballPivot.rotation.y = ballAngle;
                this.ball.position.set(radius, y, 0);
                if (this.ballGlow) {
                    this.ballGlow.position.copy(this.ball.position);
                    this.ballGlow.material.opacity = 0.10 + (1 - Math.min(1, t)) * 0.12;
                }
                const rollSpeed = Math.max(0.015, (1 - t) * 0.26);
                this.ball.rotation.x += rollSpeed;
                this.ball.rotation.z += rollSpeed * 0.62;

                // Check if done
                if (t >= 1) {
                    if (this._spinTickId) cancelAnimationFrame(this._spinTickId);
                    this._spinData.active = false;
                    this.wheelGroup.rotation.y = this._spinData.finalWheel;
                    this.ballPivot.rotation.y = this._spinData.finalBall;
                    this.ball.position.set(rPocket, yPocket, 0);
                    if (this.ballGlow) {
                        this.ballGlow.position.copy(this.ball.position);
                        this.ballGlow.material.opacity = 0.08;
                    }
                    this._spinData.resolve(true);
                    return;
                }

                this._spinTickId = requestAnimationFrame(tick);
            };

            this._spinTickId = requestAnimationFrame(tick);
        });
    }

    _showWinningPocketMarker(pocketAngle) {
        if (!this.winningMarker) return;
        this.winningMarker.visible = true;
        this.winningMarker.position.set(
            Math.cos(pocketAngle) * 0.95,
            1.13,
            Math.sin(pocketAngle) * 0.95
        );
        this._winMarkerPulseStart = performance.now();
        if (this.ballGlow) this.ballGlow.material.opacity = 0.18;
    }

    async _animateEmergencySpin(pocketAngle) {
        if (!this.ballPivot || !this.ball) return false;

        const duration = 2400;
        const startTs = performance.now();
        const startWheel = this.wheelGroup ? this.wheelGroup.rotation.y : 0;
        const startBall = this.ballPivot.rotation.y;
        const targetWheel = startWheel + Math.PI * 8;
        const targetBall = targetWheel + pocketAngle;

        return new Promise(resolve => {
            const tick = () => {
                if (this._spinCancelled || !this.ballPivot || !this.ball) {
                    resolve(false);
                    return;
                }

                const t = Math.min((performance.now() - startTs) / duration, 1);
                const e = AnimationManager.easeInOutCubic(t);

                if (this.wheelGroup) {
                    this.wheelGroup.rotation.y = startWheel + (targetWheel - startWheel) * e;
                }

                this.ballPivot.rotation.y = startBall + (targetBall - startBall) * e;

                const r = 1.12 + (0.9 - 1.12) * e;
                const y = 1.12 + (1.09 - 1.12) * e;
                this.ball.position.set(r, y, 0);
                if (this.ballGlow) {
                    this.ballGlow.position.copy(this.ball.position);
                    this.ballGlow.material.opacity = 0.18 - 0.10 * e;
                }

                if (t < 1) {
                    requestAnimationFrame(tick);
                    return;
                }

                resolve(true);
            };

            requestAnimationFrame(tick);
        });
    }

    _showResult(result, betAmount) {
        const msgEl = document.getElementById('rt-message');
        if (!msgEl) return;

        const isWin = result.win;
        const colorPt = result.winningColor === 'red' ? 'Vermelho' : result.winningColor === 'black' ? 'Preto' : 'Verde';

        msgEl.className = `game-message ${isWin ? 'msg-win' : 'msg-lose'}`;
        msgEl.textContent = isWin
            ? `🎉 ${result.winningNumber} ${colorPt} — Ganhaste $${result.payout - betAmount}`
            : `💸 ${result.winningNumber} ${colorPt} — Perdeste`;
        msgEl.style.display = 'block';
        setTimeout(() => {
            if (msgEl && msgEl.style.display !== 'none') {
                msgEl.style.display = 'none';
            }
        }, 3200);

        const lastEl = document.getElementById('rt-last-result');
        if (lastEl) {
            lastEl.textContent = `${result.winningNumber} (${colorPt})`;
            lastEl.className = `rt-result-${result.winningColor}`;
        }

        this._highlightWinningNumber(result.winningNumber);
    }

    _highlightWinningNumber(num) {
        document.querySelectorAll('.rt-number-btn').forEach(btn => {
            btn.classList.remove('rt-winning');
            if (Number(btn.dataset.num) === num) {
                btn.classList.add('rt-winning');
            }
        });
    }

    _clearSelectedBet() {
        document.querySelectorAll('.rt-number-btn').forEach(btn => btn.classList.remove('rt-selected'));
        document.querySelectorAll('.rt-color-btn').forEach(btn => btn.classList.remove('rt-selected'));
    }

    _markSelectedBet(type, value) {
        this._clearSelectedBet();
        if (type === 'number') {
            const btn = document.querySelector(`.rt-number-btn[data-num="${value}"]`);
            if (btn) btn.classList.add('rt-selected');
        } else if (type === 'color') {
            const btn = document.querySelector(`.rt-color-btn[data-color="${value}"]`);
            if (btn) btn.classList.add('rt-selected');
        }
    }

    _updateBetStack() {
        this._removeBetStack();
        if (!this.currentBet) return;
        this.betStack = createChipStack(this.currentBet.amount, this.tablePos.x + 1.2, this.tablePos.z + 0.7);
        this.scene.add(this.betStack);
    }

    _removeBetStack() {
        if (this.betStack) {
            this.scene.remove(this.betStack);
            this.betStack = null;
        }
    }

    _updateUI() {
        const chipsEl = document.getElementById('rt-player-chips');
        const betEl = document.getElementById('rt-current-bet');
        if (chipsEl) chipsEl.textContent = `$${this.playerChips}`;
        if (betEl) {
            if (!this.currentBet) {
                betEl.textContent = '—';
            } else if (this.currentBet.type === 'number') {
                betEl.textContent = `$${this.currentBet.amount} no número ${this.currentBet.value}`;
            } else {
                betEl.textContent = `$${this.currentBet.amount} em ${this.currentBet.value}`;
            }
        }
    }

    update() {
        this.anim.update();
        if (this.winningMarker && this.winningMarker.visible) {
            const elapsed = (performance.now() - this._winMarkerPulseStart) * 0.001;
            const pulse = 0.35 + 0.25 * Math.sin(elapsed * 5);
            this.winningMarker.material.emissiveIntensity = Math.max(0.2, pulse);
        }
    }

    dispose() {
        this._spinCancelled = true;
        if (this._spinTickId) {
            cancelAnimationFrame(this._spinTickId);
            this._spinTickId = null;
        }
        this._removeBetStack();
        this.sceneObjects.forEach(o => this.scene.remove(o));
        this.sceneObjects = [];
        this.winningMarker = null;
    }
}
