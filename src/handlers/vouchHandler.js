const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

const store = require('../data/store');
const constants = require('../config/constants');
const updateTradeMessage = require('../utils/updateTradeMessage');
const buttonHandler = require('./buttonHandler');

// === HELPER: Trade finden (NUR Strings!) ===
function findTrade(channelId) {
    const id = String(channelId);
    if (store.trades[id]) return store.trades[id];
    console.warn(`[VAUCH] Trade NICHT gefunden für Channel: "${id}"`);
    return null;
}

// === TEIL 1: STERN-AUSWAHL → MODAL ===
async function handleVouchSelect(interaction) {
    if (interaction.customId !== 'vouch_stars') return;

    const trade = findTrade(interaction.channelId);

    if (!trade || !trade.awaitingVouch) {
        await interaction.reply({ content: '❌ Dieser Trade ist nicht in der Bewertungsphase.', flags: MessageFlags.Ephemeral });
        return;
    }

    const isCustomer = interaction.user.id === trade.kundeId;
    const isTrader = interaction.user.id === trade.claimedBy;

    if (!isCustomer && !isTrader) {
        await interaction.reply({ content: '❌ Du bist nicht Teil dieses Trades.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (trade.vouches && trade.vouches.includes(interaction.user.id)) {
        await interaction.reply({ content: '✅ Du hast bereits bewertet!', flags: MessageFlags.Ephemeral });
        return;
    }

    const stars = interaction.values[0];

    const modal = new ModalBuilder()
        .setCustomId(`vouch_modal:${stars}`)
        .setTitle(`📝 Bewertung — ${stars} Sterne`);

    const textInput = new TextInputBuilder()
        .setCustomId('vouch_text')
        .setLabel('Schreibe deine Bewertung (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('z.B. Sehr schneller und fairer Trade!')
        .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
    await interaction.showModal(modal);
}

// === TEIL 2: MODAL SUBMIT → VOUCH SPEICHERN ===
async function handleVouchModal(interaction) {
    if (!interaction.customId.startsWith('vouch_modal:')) return;

    const stars = parseInt(interaction.customId.split(':')[1]);
    const text = interaction.fields.getTextInputValue('vouch_text') || '*Kein Text*';
    const trade = findTrade(interaction.channelId);

    if (!trade || !trade.awaitingVouch) {
        await interaction.reply({ content: '❌ Dieser Trade ist nicht mehr in der Bewertungsphase.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (trade.vouches && trade.vouches.includes(interaction.user.id)) {
        await interaction.reply({ content: '✅ Du hast bereits bewertet!', flags: MessageFlags.Ephemeral });
        return;
    }

    const reviewerId = interaction.user.id;
    const reviewedId = (reviewerId === trade.kundeId) ? trade.claimedBy : trade.kundeId;

    const vouchEntry = { reviewerId, reviewedId, rating: stars, text, timestamp: new Date().toISOString() };

    if (!trade.vouchEntries) trade.vouchEntries = [];
    trade.vouchEntries.push(vouchEntry);

    if (!trade.vouches) trade.vouches = [];
    trade.vouches.push(reviewerId);
    store.save();

    // === LIVE-UPDATE ===
    try {
        await updateTradeMessage(interaction.channel, trade);
    } catch (err) {}

    if (trade.vouches.length >= 2) {
        // === BEIDE HABEN BEWERTET ===

        // Timeout löschen!
        const timeout = buttonHandler.vouchTimeouts.get(String(interaction.channelId));
        if (timeout) { clearTimeout(timeout); buttonHandler.vouchTimeouts.delete(String(interaction.channelId)); }

        const vouch1 = trade.vouchEntries[0];
        const vouch2 = trade.vouchEntries[1];

        const customerVouch = vouch1.reviewerId === trade.kundeId ? vouch1 : vouch2;
        const traderVouch = vouch1.reviewerId === trade.claimedBy ? vouch1 : vouch2;

        const customerStars = '⭐'.repeat(customerVouch.rating);
        const traderStars = '⭐'.repeat(traderVouch.rating);

        // Vouch-Channel Post
        const vouchChannel = interaction.guild.channels.cache.get(constants.VOUCH_CHANNEL_ID);
        if (vouchChannel) {
            const vouchContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ✅ Handel abgeschlossen • #${trade.handNummer}\n\n` +
                        `**👤 Kunde:** <@${trade.kundeId}>\n` +
                        `**🤝 Trader:** <@${trade.claimedBy}>`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**${trade.emoji} Geschäft:** ${trade.action} ||(aus sicht des Kunden)||\n` +
                        `**${trade.spawnerEmoji} Spawner:** ${trade.spawnerType}\n` +
                        `**📦 Menge:** ${trade.amount}\n` +
                        `**💰 Gesamtpreis:** ${trade.totalPrice.toFixed(1)}M\n\n`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### 📝 Bewertung von Kunde → Trader\n` +
                        `${customerStars} (${customerVouch.rating}/5)\n` +
                        `> ${customerVouch.text}`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### 📝 Bewertung von Trader → Kunde\n` +
                        `${traderStars} (${traderVouch.rating}/5)\n` +
                        `> ${traderVouch.text}`
                    )
                );

            await vouchChannel.send({ components: [vouchContainer], flags: MessageFlags.IsComponentsV2 });
        }

        // === TRADER STATS UPDATEN ===
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

            const customerVouchForStats = trade.vouchEntries.find(v => v.reviewerId === trade.kundeId);
            if (customerVouchForStats) {
                stats.totalStars += customerVouchForStats.rating;
                stats.starCount += 1;
            }
            store.save();
        }

        trade.awaitingVouch = false;
        trade.closed = true;
        store.save();

        try {
            await updateTradeMessage(interaction.channel, trade);
        } catch (err) {}

        // Loggen
        await buttonHandler.logTrade(interaction.guild, trade, '✅ ABGESCHLOSSEN (2/2 Bewertungen)');

        await interaction.channel.send({ content: `⏳ Dieses Ticket wird in **5 Sekunden** gelöscht...` });

        await interaction.reply({ content: `✅ Beide haben bewertet! Trade abgeschlossen und im Vouch-Channel gepostet.`, flags: MessageFlags.Ephemeral });

        const channelId = String(interaction.channelId);
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
                delete store.trades[channelId];
                store.save();
            } catch (err) {
                console.log('Fehler beim Löschen:', err.message);
            }
        }, 5000);

    } else {
        await interaction.reply({ content: `✅ Danke für deine Bewertung! (1/2)\nWarte noch auf den anderen Trade-Partner.\n\n⏱️ Das Ticket schließt automatisch in 5 Minuten.`, flags: MessageFlags.Ephemeral });
    }
}

module.exports = { handleVouchSelect, handleVouchModal };