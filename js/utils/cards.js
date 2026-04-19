/*
 * Card System Utilities
 * Defines card structures and utility functions for deck operations
 */

const SUITS = ['♠', '♥', '♦', '♣'];
const VALS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Creates a shuffled deck of 52 cards
 * Fisher-Yates shuffle algorithm for uniform randomness
 */
function mkDeck() {
  const d = [];
  SUITS.forEach(s => VALS.forEach(v => d.push({ s, v })));
  // Fisher-Yates shuffle
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * Returns the point value of a card
 * Face cards = 10, Ace = 11 (adjusted in hand calculation)
 */
function cVal(c) {
  if (['J', 'Q', 'K'].includes(c.v)) return 10;
  if (c.v === 'A') return 11;
  return +c.v;
}

/**
 * Calculates total value of a hand (for Blackjack)
 * Handles Ace adjustment (11→1) when hand would bust
 */
function hTotal(hand) {
  let t = 0, a = 0;
  hand.forEach(c => {
    t += cVal(c);
    if (c.v === 'A') a++;
  });
  while (t > 21 && a) {
    t -= 10;
    a--;
  }
  return t;
}

/**
 * Returns true if card is red suit (hearts or diamonds)
 */
function isRed(c) {
  return c.s === '♥' || c.s === '♦';
}

/**
 * Creates a 3D card mesh (Two-sided plane with text)
 * @param {string} val - Card value (A, 2-10, J, Q, K)
 * @param {string} suit - Card suit (♠, ♥, ♦, ♣)
 * @param {boolean} faceDown - If true, shows back texture
 * @returns {THREE.Group} Card mesh group with front/back faces
 */
function mkCardMesh(val, suit, faceDown = false) {
  const g = new THREE.Group();
  const frontMat = new THREE.MeshPhongMaterial({
    map: faceDown ? mkCardBackTex() : mkCardFaceTex(val, suit),
    shininess: 18
  });
  const backMat = new THREE.MeshPhongMaterial({ map: mkCardBackTex(), shininess: 18 });

  // Front face
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.25), frontMat);
  front.position.z = 0.0015;
  g.add(front);

  // Back face (rotated 180°)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.25), backMat);
  back.position.z = -0.0015;
  back.rotation.y = Math.PI;
  g.add(back);

  // Side edges
  const side = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.25, 0.003),
    new THREE.MeshPhongMaterial({ color: 0xfefefe })
  );
  g.add(side);
  return g;
}

/**
 * Animates cards dealt to a table
 * Cards fall from above and land on the table surface
 * @param {THREE.Group} table - Table group
 * @param {Array} playerHand - Player's cards
 * @param {Array} dealerHand - Dealer's cards
 */
function dealCardsToTable(table, playerHand, dealerHand) {
  if (!table) return;

  // Clear previous cards
  if (table.group.userData.cardMeshes) {
    table.group.userData.cardMeshes.forEach(m => table.group.remove(m));
    table.group.userData.cardMeshes = [];
  }
  dealAnims = [];

  // Define layout: player cards at tz:0.15, dealer cards at tz:-0.8
  const slots = [
    ...playerHand.map((c, i) => ({ c, tx: -0.22 + i * 0.25, tz: 0.15, faceDown: false, delay: i * 0.15 })),
    ...dealerHand.map((c, i) => ({ c, tx: -0.22 + i * 0.25, tz: -0.8, faceDown: i === 1, delay: (i + 2) * 0.15 })),
  ];

  slots.forEach(({ c, tx, tz, faceDown, delay }) => {
    const mesh = mkCardMesh(c.v, c.s, faceDown);
    mesh.rotation.x = -Math.PI / 2; // Lay flat on table
    mesh.position.set(tx, 1.6, tz); // Start high
    mesh.userData.targetY = 0.882; // Land at table surface
    mesh.userData.delay = delay;
    mesh.userData.elapsed = -delay;
    table.group.add(mesh);
    if (!table.group.userData.cardMeshes) table.group.userData.cardMeshes = [];
    table.group.userData.cardMeshes.push(mesh);
    dealAnims.push(mesh);
  });
}
