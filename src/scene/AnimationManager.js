import * as THREE from 'three';

/* ==================================================================
   AnimationManager – enhanced promise-based tweens + character animations
   Smooth dealing, realistic reactions, idle breathing & eye movement
   ================================================================== */
export class AnimationManager {
    constructor() {
        this.active = [];
        this.characters = [];
        this._startTime = performance.now();
    }

    /* ---- core tween engine ---- */
    animate(target, prop, endVal, duration, easeFn = AnimationManager.easeInOutCubic) {
        return new Promise(resolve => {
            const start = target[prop];
            const delta = endVal - start;
            const t0 = performance.now();
            this.active.push({ target, prop, start, delta, duration, t0, easeFn, resolve });
        });
    }

    update() {
        const now = performance.now();

        // Idle animations run FIRST so that any active reaction tween (processed
        // afterwards) overrides the idle pose on the same frame. Previously idle
        // ran last and overwrote the head/body reaction tweens every frame, so
        // only arm-based reactions like 'check' were ever visible.
        const elapsed = (now - this._startTime) * 0.001;
        this.characters.forEach(c => {
            if (!c.userData) return;
            const phase = c.userData.breathePhase || 0;
            const t = elapsed + phase;
            const baseY = c.userData.baseY || 0;

            // Breathing
            c.position.y = baseY + Math.sin(t * 1.3) * 0.012;

            const head = this._findPart(c, 'head')
                || c.children.find(ch => ch.position && ch.position.y > 1.45 && ch.position.y < 1.9);
            if (head) {
                head.rotation.z = Math.sin(t * 0.7 + phase) * 0.02;
                head.rotation.x = Math.sin(t * 0.5 + phase * 2) * 0.015;
            }

            ['left', 'right'].forEach(sideName => {
                const side = sideName === 'right' ? 1 : -1;
                this._findParts(c, sideName, ['Forearm', 'Cuff', 'Hand']).forEach(ch => {
                    ch.rotation.x = Math.sin(t * 0.9 + side * 1.5) * 0.025;
                });
            });
        });

        // Process tweens AFTER idle so reactions take precedence over breathing.
        this.active = this.active.filter(a => {
            const t = Math.min((now - a.t0) / a.duration, 1);
            a.target[a.prop] = a.start + a.delta * a.easeFn(t);
            if (t >= 1) { a.resolve(); return false; }
            return true;
        });
    }

    registerCharacter(charGroup) {
        this.characters.push(charGroup);
    }

    _findPart(charGroup, part) {
        let found = null;
        charGroup.traverse(obj => {
            if (!found && obj.userData?.part === part) found = obj;
        });
        return found;
    }

    _findParts(charGroup, side, names) {
        const wanted = new Set(names.map(name => `${side}${name}`));
        const parts = [];
        charGroup.traverse(obj => {
            if (wanted.has(obj.userData?.part)) parts.push(obj);
        });
        return parts;
    }

    /* ---- multi-prop tween ---- */
    moveTo(obj, targetPos, duration = 400) {
        return Promise.all([
            this.animate(obj.position, 'x', targetPos.x, duration),
            this.animate(obj.position, 'y', targetPos.y !== undefined ? targetPos.y : obj.position.y, duration),
            this.animate(obj.position, 'z', targetPos.z, duration),
        ]);
    }

    /* ---- card flip with lift ---- */
    flipCard(mesh, duration = 350) {
        const faceUp = !mesh.userData.faceUp;
        mesh.userData.faceUp = faceUp;
        const targetZ = faceUp ? 0 : Math.PI;
        const currentY = mesh.position.y;
        const liftY = currentY + 0.06;

        return Promise.all([
            this.animate(mesh.rotation, 'z', targetZ, duration, AnimationManager.easeOutBack),
            this.animate(mesh.position, 'y', liftY, duration * 0.4).then(() =>
                this.animate(mesh.position, 'y', currentY, duration * 0.6, AnimationManager.easeInOutCubic)
            ),
        ]);
    }

