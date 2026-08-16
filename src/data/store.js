const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/database.json');

let data = {
    tradeCounters: {},
    trades: {},
    vouches: []
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
        console.log('✅ Datenbank geladen:', Object.keys(data.trades).length, 'aktive Trades');
        
        // DEBUG: Zeige alle gespeicherten Trade-IDs
        console.log('Stored Trade IDs:', Object.keys(data.trades));
    } catch (err) {
        console.error('❌ Fehler beim Laden:', err);
        data = { tradeCounters: {}, trades: {}, vouches: [] };
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
    tradeCounters: data.tradeCounters,
    trades: data.trades,
    vouches: data.vouches,
    data: data,
    save: saveData,
    reload: loadData
};