import * as THREE from 'three';

export class Interaction {
    constructor(camera, scene, ui, player) {
        this.camera = camera;
        this.scene = scene;
        this.ui = ui;
        this.player = player;

        this.raycaster = new THREE.Raycaster();
        this.centerCoords = new THREE.Vector2(0, 0); // Always center of screen

        this.interactDistance = 3.0; // How close to interact
        this.currentHoveredObj = null;
        this.enabled = false;

        this.inventory = [];

        // Track completed puzzle state
        this.gameState = {
            hasBlueKey: false,
            hasRedKey: false,
            elevatorUnlocked: false,
            viewedDialogues: [],
            foundCode: false,
            correctCode: "1984"
        };

        this.initClickListener();
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.ui.setReticleActive(false);
    }

    initClickListener() {
        window.addEventListener('mousedown', (e) => {
            if (!this.enabled || !this.player.controls.isLocked) return;

            if (this.ui.isDialogueActive()) return; // Don't interact if dialogue is shown

            if (this.currentHoveredObj) {
                this.handleInteraction(this.currentHoveredObj);
            }
        });
    }

    update() {
        if (!this.enabled) return;

        this.raycaster.setFromCamera(this.centerCoords, this.camera);

        // Get all interactable objects in the scene (must have userData.interactable = true)
        const interactables = [];
        this.scene.traverse((child) => {
            if (child.isMesh && child.userData.interactable) {
                interactables.push(child);
            }
        });

        const intersects = this.raycaster.intersectObjects(interactables, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.distance <= this.interactDistance) {
                if (this.currentHoveredObj !== hit.object) {
                    this.currentHoveredObj = hit.object;
                    const promptText = hit.object.userData.prompt || "Examine";
                    this.ui.setPromptText(promptText);
                    this.ui.setReticleActive(true);
                }
            } else {
                this.clearHover();
            }
        } else {
            this.clearHover();
        }
    }

    clearHover() {
        if (this.currentHoveredObj) {
            this.currentHoveredObj = null;
            this.ui.setReticleActive(false);
        }
    }

    handleInteraction(object) {
        const id = object.userData.id;

        switch (id) {
            case 'note_1':
                this.ui.showDialogue([
                    "It's a scrap of paper, written in what looks like blood...",
                    "<span style='color:red'>'THE EYES ARE THE KEY'</span>",
                    "What does that mean?"
                ]);
                break;
            case 'note_2':
                this.ui.showDialogue([
                    "Another note. It's torn.",
                    "<span style='color:red'>'...but only the left one sees the truth.'</span>"
                ]);
                break;
            case 'diary':
                if (!object.userData.taken) {
                    object.userData.taken = true;
                    this.ui.addInventoryItem('Dusty Diary', 'diary');

                    // Hide the diary mesh and disable interaction
                    object.visible = false;
                    object.userData.interactable = false;

                    this.ui.showDialogue([
                        "I slip the leather-bound diary into my pocket.",
                        "The handwriting is frantic. The last entry reads:",
                        "<span style='color:red'>'Day 14. They keep scratching behind the wainscoting. I've boarded the windows but the cold still seeps in. If you are reading this... don't let the lantern die. They only come when it's completely dark.</span>",
                        "<span style='color:red; font-weight: bold;'>There is no escape. We are 50ft beneath the surface of the earth. I am so sorry.'</span>"
                    ]);
                }
                break;
            case 'desk':
            case 'wardrobe':
            case 'bed':
            case 'sofa':
            case 'table':
            case 'cupboard':
            case 'bookshelf':
            case 'sidecabinet':
            case 'bureau':
                // Animate drawers/doors opening if available
                this.animateFurniture(object);
                if (object.userData.hasKey) {
                    if (!this.gameState.hasBlueKey) {
                        this.gameState.hasBlueKey = true;
                        this.ui.addInventoryItem('Rusty Key', 'blue_key');
                        this.ui.showDialogue([
                            "I frantically pull apart the " + id + "...",
                            "My hand brushes against cold metal in the dark.",
                            "<span style='color:cyan'>I found a heavy, rusted key!</span>"
                        ]);
                        object.userData.hasKey = false; // Cannot find it again
                    }
                } else {
                    const emptyMessages = [
                        "Nothing here but dead spiders and thick dust.",
                        "It's empty. Where else could it be hiding?",
                        "Just rotted wood. I'm wasting my time.",
                        "Empty. I need to keep looking before the light dies.",
                        "Nothing useful inside.",
                        "Only cobwebs. My pulse is racing...",
                        "Nothing here but dead spiders and thick dust. My hope dwindles.",
                        "It's empty. Where else could it be hiding? Time is running out.",
                        "Just rotted wood. I'm wasting my time, and I can feel eyes on me.",
                        "Empty. I need to keep looking before the light dies completely.",
                        "Nothing useful inside. Just the chilling silence.",
                        "Only cobwebs. My pulse is racing, and I'm starting to panic.",
                        "Another dead end. The walls feel like they're closing in.",
                        "Just more junk. I need to find something, anything!"
                    ];
                    const msg = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
                    this.ui.showDialogue(msg);
                }
                break;
            case 'door_locked':
            case 'exit_door_locked':
                if (this.gameState.hasBlueKey) {
                    this.ui.showDialogue([
                        "I slip the rusty key into the heavy iron lock.",
                        "It turns with a loud metallic CLANK.",
                        "<span style='color:green'>The door slowly creaks open... but it's just another dark room.</span>"
                    ]);
                    object.userData.id = 'exit_door_open';
                    object.userData.prompt = "Enter Room 2";

                    // Slide the door along Z into the wall gap so it fully clears the doorway
                    if (window.gsap) {
                        gsap.to(object.position, { z: -4.5, duration: 2.5, ease: "power2.inOut" });
                    } else {
                        object.position.z = -4.5;
                    }

                    // Remove from colliders so the player can walk through freely
                    if (this.player && this.player.level) {
                        this.player.level.colliders = this.player.level.colliders.filter(c => c !== object);
                    }

                    // Stop and hide the timer — puzzle solved, no more countdown
                    if (this.player && this.player.level) {
                        this.player.level.countdownActive = false;
                    }
                    this.ui.hideTimer();

                    object.userData.interactable = false;
                } else {
                    this.ui.showDialogue([
                        "The heavy wood barely budges.",
                        "It's bolted tight from the outside. I need the key...",
                        "Unless... they find me first."
                    ]);
                }
                break;
            case 'door_open':
                this.ui.showDialogue("It's already open.");
                break;
            case 'final_exit_door':
            case 'keypad_device':
                if (!this.gameState.foundCode) {
                    this.ui.showDialogue([
                        "I need to find the 4-digit code first!",
                        "It must be somewhere in this torture room..."
                    ]);
                } else {
                    // Use the random code from Level
                    const correctCode = this.player.level.room2Password;
                    this.ui.showKeypad(correctCode, () => {
                        this.handleCorrectCode();
                    });
                }
                break;
            case 'iron_cage':
                if (!this.gameState.foundCode) {
                    this.gameState.foundCode = true;
                    const randomCode = this.player.level.room2Password;
                    this.ui.showDialogue([
                        "There's a decapitated corpse in here...",
                        "Wait! I can see something scratched into the metal floor:",
                        "<span style='color:red; font-size: 1.5em;'>" + randomCode + "</span>",
                        "That must be the code for the exit door! I need to hurry!"
                    ]);
                } else {
                    const randomCode = this.player.level.room2Password;
                    this.ui.showDialogue([
                        "The code is still there: <span style='color:red; font-size: 1.5em;'>" + randomCode + "</span>",
                        "I need to get to the exit door and enter it now!"
                    ]);
                }
                break;
            default:
                if (object.userData.dialogue) {
                    // Blood writings are always re-readable
                    const isBloodWriting = id && id.startsWith('blood_');
                    if (!isBloodWriting && this.gameState.viewedDialogues.includes(id)) {
                        this.ui.showDialogue("I've already examined this.");
                    } else {
                        if (!isBloodWriting) this.gameState.viewedDialogues.push(id);
                        this.ui.showDialogue(object.userData.dialogue);
                    }
                } else {
                    this.ui.showDialogue("There's nothing interesting here.");
                }
                break;
        }
    }

    animateDoor(door, targetX) {
        // Simple animation loop for the door opening
        let startX = door.position.x;
        let p = 0;
        const interval = setInterval(() => {
            p += 0.05;
            if (p >= 1) {
                door.position.x = targetX;
                door.userData.interactable = false; // Disable once open
                clearInterval(interval);
            } else {
                door.position.x = startX + (targetX - startX) * p;
            }
            // Need to update collider logically, for simplicity we might just move it out of the way
        }, 16);
    }

    handleCorrectCode() {
        // Stop timer
        this.countdownActive = false;
        this.ui.hideTimer();
        
        // Open final exit door
        const finalDoor = this.player.level.finalExitDoor;
        if (finalDoor) {
            this.ui.showDialogue([
                "<span style='color:green'>*CLICK* The code is accepted!</span>",
                "The heavy door slides open with a hydraulic hiss...",
                "I can see an escape lift inside!"
            ]);
            
            // Animate door opening
            if (window.gsap) {
                gsap.to(finalDoor.position, { x: finalDoor.position.x + 3, duration: 3, ease: "power2.inOut" });
            } else {
                finalDoor.position.x += 3;
            }
            
            // Remove from colliders
            this.player.level.colliders = this.player.level.colliders.filter(c => c !== finalDoor);
            finalDoor.userData.interactable = false;
            
            // Show lift after door opens
            setTimeout(() => {
                this.startLiftSequence();
            }, 2000);
        }
    }

    startLiftSequence() {
        // Show the lift
        if (this.player.level.liftGroup) {
            this.player.level.liftGroup.visible = true;
            
            // Move player into lift
            const liftEnterPos = new THREE.Vector3(
                this.player.level.room2Center + this.player.level.room2Length / 2 + 1,
                1.6,
                0
            );
            
            this.ui.showDialogue([
                "I rush into the lift...",
                "The doors close behind me.",
                "<span style='color:green'>Going up...</span>",
                "<span style='color:yellow'>I made it! I'm free!</span>"
            ]);
            
            // Animate player into lift
            if (window.gsap) {
                gsap.to(this.player.camera.position, {
                    x: liftEnterPos.x,
                    y: liftEnterPos.y,
                    z: liftEnterPos.z
                }, { duration: 2, ease: "power2.inOut" });
            } else {
                this.player.camera.position.set(liftEnterPos.x, liftEnterPos.y, liftEnterPos.z);
            }
            
            // Start lift ascent after delay
            setTimeout(() => {
                this.animateLiftAscent();
            }, 3000);
            
            // Show winning screen after ascent
            setTimeout(() => {
                this.showWinScreen();
            }, 6000);
        }
    }

    animateLiftAscent() {
        // Animate lift going up
        if (this.player.level.liftGroup && window.gsap) {
            // Move lift up
            gsap.to(this.player.level.liftGroup.position, {
                y: this.player.level.liftGroup.position.y + 20,
                duration: 4,
                ease: "power1.inOut"
            });
            
            // Move camera up with lift
            gsap.to(this.player.camera.position, {
                y: this.player.camera.position.y + 20,
                duration: 4,
                ease: "power1.inOut"
            });
            
            // Fade to white as we escape
            gsap.to(this.player.level.scene.fog, {
                color: 0xffffff,
                near: 50,
                far: 100,
                duration: 3
            });
        }
    }

    startEscapeSequence() {
        this.ui.showDialogue([
            "I rush into the lift...",
            "The doors close behind me.",
            "<span style='color:green'>Going up...</span>",
            "<span style='color:yellow'>I made it! I'm free!</span>"
        ]);
        
        // Show winning screen after dialogue
        setTimeout(() => {
            this.showWinScreen();
        }, 6000);
    }

    showWinScreen() {
        // Create enhanced win screen overlay
        const winScreen = document.createElement('div');
        winScreen.id = 'win-screen';
        winScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, #00ff00, #00aa00);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: 'Courier New', monospace;
            color: white;
            text-align: center;
            animation: fadeIn 2s ease-in;
        `;
        
        winScreen.innerHTML = `
            <h1 style="font-size: 4em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">YOU ESCAPED!</h1>
            <p style="font-size: 1.5em; margin-bottom: 30px;">You survived the torture chambers and found your way out.</p>
            <p style="font-size: 1.2em; margin-bottom: 40px; color: #00ff00;">You escaped to freedom and safety!</p>
            <button onclick="window.location.reload()" style="
                padding: 15px 30px;
                font-size: 1.2em;
                background: white;
                color: #00aa00;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                margin-top: 50px;
            ">PLAY AGAIN</button>
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(winScreen);
        
        // Disable pointer lock
        document.exitPointerLock();
        
        // Play victory sound
        if (this.audioManager) {
            this.audioManager.playVictorySound();
        }
    }

    startCountdown() {
        if (this.countdownActive) return;
        
        this.countdownActive = true;
        this.timeLeft = 30.0;
        this.ui.showTimer();
        
        this.countdownInterval = setInterval(() => {
            if (!this.countdownActive) {
                clearInterval(this.countdownInterval);
                return;
            }
            
            this.timeLeft -= 0.1;
            this.ui.updateTimer(this.timeLeft);
            
            if (this.timeLeft <= 0) {
                this.handleTimeUp();
            }
        }, 100);
    }

    handleTimeUp() {
        this.countdownActive = false;
        clearInterval(this.countdownInterval);
        
        this.ui.showDialogue([
            "<span style='color:red'>*TIME'S UP*</span>",
            "I hear heavy footsteps approaching...",
            "The door bursts open!",
            "<span style='color:red'>They found me...</span>"
        ]);
        
        setTimeout(() => {
            this.ui.showGameOver();
        }, 3000);
    }

    animateFurniture(object) {
        if (!object.userData.animatableParts) return;
        
        // Prevent opening multiple times
        if (object.userData.opened) return;
        object.userData.opened = true;

        if (object.userData.isDoubleDoor) {
            // Swing doors open outward ~90° from their hinge pivot
            const doorL = object.userData.animatableParts[0];
            const doorR = object.userData.animatableParts[1];

            if (window.gsap) {
                gsap.to(doorL.rotation, { y: -Math.PI / 2, duration: 1.5, ease: "power2.out" });
                gsap.to(doorR.rotation, { y: Math.PI / 2, duration: 1.5, ease: "power2.out" });
            }
        } else if (object.userData.isSingleDoor) {
            // Single door swings open to the left
            const door = object.userData.animatableParts[0];
            if (window.gsap) {
                gsap.to(door.rotation, { y: -Math.PI / 2, duration: 1.2, ease: "power2.out" });
            }
        } else {
            // Table/Desk - slide drawers forward
            const drawer1 = object.userData.animatableParts[0];
            const drawer2 = object.userData.animatableParts[1];

            if (window.gsap) {
                gsap.to(drawer1.position, { z: drawer1.position.z + 0.6, duration: 0.8, ease: "back.out(1.2)" });
                gsap.to(drawer2.position, { z: drawer2.position.z + 0.6, duration: 0.8, ease: "back.out(1.2)", delay: 0.15 });
            }
        }
    }
}
