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
            viewedDialogues: []
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
            case 'desk':
            case 'bed':
            case 'sofa':
            case 'wardrobe':
            case 'table':
            case 'cupboard':
            case 'bookshelf':
                // Animate drawers/doors opening if available
                this.animateFurniture(object);
            case 'table':
            case 'cupboard':
                // Animate the drawers or doors opening if available
                this.animateFurniture(object);
                if (object.userData.hasKey) {
                    if (!this.gameState.hasBlueKey) {
                        this.gameState.hasBlueKey = true;
                        this.ui.addInventoryItem('Rusty Key', 'blue_key');
                        this.ui.showDialogue([
                            "I searched the " + id + "...",
                            "There's something cold hidden inside.",
                            "<span style='color:cyan'>I found a rusty key!</span>"
                        ]);
                        object.userData.hasKey = false; // Cannot find it again
                    }
                } else {
                    const emptyMessages = [
                        "Nothing but dust in here.",
                        "It's empty.",
                        "Nothing useful here.",
                        "Just old wood and cobwebs."
                    ];
                    const msg = emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
                    this.ui.showDialogue(msg);
                }
                break;
            case 'door_locked':
                // Keeping old door for backwards compatibility just in case
                if (this.gameState.hasBlueKey) {
                    this.ui.showDialogue("The rusty key fits perfectly. The door unlocks with a heavy clank.");
                    object.userData.id = 'door_open';
                    object.userData.prompt = "Open Door";
                    const targetX = object.position.x - 1.5;
                    this.animateDoor(object, targetX);
                } else {
                    this.ui.showDialogue([
                        "It's locked tight.",
                        "Looks like it needs an old-fashioned key."
                    ]);
                }
                break;
            case 'exit_door_locked':
                if (this.gameState.hasBlueKey) {
                    this.ui.showDialogue([
                        "The rusty key fits perfectly into the massive lock.",
                        "<span style='color:lightgreen'>You've escaped the dark corridor!</span>"
                    ]);
                    object.userData.id = 'door_open';
                    object.userData.prompt = "Freedom";
                    const targetX = object.position.x - 1.5;
                    this.animateDoor(object, targetX);

                    // Win Condition: Return to Main Page after 3 seconds
                    setTimeout(() => {
                        window.location.reload();
                    }, 3500);
                } else {
                    this.ui.showDialogue([
                        "It's locked tight.",
                        "Looks like it needs an old-fashioned key.",
                        "There must be one hidden in this room."
                    ]);
                }
                break;
            case 'door_open':
                this.ui.showDialogue("It's already open.");
                break;
            case 'elevator_panel':
                this.ui.showDialogue([
                    "The elevator control panel.",
                    "It seems disabled. I need to find a way to power it up or unlock it."
                ]);
                break;
            default:
                if (object.userData.dialogue) {
                    if (this.gameState.viewedDialogues.includes(id)) {
                        this.ui.showDialogue("I've already examined this.");
                    } else {
                        this.gameState.viewedDialogues.push(id);
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

    animateFurniture(object) {
        if (!object.userData.animatableParts) return;

        // Prevent opening multiple times
        if (object.userData.opened) return;
        object.userData.opened = true;

        if (object.userData.isDoubleDoor) {
            // Cupboard - swing doors open
            const doorL = object.userData.animatableParts[0];
            const doorR = object.userData.animatableParts[1];

            if (window.gsap) {
                gsap.to(doorL.rotation, { y: Math.PI / 1.5, duration: 1.5, ease: "power2.out" });
                gsap.to(doorR.rotation, { y: -Math.PI / 1.5, duration: 1.5, ease: "power2.out" });
            }
        } else {
            // Table - slide drawers forward
            const drawer1 = object.userData.animatableParts[0];
            const drawer2 = object.userData.animatableParts[1];

            if (window.gsap) {
                gsap.to(drawer1.position, { z: drawer1.position.z + 0.6, duration: 0.8, ease: "back.out(1.2)" });
                gsap.to(drawer2.position, { z: drawer2.position.z + 0.6, duration: 0.8, ease: "back.out(1.2)", delay: 0.15 });
            }
        }
    }
}
