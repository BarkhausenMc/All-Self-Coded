const fs = require('fs');
const path = require('path');
const constants = require('../config/constants');

const DATA_FILE = path.join(__dirname, '../../data/database.json');

let data = {
    tradeCounters: {},
    trades: {},
    vouches: [],
    traderStats: {},
    prices: {}  // ← NEU! Dynamische Preise
};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            data = JSON.parse(raw);
        }
        // Defaults setzen
        if (!data.tradeCounters) data.tradeCounters = {};
        if (!data.trades) data.trades = {};
        if (!data.vouches) data.vouches = [];
        if (!data.traderStats) data.traderStats = {};
        if (!data.prices) data.prices = {};
        
        console.log('✅ Datenbank geladen:', Object.keys(data.trades).length, 'aktive Trades');
        console.log('📊 Trader-Stats:', Object.keys(data.traderStats).length, 'Trader erfasst');
        console.log('💰 Preise:', Object.keys(data.prices).length, 'dynamische Einträge');
    } catch (err) {
        console.error('❌ Fehler beim Laden:', err);
        data = { tradeCounters: {}, trades: {}, vouches: [], traderStats: {}, prices: {} };
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

// ⭐ HILFER: Preise holen (dynamisch oder default)
function getPrice(spawnerName, type) {
    if (data.prices[spawnerName] && data.prices[spawnerName][type] !== undefined) {
        return data.prices[spawnerName][type];
    }
    // Fallback auf default
    return constants.defaultPrices[spawnerName]?.[type] || 0;
}

// ⭐ HILFER: Preis setzen
function setPrice(spawnerName, type, value) {
    if (!data.prices[spawnerName]) {
        data.prices[spawnerName] = {};
    }
    data.prices[spawnerName][type] = value;
    saveData();
}

// ⭐ HILFER: Preis togglen (Stop ↔ Freigeben)
function togglePrice(spawnerName, type) {
    if (!data.prices[spawnerName]) {
        data.prices[spawnerName] = {};
    }
    const current = data.prices[spawnerName][type];
    if (current === 'Stop') {
        // Zurück auf default
        data.prices[spawnerName][type] = constants.defaultPrices[spawnerName]?.[type] || 0;
    } else {
        // Auf Stop setzen
        data.prices[spawnerName][type] = 'Stop';
    }
    saveData();
}

loadData();

module.exports = {
    get tradeCounters() { return data.tradeCounters; },
    get trades() { return data.trades; },
    get vouches() { return data.vouches; },
    get traderStats() { return data.traderStats; },
    get prices() { return data.prices; },
    save: saveData,
    reload: loadData,
    getPrice,
    setPrice,
    togglePrice
};