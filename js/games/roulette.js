/*
 * Roulette Game Class
 * European roulette with 37 numbers (0-36)
 * Demonstrates wheel animation and physics simulation
 * Related to ICG_03: rotation transformations on the spinner group
 */

class RouletteGame {
  constructor() {
    this.bal = 1000;
    this.bets = []; // Array of {type, amt}
    this.phase = 'bet'; // 'bet' | 'spinning' | 'result'
    this.result = null; // Winning number
  }

  start(balance) {
    this.bal = balance;
    this.bets = [];
    this.phase = 'bet';
    this.result = null;
    this.renderUI();
  }

  getBalance() {
    return this.bal;
  }

  /**
   * Places a bet on the roulette table
   * Bet types: 'red', 'black', 'green' (0), 'even', 'odd', '1-18', '19-36', or specific number
   */
  placeBet(betType, amount) {
    amount = +amount;
    if (amount < 1 || amount > this.bal) {
      addMsg('Not enough chips');
      return;
    }

    this.bets.push({ type: betType, amt: amount });
    this.bal -= amount;
    addMsg(`Placed $${amount} on ${betType}`);
    updateMoney();
    this.renderUI();
  }

  /**
   * Spins the wheel
   * Animates wheel rotation and ball motion
   * Results are determined after spin completes
   */
  spin() {
    if (!this.bets.length) {
      addMsg('Place a bet first!');
      return;
    }

    this.phase = 'spinning';

    if (activeTable) {
      const tableGroup = activeTable.group;
      const wheelData = tableGroup.userData;

      // Initialize wheel spin parameters
      wheelData.spinning = true;
      wheelData.wheelSpd = 3.5 + Math.random() * 3; // Speed in rad/frame
      wheelData.ballSpd = -(5 + Math.random() * 5); // Ball orbits opposite direction
      wheelData.spinDur = 4.5 + Math.random() * 2; // Total spin duration
      wheelData.spinT = 0; // Elapsed time
    }

    // Resolve after spin animation completes (~5.6 seconds)
    setTimeout(() => {
      this.result = Math.floor(Math.random() * 37); // 0-36
      this._resolve();
    }, 5600);

    this.renderUI();
  }

  /**
   * Clears all placed bets and refunds money
   */
  clearBets() {
    this.bal += this.bets.reduce((sum, b) => sum + b.amt, 0);
    this.bets = [];
    updateMoney();
    this.renderUI();
  }

  /**
   * Evaluates bets against the result
   * Calculates payouts based on bet type and odds
   */
  _resolve() {
    const n = this.result;
    const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const isRed = reds.has(n);
    const isBlack = n !== 0 && !isRed;

    let winnings = 0;

    // Check each bet
    this.bets.forEach(bet => {
      if (bet.type === 'red' && isRed) winnings += bet.amt * 2;
      else if (bet.type === 'black' && isBlack) winnings += bet.amt * 2;
      else if (bet.type === 'green' && n === 0) winnings += bet.amt * 35; // 35:1 payout
      else if (bet.type === 'even' && n !== 0 && n % 2 === 0) winnings += bet.amt * 2;
      else if (bet.type === 'odd' && n % 2 === 1) winnings += bet.amt * 2;
      else if (bet.type === '1-18' && n >= 1 && n <= 18) winnings += bet.amt * 2;
      else if (bet.type === '19-36' && n >= 19 && n <= 36) winnings += bet.amt * 2;
      else if (bet.type === String(n)) winnings += bet.amt * 36; // 36:1 payout
    });

    this.bal += winnings;

    // Display result message
    const color = n === 0 ? 'Green' : isRed ? 'Red' : 'Black';
    const msg = winnings > 0
      ? `🎰 ${n} (${color})! You win $${winnings}!`
      : `😞 ${n} (${color}). No win.`;
    addMsg(msg);

    this.bets = [];
    this.phase = 'result';
    updateMoney();
    this.renderUI();
  }

  /**
   * Renders roulette UI and betting options
   */
  renderUI() {
    const totalBet = this.bets.reduce((sum, b) => sum + b.amt, 0);
    const betnamesDisplay = this.bets.map(b => `${b.type}:$${b.amt}`).join(' · ') || '—';

    document.getElementById('pstatus').innerHTML = `
      <div>Chips: <b style="color:#d4af37">$${this.bal}</b></div>
      <div style="font-size:12px;margin:4px 0">Bets: ${betnamesDisplay}</div>
      ${this.result !== null ? `<div style="color:#d4af37;font-size:18px">Result: <b>${this.result}</b></div>` : ''}`;

    const actions = document.getElementById('pactions');

    if (this.phase === 'spinning') {
      actions.innerHTML = `<div style="color:#d4af37;font-size:16px;letter-spacing:2px">🎰 SPINNING…</div>`;
      return;
    }

    const betAmount = 25;
    actions.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
        <button class="rbet red" onclick="curGame.placeBet('red',${betAmount})">RED $${betAmount}</button>
        <button class="rbet blk" onclick="curGame.placeBet('black',${betAmount})">BLACK $${betAmount}</button>
        <button class="rbet grn" onclick="curGame.placeBet('green',${betAmount})">0 $${betAmount}</button>
        <button class="rbet" onclick="curGame.placeBet('even',${betAmount})">EVEN $${betAmount}</button>
        <button class="rbet" onclick="curGame.placeBet('odd',${betAmount})">ODD $${betAmount}</button>
        <button class="rbet" onclick="curGame.placeBet('1-18',${betAmount})">1-18 $${betAmount}</button>
        <button class="rbet" onclick="curGame.placeBet('19-36',${betAmount})">19-36 $${betAmount}</button>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="curGame.spin()" ${!this.bets.length ? 'disabled' : ''}>SPIN</button>
        <button class="btn danger" onclick="curGame.clearBets()">CLEAR</button>
        ${this.phase === 'result' ? `<button class="btn" onclick="curGame.start(curGame.bal);curGame.renderUI()">NEW SPIN</button>` : ''}
      </div>`;
  }
}
