import * as THREE from 'three';
import { BlackjackGame } from '../games/BlackjackGame.js';
import { createCardMesh } from '../cards/CardMesh.js';
import { createCharacter, createNamePlate, attachNamePlateTo, createChipStack, createChipMesh } from '../scene/SceneElements.js';
import { AnimationManager } from '../scene/AnimationManager.js';

/* ==================================================================
   BlackjackController – 3D Blackjack at a table zone (FPS mode)
   Receives table position from CasinoWorld – no room/lighting creation
   ================================================================== */
export class BlackjackController {
    constructor(scene, camera, tablePos) {
        this.scene = scene;
        this.camera = camera;
        this.tablePos = tablePos || new THREE.Vector3(0, 0, 0);
        this.game = new BlackjackGame();
        this.anim = new AnimationManager();
        this.cards3D = [];
        this.chips3D = [];
        this.namePlates = [];
        this.playerChips = 1000;
        this.currentBet = 0;
        this.sceneObjects = [];
        this.dealer = null;
        this.dealerPlate = null;
        this.playerPlate = null;
        this.potChips = null;
    }

    /* ---- Build the 3D elements at the table zone ---- */
    init() {
        const ox = this.tablePos.x;
        const oz = this.tablePos.z;

        // Dealer character (across from player)
        this.dealer = createCharacter('Dealer', 0x1A1A1A, [ox, 0.02, oz - 4.55], [ox, 0, oz]);
        this.scene.add(this.dealer);
        this.anim.registerCharacter(this.dealer);
        this.sceneObjects.push(this.dealer);

        // Name plates: attach dealer plate to dealer so it follows animation
        this.dealerPlate = attachNamePlateTo(this.dealer, 'Dealer', '∞');
        this.sceneObjects.push(this.dealerPlate);

        // Player plate remains at fixed table position (player is camera)
        this.playerPlate = createNamePlate('Jogador', this.playerChips, ox + 2.5, 1.15, oz + 2.5);
        this.scene.add(this.playerPlate);
        this.sceneObjects.push(this.playerPlate);

        // Deck visual
        this._createDeckVisual();

        this._updateBetUI();
    }

