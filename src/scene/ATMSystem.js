/* ==================================================================
   ATMSystem – Withdraw money from the ATM
   ================================================================== */

export class ATMSystem {
    constructor(onWithdraw) {
        /** @type {function(number):void} */
        this.onWithdraw = onWithdraw;
        this.isOpen = false;

        this._modal = document.getElementById('atm-modal');
        this._balanceEl = document.getElementById('atm-balance');

        // Bind buttons
        document.querySelectorAll('.atm-withdraw-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                if (amount && this.onWithdraw) {
                    this.onWithdraw(amount);
                    this._animateWithdraw(btn);
                }
            });
        });

        document.getElementById('atm-close')?.addEventListener('click', () => {
            this.close();
        });

        // ESC to close
        this._onKey = (e) => {
            if (e.code === 'Escape' && this.isOpen) {
                e.preventDefault();
                this.close();
            }
        };
        document.addEventListener('keydown', this._onKey);
    }

    open(currentBalance) {
        this.isOpen = true;
        this.updateBalance(currentBalance);
        if (this._modal) this._modal.style.display = 'flex';
    }

    close() {
        this.isOpen = false;
        if (this._modal) this._modal.style.display = 'none';
        if (this.onClose) this.onClose();
    }

    updateBalance(balance) {
        if (this._balanceEl) this._balanceEl.textContent = `$${balance}`;
    }

    _animateWithdraw(btn) {
        btn.classList.add('atm-btn-flash');
        setTimeout(() => btn.classList.remove('atm-btn-flash'), 400);
    }

    dispose() {
        document.removeEventListener('keydown', this._onKey);
    }
}
