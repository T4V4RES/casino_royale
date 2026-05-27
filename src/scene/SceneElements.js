import * as THREE from 'three';
import { createFabricTexture, createSkinTexture } from './ProceduralTextures.js';

/* ==================================================================
   TABLE – Casino green felt with wood trim
   ================================================================== */
export function createTable() {
    const group = new THREE.Group();

    // Felt surface (elliptical for poker)
    const feltGeo = new THREE.CylinderGeometry(4.2, 4.2, 0.18, 64);
    const feltMat = new THREE.MeshStandardMaterial({
        color: 0x1B5E20, roughness: 0.85, metalness: 0.0,
    });
    const felt = new THREE.Mesh(feltGeo, feltMat);
    felt.receiveShadow = true;
    felt.position.y = -0.09;
    group.add(felt);

    // Wood rim
    const rimGeo = new THREE.TorusGeometry(4.2, 0.15, 12, 64);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.4, metalness: 0.15 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.0;
    rim.castShadow = true;
    group.add(rim);

    // Inner felt pad (slightly lighter)
    const padGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.01, 64);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.92, metalness: 0 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.receiveShadow = true;
    pad.position.y = 0.005;
    group.add(pad);

    // Betting circles
    const circMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.7, metalness: 0.3, transparent: true, opacity: 0.25 });
    [[0, 2.4], [-1.8, 1.5], [1.8, 1.5]].forEach(([x, z]) => {
        const cg = new THREE.RingGeometry(0.32, 0.38, 32);
        const circ = new THREE.Mesh(cg, circMat);
        circ.rotation.x = -Math.PI / 2;
        circ.position.set(x, 0.01, z);
        group.add(circ);
    });

    return group;
}

/* ==================================================================
   CHIP MESH – Detailed casino chip
   ================================================================== */
export function createChipMesh(value = 10, x = 0, y = 0, z = 0) {
    const chipGroup = new THREE.Group();
    const COLORS = {
        1: 0xEEEEEE,
        5: 0xE53935,
        10: 0x1E88E5,
        25: 0x43A047,
        50: 0xFF8F00,
        100: 0x1A1A1A,
        500: 0x8E24AA,
    };
    const color = COLORS[value] || 0x1E88E5;

    // Main cylinder
    const cGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24);
    const cMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 });
    const chip = new THREE.Mesh(cGeo, cMat);
    chip.castShadow = true;
    chipGroup.add(chip);

    // Top inlay (lighter)
    const inGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.005, 24);
    const inMat = new THREE.MeshStandardMaterial({ color: 0xFFF8E1, roughness: 0.5, metalness: 0.1 });
    const inlay = new THREE.Mesh(inGeo, inMat);
    inlay.position.y = 0.031;
    chipGroup.add(inlay);

    // Edge notches
    const notchMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4, metalness: 0.2 });
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const nGeo = new THREE.BoxGeometry(0.025, 0.06, 0.06);
        const notch = new THREE.Mesh(nGeo, notchMat);
        notch.position.set(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17);
        notch.rotation.y = a;
        chipGroup.add(notch);
    }

    chipGroup.position.set(x, y, z);
    return chipGroup;
}

/* ==================================================================
   CHIP STACK – A stack of chips representing a $ amount
   ================================================================== */
export function createChipStack(amount, x = 0, z = 0) {
    const group = new THREE.Group();
    const denominations = [500, 100, 50, 25, 10, 5, 1];
    let remaining = amount;
    let stackY = 0.03;

    for (const denom of denominations) {
        const count = Math.floor(remaining / denom);
        remaining -= count * denom;
        for (let i = 0; i < Math.min(count, 8); i++) {
            const chip = createChipMesh(denom, 0, stackY, 0);
            stackY += 0.065;
            group.add(chip);
        }
    }

    group.position.set(x, 0, z);
    return group;
}

/* ==================================================================
   LIGHTING – main spot + accent lighting
   ================================================================== */
export function setupLighting(scene) {
    // Ambient
    const amb = new THREE.AmbientLight(0xFFF8E1, 0.35);
    scene.add(amb);

    // Main overhead spot (key light)
    const spot = new THREE.SpotLight(0xFFF5CC, 40, 18, Math.PI / 4, 0.5, 1.5);
    spot.position.set(0, 9, 0);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.camera.near = 3;
    spot.shadow.camera.far = 15;
    spot.shadow.bias = -0.0002;
    scene.add(spot);
    scene.add(spot.target);

    // Pendant lamp model
    const lampGeo = new THREE.ConeGeometry(1.2, 0.6, 8, 1, true);
    const lampMat = new THREE.MeshStandardMaterial({
        color: 0x2E7D32, roughness: 0.35, metalness: 0.6,
        side: THREE.DoubleSide
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(0, 8.0, 0);
    lamp.castShadow = true;
    scene.add(lamp);

    // Inner reflective surface
    const innerGeo = new THREE.ConeGeometry(1.18, 0.58, 8, 1, true);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xFFF8E1, roughness: 0.8, metalness: 0.1, side: THREE.BackSide });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.copy(lamp.position);
    scene.add(inner);

    // Cable
    const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, 3, 8);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(0, 9.5, 0);
    scene.add(cable);

    // Warm fill lights
    const fill1 = new THREE.PointLight(0xFFA726, 3, 12);
    fill1.position.set(-5, 4, -3);
    scene.add(fill1);

    const fill2 = new THREE.PointLight(0xFFA726, 3, 12);
    fill2.position.set(5, 4, 3);
    scene.add(fill2);

    return { spot, fill1, fill2 };
}

/* ==================================================================
   ROOM – floor, walls, ceiling
   ================================================================== */
export function createRoom(scene) {
    const S = 22, WH = 12;

    // Floor (dark wood)
    const floorGeo = new THREE.PlaneGeometry(S, S);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.75, metalness: 0.05 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls – 4 sides
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4A2828, roughness: 0.7, metalness: 0.05, side: THREE.BackSide });
    const wallGeo = new THREE.PlaneGeometry(S, WH);

    const positions = [
        { pos: [0, WH / 2 - 0.2, -S / 2], rot: [0, 0, 0] },
        { pos: [0, WH / 2 - 0.2, S / 2], rot: [0, Math.PI, 0] },
        { pos: [-S / 2, WH / 2 - 0.2, 0], rot: [0, Math.PI / 2, 0] },
        { pos: [S / 2, WH / 2 - 0.2, 0], rot: [0, -Math.PI / 2, 0] },
    ];

    positions.forEach(({ pos, rot }) => {
        const w = new THREE.Mesh(wallGeo, wallMat);
        w.position.set(...pos);
        w.rotation.set(...rot);
        scene.add(w);
    });

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(S, S);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2C2C2C, roughness: 0.9 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = WH - 0.2;
    scene.add(ceil);

    // Wall sconces for ambiance
    const sconcePositions = [
        [-S / 2 + 0.3, 4, -4], [-S / 2 + 0.3, 4, 4],
        [S / 2 - 0.3, 4, -4], [S / 2 - 0.3, 4, 4],
    ];
    sconcePositions.forEach(pos => {
        const sconce = new THREE.PointLight(0xFFCC80, 1.5, 8);
        sconce.position.set(...pos);
        scene.add(sconce);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xFFE082, emissive: 0xFFCC80, emissiveIntensity: 2 }));
        bulb.position.set(...pos);
        scene.add(bulb);
    });
}

/* ==================================================================
   3D CHARACTER – highly realistic procedural humanoid
   Uses MeshPhysicalMaterial for skin/cloth realism
   ================================================================== */

const SKIN_TONES = {
    'dealer': 0xDEB887,
    'alice':  0xFFDBC4,
    'bruno':  0xC68642,
    'clara':  0xF1C27D,
    'jogador': 0xFFCC99,
};

function _getSkinTone(name) {
    const n = name.toLowerCase();
    for (const [k, v] of Object.entries(SKIN_TONES)) {
        if (n.includes(k)) return v;
    }
    return 0xFFCC99;
}

