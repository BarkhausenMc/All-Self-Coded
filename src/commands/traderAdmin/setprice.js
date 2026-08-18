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

        store.setPrice(spawner, typ, preis);

        const emoji = constants.spawnerEmojis[spawner] || '📦';
        const typLabel = typ === 'ankauf' ? '🛒 ANKAUF' : '💰 VERKAUF';

        await interaction.reply({
            content: `✅ Preis gesetzt!\n${emoji} ${spawner} — ${typLabel}: **${preis.toFixed(1)}M**`,
            flags: 64
        });
    }
};