const { SlashCommandBuilder } = require('discord.js');
const constants = require('../../config/constants');
const store = require('../../data/store');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggletrade')
        .setDescription('⏸️ Ankauf/Verkauf stoppen oder freigeben (Trader Admin)')
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
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.member.roles.cache.has(constants.TRADER_ADMIN_ROLE_ID)) {
            await interaction.editReply({ content: '❌ Nur Trader Admins dürfen Trades stoppen!' });
            return;
        }

        const spawner = interaction.options.getString('spawner');
        const typ = interaction.options.getString('typ');

        const oldValue = store.getPrice(spawner, typ);
        const newValue = store.togglePrice(spawner, typ);

        // ⭐ ÄNDERUNG AUFZEICHNEN
        store.recordPriceChange(spawner, typ, oldValue, newValue, interaction.user.id);

        // ⭐ PANEL UPDATEN
        await store.updatePricePanel(interaction.client);

        const emoji = constants.spawnerEmojis[spawner] || '📦';
        const typLabel = typ === 'ankauf' ? '🛒 Ankauf' : '💰 Verkauf';
        const isStopped = newValue === 'Stop';
        const oldStatus = oldValue === 'Stop' ? 'GESTOPPT' : `${oldValue.toFixed(1)}M`;
        const newStatus = isStopped ? 'GESTOPPT' : `${newValue.toFixed(1)}M`;

        await interaction.editReply({
            content: `${emoji} ${spawner} — ${typLabel}: ~~${oldStatus}~~ → **${newStatus}**`
        });
    }
};