    /* ---- deal from deck with realistic slide ---- */
    async dealCard(mesh, targetPos, faceUp = true, delay = 0) {
        if (delay > 0) await this.wait(delay);

        // Start near the target area (simulates dealer sliding)
        mesh.position.set(targetPos.x + 2.5, (targetPos.y || 0.92) + 0.12, targetPos.z - 1.5);
        mesh.rotation.z = Math.PI; // face-down
        mesh.rotation.y = 0.25;
        mesh.scale.set(0.85, 0.85, 0.85);
        mesh.userData.faceUp = false;

        // Phase 1: Slide toward position with a small arc
        const midX = (mesh.position.x + targetPos.x) * 0.55;
        const midZ = (mesh.position.z + targetPos.z) * 0.55;
        await Promise.all([
            this.animate(mesh.position, 'x', midX, 160, AnimationManager.easeInOutCubic),
            this.animate(mesh.position, 'y', (targetPos.y || 0.92) + 0.06, 160, AnimationManager.easeOutCubic),
            this.animate(mesh.position, 'z', midZ, 160, AnimationManager.easeInOutCubic),
            this.animate(mesh.rotation, 'y', 0.1, 160),
            this.animate(mesh.scale, 'x', 0.92, 160),
            this.animate(mesh.scale, 'y', 0.92, 160),
        ]);

        // Phase 2: Land at final position
        await Promise.all([
            this.animate(mesh.position, 'x', targetPos.x, 200, AnimationManager.easeOutCubic),
            this.animate(mesh.position, 'y', targetPos.y !== undefined ? targetPos.y : 0.92, 200),
            this.animate(mesh.position, 'z', targetPos.z, 200, AnimationManager.easeOutCubic),
            this.animate(mesh.rotation, 'y', 0, 200),
            this.animate(mesh.scale, 'x', 1, 200),
            this.animate(mesh.scale, 'y', 1, 200),
            this.animate(mesh.scale, 'z', 1, 200),
        ]);

        // Phase 3: Flip
        if (faceUp) {
            await this.wait(50);
            await this.flipCard(mesh, 280);
        }
    }

    /* ---- Smooth camera transition ---- */
    async smoothCameraMove(camera, targetPos, targetLookAt, duration = 800) {
        const startPos = camera.position.clone();
        const startQuat = camera.quaternion.clone();

        const tempCam = camera.clone();
        tempCam.position.copy(targetPos);
        tempCam.lookAt(targetLookAt);
        const targetQuat = tempCam.quaternion.clone();

        return new Promise(resolve => {
            const t0 = performance.now();
            const doStep = () => {
                const now = performance.now();
                const t = Math.min((now - t0) / duration, 1);
                const e = AnimationManager.easeInOutCubic(t);

                camera.position.lerpVectors(startPos, targetPos, e);
                camera.quaternion.slerpQuaternions(startQuat, targetQuat, e);

                if (t < 1) {
                    requestAnimationFrame(doStep);
                } else {
                    camera.position.copy(targetPos);
                    camera.quaternion.copy(targetQuat);
                    resolve();
                }
            };
            doStep();
        });
    }

