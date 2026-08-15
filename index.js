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
            .setAccentColor(0x1a1a1a)
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
                    '🤖 Iron Golem    10.0M        7.0M\n' +
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

    if (interaction.isButton()) {
        if (interaction.customId === 'spawner_verkaufen') {
            const sellMenu = new StringSelectMenuBuilder()
                .setCustomId('select_sell_spawner')
                .setPlaceholder('Welchen Spawner verkaufst du? 🛒')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions([
                    { label: '💀 Skeleton', description: 'Verkauf für 10.0M', value: 'skeleton_sell', emoji: '💀' },
                    { label: '💥 Creeper', description: 'Verkauf für 10.0M', value: 'creeper_sell', emoji: '💥' },
                    { label: '🤖 Iron Golem', description: 'Verkauf für 10.0M', value: 'iron_golem_sell', emoji: '🤖' }
                ]);

            const menuRow = new ActionRowBuilder().addComponents(sellMenu);

            await interaction.reply({
                content: '**Verkaufen** — Wähle deinen Spawner:',
                components: [menuRow],
                ephemeral: true
            });
        }

        if (interaction.customId === 'spawner_ankaufen') {
            const buyMenu = new StringSelectMenuBuilder()
                .setCustomId('select_buy_spawner')
                .setPlaceholder('Welchen Spawner kaufst du? 💰')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions([
                    { label: '💀 Skeleton', description: 'Kauf für 8.0M', value: 'skeleton_buy', emoji: '💀' },
                    { label: '💥 Creeper', description: 'Kauf für 9.0M', value: 'creeper_buy', emoji: '💥' },
                    { label: '🤖 Iron Golem', description: 'Kauf für 7.0M', value: 'iron_golem_buy', emoji: '🤖' }
                ]);

            const menuRow = new ActionRowBuilder().addComponents(buyMenu);

            await interaction.reply({
                content: '**Ankaufen** — Wähle deinen Spawner:',
                components: [menuRow],
                ephemeral: true
            });
        }
        return;
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_sell_spawner') {
            const [spawnerId, action] = interaction.values[0].split('_');
            const name = spawnerId.charAt(0).toUpperCase() + spawnerId.slice(1);

            await interaction.reply({
                content: `**Verkauf bestätigt!**\nDu hast **${name}** verkauft.`,
                ephemeral: true
            });
        }

        if (interaction.customId === 'select_buy_spawner') {
            const [spawnerId, action] = interaction.values[0].split('_');
            const name = spawnerId.charAt(0).toUpperCase() + spawnerId.slice(1);

            await interaction.reply({
                content: `**Kauf bestätigt!**\nDu hast **${name}** gekauft.`,
                ephemeral: true
            });
        }
        return;
    }
});

client.login(process.env.DISCORD_TOKEN);