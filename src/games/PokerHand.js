import { Deck } from '../cards/Deck.js';

/**
 * Texas Hold'em Poker hands ranking
 */
const HAND_RANKS = {
    HIGH_CARD: 0,
    PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9
};

const HAND_NAMES = {
    0: 'High Card',
    1: 'Par',
    2: 'Dois Pares',
    3: 'Trinca',
    4: 'Straight',
    5: 'Flush',
    6: 'Full House',
    7: 'Quadra',
    8: 'Straight Flush',
    9: 'Royal Flush'
};

/**
 * Evaluate best 5-card hand from 7 cards
 */
export function evaluateHand(cards) {
    const combos = getCombinations(cards, 5);
    let bestRank = -1;
    let bestHigh = [];
    let bestName = '';

    for (const combo of combos) {
        const { rank, highCards, name } = evaluate5Cards(combo);
        if (rank > bestRank || (rank === bestRank && compareHighCards(highCards, bestHigh) > 0)) {
            bestRank = rank;
            bestHigh = highCards;
            bestName = name;
        }
    }

    return { rank: bestRank, highCards: bestHigh, name: bestName };
}

function evaluate5Cards(cards) {
    const sorted = [...cards].sort((a, b) => b.pokerValue - a.pokerValue);
    const values = sorted.map(c => c.pokerValue);
    const suits = sorted.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = checkStraight(values);

    // Count occurrences
    const counts = {};
    values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    const countEntries = Object.entries(counts)
        .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    // Royal Flush
    if (isFlush && isStraight && values[0] === 14) {
        return { rank: HAND_RANKS.ROYAL_FLUSH, highCards: values, name: HAND_NAMES[9] };
    }

    // Straight Flush
    if (isFlush && isStraight) {
        return { rank: HAND_RANKS.STRAIGHT_FLUSH, highCards: values, name: HAND_NAMES[8] };
    }

    // Four of a kind
    if (countEntries[0][1] === 4) {
        const quad = parseInt(countEntries[0][0]);
        const kicker = parseInt(countEntries[1][0]);
        return { rank: HAND_RANKS.FOUR_OF_A_KIND, highCards: [quad, kicker], name: HAND_NAMES[7] };
    }

    // Full House
    if (countEntries[0][1] === 3 && countEntries[1][1] === 2) {
        return {
            rank: HAND_RANKS.FULL_HOUSE,
            highCards: [parseInt(countEntries[0][0]), parseInt(countEntries[1][0])],
            name: HAND_NAMES[6]
        };
    }

    // Flush
    if (isFlush) {
        return { rank: HAND_RANKS.FLUSH, highCards: values, name: HAND_NAMES[5] };
    }

    // Straight
    if (isStraight) {
        return { rank: HAND_RANKS.STRAIGHT, highCards: values, name: HAND_NAMES[4] };
    }

    // Three of a kind
    if (countEntries[0][1] === 3) {
        const trip = parseInt(countEntries[0][0]);
        const kickers = countEntries.slice(1).map(e => parseInt(e[0])).sort((a, b) => b - a);
        return { rank: HAND_RANKS.THREE_OF_A_KIND, highCards: [trip, ...kickers], name: HAND_NAMES[3] };
    }

    // Two pair
    if (countEntries[0][1] === 2 && countEntries[1][1] === 2) {
        const pairs = [parseInt(countEntries[0][0]), parseInt(countEntries[1][0])].sort((a, b) => b - a);
        const kicker = parseInt(countEntries[2][0]);
        return { rank: HAND_RANKS.TWO_PAIR, highCards: [...pairs, kicker], name: HAND_NAMES[2] };
    }

    // Pair
    if (countEntries[0][1] === 2) {
        const pair = parseInt(countEntries[0][0]);
        const kickers = countEntries.slice(1).map(e => parseInt(e[0])).sort((a, b) => b - a);
        return { rank: HAND_RANKS.PAIR, highCards: [pair, ...kickers], name: HAND_NAMES[1] };
    }

    // High card
    return { rank: HAND_RANKS.HIGH_CARD, highCards: values, name: HAND_NAMES[0] };
}

function checkStraight(values) {
    const unique = [...new Set(values)].sort((a, b) => b - a);
    if (unique.length < 5) return false;

    // Normal straight
    if (unique[0] - unique[4] === 4) return true;

    // Wheel (A-2-3-4-5)
    if (unique[0] === 14 && unique[1] === 5 && unique[2] === 4 && unique[3] === 3 && unique[4] === 2) {
        return true;
    }

    return false;
}

function compareHighCards(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] > b[i]) return 1;
        if (a[i] < b[i]) return -1;
    }
    return 0;
}

function getCombinations(arr, k) {
    const result = [];
    function combine(start, combo) {
        if (combo.length === k) { result.push([...combo]); return; }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }
    combine(0, []);
    return result;
}

export { HAND_RANKS, HAND_NAMES };
