function buildPricePanel() {
    const priceLines = Object.entries(constants.prices).map(([name]) => {
        const dynAnkauf = getPrice(name, 'ankauf');
        const dynVerkauf = getPrice(name, 'verkauf');
        
        const ankauf = dynAnkauf === 'Stop' ? 'STOP' : `${dynAnkauf.toFixed(1)}M`;
        const verkauf = dynVerkauf === 'Stop' ? 'STOP' : `${dynVerkauf.toFixed(1)}M`;
        const emoji = constants.spawnerEmojis[name] || '📦';
        return `${emoji} ${name.padEnd(12)} ${ankauf.padStart(10)}  ${verkauf.padStart(10)}`;
    }).join('\n');

    // === BESTAND ALS KOMPAKTE SÄTZE ===
    const stockLines = Object.entries(constants.prices).map(([name]) => {
        const stock = getInventory(name);
        const emoji = constants.spawnerEmojis[name] || '📦';
        const stockStr = stock > 0 ? `**${stock}** Stück` : '**0** Stück';
        return `${emoji} ${name}: ${stockStr}`;
    }).join(' • ');

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## :shopping_cart: • SPAWNER TRADING • :moneybag:\n*Yayks Spawner Trading*\n||*Only Trusted Trader, Faire Preise :purple_heart:*||')
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '### 💰 • AKTUELLE PREISE\n' +
                '```\n' +
                'SPAWNER      🛒ANKAUF    💰VERKAUF\n' +
                '────────────────────────────────────\n' +
                priceLines + '\n' +
                '```'
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### 📦 • AKTUELLER BESTAND\n` +
                `${stockLines}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('💰 **VERKAUFEN** — Du **verkaufst** uns deine Spawner')
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('🛒 **ANKAUF** — Du **kaufst** unsere Spawner')
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('Klicke unten auf den `💰 VERKAUFEN` oder `🛒 ANKAUF` Button,\num einen Trade zu Starten.')
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('spawner_ankaufen')
            .setLabel('Spawner Kaufen')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🛒'),
        new ButtonBuilder()
            .setCustomId('spawner_verkaufen')
            .setLabel('Spawner Verkaufen')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💰')
    );

    return [container, row];
}