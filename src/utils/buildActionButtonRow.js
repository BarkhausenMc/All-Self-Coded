const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = function buildActionButtonRow(data) {
    // Wenn Trade geschlossen oder abgebrochen → keine Buttons
    if (data.closed || data.cancelled) return null;

    if (data.claimedBy) {
        // Geclaimt → [Schließen] [Abbrechen]
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close')
                .setLabel('Schließen')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('abbruch')
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Secondarys)
                .setEmoji('🗑️')
        );
    } else {
        // Nicht geclaimt → [Claim] [Abbrechen]
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