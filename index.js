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
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType
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
                
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## 🛒 Spawner Verkaufen\nWelche Spawner möchetst du **Verkaufen**?')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('select_sell_spawner')
                            .setPlaceholder('Welchen Spawner möchtest du Verkaufen?')
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
                
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## 💰 Spawner Ankaufen\nWelche Spawner möchtest du **Kaufen**')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('select_buy_spawner')
                            .setPlaceholder('Welchen Spawner möchtest du Kaufen?')
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
        
        if (!spawner) {
            await interaction.reply({
                content: '❌ Ungültiger Spawner ausgewählt.',
                ephemeral: true
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('trade_sell_modal')
            .setTitle(`${spawner.emoji} ${spawner.name} verkaufen`);

        const mcNameInput = new TextInputBuilder()
            .setCustomId('mc_username')
            .setLabel('Dein Minecraft username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. Steve123')
            .setRequired(true);

        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Anzahl Spawner')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. 5')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(3);

        modal.addComponents(mcNameInput, amountInput);

        await interaction.showModal(modal);
    }

    if (interaction.customId === 'select_buy_spawner') {
        const [spawnerId] = interaction.values[0].split('_');
        const spawner = spawnerData.spawners.find(s => s.id === spawnerId);

        if (!spawner) {
            await interaction.reply({
                content: '❌ Ungültiger Spawner ausgewählt.',
                ephemeral: true
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('trade_buy_modal')
            .setTitle(`${spawner.emoji} ${spawner.name} kaufen`);

        const mcNameInput = new TextInputBuilder()
            .setCustomId('mc_username')
            .setLabel('Dein Minecraft username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. Steve123')
            .setRequired(true);

        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Anzahl Spawner')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. 3')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(3);

        modal.addComponents(mcNameInput, amountInput);

        await interaction.showModal(modal);
    }
}
});
if (interaction.isModalSubmit()) {
    if (interaction.customId === 'trade_sell_modal') {
        const mcUsername = interaction.fields.getTextInputValue('mc_username');
        const amount = parseInt(interaction.fields.getTextInputValue('amount'));

        // Thread erstellen
        const thread = await interaction.channel.threads.create({
            name: `🛒 Verkauf • ${mcUsername}`,
            autoArchiveDuration: 60,
            reason: `Verkaufsanfrage von ${mcUsername}`,
            type: ChannelType.PrivateThread
        });

        // Nachricht im Thread
        const threadMessage = new ContainerBuilder()
            .setAccentColor(0x00FF00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📝 VERKAUFSTICKER ERSTELLT\n` +
                    `**User:** ${mcUsername}\n` +
                    `**Spawner:** ${interaction.message.components[0].components[0].options[0].label.split(' ').slice(1).join(' ')}\n` +
                    `**Menge:** ${amount}\n\n` +
                    `*Warte auf Admin-Freigabe...*`
                )
            );

        await thread.send({
            components: [threadMessage],
            flags: MessageFlags.IsComponentsV2
        });

        await interaction.reply({
            content: `✅ Ticket erstellt! Bitte warte auf eine Antwort vom Team.`,
            ephemeral: true
        });

        // Optional: Bot im Thread ententfernen aus Cache nach etwas Zeit
        setTimeout(() => {
            thread.delete().catch(console.error);
        }, 60 * 60 * 1000); // 1 Stunde
    }

    if (interaction.customId === 'trade_buy_modal') {
        const mcUsername = interaction.fields.getTextInputValue('mc_username');
        const amount = parseInt(interaction.fields.getTextInputValue('amount'));

        const thread = await interaction.channel.threads.create({
            name: `💰 Ankauf • ${mcUsername}`,
            autoArchiveDuration: 60,
            reason: `Ankaufanfrage von ${mcUsername}`,
            type: ChannelType.PrivateThread
        });

        const threadMessage = new ContainerBuilder()
            .setAccentColor(0x6d4aff)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📝 ANKAUFSTICKER ERSTELLT\n` +
                    `**User:** ${mcUsername}\n` +
                    `**Spawner:** ${interaction.message.components[0].components[0].options[0].label.split(' ').slice(1).join(' ')}\n` +
                    `**Menge:** ${amount}\n\n` +
                    `*Warte auf Admin-Freigabe...*`
                )
            );

        await thread.send({
            components: [threadMessage],
            flags: MessageFlags.IsComponentsV2
        });

        await interaction.reply({
            content: `✅ Ticket erstellt! Bitte warte auf eine Antwort vom Team.`,
            ephemeral: true
        });
    }
}
client.login(process.env.DISCORD_TOKEN);