import * as THREE from 'three';
import { createCharacter } from './SceneElements.js';
import {
    createPokerCenterTexture,
    createCarpetPBR,
    createWoodPBR,
    createMarblePBR,
    createWallPBR,
    createFeltPBR,
    createCeilingPBR,
} from './ProceduralTextures.js';

/* ==================================================================
   CasinoWorld – Full casino environment with zones
   Blackjack table, Poker table, ATM, decorations
   ================================================================== */

const ROOM_W = 28, ROOM_D = 28, WALL_H = 5.5;

/* ---- Material library ----
   Materiais PBR (MeshStandard/Physical) com mapas procedurais:
   color (albedo), normalMap (relevo) e roughnessMap (variação de
   microsuperfície). Aplicados nas grandes superfícies para que a
   iluminação tenha algo a que reagir. Ver ICG-07. */
function createMaterials() {
    const pokerCenterTexture = createPokerCenterTexture();

    // PBR sets
    const carpetSet  = createCarpetPBR(512);
    const woodSet    = createWoodPBR(512, 4);
    const marbleSet  = createMarblePBR(512, '#EFE7D6');
    const marbleDarkSet = createMarblePBR(512, '#1F1F22');
    const wallSet    = createWallPBR(512);
    const feltSet    = createFeltPBR(512, '#0F5D2E');
    const feltLightSet = createFeltPBR(512, '#196B3A');
    const ceilSet    = createCeilingPBR(512);

    // Wall texture is repeated horizontally over the whole wall length
    wallSet.map.repeat.set(8, 3);
    wallSet.normalMap.repeat.set(8, 3);
    wallSet.roughnessMap.repeat.set(8, 3);

    // Carpet covers the whole floor — a denser repeat looks tighter
    carpetSet.map.repeat.set(8, 8);
    carpetSet.normalMap.repeat.set(8, 8);
    carpetSet.roughnessMap.repeat.set(8, 8);

    // Marble strip gets stretched along the walkway
    marbleSet.map.repeat.set(1, 4);
    marbleSet.normalMap.repeat.set(1, 4);
    marbleSet.roughnessMap.repeat.set(1, 4);

    return {
        carpet: new THREE.MeshStandardMaterial({
            map: carpetSet.map,
            normalMap: carpetSet.normalMap,
            normalScale: new THREE.Vector2(0.6, 0.6),
            roughnessMap: carpetSet.roughnessMap,
            roughness: 0.95, metalness: 0,
            color: 0xFFFFFF,
        }),
        carpetPattern: new THREE.MeshStandardMaterial({
            color: 0x2A1B4E, roughness: 0.9, metalness: 0,
            transparent: true, opacity: 0.35,
        }),
        wall: new THREE.MeshPhysicalMaterial({
            map: wallSet.map,
            normalMap: wallSet.normalMap,
            normalScale: new THREE.Vector2(0.32, 0.32),
            roughnessMap: wallSet.roughnessMap,
            roughness: 0.78, metalness: 0.02, clearcoat: 0.03,
            color: 0xFFFFFF,
        }),
        wallAccent: new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.45, metalness: 0.1 }),
        ceiling: new THREE.MeshStandardMaterial({
            map: ceilSet.map,
            normalMap: ceilSet.normalMap,
            normalScale: new THREE.Vector2(0.38, 0.38),
            roughness: 0.92, metalness: 0.01, color: 0xF4F0E8,
        }),
        ceilingTile: new THREE.MeshStandardMaterial({ color: 0x2A2724, roughness: 0.88, metalness: 0.01 }),
        wood: new THREE.MeshPhysicalMaterial({
            map: woodSet.map,
            normalMap: woodSet.normalMap,
            normalScale: new THREE.Vector2(0.4, 0.4),
            roughnessMap: woodSet.roughnessMap,
            roughness: 0.55, metalness: 0.05, clearcoat: 0.4, clearcoatRoughness: 0.25,
            color: 0xFFFFFF,
        }),
        darkWood: (() => {
            const dwSet = createWoodPBR(512, 4);
            const m = new THREE.MeshPhysicalMaterial({
                map: dwSet.map,
                normalMap: dwSet.normalMap,
                normalScale: new THREE.Vector2(0.6, 0.6),
                roughnessMap: dwSet.roughnessMap,
                color: 0x4A2A1E, roughness: 0.5, metalness: 0.06,
                clearcoat: 0.45, clearcoatRoughness: 0.2,
            });
            return m;
        })(),
        metal: new THREE.MeshStandardMaterial({ color: 0x9E9E9E, roughness: 0.18, metalness: 0.85 }),
        gold: new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.18, metalness: 0.85 }),
        felt: new THREE.MeshStandardMaterial({
            map: feltSet.map,
            normalMap: feltSet.normalMap,
            normalScale: new THREE.Vector2(0.35, 0.35),
            roughness: 0.88, metalness: 0, color: 0xFFFFFF,
        }),
        feltLight: new THREE.MeshStandardMaterial({
            map: feltLightSet.map,
            normalMap: feltLightSet.normalMap,
            normalScale: new THREE.Vector2(0.3, 0.3),
            roughness: 0.92, metalness: 0, color: 0xFFFFFF,
        }),
        leather: new THREE.MeshPhysicalMaterial({ color: 0x4A0E0E, roughness: 0.5, metalness: 0.03, clearcoat: 0.25 }),
        leatherBlack: new THREE.MeshPhysicalMaterial({ color: 0x1A1A1A, roughness: 0.45, metalness: 0.03, clearcoat: 0.3 }),
        glass: new THREE.MeshPhysicalMaterial({
            color: 0x88CCFF, roughness: 0.02, metalness: 0,
            transmission: 0.85, ior: 1.45, thickness: 0.4,
            transparent: true, opacity: 0.45, clearcoat: 1,
        }),
        chrome: new THREE.MeshStandardMaterial({ color: 0xE8E8E8, roughness: 0.06, metalness: 0.98 }),
        neonGreen: new THREE.MeshStandardMaterial({ color: 0x00FF88, emissive: 0x00FF88, emissiveIntensity: 0.9, roughness: 0.3 }),
        neonRed: new THREE.MeshStandardMaterial({ color: 0xFF3355, emissive: 0xFF3355, emissiveIntensity: 0.9, roughness: 0.3 }),
        neonGold: new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.7, roughness: 0.3 }),
        marble: new THREE.MeshPhysicalMaterial({
            map: marbleSet.map,
            normalMap: marbleSet.normalMap,
            normalScale: new THREE.Vector2(0.25, 0.25),
            roughnessMap: marbleSet.roughnessMap,
            roughness: 0.18, metalness: 0.05,
            clearcoat: 0.85, clearcoatRoughness: 0.08,
            color: 0xFFFFFF,
        }),
        marbleDark: new THREE.MeshPhysicalMaterial({
            map: marbleDarkSet.map,
            normalMap: marbleDarkSet.normalMap,
            normalScale: new THREE.Vector2(0.25, 0.25),
            roughnessMap: marbleDarkSet.roughnessMap,
            roughness: 0.16, metalness: 0.06,
            clearcoat: 0.75, clearcoatRoughness: 0.08,
            color: 0xFFFFFF,
        }),
        plastic: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.35, metalness: 0.08 }),
        screen: new THREE.MeshStandardMaterial({ color: 0x002244, emissive: 0x003366, emissiveIntensity: 0.6 }),
        pokerCenterTexture,
    };
}

