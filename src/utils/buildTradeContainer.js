const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');

module.exports = function buildTradeContainer(data) {
    if (data.cancelled) {
        return new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ❌ • Handel abgebrochen\n\n` +
                    `**Handel #${data.handNummer}** wurde vom Kunde abgebrochen.\n\n` +
                    `Dieser Thread wird automatisch archiviert.`
                )
            );
    }
    
    if (data.closed) {
        const customerRating = data.vouchEntries?.find(v => v.reviewerId === data.kundeId);
        const traderRating = data.vouchEntries?.find(v => v.reviewerId === data.claimedBy);
        
        return new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ✅ Handel abgeschlossen\n\n` +
                    `Abgeschlossen von <@${data.claimedBy}>.\n` +
                    `Dieser Thread wird in Kürze automatisch archiviert.`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ⭐ Bewertung · Handel #${data.handNummer}\n\n` +
                    `Der Handel ist abgeschlossen! Bitte bewertet euch gegenseitig.\n\n` +
                    `${customerRating ? `**@Kunde**` : '@Kunde'} ${customerRating ? '⭐' : '⏳ Ausstehend'}\n` +
                    `${traderRating ? `**@Trader**` : '@Trader'} ${traderRating ? '⭐' : '⏳ Ausstehend'}`
                )
            );
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
            new TextDisplayBuilder().setContent(statusText)
        );

}; s