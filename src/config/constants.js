module.exports = {
    prices: {
        Skeleton: { ankauf: 10.0, verkauf: '1.0' },
        Creeper:  { ankauf: Stop, verkauf: 9.0 }
    },

    spawnerEmojis: {
        Skeleton: '💀',
        Creeper:  '💥'
    },

    TRADER_ROLE_ID: process.env.TRADER_ROLE_ID,
    CHANNEL_ID: process.env.CHANNEL_ID,
    VOUCH_CHANNEL_ID: process.env.VOUCH_CHANNEL_ID
};