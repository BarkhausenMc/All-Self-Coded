const {
    ActionRowBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ChannelType
} = require('discord.js');

const constants = require('../config/constants');
const store = require('../data/store');
const buildTradeContainer = require('../utils/buildTradeContainer');
const buildActionButtonRow = require('../utils/buildActionButtonRow');

module.exports = async function handleModal(interaction) {
    if (!interaction.customId.startsWith('trade_modal:')) return;

    const parts = interaction.customId.split(':');
    const tradeType = parts[1];
    const spawnerType = parts[2];

    const ingameName = interaction.fields.getTextInputValue('ingame_name');
    const amount = interaction.fields.getTextInputValue('amount');

    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        await interaction.reply({
            content: '❌ Bitte gib eine gültige Anzahl ein (z.B. 3)!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // ⭐ SOFORT deferReply — keine Unknown Interaction mehr!
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    store.tradeCounters[interaction.user.id] = (store.tradeCounters[interaction.user.id] || 0) + 1;
    const handNummer = store.tradeCounters[interaction.user.id];
    store.save();

    const emoji = tradeType === 'ankauf' ? '🛒' : '💰';
    const action = tradeType === 'ankauf' ? 'Ankauf' : 'Verkauf';
    const spawnerEmoji = constants.spawnerEmojis[spawnerType] || '❌';
    const pricePerUnit = constants.prices[spawnerType][tradeType];
    const totalPrice = pricePerUnit * parsedAmount;

    const thread = await interaction.channel.threads.create({
        name: `${emoji} ${action} - ${ingameName}`,
        type: ChannelType.PrivateThread,
        invitable: false
    });

    await thread.members.add(interaction.user.id);

    // ⭐ Trader hinzufügen über Role.members (schnell!)
    if (constants.TRADER_ROLE_ID) {
        try {
            const role = await interaction.guild.roles.fetch(constants.TRADER_ROLE_ID);
            if (role) {
                for (const member of role.members.values()) {
                    await thread.members.add(member.id).catch(() => {});
                }
            }
        } catch (err) {
            console.log('Fehler beim Hinzufügen von Tradern:', err.message);
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

    // === TRADER PING ===
    if (constants.TRADER_ROLE_ID) {
        try {
            await thread.send({
                content: `<@&${constants.TRADER_ROLE_ID}> — Neuer Trade von \`${ingameName}\`! 📢`
            });
        } catch (err) {
            console.log('Fehler beim Trader-Ping:', err.message);
        }
    }

    // === TRADE IN LOG POSTEN ===
    if (constants.LOG_CHANNEL_ID) {
        try {
            const logContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${emoji} • Neuer Handel #${handNummer}\n\n` +
                        `**Status:** ⏳ Offen\n` +
                        `**Zeit:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                        `**👤 Kunde:** <@${tradeData.kundeId}>\n` +
                        `**🎮 ING:** \`${ingameName}\`\n\n` +
                        `**${spawnerEmoji} Spawner:** ${spawnerType}\n` +
                        `**📦 Menge:** ${parsedAmount}\n` +
                        `**💵 Preis/Stk:** ${pricePerUnit.toFixed(1)}M\n` +
                        `**💰 Gesamtpreis:** ${totalPrice.toFixed(1)}M`
                    )
                );

            const logChannel = interaction.guild.channels.cache.get(constants.LOG_CHANNEL_ID);
            if (logChannel) {
                await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
            }
        } catch (err) {
            console.log('Fehler beim Loggen:', err.message);
        }
    }

    tradeData.messageId = tradeMsg.id;

    // ⭐ NUR EIN KEY — String, kein parseInt!
    store.trades[String(thread.id)] = tradeData;
    store.save();

    console.log('✅ Trade gespeichert unter ID:', String(thread.id));

    await interaction.editReply({
        components: [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`✅ Dein Trade-Thread wurde erstellt: <#${thread.id}>`)
                )
        ],
        flags: MessageFlags.IsComponentsV2
    });
};