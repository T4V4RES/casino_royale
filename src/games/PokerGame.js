import { Deck } from '../cards/Deck.js';
import { evaluateHand } from './PokerHand.js';

/**
 * Poker game logic
 * Player vs 3 AI bots, multiple betting rounds with community cards.
 */

const BOT_NAMES = ['Bot Alice', 'Bot Bruno', 'Bot Clara'];

export class PokerGame {
    constructor() {
        this.deck = new Deck();
        this.players = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.phase = 'idle'; // idle, preflop, flop, turn, river, showdown
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.roundBets = []; // track bets per round
        this.lastRaiserIndex = -1; // track who last raised to know when betting round ends
    }

    /**
     * Initialize a new game with player and bots
     */
    init(playerChips) {
        this.players = [
            { name: 'Jogador', chips: playerChips, hand: [], bet: 0, folded: false, isBot: false, allIn: false, acted: false },
            { name: BOT_NAMES[0], chips: 800 + Math.floor(Math.random() * 400), hand: [], bet: 0, folded: false, isBot: true, allIn: false, acted: false },
            { name: BOT_NAMES[1], chips: 800 + Math.floor(Math.random() * 400), hand: [], bet: 0, folded: false, isBot: true, allIn: false, acted: false },
            { name: BOT_NAMES[2], chips: 800 + Math.floor(Math.random() * 400), hand: [], bet: 0, folded: false, isBot: true, allIn: false, acted: false },
        ];
    }

