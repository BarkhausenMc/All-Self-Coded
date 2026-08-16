module.exports = {
    prices: {
        Skeleton: { ankauf: 10.0, verkauf: 'Stop' },
        Creeper:  { ankauf: 10.0, verkauf: 9.0 }
    },

    spawnerEmojis: {
        Skeleton: '💀',
        Creeper:  '💥'
    },

    TRADER_ROLE_ID: process.env.TRADER_ROLE_ID,
    CHANNEL_ID: process.env.CHANNEL_ID,
    VOUCH_CHANNEL_ID: process.env.VOUCH_CHANNEL_ID,
    LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID
};