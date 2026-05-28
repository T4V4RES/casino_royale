# Casino Royale 3D

A first-person 3D casino built with Three.js. The player walks around an interior casino room, approaches interactive zones, and plays Blackjack, Poker, European Roulette and slot machines, withdraws chips at the ATM, and drinks at the bar.

Available online at [t4v4res.github.io/casino_royale](https://t4v4res.github.io/casino_royale/).
**Na pasta doc alem do pptx esta tambem um relatorio em pdf mais tecnico com mais detalhe sobre como a parte do jogo e das regras do jogo funcionam em si**
---

## Core Game Mechanics

- **First-person exploration**: free movement around the room with `W/A/S/D`, sprint with `Shift`, mouse look via pointer lock, and AABB collision against walls, tables, pillars, the bar and the slot machines.
- **Three full table games**:
  - *Blackjack* with chip betting, `hit`, `stand`, `double down`, automatic dealer logic and payouts (incl. 3:2 on natural blackjack).
  - *Poker* (table poker) with three bots, blinds, multiple betting rounds, community cards, side-by-side hand evaluation, and bot heuristics.
  - *European Roulette* with color and number bets, 0–36 grid, multi-phase ball physics animation, and standard payouts (1:1 / 35:1).
- **Slot machines**: six machines placed against the side walls. Each has three reels that spin with rapidly cycling symbols and decelerate independently; only three-of-a-kind pays (jackpot on triple yellow).
- **Shared chip economy**: a single balance is shared across all games and shown on the HUD; the ATM tops it up in fixed denominations.
- **Interactive bar**: order a mug of beer, drink it in first-person (`F`), and the camera distorts as the drunk level rises. After 20 drinks the player blacks out and the room resets.
- **Context-aware camera**: first-person while exploring; smooth `slerp` transitions to overhead/seated views for each table, and a return path that restores the original orientation.
- **Mobile / tablet support**: virtual joystick, interact button, sprint button, exit-table button and touch look. Camera quality scales down on small or low-power devices.

---

## Technical Implementation

The project is a JavaScript module application using [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/). It is published to GitHub Pages by a workflow that runs `npm run build` and deploys the `dist/` folder; `vite.config.js` sets `base: '/casino_royale/'` so the assets resolve correctly under the user-page path.

### Project structure

```
index.html                  Entry point + HUD / modal markup
vite.config.js              Vite build + GitHub Pages base path
.github/workflows/deploy.yml CI deploy to gh-pages
src/
  main.js                   Renderer, scene, state machine, input, animation loop
  styles.css                HUD, modals, touch UI, responsive layout
  scene/
    CasinoWorld.js          Room construction, props, lights, interaction zones
    FPSControls.js          First-person movement, pointer lock, collision
    TouchControls.js        Virtual joystick + touch buttons
    InteractionSystem.js    Proximity detection and prompts
    AnimationManager.js     Promise-based tweens, easing, character idle anims
    ATMSystem.js            ATM modal + balance top-up
    BarSystem.js            Bar modal, beer mug attached to camera, drunk effect
    SceneElements.js        Shared scene primitives (characters, name plates, chips)
    ProceduralTextures.js   Canvas-generated PBR textures
  games/
    BlackjackGame.js        Blackjack rules, hand value, dealer policy
    PokerGame.js            Poker round flow, blinds, betting, bot decisions
    PokerHand.js            5-card hand evaluator
    RouletteGame.js         European wheel order, payout multipliers
  cards/
    CardMesh.js             3D card mesh and face textures
    Deck.js                 Fisher-Yates shuffle and 52-card deck
  controllers/
    BlackjackController.js  Bridge between HUD, game logic and the 3D table
    PokerController.js
    RouletteController.js
docs/
  relatorio.tex             Project report (LaTeX)
  relatorio.pdf             Compiled report
```

### Scene and materials

Every prop in the casino — tables, chairs, the roulette wheel, the slot machines, the bar, bottles, plants, paintings, pillars, chandeliers and the characters — is built out of grouped Three.js primitives (`BoxGeometry`, `CylinderGeometry`, `TorusGeometry`, `SphereGeometry`, `ConeGeometry`, `CircleGeometry`) rather than imported models. Each object is a `THREE.Group` so that the scene graph carries the hierarchical transforms.

Materials are `MeshStandardMaterial` and `MeshPhysicalMaterial` (the marble bar uses `clearcoat`). Large surfaces — carpet, wood, marble, felt, walls, ceiling — use procedural textures generated once at startup in `ProceduralTextures.js`. Each set includes `map`, `normalMap` and, where useful, `roughnessMap`, so the lighting reveals relief and gloss variation without any external asset files.

### Lighting and shadows

The room is lit as a night casino:

- A weak `HemisphereLight` and `AmbientLight` keep shadowed areas from going fully black.
- One `DirectionalLight` casts the main shadow with `PCFSoftShadowMap`.
- Dedicated `SpotLight`s sit above the Blackjack, Poker and Roulette tables, with visible lamp shades and emissive diffusers.
- A `RectAreaLight` over the bar lights up the marble and the glass bottles.
- The chandelier and wall sconces are `PointLight`s without shadows, used as fill / atmosphere.

The renderer uses `ACESFilmicToneMapping` with `outputColorSpace = SRGBColorSpace`. On a non-low-power device an image-based environment is generated at runtime from `RoomEnvironment` via `PMREMGenerator`, so chrome, marble, gold trim and glass reflect a plausible neutral environment without ray tracing.

The strategy is to keep very few shadow-casting lights and use emissive materials plus shadow-less `PointLight`s for decorative detail — this is what keeps the framerate stable while still reading as a lit interior.

### Interaction and state

The main loop runs a small state machine:

```
splash → exploring → blackjack
                  → poker
                  → roulette
                  → atm
                  → bar
                  → blackout (drunk)
```

While `exploring`, the `InteractionSystem` checks the distance from the camera to each registered zone every frame using planar distance `√((x-zx)² + (z-zz)²)`. The closest zone within its `radius` becomes the active zone and shows a context prompt (`Press E …` on desktop, `Tap Interagir …` on touch). Entering a table saves the current camera pose, disables FPS controls, runs a `slerp`/`lerp` camera transition to the seat, and presents the corresponding HTML HUD. Exiting reverses the transition and restores the saved pose.

### Animation

The project uses a small promise-based tween engine (`AnimationManager`) plus a few self-contained `requestAnimationFrame` loops:

- **Camera transitions** between exploration and tables interpolate position with `lerpVectors` and orientation with `slerpQuaternions`, both driven by `easeInOutCubic`.
- **Card dealing** runs in three phases (slide / land / flip) using `easeInOutCubic`, `easeOutCubic` and `easeOutBack`. Each card scales, arcs and flips.
- **Characters** (dealer, croupier, poker bots, bartender) have an idle breathing animation, plus directed reactions: `nod`, `shake`, `surprise`, `celebrate`, `think`, `fold`, `check`, `call` and `raise`.
- **Roulette ball** has a three-phase trajectory in polar coordinates: gain on the outer rail, release to the inner track via `easeInOutCubic`, deceleration across the houses with a damped sinusoidal rattle, and a small residual vibration inside the pocket.
- **Slot reels** rotate around their local X axis with `θ(t) = 16π · easeOutCubic(t/T)` while the symbol material cycles colors every 70 ms; reels stop in a staggered 1.10 s / 1.45 s / 1.75 s sequence and settle on a uniformly random symbol.
- **Drunk effect** distorts the camera proportionally to `min(1, drinks/20)`; sobriety decays by one drink every 60 seconds of real time.

### Input

- Keyboard / mouse with `pointerlockchange` is the primary input on desktop. `E` interacts, `F` drinks at the bar, `Esc` exits the current table.
- On touch devices, `TouchControls` creates a virtual joystick (`touchstart` / `touchmove`), three buttons (`Interagir` / `Correr` / `Sair`), and a look area on the right of the canvas. A `bindPress` helper de-duplicates `click` and `touchend` within a 300 ms window so the same button doesn't fire twice on mobile browsers.

### Mobile compatibility

The `quality` object detected at startup (touch-coarse pointer / small viewport / `deviceMemory ≤ 4` / `hardwareConcurrency ≤ 4`) tones down the pixel ratio, disables shadows, skips the PMREM environment map and tightens the fog distance for low-power devices. Touch UI shows only on devices that report `ontouchstart` or `maxTouchPoints > 0`.

On actual mobile/touch devices, table controllers can use a lighter mode to avoid WebGL memory spikes when entering a table. The rule logic and HUD remain active, while some heavy 3D table extras are skipped. Desktop keeps the full version with bots, 3D cards and character reactions.

### Deployment

```bash
npm install
npm run dev      # local dev server (Vite, default port 5173)
npm run build    # production build into ./dist
```

The GitHub Action in `.github/workflows/deploy.yml` runs the build and publishes the `dist/` folder. The expected URL for the `T4V4RES/casino_royale` repository is:

```
https://t4v4res.github.io/casino_royale/
```

---

## Controls

| Input | Action |
| --- | --- |
| `W` / `A` / `S` / `D` | Movement |
| `Shift` | Sprint |
| Mouse (after click) | Look around (pointer lock) |
| `E` | Interact with the nearest zone |
| `F` | Drink (in front of the bar mug) |
| `Esc` | Leave the current table / release pointer lock |
| Touch joystick | Movement (mobile / tablet) |
| Right touch area | Look around (mobile / tablet) |
| `Interagir` button | Interact (mobile / tablet) |

---


## Use of AI

**General approach:** AI was used as technical support during development — discussing architecture, organizing modules, validating the Vite / GitHub Pages setup, and helping debug touch input on mobile. Every suggestion was reviewed and integrated manually; gameplay tuning, scene composition, math and final implementation are our own work.

- **ChatGPT** — logic and technical explanation:
  - Modular structure of the README and report.
  - Validation of the Vite / GitHub Pages configuration.
  - Interior lighting and decoration tuning.
- **Claude** — architecture and refactoring:
  - Mobile touch input pipeline and de-duplication of `click` / `touchend`.
  - Slot machine animation and refactor of the roulette ball trajectory.
  - CSS / UI polishing for the HUD and modals.

---

*Guilherme Tavares 119867 — Casino Royale 3D, ICG 2025/2026*
