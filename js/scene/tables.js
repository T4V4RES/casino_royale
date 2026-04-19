/*
 * Game Table Builders
 * Three distinct table types with different geometries and game logic
 * Demonstrates: CircleGeometry, TorusGeometry, scene graph transformations
 */

/**
 * Builds Blackjack table (dealer shoe shape)
 * D-shaped with felt surface andgold trim
 */
function buildBlackjackTable() {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshPhongMaterial({
    color: 0x3a1a08,
    shininess: 45,
    specular: new THREE.Color(0x5a3010)
  });

  const feltMat = new THREE.MeshPhongMaterial({ color: 0x1a5c28, shininess: 4 });
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xd4af37,
    shininess: 80,
    specular: new THREE.Color(0xffd060)
  });

  // D-shaped body (half-cylinder)
  // CylinderGeometry: (radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 0.21, 0.16, 16, 1, false, 0, Math.PI),
    woodMat
  );
  body.position.y = 0.79;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Green felt surface (half-circle)
  const feltGeo = new THREE.CircleGeometry(1.96, 16, 0, Math.PI);
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.rotation.x = -Math.PI / 2; // Lay flat
  felt.position.y = 0.88;
  felt.receiveShadow = true;
  group.add(felt);

  // Felt markings plane
  const markMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.5),
    new THREE.MeshPhongMaterial({
      map: mkBJFeltTex(),
      shininess: 3,
      transparent: true,
      opacity: 0.9
    })
  );
  markMesh.rotation.x = -Math.PI / 2;
  markMesh.position.set(0, 0.882, -0.5);
  group.add(markMesh);

  // Gold rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.96, 0.05, 8, 16, Math.PI),
    goldMat
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.9;
  group.add(rim);

  // Legs (4 cylinders)
  const legMat = new THREE.MeshPhongMaterial({ color: 0x280a04, shininess: 20 });
  [[-0.85, -0.7], [0.85, -0.7], [-0.85, 0.05], [0.85, 0.05]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.79, 8), legMat);
    leg.position.set(lx, 0.395, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Chip tray
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.18), goldMat);
  tray.position.set(0, 0.9, -1.65);
  group.add(tray);

  // Sign
  addSign(group, 'BLACKJACK', 'PAYS 3 TO 2', 0, 1.55, -1.75);

  // Deck prop
  const deckMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.09, 0.25),
    new THREE.MeshPhongMaterial({ map: mkCardBackTex(), shininess: 15 })
  );
  deckMesh.position.set(0.85, 0.92, -1.5);
  group.add(deckMesh);

  // Chip stacks
  addChipStack(group, [-0.75, 0.88, -1.5], [0xcc2222, 0x2255cc, 0x22aa44, 0xddaa00, 0xcccccc]);

  // Camera position when entering table
  const camPos = new THREE.Vector3(0, 4.8, -0.6);
  const camLook = new THREE.Vector3(0, 0.88, -0.6);

  return { group, type: 'blackjack', r: 3.5, camPos, camLook, game: new BlackjackGame() };
}

/**
 * Builds Roulette table with spinning wheel
 * Complex scene graph: wheel spinner, ball, spokes
 */
function buildRouletteTable() {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshPhongMaterial({ color: 0x2a1408, shininess: 30 });
  const feltMat = new THREE.MeshPhongMaterial({ color: 0x1a5c28, shininess: 3 });
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xd4af37,
    shininess: 80,
    specular: new THREE.Color(0xffd060)
  });

  // Table body
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.16, 2.6), woodMat);
  body.position.y = 0.79;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Felt
  const felt = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.01, 2.5), feltMat);
  felt.position.y = 0.88;
  felt.receiveShadow = true;
  group.add(felt);

  // Betting grid on right side
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2.1),
    new THREE.MeshPhongMaterial({ map: mkBetGridTex(), shininess: 4 })
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(1, 0.882, 0);
  group.add(grid);

  // Gold frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.08, 2.7), goldMat);
  frame.position.y = 0.75;
  group.add(frame);

  // Legs
  const legMat = new THREE.MeshPhongMaterial({ color: 0x280a04, shininess: 20 });
  [[-2.3, -1], [2.3, -1], [-2.3, 1], [2.3, 1]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.79, 8), legMat);
    leg.position.set(lx, 0.395, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Wheel group
  const wheelGroup = buildRouletteWheel();
  wheelGroup.position.set(-1.7, 0.88, 0);
  group.add(wheelGroup);
  group.userData.wheelGroup = wheelGroup;
  group.userData.ballAngle = 0;
  group.userData.spinning = false;

  // Sign
  addSign(group, 'ROULETTE', 'EUROPEAN · 37 NUMBERS', 0, 1.6, -1.4);

  // Chips
  addChipStack(group, [1.6, 0.88, -0.95], [0xcc2222, 0xdddd22, 0x2255cc]);

  const camPos = new THREE.Vector3(0.2, 5.2, 0);
  const camLook = new THREE.Vector3(0.2, 0.88, 0);

  return { group, type: 'roulette', r: 3.8, camPos, camLook, game: new RouletteGame() };
}

/**
 * Builds spinning roulette wheel
 * Complex hierarchical scene graph: spinner group with spokes, hub, ball
 * Demonstrates: rotation in local coordinate systems
 */
