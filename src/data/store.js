const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/database.json');

let data = {
    tradeCounters: {},
    trades: {},
    vouches: [],
    traderStats: {}
};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            data = JSON.parse(raw);
        }
        if (!data.tradeCounters) data.tradeCounters = {};
        if (!data.trades) data.trades = {};
        if (!data.vouches) data.vouches = [];
        if (!data.traderStats) data.traderStats = {};
        console.log('✅ Datenbank geladen:', Object.keys(data.trades).length, 'aktive Trades');
        console.log('📊 Trader-Stats:', Object.keys(data.traderStats).length, 'Trader erfasst');
    } catch (err) {
        console.error('❌ Fehler beim Laden:', err);
        data = { tradeCounters: {}, trades: {}, vouches: [], traderStats: {} };
    }
}

function saveData() {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('💾 Datenbank gespeichert');
    } catch (err) {
        console.error('❌ Fehler beim Speichern:', err);
    }
}

loadData();

module.exports = {
    get tradeCounters() { return data.tradeCounters; },
    get trades() { return data.trades; },
    get vouches() { return data.vouches; },
    get traderStats() { return data.traderStats; },
    save: saveData,
    reload: loadData
};