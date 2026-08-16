const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
require('dotenv').config();

// Eigene Module importieren
const { constants } = require('./src/config/constants');
const handleButton = require('./src/handlers/buttonHandler');
const handleSelectMenu = require('./src/handlers/selectMenuHandler');
const handleModal = require('./src/handlers/modalHandler');

// Client mit Intents erstellen
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers  // Braucht Privileged Intent im Developer Portal!
    ]
});

// ==========================================
// READY EVENT — Trading Panel senden
// ==========================================
client.once('ready', async () => {
    console.log('Bot ist online!');

    const channel = client.channels.cache.get(constants.CHANNEL_ID);

    if (channel) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 🛒 • SPAWNER TRADING • 💰\n*Yayks Spawner Trading*')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '```\n' +
                    'SPAWNER      🛒ANKAUF    💰VERKAUF\n' +
                    '────────────────────────────────────\n' +
                    '💀 Skeleton      10.0M        8.0M\n' +
                    '💥 Creeper       10.0M        9.0M\n' +
                    '```'
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('💰 **VERKAUFEN** — Du **verkaufst** uns deine Spawner')
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('🛒 **ANKAUF** — Du **kaufst** unsere Spawner')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Klicke unten auf den `💰 VERKAUFEN` oder `🛒 ANKAUF` Button,\num einen Trade zu Starten.')
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('spawner_ankaufen')
                .setLabel('Spawner Kaufen')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🛒'),
            new ButtonBuilder()
                .setCustomId('spawner_verkaufen')
                .setLabel('Spawner Verkaufen')
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰')
        );

        channel.send({
            components: [container, row],
            flags: MessageFlags.IsComponentsV2
        });
    } else {
        console.log('Channel nicht gefunden!');
    }
});

// ==========================================
// INTERACTION CREATE — An Handler weiterleiten
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton()) {
            await handleButton(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModal(interaction);
        }
    } catch (error) {
        console.error('Fehler bei Interaction:', error);
        // Falls noch nicht geantwortet wurde, versuche eine Fehlermeldung
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Ein Fehler ist aufgetreten.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
});

// ==========================================
// LOGIN
// ==========================================
client.login(process.env.DISCORD_TOKEN);