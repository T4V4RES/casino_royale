/*
 * Lighting System
 * Three light types demonstrate concepts from ICG_05_Illumination_and_Shading.pdf:
 * - AmbientLight: Simulates indirect/global illumination
 * - PointLight: Casino chandeliers and sconces
 * - SpotLight: Drama lights over tables (with shadow mapping)
 */

/**
 * Builds and configures all lights in the casino scene
 * Demonstrates Phong material properties with different light interactions
 */
function buildLights() {
  // ── Ambient Light ──
  // Low warm color simulating indirect casino lighting + reflected light
  // Color: warm yellow-brown (0x1a1208 = RGB 26,18,8)
  // Intensity: 0.9 = strong indirect fill
  const ambientLight = new THREE.AmbientLight(0x1a1208, 0.9);
  scene.add(ambientLight);

  // ── Main Chandelier Point Light ──
  // Warm white point light with shadows
  // PointLight parameters: color, intensity, distance, decay
  // distance=22: light decays over 22 units (casino ceiling height ~5, visible across floor)
  const chandelier = new THREE.PointLight(0xffe8a0, 0.7, 22);
  chandelier.position.set(0, 4.7, 0);
  chandelier.castShadow = true;
  scene.add(chandelier);

  // ── SpotLights above each table ──
  // Demonstrates scene graph: each table has a spot positioned relative to world position
  // SpotLight params: color, intensity, distance, angle, penumbra, decay
  tables.forEach(table => {
    const wp = new THREE.Vector3();
    table.group.getWorldPosition(wp); // Get world position of table

    const spot = new THREE.SpotLight(0xfff4d0, 1.6, 9, Math.PI / 7, 0.35, 1.4);
    spot.position.copy(wp).add(new THREE.Vector3(0, 3.8, 0)); // Position 3.8 units above table
    spot.target.position.copy(wp);
    spot.target.position.y = 0.9; // Target at table surface level
    spot.castShadow = true;

    // High-resolution shadow maps for crisp shadows
    spot.shadow.mapSize.width = 512;
    spot.shadow.mapSize.height = 512;

    scene.add(spot);
    scene.add(spot.target); // Must add target to scene for SpotLight to work
  });

  // ── Wall Sconce Lights ──
  // Four warm PointLights around the casino perimeter
  // Creates ambient fill and visual interest
  [[-12, 2.2, -7], [12, 2.2, -7], [-12, 2.2, 3], [12, 2.2, 3]].forEach(([x, y, z]) => {
    const sconce = new THREE.PointLight(0xffa040, 0.35, 7);
    sconce.position.set(x, y, z);
    scene.add(sconce);
  });

  // ── Bar Warm Light ──
  // Accent light for back bar area
  const barLight = new THREE.PointLight(0xffe0b0, 0.45, 10);
  barLight.position.set(0, 2.8, -13);
  scene.add(barLight);
}
