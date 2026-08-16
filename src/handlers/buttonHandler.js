const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

const store = require('../data/store');
const constants = require('../config/constants');
const updateTradeMessage = require('../utils/updateTradeMessage');

async function closeThreadAfterDelay(channel, delaySeconds) {
    setTimeout(async () => {
        try {
            await channel.setLocked(true);
            await channel.setArchived(true);
        } catch (err) {
            // Ignorieren
        }
    }, delaySeconds * 1000);
}

module.exports = async function handleButton(interaction) {

    // === CLAIM BUTTON ===
if (interaction.customId === 'claim') {
    const trade = store.trades[interaction.channelId];

    if (!trade) {
        console.error('[CLAIM ERROR] Trade nicht gefunden für Channel:', interaction.channelId);
        await interaction.reply({ content: '❌ Trade nicht gefunden.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (trade.claimedBy) {
        await interaction.reply({
            content: `❌ Bereits von <@${trade.claimedBy}> geclaimt.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!interaction.member.roles.cache.has(constants.TRADER_ROLE_ID)) {
        await interaction.reply({
            content: '❌ Nur Mitglieder mit der Trader-Rolle dürfen Trades claimen.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    trade.claimedBy = interaction.user.id;
    store.save();

    await updateTradeMessage(interaction.channel, trade);

    await interaction.reply({
        content: `✅ Du hast den Trade geclaimt!`,
        flags: MessageFlags.Ephemeral
    });
    return;
}

    // === CLOSE BUTTON → Vouch-Phase ===
    if (interaction.customId === 'close') {
        const trade = store.trades[interaction.channelId];

        if (!trade || !trade.claimedBy) {
            await interaction.reply({
                content: '❌ Der Trade muss erst geclaimt werden.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (interaction.user.id !== trade.claimedBy) {
            await interaction.reply({
                content: `❌ Nur <@${trade.claimedBy}> darf diesen Trade abschließen.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        trade.awaitingVouch = true;
        trade.vouches = [];
        trade.vouchEntries = [];
        store.save();

        await updateTradeMessage(interaction.channel, trade);

        const starSelect = new StringSelectMenuBuilder()
            .setCustomId('vouch_stars')
            .setPlaceholder('⭐ Bewerte deinen Trade-Partner (1-5 Sterne)')
            .addOptions([
                { label: '⭐ 1 Stern', description: 'Sehr schlechte Erfahrung', value: '1', emoji: '⭐' },
                { label: '⭐⭐ 2 Sterne', description: 'Schlechte Erfahrung', value: '2', emoji: '⭐' },
                { label: '⭐⭐⭐ 3 Sterne', description: 'Okay', value: '3', emoji: '⭐' },
                { label: '⭐⭐⭐⭐ 4 Sterne', description: 'Gute Erfahrung', value: '4', emoji: '⭐' },
                { label: '⭐⭐⭐⭐⭐ 5 Sterne', description: 'Sehr gute Erfahrung', value: '5', emoji: '⭐' }
            ]);

        const vouchRow = new ActionRowBuilder().addComponents(starSelect);

        const vouchContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📝 • Trade Bewertung\n\n` +
                    `Bitte bewertet euch gegenseitig!\n` +
                    `Wähle unten deine Sterne-Bewertung aus.\n` +
                    `Danach kannst du noch einen Text schreiben.\n\n` +
                    `**Kunde:** <@${trade.kundeId}>\n` +
                    `**Trader:** <@${trade.claimedBy}>`
                )
            )
            .addActionRowComponents(vouchRow);

        await interaction.channel.send({
            components: [vouchContainer],
            flags: MessageFlags.IsComponentsV2
        });

        await interaction.reply({
            content: `✅ Trade wird abgeschlossen — bitte bewertet euch gegenseitig!`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // === ABBRUCH BUTTON ===
    if (interaction.customId === 'abbruch') {
        const trade = store.trades[interaction.channelId];

        if (!trade) {
            await interaction.reply({
                content: '❌ Trade nicht gefunden.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        trade.cancelled = true;
        store.save();

        await updateTradeMessage(interaction.channel, trade);

        await interaction.channel.send({
            content: `⏳ Dieses Ticket wird in **5 Sekunden** geschlossen...`,
        });

        await interaction.reply({
            content: `❌ Trade wurde abgebrochen. Ticket schließt in 5 Sekunden.`,
            flags: MessageFlags.Ephemeral
        });

        closeThreadAfterDelay(interaction.channel, 5);

        delete store.trades[interaction.channelId];
        store.save();
        return;
    }

// === SPAWNER TRADING BUTTONS (DYNAMISCHE OPTIONEN) ===
if (interaction.customId === 'spawner_ankaufen') {
    const ankaufOptions = Object.entries(constants.prices)
        .filter(([name, prices]) => prices.ankauf !== 'Stop' && prices.ankauf !== undefined)
        .map(([name, prices]) => ({
            label: `${constants.spawnerEmojis[name] || '📦'} ${name} Spawner`,
            description: `Preis: ${prices.ankauf.toFixed(1)}M`,
            value: name,
            emoji: constants.spawnerEmojis[name] || '📦'
        }));

    if (ankaufOptions.length === 0) {
        await interaction.reply({
            content: '## ❌ • Keine Spawner verfügbar\n\nAktuell können keine Spawner gekauft werden.',
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_spawner:ankauf')
        .setPlaceholder('Spawner auswählen...')
        .addOptions(ankaufOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## 🛒 • Spawner Ankauf\nWähle unten den Spawner, den du **kaufen** möchtest.')
        )
        .addActionRowComponents(row);

    await interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
}

if (interaction.customId === 'spawner_verkaufen') {
    const verkaufOptions = Object.entries(constants.prices)
        .filter(([name, prices]) => prices.verkauf !== 'Stop' && prices.verkauf !== undefined)
        .map(([name, prices]) => ({
            label: `${constants.spawnerEmojis[name] || '📦'} ${name} Spawner`,
            description: `Du bekommst: ${prices.verkauf.toFixed(1)}M`,
            value: name,
            emoji: constants.spawnerEmojis[name] || '📦'
        }));

    if (verkaufOptions.length === 0) {
        await interaction.reply({
            content: '## ❌ • Keine Spawner verfügbar\n\nAktuell können keine Spawner verkauft werden.',
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_spawner:verkauf')
        .setPlaceholder('Spawner auswählen...')
        .addOptions(verkaufOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## 💰 • Spawner Verkauf\nWähle unten den Spawner, den du **verkaufen** möchtest.')
        )
        .addActionRowComponents(row);

    await interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    });
    return;
}
};