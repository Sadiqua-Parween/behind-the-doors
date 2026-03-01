import * as THREE from 'three';

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.colliders = []; // Store meshes for player collision

        // Textures
        const textureLoader = new THREE.TextureLoader();
        const woodDoorTexture = textureLoader.load('assets/img/door_wood.png');
        const sofaTexture = textureLoader.load('assets/img/sofa.png');
        const bedTexture = textureLoader.load('assets/img/bed.png');
        const wardrobeTexture = textureLoader.load('assets/img/wardrobe.png');

        woodDoorTexture.wrapS = THREE.RepeatWrapping; woodDoorTexture.wrapT = THREE.RepeatWrapping; woodDoorTexture.repeat.set(1, 1);
        sofaTexture.wrapS = THREE.RepeatWrapping; sofaTexture.wrapT = THREE.RepeatWrapping; sofaTexture.repeat.set(2, 2);
        bedTexture.wrapS = THREE.RepeatWrapping; bedTexture.wrapT = THREE.RepeatWrapping; bedTexture.repeat.set(2, 2);
        wardrobeTexture.wrapS = THREE.RepeatWrapping; wardrobeTexture.wrapT = THREE.RepeatWrapping; wardrobeTexture.repeat.set(1, 1);

        // Materials
        this.materials = {
            wall: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }),
            floor: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }),
            ceiling: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }),
            wood: new THREE.MeshStandardMaterial({ color: 0x3e1f13, roughness: 0.8, metalness: 0.1 }),
            paper: new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.5 }),
            metal: new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 }),
            blood: new THREE.MeshStandardMaterial({ color: 0x8a0303, roughness: 0.5 }),
            woodDoor: new THREE.MeshStandardMaterial({ map: woodDoorTexture, roughness: 0.7, metalness: 0.1 }),
            sofaLeather: new THREE.MeshStandardMaterial({ map: sofaTexture, roughness: 0.4, metalness: 0.1 }),
            bedFabric: new THREE.MeshStandardMaterial({ map: bedTexture, roughness: 0.9 }),
            wardrobeWood: new THREE.MeshStandardMaterial({ map: wardrobeTexture, roughness: 0.7, metalness: 0.2 }),
            greenWallpaper: new THREE.MeshStandardMaterial({ color: 0x4B5320, roughness: 0.9 }),
            wainscoting: new THREE.MeshStandardMaterial({ color: 0x362111, roughness: 0.8 }),
            roomCeiling: new THREE.MeshStandardMaterial({ color: 0x2e1911, roughness: 0.9 }),
            roomFloor: new THREE.MeshStandardMaterial({ color: 0x24150E, roughness: 0.8 })
        };

        this.buildEnvironment();
        this.buildLighting();
        this.addObjects();
    }

    createBox(width, height, depth, material, position) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this.scene.add(mesh);

        // Prevent adding floor/ceiling to simple AABB colliders for X/Z movement
        if (material !== this.materials.floor && material !== this.materials.ceiling) {
            this.colliders.push(mesh);
        }

        return mesh;
    }

    buildEnvironment() {
        const corridorLength = 40;
        const corridorWidth = 6;
        const wallHeight = 4;
        const thickness = 0.5;

        // The elevator hall center is our origin point of reference for the new corridor
        // The elevator doors face East (Z = 0)
        const startX = -corridorLength / 2; // Elevator is at the west end

        // Floor and Ceiling for the main corridor
        this.createBox(corridorLength, thickness, corridorWidth, this.materials.floor, new THREE.Vector3(0, -thickness / 2, 0));
        this.createBox(corridorLength, thickness, corridorWidth, this.materials.ceiling, new THREE.Vector3(0, wallHeight + thickness / 2, 0));

        // North and South Walls of corridor
        this.createBox(corridorLength, wallHeight, thickness, this.materials.wall, new THREE.Vector3(0, wallHeight / 2, -corridorWidth / 2));
        this.createBox(corridorLength, wallHeight, thickness, this.materials.wall, new THREE.Vector3(0, wallHeight / 2, corridorWidth / 2));

        // East Wall (Far end of corridor) leading to Escape Room
        this.createBox(thickness, wallHeight, corridorWidth / 2 - 1.5, this.materials.wall, new THREE.Vector3(corridorLength / 2, wallHeight / 2, -corridorWidth / 4 - 0.75));
        this.createBox(thickness, wallHeight, corridorWidth / 2 - 1.5, this.materials.wall, new THREE.Vector3(corridorLength / 2, wallHeight / 2, corridorWidth / 4 + 0.75));

        // Trap Door (Open initially, moved into the Z wall)
        const doorGeometry = new THREE.BoxGeometry(thickness, wallHeight - 0.5, 3);
        this.trapDoor = new THREE.Mesh(doorGeometry, this.materials.wood);
        this.trapDoor.position.set(corridorLength / 2, (wallHeight - 0.5) / 2, 3);
        this.decorateVictorianDoor(this.trapDoor);
        this.trapDoor.userData = { id: 'trap_door_open', interactable: false, prompt: "Open Door" };
        this.scene.add(this.trapDoor);
        this.trapTriggered = false;

        // Build the Escape Room (extends from X=20 to X=40)
        const roomSize = 20;
        const roomCenter = corridorLength / 2 + roomSize / 2; // X = 30

        // Room Floor and Ceiling
        this.createBox(roomSize, thickness, roomSize, this.materials.roomFloor, new THREE.Vector3(roomCenter, -thickness / 2, 0));
        this.createBox(roomSize, thickness, roomSize, this.materials.roomCeiling, new THREE.Vector3(roomCenter, wallHeight + thickness / 2, 0));

        // Room North/South Walls
        this.createBox(roomSize, wallHeight, thickness, this.materials.greenWallpaper, new THREE.Vector3(roomCenter, wallHeight / 2, -roomSize / 2));
        this.createBox(roomSize, wallHeight, thickness, this.materials.greenWallpaper, new THREE.Vector3(roomCenter, wallHeight / 2, roomSize / 2));

        // Room East Wall (Exit)
        this.createBox(thickness, wallHeight, roomSize / 2 - 1.5, this.materials.greenWallpaper, new THREE.Vector3(roomCenter + roomSize / 2, wallHeight / 2, -roomSize / 4 - 0.75));
        this.createBox(thickness, wallHeight, roomSize / 2 - 1.5, this.materials.greenWallpaper, new THREE.Vector3(roomCenter + roomSize / 2, wallHeight / 2, roomSize / 4 + 0.75));

        // The Final Exit Door
        this.exitDoor = new THREE.Mesh(doorGeometry, this.materials.wood);
        this.exitDoor.position.set(roomCenter + roomSize / 2, (wallHeight - 0.5) / 2, 0);
        this.decorateVictorianDoor(this.exitDoor);
        this.exitDoor.userData = { id: 'exit_door_locked', interactable: true, prompt: "Inspect Heavy Door", dialogue: "It's bolted from the outside. No brute force will open this... I need to find the key before *they* return." };
        this.scene.add(this.exitDoor);
        this.colliders.push(this.exitDoor);

        // --- ROOM 2: The Torture Room (X=40 to X=70) ---
        const room2Length = 30;
        const room2Width = 20;
        const room2Center = 55; // 40 + 30/2

        // Floor and Ceiling
        this.createBox(room2Length, thickness, room2Width, this.materials.blood, new THREE.Vector3(room2Center, -thickness / 2, 0));
        this.createBox(room2Length, thickness, room2Width, this.materials.ceiling, new THREE.Vector3(room2Center, wallHeight + thickness / 2, 0));

        // North/South Walls
        this.createBox(room2Length, wallHeight, thickness, this.materials.metal, new THREE.Vector3(room2Center, wallHeight / 2, -room2Width / 2));
        this.createBox(room2Length, wallHeight, thickness, this.materials.metal, new THREE.Vector3(room2Center, wallHeight / 2, room2Width / 2));

        // East Wall (Final Exit)
        this.createBox(thickness, wallHeight, room2Width / 2 - 1.5, this.materials.metal, new THREE.Vector3(room2Center + room2Length / 2, wallHeight / 2, -room2Width / 4 - 0.75));
        this.createBox(thickness, wallHeight, room2Width / 2 - 1.5, this.materials.metal, new THREE.Vector3(room2Center + room2Length / 2, wallHeight / 2, room2Width / 4 + 0.75));

        // Final Exit Door
        this.finalExitDoor = new THREE.Mesh(doorGeometry, this.materials.metal);
        this.finalExitDoor.position.set(room2Center + room2Length / 2, (wallHeight - 0.5) / 2, 0);
        this.finalExitDoor.userData = { id: 'final_exit_door', interactable: true, prompt: "Use Keypad", dialogue: "There's a heavy digital keypad on this door. I need a 4-digit code." };
        this.scene.add(this.finalExitDoor);
        this.colliders.push(this.finalExitDoor);

        // Room West Wall (Connects to Corridor, closing the gap)
        this.createBox(thickness, wallHeight, (roomSize - corridorWidth) / 2, this.materials.greenWallpaper, new THREE.Vector3(corridorLength / 2, wallHeight / 2, -roomSize / 2 + (roomSize - corridorWidth) / 4));
        this.createBox(thickness, wallHeight, (roomSize - corridorWidth) / 2, this.materials.greenWallpaper, new THREE.Vector3(corridorLength / 2, wallHeight / 2, roomSize / 2 - (roomSize - corridorWidth) / 4));

        // Wooden Wainscoting (Inner lower half of the walls)
        const wainHeight = 1.5;
        const wDepth = 0.1;
        // North/South Wainscot
        this.createBox(roomSize, wainHeight, wDepth, this.materials.wainscoting, new THREE.Vector3(roomCenter, wainHeight / 2, -roomSize / 2 + thickness / 2 + wDepth / 2));
        this.createBox(roomSize, wainHeight, wDepth, this.materials.wainscoting, new THREE.Vector3(roomCenter, wainHeight / 2, roomSize / 2 - thickness / 2 - wDepth / 2));

        // East Wainscot (split by door)
        this.createBox(wDepth, wainHeight, roomSize / 2 - 1.5, this.materials.wainscoting, new THREE.Vector3(roomCenter + roomSize / 2 - thickness / 2 - wDepth / 2, wainHeight / 2, -roomSize / 4 - 0.75));
        this.createBox(wDepth, wainHeight, roomSize / 2 - 1.5, this.materials.wainscoting, new THREE.Vector3(roomCenter + roomSize / 2 - thickness / 2 - wDepth / 2, wainHeight / 2, roomSize / 4 + 0.75));

        // West Wainscot (split by corridor entrance)
        this.createBox(wDepth, wainHeight, (roomSize - corridorWidth) / 2, this.materials.wainscoting, new THREE.Vector3(corridorLength / 2 + thickness / 2 + wDepth / 2, wainHeight / 2, -roomSize / 2 + (roomSize - corridorWidth) / 4));
        this.createBox(wDepth, wainHeight, (roomSize - corridorWidth) / 2, this.materials.wainscoting, new THREE.Vector3(corridorLength / 2 + thickness / 2 + wDepth / 2, wainHeight / 2, roomSize / 2 - (roomSize - corridorWidth) / 4));

        // West Wall (Elevator entrance wall)
        // Left and right side of the elevator doors
        this.createBox(thickness, wallHeight, corridorWidth / 2 - 1.5, this.materials.wall, new THREE.Vector3(-corridorLength / 2, wallHeight / 2, -corridorWidth / 4 - 0.75));
        this.createBox(thickness, wallHeight, corridorWidth / 2 - 1.5, this.materials.wall, new THREE.Vector3(-corridorLength / 2, wallHeight / 2, corridorWidth / 4 + 0.75));

        // Elevator Doors (at the West end, facing East down the corridor)
        const hallWidth = 10; // For internal calculations
        const hallLength = 8;
        const hallZOffset = 0;
        const hallXCenter = -corridorLength / 2 - hallWidth / 2; // Position elevator cabin behind West wall

        const elDoorGeo = new THREE.BoxGeometry(thickness, wallHeight, 3); // 3 units wide for door gap
        this.elevatorDoorLeft = new THREE.Mesh(elDoorGeo, this.materials.metal);
        this.elevatorDoorLeft.position.set(-corridorLength / 2, wallHeight / 2, -1.5);
        this.elevatorDoorLeft.castShadow = true;
        this.scene.add(this.elevatorDoorLeft);
        this.colliders.push(this.elevatorDoorLeft); // They block you initially

        this.elevatorDoorRight = new THREE.Mesh(elDoorGeo, this.materials.metal);
        this.elevatorDoorRight.position.set(-corridorLength / 2, wallHeight / 2, 1.5);
        this.elevatorDoorRight.castShadow = true;
        this.scene.add(this.elevatorDoorRight);
        this.colliders.push(this.elevatorDoorRight);

        // Elevator Interior enclosed (West of the doors)
        const elDepth = 4;
        const elWidth = 3;
        // Elevator Back Wall
        this.createBox(thickness, wallHeight, elWidth, this.materials.metal, new THREE.Vector3(-corridorLength / 2 - elDepth, wallHeight / 2, 0));
        // Elevator North Wall
        this.createBox(elDepth, wallHeight, thickness, this.materials.metal, new THREE.Vector3(-corridorLength / 2 - elDepth / 2, wallHeight / 2, -elWidth / 2));
        // Elevator South Wall
        this.createBox(elDepth, wallHeight, thickness, this.materials.metal, new THREE.Vector3(-corridorLength / 2 - elDepth / 2, wallHeight / 2, elWidth / 2));
        // Elevator Floor (darker metal)
        const elFloorMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.7 });
        this.createBox(elDepth, 0.1, elWidth, elFloorMat, new THREE.Vector3(-corridorLength / 2 - elDepth / 2, -thickness / 2 + 0.1, 0));
        // Elevator Ceiling
        this.createBox(elDepth, thickness, elWidth, this.materials.ceiling, new THREE.Vector3(-corridorLength / 2 - elDepth / 2, wallHeight + thickness / 2 - 0.1, 0));

        // Elevator interior light
        const elLight = new THREE.PointLight(0xffeedd, 1.5, 5);
        elLight.position.set(-corridorLength / 2 - elDepth / 2, wallHeight - 0.2, 0);
        this.scene.add(elLight);
        // Flicker just the elevator light
        setInterval(() => {
            elLight.intensity = Math.random() > 0.9 ? 0.2 : 1.5;
        }, 150);

        // Add elevator button panel (inside the elevator)
        const panelGeo = new THREE.BoxGeometry(0.2, 0.4, 0.3);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(-corridorLength / 2 - 0.2, 1.5, elWidth / 2 - 0.2);
        panel.userData = { id: 'elevator_panel', interactable: true, prompt: "Elevator Panel", dialogue: "The panel is dead. No going back up." };
        this.scene.add(panel);

        // Blood streak near panel
        const streakGeo = new THREE.PlaneGeometry(1, 2);
        const streak = new THREE.Mesh(streakGeo, this.materials.blood);
        streak.position.set(-corridorLength / 2 - 0.26, 1.5, elWidth / 2 - 0.6);
        streak.rotation.y = Math.PI / 2;
        // z-fighting correction
        streak.material.depthWrite = false;
        streak.renderOrder = 1;
        this.scene.add(streak);
    }

    buildLighting() {
        // Bright ambient light (permanently illuminates entire map)
        const ambient = new THREE.AmbientLight(0x444444, 3.0);
        this.scene.add(ambient);

        // A flickering overhead light halfway down the corridor
        this.flickerLight = new THREE.PointLight(0xffddaa, 1.5, 25); // Reduced intensity
        this.flickerLight.position.set(0, 3.5, 0); // Center of corridor
        this.flickerLight.castShadow = true;
        this.scene.add(this.flickerLight);

        // Simple flicker interval
        setInterval(() => {
            this.flickerLight.intensity = Math.random() > 0.8 ? 0.1 : 1.5; // Reduced flicker intensity
        }, 100);
    }

    addObjects() {
        // Desk halfway down the corridor
        const desk = this.createBox(1.5, 1, 1, this.materials.wood, new THREE.Vector3(0, 0.5, 2));

        // Note 1 on the desk
        const noteGeo = new THREE.PlaneGeometry(0.3, 0.4);
        const note1 = new THREE.Mesh(noteGeo, this.materials.paper);
        note1.position.set(0, 1.01, 2);
        note1.rotation.x = -Math.PI / 2;
        note1.rotation.z = Math.PI / 6;
        note1.userData = { id: 'note_1', interactable: true, prompt: "Read Torn Page", dialogue: "<span style='color:red'>'They roam the dark... hiding in the walls. They only see you when you run.'</span>" };
        this.scene.add(note1);

        // Add brighter ceiling lights down the corridor, exactly 10 meters apart
        // Add brighter ceiling lights down the corridor
        this.createCeilingLight(-15, 4, 0, 0xddddaa, 5.0); // Reduced intensity
        this.createCeilingLight(0, 4, 0, 0xddddaa, 5.0); // Reduced intensity
        this.createCeilingLight(15, 4, 0, 0xddddaa, 5.0); // Reduced intensity

        // Escape Room Lighting
        this.createCeilingLight(31.5, 4, 0, 0xffcc88, 50.0); // Extreme bright central light
        this.createLantern(23, 3.8, -9, 0xffaa55, 15.0); // NW corner
        this.createLantern(40, 3.8, -9, 0xffaa55, 15.0); // NE corner
        this.createLantern(23, 3.8, 9, 0xffaa55, 15.0);  // SW corner
        this.createLantern(40, 3.8, 9, 0xffaa55, 15.0);  // SE corner

        // Room 2 Lighting — bright enough to see everything, red-tinted horror atmosphere
        // Main ceiling lights
        this.createCeilingLight(55, 4, 0,  0xff2200, 40.0);  // Center — harsh red
        this.createCeilingLight(47, 4, 0,  0xcc1100, 30.0);  // West
        this.createCeilingLight(63, 4, 0,  0xcc1100, 30.0);  // East
        this.createCeilingLight(47, 4, -7, 0xaa0a0a, 22.0);  // NW corner
        this.createCeilingLight(63, 4, -7, 0xaa0a0a, 22.0);  // NE corner
        this.createCeilingLight(47, 4,  7, 0xaa0a0a, 22.0);  // SW corner
        this.createCeilingLight(63, 4,  7, 0xaa0a0a, 22.0);  // SE corner

        // Dim warm fill lights low on the walls to kill pitch-black shadows
        const fillLight1 = new THREE.PointLight(0xff6633, 2.5, 18);
        fillLight1.position.set(50, 1.2, 0);
        this.scene.add(fillLight1);
        const fillLight2 = new THREE.PointLight(0xff6633, 2.5, 18);
        fillLight2.position.set(60, 1.2, 0);
        this.scene.add(fillLight2);

        // ── Room 2: Blood Writing ──────────────────────────────────────────────
        // Helper — creates a canvas texture panel of bloody handwriting
        const makeBloodPanel = (lines, fontSize, canvasW, canvasH) => {
            const c = document.createElement('canvas');
            c.width = canvasW; c.height = canvasH;
            const cx = c.getContext('2d');

            // Faint dark background so text reads against the metal wall
            cx.fillStyle = 'rgba(10,0,0,0.0)';
            cx.fillRect(0, 0, canvasW, canvasH);

            cx.textAlign = 'left';

            lines.forEach(({ text, y, size, alpha, slant }) => {
                cx.save();
                cx.font = `bold ${size || fontSize}px Georgia, serif`;
                cx.fillStyle = `rgba(${160 + Math.floor(Math.random()*40)}, ${Math.floor(Math.random()*8)}, ${Math.floor(Math.random()*8)}, ${alpha || 1.0})`;
                cx.translate(60, y);
                cx.rotate((slant || 0) * Math.PI / 180);
                cx.fillText(text, 0, 0);
                cx.restore();
            });

            // Blood drip streaks
            for (let d = 0; d < 6; d++) {
                const dx = 80 + Math.random() * (canvasW - 160);
                const dy = 30 + Math.random() * (canvasH - 80);
                const dLen = 40 + Math.random() * 120;
                cx.beginPath();
                cx.moveTo(dx, dy);
                cx.bezierCurveTo(dx + (Math.random()-0.5)*20, dy + dLen*0.4,
                                  dx + (Math.random()-0.5)*20, dy + dLen*0.7,
                                  dx + (Math.random()-0.5)*10, dy + dLen);
                cx.strokeStyle = `rgba(140,3,3,${0.4 + Math.random()*0.4})`;
                cx.lineWidth = 3 + Math.random() * 5;
                cx.stroke();
            }

            // Smear blobs
            for (let s = 0; s < 4; s++) {
                cx.beginPath();
                cx.ellipse(Math.random()*canvasW, Math.random()*canvasH,
                    20+Math.random()*35, 10+Math.random()*20,
                    Math.random()*Math.PI, 0, Math.PI*2);
                cx.fillStyle = `rgba(120,2,2,${0.2+Math.random()*0.3})`;
                cx.fill();
            }

            return new THREE.CanvasTexture(c);
        };

        const bloodMat = (tex) => new THREE.MeshBasicMaterial({
            map: tex, transparent: true, depthWrite: false, side: THREE.FrontSide
        });

        // ── NORTH WALL — Entry message + her first moments ────────────────────
        const northTex1 = makeBloodPanel([
            { text: "THEY BROUGHT ME HERE ON DAY 3",      y: 80,  size: 52, slant: -1.5 },
            { text: "I COULD NOT SCREAM.",                 y: 160, size: 44, slant:  0.8, alpha: 0.9 },
            { text: "NO ONE WOULD HEAR.",                  y: 230, size: 44, slant: -0.5, alpha: 0.85 },
        ], 48, 1024, 300);
        const nw1 = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.6), bloodMat(northTex1));
        nw1.position.set(50, 2.8, -9.85);
        nw1.userData = { id: 'blood_north_1', interactable: true, prompt: "Read Blood Writing",
            dialogue: [
                "The handwriting is huge, desperate — scratched into the wall with something sharp, then filled with blood.",
                "<span style='color:#cc0000'>'THEY BROUGHT ME HERE ON DAY 3. I COULD NOT SCREAM. NO ONE WOULD HEAR.'</span>",
                "She was alive when she wrote this."
            ]};
        this.scene.add(nw1);

        // ── NORTH WALL — What they did to her ────────────────────────────────
        const northTex2 = makeBloodPanel([
            { text: "THEY STRAPPED ME TO THE TABLE",       y: 75,  size: 48, slant: -2.0 },
            { text: "FOR HOURS.",                          y: 150, size: 60, slant:  1.0, alpha: 0.95 },
            { text: "i counted the ceiling tiles to stay sane", y: 220, size: 32, slant: -0.8, alpha: 0.7 },
            { text: "there are 47.",                       y: 270, size: 32, slant:  0.5, alpha: 0.65 },
        ], 44, 1024, 320);
        const nw2 = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), bloodMat(northTex2));
        nw2.position.set(60, 2.6, -9.85);
        nw2.userData = { id: 'blood_north_2', interactable: true, prompt: "Read Blood Writing",
            dialogue: [
                "<span style='color:#cc0000'>'THEY STRAPPED ME TO THE TABLE FOR HOURS.'</span>",
                "Her handwriting breaks apart here. The large letters give way to something smaller, more fragile.",
                "<span style='color:#880000'>'i counted the ceiling tiles to stay sane. there are 47.'</span>",
                "I look up. She's right."
            ]};
        this.scene.add(nw2);

        // ── SOUTH WALL — The creature ─────────────────────────────────────────
        const southTex1 = makeBloodPanel([
            { text: "IT IS NOT HUMAN.",                    y: 80,  size: 56, slant:  1.8 },
            { text: "IT HAS NO EYES.",                     y: 160, size: 56, slant: -1.2 },
            { text: "BUT IT ALWAYS FINDS YOU.",            y: 240, size: 46, slant:  0.6, alpha: 0.9 },
            { text: "IT SMELLS FEAR.",                     y: 310, size: 38, slant: -2.0, alpha: 0.8 },
        ], 48, 1024, 360);
        const sw1 = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), bloodMat(southTex1));
        sw1.position.set(50, 2.5, 9.85);
        sw1.rotation.y = Math.PI;
        sw1.userData = { id: 'blood_south_1', interactable: true, prompt: "Read Blood Writing",
            dialogue: [
                "The letters on this wall are uneven — written in a frenzy.",
                "<span style='color:#cc0000'>'IT IS NOT HUMAN. IT HAS NO EYES.'</span>",
                "<span style='color:#cc0000'>'BUT IT ALWAYS FINDS YOU. IT SMELLS FEAR.'</span>",
                "My hands are shaking."
            ]};
        this.scene.add(sw1);

        // ── SOUTH WALL — Her final message ───────────────────────────────────
        const southTex2 = makeBloodPanel([
            { text: "if you are reading this",             y: 70,  size: 36, slant: -1.0, alpha: 0.8 },
            { text: "you are already too late",            y: 130, size: 36, slant:  1.5, alpha: 0.75 },
            { text: "— OR —",                              y: 195, size: 30, slant:  0.0, alpha: 0.6 },
            { text: "RUN.",                                y: 290, size: 88, slant: -3.0, alpha: 1.0 },
            { text: "DO NOT STOP.",                        y: 370, size: 42, slant:  2.0, alpha: 0.9 },
        ], 44, 1024, 420);
        const sw2 = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), bloodMat(southTex2));
        sw2.position.set(61, 2.4, 9.85);
        sw2.rotation.y = Math.PI;
        sw2.userData = { id: 'blood_south_2', interactable: true, prompt: "Read Blood Writing",
            dialogue: [
                "<span style='color:#880000'>'if you are reading this... you are already too late.'</span>",
                "And then, in letters so large they take up half the wall —",
                "<span style='color:#ff0000; font-size:2em; font-weight:bold'>RUN. DO NOT STOP.</span>",
                "...",
                "I need to get that code and get out. NOW."
            ]};
        this.scene.add(sw2);

        // ── WEST WALL (entrance wall) — final scrawl near the floor ──────────
        const westTex = makeBloodPanel([
            { text: "i hear it coming",                    y: 60,  size: 28, slant: -1.5, alpha: 0.65 },
            { text: "scratching",                          y: 105, size: 28, slant:  2.0, alpha: 0.55 },
            { text: "always scratching",                   y: 148, size: 28, slant: -0.5, alpha: 0.5  },
            { text: "— M",                                 y: 200, size: 22, slant:  0.0, alpha: 0.45 },
        ], 28, 512, 240);
        const ww = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.6), bloodMat(westTex));
        ww.position.set(40.3, 0.9, 2);
        ww.rotation.y = Math.PI / 2;
        ww.userData = { id: 'blood_west', interactable: true, prompt: "Read Scrawl on Wall",
            dialogue: [
                "Down near the floor, barely visible — written in a trembling hand.",
                "<span style='color:#880000'>'i hear it coming... scratching... always scratching'</span>",
                "It ends with a single initial.",
                "<span style='color:#660000'>'— M'</span>",
                "Her name started with M. She was here. She didn't make it out."
            ]};
        this.scene.add(ww);

        // Room 2: Iron Cage (The Code Location)
        const cageGroup = new THREE.Group();
        const baseGeo = new THREE.BoxGeometry(3, 0.2, 3);
        const cageBase = new THREE.Mesh(baseGeo, this.materials.metal);
        cageGroup.add(cageBase);

        // Cage Bars
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (i === 0 || i === 3 || j === 0 || j === 3) {
                    const barGeo = new THREE.CylinderGeometry(0.05, 0.05, 4);
                    const bar = new THREE.Mesh(barGeo, this.materials.metal);
                    bar.position.set(-1.5 + i * 1.0, 2, -1.5 + j * 1.0);
                    cageGroup.add(bar);
                }
            }
        }
        cageGroup.position.set(65, 0.1, 7);
        this.room2Password = "1984"; // The 4 digit code
        cageGroup.userData = { id: 'iron_cage', interactable: true, prompt: "Inspect Iron Cage", dialogue: "There's a decapitated corpse in here... and a code scratched into the metal floor: <span style='color:red; font-size: 1.5em;'>" + this.room2Password + "</span>" };
        this.scene.add(cageGroup);
        const cageHit = this.createBox(3.4, 4.4, 3.4, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(65, 2.2, 7));
        cageHit.userData = cageGroup.userData;

        // Room 2: Metal Torture Table
        const mTableGroup = new THREE.Group();
        const mTableTop = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 2), this.materials.metal);
        mTableTop.position.y = 1.3;
        const mLegGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.3);
        const mLeg1 = new THREE.Mesh(mLegGeo, this.materials.metal); mLeg1.position.set(-1.8, 0.65, -0.8);
        const mLeg2 = new THREE.Mesh(mLegGeo, this.materials.metal); mLeg2.position.set(1.8, 0.65, -0.8);
        const mLeg3 = new THREE.Mesh(mLegGeo, this.materials.metal); mLeg3.position.set(-1.8, 0.65, 0.8);
        const mLeg4 = new THREE.Mesh(mLegGeo, this.materials.metal); mLeg4.position.set(1.8, 0.65, 0.8);
        mTableGroup.add(mTableTop, mLeg1, mLeg2, mLeg3, mLeg4);
        mTableGroup.position.set(55, 0, 0);
        mTableGroup.userData = { id: 'torture_table', interactable: true, prompt: "Inspect Metal Table", dialogue: "It's covered in dried blood and rusty surgical tools. I need to get out of here right now." };
        this.scene.add(mTableGroup);
        // More precise collision box
        const mTableHit = this.createBox(4.1, 1.4, 2.1, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(55, 0.7, 0));
        mTableHit.userData = mTableGroup.userData;

        // Determine random key location (For Room 1)
        const hidingSpots = ['table', 'cupboard', 'wardrobe', 'desk', 'sidecabinet', 'bureau'];
        this.keyLocation = hidingSpots[Math.floor(Math.random() * hidingSpots.length)];
        console.log("Key hidden in:", this.keyLocation); // For debugging

        // Add Escape Room Furniture

        // North Wall: Wardrobe (NW), Writing Bureau (NE corner area), Victorian Desk (angled NE)
        const wardrobe = this.createWardrobe(24, 0, -9, 0);
        Object.assign(wardrobe.userData, { id: 'wardrobe', interactable: true, prompt: "Search Wardrobe", hasKey: this.keyLocation === 'wardrobe' });
        this.colliders.push(wardrobe);

        const bureau = this.createWritingBureau(33, 0, -9, 0);
        Object.assign(bureau.userData, { id: 'bureau', interactable: true, prompt: "Search Writing Bureau", hasKey: this.keyLocation === 'bureau' });
        this.colliders.push(bureau);

        const vicDesk = this.createVictorianDesk(38, 0, -7, -Math.PI / 6);
        Object.assign(vicDesk.userData, { id: 'desk', interactable: true, prompt: "Search Desk Drawer", hasKey: this.keyLocation === 'desk' });
        this.colliders.push(vicDesk);

        // Victorian Red Carpet
        const carpetGeo = new THREE.BoxGeometry(14, 0.05, 12);
        const carpetMat = new THREE.MeshStandardMaterial({ color: 0x660000, roughness: 0.9 });
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.position.set(30, 0.025, 0);
        this.scene.add(carpet);

        // Center of Room: Small Table with a Diary
        const centerTableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 16);
        const centerTableMat = this.materials.wood;
        const centerTableTop = new THREE.Mesh(centerTableGeo, centerTableMat);
        centerTableTop.position.set(30, 1.2, 0);
        const centerTableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), centerTableMat);
        centerTableLeg.position.set(30, 0.6, 0);
        const centerTableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16), centerTableMat);
        centerTableBase.position.set(30, 0.05, 0);
        this.scene.add(centerTableTop, centerTableLeg, centerTableBase);

        const ctHitBox = this.createBox(2.4, 1.3, 2.4, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(30, 0.65, 0));
        this.colliders.push(ctHitBox);

        // Diary on the Center Table
        const diaryGeo = new THREE.BoxGeometry(0.6, 0.05, 0.8);
        const diaryMat = new THREE.MeshStandardMaterial({ color: 0x331111, roughness: 0.9 });
        const diary = new THREE.Mesh(diaryGeo, diaryMat);
        diary.position.set(30, 1.25, 0.3);
        diary.rotation.y = Math.PI / 6;
        diary.userData = { id: 'diary', interactable: true, prompt: "Read Leather Diary" };
        this.scene.add(diary);

        // NW Corner: Small Table with Drawers
        const table = this.createCornerTable(22, 0, -7, 0);
        Object.assign(table.userData, { id: 'table', interactable: true, prompt: "Search Drawers", hasKey: this.keyLocation === 'table' });
        this.colliders.push(table);

        // Chaise longue — center-west area, facing east
        const chaise = this.createChaiseLongue(26, 0, 3, Math.PI / 2);
        this.colliders.push(chaise);

        // South Wall: Cupboard (center-south), Side Cabinet (SE), Bookshelf (SW)
        const cupboard = this.createAestheticCupboard(30, 0, 9, Math.PI);
        Object.assign(cupboard.userData, { id: 'cupboard', interactable: true, prompt: "Search Cupboard", hasKey: this.keyLocation === 'cupboard' });
        this.colliders.push(cupboard);

        const sideCabinet = this.createSideCabinet(37, 0, 9, Math.PI);
        Object.assign(sideCabinet.userData, { id: 'sidecabinet', interactable: true, prompt: "Search Side Cabinet", hasKey: this.keyLocation === 'sidecabinet' });
        this.colliders.push(sideCabinet);

        const bookshelf = this.createVictorianBookshelf(23, 0, 9, Math.PI);
        Object.assign(bookshelf.userData, { id: 'bookshelf', interactable: true, prompt: "Search Bookshelf", hasKey: false });
        this.colliders.push(bookshelf);

        // East Wall (Flanking the door): Boarded Windows
        this.createBoardedWindow(39.9, 1.5, -5, -Math.PI / 2);
        this.createBoardedWindow(39.9, 1.5, 5, -Math.PI / 2);

        // Add the Satanist paintings to the walls of the corridor
        // Corridor Width is 6 (Z from -3 to 3). Wall surfaces are at Z = -2.9 and Z = 2.9 roughly.

        // Near the elevator entrance (-18, -15)
        // Walls are at Z=-3 and Z=3, with thickness 0.5. So wall surfaces are at -2.75 and 2.75. 
        this.createPainting(-18, 2, -2.7, 0, 'assets/img/real1.png', "A horrific, bloody demon with a crown of thorns.");
        this.createPainting(-15, 2, 2.7, Math.PI, 'assets/img/real2.png', "A terrifying occult ritual altar with burned candles.");

        // Middle of the corridor (-5, 5)
        this.createPainting(-5, 2, -2.7, 0, 'assets/img/real3.png', "A massive sacrificial circle dripping in red wax and blood.");
        this.createPainting(5, 2, 2.7, Math.PI, 'assets/img/real4.png', "An ancient, cursed door covered in frantic occult scratchings.");

        // Add a blood streak under the first painting
        const bigStreakGeo = new THREE.PlaneGeometry(1.5, 3);
        const bigStreak = new THREE.Mesh(bigStreakGeo, this.materials.blood);
        bigStreak.position.set(-18, 1, -2.74); // Place slightly in front of the -2.75 wall surface
        bigStreak.material.depthWrite = false;
        bigStreak.renderOrder = 1;
        this.scene.add(bigStreak);
    }

    openElevatorDoors() {
        if (window.gsap && this.elevatorDoorLeft && this.elevatorDoorRight) {
            // Animate doors sliding apart along the Z axis
            gsap.to(this.elevatorDoorLeft.position, { z: -4.5, duration: 4, ease: "power1.inOut" });
            gsap.to(this.elevatorDoorRight.position, { z: 4.5, duration: 4, ease: "power1.inOut" });

            // Remove doors from colliders so player can walk out
            setTimeout(() => {
                this.colliders = this.colliders.filter(c => c !== this.elevatorDoorLeft && c !== this.elevatorDoorRight);
            }, 500); // Give player time to see them opening before removing barriers completely
        }
    }

    createCeilingLight(x, y, z, colorHex, intensity) {
        // Small ceiling fixture
        const fixGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1);
        const fixMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2,
        });
        const fixture = new THREE.Mesh(fixGeo, fixMat);
        fixture.position.set(x, y, z);
        this.scene.add(fixture);

        // Glowing bulb part
        const bulbGeo = new THREE.SphereGeometry(0.2);
        const bulbMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(x, y - 0.1, z);
        this.scene.add(bulb);

        // Actual Point light (increased distance to 25 to reach larger rooms)
        const light = new THREE.PointLight(colorHex, intensity, 25);
        light.position.set(x, y - 0.2, z);
        light.castShadow = true;
        this.scene.add(light);

        // Optional subtle flicker
        setInterval(() => {
            light.intensity = intensity + (Math.random() * 0.2 - 0.1);
        }, 200);
    }

    createDesk(x, y, z) {
        const deskGroup = new THREE.Group();
        // Desktop
        const top = this.createBox(2, 0.1, 4, this.materials.wood, new THREE.Vector3(0, y + 1.2, 0));
        deskGroup.add(top);
        // Legs
        deskGroup.add(this.createBox(0.2, 1.2, 0.2, this.materials.wood, new THREE.Vector3(-0.8, y + 0.6, -1.8)));
        deskGroup.add(this.createBox(0.2, 1.2, 0.2, this.materials.wood, new THREE.Vector3(-0.8, y + 0.6, 1.8)));
        deskGroup.add(this.createBox(0.2, 1.2, 0.2, this.materials.wood, new THREE.Vector3(0.8, y + 0.6, -1.8)));
        deskGroup.add(this.createBox(0.2, 1.2, 0.2, this.materials.wood, new THREE.Vector3(0.8, y + 0.6, 1.8)));

        deskGroup.position.set(x, 0, z);
        this.scene.add(deskGroup);
        // Create an invisible collider box that covers the whole desk so raycaster can hit it as a single object
        const colliderGeo = new THREE.BoxGeometry(2.2, 1.4, 4.2);
        const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitBox = new THREE.Mesh(colliderGeo, colliderMat);
        hitBox.position.set(x, y + 0.7, z);
        this.scene.add(hitBox);
        return hitBox;
    }

    createChair(x, y, z, rotationY) {
        const chairGroup = new THREE.Group();
        // Seat
        const seatGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
        const seat = new THREE.Mesh(seatGeo, this.materials.wood);
        seat.position.y = 0.6;
        chairGroup.add(seat);

        // Back
        const backGeo = new THREE.BoxGeometry(0.1, 0.8, 0.8);
        const back = new THREE.Mesh(backGeo, this.materials.wood);
        back.position.set(0.35, 1.0, 0);
        chairGroup.add(back);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
        const l1 = new THREE.Mesh(legGeo, this.materials.wood); l1.position.set(-0.3, 0.3, -0.3);
        const l2 = new THREE.Mesh(legGeo, this.materials.wood); l2.position.set(0.3, 0.3, -0.3);
        const l3 = new THREE.Mesh(legGeo, this.materials.wood); l3.position.set(-0.3, 0.3, 0.3);
        const l4 = new THREE.Mesh(legGeo, this.materials.wood); l4.position.set(0.3, 0.3, 0.3);
        chairGroup.add(l1, l2, l3, l4);

        chairGroup.position.set(x, y, z);
        chairGroup.rotation.y = rotationY;
        this.scene.add(chairGroup);
        // Note: We might want a single bounding box collider for the chair, but for simple furniture we can omit it or add a block
        this.createBox(0.8, 1.4, 0.8, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.7, z));
    }

    createVictorianBookshelf(x, y, z, rotationY) {
        const shelfGroup = new THREE.Group();

        // Main framework
        const frameworkGeo = new THREE.BoxGeometry(3, 5, 1.2);
        const framework = new THREE.Mesh(frameworkGeo, this.materials.wood);
        framework.position.y = 2.5;
        shelfGroup.add(framework);

        // Inner backing (dark)
        const backGeo = new THREE.BoxGeometry(2.8, 4.8, 0.1);
        const back = new THREE.Mesh(backGeo, new THREE.MeshStandardMaterial({ color: 0x110a05 }));
        back.position.set(0, 2.5, -0.55);
        shelfGroup.add(back);

        // Book colors
        const bookMats = [
            new THREE.MeshStandardMaterial({ color: 0x4B1919 }), // Dark Red
            new THREE.MeshStandardMaterial({ color: 0x193319 }), // Dark Green
            new THREE.MeshStandardMaterial({ color: 0x19194B }), // Dark Blue
            new THREE.MeshStandardMaterial({ color: 0x3d2b1f }), // Brown
            new THREE.MeshStandardMaterial({ color: 0x111111 })  // Black
        ];

        // Shelves and books
        const shelfGeo = new THREE.BoxGeometry(2.8, 0.1, 1.0);
        for (let i = 0.8; i < 5.0; i += 1.0) {
            const shelf = new THREE.Mesh(shelfGeo, this.materials.wood);
            shelf.position.y = i;
            shelf.position.z = -0.05;
            shelfGroup.add(shelf);

            // Populate books
            let currentX = -1.3;
            while (currentX < 1.3) {
                const bWidth = 0.1 + Math.random() * 0.15;
                const bHeight = 0.5 + Math.random() * 0.3;
                if (currentX + bWidth > 1.3) break;

                const bookGeo = new THREE.BoxGeometry(bWidth, bHeight, 0.6);
                const mat = bookMats[Math.floor(Math.random() * bookMats.length)];
                const book = new THREE.Mesh(bookGeo, mat);

                if (Math.random() > 0.8) book.rotation.z = (Math.random() - 0.5) * 0.3;

                book.position.set(currentX + bWidth / 2, i + bHeight / 2 + 0.05, -0.1 + Math.random() * 0.1);
                shelfGroup.add(book);

                currentX += bWidth + 0.02;
            }
        }

        shelfGroup.position.set(x, y, z);
        shelfGroup.rotation.y = rotationY;
        this.scene.add(shelfGroup);
        const hitBox = this.createBox(3, 5, 1.2, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 2.5, z));
        return hitBox;
    }

    createFireplace(x, y, z, rotationY) {
        const fpGroup = new THREE.Group();

        // Main wooden mantel body
        const mantelGeo = new THREE.BoxGeometry(6, 4, 1.5);
        const mantel = new THREE.Mesh(mantelGeo, this.materials.wood);
        mantel.position.y = 2;
        fpGroup.add(mantel);

        // Firebox cutout (inner brick/black)
        const holeGeo = new THREE.BoxGeometry(3.2, 2.5, 1.6);
        const hole = new THREE.Mesh(holeGeo, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1.0 }));
        hole.position.set(0, 1.25, 0.1);
        fpGroup.add(hole);

        // Mantel top ledge
        const topGeo = new THREE.BoxGeometry(6.5, 0.2, 1.8);
        const top = new THREE.Mesh(topGeo, this.materials.wood);
        top.position.set(0, 4.1, 0.1);
        fpGroup.add(top);

        // Fire light inside
        const fireLight = new THREE.PointLight(0xff6600, 5, 5);
        fireLight.position.set(0, 0.5, 0.5);
        fpGroup.add(fireLight);

        fpGroup.position.set(x, y, z);
        fpGroup.rotation.y = rotationY;
        this.scene.add(fpGroup);

        const hitBox = this.createBox(6, 4.2, 1.5, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 2.1, z));
        return hitBox;
    }

    createBed(x, y, z) {
        const bedGroup = new THREE.Group();

        // Wood Frame
        const frameGeo = new THREE.BoxGeometry(4, 0.4, 5);
        const frame = new THREE.Mesh(frameGeo, this.materials.wood);
        frame.position.y = 0.2;
        bedGroup.add(frame);

        // Headboard
        const boardGeo = new THREE.BoxGeometry(4, 1.5, 0.4);
        const board = new THREE.Mesh(boardGeo, this.materials.wood);
        board.position.set(0, 0.75, 2.3);
        bedGroup.add(board);

        // Mattress/Fabric
        const mattressGeo = new THREE.BoxGeometry(3.8, 0.5, 4.8);
        const mattress = new THREE.Mesh(mattressGeo, this.materials.bedFabric);
        mattress.position.y = 0.6;
        bedGroup.add(mattress);

        bedGroup.position.set(x, y, z);
        this.scene.add(bedGroup);
        const hitBox = this.createBox(4, 1, 5, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.5, z));
        return hitBox;
    }

    createSofa(x, y, z, rotationY) {
        const sofaGroup = new THREE.Group();

        // Base seat
        const seatGeo = new THREE.BoxGeometry(4, 0.6, 1.5);
        const seat = new THREE.Mesh(seatGeo, this.materials.sofaLeather);
        seat.position.y = 0.3;
        sofaGroup.add(seat);

        // Backrest
        const backGeo = new THREE.BoxGeometry(4, 1.2, 0.4);
        const back = new THREE.Mesh(backGeo, this.materials.sofaLeather);
        back.position.set(0, 0.9, 0.55); // pushed to back edge of seat
        sofaGroup.add(back);

        // Left Armrest
        const armGeo = new THREE.BoxGeometry(0.4, 0.6, 1.5);
        const armL = new THREE.Mesh(armGeo, this.materials.sofaLeather);
        armL.position.set(-1.8, 0.9, 0);
        sofaGroup.add(armL);

        // Right Armrest
        const armR = new THREE.Mesh(armGeo, this.materials.sofaLeather);
        armR.position.set(1.8, 0.9, 0);
        sofaGroup.add(armR);

        sofaGroup.position.set(x, y, z);
        sofaGroup.rotation.y = rotationY;
        this.scene.add(sofaGroup);

        const hitBox = this.createBox(4, 1.2, 1.5, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.6, z));
        return hitBox;
    }

    createWardrobe(x, y, z, rotationY) {
        const dropGroup = new THREE.Group();
        const W = 3.0, H = 5.0, D = 1.5; // width, height, depth
        const t = 0.08; // panel thickness

        // --- Outer shell (5 sides, open front) ---
        // Back panel
        const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), this.materials.wardrobeWood);
        back.position.set(0, H / 2, -D / 2 + t / 2);
        dropGroup.add(back);
        // Top panel
        const top = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), this.materials.wardrobeWood);
        top.position.set(0, H - t / 2, 0);
        dropGroup.add(top);
        // Bottom panel
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), this.materials.wardrobeWood);
        bottom.position.set(0, t / 2, 0);
        dropGroup.add(bottom);
        // Left side panel
        const sideL = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), this.materials.wardrobeWood);
        sideL.position.set(-W / 2 + t / 2, H / 2, 0);
        dropGroup.add(sideL);
        // Right side panel
        const sideR = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), this.materials.wardrobeWood);
        sideR.position.set(W / 2 - t / 2, H / 2, 0);
        dropGroup.add(sideR);

        // Crown moulding on top
        const crownGeo = new THREE.BoxGeometry(W + 0.1, 0.15, D + 0.1);
        const crown = new THREE.Mesh(crownGeo, this.materials.wainscoting);
        crown.position.set(0, H + 0.07, 0);
        dropGroup.add(crown);

        // Base plinth
        const plinthGeo = new THREE.BoxGeometry(W + 0.1, 0.18, D + 0.1);
        const plinth = new THREE.Mesh(plinthGeo, this.materials.wainscoting);
        plinth.position.set(0, 0.09, 0);
        dropGroup.add(plinth);

        // --- Interior ---
        const interiorMat = new THREE.MeshStandardMaterial({ color: 0x1a0d06, roughness: 1.0 });

        // Interior back wall
        const intBack = new THREE.Mesh(new THREE.BoxGeometry(W - t * 2, H - t * 2, 0.02), interiorMat);
        intBack.position.set(0, H / 2, -D / 2 + t + 0.01);
        dropGroup.add(intBack);

        // Middle shelf (splits hanging area from lower storage)
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - t * 2, t, D - t), this.materials.wardrobeWood);
        shelf.position.set(0, H * 0.45, 0);
        dropGroup.add(shelf);

        // Hanging rod above the shelf
        const rodGeo = new THREE.CylinderGeometry(0.025, 0.025, W - t * 2, 8);
        const rodMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
        const rod = new THREE.Mesh(rodGeo, rodMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, H * 0.45 + 0.35, -D / 2 + t + 0.25);
        dropGroup.add(rod);

        // A few hanging clothes (dark fabric rectangles)
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, side: THREE.DoubleSide });
        const clothPositions = [-0.9, -0.3, 0.3, 0.9];
        clothPositions.forEach(cx => {
            const clothGeo = new THREE.PlaneGeometry(0.35, 0.9);
            const cloth = new THREE.Mesh(clothGeo, clothMat);
            cloth.position.set(cx, H * 0.45 + 0.35 - 0.5, -D / 2 + t + 0.28);
            dropGroup.add(cloth);
        });

        // Lower storage box
        const storageGeo = new THREE.BoxGeometry(W - t * 2 - 0.1, 0.35, D - t - 0.1);
        const storage = new THREE.Mesh(storageGeo, this.materials.wainscoting);
        storage.position.set(0, t + 0.18, 0);
        dropGroup.add(storage);

        // --- Doors ---
        // Each door pivot is at its hinge edge (x = ±W/2 inside the group)
        // Door mesh is offset +half-width from pivot so it swings correctly

        const doorW = W / 2 - t; // each door covers half the opening minus gap
        const doorH = H - t * 2 - 0.02;
        const doorD = 0.06;

        const makeDoor = (side) => {
            const dGroup = new THREE.Group();

            // Door panel
            const dMesh = new THREE.Mesh(
                new THREE.BoxGeometry(doorW, doorH, doorD),
                this.materials.wardrobeWood
            );
            dMesh.position.x = side * doorW / 2; // offset mesh from hinge pivot
            dGroup.add(dMesh);

            // Raised panel detail (inner rectangle inset)
            const panelInset = new THREE.MeshStandardMaterial({ color: 0x2a1208, roughness: 0.9 });
            const panelTop = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.75, doorH * 0.42, 0.02), panelInset);
            panelTop.position.set(side * doorW / 2, doorH * 0.2, doorD / 2 + 0.01);
            dGroup.add(panelTop);
            const panelBot = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.75, doorH * 0.42, 0.02), panelInset);
            panelBot.position.set(side * doorW / 2, -doorH * 0.2, doorD / 2 + 0.01);
            dGroup.add(panelBot);

            // Handle — placed near the inner edge of each door
            const handleGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8);
            const handleMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.9, roughness: 0.2 });
            const handle = new THREE.Mesh(handleGeo, handleMat);
            handle.rotation.x = Math.PI / 2;
            // inner edge of door = side * (doorW - small gap from center)
            const handleX = side * (doorW - 0.12);
            handle.position.set(handleX, 0, doorD / 2 + 0.04);
            dGroup.add(handle);

            // Handle back plate
            const plateMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, metalness: 0.8, roughness: 0.3 });
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.02), plateMat);
            plate.position.set(handleX, 0, doorD / 2 + 0.02);
            dGroup.add(plate);

            return dGroup;
        };

        // Left door: hinge at x = -W/2 + t, swings outward (negative Y rotation)
        const doorL = makeDoor(1);
        doorL.position.set(-W / 2 + t, H / 2, D / 2);
        dropGroup.add(doorL);

        // Right door: hinge at x = +W/2 - t, swings outward (positive Y rotation)
        const doorR = makeDoor(-1);
        doorR.position.set(W / 2 - t, H / 2, D / 2);
        dropGroup.add(doorR);

        dropGroup.position.set(x, y, z);
        dropGroup.rotation.y = rotationY;
        this.scene.add(dropGroup);

        const hitBox = this.createBox(W + 0.2, H + 0.3, D + 0.2, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + H / 2, z));
        hitBox.userData.animatableParts = [doorL, doorR];
        hitBox.userData.isDoubleDoor = true;
        return hitBox;
    }

    createVictorianDesk(x, y, z, rotationY) {
        const deskGroup = new THREE.Group();

        // Thick Tabletop
        const topGeo = new THREE.BoxGeometry(3.5, 0.3, 1.8);
        const top = new THREE.Mesh(topGeo, this.materials.wood);
        top.position.y = 1.6;
        deskGroup.add(top);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.3, 1.6, 0.3);
        const l1 = new THREE.Mesh(legGeo, this.materials.wainscoting); l1.position.set(-1.5, 0.8, -0.7);
        const l2 = new THREE.Mesh(legGeo, this.materials.wainscoting); l2.position.set(1.5, 0.8, -0.7);
        const l3 = new THREE.Mesh(legGeo, this.materials.wainscoting); l3.position.set(-1.5, 0.8, 0.7);
        const l4 = new THREE.Mesh(legGeo, this.materials.wainscoting); l4.position.set(1.5, 0.8, 0.7);
        deskGroup.add(l1, l2, l3, l4);

        // Huge Central Drawer
        const drawerGroup = new THREE.Group();
        const drawerGeo = new THREE.BoxGeometry(2.6, 0.4, 1.4);
        const dBody = new THREE.Mesh(drawerGeo, this.materials.wainscoting);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), this.materials.metal);
        handle.position.z = 0.72;
        drawerGroup.add(dBody, handle);
        drawerGroup.position.set(0, 1.25, 0); // Directly under center of top
        deskGroup.add(drawerGroup);

        deskGroup.position.set(x, y, z);
        deskGroup.rotation.y = rotationY;
        this.scene.add(deskGroup);

        const hitBox = this.createBox(3.6, 1.8, 1.9, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.9, z));
        hitBox.userData.animatableParts = [drawerGroup, drawerGroup]; // Slide single drawer
        return hitBox;
    }

    createPainting(x, y, z, rotationY, imagePath, dialogue) {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(imagePath);

        // Frame geometry
        const frameWidth = 2.4;
        const frameHeight = 2.4;
        const frameGeo = new THREE.BoxGeometry(frameWidth, frameHeight, 0.1);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x110500, roughness: 1.0 });
        const frame = new THREE.Mesh(frameGeo, frameMat);

        // Canvas geometry (slightly smaller)
        const canvasGeo = new THREE.PlaneGeometry(2, 2);
        const canvasMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
        const canvas = new THREE.Mesh(canvasGeo, canvasMat);
        canvas.position.z = 0.06; // Push it just in front of the frame

        const paintingGroup = new THREE.Group();
        paintingGroup.add(frame);
        paintingGroup.add(canvas);

        paintingGroup.position.set(x, y, z);
        paintingGroup.rotation.y = rotationY;

        // Add interaction data onto the frame bounding box
        frame.userData = { id: 'painting_' + Math.random(), interactable: true, prompt: "Examine Painting", dialogue: dialogue };

        this.scene.add(paintingGroup);
        this.colliders.push(frame);
    }

    update(player) {
        // Trigger Escape Room door slam
        if (!this.trapTriggered && player.camera.position.x > 22) {
            this.trapTriggered = true;

            // Slam the door shut
            if (window.gsap) {
                gsap.to(this.trapDoor.position, { z: 0, duration: 0.15, ease: "power4.in" });
            } else {
                this.trapDoor.position.z = 0;
            }

            // Re-enable collision
            this.colliders.push(this.trapDoor);
            this.trapDoor.userData = { id: 'trap_door_locked', interactable: true, prompt: "Locked Trapdoor", dialogue: "It slammed shut violently! There's no door handle inside." };

            // Initialize Timer
                this.countdownActive = true;
                this.timeLeft = 30.0;
                this.lastTime = performance.now();
                player.ui.showTimer();

            // Force dialogue
            player.ui.showDialogue([
                "<span style='color:red; font-size: 2em'>*SLAM*</span>",
                "The door just slammed shut behind me!",
                "I hear something scraping its claws in the darkness... I don't have much time."
            ]);
        }

        // Trigger Room 2 door slam
        if (!this.room2TrapTriggered && player.camera.position.x > 45) {
            this.room2TrapTriggered = true;

            // Slam the exit door back to z=0, blocking the passage
            if (window.gsap) {
                gsap.to(this.exitDoor.position, { z: 0, duration: 0.15, ease: "power4.in" });
            } else {
                this.exitDoor.position.z = 0;
            }

            // Re-enable collision and make it locked again
            this.colliders.push(this.exitDoor);
            this.exitDoor.userData = { id: 'exit_door_trapped', interactable: true, prompt: "Locked Door", dialogue: "It's bolted tight! I'm trapped again!" };

            // Force dialogue — no timer in Room 2
            player.ui.showDialogue([
                "<span style='color:red; font-size: 2em'>*SLAM*</span>",
                "No! It locked me in!",
                "This room... it's a slaughterhouse. I need to find the code and get through that final door FAST."
            ]);
        }

        // Handle Countdown
        if (this.countdownActive && !this.gameOver) {
            const now = performance.now();
            const delta = (now - this.lastTime) / 1000;
            this.lastTime = now;

            // Only decrement if not currently reading dialogue
            if (!player.ui.isDialogueActive() && !player.ui.isTyping) {
                this.timeLeft -= delta;
                player.ui.updateTimer(Math.max(0, this.timeLeft));

                if (this.timeLeft <= 0) {
                    this.timeLeft = 0;
                    this.countdownActive = false;
                    this.gameOver = true;

                    // Turn off all lights
                    this.scene.traverse((child) => {
                        if (child.isLight) {
                            child.intensity = 0;
                        }
                    });

                    // Display Game Over Screen
                    player.ui.showGameOver();
                }
            }
        }
    }

    createCornerTable(x, y, z, rotationY) {
        const tableGroup = new THREE.Group();

        // Table top (smaller rectangle)
        const topGeo = new THREE.BoxGeometry(2.5, 0.2, 1.5);
        const top = new THREE.Mesh(topGeo, this.materials.wood);
        top.position.y = 1.6;
        tableGroup.add(top);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 1.6, 0.2);
        const l1 = new THREE.Mesh(legGeo, this.materials.wood); l1.position.set(-1.15, 0.8, -0.65);
        const l2 = new THREE.Mesh(legGeo, this.materials.wood); l2.position.set(1.15, 0.8, -0.65);
        const l3 = new THREE.Mesh(legGeo, this.materials.wood); l3.position.set(-1.15, 0.8, 0.65);
        const l4 = new THREE.Mesh(legGeo, this.materials.wood); l4.position.set(1.15, 0.8, 0.65);
        tableGroup.add(l1, l2, l3, l4);

        // Drawer Casing
        const caseGeo = new THREE.BoxGeometry(2.4, 0.4, 1.4);
        const casing = new THREE.Mesh(caseGeo, this.materials.wainscoting); // darker wood contrast
        casing.position.set(0, 1.3, 0);
        tableGroup.add(casing);



        // Drawers mapping (front faces)
        const drawGeo = new THREE.BoxGeometry(1.0, 0.3, 0.1);
        const drawMat = this.materials.wood;
        const handleGeo = new THREE.BoxGeometry(0.2, 0.05, 0.05);

        // Drawer 1 Group
        const drawer1 = new THREE.Group();
        const d1 = new THREE.Mesh(drawGeo, drawMat);
        const h1 = new THREE.Mesh(handleGeo, this.materials.metal);
        h1.position.z = 0.06;
        drawer1.add(d1, h1);
        drawer1.position.set(-0.6, 1.3, 0.72);
        tableGroup.add(drawer1);

        // Drawer 2 Group
        const drawer2 = new THREE.Group();
        const d2 = new THREE.Mesh(drawGeo, drawMat);
        const h2 = new THREE.Mesh(handleGeo, this.materials.metal);
        h2.position.z = 0.06;
        drawer2.add(d2, h2);
        drawer2.position.set(0.6, 1.3, 0.72);
        tableGroup.add(drawer2);

        tableGroup.position.set(x, y, z);
        tableGroup.rotation.y = rotationY;
        this.scene.add(tableGroup);

        const hitBox = this.createBox(2.5, 1.7, 1.5, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.85, z));
        hitBox.userData.animatableParts = [drawer1, drawer2];
        return hitBox;
    }

    createAestheticCupboard(x, y, z, rotationY) {
        const cbGroup = new THREE.Group();
        const W = 3.6, H = 2.2, D = 1.0;
        const t = 0.07;

        // --- Shell (5 sides, open front) ---
        const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), this.materials.wood);
        back.position.set(0, H / 2, -D / 2 + t / 2);
        cbGroup.add(back);

        const top = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), this.materials.wood);
        top.position.set(0, H - t / 2, 0);
        cbGroup.add(top);

        const btm = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), this.materials.wood);
        btm.position.set(0, t / 2, 0);
        cbGroup.add(btm);

        const sideL = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), this.materials.wood);
        sideL.position.set(-W / 2 + t / 2, H / 2, 0);
        cbGroup.add(sideL);

        const sideR = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), this.materials.wood);
        sideR.position.set(W / 2 - t / 2, H / 2, 0);
        cbGroup.add(sideR);

        // Crown moulding
        const crown = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.12, D + 0.08), this.materials.wainscoting);
        crown.position.set(0, H + 0.06, 0);
        cbGroup.add(crown);

        // Base plinth
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.15, D + 0.08), this.materials.wainscoting);
        plinth.position.set(0, 0.075, 0);
        cbGroup.add(plinth);

        // --- Interior ---
        const intMat = new THREE.MeshStandardMaterial({ color: 0x1a0d06, roughness: 1.0 });
        const intBack = new THREE.Mesh(new THREE.BoxGeometry(W - t * 2, H - t * 2, 0.02), intMat);
        intBack.position.set(0, H / 2, -D / 2 + t + 0.01);
        cbGroup.add(intBack);

        // Middle shelf
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - t * 2, t, D - t), this.materials.wainscoting);
        shelf.position.set(0, H * 0.5, 0);
        cbGroup.add(shelf);

        // A few items on the shelf — dusty bottles
        const bottleMat = new THREE.MeshStandardMaterial({ color: 0x1a3322, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.75 });
        [-1.1, -0.5, 0.2, 0.9].forEach(bx => {
            const bh = 0.25 + Math.random() * 0.15;
            const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, bh, 8), bottleMat);
            bottle.position.set(bx, H * 0.5 + t + bh / 2, -D / 2 + t + 0.12);
            cbGroup.add(bottle);
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.1, 8), bottleMat);
            neck.position.set(bx, H * 0.5 + t + bh + 0.04, -D / 2 + t + 0.12);
            cbGroup.add(neck);
        });

        // --- Doors (hinge pivot at outer edge) ---
        const doorW = W / 2 - t;
        const doorH = H - t * 2 - 0.02;
        const doorD = 0.06;

        const makeDoor = (side) => {
            const dGroup = new THREE.Group();

            const dMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, doorD), this.materials.wainscoting);
            dMesh.position.x = side * doorW / 2;
            dGroup.add(dMesh);

            // Raised panel inset
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a1208, roughness: 0.9 });
            const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.72, doorH * 0.78, 0.02), panelMat);
            panel.position.set(side * doorW / 2, 0, doorD / 2 + 0.01);
            dGroup.add(panel);

            // Brass knob handle
            const handleMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.9, roughness: 0.2 });
            const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), handleMat);
            knob.position.set(side * (doorW - 0.14), 0, doorD / 2 + 0.05);
            dGroup.add(knob);

            return dGroup;
        };

        const doorL = makeDoor(1);
        doorL.position.set(-W / 2 + t, H / 2, D / 2);
        cbGroup.add(doorL);

        const doorR = makeDoor(-1);
        doorR.position.set(W / 2 - t, H / 2, D / 2);
        cbGroup.add(doorR);

        cbGroup.position.set(x, y, z);
        cbGroup.rotation.y = rotationY;
        this.scene.add(cbGroup);

        const hitBox = this.createBox(W + 0.2, H + 0.2, D + 0.15, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + H / 2, z));
        hitBox.userData.animatableParts = [doorL, doorR];
        hitBox.userData.isDoubleDoor = true;
        return hitBox;
    }

    createSideCabinet(x, y, z, rotationY) {
        const cbGroup = new THREE.Group();
        const W = 1.4, H = 2.8, D = 0.9;
        const t = 0.07;

        // Shell
        const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), this.materials.wainscoting);
        back.position.set(0, H / 2, -D / 2 + t / 2);
        cbGroup.add(back);
        const top = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), this.materials.wainscoting);
        top.position.set(0, H - t / 2, 0);
        cbGroup.add(top);
        const btm = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), this.materials.wainscoting);
        btm.position.set(0, t / 2, 0);
        cbGroup.add(btm);
        const sL = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), this.materials.wainscoting);
        sL.position.set(-W / 2 + t / 2, H / 2, 0);
        cbGroup.add(sL);
        const sR = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), this.materials.wainscoting);
        sR.position.set(W / 2 - t / 2, H / 2, 0);
        cbGroup.add(sR);

        // Crown & plinth
        const crown = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.1, D + 0.06), this.materials.wood);
        crown.position.set(0, H + 0.05, 0);
        cbGroup.add(crown);
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.12, D + 0.06), this.materials.wood);
        plinth.position.set(0, 0.06, 0);
        cbGroup.add(plinth);

        // Interior back
        const intMat = new THREE.MeshStandardMaterial({ color: 0x120805, roughness: 1.0 });
        const intBack = new THREE.Mesh(new THREE.BoxGeometry(W - t * 2, H - t * 2, 0.02), intMat);
        intBack.position.set(0, H / 2, -D / 2 + t + 0.01);
        cbGroup.add(intBack);

        // Two interior shelves
        [H * 0.35, H * 0.65].forEach(sy => {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - t * 2, t, D - t), this.materials.wood);
            shelf.position.set(0, sy, 0);
            cbGroup.add(shelf);
        });

        // Single door (full height, hinge on left)
        const doorW = W - t * 2;
        const doorH = H - t * 2 - 0.02;
        const dGroup = new THREE.Group();

        const dMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), this.materials.wainscoting);
        dMesh.position.x = doorW / 2;
        dGroup.add(dMesh);

        // Two raised panels
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e0e05, roughness: 0.9 });
        [-doorH * 0.22, doorH * 0.22].forEach(py => {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.7, doorH * 0.38, 0.02), panelMat);
            panel.position.set(doorW / 2, py, 0.04);
            dGroup.add(panel);
        });

        // Brass knob
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.9, roughness: 0.2 });
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), handleMat);
        knob.position.set(doorW - 0.1, 0, 0.08);
        dGroup.add(knob);

        dGroup.position.set(-W / 2 + t, H / 2, D / 2);
        cbGroup.add(dGroup);

        cbGroup.position.set(x, y, z);
        cbGroup.rotation.y = rotationY;
        this.scene.add(cbGroup);

        // Single door uses animatableParts[0] = animatableParts[1] (same ref, opens once)
        const hitBox = this.createBox(W + 0.15, H + 0.15, D + 0.12, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + H / 2, z));
        hitBox.userData.animatableParts = [dGroup, dGroup];
        hitBox.userData.isDoubleDoor = false;
        hitBox.userData.isSingleDoor = true;
        return hitBox;
    }

    createWritingBureau(x, y, z, rotationY) {
        const bGroup = new THREE.Group();

        // Main body — tall upper cabinet + lower desk
        const bodyW = 2.6, bodyH = 3.8, bodyD = 0.85;
        const t = 0.07;

        // Lower desk surface
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(bodyW, t, bodyD), this.materials.wood);
        deskTop.position.set(0, 1.5, 0);
        bGroup.add(deskTop);

        // Desk legs
        const legGeo = new THREE.BoxGeometry(0.12, 1.5, 0.12);
        [[-bodyW / 2 + 0.1, -bodyD / 2 + 0.1], [-bodyW / 2 + 0.1, bodyD / 2 - 0.1],
         [bodyW / 2 - 0.1, -bodyD / 2 + 0.1], [bodyW / 2 - 0.1, bodyD / 2 - 0.1]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, this.materials.wainscoting);
            leg.position.set(lx, 0.75, lz);
            bGroup.add(leg);
        });

        // Upper cabinet shell (sits on desk)
        const ucW = bodyW, ucH = bodyH - 1.5 - t, ucD = bodyD;
        const ucBack = new THREE.Mesh(new THREE.BoxGeometry(ucW, ucH, t), this.materials.wood);
        ucBack.position.set(0, 1.5 + t + ucH / 2, -ucD / 2 + t / 2);
        bGroup.add(ucBack);
        const ucTop = new THREE.Mesh(new THREE.BoxGeometry(ucW, t, ucD), this.materials.wood);
        ucTop.position.set(0, 1.5 + t + ucH - t / 2, 0);
        bGroup.add(ucTop);
        const ucSL = new THREE.Mesh(new THREE.BoxGeometry(t, ucH, ucD), this.materials.wood);
        ucSL.position.set(-ucW / 2 + t / 2, 1.5 + t + ucH / 2, 0);
        bGroup.add(ucSL);
        const ucSR = new THREE.Mesh(new THREE.BoxGeometry(t, ucH, ucD), this.materials.wood);
        ucSR.position.set(ucW / 2 - t / 2, 1.5 + t + ucH / 2, 0);
        bGroup.add(ucSR);

        // Interior of upper cabinet
        const intMat = new THREE.MeshStandardMaterial({ color: 0x0d0603, roughness: 1.0 });
        const intBack = new THREE.Mesh(new THREE.BoxGeometry(ucW - t * 2, ucH - t, 0.02), intMat);
        intBack.position.set(0, 1.5 + t + ucH / 2, -ucD / 2 + t + 0.01);
        bGroup.add(intBack);

        // Shelf inside upper cabinet
        const ucShelf = new THREE.Mesh(new THREE.BoxGeometry(ucW - t * 2, t, ucD - t), this.materials.wainscoting);
        ucShelf.position.set(0, 1.5 + t + ucH * 0.5, 0);
        bGroup.add(ucShelf);

        // Crown moulding on top
        const crown = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.1, 0.1, bodyD + 0.06), this.materials.wainscoting);
        crown.position.set(0, bodyH + 0.05, 0);
        bGroup.add(crown);

        // A quill pen and inkwell on the desk surface
        const inkMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.5, metalness: 0.3 });
        const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), inkMat);
        inkwell.position.set(0.8, 1.5 + t + 0.05, 0.1);
        bGroup.add(inkwell);

        // Upper cabinet doors (double)
        const doorW = ucW / 2 - t;
        const doorH = ucH - t * 2 - 0.02;

        const makeDoor = (side) => {
            const dg = new THREE.Group();
            const dm = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), this.materials.wainscoting);
            dm.position.x = side * doorW / 2;
            dg.add(dm);
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e0e05, roughness: 0.9 });
            const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.7, doorH * 0.75, 0.02), panelMat);
            panel.position.set(side * doorW / 2, 0, 0.04);
            dg.add(panel);
            const handleMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.9, roughness: 0.2 });
            const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), handleMat);
            knob.position.set(side * (doorW - 0.12), 0, 0.065);
            dg.add(knob);
            return dg;
        };

        const doorL = makeDoor(1);
        doorL.position.set(-ucW / 2 + t, 1.5 + t + ucH / 2, ucD / 2);
        bGroup.add(doorL);

        const doorR = makeDoor(-1);
        doorR.position.set(ucW / 2 - t, 1.5 + t + ucH / 2, ucD / 2);
        bGroup.add(doorR);

        // Desk drawer
        const drawerGroup = new THREE.Group();
        const drawerMesh = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.6, 0.22, 0.06), this.materials.wainscoting);
        const drawerHandle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), this.materials.metal);
        drawerHandle.position.z = 0.05;
        drawerGroup.add(drawerMesh, drawerHandle);
        drawerGroup.position.set(0, 1.38, bodyD / 2);
        bGroup.add(drawerGroup);

        bGroup.position.set(x, y, z);
        bGroup.rotation.y = rotationY;
        this.scene.add(bGroup);

        const hitBox = this.createBox(bodyW + 0.15, bodyH + 0.15, bodyD + 0.12, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + bodyH / 2, z));
        hitBox.userData.animatableParts = [doorL, doorR];
        hitBox.userData.isDoubleDoor = true;
        return hitBox;
    }

    createChaiseLongue(x, y, z, rotationY) {
        const cGroup = new THREE.Group();
        const fabricMat = new THREE.MeshStandardMaterial({ color: 0x3b1a1a, roughness: 0.9 });
        const woodMat = this.materials.wainscoting;

        // Base/seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 1.1), fabricMat);
        seat.position.set(0, 0.45, 0);
        cGroup.add(seat);

        // Cushion on seat
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.95), new THREE.MeshStandardMaterial({ color: 0x5c2222, roughness: 1.0 }));
        cushion.position.set(0, 0.67, 0);
        cGroup.add(cushion);

        // Raised backrest (one long side)
        const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.25), fabricMat);
        back.position.set(0, 0.9, -0.45);
        back.rotation.x = -0.15;
        cGroup.add(back);

        // Raised head-end armrest
        const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 1.1), fabricMat);
        headRest.position.set(-1.5, 0.8, 0);
        cGroup.add(headRest);

        // Low foot-end
        const footEnd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 1.1), woodMat);
        footEnd.position.set(1.5, 0.45, 0);
        cGroup.add(footEnd);

        // Cabriole legs (4 short turned legs)
        const legGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.35, 8);
        [[-1.4, -0.45], [-1.4, 0.45], [1.4, -0.45], [1.4, 0.45]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, woodMat);
            leg.position.set(lx, 0.17, lz);
            cGroup.add(leg);
        });

        cGroup.position.set(x, y, z);
        cGroup.rotation.y = rotationY;
        this.scene.add(cGroup);

        // No searchable drawers — just a collider
        const hitBox = this.createBox(3.4, 1.0, 1.3, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.5, z));
        return hitBox;
    }

    createBoardedWindow(x, y, z, rotationY) {
        const winGroup = new THREE.Group();

        // Recessed frame (dark)
        const frameGeo = new THREE.BoxGeometry(2, 3, 0.1);
        const frame = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: 0x050505 })); // Black hole
        winGroup.add(frame);

        // Window casing
        const casingTopGeo = new THREE.BoxGeometry(2.4, 0.2, 0.2);
        const cTop = new THREE.Mesh(casingTopGeo, this.materials.wood);
        cTop.position.set(0, 1.6, 0.05);
        winGroup.add(cTop);
        const cBot = new THREE.Mesh(casingTopGeo, this.materials.wood);
        cBot.position.set(0, -1.6, 0.05);
        winGroup.add(cBot);

        const casingSideGeo = new THREE.BoxGeometry(0.2, 3.4, 0.2);
        const cL = new THREE.Mesh(casingSideGeo, this.materials.wood);
        cL.position.set(-1.1, 0, 0.05);
        winGroup.add(cL);
        const cR = new THREE.Mesh(casingSideGeo, this.materials.wood);
        cR.position.set(1.1, 0, 0.05);
        winGroup.add(cR);

        // Wooden Boards
        const boardGeo = new THREE.BoxGeometry(2.2, 0.4, 0.1);
        for (let i = -1.0; i <= 1.0; i += 0.6) {
            const board = new THREE.Mesh(boardGeo, this.materials.wainscoting); // Use lighter/rougher wood
            board.position.set(
                (Math.random() - 0.5) * 0.1,
                i + (Math.random() - 0.5) * 0.2,
                0.15 + Math.random() * 0.05
            );
            board.rotation.z = (Math.random() - 0.5) * 0.1;
            winGroup.add(board);
        }

        winGroup.position.set(x, y, z);
        winGroup.rotation.y = rotationY;
        this.scene.add(winGroup);
    }

    createBookshelf(x, y, z, rotationY) {
        const shelfGroup = new THREE.Group();

        // Main body
        const bodyGeo = new THREE.BoxGeometry(3, 5, 1);
        const body = new THREE.Mesh(bodyGeo, this.materials.wood);
        body.position.y = 2.5;
        shelfGroup.add(body);

        // Shelves
        const shelfGeo = new THREE.BoxGeometry(2.8, 0.1, 0.8);
        const shelfMat = this.materials.wood;
        for (let i = 0; i < 4; i++) {
            const shelf = new THREE.Mesh(shelfGeo, shelfMat);
            shelf.position.y = 1.0 + i * 1.0;
            shelfGroup.add(shelf);
        }

        shelfGroup.position.set(x, y, z);
        shelfGroup.rotation.y = rotationY;
        this.scene.add(shelfGroup);

        const hitBox = this.createBox(3, 5, 1, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 2.5, z));
        return hitBox;
    }

    createLantern(x, y, z, color, intensity) {
        const lanternGroup = new THREE.Group();

        // Base
        const baseGeo = new THREE.BoxGeometry(0.4, 0.1, 0.4);
        const base = new THREE.Mesh(baseGeo, this.materials.metal);
        lanternGroup.add(base);

        // Glass housing
        const glassGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xffddaa,
            emissive: color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.y = 0.25;
        lanternGroup.add(glass);

        // Top lid
        const topGeo = new THREE.ConeGeometry(0.25, 0.3, 4);
        const top = new THREE.Mesh(topGeo, this.materials.metal);
        top.position.y = 0.6;
        lanternGroup.add(top);

        // Light
        const light = new THREE.PointLight(color, intensity, 10);
        light.position.y = 0.25;
        lanternGroup.add(light);

        lanternGroup.position.set(x, y, z);
        this.scene.add(lanternGroup);

        const hitBox = this.createBox(0.5, 0.8, 0.5, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.4, z));
        return hitBox;
    }

    decorateVictorianDoor(doorMesh) {
        const mat = this.materials.wood; // Detailed wood grain

        // Panel offsets to prevent z-fighting (door is 0.5 thick, faces are at +/- 0.25)
}