function buildRouletteWheel() {
  const g = new THREE.Group();

  const woodMat = new THREE.MeshPhongMaterial({
    color: 0x200c04,
    shininess: 60,
    specular: new THREE.Color(0x3a2010)
  });

  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xd4af37,
    shininess: 100,
    specular: new THREE.Color(0xffe060)
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.15
  });

  // Outer rim (decorative)
  const outerRim = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 0.98, 0.24, 32), metalMat);
  outerRim.castShadow = true;
  g.add(outerRim);

  // Bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 0.18, 32), woodMat);
  bowl.position.y = -0.02;
  g.add(bowl);

  // Ball track ring
  const track = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.02, 8, 32), goldMat);
  track.rotation.x = Math.PI / 2;
  track.position.y = 0.06;
  g.add(track);

  // ── Spinner group (rotates on Y axis) ──
  const spinner = new THREE.Group();
  g.userData.spinner = spinner;

  // Wheel face with numbers
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.1, 32),
    new THREE.MeshPhongMaterial({ map: mkWheelTex(), shininess: 30 })
  );
  spinner.add(face);

  // Hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12), metalMat);
  hub.position.y = 0.06;
  spinner.add(hub);

  // Spokes (radiating from hub)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.02, 0.76), metalMat);
    spoke.rotation.y = angle;
    spoke.position.set(Math.cos(angle) * 0.38, 0.05, Math.sin(angle) * 0.38);
    spinner.add(spoke);
  }

  // Decorative diamonds on rim
  const diamMat = new THREE.MeshPhongMaterial({ color: 0xd4af37, shininess: 80 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const diam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.04), diamMat);
    diam.rotation.y = a;
    diam.position.set(Math.cos(a) * 0.86, 0.1, Math.sin(a) * 0.86);
    spinner.add(diam);
  }

  g.add(spinner);

  // Ball (orbits the wheel surface)
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 10),
    new THREE.MeshPhongMaterial({
      color: 0xfcfcfc,
      shininess: 200,
      specular: new THREE.Color(0xffffff)
    })
  );
  ball.position.set(0.88, 0.07, 0);
  g.userData.ball = ball;
  g.add(ball);

  return g;
}

/**
 * Builds Poker table (Texas Hold'em)
 * Oval shape with community cards area in center
 */
function buildPokerTable() {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshPhongMaterial({
    color: 0x3a1a08,
    shininess: 45,
    specular: new THREE.Color(0x5a3010)
  });

  const feltMat = new THREE.MeshPhongMaterial({ color: 0x0d4a24, shininess: 4 });
  const padMat = new THREE.MeshPhongMaterial({ color: 0x4a2208, shininess: 5 });
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xd4af37,
    shininess: 80,
    specular: new THREE.Color(0xffd060)
  });

  // Oval table (cylinder scaled on Z)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.16, 24), woodMat);
  body.scale.z = 0.65;
  body.position.y = 0.79;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Felt face (oval)
  const feltGeo = new THREE.CircleGeometry(2.0, 24);
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.rotation.x = -Math.PI / 2;
  felt.scale.z = 0.65;
  felt.position.y = 0.882;
  felt.receiveShadow = true;
  group.add(felt);

  // Community cards area in center
  const comMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.36),
    new THREE.MeshPhongMaterial({ map: mkPokerCenterTex(), shininess: 3 })
  );
  comMesh.rotation.x = -Math.PI / 2;
  comMesh.position.y = 0.884;
  group.add(comMesh);

  // Arm rest padding (torus)
  const pad = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.18, 8, 24), padMat);
  pad.scale.z = 0.65;
  pad.rotation.x = Math.PI / 2;
  pad.position.y = 0.82;
  group.add(pad);

  // Gold rail
  const rail = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.045, 8, 24), goldMat);
  rail.scale.z = 0.65;
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.91;
  group.add(rail);

  // Central pedestal leg
  const pedMat = new THREE.MeshPhongMaterial({ color: 0x280a04, shininess: 25 });
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, 0.79, 8), pedMat);
  pedestal.position.y = 0.395;
  pedestal.castShadow = true;
  group.add(pedestal);

  // Player seating positions (5 seats around the table)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const px = Math.cos(a) * 1.75;
    const pz = Math.sin(a) * 1.75 * 0.65;

    // Chips at each seat
    addChipStack(group, [px, 0.882, pz], [0xcc2222, 0xdddddd], 0.7);

    // Seat marker circle
    const seatMarker = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 16),
      new THREE.MeshPhongMaterial({ color: 0x0a3a18, shininess: 3 })
    );
    seatMarker.rotation.x = -Math.PI / 2;
    seatMarker.position.set(px, 0.884, pz);
    group.add(seatMarker);
  }

  // Pot area (center decoration)
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16),
    goldMat
  );
  pot.position.y = 0.91;
  group.add(pot);

  // Sign
  addSign(group, "TEXAS HOLD'EM", 'POKER', 0, 1.6, -1.55);

  const camPos = new THREE.Vector3(0, 5.2, 0);
  const camLook = new THREE.Vector3(0, 0.88, 0);

  return { group, type: 'poker', r: 3.5, camPos, camLook, game: new PokerGame() };
}
