import * as THREE from 'three';
import { AnimationManager } from './AnimationManager.js';

/* ==================================================================
   BarSystem – 3D first-person beer mug interaction
   ================================================================== */

export class BarSystem {
    constructor(onDrink, scene, camera) {
        this.onDrink = onDrink;
        this.scene = scene;
        this.camera = camera;
        this.anim = new AnimationManager();

        this.isOpen = false;
        this.blackoutLocked = false;
        this.hasActiveMug = false;
        this.sipsTaken = 0;
        this.maxSips = 5;
        this.isSipping = false;

        this.mugGroup = null;
        this.mugLiquid = null;
        this._mugLocalPos = new THREE.Vector3(0.16, -0.16, -0.28);
        this._mugLocalEuler = new THREE.Euler(0.06, -0.48, -0.05, 'XYZ');

        this._modal = document.getElementById('bar-modal');
        this._drinksEl = document.getElementById('bar-drinks-count');
        this._statusEl = document.getElementById('bar-status');

        this._drinkBtn = document.getElementById('bar-drink-fino');
        this._closeBtn = document.getElementById('bar-close');

        this._drinkBtn?.addEventListener('click', () => {
            if (this.blackoutLocked) return;
            this._orderMug();
            this._flashDrink();
        });

        this._closeBtn?.addEventListener('click', () => this.close());

        this._onKey = (e) => {
            if (e.code === 'Escape' && this.isOpen) {
                e.preventDefault();
                this.close();
                return;
            }

            if (this.isOpen && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F')) {
                e.preventDefault();
                this._sipMug();
            }
        };
        document.addEventListener('keydown', this._onKey);
    }

    open(drinksCount = 0, status = 'Sóbrio') {
        this.isOpen = true;
        this.blackoutLocked = false;
        this.hasActiveMug = false;
        this.sipsTaken = 0;
        this.isSipping = false;
        if (this._drinkBtn) this._drinkBtn.disabled = false;
        if (this._closeBtn) this._closeBtn.disabled = false;
        if (this._drinkBtn) this._drinkBtn.textContent = 'Pedir fino';
        this._detachMug();
        this.update(drinksCount, status);
        if (this._modal) this._modal.style.display = 'flex';
    }

    close() {
        this.isOpen = false;
        this.hasActiveMug = false;
        this.sipsTaken = 0;
        this._detachMug();
        if (this._modal) this._modal.style.display = 'none';
        if (this.onClose) this.onClose();
    }

    update(drinksCount, status) {
        if (this._drinksEl) this._drinksEl.textContent = String(drinksCount);
        if (this._statusEl) this._statusEl.textContent = status;
    }

    _orderMug() {
        if (this.hasActiveMug || !this.isOpen || !this.camera) return;
        this.hasActiveMug = true;
        this.sipsTaken = 0;
        this._createMugIfNeeded();
        this._setBeerLevel(1);

        this._mugLocalPos.set(0.16, -0.16, -0.28);
        this._mugLocalEuler.set(0.06, -0.48, -0.05);
        this.mugGroup.visible = true;
        this.mugGroup.position.copy(this._mugLocalPos);
        this.mugGroup.rotation.copy(this._mugLocalEuler);
        if (this.camera) this.camera.add(this.mugGroup);

        if (this._drinkBtn) {
            this._drinkBtn.textContent = 'Caneca servida (F para beber)';
            this._drinkBtn.disabled = true;
        }
    }

    async _sipMug() {
        if (!this.hasActiveMug || this.isSipping || this.blackoutLocked || !this.mugGroup) return;
        this.isSipping = true;
        this.sipsTaken += 1;

        const startPos = this._mugLocalPos.clone();
        const startRot = this._mugLocalEuler.clone();
        const endPos = new THREE.Vector3(0.06, -0.05, -0.16);
        const endRot = new THREE.Euler(1.02, -0.46, -0.22);

        const duration = 280;

        await Promise.all([
            this.anim.animate(this._mugLocalPos, 'x', endPos.x, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalPos, 'y', endPos.y, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalPos, 'z', endPos.z, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalEuler, 'x', endRot.x, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalEuler, 'y', endRot.y, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalEuler, 'z', endRot.z, duration, AnimationManager.easeInOutCubic)
        ]);

        const pct = Math.max(0, 1 - this.sipsTaken / this.maxSips);
        this._setBeerLevel(pct);

        await Promise.all([
            this.anim.animate(this._mugLocalPos, 'x', startPos.x, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalPos, 'y', startPos.y, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalPos, 'z', startPos.z, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalEuler, 'x', startRot.x, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalEuler, 'y', startRot.y, duration, AnimationManager.easeInOutCubic),
            this.anim.animate(this._mugLocalEuler, 'z', startRot.z, duration, AnimationManager.easeInOutCubic)
        ]);

        this.isSipping = false;
        if (pct <= 0) {
            this.hasActiveMug = false;
            this._detachMug();
            if (this._drinkBtn) {
                this._drinkBtn.textContent = 'Pedir fino';
                this._drinkBtn.disabled = false;
            }
            if (this.onDrink) this.onDrink();
        }
    }

