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
const buildTradeContainer = require('../utils/buildTradeContainer');

// === TIMEOUT MAP (nicht persistent) ===
const vouchTimeouts = new Map();

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

// === HELPER: Timeout-Cleanup bei Vouch-Force-Close ===
async function forceCloseVouch(interaction, trade) {
    // Timeout löschen
    const timeout = vouchTimeouts.get(interaction.channelId);
    if (timeout) clearTimeout(timeout);
    vouchTimeouts.delete(interaction.channelId);

    // Trade als geschlossen markieren
    trade.awaitingVouch = false;
    trade.closed = true;
    store.save();

    // Nachricht updaten
    try {
        await updateTradeMessage(interaction.channel, trade);
    } catch (err) {}

    // Whatever vouches exist → ins Vouch-Channel posten
    if (trade.vouchEntries && trade.vouchEntries.length > 0) {
        const vouchChannel = interaction.guild.channels.cache.get(constants.VOUCH_CHANNEL_ID);
        if (vouchChannel) {
            let content = `## ${trade.emoji} • Handel #${trade.handNummer}\n\n`;
            content += `**${trade.emoji} Aktion:** ${trade.action}\n`;
            content += `**${trade.spawnerEmoji} Spawner:** ${trade.spawnerType}\n`;
            content += `**📦 Menge:** ${trade.amount}\n`;
            content += `**💰 Gesamtpreis:** ${trade.totalPrice.toFixed(1)}M\n\n`;
            content += `**👤 Kunde:** <@${trade.kundeId}>\n`;
            content += `**🤝 Trader:** <@${trade.claimedBy}>\n\n`;

            for (const vouch of trade.vouchEntries) {
                const role = vouch.reviewerId === trade.kundeId ? 'Kunde' : 'Trader';
                const stars = '⭐'.repeat(vouch.rating);
                content += `### 📝 Bewertung von ${role}\n${stars} (${vouch.rating}/5)\n> ${vouch.text}\n\n`;
            }

            const vouchContainer = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

            await vouchChannel.send({
                components: [vouchContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }

    // Stats updaten für vorhandene Vouches
    if (trade.claimedBy && store.traderStats) {
        if (!store.traderStats[trade.claimedBy]) {
            store.traderStats[trade.claimedBy] = {
                completedTrades: 0, totalVolume: 0, totalEarned: 0, totalSpent: 0, totalStars: 0, starCount: 0
            };
        }
        const stats = store.traderStats[trade.claimedBy];
        stats.completedTrades += 1;
        stats.totalVolume += trade.totalPrice;
        if (trade.action === 'Ankauf') stats.totalEarned += trade.totalPrice;
        else stats.totalSpent += trade.totalPrice;

        const customerVouch = trade.vouchEntries?.find(v => v.reviewerId === trade.kundeId);
        if (customerVouch) {
            stats.totalStars += customerVouch.rating;
            stats.starCount += 1;
        }
        store.save();
    }

    // Loggen
    const vouchCount = (trade.vouches || []).length;
    await logTrade(interaction, trade, `✅ ABGESCHLOSSEN (${vouchCount}/2 Bewertungen)`);

    // Countdown + Löschen
    await interaction.channel.send({ content: `⏳ Dieses Ticket wird in **5 Sekunden** gelöscht...` });

    setTimeout(async () => {
        try {
            await interaction.channel.delete();
            delete store.trades[interaction.channelId];
            store.save();
        } catch (err) {
            console.log('Fehler beim Löschen:', err.message);
        }
    }, 5000);
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
        const claimContainer = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## ✅ Trade geclaimt\n\n` +
            `<@${interaction.user.id}> hat den Handel übernommen!`
        )
    );
        return;
    }

    // === FREIGEBEN BUTTON ===
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

        trade.claimedBy = null;
        store.save();

        await updateTradeMessage(interaction.channel, trade);
        const freigebenContainer = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## 🔓 Trade freigegeben\n\n` +
            `Der Trade wurde freigegeben! Jeder Trader kann ihn jetzt neu claimen.`
        )
    );
        return;
    }

    // === ALS ANGEKAUFT MARKIEREN → Vouch-Phase + 5 MIN TIMEOUT ===
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
                `**Trader:** <@${trade.claimedBy}>\n\n` +
                `⏱️ *Das Ticket schließt automatisch in 5 Minuten.*`
            )
        )
        .addActionRowComponents(vouchRow);

    await interaction.channel.send({ components: [vouchContainer], flags: MessageFlags.IsComponentsV2 });

    await interaction.reply({ content: `✅ Trade abgeschlossen — bitte bewertet euch gegenseitig!`, flags: MessageFlags.Ephemeral });

    // === 5 MINUTEN TIMEOUT (mit client fetch) ===
    const channelId = interaction.channelId;
    const guildId = interaction.guild.id;
    const timeout = setTimeout(async () => {
        console.log(`⏰ Vouch-Timeout für Channel ${channelId}`);
        
        try {
            // Channel neu fetchen (die originale interaction ist weg!)
            const guild = await client.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId);
            
            if (!channel) {
                console.log(`Channel ${channelId} nicht gefunden oder gelöscht`);
                return;
            }

            const currentTrade = findTrade(channelId);
            if (!currentTrade || !currentTrade.awaitingVouch) return;

            await channel.send({ content: `⏰ **5 Minuten vorbei!** Das Ticket wird mit den bisherigen Bewertungen geschlossen.` });
            
            // forceCloseVouch mit neuem channel statt interaction
            await forceCloseVouchWithChannel(channel, currentTrade, guildId);
        } catch (err) {
            console.error('Fehler im Vouch-Timeout:', err.message);
        }
    }, 5 * 60 * 1000);

    vouchTimeouts.set(channelId, timeout);
    return;
}

