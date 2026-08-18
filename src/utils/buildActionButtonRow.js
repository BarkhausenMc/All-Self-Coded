const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = function buildActionButtonRow(data) {
    if (data.closed || data.cancelled) return null;
    if (data.awaitingVouch) return null;

    if (data.claimedBy) {
        // ✅ CLAIMED: "Als angekauft markieren" + "Freigeben" + "Abbrechen"
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('complete')
                .setLabel('Als angekauft markieren ✓')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('close')
                .setLabel('Freigeben 🔓')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔓'),
            new ButtonBuilder()
                .setCustomId('abbruch')
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
        );
    } else {
        // 🔓 NOT CLAIMED: "Claim" + "Freigeben" + "Abbrechen"
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim')
                .setLabel('Freigeben 🔓')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔓'),
            new ButtonBuilder()
                .setCustomId('abbruch')
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
        );
    }
};