/* ==================================================================
   MAIN BUILD FUNCTION
   ================================================================== */
export function buildCasinoWorld(scene) {
    const M = createMaterials();
    const colliders = [];
    const interactionZones = [];

    // ---- FLOOR ----
    _buildFloor(scene, M);

    // ---- WALLS & CEILING ----
    _buildWalls(scene, M);
    _buildCeiling(scene, M);

    // ---- PILLARS ----
    _buildPillars(scene, M, colliders);

    // ---- LIGHTING ----
    _buildLighting(scene);

    // ---- BLACKJACK TABLE (left side) ----
    const bjPos = new THREE.Vector3(-6, 0, -4);
    _buildGameTable(scene, M, bjPos, 'blackjack', colliders);
    const bjZone = _buildFloorMarker(scene, bjPos, 0x00FF88, 'BLACKJACK');
    interactionZones.push({
        name: 'blackjack',
        position: bjPos.clone(),
        radius: 5.0,
        label: 'Blackjack',
        approachPos: new THREE.Vector3(bjPos.x, 1.7, bjPos.z + 5.5),
        lookAt: bjPos.clone().add(new THREE.Vector3(0, 0.5, 0))
    });

    // ---- POKER TABLE (right side) ----
    const pkPos = new THREE.Vector3(6, 0, -4);
    _buildGameTable(scene, M, pkPos, 'poker', colliders);
    _buildFloorMarker(scene, pkPos, 0xFFD700, 'POKER');
    interactionZones.push({
        name: 'poker',
        position: pkPos.clone(),
        radius: 5.0,
        label: 'Poker',
        approachPos: new THREE.Vector3(pkPos.x, 1.7, pkPos.z + 5.5),
        lookAt: pkPos.clone().add(new THREE.Vector3(0, 0.5, 0))
    });

    // ---- ROULETTE TABLE (center) ----
    const rtPos = new THREE.Vector3(0, 0, 1.2);
    _buildRouletteTable(scene, M, rtPos, colliders);
    _buildFloorMarker(scene, rtPos, 0xFF3355, 'ROULETTE');
    interactionZones.push({
        name: 'roulette',
        position: rtPos.clone(),
        radius: 4.6,
        label: 'Roleta',
        approachPos: new THREE.Vector3(rtPos.x, 1.7, rtPos.z + 4.6),
        lookAt: rtPos.clone().add(new THREE.Vector3(0, 0.9, 0))
    });

    // ---- ATM (back wall) ----
    const atmPos = new THREE.Vector3(0, 0, -12);
    _buildATM(scene, M, atmPos, colliders);
    interactionZones.push({
        name: 'atm',
        position: atmPos.clone(),
        radius: 2.2,
        label: 'Multibanco',
        approachPos: new THREE.Vector3(0, 1.7, -10),
        lookAt: atmPos.clone().add(new THREE.Vector3(0, 1.2, 0))
    });

    // ---- BAR AREA ----
    const barPos = new THREE.Vector3(0, 0, 10);
    _buildBar(scene, M, barPos, colliders);
    interactionZones.push({
        name: 'bar',
        position: barPos.clone(),
        radius: 3.6,
        label: 'Bar',
        approachPos: new THREE.Vector3(barPos.x, 1.7, barPos.z + 2.15),
        lookAt: barPos.clone().add(new THREE.Vector3(0, 1.05, -0.15))
    });

    // ---- SLOT MACHINES ----
    const slotZones = _buildSlotMachines(scene, M, colliders);
    interactionZones.push(...slotZones);

    // ---- DECORATIONS ----
    _buildDecorations(scene, M, colliders);

    // ---- ROPES & STANCHIONS ----
    _buildStanchions(scene, M, colliders);

    return { colliders, interactionZones };
}

/* ---- Floor ----
   Carpete com damasco bordeaux-violeta + faixa central em mármore
   escuro (passadeira). O carpete tem normal map para fibras
   subtilmente em relevo; o mármore tem clearcoat para reflexões. */
function _buildFloor(scene, M) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), M.carpet);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01;
    floor.receiveShadow = true; scene.add(floor);

    // Marble walkway strip (passadeira de mármore escuro)
    const stripGeo = new THREE.PlaneGeometry(2.5, ROOM_D - 2);
    const strip = new THREE.Mesh(stripGeo, M.marbleDark);
    strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.002, 0);
    strip.receiveShadow = true; scene.add(strip);

    // Gold trim on either side of the strip
    const trimGeo = new THREE.PlaneGeometry(0.06, ROOM_D - 2);
    [-1.27, 1.27].forEach(x => {
        const trim = new THREE.Mesh(trimGeo, M.gold);
        trim.rotation.x = -Math.PI / 2; trim.position.set(x, 0.003, 0);
        scene.add(trim);
    });
}

/* ---- Walls ----
   Papel-de-parede em damasco com medalhões dourados + lambrim
   inferior em madeira escura para um look "art-déco / Las Vegas". */
