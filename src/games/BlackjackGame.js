import { Deck } from '../cards/Deck.js';

/**
 * Blackjack game logic
 * - Player vs Dealer (house)
 * - Standard rules: dealer stands on 17
 * - Blackjack pays 3:2
 * - Double down allowed on first two cards
 */
export class BlackjackGame {
    constructor() {
        this.deck = new Deck();
        this.playerHand = [];
        this.dealerHand = [];
        this.bet = 0;
        this.state = 'betting'; // betting, playing, dealer-turn, finished
        this.result = null; // win, lose, push, blackjack
    }

    /**
     * Place a bet and deal initial cards
     */
    deal(betAmount) {
        this.deck.reset();
        this.playerHand = [];
        this.dealerHand = [];
        this.bet = betAmount;
        this.result = null;

        // Deal 2 cards each, alternating
        this.playerHand.push(this.deck.deal());
        this.dealerHand.push(this.deck.deal());
        this.playerHand.push(this.deck.deal());
        this.dealerHand.push(this.deck.deal());

        // Player cards face up, dealer: first up, second down
        this.playerHand[0].faceUp = true;
        this.playerHand[1].faceUp = true;
        this.dealerHand[0].faceUp = true;
        this.dealerHand[1].faceUp = false;

        this.state = 'playing';

        // Check for natural blackjack
        if (this.getHandValue(this.playerHand) === 21) {
            this.state = 'finished';
            this.dealerHand[1].faceUp = true;
            if (this.getHandValue(this.dealerHand) === 21) {
                this.result = 'push';
            } else {
                this.result = 'blackjack';
            }
        }

        return {
            playerHand: this.playerHand,
            dealerHand: this.dealerHand,
            state: this.state,
            result: this.result
        };
    }

    /**
     * Player hits (takes another card)
     */
    hit() {
        if (this.state !== 'playing') return null;

        const card = this.deck.deal();
        card.faceUp = true;
        this.playerHand.push(card);

        const value = this.getHandValue(this.playerHand);

        if (value > 21) {
            this.state = 'finished';
            this.result = 'lose';
            this.dealerHand[1].faceUp = true;
        } else if (value === 21) {
            // Auto stand on 21
            return this.stand();
        }

        return {
            card,
            playerValue: value,
            state: this.state,
            result: this.result
        };
    }

    /**
     * Player stands - dealer plays
     */
    stand() {
        if (this.state !== 'playing') return null;
        this.state = 'dealer-turn';

        // Reveal dealer's hidden card
        this.dealerHand[1].faceUp = true;

        // Dealer draws until 17+
        const dealerDrawnCards = [];
        while (this.getHandValue(this.dealerHand) < 17) {
            const card = this.deck.deal();
            card.faceUp = true;
            this.dealerHand.push(card);
            dealerDrawnCards.push(card);
        }

        // Determine winner
        const playerValue = this.getHandValue(this.playerHand);
        const dealerValue = this.getHandValue(this.dealerHand);

        this.state = 'finished';

        if (dealerValue > 21) {
            this.result = 'win';
        } else if (dealerValue > playerValue) {
            this.result = 'lose';
        } else if (dealerValue < playerValue) {
            this.result = 'win';
        } else {
            this.result = 'push';
        }

        return {
            dealerDrawnCards,
            playerValue,
            dealerValue,
            state: this.state,
            result: this.result
        };
    }

    /**
     * Double down: double bet, take exactly one more card, then stand
     */
    doubleDown() {
        if (this.state !== 'playing' || this.playerHand.length !== 2) return null;
        
        this.bet *= 2;
        
        const card = this.deck.deal();
        card.faceUp = true;
        this.playerHand.push(card);

        const playerValue = this.getHandValue(this.playerHand);

        if (playerValue > 21) {
            this.state = 'finished';
            this.result = 'lose';
            this.dealerHand[1].faceUp = true;
            return {
                card,
                playerValue,
                dealerValue: this.getHandValue(this.dealerHand),
                state: this.state,
                result: this.result,
                dealerDrawnCards: []
            };
        }

        // Then stand
        const standResult = this.stand();
        return {
            card,
            ...standResult
        };
    }

    /**
     * Calculate hand value with ace handling
     */
    getHandValue(hand) {
        let value = 0;
        let aces = 0;

        for (const card of hand) {
            value += card.bjValue;
            if (card.rank === 'A') aces++;
        }

        // Convert aces from 11 to 1 if busting
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    /**
     * Get payout based on result
     */
    getPayout() {
        switch (this.result) {
            case 'blackjack': return Math.floor(this.bet * 2.5); // 3:2
            case 'win': return this.bet * 2;
            case 'push': return this.bet;
            case 'lose': return 0;
            default: return 0;
        }
    }

    canDouble() {
        return this.state === 'playing' && this.playerHand.length === 2;
    }
}
