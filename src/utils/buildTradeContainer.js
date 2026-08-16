const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');

module.exports = function buildTradeContainer(data) {
    // Status-Text dynamisch bestimmen je nach Trade-Zustand
    let statusText;
    if (data.cancelled) {
        statusText = `❌ **Trade abgebrochen!**`;
    } else if (data.closed) {
        statusText = `✅ **Trade abgeschlossen!**`;
    } else if (data.claimedBy) {
        statusText = `🔒 Das Ticket wurde von <@${data.claimedBy}> geclaimt.`;
    } else {
        statusText = `🔓 Das Ticket wurde noch nicht geclaimt!`;
    }

    return new ContainerBuilder()
        // --- Header: Emoji + Aktion + Handelsnummer ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${data.emoji} • Spawner ${data.action}\n\n` +
                `**🤝 • Handel #${data.handNummer}**`
            )
        )
        // --- Trennlinie ---
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        // --- Kunden-Info Block ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**👤 Kunde:** <@${data.kundeId}>\n` +
                `**🎮 ING:** \`${data.ingameName}\`\n` +
                `**${data.spawnerEmoji} Spawner:** ${data.spawnerType}\n`
            )
        )
        // --- Trennlinie ---
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        // --- Preis-Info Block ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**📦 Menge:** ${data.amount}\n` +
                `**💵 Preis/Stk:** ${data.pricePerUnit.toFixed(1)}M\n` +
                `**💰 Gesamtpreis:** ${data.totalPrice.toFixed(1)}M`
            )
        )
        // --- Trennlinie ---
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        // --- Status-Text (dynamisch) ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(statusText)
        );
};