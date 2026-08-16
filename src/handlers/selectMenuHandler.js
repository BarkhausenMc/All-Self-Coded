const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const constants = require('../config/constants');

module.exports = async function handleSelectMenu(interaction) {
    if (interaction.customId.startsWith('select_spawner:')) {
        const tradeType = interaction.customId.split(':')[1];
        const spawnerType = interaction.values[0];

        // === STOP-PRÜFUNG ===
        const price = constants.prices[spawnerType]?.[tradeType];
        if (price === 'Stop' || price === undefined) {
            await interaction.update({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## ❌ • Nicht verfügbar\n\n` +
                                `**${spawnerType}** (${tradeType}) ist aktuell gesperrt.\n` +
                                `Bitte versuche es später erneut oder wähle einen anderen Spawner.`
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
            return;
        }

        // Modal bauen
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