    /* ---- character reactions (enhanced) ---- */
    async characterReact(charGroup, reaction = 'nod') {
        if (!charGroup) return;
        const head = this._findPart(charGroup, 'head')
            || charGroup.children.find(ch => ch.position && ch.position.y > 1.45);
        const baseY = charGroup.userData.baseY || charGroup.position.y;

        if (reaction === 'nod') {
            if (head) {
                const startX = head.rotation.x;
                await this.animate(head.rotation, 'x', startX + 0.18, 150, AnimationManager.easeOutCubic);
                await this.animate(head.rotation, 'x', startX - 0.04, 170, AnimationManager.easeInOutCubic);
                await this.animate(head.rotation, 'x', startX, 130, AnimationManager.easeInOutCubic);
            }
        } else if (reaction === 'shake') {
            if (head) {
                const startY = head.rotation.y;
                for (let i = 0; i < 2; i++) {
                    await this.animate(head.rotation, 'y', startY + 0.22, 110, AnimationManager.easeOutCubic);
                    await this.animate(head.rotation, 'y', startY - 0.22, 170, AnimationManager.easeInOutCubic);
                }
                await this.animate(head.rotation, 'y', startY, 130);
            }
        } else if (reaction === 'celebrate') {
            await Promise.all([
                this.animate(charGroup.position, 'y', baseY + 0.15, 200, AnimationManager.easeOutBack),
                head ? this.animate(head.rotation, 'x', -0.15, 200) : Promise.resolve(),
            ]);
            await this.wait(120);
            await this.animate(charGroup.position, 'y', baseY + 0.08, 130);
            await this.animate(charGroup.position, 'y', baseY + 0.12, 100);
            await Promise.all([
                this.animate(charGroup.position, 'y', baseY, 280, AnimationManager.easeInOutCubic),
                head ? this.animate(head.rotation, 'x', 0, 280) : Promise.resolve(),
            ]);
        } else if (reaction === 'think') {
            if (head) {
                const startX = head.rotation.x;
                const startZ = head.rotation.z;
                await Promise.all([
                    this.animate(head.rotation, 'z', startZ + 0.10, 260),
                    this.animate(head.rotation, 'x', startX + 0.07, 260),
                ]);
                await this.wait(350);
                await Promise.all([
                    this.animate(head.rotation, 'z', startZ, 220),
                    this.animate(head.rotation, 'x', startX, 220),
                ]);
            }
        } else if (reaction === 'surprise') {
            if (head) {
                await Promise.all([
                    this.animate(head.rotation, 'x', -0.2, 120, AnimationManager.easeOutBack),
                    this.animate(charGroup.position, 'y', baseY + 0.06, 120),
                ]);
                await this.wait(180);
                await Promise.all([
                    this.animate(head.rotation, 'x', 0, 280),
                    this.animate(charGroup.position, 'y', baseY, 280),
                ]);
            }
        } else if (reaction === 'fold') {
            if (head) {
                const startX = head.rotation.x;
                const startZ = head.rotation.z;
                await Promise.all([
                    this.animate(head.rotation, 'x', startX + 0.22, 230),
                    this.animate(head.rotation, 'z', startZ - 0.05, 230),
                ]);
                await this.wait(250);
                await Promise.all([
                    this.animate(head.rotation, 'x', startX, 280),
                    this.animate(head.rotation, 'z', startZ, 280),
                ]);
            }
        } else if (reaction === 'check') {
            const armParts = this._findParts(charGroup, 'left', ['UpperArm', 'Elbow', 'Forearm', 'Cuff', 'Hand']);
            if (armParts.length === 0) return;
            const starts = armParts.map(part => ({
                part,
                x: part.rotation.x,
                y: part.rotation.y,
                z: part.rotation.z,
                py: part.position.y,
            }));

            await Promise.all(armParts.map(part => Promise.all([
                this.animate(part.rotation, 'x', part.rotation.x - 0.55, 120, AnimationManager.easeOutCubic),
                this.animate(part.rotation, 'z', part.rotation.z - 0.22, 120, AnimationManager.easeOutCubic),
            ])).flat());
            await Promise.all(starts.map(({ part, py }) =>
                this.animate(part.position, 'y', py - 0.035, 80, AnimationManager.easeOutCubic)
            ));
            await Promise.all(starts.map(({ part, py }) =>
                this.animate(part.position, 'y', py, 110, AnimationManager.easeOutBack)
            ));
            await Promise.all(starts.map(({ part, x, y, z, py }) => Promise.all([
                this.animate(part.rotation, 'x', x, 180),
                this.animate(part.rotation, 'y', y, 180),
                this.animate(part.rotation, 'z', z, 180),
                this.animate(part.position, 'y', py, 180),
            ])).flat());
        } else if (reaction === 'call') {
            const headStartX = head?.rotation.x || 0;
            const rightArm = this._findParts(charGroup, 'right', ['UpperArm', 'Elbow', 'Forearm', 'Cuff', 'Hand']);
            const starts = rightArm.map(part => ({
                part,
                x: part.rotation.x,
                y: part.rotation.y,
                z: part.rotation.z,
                pz: part.position.z,
            }));

            await Promise.all([
                head ? this.animate(head.rotation, 'x', headStartX + 0.08, 140, AnimationManager.easeOutCubic) : Promise.resolve(),
                ...rightArm.map(part => this.animate(part.position, 'z', part.position.z + 0.045, 140, AnimationManager.easeOutCubic)),
            ]);
            await Promise.all([
                head ? this.animate(head.rotation, 'x', headStartX, 170, AnimationManager.easeInOutCubic) : Promise.resolve(),
                ...starts.map(({ part, pz }) => this.animate(part.position, 'z', pz, 170, AnimationManager.easeInOutCubic)),
            ]);
        } else if (reaction === 'raise') {
            const armParts = this._findParts(charGroup, 'right', ['UpperArm', 'Elbow', 'Forearm', 'Cuff', 'Hand']);
            const starts = armParts.map(part => ({
                part,
                x: part.rotation.x,
                y: part.rotation.y,
                z: part.rotation.z,
                py: part.position.y,
            }));
            const headStartX = head?.rotation.x || 0;

            await Promise.all([
                head ? this.animate(head.rotation, 'x', headStartX - 0.08, 160, AnimationManager.easeOutBack) : Promise.resolve(),
                ...armParts.map(part => Promise.all([
                    this.animate(part.rotation, 'x', part.rotation.x - 0.42, 160, AnimationManager.easeOutCubic),
                    this.animate(part.rotation, 'z', part.rotation.z + 0.18, 160, AnimationManager.easeOutCubic),
                    this.animate(part.position, 'y', part.position.y + 0.045, 160, AnimationManager.easeOutCubic),
                ])).flat(),
            ]);
            await this.wait(120);
            await Promise.all([
                head ? this.animate(head.rotation, 'x', headStartX, 220, AnimationManager.easeInOutCubic) : Promise.resolve(),
                ...starts.map(({ part, x, y, z, py }) => Promise.all([
                    this.animate(part.rotation, 'x', x, 220),
                    this.animate(part.rotation, 'y', y, 220),
                    this.animate(part.rotation, 'z', z, 220),
                    this.animate(part.position, 'y', py, 220),
                ])).flat(),
            ]);
        }
    }

    wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    /* ---- easing functions ---- */
    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    static easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    static easeOutBack(t) {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    static easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
}
