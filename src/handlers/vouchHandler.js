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

// ==========================================
// TEIL 2: Modal Submit → Vouch speichern
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

         // Trade abschließen
        trade.awaitingVouch = false;
        trade.closed = true;
        store.save();

        // Original-Nachricht aktualisieren
        try {
            const container = buildTradeContainer(trade);
            const msg = await interaction.channel.messages.fetch(trade.messageId);
            await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
            // Ignorieren
        }

        // 5 Sek Countdown
        await interaction.channel.send({ content: `⏳ Dieses Ticket wird in **5 Sekunden** gelöscht...` });

        await interaction.reply({ content: `✅ Beide haben bewertet! Trade abgeschlossen und im Vouch-Channel gepostet.`, flags: MessageFlags.Ephemeral });

        // === AFTER 5 SECONDS: DELETE + LOG ===
        setTimeout(async () => {
            try {
                // Erst loggen
                await logTrade(interaction, trade, '✅ ABGESCHLOSSEN');
                
                // Thread löschen
                await interaction.channel.delete();
                
                // Aus Speicher
                delete store.trades[interaction.channelId];
                store.save();
            } catch (err) {
                console.log('Fehler beim Löschen/Loggen:', err.message);
            }
        }, 5000);

        delete store.trades[interaction.channelId];
        store.save();
}};
module.exports = { handleVouchSelect, handleVouchModal };