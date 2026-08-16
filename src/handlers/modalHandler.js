const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ChannelType
} = require('discord.js');

const constants = require('../config/constants');
const { tradeCounters, trades } = require('../data/store');
const buildTradeContainer = require('../utils/buildTradeContainer');
const buildActionButtonRow = require('../utils/buildActionButtonRow');

module.exports = async function handleModal(interaction) {
    if (interaction.customId.startsWith('trade_modal:')) {
        // customId Format: 'trade_modal:ankauf:Skeleton'
        const parts = interaction.customId.split(':');
        const tradeType = parts[1];    // 'ankauf' oder 'verkauf'
        const spawnerType = parts[2];   // 'Skeleton' oder 'Creeper'

        // Werte aus dem Modal auslesen
        const ingameName = interaction.fields.getTextInputValue('ingame_name');
        const amount = interaction.fields.getTextInputValue('amount');

        // Antworte Discord mit "loading" (ephemeral)
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Trade-Counter hochzählen
        tradeCounters[interaction.user.id] = (tradeCounters[interaction.user.id] || 0) + 1;
        const handNummer = tradeCounters[interaction.user.id];

        // Dynamische Werte setzen
        const emoji = tradeType === 'ankauf' ? '🛒' : '💰';
        const action = tradeType === 'ankauf' ? 'Ankauf' : 'Verkauf';
        const spawnerEmoji = constants.spawnerEmojis[spawnerType] || '❌';
        const pricePerUnit = constants.prices[spawnerType][tradeType];
        const totalPrice = pricePerUnit * parseInt(amount);

        // Privaten Thread erstellen
        const thread = await interaction.channel.threads.create({
            name: `${emoji} ${action} - ${interaction.user.username}`,
            type: ChannelType.PrivateThread,
            invitable: false
        });

        // Kunden (User der geklickt hat) zum Thread hinzufügen
        await thread.members.add(interaction.user.id);

        // Trader-Rolle zum Thread hinzufügen
        if (constants.TRADER_ROLE_ID) {
            try {
                const allMembers = await interaction.guild.members.fetch();
                const traders = allMembers.filter(m => m.roles.cache.has(constants.TRADER_ROLE_ID));
                for (const [, trader] of traders) {
                    await thread.members.add(trader.id).catch(() => {});
                }
            } catch (err) {
                console.log('Konnte Trader nicht hinzufügen:', err.message);
            }
        }

        // Trade-Daten Object bauen
        const tradeData = {
            messageId: null,          // wird nach thread.send gesetzt
            claimedBy: null,          // noch niemand hat geclaimt
            closed: false,            // nicht geschlossen
            cancelled: false,         // nicht abgebrochen
            kundeId: interaction.user.id,
            ingameName,
            spawnerType,
            spawnerEmoji,
            amount,
            pricePerUnit,
            totalPrice,
            handNummer,
            emoji,
            action
        };

        // Container (Text) und Buttons bauen
        const container = buildTradeContainer(tradeData);
        const actionRow = buildActionButtonRow(tradeData);

        // Nachricht in den Thread senden (Container + Buttons separat)
        const tradeMsg = await thread.send({
            components: [container, actionRow],
            flags: MessageFlags.IsComponentsV2
        });

        // messageId speichern (wird für Updates gebraucht)
        tradeData.messageId = tradeMsg.id;
        trades[thread.id] = tradeData;

        // User bestätigen, dass der Thread erstellt wurde
        await interaction.editReply({
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`✅ Dein Trade-Thread wurde erstellt: <#${thread.id}>`)
                    )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};