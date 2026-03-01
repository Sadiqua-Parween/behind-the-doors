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
        this.exitDoor.userData = { id: 'exit_door_locked', interactable: true, prompt: "Locked Exit Door", dialogue: "It's locked tight. Is there a key in here?" };
        this.scene.add(this.exitDoor);
        this.colliders.push(this.exitDoor);

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
        note1.userData = { id: 'note_1', interactable: true, prompt: "Bloody Note", dialogue: "Subject seems to have escaped confinement..." };
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

        // Determine random key location
        const hidingSpots = ['table', 'cupboard'];
        this.keyLocation = hidingSpots[Math.floor(Math.random() * hidingSpots.length)];
        console.log("Key hidden in:", this.keyLocation); // For debugging

        // Add Escape Room Furniture

        // Victorian Red Carpet
        const carpetGeo = new THREE.BoxGeometry(12, 0.05, 10);
        const carpetMat = new THREE.MeshStandardMaterial({ color: 0x660000, roughness: 0.9, bumpMap: this.resources.textures.wood, bumpScale: 0.02 }); // Simple pattern
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.position.set(roomCenter, 0.025, 0); // Center of room, barely above floor
        this.scene.add(carpet);

        // NW Corner: Small Table with Drawers
        const table = this.createCornerTable(23, 0, -8, 0);
        table.userData = { id: 'table', interactable: true, prompt: "Search Drawers", hasKey: this.keyLocation === 'table' };
        this.colliders.push(table);

        // South Wall: Aesthetic Cupboard and Bookshelf
        const cupboard = this.createAestheticCupboard(30, 0, 9, Math.PI);
        cupboard.userData = { id: 'cupboard', interactable: true, prompt: "Search Cupboard", hasKey: this.keyLocation === 'cupboard' };
        this.colliders.push(cupboard);

        const bookshelf = this.createVictorianBookshelf(23, 0, 9, Math.PI);
        bookshelf.userData = { id: 'bookshelf', interactable: true, prompt: "Search Bookshelf", hasKey: false };
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

        const bodyGeo = new THREE.BoxGeometry(3, 5, 1.5);
        const body = new THREE.Mesh(bodyGeo, this.materials.wardrobeWood);
        body.position.y = 2.5;
        dropGroup.add(body);

        dropGroup.position.set(x, y, z);
        dropGroup.rotation.y = rotationY;
        this.scene.add(dropGroup);

        const hitBox = this.createBox(3, 5, 1.5, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 2.5, z));
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

            // Force dialogue
            player.ui.showDialogue([
                "<span style='color:red; font-size: 2em'>*SLAM*</span>",
                "The door just slammed shut behind me!",
                "I'm trapped... I need to find another way out of here."
            ]);
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

        // Main body frame (hollowed out front, scaled down)
        const frameGeo = new THREE.BoxGeometry(3.6, 2.0, 1.0);
        const frame = new THREE.Mesh(frameGeo, this.materials.wood);
        frame.position.y = 1.0;
        frame.position.z = -0.05;
        cbGroup.add(frame);

        // Cupboard Doors
        const doorGeo = new THREE.BoxGeometry(1.7, 1.9, 0.1);
        const handleGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);

        // Left Door (hinge on left)
        const doorL = new THREE.Group();
        const meshL = new THREE.Mesh(doorGeo, this.materials.wainscoting);
        meshL.position.x = 0.85; // Shift mesh right from hinge
        const h1 = new THREE.Mesh(handleGeo, this.materials.metal);
        h1.position.set(1.5, 0, 0.1); // Handle near right edge
        doorL.add(meshL, h1);
        doorL.position.set(-1.75, 1.0, 0.45); // Hinge position
        cbGroup.add(doorL);

        // Right Door (hinge on right)
        const doorR = new THREE.Group();
        const meshR = new THREE.Mesh(doorGeo, this.materials.wainscoting);
        meshR.position.x = -0.85; // Shift mesh left from hinge
        const h2 = new THREE.Mesh(handleGeo, this.materials.metal);
        h2.position.set(-1.5, 0, 0.1); // Handle near left edge
        doorR.add(meshR, h2);
        doorR.position.set(1.75, 1.0, 0.45); // Hinge position
        cbGroup.add(doorR);

        cbGroup.position.set(x, y, z);
        cbGroup.rotation.y = rotationY;
        this.scene.add(cbGroup);

        const hitBox = this.createBox(3.8, 2.1, 1.1, new THREE.MeshBasicMaterial({ visible: false }), new THREE.Vector3(x, y + 1.0, z));
        hitBox.userData.animatableParts = [doorL, doorR];
        hitBox.userData.isDoubleDoor = true;
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
