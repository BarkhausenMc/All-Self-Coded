const { ActionRowBuilder, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { trades } = require('../data/store');
const store = require('../data/store');
const constants = require('../config/constants');
const updateTradeMessage = require('../utils/updateTradeMessage');
const buildTradeContainer = require('../utils/buildTradeContainer');

module.exports = async function handleButton(interaction) {

    // ==========================================
    // CLAIM BUTTON
    // ==========================================
    if (interaction.customId === 'claim') {
        const trade = store.trades[interaction.channelId];

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

        // Nur Trader dürfen claimen (Role Check)
        const traderRoleId = process.env.TRADER_ROLE_ID;
        if (!interaction.member.roles.cache.has(traderRoleId)) {
            await interaction.reply({
                content: '❌ Nur Mitglieder mit der "Trader" Rolle dürfen Trades claimen.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        trade.claimedBy = interaction.user.id;
        store.save();

        await updateTradeMessage(interaction.channel, trade);

        await interaction.reply({
            content: `✅ Du hast den Trade geclaimt!`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // ==========================================
    // CLOSE BUTTON → Startet Vouch-Phase
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

        if (interaction.user.id !== trade.claimedBy) {
            await interaction.reply({
                content: `❌ Nur <@${trade.claimedBy}> darf diesen Trade abschließen.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Trade in Vouch-Phase setzen
        trade.awaitingVouch = true;
        trade.vouches = [];
        store.save();

        // Original-Nachricht aktualisieren (keine Buttons, "Warte auf Bewertungen")
        await updateTradeMessage(interaction.channel, trade);

        // Vouch-Nachricht mit Stern-Auswahl senden
        const starSelect = new StringSelectMenuBuilder()
            .setCustomId('vouch_stars')
            .setPlaceholder('⭐ Bewerte deinen Trade-Partner (1-5 Sterne)')
            .addOptions([
                { label: '⭐ 1 Stern', description: 'Sehr schlechte Erfahrung', value: '1', emoji: '⭐' },
                { label: '⭐⭐ 2 Sterne', description: 'Schlechte Erfahrung', value: '2', emoji: '⭐' },
                { label: '⭐⭐⭐ 3 Sterne', description: 'Okay', value: '3', emoji: '⭐' },
                { label: '⭐⭐⭐⭐ 4 Sterne', description: 'Gute Erfahrung', value: '4', emoji: '⭐' },
                { label: '⭐⭐⭐⭐⭐ 5 Sterne', description: 'Sehr gute Erfahrung', value: '5', emoji: '⭐' }
            ]);

        const vouchRow = new ActionRowBuilder().addComponents(starSelect);

        const vouchContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📝 • Trade Bewertung\n\n` +
                    `Bitte bewertet euch gegenseitig!\n` +
                    `Wähle unten deine Sterne-Bewertung aus.\n` +
                    `Danach kannst du noch einen Text schreiben.\n\n` +
                    `**Kunde:** <@${trade.kundeId}>\n` +
                    `**Trader:** <@${trade.claimedBy}>`
                )
            )
            .addActionRowComponents(vouchRow);

        await interaction.channel.send({
            components: [vouchContainer],
            flags: MessageFlags.IsComponentsV2
        });

        await interaction.reply({
            content: `✅ Trade wird abgeschlossen — bitte bewertet euch gegenseitig!`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // ==========================================
    // ABBRUCH BUTTON
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

        trade.cancelled = true;
        store.save();

        await updateTradeMessage(interaction.channel, trade);
        await interaction.channel.setArchived(true);

        delete trades[interaction.channelId];
        store.save();

        await interaction.reply({
            content: `❌ Trade wurde abgebrochen und der Thread archiviert.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // ==========================================
    // SPAWNER TRADING BUTTONS
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