function _buildWalls(scene, M) {
    const hw = ROOM_W / 2, hd = ROOM_D / 2;

    // Wall panels
    const wallGeo = new THREE.PlaneGeometry(ROOM_W, WALL_H);
    const walls = [
        { pos: [0, WALL_H/2, -hd], rot: [0, 0, 0] },
        { pos: [0, WALL_H/2,  hd], rot: [0, Math.PI, 0] },
        { pos: [-hw, WALL_H/2, 0], rot: [0, Math.PI/2, 0] },
        { pos: [hw, WALL_H/2, 0],  rot: [0, -Math.PI/2, 0] },
    ];
    walls.forEach(({ pos, rot }) => {
        const w = new THREE.Mesh(wallGeo, M.wall);
        w.position.set(...pos); w.rotation.set(...rot);
        w.receiveShadow = true; scene.add(w);
    });

    // Wainscoting (lower wall panels) — madeira com normal map
    const wainGeo = new THREE.PlaneGeometry(ROOM_W, 1.2);
    walls.forEach(({ pos, rot }) => {
        const w = new THREE.Mesh(wainGeo, M.darkWood);
        w.position.set(pos[0], 0.6, pos[2]);
        w.rotation.set(...rot);
        w.position.z += (rot[1] === 0 ? 0.01 : rot[1] === Math.PI ? -0.01 : 0);
        w.position.x += (rot[1] === Math.PI/2 ? 0.01 : rot[1] === -Math.PI/2 ? -0.01 : 0);
        w.receiveShadow = true; scene.add(w);
    });

    // Chair-rail (faixa de remate) entre lambrim e papel
    const railGeo = new THREE.BoxGeometry(ROOM_W + 0.05, 0.07, 0.06);
    walls.forEach(({ pos, rot }) => {
        const r = new THREE.Mesh(railGeo, M.gold);
        r.position.set(pos[0], 1.22, pos[2]);
        r.rotation.set(...rot);
        scene.add(r);
    });

    // Crown molding
    const moldGeo = new THREE.BoxGeometry(ROOM_W + 0.2, 0.12, 0.15);
    [[-hd, 0], [hd, Math.PI]].forEach(([z, ry]) => {
        const mold = new THREE.Mesh(moldGeo, M.gold);
        mold.position.set(0, WALL_H - 0.06, z);
        mold.rotation.y = ry; scene.add(mold);
    });
    const moldGeo2 = new THREE.BoxGeometry(0.15, 0.12, ROOM_D + 0.2);
    [[-hw, 0], [hw, 0]].forEach(([x]) => {
        const mold = new THREE.Mesh(moldGeo2, M.gold);
        mold.position.set(x, WALL_H - 0.06, 0); scene.add(mold);
    });

    // Baseboards
    const baseGeo = new THREE.BoxGeometry(ROOM_W + 0.1, 0.1, 0.08);
    [[-hd, 0], [hd, Math.PI]].forEach(([z, ry]) => {
        const b = new THREE.Mesh(baseGeo, M.darkWood);
        b.position.set(0, 0.05, z); b.rotation.y = ry; scene.add(b);
    });
}

/* ---- Ceiling ----
   Tecto com textura de cofres. As "boxes" originais ficam por cima
   como bordas em relevo geométrico real (a textura cuida do interior). */
function _buildCeiling(scene, M) {
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), M.ceiling);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = WALL_H;
    scene.add(ceil);

    // Ceiling coffer borders (slim gold dividers — provide real geometry depth)
    const beamMatX = M.gold;
    const beamGeoX = new THREE.BoxGeometry(ROOM_W, 0.04, 0.10);
    for (let z = -10; z <= 10; z += 5) {
        const b = new THREE.Mesh(beamGeoX, beamMatX);
        b.position.set(0, WALL_H - 0.02, z);
        scene.add(b);
    }
    const beamGeoZ = new THREE.BoxGeometry(0.10, 0.04, ROOM_D);
    for (let x = -10; x <= 10; x += 5) {
        const b = new THREE.Mesh(beamGeoZ, beamMatX);
        b.position.set(x, WALL_H - 0.02, 0);
        scene.add(b);
    }
}

/* ---- Pillars ---- */
function _buildPillars(scene, M, colliders) {
    const pillarPositions = [
        [-10, -8], [10, -8], [-10, 8], [10, 8],
    ];
    pillarPositions.forEach(([x, z]) => {
        const group = new THREE.Group();
        // Base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.3, 16), M.marble);
        base.position.y = 0.15; base.castShadow = true; group.add(base);
        // Shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, WALL_H - 0.6, 12), M.marble);
        shaft.position.y = WALL_H / 2; shaft.castShadow = true; group.add(shaft);
        // Capital
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.3, 16), M.marble);
        cap.position.y = WALL_H - 0.15; group.add(cap);
        // Gold ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 24), M.gold);
        ring.position.y = WALL_H / 2 + 1; ring.rotation.x = Math.PI / 2; group.add(ring);

        group.position.set(x, 0, z);
        scene.add(group);
        colliders.push({
            min: new THREE.Vector3(x - 0.5, 0, z - 0.5),
            max: new THREE.Vector3(x + 0.5, WALL_H, z + 0.5)
        });
    });
}

/* ---- Lighting ----
   Casino noturno e cinematográfico (técnicas do ICG-05). Combina:
     - Hemisphere (luz indirecta tecto/chão)  → termo ambiente
     - DirectionalLight chave c/ sombras grandes → key light
     - Spots por mesa com sombras suaves       → directional + atten.
     - Sconces de parede como point lights     → point lights
     - Candelabro central com bulbos visíveis  → realismo + emissive
     - RectAreaLight sobre o bar               → área-light (faz brilhar
                                                  realisticamente o mármore
                                                  do balcão, sem sombras)
     - Luzes RGB suaves para "ambiente neon"   → cor do ambiente Vegas */
