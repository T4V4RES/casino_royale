// Card deck utilities
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: '#D32F2F', diamonds: '#D32F2F', clubs: '#1A1A1A', spades: '#1A1A1A' };
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES_BJ = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

export class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
    }

    get symbol() { return SUIT_SYMBOLS[this.suit]; }
    get color() { return SUIT_COLORS[this.suit]; }
    get name() { return `${this.rank}${this.symbol}`; }
    get bjValue() { return RANK_VALUES_BJ[this.rank]; }

    get pokerValue() {
        const idx = RANKS.indexOf(this.rank);
        return idx + 2; // 2=2, 3=3, ..., A=14
    }

    flip() { this.faceUp = !this.faceUp; }
}

export class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        if (this.cards.length === 0) this.reset();
        return this.cards.pop();
    }
}

export { SUITS, SUIT_SYMBOLS, SUIT_COLORS, RANKS };