createChaiseLongue(x, y, z, rotationY) {
const cGroup = new THREE.Group();
const fabricMat = new THREE.MeshStandardMaterial({ color: 0x3b1a1a, roughness: 0.9 });
const woodMat = this.materials.wainscoting;

// Base/seat
const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 1.1), fabricMat);
seat.position.set(0, 0.45, 0);
cGroup.add(seat);

// Cushion on seat
const cushion = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.95), new THREE.MeshStandardMaterial({ color: 0x5c2222, roughness: 1.0 }));
cushion.position.set(0, 0.67, 0);
cGroup.add(cushion);

// Raised backrest (one long side)
const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.25), fabricMat);
back.position.set(0, 0.9, -0.45);
back.rotation.x = -0.15;
cGroup.add(back);

// Raised head-end armrest
const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 1.1), fabricMat);
headRest.position.set(-1.5, 0.8, 0);
cGroup.add(headRest);

// Low foot-end
const footEnd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 1.1), woodMat);
footEnd.position.set(1.5, 0.45, 0);
cGroup.add(footEnd);

// Cabriole legs (4 short turned legs)
const legGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.35, 8);
[[ -1.4, -0.45 ], [ -1.4, 0.45 ], [ 1.4, -0.45 ], [ 1.4, 0.45 ]].forEach(([ lx, lz ]) => {
const leg = new THREE.Mesh(legGeo, woodMat);
leg.position.set(lx, 0.17, lz);
cGroup.add(leg);
});

