const { MessageFlags } = require('discord.js');
const buildTradeContainer = require('./buildTradeContainer');
const buildActionButtonRow = require('./buildActionButtonRow');

module.exports = async function updateTradeMessage(channel, trade, additionalContainers = [], actionRowOverride = null) {
    const container = buildTradeContainer(trade);
    const actionRow = actionRowOverride || buildActionButtonRow(trade);
    
    const components = actionRow ? [container, ...additionalContainers, actionRow] : [container, ...additionalContainers];

    const msg = await channel.messages.fetch(trade.messageId);
    await msg.edit({
        components,
        flags: MessageFlags.IsComponentsV2
    });
};