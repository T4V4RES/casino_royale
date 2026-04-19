/*
 * 3D Casino Scene Construction
 * Demonstrates 3D modeling concepts from ICG course:
 * - Scene graphs (hierarchical transformations)
 * - Primitive geometry (PlaneGeometry, CylinderGeometry, SphereGeometry, etc)
 * - Material properties (MeshPhongMaterial for lighting interaction)
 * - Transformation matrices (rotation, translation, scaling)
 */

/**
 * Main casino environment builder
 * Creates floor, walls, ceiling, columns, chandelier, bar, and three game tables
 * Uses group hierarchies to manage complex scene structure
 */
function buildCasino() {
  const root = new THREE.Group();
  scene.add(root);

  // ─── FLOOR (Carpet) ───
  const floorMat = new THREE.MeshPhongMaterial({
    map: mkCarpetTex(),
    shininess: 4,
    specular: new THREE.Color(0x0a0808)
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), floorMat);
  floor.rotation.x = -Math.PI / 2; // Rotate to horizontal
  floor.receiveShadow = true;
  root.add(floor);

  // ─── CEILING ───
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 32),
    new THREE.MeshPhongMaterial({ color: 0x120e08, shininess: 2 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 5.2;
  root.add(ceiling);

  // ─── WALLS (4 planes) ───
  const wallMat = new THREE.MeshPhongMaterial({
    map: mkWallTex(),
    shininess: 12,
    specular: new THREE.Color(0x1a1408)
  });
  [
    [0, 2.6, -16, 0, 0, 0],       // Back wall
    [0, 2.6, 16, 0, Math.PI, 0],  // Front wall
    [-16, 2.6, 0, 0, Math.PI / 2, 0],   // Left wall
    [16, 2.6, 0, 0, -Math.PI / 2, 0]    // Right wall
  ].forEach(([x, y, z, rx, ry, rz]) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 5.2), wallMat);
    wall.position.set(x, y, z);
    wall.rotation.set(rx, ry, rz);
    wall.receiveShadow = true;
    root.add(wall);
  });

  // ─── GOLD SKIRTING / BASE TRIM ───
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xd4af37,
    shininess: 90,
    specular: new THREE.Color(0xffd060)
  });
  [
    { size: [32, 0.18, 0.12], pos: [0, 0.09, -15.95] },
    { size: [32, 0.18, 0.12], pos: [0, 0.09, 15.95] },
    { size: [0.12, 0.18, 32], pos: [-15.95, 0.09, 0] },
    { size: [0.12, 0.18, 32], pos: [15.95, 0.09, 0] }
  ].forEach(({ size, pos }) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(...size), goldMat);
    trim.position.set(...pos);
    root.add(trim);
  });

  // ─── COLUMNS (Scene graph example: group with shaft + capitals + bases) ───
  const colMat = new THREE.MeshPhongMaterial({
    color: 0x221508,
    shininess: 35,
    specular: new THREE.Color(0x3a2a10)
  });
  [[-10, 4], [-10, -4], [10, 4], [10, -4]].forEach(([x, z]) => {
    const columnGroup = new THREE.Group();

    // Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 5, 8), colMat);
    shaft.position.y = 2.5;
    shaft.castShadow = true;
    columnGroup.add(shaft);

    // Capital (top)
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.28, 0.3, 8), goldMat);
    capital.position.y = 5.15;
    columnGroup.add(capital);

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.18, 8), goldMat);
    base.position.y = 0.09;
    columnGroup.add(base);

    columnGroup.position.set(x, 0, z);
    root.add(columnGroup);
  });

  // ─── CHANDELIER ───
  buildChandelier(root, 0, 5, 0);

  // ─── BAR (Back wall decoration) ───
  buildBar(root);

  // ─── TABLES ───
  // Three different table types with game logic
  const blackjackTable = buildBlackjackTable();
  blackjackTable.group.position.set(-6.5, 0, -2);
  blackjackTable.group.rotation.y = Math.PI / 8;
  scene.add(blackjackTable.group);
  tables.push(blackjackTable);

  const rouletteTable = buildRouletteTable();
  rouletteTable.group.position.set(0.5, 0, -5.5);
  scene.add(rouletteTable.group);
  tables.push(rouletteTable);

  const pokerTable = buildPokerTable();
  pokerTable.group.position.set(7, 0, -1.5);
  pokerTable.group.rotation.y = -Math.PI / 10;
  scene.add(pokerTable.group);
  tables.push(pokerTable);
}