/* Re-parent every head/face mesh (everything above the neck, y >= faceMinY)
   into a single pivot Group placed at the neck base. Rotating the bald head
   sphere on its own is invisible — a sphere looks identical when rotated, and
   the face/hair are separate sibling meshes that would be left behind — so the
   head reactions (nod/shake/think/...) and the idle head-sway never read on
   screen. After this, _findPart('head') returns the pivot and rotating it
   moves the whole head (skull + hair + face) together about the neck. */
function _attachHeadPivot(group, pivotY, faceMinY = 1.46) {
    const headGroup = new THREE.Group();
    headGroup.position.set(0, pivotY, -0.01);
    group.add(headGroup);
    group.updateMatrixWorld(true);
    group.children
        .filter(child => child !== headGroup && child.position.y >= faceMinY)
        .forEach(child => headGroup.attach(child));
    headGroup.userData.part = 'head';
    return headGroup;
}

function _createCleanCharacter(name, color = 0x3949AB, seatPosition = [0, 0, 0], lookAt = [0, 0, 0]) {
    const group = new THREE.Group();
    const n = name.toLowerCase();
    const skinColor = _getSkinTone(name);
    const isDealer = n.includes('dealer') || n.includes('croupier');
    const isFemale = n.includes('alice') || n.includes('clara');

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.78, metalness: 0 });
    const suitColor = isDealer ? 0x2A1716 : color;
    const jacketMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.74, metalness: 0.02 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xF5EFE4, roughness: 0.7, metalness: 0 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: isDealer ? 0x141014 : 0x161616, roughness: 0.78, metalness: 0.01 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.58, metalness: 0.03 });
    const hairMat = new THREE.MeshStandardMaterial({
        color: n.includes('bruno') ? 0x15100D : n.includes('clara') ? 0x8B2E16 : 0x3E2418,
        roughness: 0.86,
        metalness: 0,
    });
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x2A1A16, roughness: 0.82, metalness: 0 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC9A23A, roughness: 0.3, metalness: 0.55 });

    const capsuleBetween = (a, b, radius, mat, segments = 12) => {
        const start = new THREE.Vector3(...a);
        const end = new THREE.Vector3(...b);
        const dir = end.clone().sub(start);
        const distance = dir.length();
        const mesh = new THREE.Mesh(
            new THREE.CapsuleGeometry(radius, Math.max(0.01, distance - radius * 2), 6, segments),
            mat
        );
        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    const addSphere = (pos, radius, mat, scale = [1, 1, 1]) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), mat);
        mesh.position.set(...pos);
        mesh.scale.set(...scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };

    const torso = addSphere([0, 1.03, 0], 0.31, jacketMat, [0.72, 1.48, 0.50]);
    torso.userData.part = 'torso';
    const chest = addSphere([0, 1.18, 0.005], 0.22, jacketMat, [1.02, 0.72, 0.56]);
    chest.userData.part = 'chest';
    const waist = addSphere([0, 0.67, 0], 0.205, jacketMat, [0.82, 0.45, 0.55]);
    waist.userData.part = 'waist';
    const shoulderBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.074, 0.37, 6, 16), jacketMat);
    shoulderBridge.position.set(0, 1.235, 0.0);
    shoulderBridge.rotation.z = Math.PI / 2;
    shoulderBridge.scale.set(1, 0.95, 0.78);
    shoulderBridge.castShadow = true;
    shoulderBridge.receiveShadow = true;
    shoulderBridge.userData.part = 'shoulderBridge';
    group.add(shoulderBridge);
    const neck = capsuleBetween([0, 1.33, -0.005], [0, 1.45, -0.005], 0.056, skinMat, 12);
    neck.userData.part = 'neck';
    const head = addSphere([0, 1.60, -0.018], 0.185, skinMat, [0.88, 1.03, 0.86]);
    head.userData.part = 'skull';
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.192, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), hairMat);
    hair.position.set(0, 1.675, -0.03);
    hair.scale.set(0.96, 0.68, 0.94);
    hair.castShadow = true;
    hair.userData.part = 'hairCap';
    group.add(hair);
    const backHair = addSphere([0, 1.60, -0.122], 0.118, hairMat, [0.88, 0.9, 0.48]);
    backHair.userData.part = 'backHair';
    [-1, 1].forEach(s => {
        const sideHair = addSphere([s * 0.15, 1.585, -0.035], 0.072, hairMat, [0.5, 1.15, 0.55]);
        sideHair.userData.part = s < 0 ? 'leftSideHair' : 'rightSideHair';
    });
    if (isFemale) {
        [-1, 1].forEach(s => capsuleBetween([s * 0.135, 1.56, -0.045], [s * 0.15, 1.30, -0.06], 0.042, hairMat, 10));
    }

    [-1, 1].forEach(s => {
        addSphere([s * 0.055, 1.62, 0.145], 0.014, detailMat, [1, 0.62, 0.35]);
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.006, 0.008), hairMat);
        brow.position.set(s * 0.055, 1.658, 0.145);
        brow.rotation.z = s * -0.12;
        group.add(brow);
        addSphere([s * 0.09, 1.565, 0.127], 0.021, skinMat, [1.1, 0.52, 0.36]);
    });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.062, 10), skinMat);
    nose.position.set(0, 1.585, 0.162);
    nose.rotation.x = Math.PI / 2;
    group.add(nose);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.007, 0.006),
        new THREE.MeshStandardMaterial({ color: 0x6B332E, roughness: 0.8 }));
    mouth.position.set(0, 1.525, 0.150);
    group.add(mouth);

    if (isDealer) {
        const bow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.038, 0.022),
            new THREE.MeshStandardMaterial({ color: 0xB71C1C, roughness: 0.38 }));
        bow.position.set(0, 1.32, 0.21);
        group.add(bow);
        const capTrim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.004, 6, 28), goldMat);
        capTrim.position.set(0, 1.67, -0.012);
        capTrim.scale.set(1.0, 0.28, 0.18);
        capTrim.rotation.x = Math.PI / 2;
        capTrim.castShadow = true;
        group.add(capTrim);
    }

    [-1, 1].forEach(s => {
        const side = s < 0 ? 'left' : 'right';
        const shoulder = addSphere([s * 0.205, 1.215, 0.008], 0.082, jacketMat, [1.26, 0.84, 0.9]);
        shoulder.userData.part = `${side}Shoulder`;
        shoulder.userData.side = side;
        const shoulderJoin = capsuleBetween([s * 0.10, 1.205, 0.004], [s * 0.235, 1.17, 0.006], 0.047, jacketMat, 12);
        shoulderJoin.userData.part = `${side}ShoulderJoin`;
        shoulderJoin.userData.side = side;
        const upperArm = capsuleBetween([s * 0.235, 1.16, 0.01], [s * 0.265, 0.80, 0.032], 0.055, jacketMat, 14);
        upperArm.userData.part = `${side}UpperArm`;
        upperArm.userData.side = side;
        const elbow = addSphere([s * 0.265, 0.80, 0.032], 0.052, jacketMat, [0.95, 0.95, 0.95]);
        elbow.userData.part = `${side}Elbow`;
        elbow.userData.side = side;
        const forearm = capsuleBetween([s * 0.265, 0.80, 0.032], [s * 0.255, 0.54, 0.055], 0.049, jacketMat, 14);
        forearm.userData.part = `${side}Forearm`;
        forearm.userData.side = side;
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.041, 0.042, 14), shirtMat);
        cuff.position.set(s * 0.255, 0.515, 0.058);
        cuff.rotation.z = s * 0.05;
        cuff.castShadow = true;
        cuff.userData.part = `${side}Cuff`;
        cuff.userData.side = side;
        group.add(cuff);
        const hand = addSphere([s * 0.252, 0.42, 0.076], 0.05, skinMat, [0.85, 1.08, 0.68]);
        hand.userData.part = `${side}Hand`;
        hand.userData.side = side;

        const hipJoin = addSphere([s * 0.085, 0.64, 0.0], 0.065, trouserMat, [1.05, 0.78, 0.88]);
        hipJoin.userData.part = `${side}Hip`;
        hipJoin.userData.side = side;
        const thigh = capsuleBetween([s * 0.09, 0.62, 0.0], [s * 0.105, 0.34, 0.01], 0.058, trouserMat, 14);
        thigh.userData.part = `${side}Thigh`;
        thigh.userData.side = side;
        const knee = addSphere([s * 0.105, 0.33, 0.01], 0.054, trouserMat, [0.95, 0.9, 0.95]);
        knee.userData.part = `${side}Knee`;
        knee.userData.side = side;
        const shin = capsuleBetween([s * 0.105, 0.33, 0.01], [s * 0.095, 0.09, 0.035], 0.051, trouserMat, 14);
        shin.userData.part = `${side}Shin`;
        shin.userData.side = side;
        const ankle = addSphere([s * 0.095, 0.08, 0.045], 0.044, trouserMat, [0.82, 0.68, 0.82]);
        ankle.userData.part = `${side}Ankle`;
        ankle.userData.side = side;
        const shoe = addSphere([s * 0.095, 0.035, 0.09], 0.062, shoeMat, [0.9, 0.36, 1.45]);
        shoe.userData.part = `${side}Shoe`;
        shoe.userData.side = side;
    });

    _attachHeadPivot(group, 1.45);

    group.userData.characterName = name;
    group.scale.setScalar(1.08);
    group.userData.baseY = seatPosition[1];
    group.userData.breathePhase = Math.random() * Math.PI * 2;
    group.position.set(seatPosition[0], seatPosition[1], seatPosition[2]);
    const dir = new THREE.Vector3(lookAt[0] - seatPosition[0], 0, lookAt[2] - seatPosition[2]);
    if (dir.lengthSq() > 0.001) group.rotation.y = Math.atan2(dir.x, dir.z);
    return group;
}