function _buildLighting(scene) {
    // Hemisphere — radiação indirecta (cor do tecto vs cor do carpete)
    // Enhanced for richer indirect lighting
    scene.add(new THREE.HemisphereLight(0xFFF0D0, 0x2A1530, 0.24));

    // Subtle ambient warm fill (bem fraco — prevenção de sombras puras)
    // Increased for more natural ambient light
    scene.add(new THREE.AmbientLight(0xFFF1D6, 0.06));

    // Key directional light — vem alta e ligeiramente lateral, cobre
    // toda a sala com sombras unificadas. Valor baixo para não
    // anular a sensação de iluminação interior nocturna.
    const key = new THREE.DirectionalLight(0xFFECC0, 0.24);
    key.position.set(9, 15, 7);  // Slightly higher for better coverage
    key.target.position.set(0, 0.5, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;  // Closer to catch details
    key.shadow.camera.far = 45;    // Extended range
    key.shadow.camera.left = -18;  // Wider coverage
    key.shadow.camera.right = 18;
    key.shadow.camera.top = 18;
    key.shadow.camera.bottom = -18;
    key.shadow.bias = -0.0005;     // Improved bias for cleaner shadows
    key.shadow.normalBias = 0.018; // Fine-tuned for surface detail
    key.shadow.radius = 3.5;       // Softer shadow edges
    scene.add(key);
    scene.add(key.target);

    // Fill directional from the opposite side — softer, no shadow
    // Enhanced fill for better highlight separation
    const fillDir = new THREE.DirectionalLight(0xFFC080, 0.08);
    fillDir.position.set(-12, 9, -8);
    scene.add(fillDir);

    // Central chandelier — multiple bulbs hanging at the room centre
    _buildChandelier(scene, 0, WALL_H - 0.05, -2.6);
    _buildWallSconces(scene);

    // Area light over the bar (acrescenta highlights de glamour
    // no balcão de mármore) — enhanced for richer appearance
    const barArea = new THREE.RectAreaLight(0xFFC570, 4.0, 6, 1.2);
    barArea.position.set(0, 3.5, 9.2);
    barArea.lookAt(0, 1.1, 9.5);
    scene.add(barArea);

    // Overhead pendant per table
    [[-6, -4], [6, -4], [0, 1.2]].forEach(([x, z]) => {
        // Main table spot light with enhanced shadow quality
        const spot = new THREE.SpotLight(0xFFF8E1, 22, 12, Math.PI / 4.6, 0.6, 1.5);
        spot.position.set(x, WALL_H - 0.35, z + 0.12);
        spot.target.position.set(x, -0.05, z);
        spot.castShadow = true;
        spot.shadow.mapSize.set(1536, 1536);  // Increased shadow resolution
        spot.shadow.bias = -0.00035;
        spot.shadow.normalBias = 0.015;
        spot.shadow.radius = 2.5;
        scene.add(spot); scene.add(spot.target);

        // Warm fill spot light for depth
        const fillSpot = new THREE.SpotLight(0xFFD4A3, 3.5, 8, Math.PI / 6, 0.8, 1.8);
        fillSpot.position.set(x - 1.5, WALL_H - 0.8, z);
        fillSpot.target.position.set(x, 0, z);
        scene.add(fillSpot); scene.add(fillSpot.target);

        // Lamp shade with improved material
        const shade = new THREE.Mesh(
            new THREE.ConeGeometry(0.92, 0.48, 16, 1, true),
            new THREE.MeshPhysicalMaterial({ 
                color: 0x1B5E20, 
                roughness: 0.25, 
                metalness: 0.6, 
                side: THREE.DoubleSide,
                emissive: 0x0A2A0A,
                emissiveIntensity: 0.15
            })
        );
        shade.position.set(x, WALL_H - 0.6, z + 0.12);
        shade.castShadow = true; 
        scene.add(shade);
        
        // Inner diffuser
        const inner = new THREE.Mesh(
            new THREE.ConeGeometry(0.88, 0.43, 16, 1, true),
            new THREE.MeshStandardMaterial({ 
                color: 0xFFF8E1, 
                roughness: 0.85, 
                side: THREE.BackSide,
                emissive: 0xFFE880,
                emissiveIntensity: 0.5
            })
        );
        inner.position.copy(shade.position); 
        scene.add(inner);
        
        // Cable
        const cable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.016, 0.016, 1.2, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 })
        );
        cable.position.set(x, WALL_H - 0.02, z); 
        scene.add(cable);
    });

    // ATM area spot with better color temperature
    const atmSpot = new THREE.SpotLight(0xE0F0FF, 18, 10, Math.PI/4.5, 0.35, 1.3);
    atmSpot.position.set(0, WALL_H - 0.25, -12);
    atmSpot.target.position.set(0, 1, -12.5);
    atmSpot.castShadow = true;
    atmSpot.shadow.mapSize.set(1024, 1024);
    scene.add(atmSpot); scene.add(atmSpot.target);

    // Bar area warm light — enhanced
    const barLight = new THREE.SpotLight(0xFFB84D, 5, 7, Math.PI / 6, 0.76, 2.0);
    barLight.position.set(0, 3.2, 10.6);
    barLight.target.position.set(0, 1.05, 10);
    barLight.castShadow = true;
    barLight.shadow.mapSize.set(1024, 1024);
    scene.add(barLight); scene.add(barLight.target);

    // Low fill only, so local lights still define the room.
    const fill1 = new THREE.PointLight(0xFFC080, 0.25, 10);
    fill1.position.set(-9, 4.5, 0); scene.add(fill1);
    const fill2 = new THREE.PointLight(0xFFC080, 0.25, 10);
    fill2.position.set(9, 4.5, 0); scene.add(fill2);

    // Subtle coloured rim lights from the entrance — enhanced for more drama
    const rim = new THREE.PointLight(0xFF5599, 0.35, 12);
    rim.position.set(0, 2.8, 13.5); scene.add(rim);
    const rim2 = new THREE.PointLight(0x5599FF, 0.25, 10);
    rim2.position.set(0, 2.8, -13.5); scene.add(rim2);
}

/* ---- Wall sconces ----
   Apliques pequenos com point lights de baixa intensidade. Preenchem
   as laterais da sala sem competir com os spots das mesas. */
