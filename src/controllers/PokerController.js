import * as THREE from 'three';
import { PokerGame } from '../games/PokerGame.js';
import { createCardMesh } from '../cards/CardMesh.js';
import { createCharacter, createNamePlate, attachNamePlateTo, createChipStack } from '../scene/SceneElements.js';
import { AnimationManager } from '../scene/AnimationManager.js';
import { evaluateHand } from '../games/PokerHand.js';

/* ==================================================================
   Seat layout around the table (4 players)
   Positions are RELATIVE to table center – offset applied in init()
   ================================================================== */
const SEATS_REL = [
    { pos: [0, 0, 5.15], plate: [0, 2.05, 5.15] },            // Player (bottom)
    { pos: [-4.75, 0, 1.1], plate: [-4.75, 2.05, 1.1] },       // Alice (left)
    { pos: [0, 0, -5.0], plate: [0, 2.05, -5.0] },             // Bruno (top)
    { pos: [4.75, 0, 1.1], plate: [4.75, 2.05, 1.1] },         // Clara (right)
];

const CARD_SEATS_REL = [
    { x: -0.22, z: 1.68 },
    { x: -2.15, z: 0.95 },
    { x: -0.22, z: -1.68 },
    { x: 2.15, z: 0.95 },
];

const BOT_COLORS = [0x3949AB, 0x37474F, 0xAD1457];

/* ==================================================================
   PokerController – FPS mode (no own room/lighting)
   ================================================================== */
export class PokerController {
    constructor(scene, camera, tablePos) {
        this.scene = scene;
        this.camera = camera;
        this.tablePos = tablePos || new THREE.Vector3(0, 0, 0);
        this.game = new PokerGame();
        this.anim = new AnimationManager();
        this.cards3D = [];
        this.communityCards3D = [];
        this.sceneObjects = [];
        this.characters = [];
        this.namePlates = [];
        this.chipStacks = [];
        this.betChipStacks = [];
        this.potChipStack = null;
        this.playerChips = 1000;
        this.busy = false;

        // Compute world-space offsets
        this.SEATS = SEATS_REL.map(s => ({
            pos: [s.pos[0] + this.tablePos.x, s.pos[1], s.pos[2] + this.tablePos.z],
            plate: [s.plate[0] + this.tablePos.x, s.plate[1], s.plate[2] + this.tablePos.z],
        }));
        this.CARD_SEATS = CARD_SEATS_REL.map(s => ({
            x: s.x + this.tablePos.x,
            z: s.z + this.tablePos.z,
        }));
    }

    /* ---- Build scene elements at table zone ---- */
    init() {
        // Create bot characters (no player character – FPS camera IS the player)
        const ox = this.tablePos.x, oz = this.tablePos.z;
        for (let i = 1; i < 4; i++) {
            const seat = this.SEATS[i];
            const names = ['Bot Alice', 'Bot Bruno', 'Bot Clara'];
            const char = createCharacter(names[i - 1], BOT_COLORS[i - 1], seat.pos, [ox, 0, oz]);
            char.scale.setScalar(1.04);
            this.scene.add(char);
            this.anim.registerCharacter(char);
            this.characters[i] = char;
            this.sceneObjects.push(char);
            // Attach a name plate so it follows the bot (chips updated later)
            const plate = attachNamePlateTo(char, names[i - 1], '');
            this.namePlates.push(plate);
        }

        // Deck visual
        this._createDeckVisual();

        // Init game logic
        this.game.init(this.playerChips);
    }

