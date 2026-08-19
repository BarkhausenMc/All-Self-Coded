const constants = require('../config/constants');
const store = require('../data/store');

const API_URL = process.env.PARTNER_API_URL;
const API_TOKEN = process.env.PARTNER_API_TOKEN;

const MOB_ID_MAP = {
    'Skeleton':    'skeleton',
    'Creeper':     'creeper',
    'Iron_Golem':  'iron_golem',
    'Spider':      'spider',
    'Blaze':       'blaze',
    'Pig':         'pig',
    'Cow':         'cow'
};

async function pushPricesToApi() {
    if (!API_URL || !API_TOKEN) {
        return { 
            success: false, 
            error: 'PARTNER_API_URL oder PARTNER_API_TOKEN nicht gesetzt',
            shortError: 'API-Konfiguration fehlt'
        };
    }

    const offers = [];

    for (const [botName, mobId] of Object.entries(MOB_ID_MAP)) {
        if (!constants.prices[botName]) continue;

        const ankauf = store.getPrice(botName, 'ankauf');
        const verkauf = store.getPrice(botName, 'verkauf');

        const sellPrice = ankauf === 'Stop' ? null : Math.round(ankauf * 1_000_000);
        const buyPrice  = verkauf === 'Stop' ? null : Math.round(verkauf * 1_000_000);

        offers.push({ mobId, buy: buyPrice, sell: sellPrice });
    }

    if (offers.length === 0) {
        return { success: false, error: 'Keine gültigen Spawner-Preise gefunden', shortError: 'Keine Preise' };
    }

    try {
        console.log('📡 API-Call: POST', API_URL);
        console.log('📦 Payload:', JSON.stringify({ offers }, null, 2));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ offers })
        });

        const responseText = await response.text().catch(() => '');

        if (!response.ok) {
            // Cloudflare-Block erkennen
            if (responseText.includes('cloudflare') || responseText.includes('Just a moment')) {
                return {
                    success: false,
                    error: `Cloudflare Block (${response.status})`,
                    shortError: '⚠️ Cloudflare-Block – API-Token prüfen'
                };
            }
            
            return {
                success: false,
                error: `HTTP ${response.status}`,
                shortError: `Fehler: HTTP ${response.status}`
            };
        }

        const pushed = offers.length;
        return { 
            success: true, 
            pushed, 
            skipped: Object.keys(MOB_ID_MAP).length - pushed,
            shortSuccess: `✅ ${pushed} Spawner synchronisiert`
        };

    } catch (err) {
        console.error('❌ API-Call failed:', err.message);
        return { 
            success: false, 
            error: err.message,
            shortError: `Netzwerkfehler: ${err.code || 'unknown'}`
        };
    }
}

module.exports = { pushPricesToApi };