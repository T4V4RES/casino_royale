/* ==================================================================
   RouletteGame – European roulette logic (single zero)
   Supports bets on: exact number (0-36), red, black, green
   ================================================================== */

const RED_NUMBERS = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18,
    19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function getRouletteColor(number) {
    if (number === 0) return 'green';
    return RED_NUMBERS.has(number) ? 'red' : 'black';
}

export class RouletteGame {
    spin(bet) {
        const winningNumber = Math.floor(Math.random() * 37);
        const winningColor = getRouletteColor(winningNumber);

        let win = false;
        let multiplier = 0;

        if (bet.type === 'number') {
            win = Number(bet.value) === winningNumber;
            multiplier = 35;
        } else if (bet.type === 'color') {
            if (bet.value === 'green') {
                win = winningNumber === 0;
                multiplier = 35;
            } else {
                win = winningColor === bet.value;
                multiplier = 1;
            }
        }

        const payout = win ? bet.amount * (multiplier + 1) : 0;
        return {
            winningNumber,
            winningColor,
            win,
            payout,
            profit: win ? payout - bet.amount : -bet.amount,
            multiplier,
        };
    }
}