    _createDeckVisual() {
        const deckGroup = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const geo = new THREE.BoxGeometry(0.68, 0.012, 0.98);
            const mat = new THREE.MeshStandardMaterial({ color: 0x0D1B2A, roughness: 0.4 });
            const c = new THREE.Mesh(geo, mat);
            c.position.y = i * 0.013;
            c.castShadow = true;
            deckGroup.add(c);
        }
        deckGroup.position.set(this.tablePos.x + 1.7, 0.93, this.tablePos.z - 1.22);
        this.scene.add(deckGroup);
        this.sceneObjects.push(deckGroup);
    }

    /* ---- Start round ---- */
    async startRound() {
        if (this.busy) return;
        this.busy = true;
        try {
            this._clearCards();
            this._clearChipStacks();
            this._clearBetChipStacks();
            this._hidePotChips();

            this.game.startRound();
            this._updateNamePlates();
            this._updateBetChipStacks();
            this._showPotChips();

            // Show poker HUD
            document.getElementById('pk-start-round').style.display = 'none';
            document.getElementById('pk-message').style.display = 'none';

            this._updatePhaseLabel();
            this._updatePotDisplay();

            // Deal hole cards
            for (let round = 0; round < 2; round++) {
                for (let i = 0; i < 4; i++) {
                    const player = this.game.players[i];
                    const card = player.hand[round];
                    const seat = this.CARD_SEATS[i];
                    const faceUp = (i === 0); // Only player's cards face up
                    const pos = { x: seat.x + round * 0.42, y: 0.93 + round * 0.005, z: seat.z };
                    const mesh = createCardMesh(card, false);
                    this.scene.add(mesh);
                    this.cards3D.push({ mesh, playerIdx: i, cardIdx: round });
                    await this.anim.dealCard(mesh, pos, faceUp, 80);
                }
            }

            await this.anim.wait(300);

            // Process actions until it's player's turn
            await this._processUntilPlayer();
        } finally {
            this.busy = false;
        }
    }

    /* ---- Process bot actions until player turn ---- */
    async _processUntilPlayer() {
        let safetyCounter = 0;
        while (safetyCounter++ < 100) {
            const cp = this.game.currentPlayerIndex;
            const player = this.game.players[cp];

            if (player.folded || player.allIn) {
                const result = this.game._nextAction();
                if (result.finished) {
                    await this._handleShowdown(result);
                    return;
                }
                this._updateBetChipStacks();
                this._showPotChips();
                // Phase might have advanced
                if (result.newCards && result.newCards.length > 0) {
                    await this._dealCommunityCards(result.newCards);
                    this._updatePhaseLabel();
                    this._updatePotDisplay();
                }
                continue;
            }

            if (cp === 0) {
                // Player's turn – show UI
                this._showPlayerActions();
                return;
            }

            // Bot's turn
            await this.anim.wait(600 + Math.random() * 600);

            // Show thinking animation
            const charIdx = cp;
            if (this.characters[charIdx]) {
                await this.anim.characterReact(this.characters[charIdx], 'think');
            }

            const betBefore = player.bet;
            const callAmountBefore = this.game.getCallAmount(cp);
            const result = this.game.botDecision(cp);
            this._updatePotDisplay();
            this._updateChipStacks();
            this._updateBetChipStacks();
            this._showPotChips();

            this._showBotAction(cp, result);

            // Reaction based on action
            const botPlayer = this.game.players[cp];
            if (botPlayer.folded && this.characters[charIdx]) {
                await this.anim.characterReact(this.characters[charIdx], 'fold');
            } else if (botPlayer.allIn && this.characters[charIdx]) {
                await this.anim.characterReact(this.characters[charIdx], 'surprise');
            } else if (callAmountBefore === 0 && botPlayer.bet === betBefore && this.characters[charIdx]) {
                await this.anim.characterReact(this.characters[charIdx], 'check');
            }

            if (result.finished) {
                await this._handleShowdown(result);
                return;
            }

            // Check for phase advance (new community cards)
            if (result.newCards && result.newCards.length > 0) {
                await this._dealCommunityCards(result.newCards);
                this._updatePhaseLabel();
            }
        }

        // Fallback safety: if loop exits unexpectedly, force player controls visible
        this._showPlayerActions();
    }

    _showBotAction(playerIdx, result) {
        const player = this.game.players[playerIdx];
        const el = document.getElementById('pk-bot-action');
        if (!el) return;
        let action = '';
        if (player.folded) action = `${player.name} foldou`;
        else if (player.allIn) action = `${player.name} fez all-in!`;
        else if (player.bet > 0) action = `${player.name} apostou $${player.bet}`;
        else action = `${player.name} deu check`;
        el.textContent = action;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 1500);
    }

    /* ---- Player actions ---- */
    async playerFold() {
        if (this.busy) return;
        this.busy = true;
        try {
            this._hidePlayerActions();
            const result = this.game.fold(0);
            this._updatePotDisplay();
            this._updateBetChipStacks();
            this._showPotChips();
            if (result.finished) {
                await this._handleShowdown(result);
            } else {
                if (result.newCards && result.newCards.length > 0) {
                    await this._dealCommunityCards(result.newCards);
                    this._updatePhaseLabel();
                }
                await this._processUntilPlayer();
            }
        } finally {
            this.busy = false;
        }
    }

    async playerCheck() {
        if (this.busy) return;
        if (!this.game.canCheck(0)) return;
        this.busy = true;
        try {
            this._hidePlayerActions();
            const result = this.game.check(0);
            this._updatePotDisplay();
            this._updateBetChipStacks();
            this._showPotChips();
            if (result.finished) {
                await this._handleShowdown(result);
            } else {
                if (result.newCards && result.newCards.length > 0) {
                    await this._dealCommunityCards(result.newCards);
                    this._updatePhaseLabel();
                }
                await this._processUntilPlayer();
            }
        } finally {
            this.busy = false;
        }
    }

    async playerCall() {
        if (this.busy) return;
        this.busy = true;
        try {
            this._hidePlayerActions();
            const result = this.game.call(0);
            this._updatePotDisplay();
            this._updateChipStacks();
            this._updateBetChipStacks();
            this._showPotChips();
            if (result.finished) {
                await this._handleShowdown(result);
            } else {
                if (result.newCards && result.newCards.length > 0) {
                    await this._dealCommunityCards(result.newCards);
                    this._updatePhaseLabel();
                }
                await this._processUntilPlayer();
            }
        } finally {
            this.busy = false;
        }
    }

    async playerRaise() {
        if (this.busy) return;
        this.busy = true;
        try {
            this._hidePlayerActions();
            // Read raise amount from slider
            const slider = document.getElementById('pk-raise-slider');
            const mult = slider ? parseInt(slider.value) : 2;
            const raiseAmount = this.game.bigBlind * mult;
            const result = this.game.raise(0, raiseAmount);
            this._updatePotDisplay();
            this._updateChipStacks();
            this._updateBetChipStacks();
            this._showPotChips();
            if (result.finished) {
                await this._handleShowdown(result);
            } else {
                if (result.newCards && result.newCards.length > 0) {
                    await this._dealCommunityCards(result.newCards);
                    this._updatePhaseLabel();
                }
                await this._processUntilPlayer();
            }
        } finally {
            this.busy = false;
        }
    }

    async playerAllIn() {
        if (this.busy) return;
        this.busy = true;
        try {
            this._hidePlayerActions();
            const result = this.game.allIn(0);
            this._updatePotDisplay();
            this._updateChipStacks();
            this._updateBetChipStacks();
            this._showPotChips();
            if (result.finished) {
                await this._handleShowdown(result);
            } else {
                if (result.newCards && result.newCards.length > 0) {
                    await this._dealCommunityCards(result.newCards);
                    this._updatePhaseLabel();
                }
                await this._processUntilPlayer();
            }
        } finally {
            this.busy = false;
        }
    }

    /* ---- Community cards ---- */
    async _dealCommunityCards(cards) {
        const startIdx = this.communityCards3D.length;
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const idx = startIdx + i;
            const x = this.tablePos.x - 1.15 + idx * 0.57;
            const mesh = createCardMesh(card, false);
            this.scene.add(mesh);
            this.communityCards3D.push(mesh);
            await this.anim.dealCard(mesh, { x, y: 0.94, z: this.tablePos.z - 0.28 }, true, 120);
        }
    }

    /* ---- Showdown ---- */
    async _handleShowdown(result) {
        this._hidePlayerActions();

        // Deal remaining community cards if needed
        const currentComm = this.communityCards3D.length;
        if (currentComm < 5 && this.game.communityCards.length > currentComm) {
            const newCards = this.game.communityCards.slice(currentComm);
            await this._dealCommunityCards(newCards);
        }

        await this.anim.wait(400);

        // Reveal all bot cards
        for (const entry of this.cards3D) {
            if (entry.playerIdx !== 0 && entry.mesh && !entry.mesh.userData.faceUp) {
                const player = this.game.players[entry.playerIdx];
                if (!player.folded) {
                    await this.anim.flipCard(entry.mesh, 300);
                    await this.anim.wait(150);
                }
            }
        }

        // Winner celebration
        if (result.winnerIndex !== undefined) {
            const charIdx = result.winnerIndex; // characters array: [player, alice, bruno, clara]
            if (this.characters[charIdx]) {
                await this.anim.characterReact(this.characters[charIdx], 'celebrate');
            }
        }

        // Update player chips
        this.playerChips = this.game.players[0].chips;
        this._updateNamePlates();

        // Show result message
        const msgEl = document.getElementById('pk-message');
        if (msgEl) {
            const winner = result.winner;
            const isPlayer = result.winnerIndex === 0;
            msgEl.textContent = isPlayer
                ? `🏆 Ganhaste o pote de $${result.pot} com ${result.handName}!`
                : `${winner.name} ganhou $${result.pot} com ${result.handName}`;
            msgEl.className = 'game-message ' + (isPlayer ? 'msg-win' : 'msg-lose');
            msgEl.style.display = 'block';
        }

        document.getElementById('pk-start-round').style.display = 'flex';
    }

    /* ---- UI helpers ---- */
    _showPlayerActions() {
        const actionsEl = document.getElementById('pk-actions');
        if (actionsEl) actionsEl.style.display = 'flex';

        const callAmt = this.game.getCallAmount(0);
        const callBtn = document.getElementById('pk-call');
        const checkBtn = document.getElementById('pk-check');
        const raiseBtn = document.getElementById('pk-raise');
        const raiseSlider = document.getElementById('pk-raise-slider');
        const raiseLabel = document.getElementById('pk-raise-amount');

        if (callBtn) callBtn.textContent = callAmt > 0 ? `Call $${callAmt}` : 'Call';
        if (checkBtn) {
            checkBtn.style.display = this.game.canCheck(0) ? 'inline-block' : 'none';
            if (callBtn) callBtn.style.display = this.game.canCheck(0) ? 'none' : 'inline-block';
        }

        // Always show raise (even after check - that's valid poker)
        if (raiseBtn) raiseBtn.style.display = 'inline-block';

        // Configure raise slider
        if (raiseSlider && raiseLabel) {
            const bb = this.game.bigBlind;
            const playerChips = this.game.players[0].chips;
            const maxMultiple = Math.max(2, Math.floor(playerChips / bb));
            raiseSlider.min = 2;
            raiseSlider.max = Math.min(maxMultiple, 20);
            raiseSlider.value = 2;
            raiseLabel.textContent = `$${bb * 2}`;
            raiseSlider.oninput = () => {
                const mult = parseInt(raiseSlider.value);
                raiseLabel.textContent = `$${bb * mult}`;
            };
        }
    }

    _hidePlayerActions() {
        const el = document.getElementById('pk-actions');
        if (el) el.style.display = 'none';
    }

    _updatePotDisplay() {
        this._syncPlayerChips();
        const el = document.getElementById('pk-pot');
        if (el) el.textContent = `Pote: $${this.game.pot}`;
    }

    _syncPlayerChips() {
        if (this.game.players[0]) {
            this.playerChips = this.game.players[0].chips;
        }
    }

    _updatePhaseLabel() {
        const el = document.getElementById('pk-phase');
        if (el) {
            const labels = { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' };
            el.textContent = labels[this.game.phase] || this.game.phase;
        }
        this._updateHandInfo();
    }

    _updateHandInfo() {
        const player = this.game.players[0];
        const pcEl = document.getElementById('pk-player-cards');
        const ccEl = document.getElementById('pk-community-cards');
        const hnEl = document.getElementById('pk-hand-name');
        if (!pcEl) return;

        // Player hole cards
        if (player && player.hand && player.hand.length > 0) {
            pcEl.innerHTML = player.hand.map(c => {
                const cls = (c.suit === 'hearts' || c.suit === 'diamonds') ? 'card-red' : 'card-black';
                return `<span class="${cls}">${c.name}</span>`;
            }).join(' ');
        } else {
            pcEl.textContent = '-';
        }

        // Community cards
        if (this.game.communityCards && this.game.communityCards.length > 0) {
            ccEl.innerHTML = this.game.communityCards.map(c => {
                const cls = (c.suit === 'hearts' || c.suit === 'diamonds') ? 'card-red' : 'card-black';
                return `<span class="${cls}">${c.name}</span>`;
            }).join(' ');
        } else {
            ccEl.textContent = '-';
        }

        // Hand evaluation
        if (player && player.hand && player.hand.length === 2) {
            const allCards = [...player.hand, ...this.game.communityCards];
            if (allCards.length >= 5) {
                const result = evaluateHand(allCards);
                hnEl.textContent = result.name;
            } else {
                hnEl.textContent = 'Pre-flop';
            }
        } else {
            hnEl.textContent = '-';
        }
    }

    _updateNamePlates() {
        // Remove old plates
        this.namePlates.forEach(p => {
            if (p.parent) p.parent.remove(p);
            else this.scene.remove(p);
        });
        this.namePlates = [];

        this.game.players.forEach((p, i) => {
            if (i === 0) {
                // Player (camera) — keep static plate at table
                const seat = this.SEATS[i];
                const plate = createNamePlate(p.name, p.chips, seat.plate[0], seat.plate[1], seat.plate[2]);
                this.scene.add(plate);
                this.namePlates.push(plate);
            } else {
                // Bots — attach to character if present
                const char = this.characters[i];
                if (char) {
                    const plate = attachNamePlateTo(char, p.name, p.chips);
                    this.namePlates.push(plate);
                } else {
                    const seat = this.SEATS[i];
                    const plate = createNamePlate(p.name, p.chips, seat.plate[0], seat.plate[1], seat.plate[2]);
                    this.scene.add(plate);
                    this.namePlates.push(plate);
                }
            }
        });
    }

    _updateChipStacks() {
        this._clearChipStacks();
    }

    _showPotChips() {
        this._hidePotChips();
    }

    _hidePotChips() {
        if (this.potChipStack) {
            this.scene.remove(this.potChipStack);
            this.potChipStack = null;
        }
    }

    _clearChipStacks() {
        this.chipStacks.forEach(s => this.scene.remove(s));
        this.chipStacks = [];
    }

    _updateBetChipStacks() {
        this._clearBetChipStacks();
        this.game.players.forEach((p, i) => {
            if (!p || p.bet <= 0) return;
            const target = this._getBetStackPosition(i);
            const stack = createChipStack(Math.min(p.bet, 500), target.x, target.z);
            stack.position.y = 0.91;
            stack.scale.setScalar(0.85);
            stack.userData.isBetStack = true;
            this.scene.add(stack);
            this.betChipStacks.push(stack);
        });
    }

    _clearBetChipStacks() {
        this.betChipStacks.forEach(s => this.scene.remove(s));
        this.betChipStacks = [];
    }

    _getBetStackPosition(playerIdx) {
        const offsets = [
            new THREE.Vector3(0.72, 0, 1.22),
            new THREE.Vector3(-2.15, 0, 0.08),
            new THREE.Vector3(0.72, 0, -1.22),
            new THREE.Vector3(2.15, 0, 0.08),
        ];
        return offsets[playerIdx].add(this.tablePos);
    }

    _clearCards() {
        this.cards3D.forEach(c => this.scene.remove(c.mesh));
        this.cards3D = [];
        this.communityCards3D.forEach(c => this.scene.remove(c));
        this.communityCards3D = [];
    }

    /* ---- Update loop ---- */
    update() {
        this.anim.update();
    }

    /* ---- Dispose (only controller-specific objects) ---- */
    dispose() {
        this._clearCards();
        this._clearChipStacks();
        this._hidePotChips();
        this._clearBetChipStacks();
        this.namePlates.forEach(p => this.scene.remove(p));
        this.sceneObjects.forEach(o => this.scene.remove(o));
        this.sceneObjects = [];
        this.characters = [];
        this.namePlates = [];
    }
}
