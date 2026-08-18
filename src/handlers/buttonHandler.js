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

const vouchTimeouts = new Map();

function findTrade(channelId) {
    const id = String(channelId);
    if (store.trades[id]) return store.trades[id];
    console.warn(`⚠️ Trade NICHT gefunden für Channel: "${id}"`);
    console.warn(`Verfügbare Keys:`, Object.keys(store.trades));
    return null;
}

async function logTrade(guild, trade, status) {
    const logChannel = guild.channels.cache.get(constants.LOG_CHANNEL_ID);
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

    await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
}

async function forceCloseVouchWithChannel(channel, trade, guild) {
    try {
        if (trade.vouchEntries && trade.vouchEntries.length > 0) {
            const vouchChannel = guild.channels.cache.get(constants.VOUCH_CHANNEL_ID);
            if (vouchChannel) {
                const customerVouch = trade.vouchEntries.find(v => v.reviewerId === trade.kundeId);
                const traderVouch = trade.vouchEntries.find(v => v.reviewerId === trade.claimedBy);

                const customerStars = customerVouch ? '⭐'.repeat(customerVouch.rating) : '— Keine Bewertung';
                const traderStars = traderVouch ? '⭐'.repeat(traderVouch.rating) : '— Keine Bewertung';

                const vouchContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ✅ Handel abgeschlossen • #${trade.handNummer}\n\n` +
                            `**👤 Kunde:** <@${trade.kundeId}>\n` +
                            `**🤝 Trader:** <@${trade.claimedBy || '-'}>`
                        )
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**${trade.emoji} Geschäft:** ${trade.action} ||(aus Sicht des Kunden)||\n` +
                            `**${trade.spawnerEmoji} Spawner:** ${trade.spawnerType}\n` +
                            `**📦 Menge:** ${trade.amount}\n` +
                            `**💰 Gesamtpreis:** ${trade.totalPrice.toFixed(1)}M\n`
                        )
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### 📝 Bewertung von Kunde → Trader\n` +
                            (customerVouch
                                ? `${customerStars} (${customerVouch.rating}/5)\n> ${customerVouch.text}`
                                : `— Keine Bewertung abgegeben`)
                        )
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### 📝 Bewertung von Trader → Kunde\n` +
                            (traderVouch
                                ? `${traderStars} (${traderVouch.rating}/5)\n> ${traderVouch.text}`
                                : `— Keine Bewertung abgegeben`)
                        )
                    );

                await vouchChannel.send({ components: [vouchContainer], flags: MessageFlags.IsComponentsV2 });
            }
        }

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

        await logTrade(guild, trade, `✅ ABGESCHLOSSEN (${(trade.vouches || []).length}/2 Bewertungen)`);

        await channel.send({ content: `⏳ Dieses Ticket wird in **5 Sekunden** gelöscht...` });

        setTimeout(async () => {
            try {
                await channel.delete();
                delete store.trades[String(channel.id)];
                store.save();
            } catch (err) {
                console.log('Fehler beim Löschen:', err.message);
            }
        }, 5000);

    } catch (err) {
        console.error('Error in forceCloseVouchWithChannel:', err.message);
    }
}