    _createMugIfNeeded() {
        if (this.mugGroup) return;

        const group = new THREE.Group();

        const glass = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.09, 0.25, 24),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.4,
                roughness: 0.1,
                transparent: true,
                opacity: 0.4, // Using standard alpha blending instead of transmission for depthTest: false to work correctly!
                side: THREE.DoubleSide
            })
        );
        group.add(glass);

        const liquid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.095, 0.085, 0.22, 24),
            new THREE.MeshStandardMaterial({ 
                color: 0xcc8800, 
                emissive: 0x8a4a00, 
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.9
            })
        );
        liquid.position.y = 0.0;
        group.add(liquid);
        this.mugLiquid = liquid;

        const foam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.096, 0.09, 0.03, 24),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 })
        );
        foam.position.y = 0.115;
        group.add(foam);

        const handle = new THREE.Mesh(
            new THREE.TorusGeometry(0.065, 0.015, 12, 24),
            new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                metalness: 0.4,
                roughness: 0.1,
                transparent: true,
                opacity: 0.4
             })
        );
        handle.position.set(0.11, 0.02, 0);
        handle.rotation.y = Math.PI / 2;
        group.add(handle);

        group.scale.setScalar(0.5);
        group.renderOrder = 999; // Ensure it's on top of everything
        group.traverse(obj => {
            if (!obj.isMesh || !obj.material) return;
            obj.renderOrder = 999;
            obj.material.depthTest = false;      // Disable depth test so it doesn't clip into environment walls
            obj.material.depthWrite = true;
        });
        group.visible = false;
        this.mugGroup = group;
    }

    _setBeerLevel(ratio) {
        if (!this.mugLiquid) return;
        const clamped = Math.max(0, Math.min(1, ratio));
        this.mugLiquid.scale.y = clamped;
        this.mugLiquid.position.y = -0.11 + (0.11 * clamped);
    }

    _detachMug() {
        if (!this.mugGroup) return;
        this.mugGroup.visible = false;
        this.camera?.remove(this.mugGroup);
    }

    update3D() {
        if (this.anim) this.anim.update();
        if (!this.hasActiveMug || !this.mugGroup || !this.camera) return;
        if (this.mugGroup.parent !== this.camera) {
            this.camera.add(this.mugGroup);
            this.mugGroup.visible = true;
        }
        this.mugGroup.position.copy(this._mugLocalPos);
        this.mugGroup.rotation.copy(this._mugLocalEuler);
    }

    playBlackoutFall() {
        this.blackoutLocked = true;
        if (this._drinkBtn) this._drinkBtn.disabled = true;
        if (this._closeBtn) this._closeBtn.disabled = true;

        if (!this.mugGroup || !this.mugGroup.visible) return;
        const startPos = this.mugGroup.position.clone();
        const startRot = this.mugGroup.rotation.clone();
        const endPos = new THREE.Vector3(0.44, -0.66, -0.26);
        const endRot = new THREE.Euler(startRot.x + 0.5, startRot.y, startRot.z - 1.2);
        const t0 = performance.now();
        const duration = 700;

        const fall = () => {
            const t = Math.min((performance.now() - t0) / duration, 1);
            this.mugGroup.position.lerpVectors(startPos, endPos, t);
            this.mugGroup.rotation.x = startRot.x + (endRot.x - startRot.x) * t;
            this.mugGroup.rotation.y = startRot.y + (endRot.y - startRot.y) * t;
            this.mugGroup.rotation.z = startRot.z + (endRot.z - startRot.z) * t;
            if (t < 1) requestAnimationFrame(fall);
        };
        requestAnimationFrame(fall);
    }

    _flashDrink() {
        if (!this._drinkBtn) return;
        this._drinkBtn.classList.add('bar-btn-flash');
        setTimeout(() => this._drinkBtn?.classList.remove('bar-btn-flash'), 260);
    }

    dispose() {
        this._detachMug();
        document.removeEventListener('keydown', this._onKey);
    }
}
