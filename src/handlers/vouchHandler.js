const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ChannelType
} = require('discord.js');

const { trades, vouches } = require('../data/store');
const store = require('../data/store');
const constants = require('../config/constants');
const buildTradeContainer = require('../utils/buildTradeContainer');
const updateTradeMessage = require('../utils/updateTradeMessage');

// Hilfsfunktion: Sterne als Unicode darstellen
function starsToString(rating) {
    return '⭐'.repeat(parseInt(rating));
}

// ==========================================
// TEIL 1: Stern-Auswahl → Modal öffnen
// ==========================================
async function handleVouchSelect(interaction) {
    if (interaction.customId !== 'vouch_stars') return;

    const trade = trades[interaction.channelId];

    if (!trade || !trade.awaitingVouch) {
        await interaction.reply({
            content: '❌ Dieser Trade ist nicht in der Bewertungsphase.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // Prüfen: Nur Kunde und Trader dürfen bewerten
    const isCustomer = interaction.user.id === trade.kundeId;
    const isTrader = interaction.user.id === trade.claimedBy;

    if (!isCustomer && !isTrader) {
        await interaction.reply({
            content: '❌ Du bist nicht Teil dieses Trades.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // Prüfen: Schon bewertet?
    if (trade.vouches && trade.vouches.includes(interaction.user.id)) {
        await interaction.reply({
            content: '✅ Du hast bereits bewertet!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const stars = interaction.values[0]; // '1' bis '5'

    // Modal für Bewertungstext öffnen
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

// ==========================================
// TEIL 2: Modal Submit → Vouch speichern
// ==========================================
async function handleVouchModal(interaction) {
    if (!interaction.customId.startsWith('vouch_modal:')) return;

    const stars = parseInt(interaction.customId.split(':')[1]); // z.B. 5
    const text = interaction.fields.getTextInputValue('vouch_text') || '*Kein Text*';
    const trade = trades[interaction.channelId];

    if (!trade || !trade.awaitingVouch) {
        await interaction.reply({
            content: '❌ Dieser Trade ist nicht mehr in der Bewertungsphase.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // Schon bewertet?
    if (trade.vouches && trade.vouches.includes(interaction.user.id)) {
        await interaction.reply({
            content: '✅ Du hast bereits bewertet!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // Wer bewertet wen?
    const reviewerId = interaction.user.id;
    const reviewedId = (reviewerId === trade.kundeId) ? trade.claimedBy : trade.kundeId;

    // Vouch-Daten speichern
    const vouchData = {
        reviewerId,
        reviewedId,
        rating: stars,
        text,
        tradeInfo: {
            emoji: trade.emoji,
            action: trade.action,
            spawnerType: trade.spawnerType,
            spawnerEmoji: trade.spawnerEmoji,
            amount: trade.amount,
            totalPrice: trade.totalPrice,
            handNummer: trade.handNummer
        },
        timestamp: new Date().toISOString()
    };

    vouches.push(vouchData);

    // User als bewertet markieren
    if (!trade.vouches) trade.vouches = [];
    trade.vouches.push(reviewerId);
    store.save();

    // Vouch im Vouch-Channel posten
    const vouchChannel = interaction.guild.channels.cache.get(constants.VOUCH_CHANNEL_ID);

    if (vouchChannel) {
        const vouchContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${starsToString(stars)} • ${stars}/5 Sterne\n\n` +
                    `> ${text}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**👤 Bewertet von:** <@${reviewerId}>\n` +
                    `**🎯 Bewertet:** <@${reviewedId}>\n` +
                    `**${trade.spawnerEmoji} Trade:** ${trade.emoji} ${trade.action} ${trade.spawnerType} (#${trade.handNummer}) • ${trade.amount}x • ${trade.totalPrice.toFixed(1)}M`
                )
            );

        await vouchChannel.send({
            components: [vouchContainer],
            flags: MessageFlags.IsComponentsV2
        });
    } else {
        console.log('Vouch-Channel nicht gefunden!');
    }

    // Prüfen: Haben beide bewertet?
    if (trade.vouches.length >= 2) {
        // Trade vollständig abschließen
        trade.awaitingVouch = false;
        trade.closed = true;
        store.save();

        // Original-Nachricht aktualisieren
        await updateTradeMessage(interaction.channel, trade);

        // Thread archivieren
        await interaction.channel.setArchived(true);

        // Aus Speicher entfernen
        delete trades[interaction.channelId];
        store.save();

        await interaction.reply({
            content: `✅ Danke für deine Bewertung! Beide haben bewertet — Trade abgeschlossen!`,
            flags: MessageFlags.Ephemeral
        });
    } else {
        // Erst eine Person hat bewertet
        await interaction.reply({
            content: `✅ Danke für deine Bewertung! (${trade.vouches.length}/2)\nWarte noch auf den anderen Trade-Partner.`,
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = { handleVouchSelect, handleVouchModal };