const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = function buildActionButtonRow(data) {
    // Abgeschlossen oder abgebrochen → keine Buttons
    if (data.closed || data.cancelled) return null;

    // Vouch-Phase → kein Close/Claim Button mehr
    if (data.awaitingVouch) return null;

    if (data.claimedBy) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close')
                .setLabel('Schließen')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('abbruch')
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️')
        );
    } else {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim')
                .setLabel('Claim')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🙋‍♂️'),
            new ButtonBuilder()
                .setCustomId('abbruch')
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️')
        );
    }
};