cGroup.position.set(x, y, z);
cGroup.rotation.y = rotationY;
this.scene.add(cGroup);

// No searchable drawers — just a collider
const hitBox = this.createBox(3.4, 1.0, 1.3, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.5, z));
return hitBox;
}

createBoardedWindow(x, y, z, rotationY) {
const winGroup = new THREE.Group();

// Recessed frame (dark)
const frameGeo = new THREE.BoxGeometry(2, 3, 0.1);
const frame = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: 0x050505 })); // Black hole
winGroup.add(frame);

// Window casing
const casingTopGeo = new THREE.BoxGeometry(2.4, 0.2, 0.2);
const cTop = new THREE.Mesh(casingTopGeo, this.materials.wood);
cTop.position.set(0, 1.6, 0.05);
winGroup.add(cTop);
const cBot = new THREE.Mesh(casingTopGeo, this.materials.wood);
cBot.position.set(0, -1.6, 0.05);
winGroup.add(cBot);

const casingSideGeo = new THREE.BoxGeometry(0.2, 3.4, 0.2);
const cL = new THREE.Mesh(casingSideGeo, this.materials.wood);
cL.position.set(-1.1, 0, 0.05);
winGroup.add(cL);
const cR = new THREE.Mesh(casingSideGeo, this.materials.wood);
cR.position.set(1.1, 0, 0.05);
winGroup.add(cR);