function _shouldUseSimpleCharacter() {
    if (typeof window === 'undefined') return false;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
    const smallScreen = Math.min(window.innerWidth || 9999, window.innerHeight || 9999) <= 820;
    const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
    return coarsePointer || smallScreen || lowMemory;
}

function _createMobileCharacter(name, color = 0x3949AB, seatPosition = [0, 0, 0], lookAt = [0, 0, 0]) {
    const group = new THREE.Group();
    const n = name.toLowerCase();
    const skinColor = _getSkinTone(name);
    const isDealer = n.includes('dealer') || n.includes('croupier');

    const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
    const jacketMat = new THREE.MeshLambertMaterial({ color: isDealer ? 0x2A1716 : color });
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0xF5EFE4 });
    const trouserMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x050505 });
    const hairMat = new THREE.MeshLambertMaterial({
        color: n.includes('bruno') ? 0x15100D : n.includes('clara') ? 0x8B2E16 : 0x3E2418,
    });

    const add = (mesh, part, side = null) => {
        mesh.userData.part = part;
        if (side) mesh.userData.side = side;
        group.add(mesh);
        return mesh;
    };

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.42, 3, 8), jacketMat);
    torso.position.set(0, 0.92, 0);
    torso.scale.set(0.82, 1.18, 0.58);
    add(torso, 'torso');

    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.012), shirtMat);
    shirt.position.set(0, 1.04, 0.135);
    add(shirt, 'shirtFront');

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.12, 8), skinMat);
    neck.position.set(0, 1.31, 0);
    add(neck, 'neck');

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), skinMat);
    head.position.set(0, 1.52, -0.012);
    head.scale.set(0.92, 1.02, 0.86);
    add(head, 'head');

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
    hair.position.set(0, 1.59, -0.032);
    hair.scale.set(1.0, 0.7, 0.94);
    add(hair, 'hairCap');

    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), hairMat);
    backHair.position.set(0, 1.50, -0.12);
    backHair.scale.set(0.9, 0.9, 0.46);
    add(backHair, 'backHair');

    [-1, 1].forEach((s) => {
        const side = s < 0 ? 'left' : 'right';

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1A130F }));
        eye.position.set(s * 0.052, 1.54, 0.136);
        add(eye, `${side}Eye`, side);

        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), jacketMat);
        shoulder.position.set(s * 0.21, 1.18, 0.01);
        shoulder.scale.set(1.2, 0.85, 0.9);
        add(shoulder, `${side}Shoulder`, side);

        const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.25, 3, 6), jacketMat);
        upperArm.position.set(s * 0.245, 0.94, 0.02);
        upperArm.rotation.z = s * 0.08;
        add(upperArm, `${side}UpperArm`, side);

        const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.21, 3, 6), jacketMat);
        forearm.position.set(s * 0.245, 0.67, 0.045);
        forearm.rotation.z = s * -0.04;
        add(forearm, `${side}Forearm`, side);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.043, 8, 6), skinMat);
        hand.position.set(s * 0.245, 0.51, 0.065);
        hand.scale.set(0.86, 1.05, 0.68);
        add(hand, `${side}Hand`, side);

        const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.22, 3, 6), trouserMat);
        thigh.position.set(s * 0.09, 0.42, 0.01);
        add(thigh, `${side}Thigh`, side);

        const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 3, 6), trouserMat);
        shin.position.set(s * 0.095, 0.17, 0.03);
        add(shin, `${side}Shin`, side);

        const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6), shoeMat);
        shoe.position.set(s * 0.095, 0.035, 0.09);
        shoe.scale.set(0.92, 0.34, 1.45);
        add(shoe, `${side}Shoe`, side);
    });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.052, 8), skinMat);
    nose.position.set(0, 1.505, 0.148);
    nose.rotation.x = Math.PI / 2;
    add(nose, 'nose');

    group.userData.characterName = name;
    group.scale.setScalar(1.08);
    group.userData.baseY = seatPosition[1];
    group.userData.breathePhase = Math.random() * Math.PI * 2;
    group.position.set(seatPosition[0], seatPosition[1], seatPosition[2]);
    const dir = new THREE.Vector3(lookAt[0] - seatPosition[0], 0, lookAt[2] - seatPosition[2]);
    if (dir.lengthSq() > 0.001) group.rotation.y = Math.atan2(dir.x, dir.z);
    return group;
}

