const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once('ready', async () => {
    console.log('Bot ist online!');

    const channel = client.channels.cache.get('1537389571103522868');

    if (channel) {
        const container = new ContainerBuilder()
            
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 🛒 • SPAWNER TRADING • 💰\n*Yayks Spawner Tarding*')
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
            ); // <-- Klammer hier geschlossen!

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('spawner_ankaufen') // ⚠️ HIER KORRIGIERT!
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

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    switch (interaction.customId) {
        case 'spawner_ankaufen':
            await interaction.deferReply({ ephemeral: true });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('spawner_ankeuf_select')
                .setLabel('Wähle einen Spawner')
                .setPlaceholder('Spawner auswählen...')
                .addOptions([
                    {
                        label: '💀 Skeleton Spawner',
                        description: 'Ankaufpreis: 10.0M | Verkaufspreis: 8.0M',
                        value: 'skeleton_spawner',
                        emoji: '💀'
                    },
                    {
                        label: '💥 Creeper Spawner',
                        description: 'Ankaufpreis: 10.0M | Verkaufspreis: 9.0M',
                        value: 'creeper_spawner',
                        emoji: '💥'
                    },
                    {
                        label: '🕸️ Spider Spawner',
                        description: 'Ankaufpreis: 10.0M | Verkaufspreis: 8.5M',
                        value: 'spider_spawner',
                        emoji: '🕸️'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: '**🛒 Ankauf - Bitte wähle deinen Spawner:**',
                components: [row]
            });
            break;

        case 'spawner_verkaufen':
            await interaction.deferReply({ ephemeral: true });

            const selectMenuSell = new StringSelectMenuBuilder()
                .setCustomId('spawner_verkauf_select')
                .setLabel('Wähle einen Spawner zum Verkauf')
                .setPlaceholder('Spawner auswählen...')
                .addOptions([
                    {
                        label: '💀 Skeleton Spawner',
                        description: 'Du bekommst: 8.0M',
                        value: 'sell_skeleton',
                        emoji: '💀'
                    },
                    {
                        label: '💥 Creeper Spawner',
                        description: 'Du bekommst: 9.0M',
                        value: 'sell_creeper',
                        emoji: '💥'
                    },
                    {
                        label: '🕸️ Spider Spawner',
                        description: 'Du bekommst: 8.5M',
                        value: 'sell_spider',
                        emoji: '🕸️'
                    }
                ]);

            const sellRow = new ActionRowBuilder().addComponents(selectMenuSell);

            await interaction.editReply({
                content: '**💰 Verkauf - Wähle deinen Spawner:**',
                components: [sellRow]
            });
            break;
    }

    // 👇 NEU: Select Menu Auswahl verarbeiten
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'spawner_ankeuf_select') {
            const selectedSpawner = interaction.values[0];
            
            await interaction.reply({
                content: `✅ **${selectedSpawner}** ausgewählt! Worauf wartest du?`,
                ephemeral: true
            });
        }

        if (interaction.customId === 'spawner_verkauf_select') {
            const selectedSpawner = interaction.values[0];
            
            await interaction.reply({
                content: `✅ Verkauf von **${selectedSpawner}** gestartet!`,
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);