function _buildWallSconces(scene) {
    const metalMat = new THREE.MeshStandardMaterial({
        color: 0xB08D2F,
        roughness: 0.22,
        metalness: 0.78,
    });
    const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xFFF0C0,
        emissive: 0xFFD080,
        emissiveIntensity: 1.9,
        roughness: 0.18,
    });

    const sconces = [
        { pos: [-13.82, 3.0, -7.5], rotY: Math.PI / 2 },
        { pos: [-13.82, 3.0,  0.0], rotY: Math.PI / 2 },
        { pos: [-13.82, 3.0,  7.5], rotY: Math.PI / 2 },
        { pos: [ 13.82, 3.0, -7.5], rotY: -Math.PI / 2 },
        { pos: [ 13.82, 3.0,  0.0], rotY: -Math.PI / 2 },
        { pos: [ 13.82, 3.0,  7.5], rotY: -Math.PI / 2 },
        { pos: [-7.0, 3.0, -13.82], rotY: 0 },
        { pos: [ 7.0, 3.0, -13.82], rotY: 0 },
        { pos: [-7.0, 3.0,  13.82], rotY: Math.PI },
        { pos: [ 7.0, 3.0,  13.82], rotY: Math.PI },
    ];

    sconces.forEach(({ pos, rotY }) => {
        const g = new THREE.Group();
        const backplate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.045, 18), metalMat);
        backplate.rotation.x = Math.PI / 2;
        g.add(backplate);

        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 8), metalMat);
        arm.rotation.x = Math.PI / 2;
        arm.position.z = 0.18;
        g.add(arm);

        const shade = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.075, 0.26, 18, 1, true),
            metalMat
        );
        shade.position.set(0, 0.10, 0.37);
        shade.castShadow = true;
        g.add(shade);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), bulbMat);
        bulb.position.set(0, 0.06, 0.37);
        g.add(bulb);

        const light = new THREE.SpotLight(0xFFD090, 0.9, 5.2, Math.PI / 5.5, 0.65, 1.7);
        light.position.set(0, 0.08, 0.37);
        light.target.position.set(0, 0.95, 0.24);
        g.add(light);
        g.add(light.target);

        g.position.set(...pos);
        g.rotation.y = rotY;
        scene.add(g);
    });
}

/* ---- Chandelier ----
   Anel dourado pendente do tecto com bulbos emissivos ao redor.
   Cada bulbo tem uma point-light fraca → contribui para a iluminação
   global e gera reflexões nos materiais brilhantes (mármore, ouro). */
function _buildChandelier(scene, cx, ceilY, cz) {
    const g = new THREE.Group();
    // Cable
    const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    cable.position.y = ceilY - 0.25; g.add(cable);
    // Top boss
    const boss = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.18, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.18, metalness: 0.9 })
    );
    boss.position.y = ceilY - 0.55; g.add(boss);
    // Main ring
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.04, 8, 36),
        new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.18, metalness: 0.95 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ceilY - 0.85; g.add(ring);
    // Inner ring (smaller)
    const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.03, 8, 28),
        new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.18, metalness: 0.95 })
    );
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = ceilY - 0.65; g.add(ring2);
    // Spokes connecting rings
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spoke = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6),
            new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.2, metalness: 0.9 })
        );
        spoke.position.set(Math.cos(a) * 0.7, ceilY - 0.75, Math.sin(a) * 0.7);
        spoke.rotation.z = Math.cos(a) * 0.5;
        spoke.rotation.x = Math.sin(a) * 0.5;
        g.add(spoke);
    }
    // Bulbs around the ring (12 bulbs)
    const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xFFF3D0, emissive: 0xFFD78A, emissiveIntensity: 3.5,
        roughness: 0.2, metalness: 0,
    });
    const bulbCount = 12;
    for (let i = 0; i < bulbCount; i++) {
        const a = (i / bulbCount) * Math.PI * 2;
        const bx = Math.cos(a) * 0.9, bz = Math.sin(a) * 0.9;
        const by = ceilY - 1.0;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), bulbMat);
        bulb.position.set(bx, by, bz); g.add(bulb);
        // Tiny light per bulb
        const pl = new THREE.PointLight(0xFFD78A, 0.45, 4);
        pl.position.set(bx, by, bz);
        g.add(pl);
    }
    // Central pendant crystal (large emissive sphere)
    const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshPhysicalMaterial({
            color: 0xFFF8DC, emissive: 0xFFE8A0, emissiveIntensity: 1.4,
            roughness: 0.05, metalness: 0.0,
            transmission: 0.6, ior: 1.7, thickness: 0.2,
            transparent: true,
        })
    );
    crystal.position.y = ceilY - 1.05; g.add(crystal);
    // Main downward light from chandelier
    const main = new THREE.PointLight(0xFFE7B5, 5, 14, 1.5);
    main.position.set(0, ceilY - 1.05, 0);
    g.add(main);

    g.position.set(cx, 0, cz);
    scene.add(g);
}

/* ---- Roulette Table ---- */
function _buildRouletteTable(scene, M, pos, colliders) {
    const g = new THREE.Group();

    const felt = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 2.5, 0.15, 42),
        new THREE.MeshStandardMaterial({ color: 0x0F5D3A, roughness: 0.86, metalness: 0 })
    );
    felt.position.y = 0.82;
    felt.receiveShadow = true;
    g.add(felt);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.12, 12, 48), M.darkWood);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.9;
    rim.castShadow = true;
    g.add(rim);

    const wheelBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.2, 0.2, 36),
        new THREE.MeshPhysicalMaterial({ color: 0x4E342E, roughness: 0.35, clearcoat: 0.45 })
    );
    wheelBase.position.y = 1.0;
    wheelBase.castShadow = true;
    g.add(wheelBase);

    const wheelRim = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.07, 10, 42),
        new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.2, metalness: 0.8 })
    );
    wheelRim.rotation.x = Math.PI / 2;
    wheelRim.position.y = 1.08;
    g.add(wheelRim);

    const centerCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.25, 18),
        new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.15, metalness: 0.8 })
    );
    centerCone.position.y = 1.2;
    g.add(centerCone);

    // Number ring hints
    const slots = 37;
    for (let i = 0; i < slots; i++) {
        const a = (i / slots) * Math.PI * 2;
        const slot = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.05, 0.17),
            new THREE.MeshStandardMaterial({
                color: i === 0 ? 0x0AA84F : (i % 2 === 0 ? 0xB71C1C : 0x151515),
                roughness: 0.4,
                metalness: 0.2,
            })
        );
        slot.position.set(Math.cos(a) * 0.95, 1.1, Math.sin(a) * 0.95);
        slot.rotation.y = -a;
        g.add(slot);
    }

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.12, 24), M.darkWood);
    base.position.y = 0.06;
    base.castShadow = true;
    g.add(base);

    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.72, 12), M.metal);
    col.position.y = 0.46;
    col.castShadow = true;
    g.add(col);

    // Dealer stools around roulette
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.2;
        const stool = _buildChair(M, Math.cos(a) * 3.4, Math.sin(a) * 3.4, -a + Math.PI / 2);
        g.add(stool);
    }

    g.position.copy(pos);
    scene.add(g);

    colliders.push({
        min: new THREE.Vector3(pos.x - 2.1, 0, pos.z - 2.1),
        max: new THREE.Vector3(pos.x + 2.1, 1.3, pos.z + 2.1)
    });
}

