const { SlashCommandBuilder } = require('discord.js');
const constants = require('../../config/constants');
const store = require('../../data/store');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprice')
        .setDescription('⚙️ Preis für Spawner setzen (Trader Admin)')
        .addStringOption(opt =>
            opt.setName('spawner')
                .setDescription('Welcher Spawner?')
                .setRequired(true)
                .addChoices(
                    { name: 'Skeleton 💀', value: 'Skeleton' },
                    { name: 'Creeper 💥', value: 'Creeper' }
                )
        )
        .addStringOption(opt =>
            opt.setName('typ')
                .setDescription('Ankauf oder Verkauf?')
                .setRequired(true)
                .addChoices(
                    { name: '🛒 Ankauf', value: 'ankauf' },
                    { name: '💰 Verkauf', value: 'verkauf' }
                )
        )
        .addNumberOption(opt =>
            opt.setName('preis')
                .setDescription('Neuer Preis in Millionen (z.B. 12.5)')
                .setRequired(true)
                .setMinValue(0)
        ),

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(constants.TRADER_ADMIN_ROLE_ID)) {
            await interaction.reply({
                content: '❌ Nur Trader Admins dürfen Preise setzen!',
                flags: 64
            });
            return;
        }

        const spawner = interaction.options.getString('spawner');
        const typ = interaction.options.getString('typ');
        const preis = interaction.options.getNumber('preis');

        // Alten Preis merken
        const oldPrice = store.getPrice(spawner, typ);

        // Neuen Preis setzen
        store.setPrice(spawner, typ, preis);

        // ⭐ PRICE PANEL AUTO-UPDATE
        await store.updatePricePanel(interaction.channel);

        const emoji = constants.spawnerEmojis[spawner] || '📦';
        const typLabel = typ === 'ankauf' ? '🛒 ANKAUF' : '💰 VERKAUF';
        const oldStr = oldPrice === 'Stop' ? 'GESTOPT' : `${oldPrice.toFixed(1)}M`;

        await interaction.reply({
            content: `✅ Preis aktualisiert!\n${emoji} ${spawner} — ${typLabel}: ~~${oldStr}~~ → **${preis.toFixed(1)}M**\n\n📊 Das Preis-Panel wurde automatisch aktualisiert!`,
            flags: 64
        });
    }
};