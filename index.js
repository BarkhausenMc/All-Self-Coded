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
const fs = require('fs');
const path = require('path');

const constants = require('./src/config/constants');
const store = require('./src/data/store');
const handleButton = require('./src/handlers/buttonHandler');
const handleSelectMenu = require('./src/handlers/selectMenuHandler');
const handleModal = require('./src/handlers/modalHandler');
const { handleVouchSelect, handleVouchModal } = require('./src/handlers/vouchHandler');

global.client = null;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});
global.client = client;

// ⭐ COMMANDS AUS ORDNER LADEN
let commands = [];

// Grund-Commands (setup, trader-stats, trader-top)
commands.push(
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup-Befehle für den Bot')
        .addSubcommand(sub =>
            sub.setName('spawner')
                .setDescription('Sendet das Spawner Trading Panel in den aktuellen Channel')
        ),
    new SlashCommandBuilder()
        .setName('trader-stats')
        .setDescription('Zeigt die Handelsstatistiken eines Traders an')
        .addUserOption(opt =>
            opt.setName('trader')
                .setDescription('Welcher Trader? (Leer = dich selbst)')
                .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('trader-top')
        .setDescription('Zeigt die Top 10 Trader nach abgeschlossenen Trades')
);

// ⭐ COMMANDS AUS src/commands/ LADEN
const commandPath = path.join(__dirname, 'src/commands');
if (fs.existsSync(commandPath)) {
    const adminFolders = fs.readdirSync(commandPath);
    for (const folder of adminFolders) {
        const folderPath = path.join(commandPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(path.join(folderPath, file));
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data);
                }
            }
        }
    }
}

// Convert to JSON for registration
const commandsJSON = commands.map(cmd => cmd.toJSON());

// === READY EVENT ===
client.once('ready', async () => {
    console.log('Bot ist online!');

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
            { body: commandsJSON }
        );
        console.log('✅ Slash Commands registriert (Guild)!', commandsJSON.length, 'Commands');
    } catch (error) {
        console.error('❌ Fehler beim Registrieren der Commands:', error);
    }
});