    /**
     * Start a new round
     */
    startRound() {
        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;

        // Reset player states
        this.players.forEach(p => {
            p.hand = [];
            p.bet = 0;
            p.folded = false;
            p.allIn = false;
            p.acted = false;
        });

        // Remove bankrupt bots (give them new chips if out)
        this.players.forEach((p, i) => {
            if (i > 0 && p.chips <= 0) p.chips = 500;
        });

        // Move dealer button
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

        // Post blinds
        const sbIndex = (this.dealerIndex + 1) % this.players.length;
        const bbIndex = (this.dealerIndex + 2) % this.players.length;

        this._placeBet(sbIndex, this.smallBlind);
        this._placeBet(bbIndex, this.bigBlind);
        this.currentBet = this.bigBlind;

        // Mark blind players as having acted (they've committed chips)
        this.players[sbIndex].acted = true;
        this.players[bbIndex].acted = true;
        this.lastRaiserIndex = bbIndex; // BB is the "last raiser" in preflop

        // Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < this.players.length; j++) {
                const card = this.deck.deal();
                card.faceUp = (j === 0); // Only player's cards face up
                this.players[j].hand.push(card);
            }
        }

        this.phase = 'preflop';
        this.currentPlayerIndex = (bbIndex + 1) % this.players.length;

        return {
            players: this.players,
            communityCards: this.communityCards,
            pot: this.pot,
            phase: this.phase,
            currentPlayer: this.currentPlayerIndex
        };
    }

    /**
     * Player action: fold
     */
    fold(playerIndex) {
        this.players[playerIndex].folded = true;
        this.players[playerIndex].acted = true;
        return this._nextAction();
    }

    /**
     * Player action: check (bet 0, only if no bet to call)
     */
    check(playerIndex) {
        if (this.players[playerIndex].bet < this.currentBet) return null; // Can't check
        this.players[playerIndex].acted = true;
        return this._nextAction();
    }

    /**
     * Player action: call
     */
    call(playerIndex) {
        const player = this.players[playerIndex];
        const toCall = this.currentBet - player.bet;
        this._placeBet(playerIndex, toCall);
        player.acted = true;
        return this._nextAction();
    }

    /**
     * Player action: raise
     */
    raise(playerIndex, amount) {
        const player = this.players[playerIndex];
        const totalBet = this.currentBet + amount;
        const needed = totalBet - player.bet;
        this._placeBet(playerIndex, needed);
        this.currentBet = totalBet;
        // Reset acted for everyone except raiser – they must respond
        this.players.forEach((p, i) => {
            if (i !== playerIndex && !p.folded && !p.allIn) p.acted = false;
        });
        player.acted = true;
        this.lastRaiserIndex = playerIndex;
        return this._nextAction();
    }

    /**
     * Player action: all-in
     */
    allIn(playerIndex) {
        const player = this.players[playerIndex];
        const amount = player.chips;
        this._placeBet(playerIndex, amount);
        player.allIn = true;
        player.acted = true;
        if (player.bet > this.currentBet) {
            this.currentBet = player.bet;
            // Reset acted for everyone except this player – they must respond
            this.players.forEach((p, i) => {
                if (i !== playerIndex && !p.folded && !p.allIn) p.acted = false;
            });
            this.lastRaiserIndex = playerIndex;
        }
        return this._nextAction();
    }

    /**
     * Get amount needed to call
     */
    getCallAmount(playerIndex) {
        return Math.max(0, this.currentBet - this.players[playerIndex].bet);
    }

    /**
     * Can player check?
     */
    canCheck(playerIndex) {
        return this.players[playerIndex].bet >= this.currentBet;
    }

    /**
     * Execute bot AI decision – improved with position, aggression, and bluffing
     */
    botDecision(playerIndex) {
        const player = this.players[playerIndex];
        if (player.folded || player.allIn) return this._nextAction();

        const callAmount = this.getCallAmount(playerIndex);
        const handStrength = this._evaluateBotHand(player);
        const potOdds = callAmount > 0 ? callAmount / (this.pot + callAmount) : 0;

        // Position factor: later position is better (more info)
        const distFromDealer = (playerIndex - this.dealerIndex + this.players.length) % this.players.length;
        const positionBonus = distFromDealer / this.players.length * 0.1;

        // Aggression personality per bot
        const aggression = playerIndex === 1 ? 0.15    // Alice: tight-aggressive
                         : playerIndex === 2 ? -0.05   // Bruno: loose-passive
                         : 0.08;                         // Clara: balanced

        const effectiveStrength = Math.min(1, handStrength + positionBonus + aggression);

        // Bluff chance (higher in later position, lower with many callers)
        const activePlayers = this.players.filter(p => !p.folded && !p.allIn).length;
        const bluffChance = (distFromDealer / this.players.length) * 0.15 / Math.max(1, activePlayers - 1);
        const isBluffing = Math.random() < bluffChance && effectiveStrength < 0.45;

        if (isBluffing) {
            // Bluff raise
            const raiseAmount = Math.min(this.bigBlind * (2 + Math.floor(Math.random() * 2)), player.chips);
            if (raiseAmount > callAmount && player.chips > raiseAmount) {
                return this.raise(playerIndex, this.bigBlind * 2);
            }
        }

        if (effectiveStrength > 0.75) {
            // Strong hand – raise aggressively
            const multiplier = effectiveStrength > 0.9 ? 4 : 3;
            const raiseAmount = this.bigBlind * multiplier;
            if (raiseAmount > callAmount && player.chips > raiseAmount) {
                return this.raise(playerIndex, raiseAmount);
            }
            return this.call(playerIndex);
        } else if (effectiveStrength > 0.5) {
            // Decent hand – call or small raise
            if (callAmount === 0) {
                // Can check, sometimes raise for value
                if (Math.random() < 0.3 && player.chips > this.bigBlind * 2) {
                    return this.raise(playerIndex, this.bigBlind * 2);
                }
                return this.check(playerIndex);
            }
            // Call if pot odds are favorable
            if (potOdds < effectiveStrength) return this.call(playerIndex);
            if (callAmount <= player.chips * 0.15) return this.call(playerIndex);
            return this.fold(playerIndex);
        } else if (effectiveStrength > 0.3) {
            // Weak hand – check or fold
            if (callAmount === 0) return this.check(playerIndex);
            if (callAmount <= this.bigBlind * 2 && potOdds < 0.25) return this.call(playerIndex);
            return this.fold(playerIndex);
        } else {
            // Very weak – fold unless free
            if (callAmount === 0) return this.check(playerIndex);
            return this.fold(playerIndex);
        }
    }

    _evaluateBotHand(player) {
        const allCards = [...player.hand, ...this.communityCards];

        if (allCards.length >= 5) {
            const result = evaluateHand(allCards);
            return Math.min(1, (result.rank + 1) / 10 + Math.random() * 0.15);
        }

        // Pre-flop: evaluate hole cards
        const [c1, c2] = player.hand;
        const v1 = c1.pokerValue;
        const v2 = c2.pokerValue;
        const suited = c1.suit === c2.suit;
        const pair = v1 === v2;

        let strength = (v1 + v2) / 28; // max 28 = 14+14

        if (pair) strength += 0.3;
        if (suited) strength += 0.1;
        if (Math.abs(v1 - v2) <= 2) strength += 0.05; // connected

        // Premium hands
        if (pair && v1 >= 10) strength += 0.2;
        if (v1 === 14 && v2 >= 12) strength += 0.15;

        return Math.min(1, strength + (Math.random() * 0.1 - 0.05));
    }

    _placeBet(playerIndex, amount) {
        const player = this.players[playerIndex];
        const actual = Math.min(amount, player.chips);
        player.chips -= actual;
        player.bet += actual;
        this.pot += actual;
        if (player.chips === 0) player.allIn = true;
    }

    _nextAction() {
        // Find next active player who still needs to act
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let checked = 0;

        while (checked < this.players.length) {
            const p = this.players[nextIndex];
            if (!p.folded && !p.allIn) {
                // Player needs to act if they haven't acted yet or their bet is below currentBet
                if (!p.acted || p.bet < this.currentBet) {
                    this.currentPlayerIndex = nextIndex;
                    return {
                        phase: this.phase,
                        currentPlayer: nextIndex,
                        pot: this.pot,
                        communityCards: this.communityCards,
                        finished: false
                    };
                }
            }
            nextIndex = (nextIndex + 1) % this.players.length;
            checked++;
        }

        // All players have acted - advance phase
        return this._advancePhase();
    }

    _hasActed(playerIndex) {
        const p = this.players[playerIndex];
        return p.acted || p.folded || p.allIn;
    }

    _advancePhase() {
        // Check if only one player remains
        const activePlayers = this.players.filter(p => !p.folded);
        if (activePlayers.length === 1) {
            return this._finishRound();
        }

        // Reset bets for new betting round
        this.players.forEach(p => {
            p.bet = 0;
            if (!p.folded && !p.allIn) p.acted = false;
        });
        this.currentBet = 0;
        this.lastRaiserIndex = -1;

        switch (this.phase) {
            case 'preflop':
                this.phase = 'flop';
                this._dealCommunity(3);
                break;
            case 'flop':
                this.phase = 'turn';
                this._dealCommunity(1);
                break;
            case 'turn':
                this.phase = 'river';
                this._dealCommunity(1);
                break;
            case 'river':
                this.phase = 'showdown';
                return this._finishRound();
        }

        // Set first active player after dealer
        this.currentPlayerIndex = this._getFirstActivePlayer();

        return {
            phase: this.phase,
            currentPlayer: this.currentPlayerIndex,
            pot: this.pot,
            communityCards: this.communityCards,
            newCards: this.phase === 'flop' 
                ? this.communityCards.slice(-3) 
                : this.communityCards.slice(-1),
            finished: false
        };
    }

    _dealCommunity(count) {
        for (let i = 0; i < count; i++) {
            const card = this.deck.deal();
            card.faceUp = true;
            this.communityCards.push(card);
        }
    }

    _getFirstActivePlayer() {
        let idx = (this.dealerIndex + 1) % this.players.length;
        for (let i = 0; i < this.players.length; i++) {
            if (!this.players[idx].folded && !this.players[idx].allIn) return idx;
            idx = (idx + 1) % this.players.length;
        }
        return 0;
    }

    _finishRound() {
        this.phase = 'showdown';

        // Reveal all hands
        this.players.forEach(p => {
            p.hand.forEach(c => c.faceUp = true);
        });

        const activePlayers = this.players.filter(p => !p.folded);

        if (activePlayers.length === 1) {
            // Everyone else folded
            activePlayers[0].chips += this.pot;
            return {
                phase: 'showdown',
                winner: activePlayers[0],
                winnerIndex: this.players.indexOf(activePlayers[0]),
                handName: 'Todos foldaram',
                pot: this.pot,
                communityCards: this.communityCards,
                finished: true
            };
        }

        // Evaluate hands
        let bestPlayer = null;
        let bestEval = null;
        let bestIndex = -1;

        for (const player of activePlayers) {
            const allCards = [...player.hand, ...this.communityCards];
            const handEval = evaluateHand(allCards);
            player.handEval = handEval;

            if (!bestEval || handEval.rank > bestEval.rank ||
                (handEval.rank === bestEval.rank && 
                 this._compareHighCards(handEval.highCards, bestEval.highCards) > 0)) {
                bestEval = handEval;
                bestPlayer = player;
                bestIndex = this.players.indexOf(player);
            }
        }

        bestPlayer.chips += this.pot;

        return {
            phase: 'showdown',
            winner: bestPlayer,
            winnerIndex: bestIndex,
            handName: bestEval.name,
            pot: this.pot,
            communityCards: this.communityCards,
            players: this.players,
            finished: true
        };
    }

    _compareHighCards(a, b) {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] > b[i]) return 1;
            if (a[i] < b[i]) return -1;
        }
        return 0;
    }
}
