import * as THREE from 'three';

/* ==================================================================
   InteractionSystem – Proximity-based zone interaction
   Detects player near zones, shows prompts, fires callbacks
   ================================================================== */

export class InteractionSystem {
    constructor() {
        /** @type {Array<{name:string, position:THREE.Vector3, radius:number, label:string, approachPos:THREE.Vector3, lookAt:THREE.Vector3}>} */
        this.zones = [];
        this.activeZone = null;
        this.onEnterZone = null;   // callback(zoneName)
        this.onExitZone = null;    // callback(zoneName)
        this.onInteract = null;    // callback(zoneName)

        this._promptEl = null;
        this._crosshairEl = null;
        this._setupUI();
        this._onKeyDown = this._handleKey.bind(this);
        document.addEventListener('keydown', this._onKeyDown);
    }

    /* ---- UI elements ---- */
    _setupUI() {
        // Crosshair
        if (!document.getElementById('crosshair')) {
            this._crosshairEl = document.createElement('div');
            this._crosshairEl.id = 'crosshair';
            this._crosshairEl.innerHTML = '+';
            document.body.appendChild(this._crosshairEl);
        } else {
            this._crosshairEl = document.getElementById('crosshair');
        }

        // Interaction prompt
        if (!document.getElementById('interaction-prompt')) {
            this._promptEl = document.createElement('div');
            this._promptEl.id = 'interaction-prompt';
            this._promptEl.style.display = 'none';
            document.body.appendChild(this._promptEl);
        } else {
            this._promptEl = document.getElementById('interaction-prompt');
        }
    }

    /* ---- Register zones from CasinoWorld ---- */
    setZones(zones) {
        this.zones = zones;
    }

    /* ---- Per-frame update ---- */
    update(playerPosition) {
        let closestZone = null;
        let closestDist = Infinity;

        for (const zone of this.zones) {
            const dist = playerPosition.distanceTo(zone.position);
            if (dist < zone.radius && dist < closestDist) {
                closestDist = dist;
                closestZone = zone;
            }
        }

        if (closestZone && closestZone !== this.activeZone) {
            this.activeZone = closestZone;
            this._showPrompt(closestZone.label);
            if (this.onEnterZone) this.onEnterZone(closestZone.name);
        } else if (!closestZone && this.activeZone) {
            const prevZone = this.activeZone;
            this.activeZone = null;
            this._hidePrompt();
            if (this.onExitZone) this.onExitZone(prevZone.name);
        }
    }

    /* ---- Show / hide prompt ---- */
    _showPrompt(label) {
        if (!this._promptEl) return;
        this._promptEl.textContent = `Pressiona E para ${label}`;
        this._promptEl.style.display = 'block';
    }

    _hidePrompt() {
        if (!this._promptEl) return;
        this._promptEl.style.display = 'none';
    }

    /* ---- Key handler ---- */
    _handleKey(e) {
        if (e.code === 'KeyE' && this.activeZone) {
            e.preventDefault();
            if (this.onInteract) this.onInteract(this.activeZone.name);
        }
    }

    /* ---- Visibility control ---- */
    showCrosshair() {
        if (this._crosshairEl) this._crosshairEl.style.display = 'block';
    }

    hideCrosshair() {
        if (this._crosshairEl) this._crosshairEl.style.display = 'none';
    }

    hideAll() {
        this.hideCrosshair();
        this._hidePrompt();
    }

    showAll() {
        this.showCrosshair();
    }

    /* ---- Cleanup ---- */
    dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        if (this._promptEl && this._promptEl.parentNode) {
            this._promptEl.parentNode.removeChild(this._promptEl);
        }
    }
}
