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
        if (!interaction.member.roles.cache.has(constants.TRADER_ADMIN_ROLE_ID)) {
            await interaction.reply({
                content: '❌ Nur Trader Admins dürfen Trades stoppen!',
                flags: 64
            });
            return;
        }

        const spawner = interaction.options.getString('spawner');
        const typ = interaction.options.getString('typ');

        const newValue = store.togglePrice(spawner, typ);
        const isStopped = newValue === 'Stop';

        const emoji = constants.spawnerEmojis[spawner] || '📦';
        const typLabel = typ === 'ankauf' ? '🛒 ANKAUF' : '💰 VERKAUF';
        const status = isStopped ? '🔴 GESTOPT' : '🟢 FREIGEGEBEN';

        await interaction.reply({
            content: `${emoji} ${spawner} — ${typLabel}: **${status}**`,
            flags: 64
        });
    }
};