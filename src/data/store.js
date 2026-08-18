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
        console.log('💾 Datenbank gespeichert');
    } catch (err) {
        console.error('❌ Fehler beim Speichern:', err);
    }
}

// ⭐ HILFSFUNKTIONEN FÜR PREISE (NEU)
function getPrice(spawnerName, type) {
    return constants.prices[spawnerName]?.[type] || 0;
}

function setPrice(spawnerName, type, value) {
    // In Zukunft hier speichern, jetzt nur Log
    console.log(`Preis gesetzt: ${spawnerName} ${type} = ${value}`);
}

function togglePrice(spawnerName, type) {
    // In Zukunft hier speichern, jetzt nur Log
    console.log(`Preis toggled: ${spawnerName} ${type}`);
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