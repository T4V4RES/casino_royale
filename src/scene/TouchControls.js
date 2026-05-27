import * as THREE from 'three';

/**
 * TouchControls – Touch-based input for mobile devices
 * Provides virtual joystick for movement and interaction buttons
 */
export class TouchControls {
    constructor(domElement) {
        this.domElement = domElement;
        this.isTouchDevice = this.detectTouchDevice();
        
        // Touch state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchDeltaX = 0;
        this.touchDeltaY = 0;
        this.isTouching = false;
        
        // Movement from joystick
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;

        // Camera look from dragging on the right/center of the canvas.
        this.lookTouchId = null;
        this.lookLastX = 0;
        this.lookLastY = 0;
        this.lookDeltaX = 0;
        this.lookDeltaY = 0;
        
        // Callbacks
        this.onInteract = null;
        this.onMenuToggle = null;
        
        if (this.isTouchDevice) {
            this.setupTouchUI();
            this.setupTouchListeners();
        }
    }
    
    detectTouchDevice() {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    }
    
    setupTouchUI() {
        // Create virtual joystick container (left side)
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'touch-joystick-container';
        joystickContainer.innerHTML = `
            <div id="joystick-bg"></div>
            <div id="joystick-stick"></div>
        `;
        
        // Create button container (right side)
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'touch-buttons-container';
        buttonsContainer.innerHTML = `
            <button id="touch-interact-btn" class="touch-btn">E<br>Interact</button>
            <button id="touch-sprint-btn" class="touch-btn sprint">Sprint</button>
            <button id="touch-menu-btn" class="touch-btn">☰<br>Menu</button>
        `;
        
        this.domElement.parentElement.appendChild(joystickContainer);
        this.domElement.parentElement.appendChild(buttonsContainer);
        
        // Store references
        this.joystickBg = document.getElementById('joystick-bg');
        this.joystickStick = document.getElementById('joystick-stick');
        this.interactBtn = document.getElementById('touch-interact-btn');
        this.sprintBtn = document.getElementById('touch-sprint-btn');
        this.menuBtn = document.getElementById('touch-menu-btn');
    }
    
    setupTouchListeners() {
        // Joystick touch events
        this.joystickBg.addEventListener('touchstart', (e) => this.onJoystickStart(e), false);
        this.joystickBg.addEventListener('touchmove', (e) => this.onJoystickMove(e), false);
        this.joystickBg.addEventListener('touchend', (e) => this.onJoystickEnd(e), false);
        
        // Button events
        this.interactBtn.addEventListener('touchstart', () => {
            this.interactBtn.classList.add('active');
            if (this.onInteract) this.onInteract();
        }, false);
        this.interactBtn.addEventListener('touchend', () => this.interactBtn.classList.remove('active'), false);
        
        this.sprintBtn.addEventListener('touchstart', () => {
            this.isSprinting = true;
            this.sprintBtn.classList.add('active');
        }, false);
        this.sprintBtn.addEventListener('touchend', () => {
            this.isSprinting = false;
            this.sprintBtn.classList.remove('active');
        }, false);
        
        this.menuBtn.addEventListener('touchstart', () => {
            this.menuBtn.classList.add('active');
            if (this.onMenuToggle) this.onMenuToggle();
        }, false);
        this.menuBtn.addEventListener('touchend', () => this.menuBtn.classList.remove('active'), false);
        
        // Prevent context menu on long touch
        this.domElement.addEventListener('touchmove', (e) => e.preventDefault(), false);
        this.domElement.addEventListener('touchstart', (e) => this.onLookStart(e), false);
        this.domElement.addEventListener('touchmove', (e) => this.onLookMove(e), false);
        this.domElement.addEventListener('touchend', (e) => this.onLookEnd(e), false);
        this.domElement.addEventListener('touchcancel', (e) => this.onLookEnd(e), false);
    }
    
    onJoystickStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isTouching = true;
    }
    
    onJoystickMove(e) {
        if (!this.isTouching) return;
        
        const touch = e.touches[0];
        this.touchDeltaX = touch.clientX - this.touchStartX;
        this.touchDeltaY = touch.clientY - this.touchStartY;
        
        const distance = Math.sqrt(this.touchDeltaX ** 2 + this.touchDeltaY ** 2);
        const maxDistance = 60; // Max joystick radius
        
        if (distance > 0) {
            const clampedDistance = Math.min(distance, maxDistance);
            
            // Update joystick stick position
            const stickX = (this.touchDeltaX / distance) * clampedDistance * 0.5;
            const stickY = (this.touchDeltaY / distance) * clampedDistance * 0.5;
            this.joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
            
            // Determine direction from angle
            this.updateJoystickDirection(clampedDistance > 22);
        }
    }
    
    onJoystickEnd(e) {
        this.isTouching = false;
        this.touchDeltaX = 0;
        this.touchDeltaY = 0;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.joystickStick.style.transform = 'translate(-50%, -50%)';
    }

    onLookStart(e) {
        if (this.lookTouchId !== null) return;
        const touch = Array.from(e.changedTouches).find(t => t.clientX > window.innerWidth * 0.35);
        if (!touch) return;
        this.lookTouchId = touch.identifier;
        this.lookLastX = touch.clientX;
        this.lookLastY = touch.clientY;
    }

    onLookMove(e) {
        if (this.lookTouchId === null) return;
        const touch = Array.from(e.changedTouches).find(t => t.identifier === this.lookTouchId);
        if (!touch) return;
        this.lookDeltaX += touch.clientX - this.lookLastX;
        this.lookDeltaY += touch.clientY - this.lookLastY;
        this.lookLastX = touch.clientX;
        this.lookLastY = touch.clientY;
    }

    onLookEnd(e) {
        if (this.lookTouchId === null) return;
        const ended = Array.from(e.changedTouches).some(t => t.identifier === this.lookTouchId);
        if (ended) this.lookTouchId = null;
    }
    
    updateJoystickDirection(isSignificant) {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        if (!isSignificant) return;

        if (this.touchDeltaY < -18) this.moveForward = true;
        if (this.touchDeltaY > 18) this.moveBackward = true;
        if (this.touchDeltaX < -18) this.moveLeft = true;
        if (this.touchDeltaX > 18) this.moveRight = true;
    }
    
    getMovementInput() {
        return {
            forward: this.moveForward,
            backward: this.moveBackward,
            left: this.moveLeft,
            right: this.moveRight,
            sprint: this.isSprinting
        };
    }

    getLookDelta() {
        const delta = { x: this.lookDeltaX, y: this.lookDeltaY };
        this.lookDeltaX = 0;
        this.lookDeltaY = 0;
        return delta;
    }
}