/* ---- Game Table ---- */
function _buildGameTable(scene, M, pos, type, colliders) {
    const g = new THREE.Group();

    // Felt surface
    const feltGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.16, 48);
    const felt = new THREE.Mesh(feltGeo, M.felt);
    felt.receiveShadow = true; felt.position.y = 0.82;
    g.add(felt);

    // Inner pad
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.008, 48), M.feltLight);
    pad.receiveShadow = true; pad.position.y = 0.91;
    g.add(pad);

    if (type === 'poker') {
        const center = new THREE.Mesh(
            new THREE.PlaneGeometry(2.35, 0.66),
            new THREE.MeshStandardMaterial({
                map: M.pokerCenterTexture,
                roughness: 0.88,
                metalness: 0,
            })
        );
        center.rotation.x = -Math.PI / 2;
        center.position.y = 0.925;
        center.renderOrder = 2;
        g.add(center);

        const centerGlow = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 0.84, 32),
            new THREE.MeshStandardMaterial({
                color: 0xD4AF37,
                emissive: 0xD4AF37,
                emissiveIntensity: 0.18,
                transparent: true,
                opacity: 0.28,
                roughness: 0.5,
            })
        );
        centerGlow.rotation.x = -Math.PI / 2;
        centerGlow.position.y = 0.926;
        g.add(centerGlow);
    }

    // Wood rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.13, 12, 48), M.darkWood);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.9;
    rim.castShadow = true; g.add(rim);

    // Armrest (padded leather)
    const armrest = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.1, 12, 48), M.leather);
    armrest.rotation.x = Math.PI / 2; armrest.position.y = 0.92;
    g.add(armrest);

    // Pedestal base
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.12, 24);
    const base = new THREE.Mesh(baseGeo, M.darkWood);
    base.position.y = 0.06; base.castShadow = true; g.add(base);

    // Central column
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.72, 12), M.metal);
    col.position.y = 0.46; col.castShadow = true; g.add(col);

    // Betting circles
    const circMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.2
    });
    const numCircles = type === 'blackjack' ? 3 : 4;
    for (let i = 0; i < numCircles; i++) {
        const angle = (i / numCircles) * Math.PI + Math.PI * 0.15;
        const r = 2.0;
        const circ = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 24), circMat);
        circ.rotation.x = -Math.PI / 2;
        circ.position.set(Math.cos(angle) * r, 0.92, Math.sin(angle) * r);
        g.add(circ);
    }

    // Chairs around the table
    for (let i = 0; i < (type === 'blackjack' ? 3 : 4); i++) {
        const totalSeats = type === 'blackjack' ? 3 : 4;
        const angle = (i / totalSeats) * Math.PI + Math.PI * 0.15;
        const dist = 4.0;
        const cx = Math.cos(angle) * dist;
        const cz = Math.sin(angle) * dist;
        const chair = _buildChair(M, cx, cz, -angle + Math.PI / 2);
        g.add(chair);
    }

    g.position.copy(pos);
    scene.add(g);

    // Collider for the table (just the pedestal/felt area)
    colliders.push({
        min: new THREE.Vector3(pos.x - 2.5, 0, pos.z - 2.5),
        max: new THREE.Vector3(pos.x + 2.5, 1.2, pos.z + 2.5)
    });
}

/* ---- Chair ---- */
function _buildChair(M, x, z, rotY) {
    const chair = new THREE.Group();

    // Seat
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), M.leatherBlack);
    seat.position.y = 0.65; seat.castShadow = true; chair.add(seat);

    // Seat cushion top (softer)
    const cushion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16),
        new THREE.MeshPhysicalMaterial({ color: 0x222222, roughness: 0.55, metalness: 0.02, clearcoat: 0.1 })
    );
    cushion.position.y = 0.71; chair.add(cushion);

    // Back rest
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.06), M.leatherBlack);
    back.position.set(0, 1.05, -0.22); back.rotation.x = 0.08;
    back.castShadow = true; chair.add(back);

    // Chrome pedestal
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), M.chrome);
    leg.position.y = 0.35; chair.add(leg);

    // Star base
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6), M.chrome);
        arm.position.set(Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12);
        arm.rotation.set(0, 0, Math.PI / 2);
        arm.rotation.y = a;
        arm.position.x = Math.cos(a) * 0.12;
        arm.position.z = Math.sin(a) * 0.12;
        chair.add(arm);
    }

    chair.position.set(x, 0, z);
    chair.rotation.y = rotY;
    return chair;
}

/* ---- Floor marker / zone label ---- */
function _buildFloorMarker(scene, pos, color, text) {
    // Glowing ring on floor
    const ringMat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.4, roughness: 0.5
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.9, 48), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, 0.005, pos.z);
    scene.add(ring);

    return ring;
}

/* ---- ATM Machine ---- */
function _buildATM(scene, M, pos, colliders) {
    const g = new THREE.Group();

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.6), M.plastic);
    body.position.y = 0.9; body.castShadow = true; g.add(body);

    // Screen
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), M.screen);
    screen.position.set(0, 1.25, 0.301); g.add(screen);

    // Screen glow
    const glow = new THREE.PointLight(0x0066BB, 1.5, 3);
    glow.position.set(0, 1.25, 0.5); g.add(glow);

    // Card slot
    const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.008, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    slot.position.set(0, 0.95, 0.301); g.add(slot);

    // Cash dispenser
    const dispenser = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.06, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    dispenser.position.set(0, 0.6, 0.301); g.add(dispenser);

    // Keypad
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const btn = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.05, 0.015),
                new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.4 })
            );
            btn.position.set(-0.08 + c * 0.08, 0.82 - r * 0.065, 0.3);
            g.add(btn);
        }
    }

    // Bank logo area
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x004488, emissive: 0x002244, emissiveIntensity: 0.4 }));
    logo.position.set(0, 1.6, 0.301); g.add(logo);

    // "MB" text – using small blocks
    const txtMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xCCCCCC, emissiveIntensity: 0.3 });
    // M
    [[-0.12,1.62],[-0.12,1.58],[-0.12,1.54],[-0.09,1.60],[-0.06,1.58],[-0.03,1.60],
     [0,1.62],[0,1.58],[0,1.54]].forEach(([x,y]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), txtMat);
        b.position.set(x, y, 0.307); g.add(b);
    });
    // B
    [[0.05,1.62],[0.05,1.58],[0.05,1.54],[0.08,1.62],[0.08,1.58],[0.08,1.54],
     [0.11,1.61],[0.11,1.59],[0.11,1.55]].forEach(([x,y]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), txtMat);
        b.position.set(x, y, 0.307); g.add(b);
    });

    g.position.copy(pos);
    g.rotation.y = Math.PI; // Face toward player
    scene.add(g);

    colliders.push({
        min: new THREE.Vector3(pos.x - 0.6, 0, pos.z - 0.5),
        max: new THREE.Vector3(pos.x + 0.6, 2, pos.z + 0.5)
    });
}

