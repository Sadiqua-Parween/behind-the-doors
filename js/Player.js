import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
    constructor(camera, domElement, scene, level, ui) {
        this.camera = camera;
        this.scene = scene;
        this.level = level;
        this.ui = ui;

        // Use pointer lock for first-person controls
        this.controls = new PointerLockControls(camera, domElement);

        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.speed = 4.0;
        this.mass = 100.0;

        // Add camera to scene
        this.scene.add(this.controls.getObject());

        this.initEventListeners();
    }

    initEventListeners() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.isSprinting = true;
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.isSprinting = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }

    checkCollisions(nextPos) {
        // Very basic AABB collision detection with the level's bounding boxes
        const playerRadius = 0.3; // Give the player some girth

        for (const wall of this.level.colliders) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            // Expand box by player radius
            wallBox.expandByScalar(playerRadius);

            if (wallBox.containsPoint(nextPos)) {
                return true; // Collision detected
            }
        }
        return false;
    }

    update(delta) {
        // --- DIALOGUE FREEZE LOGIC ---
        if (this.ui.isDialogueActive()) {
            // Stop movement completely
            this.velocity.set(0, 0, 0);
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;

            // To freeze looking around, we save the rotation and force it to stay
            if (!this.dialogueSavedQuat) {
                this.dialogueSavedQuat = this.camera.quaternion.clone();
            } else {
                this.camera.quaternion.copy(this.dialogueSavedQuat);
            }

            return; // Skip normal update routines
        } else {
            // Clear saved rotation when dialogue ends
            this.dialogueSavedQuat = null;
        }
        // -----------------------------

        // Apply friction
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        // Acceleration
        let accel = 15.0; // Normal walking acceleration
        if (this.isSprinting && this.moveForward) {
            accel = 35.0; // Sprint acceleration
        }

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * accel * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * accel * delta;

        const movementX = this.velocity.x * delta;
        const movementZ = this.velocity.z * delta;

        // Move X if no collision
        const cloneRight = this.camera.clone();
        cloneRight.translateX(-movementX); // Applies negative movementX so moving Right is positive displacement 
        if (!this.checkCollisions(new THREE.Vector3(cloneRight.position.x, this.camera.position.y, this.camera.position.z))) {
            this.controls.moveRight(-movementX);
        } else {
            this.velocity.x = 0;
        }

        // Move Z if no collision
        const cloneForward = this.camera.clone();
        cloneForward.translateZ(movementZ);
        if (!this.checkCollisions(new THREE.Vector3(this.camera.position.x, this.camera.position.y, cloneForward.position.z))) {
            this.controls.moveForward(-movementZ);
        } else {
            this.velocity.z = 0;
        }

        // Add subtle head bobbing when moving
        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
            const isActuallySprinting = this.isSprinting && this.moveForward;
            const bobSpeed = isActuallySprinting ? 0.02 : 0.01;
            const bobHeight = isActuallySprinting ? 0.1 : 0.05;
            const time = performance.now() * bobSpeed;
            this.camera.position.y = 1.6 + Math.sin(time) * bobHeight;
        } else {
            // Restore height smoothly
            this.camera.position.y += (1.6 - this.camera.position.y) * 0.1;
        }
    }
}
