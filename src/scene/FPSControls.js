import * as THREE from 'three';

/* ==================================================================
   FPSControls – First-Person Shooter style movement
   Uses PointerLock API for mouse look + WASD for movement
   ================================================================== */
export class FPSControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.enabled = true;
        this.locked = false;

        // Movement
        this.moveSpeed = 4.5;
        this.sprintMultiplier = 1.8;
        this.isSprinting = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;

        // Head bob
        this.headBobTimer = 0;
        this.headBobAmount = 0.035;
        this.headBobSpeed = 12;
        this.baseY = 1.7; // Eye height

        // Mouse look
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.sensitivity = 0.002;
        this.minPolarAngle = -Math.PI * 0.42; // Look up limit
        this.maxPolarAngle = Math.PI * 0.42;  // Look down limit

        // Drunk effect
        this.drunkLevel = 0; // 0..1
        this.drunkTimer = 0;

        // Collision
        this.playerRadius = 0.4;
        this.colliders = []; // Array of {min, max} AABB boxes

        // Bounds (room limits)
        this.bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

        this._onMouseMove = this._onMouseMove.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);

        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
    }

    lock() {
        this.domElement.requestPointerLock();
    }

    unlock() {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    _onPointerLockChange() {
        this.locked = document.pointerLockElement === this.domElement;
    }

    _onMouseMove(e) {
        if (!this.locked || !this.enabled) return;
        this.rotateBy(e.movementX, e.movementY);
    }

    rotateBy(deltaX, deltaY, multiplier = 1) {
        if (!this.enabled) return;
        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= deltaX * this.sensitivity * multiplier;
        this.euler.x -= deltaY * this.sensitivity * multiplier;
        this.euler.x = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.euler.x));
        this.camera.quaternion.setFromEuler(this.euler);
    }

    _onKeyDown(e) {
        if (!this.enabled) return;
        switch (e.code) {
            case 'KeyW': case 'ArrowUp':    this.moveForward = true; break;
            case 'KeyS': case 'ArrowDown':  this.moveBackward = true; break;
            case 'KeyA': case 'ArrowLeft':  this.moveLeft = true; break;
            case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
            case 'ShiftLeft': case 'ShiftRight': this.isSprinting = true; break;
        }
    }

    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp':    this.moveForward = false; break;
            case 'KeyS': case 'ArrowDown':  this.moveBackward = false; break;
            case 'KeyA': case 'ArrowLeft':  this.moveLeft = false; break;
            case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
            case 'ShiftLeft': case 'ShiftRight': this.isSprinting = false; break;
        }
    }

    addCollider(box3OrAABB) {
        if (box3OrAABB.isBox3) {
            this.colliders.push({ min: box3OrAABB.min, max: box3OrAABB.max });
        } else {
            this.colliders.push(box3OrAABB);
        }
    }

    stopMovement() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;
        this.velocity.set(0, 0, 0);
        this.direction.set(0, 0, 0);
    }

    _checkCollision(newPos) {
        const r = this.playerRadius;
        for (const c of this.colliders) {
            if (newPos.x + r > c.min.x && newPos.x - r < c.max.x &&
                newPos.z + r > c.min.z && newPos.z - r < c.max.z) {
                return true;
            }
        }
        return false;
    }

    update(delta) {
        if (!this.enabled) return;

        this.drunkTimer += delta;

        const speed = this.moveSpeed * (this.isSprinting ? this.sprintMultiplier : 1);
        const damping = 8;

        // Get movement direction
        this.direction.set(0, 0, 0);
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        if (this.moveForward)  this.direction.add(forward);
        if (this.moveBackward) this.direction.sub(forward);
        if (this.moveLeft)     this.direction.sub(right);
        if (this.moveRight)    this.direction.add(right);

        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
            this.velocity.lerp(this.direction.multiplyScalar(speed), damping * delta);
        } else {
            this.velocity.lerp(new THREE.Vector3(0, 0, 0), damping * delta);
        }

        // Calculate new position
        const newPos = this.camera.position.clone();
        newPos.x += this.velocity.x * delta;
        newPos.z += this.velocity.z * delta;

        // Collision check – try X and Z separately
        const testX = new THREE.Vector3(newPos.x, 0, this.camera.position.z);
        const testZ = new THREE.Vector3(this.camera.position.x, 0, newPos.z);

        if (!this._checkCollision(testX)) {
            this.camera.position.x = newPos.x;
        }
        if (!this._checkCollision(testZ)) {
            this.camera.position.z = newPos.z;
        }

        // Bounds clamping
        this.camera.position.x = Math.max(this.bounds.minX + this.playerRadius,
            Math.min(this.bounds.maxX - this.playerRadius, this.camera.position.x));
        this.camera.position.z = Math.max(this.bounds.minZ + this.playerRadius,
            Math.min(this.bounds.maxZ - this.playerRadius, this.camera.position.z));

        // Head bob
        const isMoving = this.direction.lengthSq() > 0.01 ||
            (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight);
        if (isMoving) {
            this.headBobTimer += delta * this.headBobSpeed * (this.isSprinting ? 1.4 : 1);
            this.camera.position.y = this.baseY + Math.sin(this.headBobTimer) * this.headBobAmount;
        } else {
            this.headBobTimer = 0;
            this.camera.position.y += (this.baseY - this.camera.position.y) * 0.1;
        }

        // Drunk wobble (roll + tiny yaw drift)
        if (this.drunkLevel > 0.001) {
            this.euler.setFromQuaternion(this.camera.quaternion);
            const roll = Math.sin(this.drunkTimer * (1.1 + this.drunkLevel)) * (0.08 * this.drunkLevel);
            const yawDrift = Math.sin(this.drunkTimer * 0.45) * (0.018 * this.drunkLevel) * delta;
            this.euler.y += yawDrift;
            this.euler.z = roll;
            this.camera.quaternion.setFromEuler(this.euler);
        } else {
            this.euler.setFromQuaternion(this.camera.quaternion);
            this.euler.z *= 0.85;
            this.camera.quaternion.setFromEuler(this.euler);
        }
    }

    setDrunkLevel(level) {
        this.drunkLevel = Math.max(0, Math.min(1, level));
    }

    getPosition() {
        return new THREE.Vector2(this.camera.position.x, this.camera.position.z);
    }

    dispose() {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    }
}
