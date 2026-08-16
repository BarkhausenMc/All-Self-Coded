const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    SlashCommandBuilder,
    REST,
    Routes
} = require('discord.js');
require('dotenv').config();

const constants = require('./src/config/constants');
const handleButton = require('./src/handlers/buttonHandler');
const handleSelectMenu = require('./src/handlers/selectMenuHandler');
const handleModal = require('./src/handlers/modalHandler');
const { handleVouchSelect, handleVouchModal } = require('./src/handlers/vouchHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Slash Commands definieren
const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup-Befehle für den Bot')
        .addSubcommand(sub =>
            sub.setName('spawner')
                .setDescription('Sendet das Spawner Trading Panel in den aktuellen Channel')
        )
].map(cmd => cmd.toJSON());

// ==========================================
// READY EVENT — Slash Commands registrieren
// ==========================================
client.once('ready', async () => {
    console.log('Bot ist online!');

    // Slash Commands global registrieren
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Slash Commands registriert!');
    } catch (error) {
        console.error('❌ Fehler beim Registrieren der Commands:', error);
    }
});

// ==========================================
// INTERACTION CREATE
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        // Slash Command
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setup') {
                if (interaction.options.getSubcommand() === 'spawner') {
                    if (!interaction.memberPermissions.has('Administrator')) {
                        await interaction.reply({ content: '❌ Nur Administratoren können das Setup ausführen.', flags: MessageFlags.Ephemeral });
                        return;
                    }

                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('## 🛒 • SPAWNER TRADING • 💰\n*Yayks Spawner Trading*')
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
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
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('💰 **VERKAUFEN** — Du **verkaufst** uns deine Spawner')
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('🛒 **ANKAUF** — Du **kaufst** unsere Spawner')
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
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

                    await interaction.channel.send({
                        components: [container, row],
                        flags: MessageFlags.IsComponentsV2
                    });

                    await interaction.reply({ content: '✅ Spawner Trading Panel gesendet!', flags: MessageFlags.Ephemeral });
                    return;
                }
            }
        }

        // Vouch Select Menu
        if (interaction.isStringSelectMenu() && interaction.customId === 'vouch_stars') {
            await handleVouchSelect(interaction);
        }
        // Vouch Modal
        else if (interaction.isModalSubmit() && interaction.customId.startsWith('vouch_modal:')) {
            await handleVouchModal(interaction);
        }
        // Buttons
        else if (interaction.isButton()) {
            await handleButton(interaction);
        }
        // Normales Select Menu
        else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        }
        // Normales Modal
        else if (interaction.isModalSubmit()) {
            await handleModal(interaction);
        }
    } catch (error) {
        console.error('Fehler bei Interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Ein Fehler ist aufgetreten.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);