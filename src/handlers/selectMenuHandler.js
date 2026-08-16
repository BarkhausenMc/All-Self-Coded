const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = async function handleSelectMenu(interaction) {
    if (interaction.customId.startsWith('select_spawner:')) {
        const tradeType = interaction.customId.split(':')[1];
        const spawnerType = interaction.values[0];

        const modal = new ModalBuilder()
            .setCustomId(`trade_modal:${tradeType}:${spawnerType}`)
            .setTitle(tradeType === 'ankauf' ? '🛒 Spawner Ankauf' : '💰 Spawner Verkauf');

        const ingameNameInput = new TextInputBuilder()
            .setCustomId('ingame_name')
            .setLabel('Wie lautet dein Ingame-Name?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. Steve')
            .setRequired(true);

        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel(tradeType === 'ankauf' ? 'Wie viele Spawner möchtest du kaufen?' : 'Wie viele Spawner möchtest du verkaufen?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. 3')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(ingameNameInput),
            new ActionRowBuilder().addComponents(amountInput)
        );

        await interaction.showModal(modal);
    }
};