module.exports = async function handleButton(interaction) {
    // ⚠️ IMMERSOFORT DEFERNACH DEM BUTTON-KLICK
    await interaction.deferUpdate();

    // === CLAIM ===
    if (interaction.customId === 'claim') {
        const trade = findTrade(interaction.channelId);

        if (!trade) {
            await interaction.editReply({ content: '❌ Trade nicht gefunden.' });
            return;
        }

        if (trade.claimedBy) {
            await interaction.editReply({ content: `❌ Bereits von <@${trade.claimedBy}> geclaimt.` });
            return;
        }

        if (!interaction.member.roles.cache.has(constants.TRADER_ROLE_ID)) {
            await interaction.editReply({ content: '❌ Nur Trader dürfen Trades claimen.' });
            return;
        }

        trade.claimedBy = interaction.user.id;
        store.save();

        try {
            await updateTradeMessage(interaction.channel, trade);
            await interaction.editReply({ content: `✅ Du hast den Trade geclaimt!` });
        } catch (err) {
            console.error('updateTradeMessage error (claim):', err.message);
            await interaction.editReply({ content: '✅ Trade geclaimt (mit Fehler beim Update).' });
        }
        return;
    }

    // === FREIGEBEN ===
    if (interaction.customId === 'freigeben') {
        const trade = findTrade(interaction.channelId);

        if (!trade || !trade.claimedBy) {
            await interaction.editReply({ content: '❌ Trade ist nicht geclaimt.' });
            return;
        }

        if (interaction.user.id !== trade.claimedBy) {
            await interaction.editReply({ content: `❌ Nur <@${trade.claimedBy}> kann den Trade freigeben.` });
            return;
        }

        trade.claimedBy = null;
        store.save();

        try {
            await updateTradeMessage(interaction.channel, trade);
            await interaction.editReply({ content: `✅ Trade freigegeben!` });
        } catch (err) {
            console.error('updateTradeMessage error (freigeben):', err.message);
            await interaction.editReply({ content: '✅ Trade freigegeben (mit Fehler beim Update).' });
        }
        return;
    }

    // === COMPLETE (Vouch-Phase) ===
    if (interaction.customId === 'complete') {
        const trade = findTrade(interaction.channelId);

        if (!trade || !trade.claimedBy) {
            await interaction.editReply({ content: '❌ Der Trade muss erst geclaimt werden.' });
            return;
        }

        if (interaction.user.id !== trade.claimedBy) {
            await interaction.editReply({ content: `❌ Nur <@${trade.claimedBy}> darf den Trade abschließen.` });
            return;
        }

        trade.awaitingVouch = true;
        trade.vouches = [];
        trade.vouchEntries = [];
        store.save();

        try {
            await updateTradeMessage(interaction.channel, trade);
            await interaction.editReply({ content: `✅ Trade abgeschlossen — bitte bewertet euch gegenseitig!` });
        } catch (err) {
            console.error('updateTradeMessage error (complete):', err.message);
            await interaction.editReply({ content: '✅ Trade abgeschlossen (mit Fehler beim Update).' });
        }

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

        const channelId = String(interaction.channelId);
        const guildId = interaction.guild.id;

        const timeout = setTimeout(async () => {
            try {
                const guild = await interaction.client.guilds.fetch(guildId);
                const channel = await guild.channels.fetch(channelId);
                if (!channel) return;

                const currentTrade = findTrade(channelId);
                if (!currentTrade || !currentTrade.awaitingVouch) return;

                await channel.send({ content: `⏰ **5 Minuten vorbei!** Das Ticket wird mit den bisherigen Bewertungen geschlossen.` });
                await forceCloseVouchWithChannel(channel, currentTrade, guild);
            } catch (err) {
                console.error('Vouch-Timeout error:', err.message);
            }
        }, 5 * 60 * 1000);

        vouchTimeouts.set(channelId, timeout);
        return;
    }

    // === ABBRUCH ===
    if (interaction.customId === 'abbruch') {
        const channelIdStr = String(interaction.channelId);
        const trade = findTrade(channelIdStr);

        if (!trade) {
            await interaction.editReply({ content: '❌ Trade nicht gefunden oder bereits geschlossen.' });
            return;
        }

        const timeout = vouchTimeouts.get(channelIdStr);
        if (timeout) { clearTimeout(timeout); vouchTimeouts.delete(channelIdStr); }

        trade.cancelled = true;
        store.save();

        try {
            await updateTradeMessage(interaction.channel, trade);
        } catch (err) {
            console.error('updateTradeMessage error (abbruch):', err.message);
        }

        try {
            const abbruchContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ❌ Trade abgebrochen\n\n` +
                        `Der Handel #${trade.handNummer} wurde von <@${interaction.user.id}> abgebrochen.\n` +
                        `Das Ticket wird gelöscht.`
                    )
                );

            await interaction.channel.send({ components: [abbruchContainer], flags: MessageFlags.IsComponentsV2 });

            const countdownContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ⏳ Ticket wird gelöscht\n\n` +
                        `Dieses Ticket wird in **5 Sekunden** gelöscht...`
                    )
                );

            await interaction.channel.send({ components: [countdownContainer], flags: MessageFlags.IsComponentsV2 });

            const confirmationContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `✅ Deine Anfrage wurde verarbeitet. Das Ticket wird jetzt geschlossen.`
                    )
                );

            await interaction.editReply({ components: [confirmationContainer], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
            console.error('Send error (abbruch):', err.message);
            await interaction.editReply({ content: '✅ Abbruch-Request erhalten (Fehler beim Senden).' });
        }

        const guild = interaction.guild;

        setTimeout(async () => {
            try {
                await logTrade(guild, trade, '❌ ABGEBROCHEN');
                await interaction.channel.delete();
                delete store.trades[channelIdStr];
                store.save();
                console.log(`✅ Ticket ${channelIdStr} gelöscht.`);
            } catch (err) {
                console.error('Delete error:', err.message);
            }
        }, 5000);

        return;
    }

    // === SPAWNER ANKAUF ===
    if (interaction.customId === 'spawner_ankaufen') {
        const ankaufOptions = Object.entries(constants.prices).map(([name, prices]) => {
            const isStopped = prices.ankauf === 'Stop' || prices.ankauf === undefined;
            return {
                label: `${name} Spawner`,
                description: isStopped ? '⚠️ Ankauf derzeit GESTOPT' : `Preis: ${prices.ankauf.toFixed(1)}M`,
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

        await interaction.editReply({ components: [container] });
        return;
    }

    // === SPAWNER VERKAUF ===
    if (interaction.customId === 'spawner_verkaufen') {
        const verkaufOptions = Object.entries(constants.prices).map(([name, prices]) => {
            const isStopped = prices.verkauf === 'Stop' || prices.verkauf === undefined;
            return {
                label: `${name} Spawner`,
                description: isStopped ? '⚠️ Verkauf derzeit GESTOPT' : `Du bekommst: ${prices.verkauf.toFixed(1)}M`,
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

        await interaction.editReply({ components: [container] });
        return;
    }
};

module.exports.vouchTimeouts = vouchTimeouts;
module.exports.findTrade = findTrade;
module.exports.forceCloseVouchWithChannel = forceCloseVouchWithChannel;
module.exports.logTrade = logTrade;