// Wooden Boards
const boardGeo = new THREE.BoxGeometry(2.2, 0.4, 0.1);
for (let i = -1.0; i <= 1.0; i += 0.6) {
const board = new THREE.Mesh(boardGeo, this.materials.wainscoting); // Use lighter/rougher wood
board.position.set(
(Math.random() - 0.5) * 0.1,
i + (Math.random() - 0.5) * 0.2,
0.15 + Math.random() * 0.05
);
board.rotation.z = (Math.random() - 0.5) * 0.1;
winGroup.add(board);
}

winGroup.position.set(x, y, z);
winGroup.rotation.y = rotationY;
this.scene.add(winGroup);
}

createBookshelf(x, y, z, rotationY) {
const shelfGroup = new THREE.Group();

// Main body
const bodyGeo = new THREE.BoxGeometry(3, 5, 1);
const body = new THREE.Mesh(bodyGeo, this.materials.wood);
body.position.y = 2.5;
shelfGroup.add(body);

// Shelves
const shelfGeo = new THREE.BoxGeometry(2.8, 0.1, 0.8);
const shelfMat = this.materials.wood;
for (let i = 0; i < 4; i++) {
const shelf = new THREE.Mesh(shelfGeo, shelfMat);
shelf.position.y = 1.0 + i * 1.0;
shelfGroup.add(shelf);
}

shelfGroup.position.set(x, y, z);
shelfGroup.rotation.y = rotationY;
this.scene.add(shelfGroup);

const hitBox = this.createBox(3, 5, 1, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 2.5, z));
return hitBox;
}

