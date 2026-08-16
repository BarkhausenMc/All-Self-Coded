const { ActionRowBuilder, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { trades } = require('../data/store');
const updateTradeMessage = require('../utils/updateTradeMessage');

module.exports = async function handleButton(interaction) {

    // ==========================================
    // CLAIM BUTTON
    // ==========================================
    if (interaction.customId === 'claim') {
        const trade = trades[interaction.channelId];

        if (!trade) {
            await interaction.reply({ content: '❌ Trade nicht gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (trade.claimedBy) {
            await interaction.reply({
                content: `❌ Bereits von <@${trade.claimedBy}> geclaimt.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Claimer setzen
        trade.claimedBy = interaction.user.id;

        // Nachricht aktualisieren (Buttons wechseln von [Claim] zu [Schließen])
        await updateTradeMessage(interaction.channel, trade);

        await interaction.reply({
            content: `✅ Du hast den Trade geclaimt!`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // ==========================================
    // CLOSE BUTTON (Trade abschließen)
    // ==========================================
    if (interaction.customId === 'close') {
        const trade = trades[interaction.channelId];

        if (!trade || !trade.claimedBy) {
            await interaction.reply({
                content: '❌ Der Trade muss erst geclaimt werden.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Nur der Claimer darf schließen
        if (interaction.user.id !== trade.claimedBy) {
            await interaction.reply({
                content: `❌ Nur <@${trade.claimedBy}> darf diesen Trade abschließen.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Trade als geschlossen markieren
        trade.closed = true;

        // Nachricht aktualisieren (Buttons verschwinden, "abgeschlossen" Text)
        await updateTradeMessage(interaction.channel, trade);

        // Thread archivieren
        await interaction.channel.setArchived(true);

        // Aus Speicher entfernen
        delete trades[interaction.channelId];

        await interaction.reply({
            content: `✅ Trade wurde abgeschlossen und der Thread archiviert.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // ==========================================
    // ABBRUCH BUTTON (Trade abbrechen)
    // ==========================================
    if (interaction.customId === 'abbruch') {
        const trade = trades[interaction.channelId];

        if (!trade) {
            await interaction.reply({
                content: '❌ Trade nicht gefunden.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Trade als abgebrochen markieren
        trade.cancelled = true;

        // Nachricht aktualisieren (Buttons verschwinden, "abgebrochen" Text)
        await updateTradeMessage(interaction.channel, trade);

        // Thread archivieren
        await interaction.channel.setArchived(true);

        // Aus Speicher entfernen
        delete trades[interaction.channelId];

        await interaction.reply({
            content: `❌ Trade wurde abgebrochen und der Thread archiviert.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // ==========================================
    // SPAWNER TRADING BUTTONS (Hauptpanel)
    // ==========================================
    if (interaction.customId === 'spawner_ankaufen') {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_spawner:ankauf')
            .setPlaceholder('Spawner auswählen...')
            .addOptions([
                { label: '💀 Skeleton Spawner', description: 'Preis: 10.0M', value: 'Skeleton', emoji: '💀' },
                { label: '💥 Creeper Spawner', description: 'Preis: 10.0M', value: 'Creeper', emoji: '💥' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 🛒 • Spawner Ankauf\nWähle unten den Spawner, den du **kaufen** möchtest.')
            )
            .addActionRowComponents(row);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
    }

    if (interaction.customId === 'spawner_verkaufen') {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_spawner:verkauf')
            .setPlaceholder('Spawner auswählen...')
            .addOptions([
                { label: '💀 Skeleton Spawner', description: 'Du bekommst: 8.0M', value: 'Skeleton', emoji: '💀' },
                { label: '💥 Creeper Spawner', description: 'Du bekommst: 9.0M', value: 'Creeper', emoji: '💥' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 💰 • Spawner Verkauf\nWähle unten den Spawner, den du **verkaufen** möchtest.')
            )
            .addActionRowComponents(row);

        await interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return;
    }
};