const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ChannelType
} = require('discord.js');

const constants = require('../config/constants');
const store = require('../data/store');
const { tradeCounters, trades } = store;
const buildTradeContainer = require('../utils/buildTradeContainer');
const buildActionButtonRow = require('../utils/buildActionButtonRow');

module.exports = async function handleModal(interaction) {
    if (interaction.customId.startsWith('trade_modal:')) {
        const parts = interaction.customId.split(':');
        const tradeType = parts[1];
        const spawnerType = parts[2];

        const ingameName = interaction.fields.getTextInputValue('ingame_name');
        const amount = interaction.fields.getTextInputValue('amount');

        // === MENGEN-VALIDIERUNG ===
        const parsedAmount = parseInt(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            await interaction.reply({
                content: '❌ Bitte gib eine gültige Anzahl ein (z.B. 3)!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        tradeCounters[interaction.user.id] = (tradeCounters[interaction.user.id] || 0) + 1;
        const handNummer = tradeCounters[interaction.user.id];
        store.save();

        const emoji = tradeType === 'ankauf' ? '🛒' : '💰';
        const action = tradeType === 'ankauf' ? 'Ankauf' : 'Verkauf';
        const spawnerEmoji = constants.spawnerEmojis[spawnerType] || '❌';
        const pricePerUnit = constants.prices[spawnerType][tradeType];
        const totalPrice = pricePerUnit * parsedAmount;

        // Thread erstellen
        const thread = await interaction.channel.threads.create({
            name: `${emoji} ${action} - ${interaction.user.username}`,
            type: ChannelType.PrivateThread,
            invitable: false
        });

        await thread.members.add(interaction.user.id);

        // Trader-Rolle einladen (ohne Console Spam)
        if (constants.TRADER_ROLE_ID) {
            try {
                const allMembers = await interaction.guild.members.fetch();
                const traders = allMembers.filter(m => m.roles.cache.has(constants.TRADER_ROLE_ID));
                for (const [, trader] of traders) {
                    await thread.members.add(trader.id).catch(() => {});
                }
            } catch (err) {
                // Silent fail — kein Console Log
            }
        }

        const tradeData = {
            messageId: null,
            claimedBy: null,
            closed: false,
            cancelled: false,
            awaitingVouch: false,
            vouches: [],
            vouchEntries: [],
            kundeId: interaction.user.id,
            ingameName,
            spawnerType,
            spawnerEmoji,
            amount: parsedAmount,
            pricePerUnit,
            totalPrice,
            handNummer,
            emoji,
            action
        };

        const container = buildTradeContainer(tradeData);
        const actionRow = buildActionButtonRow(tradeData);

        const tradeMsg = await thread.send({
            components: [container, actionRow],
            flags: MessageFlags.IsComponentsV2
        });

        // === TRADER ROLE PING ===
        if (constants.TRADER_ROLE_ID) {
            await thread.send({
                content: `<@&${constants.TRADER_ROLE_ID}> — Neuer Trade! 📢`
            });
        }

        tradeData.messageId = tradeMsg.id;
        trades[thread.id] = tradeData;
        store.save();

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