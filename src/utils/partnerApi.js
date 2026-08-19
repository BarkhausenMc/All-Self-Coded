const constants = require('../config/constants');
const store = require('../data/store');

const API_URL = process.env.PARTNER_API_URL;
const API_TOKEN = process.env.PARTNER_API_TOKEN;

// Bot-Name → API mobId mapping
const MOB_ID_MAP = {
    'Skeleton':    'skeleton',
    'Creeper':     'creeper',
    'Iron_Golem':  'iron_golem',
    'Spider':      'spider',
    'Blaze':       'blaze',
    'Pig':         'pig',
    'Cow':         'cow'
};

/**
 * Wandelt Bot-Preise in API-Format um und pusht sie.
 * Gibt { success, pushed, skipped, error } zurück.
 */
async function pushPricesToApi() {
    if (!API_URL || !API_TOKEN) {
        return { success: false, error: 'PARTNER_API_URL oder PARTNER_API_TOKEN nicht gesetzt in .env' };
    }

    const offers = [];

    for (const [botName, mobId] of Object.entries(MOB_ID_MAP)) {
        // Nur Spawner pushen, die im Bot konfiguriert sind
        if (!constants.prices[botName]) continue;

        const ankauf = store.getPrice(botName, 'ankauf');
        const verkauf = store.getPrice(botName, 'verkauf');

        // Bot ankauf = API sell (Kunde kauft von uns)
        // Bot verkauf = API buy (Kunde verkauft an uns)
        const sellPrice = ankauf === 'Stop' ? null : Math.round(ankauf * 1_000_000);
        const buyPrice  = verkauf === 'Stop' ? null : Math.round(verkauf * 1_000_000);

        offers.push({ mobId, buy: buyPrice, sell: sellPrice });
    }

    if (offers.length === 0) {
        return { success: false, error: 'Keine gültigen Spawner-Preise gefunden' };
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ offers })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            return { success: false, error: `API antwortete mit ${response.status}: ${errorText}` };
        }

        const result = await response.json().catch(() => ({}));
        const pushed = offers.length;
        const skipped = Object.values(MOB_ID_MAP).length - pushed;

        return { success: true, pushed, skipped, response: result };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = { pushPricesToApi };