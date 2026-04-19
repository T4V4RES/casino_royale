/*
 * Poker Game Class (Video Poker - 5-Card Draw, Jacks or Better)
 * Demonstrates card game logic and hand ranking evaluation
 * Related to ICG_02 concepts: geometry interaction for clickable cards
 */

class PokerGame {
  constructor() {
    this.bal = 1000;
    this.deck = [];
    this.hand = []; // 5 cards
    this.held = []; // Boolean array for held cards
    this.bet = 0;
    this.phase = 'bet'; // 'bet' | 'hold' | 'result'
  }

  start(balance) {
    this.bal = balance;
    this.phase = 'bet';
    this.hand = [];
    this.held = [];
    this.bet = 0;
    this.renderUI();
  }

  getBalance() {
    return this.bal;
  }

  /**
   * Deals initial 5 cards
   */
  deal(betAmount) {
    betAmount = +betAmount;
    if (isNaN(betAmount) || betAmount < 1 || betAmount > this.bal) {
      addMsg('Invalid bet');
      return;
    }

    this.bet = betAmount;
    this.bal -= betAmount;
    this.deck = mkDeck();
    this.hand = Array.from({ length: 5 }, () => this.deck.pop());
    this.held = Array(5).fill(false);
    this.phase = 'hold';
    this.renderUI();
  }

  /**
   * Toggles hold state for a card
   * Player clicks cards to mark which ones to keep
   */
  toggleHold(index) {
    if (this.phase !== 'hold') return;
    this.held[index] = !this.held[index];
    this.renderUI();
  }

  /**
   * Draws new cards for non-held positions
   * Replaces those cards with new ones from deck
   */
  draw() {
    if (this.phase !== 'hold') return;

    this.hand = this.hand.map((card, i) => this.held[i] ? card : this.deck.pop());
    this.phase = 'result';
    this._resolve();
  }

  /**
   * Evaluates final hand and calculates payout
   */
  _resolve() {
    const rank = evalPoker(this.hand);
    const payTable = {
      'Royal Flush': 800,
      'Straight Flush': 50,
      'Four of a Kind': 25,
      'Full House': 9,
      'Flush': 6,
      'Straight': 4,
      'Three of a Kind': 3,
      'Two Pair': 2,
      'Jacks or Better': 1
    };

    const multiplier = payTable[rank] || 0;
    const winAmount = this.bet * multiplier;
    this.bal += winAmount;

    const message = winAmount > 0
      ? `🎉 ${rank}! +$${winAmount - this.bet}`
      : `😞 ${rank || 'High Card'}. No payout.`;
    addMsg(message);

    updateMoney();
    this.renderUI();
  }

  /**
   * Renders card in HTML with hold indicator
   */
  cardHTML(card, index) {
    const isHeld = this.held[index];
    const clickable = this.phase === 'hold' ? `onclick="curGame.toggleHold(${index})" ` : '';
    const clickableClass = this.phase === 'hold' ? 'clickable' : '';

    return `<div class="card ${isRed(card) ? 'red' : ''} ${isHeld ? 'held' : ''} ${clickableClass}" ${clickable}>
      ${card.v}<br>${card.s}${this.phase === 'hold' ? `<div style="font-size:8px;color:${isHeld ? '#d4af37' : '#555'}">${isHeld ? 'HOLD' : '·'}</div>` : ''}
    </div>`;
  }

  /**
   * Updates game panel and hand display
   */
  renderUI() {
    const rank = this.phase === 'result' ? evalPoker(this.hand) : '';
    const cards = this.hand.map((c, i) => this.cardHTML(c, i)).join('');

    document.getElementById('pstatus').innerHTML = `
      <div class="cards">${cards}</div>
      <div style="margin-top:8px">Chips: <b style="color:#d4af37">$${this.bal}</b> | Bet: $${this.bet}</div>
      ${rank ? `<div style="color:#d4af37;margin-top:4px"><b>${rank || 'High Card'}</b></div>` : ''}
      ${this.phase === 'hold' ? '<div style="font-size:11px;color:#888;margin-top:2px">Click cards to hold, then Draw</div>' : ''}`;

    const actions = document.getElementById('pactions');

    if (this.phase === 'bet') {
      actions.innerHTML = `
        Bet: $<input type="number" id="pb" class="numIn" value="25" min="1" max="${this.bal}">
        <button class="btn" onclick="curGame.deal(document.getElementById('pb').value)">DEAL</button>`;
    } else if (this.phase === 'hold') {
      actions.innerHTML = `<button class="btn" onclick="curGame.draw()">DRAW</button>`;
    } else {
      actions.innerHTML = `<button class="btn" onclick="curGame.start(curGame.bal);curGame.renderUI()">NEW HAND</button>`;
    }
  }
}

/**
 * Evaluates poker hand rank
 * Returns hand name or empty string for no winning hand
 * Pay-out table: Royal Flush > Straight Flush > Four of a Kind > Full House > Flush > Straight > Three of a Kind > Two Pair > Jacks or Better
 */
function evalPoker(hand) {
  // Extract values and suits
  const valIndices = hand.map(c => VALS.indexOf(c.v));
  const suits = hand.map(c => c.s);

  // Count frequencies
  const counts = {};
  valIndices.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const countValues = Object.values(counts).sort((a, b) => b - a);

  // Check for flush (all same suit)
  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight (5 consecutive values)
  const uniqueVals = [...new Set(valIndices)].sort((a, b) => a - b);
  const isStraight = uniqueVals.length === 5 && uniqueVals[4] - uniqueVals[0] === 4;

  // Check for Royal Flush (straight A-K with flush)
  const isRoyal = isStraight && isFlush && uniqueVals[0] === 8; // A=12, K=11, Q=10, J=9, 10=8

  if (isFlush && isRoyal) return 'Royal Flush';
  if (isFlush && isStraight) return 'Straight Flush';
  if (countValues[0] === 4) return 'Four of a Kind';
  if (countValues[0] === 3 && countValues[1] === 2) return 'Full House';
  if (isFlush) return 'Flush';
  if (isStraight) return 'Straight';
  if (countValues[0] === 3) return 'Three of a Kind';

  if (countValues[0] === 2 && countValues[1] === 2) {
    // Two pair: check if one pair is Jacks or higher (for payout)
    const pairValues = Object.entries(counts).filter(([v, c]) => c === 2).map(([v]) => +v);
    return pairValues.some(v => v >= 9) ? 'Jacks or Better' : 'Two Pair'; // J=9
  }

  if (countValues[0] === 2) {
    // Single pair: check if Jacks or higher
    const pairEntry = Object.entries(counts).find(([v, c]) => c === 2);
    return +pairEntry[0] >= 9 ? 'Jacks or Better' : 'One Pair';
  }

  return 'High Card';
}