export function createCharacter(name, color = 0x3949AB, seatPosition = [0, 0, 0], lookAt = [0, 0, 0]) {
    if (_shouldUseSimpleCharacter()) {
        return _createMobileCharacter(name, color, seatPosition, lookAt);
    }
    return _createCleanCharacter(name, color, seatPosition, lookAt);

    const group = new THREE.Group();
    const skinColor = _getSkinTone(name);
    const skinSet = createSkinTexture(new THREE.Color(skinColor).getStyle());
    // skinSet: { map, normalMap, roughnessMap }
    skinSet.map.repeat.set(1, 1);
    skinSet.map.anisotropy = 8;
    skinSet.normalMap.anisotropy = 4;
    skinSet.roughnessMap.anisotropy = 4;

    const clothTexture = createFabricTexture(
        new THREE.Color(color).getStyle(),
        new THREE.Color(color).multiplyScalar(0.55).getStyle()
    );
    clothTexture.repeat.set(2, 2);
    clothTexture.anisotropy = 8;

    const jacketTexture = createFabricTexture(
        new THREE.Color(color).multiplyScalar(0.72).getStyle(),
        new THREE.Color(color).multiplyScalar(0.42).getStyle()
    );
    jacketTexture.repeat.set(2, 2);
    jacketTexture.anisotropy = 8;

    // Realistic skin – MeshPhysicalMaterial with clearcoat + sheen for subsurface look
    const skinMat = new THREE.MeshPhysicalMaterial({
        color: skinColor,
        map: skinSet.map,
        normalMap: skinSet.normalMap,
        normalScale: new THREE.Vector2(0.08, 0.08),
        roughnessMap: skinSet.roughnessMap,
        roughness: 0.68,
        metalness: 0.0,
        clearcoat: 0.02,
        clearcoatRoughness: 0.6,
        sheen: 0.08,
        sheenRoughness: 0.8,
        sheenColor: new THREE.Color(skinColor).multiplyScalar(1.04)
    });

    // Fabric cloth with sheen
    const clothMat = new THREE.MeshPhysicalMaterial({
        color, map: clothTexture, roughness: 0.65, metalness: 0.05,
        sheen: 0.3, sheenRoughness: 0.8,
        sheenColor: new THREE.Color(color).multiplyScalar(1.2)
    });

    const jacketMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color).multiplyScalar(0.8),
        map: jacketTexture,
        roughness: 0.58,
        metalness: 0.04,
        clearcoat: 0.08,
        clearcoatRoughness: 0.65,
        sheen: 0.2,
        sheenRoughness: 0.85,
        sheenColor: new THREE.Color(color).multiplyScalar(0.65)
    });

    const isDealer = name.toLowerCase() === 'dealer';
    const isAlice  = name.toLowerCase().includes('alice');
    const isBruno  = name.toLowerCase().includes('bruno');
    const isClara  = name.toLowerCase().includes('clara');
    const isPlayer = name.toLowerCase().includes('jogador');
    const isFemale = isAlice || isClara;
    const capsule = (radius, length, capSegments = 7, radialSegments = 16) =>
        new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);

    /* ============================= TORSO ============================= */
    const torsoProfile = isFemale
        ? [ new THREE.Vector2(0.10,0.88), new THREE.Vector2(0.19,0.82),
            new THREE.Vector2(0.24,0.65), new THREE.Vector2(0.21,0.48),
            new THREE.Vector2(0.26,0.32), new THREE.Vector2(0.23,0.12),
            new THREE.Vector2(0.22,0) ]
        : [ new THREE.Vector2(0.10,0.88), new THREE.Vector2(0.23,0.80),
            new THREE.Vector2(0.31,0.60), new THREE.Vector2(0.28,0.40),
            new THREE.Vector2(0.26,0.18), new THREE.Vector2(0.24,0) ];
    const torsoGeo = new THREE.LatheGeometry(torsoProfile, 24);
    const torso = new THREE.Mesh(torsoGeo, clothMat);
    torso.castShadow = true;
    group.add(torso);

    // Jacket / blazer layer for extra realism
    const jacketGeo = new THREE.LatheGeometry([
        new THREE.Vector2(0.14, 0.88), new THREE.Vector2(0.26, 0.76),
        new THREE.Vector2(0.33, 0.56), new THREE.Vector2(0.30, 0.30),
        new THREE.Vector2(0.26, 0.12), new THREE.Vector2(0.24, 0)
    ], 24);
    const jacket = new THREE.Mesh(jacketGeo, jacketMat);
    jacket.castShadow = true;
    jacket.position.y = -0.02;
    group.add(jacket);

    // Solid inner body prevents top-down views from seeing through the lathe clothing shells.
    const bodyCore = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), clothMat);
    bodyCore.position.set(0, 0.45, 0.02);
    bodyCore.scale.set(isFemale ? 0.92 : 1.05, 1.45, 0.72);
    bodyCore.castShadow = true;
    group.add(bodyCore);

    /* --- Belt/waistline --- */
    const beltMat = new THREE.MeshStandardMaterial({
        color: isDealer ? 0x111111 : 0x3E2723, roughness: 0.25, metalness: 0.45
    });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.018, 8, 28), beltMat);
    belt.position.y = 0.36; belt.rotation.x = Math.PI / 2;
    group.add(belt);
    // Buckle
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.12, metalness: 0.85 });
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.032, 0.014), buckleMat);
    buckle.position.set(0, 0.36, 0.255);
    group.add(buckle);

    // Subtle body landmarks make the silhouette less mannequin-like.
    const shadowSkinMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(skinColor).multiplyScalar(0.82),
        roughness: 0.72,
    });
    [-1, 1].forEach(s => {
        const clavicle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.13, 6), shadowSkinMat);
        clavicle.position.set(s * 0.07, 0.84, 0.16);
        clavicle.rotation.set(Math.PI / 2.7, 0, s * 1.04);
        group.add(clavicle);
    });

    /* ============================= COLLAR / SHIRT ============================= */
    const shirtMat = new THREE.MeshStandardMaterial({
        color: isDealer ? 0xFAFAFA : 0xF0EDE8, roughness: 0.38
    });

    const chestPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.23, 0.045, 24), shirtMat);
    chestPlug.position.set(0, 0.84, 0.02);
    chestPlug.scale.set(1, 1, 0.75);
    chestPlug.castShadow = true;
    group.add(chestPlug);

    if (isDealer) {
        // Stiff formal collar
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.05, 18), shirtMat);
        collar.position.y = 0.88; group.add(collar);
        // Collar points
        [-1, 1].forEach(s => {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.06), shirtMat);
            p.position.set(s * 0.06, 0.89, 0.13); p.rotation.set(-0.25, 0, s * 0.4);
            group.add(p);
        });
        // Bow tie
        const bowMat = new THREE.MeshStandardMaterial({ color: 0xB71C1C, roughness: 0.22, metalness: 0.15 });
        [-1, 1].forEach(s => {
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.042, 0.022), bowMat);
            w.position.set(s * 0.033, 0.855, 0.155); w.rotation.y = s * 0.12;
            group.add(w);
        });
        const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), bowMat);
        bowCenter.position.set(0, 0.855, 0.165);
        group.add(bowCenter);

        // Dealer vest (satin look)
        const vestMat = new THREE.MeshPhysicalMaterial({
            color: 0x1A1A2E, roughness: 0.35, metalness: 0.1,
            sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x2A2A5E)
        });
        [-1, 1].forEach(s => {
            const pan = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.018), vestMat);
            pan.position.set(s * 0.08, 0.63, 0.23); pan.rotation.x = -0.08;
            group.add(pan);
        });
        // Vest buttons
        [0.72, 0.63, 0.54].forEach(y => {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), buckleMat);
            b.position.set(0, y, 0.26); group.add(b);
        });
        // Arm garters
        const garterMat = new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.3, metalness: 0.3 });
        [-1, 1].forEach(s => {
            const g = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 6, 16), garterMat);
            g.position.set(s * 0.40, 0.42, 0.04); g.rotation.set(0, 0, s * 0.3);
            group.add(g);
        });
    } else {
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.045, 16), shirtMat);
        collar.position.y = 0.87; group.add(collar);
        [-1, 1].forEach(s => {
            const f = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.003, 0.09), shirtMat);
            f.position.set(s * 0.055, 0.87, 0.11); f.rotation.set(-0.3, 0, s * 0.42);
            group.add(f);
        });
        // Shirt buttons
        const btnMat = new THREE.MeshStandardMaterial({
            color: isBruno ? 0x1A1A1A : 0xBBBBBB, roughness: 0.18, metalness: 0.5
        });
        [0.74, 0.64, 0.54, 0.44].forEach(y => {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), btnMat);
            b.position.set(0, y, 0.27); group.add(b);
        });
    }

    // Slight head tilt / posture variation for natural look
    const postureTilt = isAlice ? -0.03 : isBruno ? 0.025 : isClara ? -0.015 : 0;
    group.rotation.z = postureTilt;

    /* ============================= NECK ============================= */
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.09, 0.13, 16), skinMat);
    neck.position.y = 0.94; neck.castShadow = true;
    group.add(neck);
    // Adam's apple for males
    if (!isFemale) {
        const adam = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), skinMat);
        adam.position.set(0, 0.94, 0.085); group.add(adam);
    }
    // Neck tendons (subtle)
    [-1, 1].forEach(s => {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.003, 0.10, 4), skinMat);
        t.position.set(s * 0.04, 0.94, 0.06); t.rotation.set(-0.15, 0, s * 0.15);
        group.add(t);
    });

    /* ============================= HEAD ============================= */
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 36, 30), skinMat);
    head.position.y = 1.14; head.scale.set(1, 1.08, 0.96);
    head.castShadow = true; group.add(head);

    // Forehead
    const forehead = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 18, 14, 0, Math.PI*2, 0, Math.PI*0.38), skinMat);
    forehead.position.set(0, 1.24, 0.07); forehead.scale.set(1.15, 0.55, 0.48);
    group.add(forehead);

    // Temples
    [-1, 1].forEach(s => {
        const tmp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), skinMat);
        tmp.position.set(s * 0.17, 1.18, 0.05); tmp.scale.set(0.4, 0.65, 0.45);
        group.add(tmp);
    });

    // Cheekbones
    [-1, 1].forEach(s => {
        const ck = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), skinMat);
        ck.position.set(s * 0.14, 1.08, 0.14); ck.scale.set(0.75, 0.45, 0.55);
        group.add(ck);
    });

    /* --- Jaw / Chin --- */
    const jaw = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 22, 16, 0, Math.PI*2, Math.PI*0.48, Math.PI*0.52), skinMat);
    jaw.position.set(0, 1.05, 0.02);
    jaw.scale.set(isFemale ? 0.88 : 1.0, 0.62, 0.82);
    group.add(jaw);

    const chin = new THREE.Mesh(new THREE.SphereGeometry(isFemale ? 0.032 : 0.04, 12, 12), skinMat);
    chin.position.set(0, 0.955, 0.165); chin.scale.set(isFemale ? 0.65 : 0.85, 0.55, 0.65);
    group.add(chin);

    // Under-eye volume and nasolabial folds for more readable facial planes.
    [-1, 1].forEach(s => {
        const underEye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), shadowSkinMat);
        underEye.position.set(s * 0.078, 1.105, 0.178);
        underEye.scale.set(1.25, 0.22, 0.35);
        group.add(underEye);

        const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.002, 0.064, 5), shadowSkinMat);
        fold.position.set(s * 0.042, 1.025, 0.197);
        fold.rotation.set(0.42, 0, s * 0.38);
        group.add(fold);
    });

    /* --- Ears --- */
    [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 14), skinMat);
        ear.position.set(s * 0.21, 1.10, -0.02); ear.scale.set(0.42, 0.95, 0.62);
        group.add(ear);
        // Lobe
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), skinMat);
        lobe.position.set(s * 0.215, 1.05, -0.01); lobe.scale.set(0.5, 0.65, 0.55);
        group.add(lobe);
        // Inner ear
        const innerMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(skinColor).multiplyScalar(0.80), roughness: 0.65
        });
        const inner = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), innerMat);
        inner.position.set(s * 0.21, 1.10, 0.0); inner.scale.set(0.32, 0.65, 0.42);
        group.add(inner);
    });

    /* ============================= EYES ============================= */
    const socketMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(skinColor).multiplyScalar(0.86), roughness: 0.65
    });
    const lidMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(skinColor).multiplyScalar(0.91), roughness: 0.5
    });

    [-0.078, 0.078].forEach(xOff => {
        // Socket depression
        const socket = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 14), socketMat);
        socket.position.set(xOff, 1.14, 0.165); socket.scale.set(1.25, 0.72, 0.42);
        group.add(socket);

        // Sclera with wet clearcoat
        const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.030, 18, 16),
            new THREE.MeshPhysicalMaterial({
                color: 0xFFFEF5, roughness: 0.08, metalness: 0.01,
                clearcoat: 0.9, clearcoatRoughness: 0.08
            }));
        sclera.position.set(xOff, 1.14, 0.176); sclera.scale.set(1.12, 0.72, 0.42);
        group.add(sclera);

        // Iris
        const irisColor = isBruno ? 0x3E2723 : isAlice ? 0x2E7D32 : isClara ? 0x1565C0 : isPlayer ? 0x4E342E : 0x5D4037;
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 14),
            new THREE.MeshPhysicalMaterial({
                color: irisColor, roughness: 0.12, metalness: 0.18,
                clearcoat: 1.0, clearcoatRoughness: 0.04
            }));
        iris.position.set(xOff, 1.14, 0.195); iris.scale.set(1, 0.88, 0.45);
        group.add(iris);

        // Pupil
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.03 }));
        pupil.position.set(xOff, 1.14, 0.202);
        group.add(pupil);

        // Cornea highlight (realism sparkle)
        const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.35, roughness: 0 }));
        cornea.position.set(xOff + 0.005, 1.145, 0.205);
        group.add(cornea);

        // Upper eyelid
        const upperLid = new THREE.Mesh(
            new THREE.SphereGeometry(0.034, 16, 10, 0, Math.PI*2, 0, Math.PI*0.33), lidMat);
        upperLid.position.set(xOff, 1.15, 0.168); upperLid.scale.set(1.18, 0.82, 0.48);
        upperLid.rotation.x = 0.18; group.add(upperLid);

        // Lower eyelid
        const lowerLid = new THREE.Mesh(
            new THREE.SphereGeometry(0.030, 14, 8, 0, Math.PI*2, Math.PI*0.62, Math.PI*0.38), lidMat);
        lowerLid.position.set(xOff, 1.13, 0.168); lowerLid.scale.set(1.08, 0.65, 0.42);
        group.add(lowerLid);

        // Eyelashes (females – 5 lashes per eye)
        if (isFemale) {
            for (let l = -2; l <= 2; l++) {
                const lash = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0008, 0.016, 3),
                    new THREE.MeshStandardMaterial({ color: 0x0A0A0A }));
                lash.position.set(xOff + l * 0.007, 1.157, 0.188);
                lash.rotation.set(-0.7, 0, l * 0.07); group.add(lash);
            }
        }

        // Brow ridge
        const browRidge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.036, 0.036, 0.006, 12, 1, false, 0, Math.PI),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(skinColor).multiplyScalar(0.87), roughness: 0.6 }));
        browRidge.position.set(xOff, 1.165, 0.168);
        browRidge.rotation.set(Math.PI/2, 0, Math.PI); group.add(browRidge);
    });

    // Eyebrows (main + taper)
    const browColor = isBruno ? 0x080808 : isAlice ? 0x5D4037 : isClara ? 0xBF360C : isPlayer ? 0x3E2723 : 0x3E2723;
    const browMat = new THREE.MeshStandardMaterial({ color: browColor, roughness: 0.85 });
    [-0.078, 0.078].forEach(xOff => {
        const eb = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.011, 0.015), browMat);
        eb.position.set(xOff, 1.18, 0.168); eb.rotation.z = xOff > 0 ? -0.10 : 0.10;
        group.add(eb);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.007, 0.011), browMat);
        tip.position.set(xOff + (xOff > 0 ? 0.032 : -0.032), 1.176, 0.168);
        tip.rotation.z = xOff > 0 ? -0.22 : 0.22; group.add(tip);
    });

    /* ============================= NOSE ============================= */
    const noseGroup = new THREE.Group();
    // Bridge
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.019, 0.07, 8), skinMat);
    bridge.position.set(0, 0.04, 0); bridge.rotation.x = -0.16;
    noseGroup.add(bridge);
    // Tip
    const noseTip = new THREE.Mesh(
        new THREE.SphereGeometry(isFemale ? 0.020 : 0.025, 14, 14), skinMat);
    noseTip.position.set(0, -0.005, 0.016); noseGroup.add(noseTip);
    // Wings + nostril holes
    const nostrilDarkMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(skinColor).multiplyScalar(0.68), roughness: 0.7
    });
    [-0.013, 0.013].forEach(x => {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), skinMat);
        wing.position.set(x, -0.013, 0.006); wing.scale.set(1, 0.65, 0.75);
        noseGroup.add(wing);
        const hole = new THREE.Mesh(new THREE.SphereGeometry(0.005, 5, 5), nostrilDarkMat);
        hole.position.set(x, -0.018, 0.008); noseGroup.add(hole);
    });
    noseGroup.position.set(0, 1.085, 0.195);
    group.add(noseGroup);

    // Philtrum
    const philtrum = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.028, 0.003),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(skinColor).multiplyScalar(0.92), roughness: 0.6 }));
    philtrum.position.set(0, 0.995, 0.208); group.add(philtrum);

    /* ============================= MOUTH ============================= */
    const lipColor = isFemale ? (isClara ? 0xC62828 : 0xE57373)
        : new THREE.Color(skinColor).multiplyScalar(0.76);
    const lipMat = new THREE.MeshPhysicalMaterial({
        color: lipColor, roughness: 0.28, metalness: 0.02,
        clearcoat: isFemale ? 0.5 : 0.08, clearcoatRoughness: 0.3
    });
    const upperLip = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0075, 12, 18, Math.PI), lipMat);
    upperLip.position.set(0, 0.975, 0.195); upperLip.rotation.set(0.14, 0, Math.PI);
    group.add(upperLip);
    const lowerLip = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.009, 12, 18, Math.PI), lipMat);
    lowerLip.position.set(0, 0.960, 0.19); lowerLip.rotation.x = -0.1;
    group.add(lowerLip);
    // Lip corners
    [-1, 1].forEach(s => {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 6), lipMat);
        c.position.set(s * 0.023, 0.968, 0.198); group.add(c);
    });
    // Teeth hint (thin white strip behind lips)
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.003),
        new THREE.MeshStandardMaterial({ color: 0xFFFFF0, roughness: 0.2 }));
    teeth.position.set(0, 0.968, 0.195); group.add(teeth);

    /* ============================= HAIR / HEADWEAR ============================= */
    if (isDealer) {
        // Dark slicked hair + visor
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x0E0E0E, roughness: 0.28, metalness: 0.15 });
        // Volume
        const hv = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 20, 0, Math.PI*2, 0, Math.PI*0.50), hairMat);
        hv.position.set(0, 1.17, -0.02); group.add(hv);
        // Sides
        [-0.18, 0.18].forEach(x => {
            const s = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), hairMat);
            s.position.set(x, 1.10, -0.07); s.scale.set(0.48, 1, 1.35); group.add(s);
        });
        // Back hair
        const bh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14, 0, Math.PI*2, Math.PI*0.18, Math.PI*0.42), hairMat);
        bh.position.set(0, 1.10, -0.08); group.add(bh);
        // Part line (lighter streak)
        const partMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
        const part = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.14), partMat);
        part.position.set(0.04, 1.35, -0.02); part.rotation.x = 0.3; group.add(part);

        // Visor cap
        const capMat = new THREE.MeshStandardMaterial({ color: 0x141E30, roughness: 0.28, metalness: 0.15 });
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.245, 26, 16, 0, Math.PI*2, 0, Math.PI/2.4), capMat);
        cap.position.y = 1.19; cap.castShadow = true; group.add(cap);
        // Brim
        const brim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.255, 0.275, 0.01, 26, 1, false, -Math.PI*0.42, Math.PI*0.84), capMat);
        brim.position.set(0, 1.21, 0.09); brim.rotation.x = Math.PI / 2.5; group.add(brim);
        // Gold trim
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.18, metalness: 0.72 });
        const trim = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.009, 8, 30), trimMat);
        trim.position.y = 1.21; trim.rotation.x = Math.PI / 2; group.add(trim);
        // Casino emblem on cap
        const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16),
            new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.2, metalness: 0.6 }));
        emblem.position.set(0, 1.255, 0.20); emblem.rotation.x = -0.5; group.add(emblem);

    } else if (isAlice) {
        // Brown shoulder-length wavy hair
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.6, metalness: 0.04 });
        // Volume on top
        const ht = new THREE.Mesh(new THREE.SphereGeometry(0.26, 22, 18, 0, Math.PI*2, 0, Math.PI*0.57), hairMat);
        ht.position.set(0, 1.15, -0.01); group.add(ht);
        // Side strands – layered
        [-0.15, 0.15].forEach(x => {
            for (let i = 0; i < 3; i++) {
                const w = 0.065 - i * 0.012;
                const sg = new THREE.CylinderGeometry(w, w - 0.015, 0.18 + i * 0.06, 10);
                const s = new THREE.Mesh(sg, hairMat);
                s.position.set(x * (1 + i * 0.08), 0.82 - i * 0.12, -0.04 - i * 0.01);
                s.rotation.z = x > 0 ? -0.06 - i * 0.05 : 0.06 + i * 0.05;
                group.add(s);
            }
        });
        // Back hair cascade
        const bhGeo = new THREE.SphereGeometry(0.21, 14, 14, 0, Math.PI*2, Math.PI*0.18, Math.PI*0.48);
        const bh = new THREE.Mesh(bhGeo, hairMat);
        bh.position.set(0, 0.94, -0.11); bh.scale.set(1, 1.35, 0.78); group.add(bh);
        // Lower back hair
        const lbh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.28, 10), hairMat);
        lbh.position.set(0, 0.62, -0.10); group.add(lbh);
        // Wispy bangs
        [-0.08, 0, 0.08].forEach(x => {
            const bg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.008, 0.08, 6), hairMat);
            bg.position.set(x, 1.26, 0.15); bg.rotation.x = -0.6;
            bg.rotation.z = x * 0.8; group.add(bg);
        });
        // Earrings (gold hoops)
        const earMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.15, metalness: 0.82 });
        [-0.22, 0.22].forEach(x => {
            const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 6, 12), earMat);
            hoop.position.set(x, 1.02, -0.01); hoop.rotation.y = Math.PI / 2;
            group.add(hoop);
        });

    } else if (isBruno) {
        // Short dark buzz + facial hair + sunglasses
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.88 });
        const hm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 16, 0, Math.PI*2, 0, Math.PI*0.46), hairMat);
        hm.position.set(0, 1.14, 0); group.add(hm);
        // Subtle widow's peak
        const peak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.04, 4), hairMat);
        peak.position.set(0, 1.34, 0.06); peak.rotation.x = -0.3; group.add(peak);
        // Stubble / 5 o'clock shadow
        const stubbleMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(skinColor).multiplyScalar(0.84), roughness: 0.9
        });
        const stubble = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI*2, Math.PI*0.45, Math.PI*0.35), stubbleMat);
        stubble.position.set(0, 1.04, 0.04); group.add(stubble);
        // Sideburns
        [-0.19, 0.19].forEach(x => {
            const sb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.015), stubbleMat);
            sb.position.set(x, 1.06, 0.07); group.add(sb);
        });

        // Aviator sunglasses
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x111111, roughness: 0.02, metalness: 0.95,
            clearcoat: 1.0, clearcoatRoughness: 0.05
        });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xB8B8B8, roughness: 0.15, metalness: 0.92 });
        [-0.078, 0.078].forEach(x => {
            // Teardrop lens
            const lens = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), glassMat);
            lens.position.set(x, 1.125, 0.22); lens.scale.set(1, 0.82, 0.18);
            group.add(lens);
            // Frame
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.003, 6, 18), frameMat);
            rim.position.set(x, 1.125, 0.225); rim.scale.set(1, 0.82, 1);
            group.add(rim);
        });
        // Nose bridge
        const nb = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 6), frameMat);
        nb.position.set(0, 1.13, 0.225); nb.rotation.z = Math.PI / 2; group.add(nb);
        // Temple arms
        [-0.12, 0.12].forEach(x => {
            const ta = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.17, 4), frameMat);
            ta.position.set(x, 1.125, 0.14); ta.rotation.x = Math.PI / 2; group.add(ta);
        });
        // Chain necklace
        const chainMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.2, metalness: 0.8 });
        const chain = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.004, 6, 24), chainMat);
        chain.position.set(0, 0.86, 0.08); chain.rotation.x = Math.PI / 3;
        group.add(chain);

    } else if (isClara) {
        // Auburn voluminous curly hair + headband
        const hairMat = new THREE.MeshStandardMaterial({ color: 0xBF360C, roughness: 0.52, metalness: 0.04 });
        // Volume top
        const vt = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18, 0, Math.PI*2, 0, Math.PI*0.56), hairMat);
        vt.position.set(0, 1.15, -0.01); group.add(vt);
        // Curls on sides
        [-0.19, 0.19].forEach(x => {
            for (let i = 0; i < 4; i++) {
                const curl = new THREE.Mesh(new THREE.TorusGeometry(0.035 + i * 0.003, 0.02, 8, 14), hairMat);
                curl.position.set(x, 0.88 - i * 0.1, -0.02 + i * 0.01);
                curl.rotation.set(Math.random() * 0.25, Math.PI / 2, 0); group.add(curl);
            }
        });
        // Back volume
        const bv = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.42, 12), hairMat);
        bv.position.set(0, 0.74, -0.11); group.add(bv);
        // Loose strand falling forward
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.005, 0.14, 6), hairMat);
        strand.position.set(0.12, 1.10, 0.16); strand.rotation.set(-0.5, 0, 0.3); group.add(strand);

        // Pink headband
        const hbMat = new THREE.MeshStandardMaterial({ color: 0xE91E63, roughness: 0.28, metalness: 0.18 });
        const hb = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.016, 8, 30), hbMat);
        hb.position.y = 1.22; hb.rotation.x = Math.PI / 7; group.add(hb);
        // Gem on headband
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 1),
            new THREE.MeshPhysicalMaterial({
                color: 0x00BCD4, roughness: 0.08, metalness: 0.4,
                clearcoat: 1.0, clearcoatRoughness: 0.02
            }));
        gem.position.set(0, 1.26, 0.17); group.add(gem);
        // Necklace with pendant
        const neckMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.15, metalness: 0.8 });
        const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.003, 6, 20), neckMat);
        necklace.position.set(0, 0.88, 0.06); necklace.rotation.x = Math.PI / 3.5;
        group.add(necklace);
        const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), neckMat);
        pendant.position.set(0, 0.82, 0.12); group.add(pendant);
    } else if (isPlayer) {
        // Player: dark brown medium-length hair, casual style
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.55, metalness: 0.04 });
        // Volume on top
        const ht = new THREE.Mesh(new THREE.SphereGeometry(0.255, 22, 18, 0, Math.PI*2, 0, Math.PI*0.52), hairMat);
        ht.position.set(0, 1.15, -0.01); group.add(ht);
        // Side hair
        [-0.17, 0.17].forEach(x => {
            const sg = new THREE.CylinderGeometry(0.058, 0.045, 0.16, 10);
            const s = new THREE.Mesh(sg, hairMat);
            s.position.set(x, 0.90, -0.04);
            s.rotation.z = x > 0 ? -0.08 : 0.08;
            group.add(s);
        });
        // Back volume
        const bh = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 14, 0, Math.PI*2, Math.PI*0.18, Math.PI*0.42), hairMat);
        bh.position.set(0, 1.03, -0.10); bh.scale.set(1, 1.1, 0.75); group.add(bh);
        // Fringe / bangs
        [-0.06, 0.02, 0.10].forEach(x => {
            const bg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.008, 0.07, 6), hairMat);
            bg.position.set(x, 1.27, 0.14); bg.rotation.x = -0.55;
            bg.rotation.z = x * 0.5; group.add(bg);
        });
    } else {
        // Generic
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.65 });
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 18, 0, Math.PI*2, 0, Math.PI*0.48), hairMat);
        h.position.y = 1.14; group.add(h);
    }

    /* ============================= SHOULDERS ============================= */
    [-1, 1].forEach(s => {
        // Rounded shoulder cap
        const sh = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), clothMat);
        sh.position.set(s * 0.33, 0.72, 0); sh.scale.set(1, 0.65, 0.78);
        sh.castShadow = true; group.add(sh);
        // Shoulder seam
        const seam = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.004, 6, 14, Math.PI),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), roughness: 0.55 }));
        seam.position.set(s * 0.33, 0.73, 0); seam.rotation.set(0, s * Math.PI / 2, 0);
        group.add(seam);
    });

    /* ============================= ARMS ============================= */
    [-1, 1].forEach(s => {
        // Upper arm
        const ua = new THREE.Mesh(capsule(0.055, 0.28), clothMat);
        ua.position.set(s * 0.39, 0.50, 0.04);
        ua.scale.set(1.05, 1, 0.9);
        ua.rotation.set(-0.12, 0, s * 0.28); ua.castShadow = true;
        group.add(ua);

        // Elbow
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), clothMat);
        elbow.position.set(s * 0.44, 0.32, 0.08); group.add(elbow);

        // Forearm (exposed skin – rolled sleeves)
        const fa = new THREE.Mesh(capsule(0.038, 0.22), skinMat);
        fa.position.set(s * 0.45, 0.17, 0.19);
        fa.scale.set(0.86, 1, 0.74);
        fa.rotation.set(-0.62, 0, s * 0.10); fa.castShadow = true;
        group.add(fa);
        // Sleeve cuff
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.02, 10), clothMat);
        cuff.position.set(s * 0.44, 0.31, 0.09);
        cuff.rotation.set(-0.12, 0, s * 0.28); group.add(cuff);

        // Wrist
        const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), skinMat);
        wrist.position.set(s * 0.45, 0.06, 0.30); group.add(wrist);

        // Hand (palm)
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.022, 0.072, 2, 1, 2), skinMat);
        palm.position.set(s * 0.45, 0.04, 0.34); palm.rotation.x = -0.28;
        palm.castShadow = true; group.add(palm);
        const handPad = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), skinMat);
        handPad.position.set(s * 0.45, 0.035, 0.36);
        handPad.scale.set(0.9, 0.42, 1.15);
        handPad.castShadow = true;
        group.add(handPad);

        // Fingers (4 + thumb)
        const nailMat = new THREE.MeshPhysicalMaterial({
            color: isFemale ? 0xF6C8C8 : 0xF3D4C0,
            roughness: 0.24,
            metalness: 0,
            clearcoat: 0.35,
            clearcoatRoughness: 0.2,
        });
        for (let f = 0; f < 4; f++) {
            const fg = new THREE.Mesh(capsule(0.0056, 0.034, 4, 7), skinMat);
            fg.position.set(s * 0.45 + (f - 1.5) * 0.013, 0.02, 0.38);
            fg.rotation.x = -0.45; group.add(fg);
            const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 5, 5), shadowSkinMat);
            knuckle.position.set(s * 0.45 + (f - 1.5) * 0.013, 0.028, 0.363);
            group.add(knuckle);
            // Fingertip
            const ft = new THREE.Mesh(new THREE.SphereGeometry(0.005, 5, 5), skinMat);
            ft.position.set(s * 0.45 + (f - 1.5) * 0.013, 0.005, 0.40);
            group.add(ft);
            const nail = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.0015, 0.005), nailMat);
            nail.position.set(s * 0.45 + (f - 1.5) * 0.013, 0.007, 0.405);
            nail.rotation.x = -0.18;
            group.add(nail);
        }
        // Thumb
        const thumb = new THREE.Mesh(capsule(0.0065, 0.028, 4, 7), skinMat);
        thumb.position.set(s * (0.45 + s * 0.033), 0.04, 0.33);
        thumb.rotation.set(-0.3, 0, s * 0.75); group.add(thumb);

        // Watch (Bruno only)
        if (isBruno && s === -1) {
            const watchMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.7 });
            const band = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.008, 6, 16), watchMat);
            band.position.set(s * 0.45, 0.08, 0.28); band.rotation.set(-0.6, 0, s * 0.1);
            group.add(band);
            const face = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.005, 12),
                new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.05, metalness: 0.8,
                    clearcoat: 1.0, clearcoatRoughness: 0.05 }));
            face.position.set(s * 0.45, 0.08, 0.31); face.rotation.x = -Math.PI / 2.5;
            group.add(face);
        }
    });

    /* ============================= LEGS ============================= */
    /* Calças/saia + pernas + tornozelos + sapatos.
       Construídos em torno de y=0 (cintura) descendo até y=-0.95 (pés
       no chão). No final, todo o personagem é elevado em +0.95 para
       que os pés fiquem no nível do chão (seatPosition[1] ≈ 0.02). */
    const trouserMat = new THREE.MeshPhysicalMaterial({
        color: isDealer ? 0x0E0E12
            : isBruno ? 0x1A1A1A
            : isAlice ? new THREE.Color(color).multiplyScalar(0.35).getHex()
            : isClara ? 0x2C1A2A
            : new THREE.Color(color).multiplyScalar(0.30).getHex(),
        roughness: 0.62, metalness: 0.04,
        clearcoat: 0.12, clearcoatRoughness: 0.5,
        sheen: 0.25, sheenRoughness: 0.8,
        sheenColor: new THREE.Color(0x202020),
    });

    // Hip / pelvis volume (skirt for females, hip block for males)
    if (isClara || isAlice) {
        // Pencil skirt (lathe profile narrowing slightly toward the knees)
        const skirtMat = new THREE.MeshPhysicalMaterial({
            color: isClara ? 0x4A0E2C : new THREE.Color(color).multiplyScalar(0.38).getHex(),
            roughness: 0.55, metalness: 0.05,
            sheen: 0.5, sheenRoughness: 0.6,
            sheenColor: new THREE.Color(color).multiplyScalar(0.6),
            clearcoat: 0.18, clearcoatRoughness: 0.4,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -4,
        });
        const skirtProfile = [
            new THREE.Vector2(0.21, 0.00),
            new THREE.Vector2(0.24, -0.06),
            new THREE.Vector2(0.25, -0.20),
            new THREE.Vector2(0.23, -0.40),
            new THREE.Vector2(0.20, -0.55),
            new THREE.Vector2(0.18, -0.58),
        ];
        const skirt = new THREE.Mesh(new THREE.LatheGeometry(skirtProfile, 24), skirtMat);
        skirt.castShadow = true; skirt.receiveShadow = true;
        // Slight render order bias so skirt occludes legs when camera is above
        skirt.renderOrder = 50;
        group.add(skirt);

        const skirtTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.018, 24), skirtMat);
        skirtTop.position.y = -0.01;
        skirtTop.scale.set(1, 1, 0.78);
        skirtTop.castShadow = true;
        group.add(skirtTop);
    } else {
        // Hip block
        const hip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.30), trouserMat);
        hip.position.y = -0.05; hip.castShadow = true; group.add(hip);
    }

    // Thighs / shins / feet — for both genders we still build the legs
    [-1, 1].forEach(s => {
        // Thigh
        const thigh = new THREE.Mesh(
            capsule(0.076, 0.40, 7, 16), trouserMat);
        thigh.position.set(s * 0.10, -0.32, 0);
        thigh.scale.set(1.08, 1, 0.92);
        thigh.castShadow = true; thigh.receiveShadow = true;
        group.add(thigh);

        // Knee
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), trouserMat);
        knee.position.set(s * 0.10, -0.58, 0.005);
        group.add(knee);

        // Shin
        const shin = new THREE.Mesh(
            capsule(0.055, 0.28, 7, 16), trouserMat);
        shin.position.set(s * 0.10, -0.78, 0);
        shin.scale.set(0.88, 1, 0.82);
        shin.castShadow = true; shin.receiveShadow = true;
        group.add(shin);

        // Cuff at the bottom of the trouser leg
        const cuffMat = new THREE.MeshPhysicalMaterial({
            color: trouserMat.color, roughness: 0.5, metalness: 0.05,
            clearcoat: 0.3, clearcoatRoughness: 0.3,
        });
        const cuff2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.058, 0.058, 0.025, 14), cuffMat);
        cuff2.position.set(s * 0.10, -0.95, 0); group.add(cuff2);

        // Ankle (sock — not visible if shoes high, but adds shape)
        const sockMat = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.85, metalness: 0,
        });
        const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.06, 12), sockMat);
        sock.position.set(s * 0.10, -0.985, 0); group.add(sock);

        // Shoe — patent leather oxford for dealer/men, heel for women
        const shoeMat = new THREE.MeshPhysicalMaterial({
            color: isClara ? 0x6B0F2A : isAlice ? 0x2A1810 : 0x0A0A0A,
            roughness: isDealer ? 0.10 : 0.20, metalness: 0.04,
            clearcoat: isDealer ? 1.0 : 0.7, clearcoatRoughness: 0.06,
        });
        if (isFemale) {
            // Pointed-toe pump
            const pump = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14), shoeMat);
            pump.position.set(s * 0.10, -0.985, 0.06);
            pump.scale.set(0.85, 0.55, 1.5);
            pump.castShadow = true; group.add(pump);
            // Heel
            const heel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.012, 0.008, 0.05, 8), shoeMat);
            heel.position.set(s * 0.10, -1.005, -0.03); group.add(heel);
        } else {
            // Oxford / formal shoe — slightly elongated ellipsoid
            const oxford = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 14), shoeMat);
            oxford.position.set(s * 0.10, -0.97, 0.05);
            oxford.scale.set(0.80, 0.42, 1.55);
            oxford.castShadow = true; group.add(oxford);
            // Sole (matte)
            const soleMat = new THREE.MeshStandardMaterial({
                color: 0x1A0E0A, roughness: 0.9, metalness: 0,
            });
            const sole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.014, 0.22), soleMat);
            sole.position.set(s * 0.10, -1.005, 0.05); group.add(sole);
            // Lace area highlight for dealer
            if (isDealer) {
                const lace = new THREE.Mesh(
                    new THREE.BoxGeometry(0.04, 0.005, 0.06),
                    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })
                );
                lace.position.set(s * 0.10, -0.94, 0.06); group.add(lace);
            }
        }
    });

    /* Lift the whole figure: cada peça construída com cintura em y=0
       e pés em y≈-0.99 é translatada por +0.99 para que os pés
       fiquem alinhados com y=0 do grupo. Aplicado peça-a-peça
       (em vez de wrapping num sub-grupo) para preservar a lógica de
       AnimationManager.update() que itera directamente group.children
       à procura da cabeça (y>0.9) e dos antebraços. */
    const FOOT_LIFT = 0.99;
    group.children.forEach(child => { child.position.y += FOOT_LIFT; });

    // Metadata
    group.userData.characterName = name;
    group.userData.baseY = seatPosition[1];
    group.userData.breathePhase = Math.random() * Math.PI * 2;

    // Position
    group.position.set(seatPosition[0], seatPosition[1], seatPosition[2]);
    const dir = new THREE.Vector3(lookAt[0] - seatPosition[0], 0, lookAt[2] - seatPosition[2]);
    if (dir.lengthSq() > 0.001) group.rotation.y = Math.atan2(dir.x, dir.z);

    return group;
}