// === NEUE HILFSFUNKTION: ForceClose mit Channel statt Interaction ===
async function forceCloseVouchWithChannel(channel, trade, guildId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        
        // Whatever vouches exist → ins Vouch-Channel posten
        if (trade.vouchEntries && trade.vouchEntries.length > 0) {
            const vouchChannel = guild.channels.cache.get(constants.VOUCH_CHANNEL_ID);
            if (vouchChannel) {
                let content = `## ${trade.emoji} • Handel #${trade.handNummer}\n\n`;
                content += `**${trade.emoji} Aktion:** ${trade.action}\n`;
                content += `**${trade.spawnerEmoji} Spawner:** ${trade.spawnerType}\n`;
                content += `**📦 Menge:** ${trade.amount}\n`;
                content += `**💰 Gesamtpreis:** ${trade.totalPrice.toFixed(1)}M\n\n`;
                content += `**👤 Kunde:** <@${trade.kundeId}>\n`;
                content += `**🤝 Trader:** <@${trade.claimedBy}>\n\n`;

                for (const vouch of trade.vouchEntries) {
                    const role = vouch.reviewerId === trade.kundeId ? 'Kunde' : 'Trader';
                    const stars = '⭐'.repeat(vouch.rating);
                    content += `### 📝 Bewertung von ${role}\n${stars} (${vouch.rating}/5)\n> ${vouch.text}\n\n`;
                }

                const vouchContainer = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

                await vouchChannel.send({ components: [vouchContainer], flags: MessageFlags.IsComponentsV2 });
            }
        }

        // Stats updaten
        if (trade.claimedBy && store.traderStats) {
            if (!store.traderStats[trade.claimedBy]) {
                store.traderStats[trade.claimedBy] = {
                    completedTrades: 0, totalVolume: 0, totalEarned: 0, totalSpent: 0, totalStars: 0, starCount: 0
                };
            }
            const stats = store.traderStats[trade.claimedBy];
            stats.completedTrades += 1;
            stats.totalVolume += trade.totalPrice;
            if (trade.action === 'Ankauf') stats.totalEarned += trade.totalPrice;
            else stats.totalSpent += trade.totalPrice;

            const customerVouch = trade.vouchEntries?.find(v => v.reviewerId === trade.kundeId);
            if (customerVouch) {
                stats.totalStars += customerVouch.rating;
                stats.starCount += 1;
            }
            store.save();
        }

        // Loggen
        const logChannel = guild.channels.cache.get(constants.LOG_CHANNEL_ID);
        if (logChannel) {
            const vouchCount = (trade.vouches || []).length;
            const logContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${trade.emoji} • Handel #${trade.handNummer}\n\n` +
                        `**Status:** ✅ ABGESCHLOSSEN (${vouchCount}/2 Bewertungen)\n` +
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
            await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
        }

        // Countdown + Löschen
        await channel.send({ content: `⏳ Dieses Ticket wird in **5 Sekunden** gelöscht...` });

        setTimeout(async () => {
            try {
                await channel.delete();
                delete store.trades[channel.id];
                store.save();
            } catch (err) {
                console.log('Fehler beim Löschen:', err.message);
            }
        }, 5000);

    } catch (err) {
        console.error('Error in forceCloseVouchWithChannel:', err.message);
    }
}

    // === SPAWNER ANKAUF BUTTON ===
    if (interaction.customId === 'spawner_ankaufen') {
        const ankaufOptions = Object.entries(constants.prices).map(([name, prices]) => {
            const isStopped = prices.ankauf === 'Stop' || prices.ankauf === undefined;
            return {
                label: `${constants.spawnerEmojis[name] || '📦'} ${name} Spawner`,
                description: isStopped ? '⚠️ Ankauf derzeit GESPERRT' : `Preis: ${prices.ankauf.toFixed(1)}M`,
                value: name, emoji: constants.spawnerEmojis[name] || '📦'
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

        await interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        return;
    }

    // === SPAWNER VERKAUF BUTTON ===
    if (interaction.customId === 'spawner_verkaufen') {
        const verkaufOptions = Object.entries(constants.prices).map(([name, prices]) => {
            const isStopped = prices.verkauf === 'Stop' || prices.verkauf === undefined;
            return {
                label: `${constants.spawnerEmojis[name] || '📦'} ${name} Spawner`,
                description: isStopped ? '⚠️ Verkauf derzeit GESPERRT' : `Du bekommst: ${prices.verkauf.toFixed(1)}M`,
                value: name, emoji: constants.spawnerEmojis[name] || '📦'
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

        await interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        return;
    }
};

// Export für vouchHandler
module.exports.forceCloseVouch = forceCloseVouch;
module.exports.vouchTimeouts = vouchTimeouts;