createLantern(x, y, z, color, intensity) {
const lanternGroup = new THREE.Group();

// Base
const baseGeo = new THREE.CylinderGeometry(0.3, 0.1, 0.5);
const base = new THREE.Mesh(baseGeo, this.materials.metal);
base.position.set(0, -0.6, 0);
lanternGroup.add(base);

// Top Panel
const topGeo = new THREE.BoxGeometry(0.5, 0.5, 2.0);
const top = new THREE.Mesh(topGeo, this.materials.metal);
top.position.set(0, 0.6, 0);
lanternGroup.add(top);

// Brass Doorknob
const knobGeo = new THREE.SphereGeometry(0.08, 16, 16);
const knob = new THREE.Mesh(knobGeo, this.materials.metal);
knob.position.set(0, 0.6, 0);
lanternGroup.add(knob);

// Light
const light = new THREE.PointLight(color, intensity, 15);
light.position.set(0, 0, 0);
light.castShadow = true;
lanternGroup.add(light);

lanternGroup.position.set(x, y, z);
this.scene.add(lanternGroup);

const hitBox = this.createBox(0.5, 0.8, 0.5, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 0.4, z));
return hitBox;
}

decorateVictorianDoor(doorMesh) {
const mat = this.materials.wood; // Detailed wood grain

// Panel offsets to prevent z-fighting (door is 0.5 thick, faces are at +/- 0.25)
const addPanelsForFace = (offsetX) => {
const pThickness = 0.05;

// Top Panel
const topGeo = new THREE.BoxGeometry(pThickness, 0.5, 2.0);
const top = new THREE.Mesh(topGeo, mat);
top.position.set(offsetX, 1.0, 0);

// Middle Panel
const midGeo = new THREE.BoxGeometry(pThickness, 1.3, 2.0);
const mid = new THREE.Mesh(midGeo, mat);
mid.position.set(offsetX, -0.1, 0);

// Bottom Panel
const botGeo = new THREE.BoxGeometry(pThickness, 0.5, 2.0);
const bot = new THREE.Mesh(botGeo, mat);
bot.position.set(offsetX, -1.2, 0);

// Brass Doorknob
const knobGeo = new THREE.SphereGeometry(0.08, 16, 16);
const knob = new THREE.Mesh(knobGeo, this.materials.metal);
const zOffset = (offsetX > 0) ? -1.0 : 1.0;
knob.position.set(offsetX > 0 ? offsetX + 0.05 : offsetX - 0.05, -0.1, zOffset);

doorMesh.add(top, mid, bot, knob);
};

addPanelsForFace(0.26); // Outside face
addPanelsForFace(-0.26); // Inside face
}
}
