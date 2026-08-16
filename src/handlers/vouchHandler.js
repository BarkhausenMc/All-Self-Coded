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

// ==========================================
// TEIL 1: Stern-Auswahl → Modal öffnen
// ==========================================
async function handleVouchSelect(interaction) {
    if (interaction.customId !== 'vouch_stars') return;

    const trade = store.trades[interaction.channelId];

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

    if (trade.vouches && trade.vouches.some(v => v.reviewerId === interaction.user.id)) {
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

// ==========================================
// TEIL 2: Modal Submit → Vouch speichern & posten
// ==========================================
async function handleVouchModal(interaction) {
    if (!interaction.customId.startsWith('vouch_modal:')) return;

    const stars = parseInt(interaction.customId.split(':')[1]);
    const text = interaction.fields.getTextInputValue('vouch_text') || '*Kein Text*';
    const trade = store.trades[interaction.channelId];

    if (!trade || !trade.awaitingVouch) {
        await interaction.reply({
            content: '❌ Dieser Trade ist nicht mehr in der Bewertungsphase.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (trade.vouches && trade.vouches.some(v => v.reviewerId === interaction.user.id)) {
        await interaction.reply({
            content: '✅ Du hat bereits bewertet!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const reviewerId = interaction.user.id;
    const reviewedId = (reviewerId === trade.kundeId) ? trade.claimedBy : trade.kundeId;

    // Vouch-Daten zum Trade hinzufügen
    const vouchEntry = {
        reviewerId,
        reviewedId,
        rating: stars,
        text,
        timestamp: new Date().toISOString()
    };

    if (!trade.vouchEntries) trade.vouchEntries = [];
    trade.vouchEntries.push(vouchEntry);

    // User als bewertet markieren
    if (!trade.vouches) trade.vouches = [];
    trade.vouches.push(reviewerId);
    store.save();

    // Prüfen: Haben beide bewertet?
    if (trade.vouches.length >= 2) {
        // === EINE gemeinsame Vouch-Nachricht bauen ===

                // === EINE gemeinsame Vouch-Nachricht bauen ===

        const vouch1 = trade.vouchEntries[0];
        const vouch2 = trade.vouchEntries[1];

        // Wer hat wen bewertet? Kunde und Trader richtig zuordnen
        const customerVouch = vouch1.reviewerId === trade.kundeId ? vouch1 : vouch2;
        const traderVouch = vouch1.reviewerId === trade.claimedBy ? vouch1 : vouch2;

        // Sterne EXAKT für den jeweiligen Vouch generieren
        const customerStars = '⭐'.repeat(customerVouch.rating);
        const traderStars = '⭐'.repeat(traderVouch.rating);

        const vouchContainer = new ContainerBuilder()
            // --- Header: Trade-Infos ---
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${trade.emoji} • Handel #${trade.handNummer}\n\n` +
                    `**${trade.emoji} Aktion:** ${trade.action}\n` +
                    `**${trade.spawnerEmoji} Spawner:** ${trade.spawnerType}\n` +
                    `**📦 Menge:** ${trade.amount}\n` +
                    `**💰 Gesamtpreis:** ${trade.totalPrice.toFixed(1)}M\n\n` +
                    `**👤 Kunde:** <@${trade.kundeId}>\n` +
                    `**🤝 Trader:** <@${trade.claimedBy}>`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            // --- Bewertung Kunde → Trader ---
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 📝 Bewertung von Kunde → Trader\n` +
                    `${customerStars} (${customerVouch.rating}/5)\n` +
                    `> ${customerVouch.text}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            // --- Bewertung Trader → Kunde ---
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 📝 Bewertung von Trader → Kunde\n` +
                    `${traderStars} (${traderVouch.rating}/5)\n` +
                    `> ${traderVouch.text}`
                )
            );

        // Vouch im Vouch-Channel posten
        const vouchChannel = interaction.guild.channels.cache.get(constants.VOUCH_CHANNEL_ID);

        if (vouchChannel) {
            await vouchChannel.send({
                components: [vouchContainer],
                flags: MessageFlags.IsComponentsV2
            });
        } else {
            console.log('Vouch-Channel nicht gefunden!');
        }

        // Trade abschließen
        trade.awaitingVouch = false;
        trade.closed = true;
        store.save();

        // Original-Nachricht im Thread aktualisieren
        await updateTradeMessage(interaction.channel, trade);

        // Thread archivieren
        await interaction.channel.setArchived(true);

        // Aus Speicher entfernen
        delete store.trades[interaction.channelId];
        store.save();

        await interaction.reply({
            content: `✅ Beide haben bewertet! Trade abgeschlossen und im Vouch-Channel gepostet.`,
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