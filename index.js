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
const store = require('./src/data/store');
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

// === SLASH COMMANDS ===
const commands = [
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
].map(cmd => cmd.toJSON());

// === READY EVENT ===
client.once('ready', async () => {
    console.log('Bot ist online!');

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        // ⭐ GUILD COMMANDS (sofort verfügbar, kein 1h warten!)
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash Commands registriert (Guild)!');
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
                    if (!interaction.memberPermissions.has('Administrator')) {
                        await interaction.reply({ content: '❌ Nur Administratoren können das Setup ausführen.', flags: MessageFlags.Ephemeral });
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

                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                    const priceLines = Object.entries(constants.prices).map(([name, prices]) => {
                        const ankauf = prices.ankauf === 'Stop' ? 'GESPERRT' : `${prices.ankauf.toFixed(1)}M`;
                        const verkauf = prices.verkauf === 'Stop' ? 'GESPERRT' : `${prices.verkauf.toFixed(1)}M`;
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
    const targetUser = interaction.options.getUser('trader') || interaction.user;
    
    // ⭐ NULL-SCHUTZ: traderStats prüfen
    if (!store.traderStats) {
        console.error('❌ store.traderStats ist undefined!');
        await interaction.reply({
            content: '❌ Interne Fehler - Trader-Stats nicht geladen.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }
    
    const stats = store.traderStats[targetUser.id];

    if (!stats || stats.completedTrades === 0) {
        await interaction.reply({
            content: `❌ <@${targetUser.id}> hat noch keine abgeschlossenen Trades.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const avgStars = stats.starCount > 0
        ? (stats.totalStars / stats.starCount).toFixed(1)
        : 'N/A';

    const profit = stats.totalEarned - stats.totalSpent;
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
                `**💰 Gesamtvolumen:** ${stats.totalVolume.toFixed(1)}M\n` +
                `**➕ Eingenommen (Ankauf):** ${stats.totalEarned.toFixed(1)}M\n` +
                `**➖ Ausgezahlt (Verkauf):** ${stats.totalSpent.toFixed(1)}M\n` 
                
            )
        )

    await interaction.reply({
        components: [statsContainer],
        flags: MessageFlags.IsComponentsV2
    });
    return;
}

// --- /trader-top ---
if (interaction.commandName === 'trader-top') {
    // ⭐ NULL-SCHUTZ: traderStats prüfen
    if (!store.traderStats) {
        console.error('❌ store.traderStats ist undefined!');
        await interaction.reply({
            content: '❌ Interne Fehler - Trader-Stats nicht geladen.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const allStats = Object.entries(store.traderStats)
        .filter(([, s]) => s && s.completedTrades > 0)
        .sort((a, b) => b[1].completedTrades - a[1].completedTrades)
        .slice(0, 10);

    if (allStats.length === 0) {
        await interaction.reply({
            content: '❌ Noch keine abgeschlossenen Trades vorhanden.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const leaderboard = allStats.map(([userId, s], i) => {
        const medal = medals[i] || `**${i + 1}.**`;
        const avg = s.starCount > 0 ? (s.totalStars / s.starCount).toFixed(1) : 'N/A';
        return `${medal} <@${userId}> — ${s.completedTrades} Trades | ⭐ ${avg} | 💎 ${s.totalVolume.toFixed(1)}M`;
    }).join('\n');

    const topContainer = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `## 🏆 • Trader Leaderboard — Top 10\n\n` +
                `Sortiert nach abgeschlossenen Trades\n\n` +
                leaderboard
            )
        );

    await interaction.reply({
        components: [topContainer],
        flags: MessageFlags.IsComponentsV2
    });
    return;
}
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
            await interaction.reply({ content: '❌ Ein Fehler ist aufgetreten.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);