    _createDeckVisual() {
        const deckGroup = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const geo = new THREE.BoxGeometry(0.68, 0.012, 0.98);
            const mat = new THREE.MeshStandardMaterial({ color: 0x0D1B2A, roughness: 0.4 });
            const card = new THREE.Mesh(geo, mat);
            card.position.y = i * 0.013;
            card.castShadow = true;
            deckGroup.add(card);
        }
        deckGroup.position.set(this.tablePos.x + 1.65, 0.93, this.tablePos.z - 1.35);
        this.scene.add(deckGroup);
        this.sceneObjects.push(deckGroup);
    }

    /* ---- Betting ---- */
    placeBet(amount) {
        if (this.playerChips >= amount) {
            this.currentBet += amount;
            this.playerChips -= amount;
            this._updateBetUI();
            this._updatePotChips();
        }
    }

    clearBet() {
        this.playerChips += this.currentBet;
        this.currentBet = 0;
        this._updateBetUI();
        this._removePotChips();
    }

    _updatePotChips() {
        this._removePotChips();
        if (this.currentBet > 0) {
            this.potChips = createChipStack(this.currentBet, this.tablePos.x + 0.85, this.tablePos.z + 1.35);
            this.potChips.position.y = 0.93;
            this.potChips.scale.setScalar(0.78);
            this.potChips.userData.isBlackjackBetStack = true;
            this.scene.add(this.potChips);
        }
    }

    _removePotChips() {
        if (this.potChips) {
            this.scene.remove(this.potChips);
            this.potChips = null;
        }
    }

    _updateBetUI() {
        const betEl = document.getElementById('bj-bet-amount');
        const chipsEl = document.getElementById('bj-player-chips');
        if (betEl) betEl.textContent = `$${this.currentBet}`;
        if (chipsEl) chipsEl.textContent = `$${this.playerChips}`;
    }

    _updateNamePlate() {
        this.scene.remove(this.playerPlate);
        this.playerPlate = createNamePlate('Jogador', this.playerChips, this.tablePos.x + 2.5, 1.15, this.tablePos.z + 2.5);
        this.scene.add(this.playerPlate);
    }

    /* ---- Deal ---- */
    async deal() {
        if (this.currentBet <= 0) return;
        const ox = this.tablePos.x, oz = this.tablePos.z;

        this._clearCards();
        const result = this.game.deal(this.currentBet);

        // Show playing UI
        document.getElementById('bj-betting').style.display = 'none';
        document.getElementById('bj-actions').style.display = 'flex';
        this._updateValues();

        // Deal cards with animation
        // Player card 1 (close to camera, on the felt)
        await this._dealOneCard(result.playerHand[0], { x: ox - 0.28, y: 0.93, z: oz + 1.28 }, true, 0);
        // Dealer card 1
        await this._dealOneCard(result.dealerHand[0], { x: ox - 0.28, y: 0.93, z: oz - 1.12 }, true, 150);
        // Player card 2
        await this._dealOneCard(result.playerHand[1], { x: ox + 0.28, y: 0.935, z: oz + 1.28 }, true, 100);
        // Dealer card 2 (face down)
        await this._dealOneCard(result.dealerHand[1], { x: ox + 0.28, y: 0.935, z: oz - 1.12 }, false, 150);

        // Dealer reacts with nod
        await this.anim.characterReact(this.dealer, 'nod');

        // Check for immediate blackjack
        if (result.state === 'finished') {
            await this.anim.wait(400);
            await this._revealDealerHidden();
            this._showResult(result.result);
            // Dealer surprise for player blackjack
            if (result.result === 'blackjack') {
                await this.anim.characterReact(this.dealer, 'surprise');
            }
        }
    }

    async _dealOneCard(card, pos, faceUp, delay) {
        const mesh = createCardMesh(card, false);
        this.scene.add(mesh);
        this.cards3D.push(mesh);
        await this.anim.dealCard(mesh, pos, faceUp, delay);
    }

    /* ---- Player Actions ---- */
    async hit() {
        if (this.game.state !== 'playing') return;
        const result = this.game.hit();
        if (!result) return;

        const idx = this.game.playerHand.length - 1;
        const xOff = this.tablePos.x - 0.48 + (idx) * 0.38;
        await this._dealOneCard(result.card, { x: xOff, y: 0.93 + idx * 0.005, z: this.tablePos.z + 1.28 }, true, 0);

        this._updateValues();

        if (result.state === 'finished') {
            await this.anim.wait(300);
            await this._revealDealerHidden();
            this._showResult(result.result);
            await this.anim.characterReact(this.dealer, result.result === 'lose' ? 'nod' : 'shake');
        }
    }

    async stand() {
        if (this.game.state !== 'playing') return;
        const result = this.game.stand();
        if (!result) return;

        // Reveal hidden card
        await this._revealDealerHidden();

        // Deal extra dealer cards
        for (let i = 0; i < result.dealerDrawnCards.length; i++) {
            const xOff = this.tablePos.x - 0.48 + (2 + i) * 0.38;
            await this._dealOneCard(result.dealerDrawnCards[i],
                { x: xOff, y: 0.93 + (2 + i) * 0.005, z: this.tablePos.z - 1.12 }, true, 200);
        }

        this._updateValues();
        await this.anim.wait(300);
        this._showResult(result.result);

        if (result.result === 'win') {
            await this.anim.characterReact(this.dealer, 'shake');
        } else if (result.result === 'lose') {
            await this.anim.characterReact(this.dealer, 'nod');
        } else {
            await this.anim.characterReact(this.dealer, 'nod');
        }
    }

    async doubleDown() {
        if (this.game.state !== 'playing' || this.game.playerHand.length !== 2) return;
        if (this.playerChips < this.currentBet) return;

        // Take additional bet from player chips (game.doubleDown will double game.bet internally)
        this.playerChips -= this.currentBet;
        this.currentBet *= 2;
        this._updateBetUI();
        this._updatePotChips();

        const result = this.game.doubleDown();
        if (!result) return;

        // Deal the one extra card
        const idx = this.game.playerHand.length - 1;
        await this._dealOneCard(result.card, { x: this.tablePos.x - 0.48 + idx * 0.38, y: 0.93 + idx * 0.005, z: this.tablePos.z + 1.28 }, true, 0);
        this._updateValues();

        if (result.state === 'finished') {
            await this._revealDealerHidden();

            if (result.dealerDrawnCards) {
                for (let i = 0; i < result.dealerDrawnCards.length; i++) {
                    const xOff = this.tablePos.x - 0.48 + (2 + i) * 0.38;
                    await this._dealOneCard(result.dealerDrawnCards[i],
                        { x: xOff, y: 0.93 + (2 + i) * 0.005, z: this.tablePos.z - 1.12 }, true, 200);
                }
            }

            this._updateValues();
            await this.anim.wait(300);
            this._showResult(result.result);

            if (result.result === 'win' || result.result === 'blackjack') {
                await this.anim.characterReact(this.dealer, 'shake');
            } else if (result.result === 'lose') {
                await this.anim.characterReact(this.dealer, 'nod');
            }
        }
    }

    /* ---- Helpers ---- */
    async _revealDealerHidden() {
        // The second dealer card (index 3 in cards3D array: player1, dealer1, player2, dealer2)
        const hidden = this.cards3D[3];
        if (hidden && !hidden.userData.faceUp) {
            await this.anim.flipCard(hidden, 350);
        }
    }

    _updateValues() {
        const pvEl = document.getElementById('bj-player-value');
        const dvEl = document.getElementById('bj-dealer-value');
        if (pvEl) pvEl.textContent = this.game.getHandValue(this.game.playerHand);
        if (dvEl) {
            if (this.game.state === 'playing') {
                dvEl.textContent = this.game.dealerHand[0].bjValue;
            } else {
                dvEl.textContent = this.game.getHandValue(this.game.dealerHand);
            }
        }

        // Card names
        const pcEl = document.getElementById('bj-player-cards');
        const dcEl = document.getElementById('bj-dealer-cards');
        if (pcEl) {
            pcEl.innerHTML = this.game.playerHand.map(c => {
                const cls = (c.suit === 'hearts' || c.suit === 'diamonds') ? 'card-red' : 'card-black';
                return `<span class="${cls}">${c.name}</span>`;
            }).join(' ');
        }
        if (dcEl) {
            if (this.game.state === 'playing') {
                const c = this.game.dealerHand[0];
                const cls = (c.suit === 'hearts' || c.suit === 'diamonds') ? 'card-red' : 'card-black';
                dcEl.innerHTML = `<span class="${cls}">${c.name}</span> <span class="card-black">🂠</span>`;
            } else {
                dcEl.innerHTML = this.game.dealerHand.map(c => {
                    const cls = (c.suit === 'hearts' || c.suit === 'diamonds') ? 'card-red' : 'card-black';
                    return `<span class="${cls}">${c.name}</span>`;
                }).join(' ');
            }
        }
    }

    _showResult(result) {
        const payout = this.game.getPayout();
        this.playerChips += payout;
        this.currentBet = 0;
        this._updateBetUI();
        this._updateNamePlate();

        const messages = {
            'blackjack': '🎰 BLACKJACK! Ganhas 3:2!',
            'win': '🏆 Ganhaste!',
            'lose': '💔 Perdeste!',
            'push': '🤝 Empate!',
        };

        const msgEl = document.getElementById('bj-message');
        if (msgEl) {
            msgEl.textContent = messages[result] || result;
            msgEl.style.display = 'block';
            msgEl.className = 'game-message ' + (result === 'lose' ? 'msg-lose' : result === 'push' ? 'msg-push' : 'msg-win');
        }

        document.getElementById('bj-actions').style.display = 'none';
        document.getElementById('bj-new-round').style.display = 'flex';
    }

    newRound() {
        this._clearCards();
        this._removePotChips();
        document.getElementById('bj-message').style.display = 'none';
        document.getElementById('bj-new-round').style.display = 'none';
        document.getElementById('bj-betting').style.display = 'flex';
        document.getElementById('bj-actions').style.display = 'none';
        const pvEl = document.getElementById('bj-player-value');
        const dvEl = document.getElementById('bj-dealer-value');
        if (pvEl) pvEl.textContent = '-';
        if (dvEl) dvEl.textContent = '-';
        this._updateBetUI();
    }

    _clearCards() {
        this.cards3D.forEach(c => this.scene.remove(c));
        this.cards3D = [];
    }

    /* ---- Animation loop tick ---- */
    update() {
        this.anim.update();
    }

    /* ---- Cleanup (only controller-specific objects) ---- */
    dispose() {
        this._clearCards();
        this._removePotChips();
        this.sceneObjects.forEach(o => this.scene.remove(o));
        this.sceneObjects = [];
        if (this.dealerPlate) this.scene.remove(this.dealerPlate);
        if (this.playerPlate) this.scene.remove(this.playerPlate);
        this.dealer = null;
    }
}
