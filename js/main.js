import * as THREE from 'three';
import { Player } from './Player.js';
import { Level } from './Level.js';
import { Interaction } from './Interaction.js';
import { UI } from './UI.js';
import { AudioManager } from './AudioManager.js';

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x000000, 5, 30); // Restored fog for atmosphere

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        // Start player inside the elevator hallway looking East towards the first room
        this.camera.position.set(-23, 1.6, 0);
        this.camera.rotation.y = -Math.PI / 2; // Face East

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // Soft shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // UI & Audio Managers
        this.audioManager = new AudioManager();
        this.ui = new UI(this.audioManager);

        
        // Level Generation
        this.level = new Level(this.scene);

        // Player / Controls
        this.player = new Player(this.camera, this.renderer.domElement, this.scene, this.level, this.ui);

        // Interaction System
        this.interaction = new Interaction(this.camera, this.scene, this.ui, this.player);

        // Event Listeners
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        // Start screen logic
        const blocker = document.getElementById('blocker');
        const instructions = document.getElementById('instructions');

        blocker.addEventListener('click', () => {
            if (!this.player.controls.isLocked) {
                this.audioManager.init();
                this.player.controls.lock();
            }
        });

        this.hasStarted = false;

        this.player.controls.addEventListener('lock', () => {
            instructions.style.display = 'none';
            blocker.style.display = 'none';
            this.interaction.enable();
            this.ui.showReticle();

            // Trigger opening sequence once
            if (!this.hasStarted) {
                this.hasStarted = true;
                setTimeout(() => {
                    this.level.openElevatorDoors();
                    this.ui.showDialogue([
                        "<span style='color:yellow'>*CLANK*</span>",
                        "The elevator shudders to a halt...",
                        "Where am I?"
                    ]);
                }, 1000);
            }
        });

        this.player.controls.addEventListener('unlock', () => {
            blocker.style.display = 'flex';
            instructions.style.display = '';
            this.interaction.disable();
            this.ui.hideReticle();
        });

        // Start animation loop
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        if (this.player.controls.isLocked) {
            this.player.update(delta);
            this.interaction.update();
            this.level.update(this.player);
        }

        // TWEEN update if we use gsap/tween
        if (window.gsap) {
            // GSAP handles its own ticker, but if we use TWEEN.js we'd update here
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Ensure the page is fully loaded before starting
window.onload = () => {
    window.game = new Game();
};
