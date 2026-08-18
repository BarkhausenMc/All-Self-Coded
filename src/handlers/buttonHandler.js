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

// === HELPER: Trade finden ===
function findTrade(channelId) {
    const variants = [
        channelId, String(channelId),
        String(parseInt(channelId)), parseInt(channelId),
        channelId.toString()
    ];
    const uniqueVariants = [...new Set(variants)];
    for (const variant of uniqueVariants) {
        if (store.trades[variant]) return store.trades[variant];
    }
    console.warn(`⚠️ Trade NICHT gefunden für Channel: "${channelId}"`);
    console.warn(`Verfügbare Keys:`, Object.keys(store.trades));
    return null;
}

// === TRADE LOGGING ===
async function logTrade(interaction, trade, status) {
    const logChannel = interaction.guild.channels.cache.get(constants.LOG_CHANNEL_ID);
    if (!logChannel) return;

    const logContainer = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## ${trade.emoji} • Handel #${trade.handNummer}\n\n` +
                `**Status:** ${status}\n` +
                `**Zeit:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                `**👤 Kunde:** <@${trade.kundeId}>\n` +
                `**🎮 ING:** \`${trade.ingameName}\`\n` +
                `**🤝 Trader:** ${trade.claimedBy ? `<@${trade.claimedBy}>` : 'Nicht geclaimt'}\n\n` +
                `**${trade.spawnerEmoji} Spawner:** ${trade.spawnerType}\n` +
                `**📦 Menge:** ${trade.amount}\n` +
                `**💵 Preis/Stk:** ${trade.pricePerUnit.toFixed(1)}M\n` +
                `**💰 Gesamtpreis:** ${trade.totalPrice.toFixed(1)}M`
            )
        );

    await logChannel.send({
        components: [logContainer],
        flags: MessageFlags.IsComponentsV2
    });
}

module.exports = async function handleButton(interaction) {

    // === CLAIM BUTTON ===
    if (interaction.customId === 'claim') {
        const trade = findTrade(interaction.channelId);

        if (!trade) {
            await interaction.reply({ content: '❌ Trade nicht gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (trade.claimedBy) {
            await interaction.reply({ content: `❌ Bereits von <@${trade.claimedBy}> geclaimt.`, flags: MessageFlags.Ephemeral });
            return;
        }

        if (!interaction.member.roles.cache.has(constants.TRADER_ROLE_ID)) {
            await interaction.reply({ content: '❌ Nur Trader dürfen Trades claimen.', flags: MessageFlags.Ephemeral });
            return;
        }

        trade.claimedBy = interaction.user.id;
        store.save();

        await updateTradeMessage(interaction.channel, trade);

        await interaction.reply({ content: `✅ Du hast den Trade geclaimt!`, flags: MessageFlags.Ephemeral });
        return;
    }

    // === FREIGEBEN BUTTON (Unclaim) ===
    if (interaction.customId === 'freigeben') {
        const trade = findTrade(interaction.channelId);

        if (!trade || !trade.claimedBy) {
            await interaction.reply({ content: '❌ Trade ist nicht geclaimt.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.user.id !== trade.claimedBy) {
            await interaction.reply({ content: `❌ Nur <@${trade.claimedBy}> kann den Trade freigeben.`, flags: MessageFlags.Ephemeral });
            return;
        }

        // Unclaim → zurück zu Claim + Abbrechen
        trade.claimedBy = null;
        store.save();

        await updateTradeMessage(interaction.channel, trade);

        await interaction.reply({ content: `🔓 Trade freigegeben! Jeder Trader kann ihn jetzt neu claimen.`, flags: MessageFlags.Ephemeral });
        return;
    }

    // === ALS ANGEKAUFT MARKIEREN → Vouch-Phase ===
    if (interaction.customId === 'complete') {
        const trade = findTrade(interaction.channelId);

        if (!trade || !trade.claimedBy) {
            await interaction.reply({ content: '❌ Der Trade muss erst geclaimt werden.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (interaction.user.id !== trade.claimedBy) {
            await interaction.reply({ content: `❌ Nur <@${trade.claimedBy}> darf den Trade abschließen.`, flags: MessageFlags.Ephemeral });
            return;
        }

        trade.awaitingVouch = true;
        trade.vouches = [];
        trade.vouchEntries = [];
        store.save();

        // Original-Nachricht aktualisieren (Buttons verschwinden)
        await updateTradeMessage(interaction.channel, trade);

        // Bewertungs-UI senden
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

        await interaction.reply({ content: `✅ Trade abgeschlossen — bitte bewertet euch gegenseitig!`, flags: MessageFlags.Ephemeral });
        return;
    }

    // === ABBRUCH BUTTON ===
    if (interaction.customId === 'abbruch') {
        const trade = findTrade(interaction.channelId);

        if (!trade) {
            await interaction.reply({ content: '❌ Trade nicht gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        trade.cancelled = true;
        store.save();

        await updateTradeMessage(interaction.channel, trade);

        await interaction.channel.send({ content: `⏳ Dieses Ticket wird in **5 Sekunden** gelöscht...` });

        await interaction.reply({ content: `❌ Trade abgebrochen. Ticket wird gelöscht.`, flags: MessageFlags.Ephemeral });

        setTimeout(async () => {
            try {
                await logTrade(interaction, trade, '❌ ABGEBROCHEN');
                await interaction.channel.delete();
                delete store.trades[interaction.channelId];
                store.save();
            } catch (err) {
                console.log('Fehler beim Löschen:', err.message);
            }
        }, 5000);
        return;
    }

    // === SPAWNER ANKAUF BUTTON (DYNAMIC) ===
    if (interaction.customId === 'spawner_ankaufen') {
        const ankaufOptions = Object.entries(constants.prices).map(([name, prices]) => {
            const isStopped = prices.ankauf === 'Stop' || prices.ankauf === undefined;
            return {
                label: `${constants.spawnerEmojis[name] || '📦'} ${name} Spawner`,
                description: isStopped ? '⚠️ Ankauf derzeit GESPERRT' : `Preis: ${prices.ankauf.toFixed(1)}M`,
                value: name,
                emoji: constants.spawnerEmojis[name] || '📦'
            };
        });

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

    // === SPAWNER VERKAUF BUTTON (DYNAMIC) ===
    if (interaction.customId === 'spawner_verkaufen') {
        const verkaufOptions = Object.entries(constants.prices).map(([name, prices]) => {
            const isStopped = prices.verkauf === 'Stop' || prices.verkauf === undefined;
            return {
                label: `${constants.spawnerEmojis[name] || '📦'} ${name} Spawner`,
                description: isStopped ? '⚠️ Verkauf derzeit GESPERRT' : `Du bekommst: ${prices.verkauf.toFixed(1)}M`,
                value: name,
                emoji: constants.spawnerEmojis[name] || '📦'
            };
        });

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