/**
 * Builds ornate chandelier
 * Demonstrates: TorusGeometry, SphereGeometry, scene graph hierarchy
 */
function buildChandelier(parent, x, y, z) {
  const g = new THREE.Group();

  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xd4af37,
    shininess: 100,
    specular: new THREE.Color(0xffe080)
  });

  const gemMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 200,
    specular: new THREE.Color(0xffffff),
    transparent: true,
    opacity: 0.8
  });

  const bulbMat = new THREE.MeshPhongMaterial({
    color: 0xffffcc,
    emissive: new THREE.Color(0xffffaa),
    emissiveIntensity: 0.5,
    shininess: 20
  });

  // Main ring (TorusGeometry: radius, tube width, radial segments, tubular segments)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 8, 24), goldMat);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  // Chain to ceiling
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), goldMat);
  chain.position.y = 0.35;
  g.add(chain);

  // Pendant gems around ring
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), gemMat);
    gem.position.set(Math.cos(angle) * 1.1, -0.18, Math.sin(angle) * 1.1);
    g.add(gem);
  }

  // Bulbs around ring
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bulbMat);
    bulb.position.set(Math.cos(angle) * 0.95, -0.04, Math.sin(angle) * 0.95);
    g.add(bulb);
  }

  // Center disk
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16), goldMat);
  disk.position.y = 0;
  g.add(disk);

  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * Builds back wall bar counter
 * Includes counter, shelves, and procedural bottle arrangement
 */
function buildBar(parent) {
  const woodMat = new THREE.MeshPhongMaterial({ color: 0x200a04, shininess: 40 });
  const marbleMat = new THREE.MeshPhongMaterial({
    color: 0xc8c0b0,
    shininess: 70,
    specular: new THREE.Color(0x807060)
  });

  const barGroup = new THREE.Group();

  // Counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, 1.1), woodMat);
  counter.position.y = 0.55;
  counter.castShadow = true;
  barGroup.add(counter);

  // Marble top
  const top = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.09, 1.2), marbleMat);
  top.position.y = 1.11;
  barGroup.add(top);

  // Shelves
  [2.2, 3.0, 3.8].forEach(shelfY => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(8, 0.06, 0.4), marbleMat);
    shelf.position.set(0, shelfY, -0.5);
    barGroup.add(shelf);
  });

  // Bottles (color variety of CylinderGeometry)
  const bottleColors = [0x4a7f3a, 0x8a3a10, 0xc0a020, 0x303880, 0x9a2020];
  for (let i = 0; i < 15; i++) {
    const bottleMat = new THREE.MeshPhongMaterial({
      color: bottleColors[i % 5],
      shininess: 60,
      transparent: true,
      opacity: 0.75
    });
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.38, 8), bottleMat);
    bottle.position.set(-3.5 + i * 0.5, 2.25 + ((i % 2) * 0.05), -0.5);
    barGroup.add(bottle);
  }

  barGroup.position.set(0, 0, -14.5);
  parent.add(barGroup);
}

/**
 * Helper: Adds a sign above table with text
 */
function addSign(parent, line1, line2, x, y, z) {
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.42),
    new THREE.MeshPhongMaterial({ map: mkSignTex(line1, line2) })
  );
  sign.position.set(x, y, z);
  sign.rotation.x = -0.2; // Slight angle toward camera
  parent.add(sign);
}

/**
 * Helper: Adds a stack of colored chips
 * Used for table decorations and visual appeal
 */
function addChipStack(parent, [x, y, z], colors, scale = 1) {
  const group = new THREE.Group();

  colors.forEach((color, i) => {
    const mat = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 55,
      specular: new THREE.Color(0xffffff)
    });
    const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.022, 16), mat);
    chip.position.y = i * 0.023;
    chip.castShadow = true;
    group.add(chip);
  });

  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  parent.add(group);
}
