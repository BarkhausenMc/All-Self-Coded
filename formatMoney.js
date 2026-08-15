function formatMoney(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
}

module.exports = { formatMoney };