/* ---- Bar Area ---- */
function _buildBar(scene, M, pos, colliders) {
    const g = new THREE.Group();

    // Counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 0.8), M.darkWood);
    counter.position.set(0, 0.55, 0); counter.castShadow = true; g.add(counter);

    // Counter top (marble)
    const top = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.06, 0.9), M.marble);
    top.position.set(0, 1.12, 0); g.add(top);

    // Foot rest rail
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6, 8), M.chrome);
    rail.position.set(0, 0.22, 0.5); rail.rotation.z = Math.PI / 2; g.add(rail);

    // Back shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.05, 0.3), M.wood);
    shelf.position.set(0, 1.6, -0.6); g.add(shelf);

    // Back-bar bottles: glass body, label and cork so they read as drinks.
    const bottleColors = [0x2E7D32, 0x7B1B1B, 0xB8860B, 0x1B5E7A, 0x6A1B9A, 0x8D4B22];
    for (let i = 0; i < 8; i++) {
        const bColor = bottleColors[i % bottleColors.length];
        const bottle = new THREE.Group();
        const body2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.065, 0.34, 18),
            new THREE.MeshPhysicalMaterial({
                color: bColor, roughness: 0.06, metalness: 0.02,
                transparent: true, opacity: 0.62, clearcoat: 1.0,
                clearcoatRoughness: 0.05, transmission: 0.25,
            })
        );
        body2.position.y = 0.17; body2.castShadow = true; bottle.add(body2);
        const neck2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.034, 0.16, 14),
            body2.material
        );
        neck2.position.y = 0.42; neck2.castShadow = true; bottle.add(neck2);
        const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10),
            new THREE.MeshStandardMaterial({ color: 0xB98958, roughness: 0.8 }));
        cork.position.y = 0.52; bottle.add(cork);
        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.10),
            new THREE.MeshStandardMaterial({ color: 0xF5E6C8, roughness: 0.72, metalness: 0 }));
        label.position.set(0, 0.21, 0.066); bottle.add(label);
        bottle.position.set(-2.2 + i * 0.62, 1.64, -0.6);
        g.add(bottle);
    }

    // Bar stools
    for (let i = 0; i < 4; i++) {
        const stool = new THREE.Group();
        const seat2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), M.leatherBlack);
        seat2.position.y = 0.78; seat2.castShadow = true; stool.add(seat2);
        const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.75, 8), M.chrome);
        leg2.position.y = 0.4; stool.add(leg2);
        const footRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.01, 6, 16), M.chrome);
        footRing.position.y = 0.25; footRing.rotation.x = Math.PI / 2; stool.add(footRing);

        stool.position.set(-2 + i * 1.4, 0, 1.2);
        g.add(stool);
    }

    const bartender = createCharacter('Dealer', 0x5A1F2B, [0, 0.18, -1.05], [0, 0, 1.2]);
    bartender.scale.setScalar(1.08);
    bartender.userData.baseY = 0.18;
    g.add(bartender);

    g.position.copy(pos);
    scene.add(g);

    colliders.push({
        min: new THREE.Vector3(pos.x - 3.2, 0, pos.z - 0.6),
        max: new THREE.Vector3(pos.x + 3.2, 1.2, pos.z + 0.6)
    });
}

/* ---- Slot Machines ---- */
function _buildSlotMachines(scene, M, colliders) {
    const positions = [
        [-11, -2], [-11, 0], [-11, 2],
        [11, -2], [11, 0], [11, 2],
    ];
    const zones = [];
    positions.forEach(([x, z], idx) => {
        const g = new THREE.Group();
        const rotY = x < 0 ? Math.PI / 2 : -Math.PI / 2;

        // Body
        const bodyMat = new THREE.MeshPhysicalMaterial({
            color: 0x151515,
            roughness: 0.38,
            metalness: 0.18,
            clearcoat: 0.35,
            clearcoatRoughness: 0.22,
        });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.45, 0.62), bodyMat);
        body.position.y = 0.75; body.castShadow = true; g.add(body);

        const trimMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.2, metalness: 0.75 });
        const topTrim = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.66), trimMat);
        topTrim.position.y = 1.48; g.add(topTrim);
        const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.68), trimMat);
        baseTrim.position.y = 0.08; g.add(baseTrim);

        // Screen glow
        const colors = [0xFF3355, 0x00FF88, 0xFFD700, 0x3388FF, 0xFF6600, 0xCC33FF];
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x050505, emissive: colors[idx], emissiveIntensity: 0.22,
            roughness: 0.12, metalness: 0.2,
        });
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.46), screenMat);
        scr.position.set(0, 1.08, 0.316); g.add(scr);

        const reelMat = new THREE.MeshStandardMaterial({ color: 0xF6E8C8, roughness: 0.35, metalness: 0.05 });
        [-0.17, 0, 0.17].forEach((rx, rIdx) => {
            const reel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.012), reelMat);
            reel.position.set(rx, 1.08, 0.324);
            g.add(reel);
            const symbol = new THREE.Mesh(
                new THREE.CircleGeometry(0.04, 16),
                new THREE.MeshStandardMaterial({
                    color: [0xD32F2F, 0x2E7D32, 0xFBC02D][(idx + rIdx) % 3],
                    emissive: [0x330000, 0x003300, 0x332200][(idx + rIdx) % 3],
                    emissiveIntensity: 0.2,
                })
            );
            symbol.position.set(rx, 1.08, 0.332);
            g.add(symbol);
        });

        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), M.chrome);
        handle.position.set(0.4, 0.9, 0); g.add(handle);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), M.neonRed);
        knob.position.set(0.4, 1.12, 0); g.add(knob);

        // Top sign
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.24, 0.12),
            new THREE.MeshStandardMaterial({ color: 0x111111, emissive: colors[idx], emissiveIntensity: 0.35, roughness: 0.25 }));
        sign.position.set(0, 1.62, 0.08); g.add(sign);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.08, 18), trimMat);
        crown.position.set(0, 1.78, 0.03); g.add(crown);

        // Coin tray
        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.15), M.metal);
        tray.position.set(0, 0.15, 0.3); g.add(tray);

        g.position.set(x, 0, z);
        g.rotation.y = rotY;
        scene.add(g);
        zones.push({
            name: `slot-${idx + 1}`,
            position: new THREE.Vector3(x, 0, z),
            radius: 1.45,
            label: 'Slots',
            approachPos: new THREE.Vector3(x + (x < 0 ? 1.0 : -1.0), 1.7, z),
            lookAt: new THREE.Vector3(x, 1.0, z)
        });

        colliders.push({
            min: new THREE.Vector3(x - 0.5, 0, z - 0.5),
            max: new THREE.Vector3(x + 0.5, 1.6, z + 0.5)
        });
    });
    return zones;
}

