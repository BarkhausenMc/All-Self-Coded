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
    Routes,
    ChannelType
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

const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup-Befehle für den Bot')
        .addSubcommand(sub =>
            sub.setName('spawner')
                .setDescription('Sendet das Spawner Trading Panel in den aktuellen Channel')
        )
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log('Bot ist online!');

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

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setup') {
                if (interaction.options.getSubcommand() === 'spawner') {
                    if (!interaction.memberPermissions.has('Administrator')) {
                        await interaction.reply({ content: '❌ Nur Administratoren können das Setup ausführen.', flags: MessageFlags.Ephemeral });
                        return;
                    }

                    // ALTE PANELS AUFRÄUMEN
                    try {
                        const recentMessages = await interaction.channel.messages.fetch({ limit: 20 });
                        for (const msg of recentMessages.values()) {
                            if (!msg.components || msg.components.length === 0) continue;
                            for (const row of msg.components) {
                                if (!row.components) continue;
                                for (const comp of row.components) {
                                    if (comp.customId === 'spawner_ankaufen' || comp.customId === 'spawner_verkaufen') {
                                        try {
                                            await msg.delete();
                                            console.log('Altes Panel gelöscht:', msg.id);
                                        } catch (err) {
                                            // Ignorieren (vielleicht schon gelöscht)
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.log('Fehler beim Aufräumen alter Panels:', err.message);
                    }

                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

// Im /setup spawner Command:
const priceLines = Object.entries(constants.prices).map(([name, prices]) => {
    const ankaufStopped = prices.ankauf === 'Stop' || prices.ankauf === undefined;
    const verkaufStopped = prices.verkauf === 'Stop' || prices.verkauf === undefined;
    
    const ankauf = ankaufStopped ? 'GESPERRT' : `${prices.ankauf.toFixed(1)}M`;
    const verkauf = verkaufStopped ? 'GESPERRT' : `${prices.verkauf.toFixed(1)}M`;
    const emoji = constants.spawnerEmojis[name] || '📦';
    
    return `${emoji} ${name.padEnd(12)} ${ankauf.padStart(10)}  ${verkauf.padStart(10)}`;
}).join('\n');

const container = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## 🛒 • SPAWNER TRADING • 💰\n*Yayks Spawner Trading*||**Only Trusted Trader, Faire Preise 💜**||')
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            '```\n' +
            'SPAWNER      🛒ANKAUF    💰VERKAUF\n' +
            '────────────────────────────────────\n' +
            priceLines + '\n' +
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

                    await interaction.editReply({ content: '✅ Spawner Trading Panel gesendet!' });
                    return;
                }
            }
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'vouch_stars') {
            await handleVouchSelect(interaction);
        } else if (interaction.isModalSubmit() && interaction.customId.startsWith('vouch_modal:')) {
            await handleVouchModal(interaction);
        } else if (interaction.isButton()) {
            await handleButton(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        } else if (interaction.isModalSubmit()) {
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