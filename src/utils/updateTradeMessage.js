const { MessageFlags } = require('discord.js');
const buildTradeContainer = require('./buildTradeContainer');
const buildActionButtonRow = require('./buildActionButtonRow');

module.exports = async function updateTradeMessage(channel, trade) {
    // Container (Text) neu bauen mit aktuellen Daten
    const container = buildTradeContainer(trade);

    // Buttons neu bauen (abhängig vom Status)
    const actionRow = buildActionButtonRow(trade);

    // Wenn actionRow null ist (Trade geschlossen/abgebrochen),
    // sende nur den Container, sonst Container + Buttons
    const components = actionRow ? [container, actionRow] : [container];

    // Ursprüngliche Nachricht aus dem Channel fetchen
    const msg = await channel.messages.fetch(trade.messageId);

    // Nachricht bearbeiten
    await msg.edit({
        components,
        flags: MessageFlags.IsComponentsV2
    });
};