/* ---- Decorations ---- */
function _buildDecorations(scene, M, colliders) {
    // Potted plants
    const plantPositions = [[-12, -12], [12, -12], [-12, 12], [12, 12], [-6, 8], [6, 8]];
    plantPositions.forEach(([x, z]) => {
        const g = new THREE.Group();
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.36, 18), M.marbleDark);
        pot.position.y = 0.175; pot.castShadow = true; g.add(pot);
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 10),
            new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.95 }));
        soil.position.y = 0.36; g.add(soil);
        // Trunk
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.45, 8),
            new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.8 }));
        trunk.position.y = 0.58; g.add(trunk);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x1F7A3A, roughness: 0.72, side: THREE.DoubleSide });
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), leafMat);
            leaf.position.set(Math.cos(a) * 0.18, 0.78 + (i % 3) * 0.07, Math.sin(a) * 0.18);
            leaf.scale.set(0.45, 0.12, 1.15);
            leaf.rotation.set(0.65, a, 0.25);
            g.add(leaf);
        }
        const topLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), leafMat);
        topLeaf.position.y = 1.0;
        topLeaf.scale.set(0.85, 0.22, 1.1);
        g.add(topLeaf);

        g.position.set(x, 0, z);
        scene.add(g);
    });

    // Flat framed paintings on walls.
    const paintingColors = [0x880E4F, 0x004D40, 0x1A237E, 0xBF360C];
    [
        [-13.9, 3, -4, 0, Math.PI/2, 0],
        [-13.9, 3, 4, 0, Math.PI/2, 0],
        [13.9, 3, -4, 0, -Math.PI/2, 0],
        [13.9, 3, 4, 0, -Math.PI/2, 0],
    ].forEach(([x, y, z, rx, ry, rz], i) => {
        const group = new THREE.Group();
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.08, 1.62), M.gold);
        back.castShadow = true;
        group.add(back);
        const art = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.34),
            new THREE.MeshStandardMaterial({ color: paintingColors[i], roughness: 0.72, metalness: 0.02 }));
        art.position.y = 0.045;
        art.rotation.x = -Math.PI / 2;
        group.add(art);
        const slash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 1.1),
            new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.35, metalness: 0.4 }));
        slash.position.set(0.12, 0.055, 0);
        slash.rotation.y = -0.24;
        group.add(slash);
        group.position.set(x + (x > 0 ? -0.035 : 0.035), y, z);
        group.rotation.set(rx, ry + (x > 0 ? Math.PI / 2 : -Math.PI / 2), rz);
        scene.add(group);
    });

    // Ceiling fans (slow)
    [[-6, 3], [6, 3], [0, -8]].forEach(([x, z]) => {
        const fan = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), M.chrome);
        hub.position.y = WALL_H - 0.15; fan.add(hub);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), M.chrome);
        rod.position.y = WALL_H - 0.35; fan.add(rod);
        for (let i = 0; i < 4; i++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.18),
                new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.6 }));
            blade.position.y = WALL_H - 0.55;
            blade.rotation.y = (i / 4) * Math.PI * 2;
            blade.position.x = Math.cos(blade.rotation.y) * 0.5;
            blade.position.z = Math.sin(blade.rotation.y) * 0.5;
            fan.add(blade);
        }
        fan.position.set(x, 0, z);
        fan.userData.isFan = true;
        fan.userData.spinSpeed = 1.15 + Math.abs(x) * 0.05;
        scene.add(fan);
    });
}

/* ---- Stanchions/Ropes ---- */
function _buildStanchions(scene, M, colliders) {
    // VIP rope barriers between areas
    const stanchionPairs = [
        [[-2, 6], [2, 6]],
    ];
    stanchionPairs.forEach(([a, b]) => {
        // Posts
        [a, b].forEach(([x, z]) => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.0, 8), M.gold);
            post.position.set(x, 0.5, z); post.castShadow = true; scene.add(post);
            const top2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), M.gold);
            top2.position.set(x, 1.02, z); scene.add(top2);
            const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 12), M.gold);
            base2.position.set(x, 0.025, z); scene.add(base2);
            colliders.push({
                min: new THREE.Vector3(x - 0.28, 0, z - 0.28),
                max: new THREE.Vector3(x + 0.28, 1.2, z + 0.28),
            });
        });
        // Rope (catenary curve)
        const ropeColor = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.7 });
        const points = [];
        for (let t = 0; t <= 1; t += 0.05) {
            const x2 = a[0] + (b[0] - a[0]) * t;
            const z2 = a[1] + (b[1] - a[1]) * t;
            const sag = -0.15 * Math.sin(t * Math.PI);
            points.push(new THREE.Vector3(x2, 0.9 + sag, z2));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.018, 6, false);
        const rope = new THREE.Mesh(tubeGeo, ropeColor);
        scene.add(rope);

        const minX = Math.min(a[0], b[0]) - 0.34;
        const maxX = Math.max(a[0], b[0]) + 0.34;
        const minZ = Math.min(a[1], b[1]) - 0.34;
        const maxZ = Math.max(a[1], b[1]) + 0.34;
        colliders.push({
            min: new THREE.Vector3(minX, 0, minZ),
            max: new THREE.Vector3(maxX, 1.2, maxZ),
        });
    });
}

/* ==================================================================
   Utility – get spawn position
   ================================================================== */
export function getSpawnPosition() {
    return new THREE.Vector3(0, 1.7, 5);
}

export function getSpawnLookAt() {
    return new THREE.Vector3(0, 1.5, -4);
}