/* ==================================================================
   NAME PLATE – floating text via canvas texture
   ================================================================== */
export function createNamePlate(name, chips, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    const r = 10;
    ctx.moveTo(r, 0); ctx.lineTo(256-r, 0); ctx.arcTo(256, 0, 256, r, r);
    ctx.lineTo(256, 80-r); ctx.arcTo(256, 80, 256-r, 80, r);
    ctx.lineTo(r, 80); ctx.arcTo(0, 80, 0, 80-r, r);
    ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText(name, 128, 30);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '18px Arial';
    ctx.fillText(`$${chips}`, 128, 58);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    // Ensure plates render above geometry and remain readable
    mat.depthTest = false;
    mat.depthWrite = false;
    const sprite = new THREE.Sprite(mat);
    // Slightly smaller and taller aspect so it sits neatly above heads
    sprite.scale.set(0.9, 0.28, 1);
    sprite.position.set(x, y + 0.45, z);
    sprite.renderOrder = 999;
    return sprite;
}

// Attach a name plate to an Object3D so it follows the character and sits above
export function attachNamePlateTo(target, name, chips = '', yOffset = 0.35) {
    // Create plate at origin and attach as child; compute local offset from bounding box
    const plate = createNamePlate(name, chips, 0, 0, 0);
    // Compute bounding box of target to position plate above head
    const box = new THREE.Box3().setFromObject(target);
    const height = box.isEmpty() ? 1.6 : (box.max.y - box.min.y);
    plate.position.set(0, box.max.y - box.min.y + yOffset + 0.15, 0);
    // Add as child so it follows animations/transforms
    target.add(plate);
    return plate;
}