// === INTERACTION HANDLER ===
client.on('interactionCreate', async (interaction) => {
    try {
        // ==========================================
        // SLASH COMMANDS
        // ==========================================
        if (interaction.isChatInputCommand()) {

            // --- /setup spawner ---
            if (interaction.commandName === 'setup') {
                if (interaction.options.getSubcommand() === 'spawner') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    
                    if (!interaction.memberPermissions.has('Administrator')) {
                        await interaction.editReply({ content: '❌ Nur Administratoren können das Setup ausführen.' });
                        return;
                    }

                    // Alte Panels löschen
                    try {
                        const recentMessages = await interaction.channel.messages.fetch({ limit: 20 });
                        for (const msg of recentMessages.values()) {
                            if (!msg.components || msg.components.length === 0) continue;
                            for (const row of msg.components) {
                                if (!row.components) continue;
                                for (const comp of row.components) {
                                    if (comp.customId === 'spawner_ankaufen' || comp.customId === 'spawner_verkaufen') {
                                        try { await msg.delete(); } catch (e) {}
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.log('Fehler beim Aufräumen alter Panels:', err.message);
                    }

                    // ⭐ PREISE DYNAMISCH HOLEN MIT NULL-SCHUTZ
                    const priceLines = Object.entries(constants.defaultPrices || {}).map(([name, defaultPrices]) => {
                        const ankaufVal = store.getPrice ? store.getPrice(name, 'ankauf') : constants.defaultPrices[name]?.ankauf || 0;
                        const verkaufVal = store.getPrice ? store.getPrice(name, 'verkauf') : constants.defaultPrices[name]?.verkauf || 0;
                        
                        const ankauf = ankaufVal === 'Stop' ? 'STOP' : `${ankaufVal.toFixed(1)}M`;
                        const verkauf = verkaufVal === 'Stop' ? 'STOP' : `${verkaufVal.toFixed(1)}M`;
                        const emoji = constants.spawnerEmojis[name] || '📦';
                        return `${emoji} ${name.padEnd(12)} ${ankauf.padStart(10)}  ${verkauf.padStart(10)}`;
                    }).join('\n');

                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('## :shopping_cart: • SPAWNER TRADING • :moneybag:\n*Yayks Spawner Trading*\n||*Only Trusted Trader, Faire Preise :purple_heart:*||')
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

            // --- /trader-stats ---
            if (interaction.commandName === 'trader-stats') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                const targetUser = interaction.options.getUser('trader') || interaction.user;
                
                // ⭐ NULL-SCHUTZ FÜR traderStats
                const traderStats = store.traderStats || {};
                const stats = traderStats[targetUser.id];

                if (!stats || stats.completedTrades === 0) {
                    await interaction.editReply({ content: `❌ <@${targetUser.id}> hat noch keine abgeschlossenen Trades.` });
                    return;
                }

                const avgStars = stats.starCount > 0
                    ? (stats.totalStars / stats.starCount).toFixed(1)
                    : 'N/A';

                const profit = (stats.totalEarned || 0) - (stats.totalSpent || 0);
                const profitEmoji = profit >= 0 ? '📈' : '📉';
                const profitStr = profit >= 0 ? `+${profit.toFixed(1)}M` : `${profit.toFixed(1)}M`;

                const statsContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## 📊 • Trader Statistiken\n\n` +
                            `**🤝 Trader:** <@${targetUser.id}>\n\n` +
                            `**✅ Abgeschlossene Trades:** ${stats.completedTrades}\n` +
                            `**⭐ Durchschnittliche Bewertung:** ${avgStars} / 5\n\n`
                        )
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## 💵 • Money\n\n` +
                            `**💰 Gesamtvolumen:** ${(stats.totalVolume || 0).toFixed(1)}M\n` +
                            `**➕ Eingenommen (Ankauf):** ${(stats.totalEarned || 0).toFixed(1)}M\n` +
                            `**➖ Ausgezahlt (Verkauf):** ${(stats.totalSpent || 0).toFixed(1)}M\n`
                        )
                    );

                await interaction.editReply({
                    components: [statsContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                return;
            }

            // --- /trader-top ---
            if (interaction.commandName === 'trader-top') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                // ⭐ NULL-SCHUTZ FÜR traderStats
                const traderStats = store.traderStats || {};

                const allStats = Object.entries(traderStats)
                    .filter(([, s]) => s && s.completedTrades > 0)
                    .sort((a, b) => b[1].completedTrades - a[1].completedTrades)
                    .slice(0, 10);

                if (allStats.length === 0) {
                    await interaction.editReply({ content: '❌ Noch keine abgeschlossenen Trades vorhanden.' });
                    return;
                }

                const medals = ['🥇', '🥈', '🥉'];
                const leaderboard = allStats.map(([userId, s], i) => {
                    const medal = medals[i] || `**${i + 1}.**`;
                    const avg = s.starCount > 0 ? (s.totalStars / s.starCount).toFixed(1) : 'N/A';
                    return `${medal} <@${userId}> — ${s.completedTrades} Trades | ⭐ ${avg} | 💎 ${(s.totalVolume || 0).toFixed(1)}M`;
                }).join('\n');

                const topContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## 🏆 • Trader Leaderboard — Top 10\n\n` +
                            `Sortiert nach abgeschlossenen Trades\n\n` +
                            leaderboard
                        )
                    );

                await interaction.editReply({
                    components: [topContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                return;
            }

            // ⭐ EXTERN COMMANDS (setprice, toggletrade) — WIRD AUTOMATISCH GELADEN
        }

        // ==========================================
        // BUTTONS, SELECT MENUS, MODALS
        // ==========================================
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
            try {
                await interaction.reply({ content: '❌ Ein Fehler ist aufgetreten.', flags: MessageFlags.Ephemeral });
            } catch (e) {
                // Ignorieren wenn bereits geantwortet
            }
        } else if (interaction.deferred && !interaction.replied) {
            try {
                await interaction.editReply({ content: '❌ Ein Fehler ist aufgetreten.' });
            } catch (e) {
                // Ignorieren
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);