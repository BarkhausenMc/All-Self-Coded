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
            const container = new ContainerBuilder()
                .setAccentColor(0x00FF00) // Grün für Verkauf
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## 🛒 VERKAUFEN\n*Wähle deinen Spawner*')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('select_sell_spawner')
                            .setPlaceholder('Welchen Spawner verkaufst du?')
                            .addOptions([
                                { label: '💀 Skeleton', value: 'skeleton_sell', emoji: '💀' },
                                { label: '💥 Creeper', value: 'creeper_sell', emoji: '💥' },
                                { label: '🤖 Iron Golem', value: 'iron_golem_sell', emoji: '🤖' }
                            ])
                    )
                );

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (interaction.customId === 'spawner_ankaufen') {
            const container = new ContainerBuilder()
                .setAccentColor(0x6d4aff) // Lila für Ankauf
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## 💰 ANKAUFEN\n*Wähle deinen Spawner*')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('select_buy_spawner')
                            .setPlaceholder('Welchen Spawner kaufst du?')
                            .addOptions([
                                { label: '💀 Skeleton', value: 'skeleton_buy', emoji: '💀' },
                                { label: '💥 Creeper', value: 'creeper_buy', emoji: '💥' },
                                { label: '🤖 Iron Golem', value: 'iron_golem_buy', emoji: '🤖' }
                            ])
                    )
                );

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
        return;
    }

    // Select Menu Handler bleibt gleich
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_sell_spawner') {
            const [spawnerId] = interaction.values[0].split('_');
            const name = spawnerId.charAt(0).toUpperCase() + spawnerId.slice(1);

            const successContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ✅ VERKAUF BESTÄTIGT\nDu hast **${name}** erfolgreich verkauft.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Geld wurde gutgeschrieben. ❤️')
                );

            await interaction.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (interaction.customId === 'select_buy_spawner') {
            const [spawnerId] = interaction.values[0].split('_');
            const name = spawnerId.charAt(0).toUpperCase() + spawnerId.slice(1);

            const successContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ✅ KAUF BESTÄTIGT\nDu hast **${name}** erfolgreich gekauft.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Geld wurde abgebucht. ❤️')
                );

            await interaction.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
        return;
    }
});

client.login(process.env.DISCORD_TOKEN);