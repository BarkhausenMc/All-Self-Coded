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
const buildTradeContainer = require('../utils/buildTradeContainer');

// === HELPER: Trade finden mit mehreren IDs ===
function findTrade(channelId) {
    const variants = [
        channelId,
        String(channelId),
        String(parseInt(channelId)),
        parseInt(channelId),
        channelId.toString()
    ];
    
    const uniqueVariants = [...new Set(variants)];
    
    for (const variant of uniqueVariants) {
        if (store.trades[variant]) {
            console.log(`[VAUCH] Trade gefunden unter Key: "${variant}"`);
            return store.trades[variant];
        }
    }
    
    console.warn(`[VAUCH] Trade NICHT gefunden für Kanal-ID: "${channelId}"`);
    console.warn(`Versuchte Keys:`, uniqueVariants);
    console.warn(`Verfügbare Trade-Keys im Store:`, Object.keys(store.trades));
    
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

// === TEIL 1: STERN-AUSWAHL → MODAL ===
async function handleVouchSelect(interaction) {
    if (interaction.customId !== 'vouch_stars') return;

    const trade = findTrade(interaction.channelId);

    if (!trade || !trade.awaitingVouch) {
        await interaction.reply({
            content: '❌ Dieser Trade ist nicht in der Bewertungsphase.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const isCustomer = interaction.user.id === trade.kundeId;
    const isTrader = interaction.user.id === trade.claimedBy;

    if (!isCustomer && !isTrader) {
        await interaction.reply({
            content: '❌ Du bist nicht Teil dieses Trades.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (trade.vouches && trade.vouches.includes(interaction.user.id)) {
        await interaction.reply({
            content: '✅ Du hast bereits bewertet!',
            flags: MessageFlags.Ephemeral
        });
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
        await interaction.reply({
            content: '❌ Dieser Trade ist nicht mehr in der Bewertungsphase.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (trade.vouches && trade.vouches.includes(interaction.user.id)) {
        await interaction.reply({
            content: '✅ Du hast bereits bewertet!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const reviewerId = interaction.user.id;
    const reviewedId = (reviewerId === trade.kundeId) ? trade.claimedBy : trade.kundeId;

    const vouchEntry = {
        reviewerId,
        reviewedId,
        rating: stars,
        text,
        timestamp: new Date().toISOString()
    };

    if (!trade.vouchEntries) trade.vouchEntries = [];
    trade.vouchEntries.push(vouchEntry);

    if (!trade.vouches) trade.vouches = [];
    trade.vouches.push(reviewerId);
    store.save();

    if (trade.vouches.length >= 2) {
        const vouch1 = trade.vouchEntries[0];
        const vouch2 = trade.vouchEntries[1];

        const customerVouch = vouch1.reviewerId === trade.kundeId ? vouch1 : vouch2;
        const traderVouch = vouch1.reviewerId === trade.claimedBy ? vouch1 : vouch2;

        const customerStars = '⭐'.repeat(customerVouch.rating);
        const traderStars = '⭐'.repeat(traderVouch.rating);

        const vouchContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ✅ Handel abgeschlossen • #${trade.handNummer}\n\n` 
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**👤 Kunde:** <@${trade.kundeId}>\n` +
                    `**🤝 Trader:** <@${trade.claimedBy}>`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**${trade.emoji} Geschäft:** ${trade.action} ||(aus sicht des Kunden)||\n` +
                    `**${trade.spawnerEmoji} Spawner:** ${trade.spawnerType} x ${trade.amount}\n` +
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

        const vouchChannel = interaction.guild.channels.cache.get(constants.VOUCH_CHANNEL_ID);
        if (vouchChannel) {
            await vouchChannel.send({
                components: [vouchContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        trade.awaitingVouch = false;
        trade.closed = true;
        // === TRADER STATS HOCHZÄHLEN ===
if (trade.claimedBy) {
    if (!store.traderStats[trade.claimedBy]) {
        store.traderStats[trade.claimedBy] = {
            completedTrades: 0,
            totalVolume: 0,      // Gesamtvolumen aller Trades
            totalEarned: 0,      // Verdient (durch Ankauf = Kunde kauft)
            totalSpent: 0,       // Ausgegeben (durch Verkauf = Kunde verkauft)
            totalStars: 0,       // Sterne vom Kunden erhalten
            starCount: 0         // Anzahl der Sterne-Bewertungen
        };
    }
    
    const stats = store.traderStats[trade.claimedBy];
    stats.completedTrades += 1;
    stats.totalVolume += trade.totalPrice;
    
    if (trade.action === 'Ankauf') {
        // Kunde kauft → Trader/Plattform verdient das Geld
        stats.totalEarned += trade.totalPrice;
    } else {
        // Kunde verkauft → Trader/Plattform zahlt Geld raus
        stats.totalSpent += trade.totalPrice;
    }
    
    // Sterne vom Kunden für den Tracker speichern
    const customerVouch2 = trade.vouchEntries.find(v => v.reviewerId === trade.kundeId);
    if (customerVouch2) {
        stats.totalStars += customerVouch2.rating;
        stats.starCount += 1;
    }
}
        store.save();

        try {
            const container = buildTradeContainer(trade);
            const msg = await interaction.channel.messages.fetch(trade.messageId);
            await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
            // Ignore
        }

        await interaction.channel.send({
            content: `⏳ Dieses Ticket wird in **5 Sekunden** gelöscht...`
        });

        await interaction.reply({
            content: `✅ Beide haben bewertet! Trade abgeschlossen und im Vouch-Channel gepostet.`,
            flags: MessageFlags.Ephemeral
        });

        setTimeout(async () => {
            try {
                await logTrade(interaction, trade, '✅ ABGESCHLOSSEN');
                await interaction.channel.delete();
                delete store.trades[interaction.channelId];
                delete store.trades[String(interaction.channelId)];
                delete store.trades[String(parseInt(interaction.channelId))];
                store.save();
            } catch (err) {
                console.log('Fehler beim Löschen/Loggen:', err.message);
            }
        }, 5000);

        delete store.trades[interaction.channelId];
        delete store.trades[String(interaction.channelId)];
        delete store.trades[String(parseInt(interaction.channelId))];
        store.save();
    } else {
        await interaction.reply({
            content: `✅ Danke für deine Bewertung! (${trade.vouches.length}/2)\nWarte noch auf den anderen Trade-Partner.`,
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = { handleVouchSelect, handleVouchModal };