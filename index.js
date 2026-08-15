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
const fs = require('fs');
require('dotenv').config();

const spawnerData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const { formatMoney } = require('./formatMoney.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log('Bot ist online!');

    const channel = client.channels.cache.get('1537389571103522868');

    if (channel) {
        // Tabelle bauen aus config.json
        let priceTable = '```\nSPAWNER      🛒ANKAUF    💰VERKAUF\n────────────────────────────────────\n';
        spawnerData.spawners.forEach(spawner => {
            priceTable += `${spawner.emoji} ${spawner.name.padEnd(12)} ${formatMoney(spawner.buyPrice).padStart(10)}   ${formatMoney(spawner.sellPrice).padStart(10)}\n`;
        });
        priceTable += '```';

        const container = new ContainerBuilder()
            .setAccentColor(0x1a1a1a)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 🛒 • SPAWNER TRADING • 💰\n*Yayks Spawner Tarding*')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(priceTable)
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

client.on('interactionCreate', async (interaction) => {

    if (interaction.isButton()) {
        if (interaction.customId === 'spawner_verkaufen') {
            const options = spawnerData.spawners.map(spawner => ({
                label: `${spawner.emoji} ${spawner.name}`,
                description: `Du erhältst ${formatMoney(spawner.buyPrice)}`,
                value: `${spawner.id}_sell`
            }));

            const container = new ContainerBuilder()
                .setAccentColor(0x00FF00)
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
                            .addOptions(options)
                    )
                );

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        if (interaction.customId === 'spawner_ankaufen') {
            const options = spawnerData.spawners.map(spawner => ({
                label: `${spawner.emoji} ${spawner.name}`,
                description: `Du bezahlst ${formatMoney(spawner.sellPrice)}`,
                value: `${spawner.id}_buy`
            }));

            const container = new ContainerBuilder()
                .setAccentColor(0x6d4aff)
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
                            .addOptions(options)
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

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_sell_spawner') {
            const [spawnerId] = interaction.values[0].split('_');
            const spawner = spawnerData.spawners.find(s => s.id === spawnerId);
            const name = spawner ? spawner.name : spawnerId.charAt(0).toUpperCase() + spawnerId.slice(1);
            const price = formatMoney(spawner?.buyPrice || 0);

            const successContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ✅ VERKAUF BESTÄTIGT\nDu hast **${name}** für ${price} verkauft.`)
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
            const spawner = spawnerData.spawners.find(s => s.id === spawnerId);
            const name = spawner ? spawner.name : spawnerId.charAt(0).toUpperCase() + spawnerId.slice(1);
            const price = formatMoney(spawner?.sellPrice || 0);

            const successContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ✅ KAUF BESTÄTIGT\nDu hast **${name}** für ${price} gekauft.`)
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