const fs = require('fs');
const path = require('path');
const constants = require('../config/constants');

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
    } catch (err) {
        console.error('❌ Fehler beim Speichern:', err);
    }
}

function getPrice(spawnerName, type) {
    if (data.prices && data.prices[spawnerName] && data.prices[spawnerName][type] !== undefined) {
        return data.prices[spawnerName][type];
    }
    return constants.prices[spawnerName]?.[type] || 0;
}

function setPrice(spawnerName, type, value) {
    if (!data.prices) data.prices = {};
    if (!data.prices[spawnerName]) data.prices[spawnerName] = {};
    data.prices[spawnerName][type] = value;
    // Auch in constants updaten damit andere Dateien sofort den neuen Preis sehen
    if (constants.prices[spawnerName]) {
        constants.prices[spawnerName][type] = value;
    }
    saveData();
}

function togglePrice(spawnerName, type) {
    if (!data.prices) data.prices = {};
    if (!data.prices[spawnerName]) data.prices[spawnerName] = {};
    const current = data.prices[spawnerName][type];
    if (current === 'Stop') {
        const defaultValue = constants.prices[spawnerName]?.[type] || 0;
        data.prices[spawnerName][type] = defaultValue;
        if (constants.prices[spawnerName]) {
            constants.prices[spawnerName][type] = defaultValue;
        }
    } else {
        data.prices[spawnerName][type] = 'Stop';
        if (constants.prices[spawnerName]) {
            constants.prices[spawnerName][type] = 'Stop';
        }
    }
    saveData();
    return data.prices[spawnerName][type];
}

loadData();

module.exports = {
    get tradeCounters() { return data.tradeCounters; },
    get trades() { return data.trades; },
    get vouches() { return data.vouches; },
    get traderStats() { return data.traderStats; },
    save: saveData,
    reload: loadData,
    getPrice,
    setPrice,
    togglePrice
};