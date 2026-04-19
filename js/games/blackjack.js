/*
 * Blackjack Game Class
 * Classic casino card game: Player vs Dealer
 * Demonstrates card game logic and Phong-shaded card meshes
 */

class BlackjackGame {
  constructor() {
    this.bal = 1000;
    this.deck = [];
    this.playerHand = [];
    this.dealerHand = [];
    this.bet = 0;
    this.phase = 'bet'; // 'bet' | 'play' | 'dealer' | 'result'
  }

  start(balance) {
    this.bal = balance;
    this.phase = 'bet';
    this.playerHand = [];
    this.dealerHand = [];
    this.bet = 0;
    this.renderUI();
  }

  getBalance() {
    return this.bal;
  }

  /**
   * Deals initial hand: 2 cards to player, 2 to dealer (1 hidden)
   */
  deal(betAmount) {
    betAmount = +betAmount;
    if (isNaN(betAmount) || betAmount < 1 || betAmount > this.bal) {
      addMsg('Invalid bet amount');
      return;
    }

    this.bet = betAmount;
    this.bal -= betAmount;
    this.deck = mkDeck();
    this.playerHand = [this.deck.pop(), this.deck.pop()];
    this.dealerHand = [this.deck.pop(), this.deck.pop()];
    this.phase = 'play';

    // Animate cards onto table
    dealCardsToTable(activeTable, this.playerHand, this.dealerHand);

    // Check for natural blackjack (21 on first 2 cards)
    if (hTotal(this.playerHand) === 21) {
      this.stand();
      return;
    }

    this.renderUI();
  }

  /**
   * Player takes another card
   */
  hit() {
    if (this.phase !== 'play') return;
    this.playerHand.push(this.deck.pop());
    const total = hTotal(this.playerHand);

    if (total >= 21) {
      this.stand();
    } else {
      this.renderUI();
    }
  }

  /**
   * Player ends turn, dealer plays
   */
  stand() {
    this.phase = 'dealer';
    
    // Dealer must hit on 16 or less, stand on 17 or more (standard rule)
    while (hTotal(this.dealerHand) < 17) {
      this.dealerHand.push(this.deck.pop());
    }

    this._resolve();
  }

  /**
   * Player doubles bet and gets one card (strategy move)
   */
  doubleDown() {
    if (this.phase !== 'play' || this.playerHand.length !== 2 || this.bal < this.bet) {
      addMsg('Cannot double!');
      return;
    }

    this.bal -= this.bet;
    this.bet *= 2;
    this.playerHand.push(this.deck.pop());
    this.stand();
  }

  /**
   * Resolves game outcome and updates balance
   */
  _resolve() {
    const pTotal = hTotal(this.playerHand);
    const dTotal = hTotal(this.dealerHand);

    if (pTotal > 21) {
      addMsg('💀 Bust! Dealer wins.');
    } else if (dTotal > 21) {
      this.bal += this.bet * 2;
      addMsg(`🎉 Dealer busts! +$${this.bet}`);
    } else if (pTotal === 21 && this.playerHand.length === 2) {
      // Natural blackjack pays 3:2
      const winAmount = Math.floor(this.bet * 2.5);
      this.bal += winAmount;
      addMsg(`🃏 BLACKJACK! +$${winAmount - this.bet}`);
    } else if (pTotal > dTotal) {
      this.bal += this.bet * 2;
      addMsg(`🎉 You win! +$${this.bet}`);
    } else if (dTotal > pTotal) {
      addMsg(`😞 Dealer wins (${dTotal} vs ${pTotal})`);
    } else {
      this.bal += this.bet; // Push: bet returned
      addMsg('🤝 Push — bet returned');
    }

    this.phase = 'result';
    updateMoney();
    this.renderUI();
  }

  /**
   * Renders card as HTML element for UI display
   */
  cardHTML(card, faceDown = false) {
    if (faceDown) return `<div class="card back"></div>`;
    return `<div class="card ${isRed(card) ? 'red' : ''}">${card.v}<br>${card.s}</div>`;
  }

  /**
   * Updates game status panel and action buttons
   */
  renderUI() {
    const showDealerTotal = this.phase === 'dealer' || this.phase === 'result';
    const dealerCards = this.dealerHand.map((c, i) => this.cardHTML(c, i === 1 && !showDealerTotal)).join('');
    const playerCards = this.playerHand.map(c => this.cardHTML(c)).join('');

    document.getElementById('pstatus').innerHTML = `
      <div><b>Dealer</b> (${showDealerTotal ? hTotal(this.dealerHand) : '?'}): <div class="cards">${dealerCards}</div></div>
      <div style="margin-top:4px"><b>You</b> (${hTotal(this.playerHand)}): <div class="cards">${playerCards}</div></div>
      <div style="margin-top:8px;color:#d4af37">Chips: $${this.bal} &nbsp;|&nbsp; Bet: $${this.bet}</div>`;

    const actions = document.getElementById('pactions');

    if (this.phase === 'bet') {
      actions.innerHTML = `
        Bet: $<input type="number" id="bi" class="numIn" value="50" min="1" max="${this.bal}">
        <button class="btn" onclick="curGame.deal(document.getElementById('bi').value)">DEAL</button>`;
    } else if (this.phase === 'play') {
      actions.innerHTML = `
        <button class="btn" onclick="curGame.hit()">HIT</button>
        <button class="btn" onclick="curGame.stand()">STAND</button>
        <button class="btn" onclick="curGame.doubleDown()">DOUBLE</button>`;
    } else {
      actions.innerHTML = `<button class="btn" onclick="curGame.start(curGame.bal);curGame.renderUI()">NEW HAND</button>`;
    }
  }
}
