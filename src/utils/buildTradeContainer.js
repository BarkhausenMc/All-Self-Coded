const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');

module.exports = function buildTradeContainer(data) {
    // === ABGEBROCHEN ===
    if (data.cancelled) {
        return new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ❌ • Handel abgebrochen\n\n` +
                    `**Handel #${data.handNummer}** wurde abgebrochen.\n\n` +
                    `Dieser Thread wird in Kürze gelöscht.`
                )
            );
    }

    // === ABGESCHLOSSEN (warten auf Vouch) ===
    if (data.awaitingVouch) {
        const vouchCount = (data.vouches || []).length;
        return new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ⏳ • Warte auf Bewertungen (${vouchCount}/2)\n\n` +
                    `Bitte bewertet euch gegenseitig im Thread!`
                )
            );
    }

    // === ABGESCHLOSSEN (beide bewertet) ===
    if (data.closed) {
        return new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ✅ • Handel abgeschlossen\n\n` +
                    `Abgeschlossen von <@${data.claimedBy}>.\n` +
                    `Dieser Thread wird in Kürze gelöscht.`
                )
            );
    }

    // === STANDARD (offen oder geclaimt) ===
    let statusLine;
    if (data.claimedBy) {
        statusLine = `🔒 Das Ticket wurde von <@${data.claimedBy}> geclaimt.`;
    } else {
        statusLine = `🔓 Das Ticket wurde noch nicht geclaimt!`;
    }

    return new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${data.emoji} • Spawner ${data.action}\n\n` +
                `**🤝 • Handel #${data.handNummer}**`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**👤 Kunde:** <@${data.kundeId}>\n` +
                `**🎮 ING:** \`${data.ingameName}\`\n` +
                `**${data.spawnerEmoji} Spawner:** ${data.spawnerType}\n`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**📦 Menge:** ${data.amount}\n` +
                `**💵 Preis/Stk:** ${data.pricePerUnit.toFixed(1)}M\n` +
                `**💰 Gesamtpreis:** ${data.totalPrice.toFixed(1)}M`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(statusLine)
        );
};