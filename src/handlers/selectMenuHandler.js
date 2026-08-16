const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = async function handleSelectMenu(interaction) {
    if (interaction.customId.startsWith('select_spawner:')) {
        // customId Format: 'select_spawner:ankauf' oder 'select_spawner:verkauf'
        const tradeType = interaction.customId.split(':')[1];  // 'ankauf' oder 'verkauf'
        const spawnerType = interaction.values[0];              // 'Skeleton' oder 'Creeper'

        // Modal bauen — customId enthält BEIDE Infos: tradeType + spawnerType
        const modal = new ModalBuilder()
            .setCustomId(`trade_modal:${tradeType}:${spawnerType}`)
            .setTitle(tradeType === 'ankauf' ? '🛒 Spawner Ankauf' : '💰 Spawner Verkauf');

        // Textfeld 1: Ingame-Name
        const ingameNameInput = new TextInputBuilder()
            .setCustomId('ingame_name')
            .setLabel('Wie lautet dein Ingame-Name?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. Steve')
            .setRequired(true);

        // Textfeld 2: Menge (Label ändert sich je nach Ankauf/Verkauf)
        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel(tradeType === 'ankauf' ? 'Wie viele Spawner möchtest du kaufen?' : 'Wie viele Spawner möchtest du verkaufen?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. 3')
            .setRequired(true);

        // Textfelder in ActionRows packen (Discord requires das)
        modal.addComponents(
            new ActionRowBuilder().addComponents(ingameNameInput),
            new ActionRowBuilder().addComponents(amountInput)
        );

        await interaction.showModal(modal);
    }
};