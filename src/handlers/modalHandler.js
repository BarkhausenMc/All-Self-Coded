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
    if (interaction.customId.startsWith('trade_modal:')) {
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
            name: `${emoji} ${action} - ${spawnerEmoji} ${spawnerType} - 📦 Menge: ${amount} `,
            type: ChannelType.PrivateThread,
            invitable: false
        });

        await thread.members.add(interaction.user.id);

        if (constants.TRADER_ROLE_ID) {
            try {
                const allMembers = await interaction.guild.members.fetch();
                const traders = allMembers.filter(m => m.roles.cache.has(constants.TRADER_ROLE_ID));
                for (const [, trader] of traders) {
                    await thread.members.add(trader.id).catch(() => {});
                }
            } catch (err) {
                // Silent fail
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
            action,
            createdChannelId: thread.id  // ⭐ ZUSÄTZLICH FÜR DEBUGGING
        };

        const container = buildTradeContainer(tradeData);
        const actionRow = buildActionButtonRow(tradeData);

        const tradeMsg = await thread.send({
    components: [container, actionRow],
    flags: MessageFlags.IsComponentsV2
});

console.log('✅ Trade-Nachricht gesendet:', tradeMsg.id);

// === TRADER PING ===
if (constants.TRADER_ROLE_ID) {
    console.log('🔔 Trader-Ping senden...');
    console.log('   Role ID:', constants.TRADER_ROLE_ID);
    
    try {
        const role = await interaction.guild.roles.fetch(constants.TRADER_ROLE_ID);
        if (role) {
            console.log('   Rolle gefunden:', role.name);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await thread.send({
                content: `<@&${constants.TRADER_ROLE_ID}> — Neuer Trade von \`${tradeData.ingameName}\`! 📢`
            });
            
            console.log('✅ Trader-Ping erfolgreich gesendet');
        } else {
            console.error('❌ Rolle nicht gefunden:', constants.TRADER_ROLE_ID);
        }
    } catch (err) {
        console.error('❌ Fehler beim Fetch/Ping der Rolle:', err.message);
    }
}

        // === TRADE IN LOG POSTEN ===
        if (constants.LOG_CHANNEL_ID) {
            try {
                const logContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${tradeData.emoji} • Neuer Handel #${tradeData.handNummer}\n\n` +
                            `**Status:** ⏳ Offen\n` +
                            `**Zeit:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
                            `**👤 Kunde:** <@${tradeData.kundeId}>\n` +
                            `**🎮 ING:** \`${tradeData.ingameName}\`\n\n` +
                            `**${tradeData.spawnerEmoji} Spawner:** ${tradeData.spawnerType}\n` +
                            `**📦 Menge:** ${tradeData.amount}\n` +
                            `**💵 Preis/Stk:** ${tradeData.pricePerUnit.toFixed(1)}M\n` +
                            `**💰 Gesamtpreis:** ${tradeData.totalPrice.toFixed(1)}M`
                        )
                    );

                const logChannel = interaction.guild.channels.cache.get(constants.LOG_CHANNEL_ID);
                await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
            } catch (err) {
                console.log('Fehler beim Loggen des Trades:', err.message);
            }
        }

        tradeData.messageId = tradeMsg.id;
        
        // ⭐ SPREICHE UNTER BEIDEN KEYS (thread.id UND thread.id als String)
        store.trades[thread.id] = tradeData;
        store.trades[String(thread.id)] = tradeData;
        store.trades[String(parseInt(thread.id))] = tradeData;
        
        store.save();

        console.log('✅ Trade gespeichert unter IDs:', [thread.id, String(thread.id), String(parseInt(thread.id))]);
        console.log('Alle Trade-Keys im Store:', Object.keys(store.trades));

        await interaction.editReply({
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`✅ Dein Trade-Ticket wurde erstellt: <#${thread.id}>`)
                    )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};