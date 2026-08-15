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
                    new TextDisplayBuilder().setContent('## 🛒 Spawner Verkaufen\nWelche Spawner möchtest du **Verkaufen**?')
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
            return;
        }

        if (interaction.customId === 'spawner_ankaufen') {
            const options = spawnerData.spawners.map(spawner => ({
                label: `${spawner.emoji} ${spawner.name}`,
                description: `Du bezahlst ${formatMoney(spawner.sellPrice)}`,
                value: `${spawner.id}_buy`
            }));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## 💰 Spawner Ankaufen\nWelche Spawner möchtest du **Kaufen**?')
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
            return;
        }

        if (interaction.customId === 'claim_ticket') {
            if (!interaction.member.roles.cache.has(spawnerData.traderRoleId)) {
                await interaction.reply({
                    content: '❌ Nur Trader dürfen Tickets claimen.',
                    ephemeral: true
                });
                return;
            }

            await interaction.channel.members.add(interaction.user.id);

            const claimedContainer = new ContainerBuilder()
                .setAccentColor(0x6d4aff)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🔒 TICKET GECLAIMED\n**Team-Mitglied:** <@${interaction.user.id}>\n\n*Dieses Ticket wird jetzt bearbeitet.*`
                    )
                );

            await interaction.channel.send({
                components: [claimedContainer],
                flags: MessageFlags.IsComponentsV2
            });

            await interaction.reply({
                content: '✅ Ticket geclaimed!',
                ephemeral: true
            });
            return;
        }

        if (interaction.customId === 'close_ticket') {
            const creatorId = interaction.channel.ownerId;
            const isTrader = interaction.member.roles.cache.has(spawnerData.traderRoleId);

            if (interaction.user.id !== creatorId && !isTrader) {
                await interaction.reply({
                    content: '❌ Nur der Ticket-Ersteller oder Trader dürfen Tickets schließen.',
                    ephemeral: true
                });
                return;
            }

            const confirmContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '## ⚠️ TICKET SCHLIESSEN?\nSoll das Ticket wirklich geschlossen werden?\n\n**Das Ticket wird nach dem Schließen gelöscht.**'
                    )
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('confirm_close')
                            .setLabel('Ja, schließen')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('✅'),
                        new ButtonBuilder()
                            .setCustomId('cancel_close')
                            .setLabel('Abbrechen')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('❌')
                    )
                );

            await interaction.reply({
                components: [confirmContainer],
                flags: MessageFlags.IsComponentsV2
            });
            return;
        }

        if (interaction.customId === 'confirm_close') {
            await interaction.reply({
                content: '✅ Ticket wird in 5 Sekunden geschlossen...',
                ephemeral: true
            });

            setTimeout(async () => {
                await interaction.channel.delete('Ticket abgeschlossen').catch(console.error);
            }, 5000);
            return;
        }

        if (interaction.customId === 'cancel_close') {
            await interaction.reply({
                content: '❌ Abgebrochen.',
                ephemeral: true
            });
            return;
        }

        return;
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_sell_spawner') {
            const [spawnerId] = interaction.values[0].split('_');
            const spawner = spawnerData.spawners.find(s => s.id === spawnerId);

            if (!spawner) {
                await interaction.reply({ content: '❌ Ungültiger Spawner.', ephemeral: true });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`trade_sell_${spawnerId}`)
                .setTitle(`${spawner.emoji} ${spawner.name} verkaufen`);

            const mcNameInput = new TextInputBuilder()
                .setCustomId('mc_username')
                .setLabel('Dein Minecraft Username')
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

            modal.addComponents(
                new ActionRowBuilder().addComponents(mcNameInput),
                new ActionRowBuilder().addComponents(amountInput)
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.customId === 'select_buy_spawner') {
            const [spawnerId] = interaction.values[0].split('_');
            const spawner = spawnerData.spawners.find(s => s.id === spawnerId);

            if (!spawner) {
                await interaction.reply({ content: '❌ Ungültiger Spawner.', ephemeral: true });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`trade_buy_${spawnerId}`)
                .setTitle(`${spawner.emoji} ${spawner.name} kaufen`);

            const mcNameInput = new TextInputBuilder()
                .setCustomId('mc_username')
                .setLabel('Dein Minecraft Username')
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

            modal.addComponents(
                new ActionRowBuilder().addComponents(mcNameInput),
                new ActionRowBuilder().addComponents(amountInput)
            );

            await interaction.showModal(modal);
            return;
        }
    }

    if (interaction.isModalSubmit()) {
        const customId = interaction.customId;
        const [, action, spawnerId] = customId.split('_');
        const spawner = spawnerData.spawners.find(s => s.id === spawnerId);

        if (!spawner) {
            await interaction.reply({ content: '❌ Spawner nicht gefunden.', ephemeral: true });
            return;
        }

        const mcUsername = interaction.fields.getTextInputValue('mc_username');
        const amount = parseInt(interaction.fields.getTextInputValue('amount'));

        if (isNaN(amount) || amount <= 0) {
            await interaction.reply({ content: '❌ Ungültige Anzahl.', ephemeral: true });
            return;
        }

        const pricePerUnit = action === 'sell' ? spawner.buyPrice : spawner.sellPrice;
        const totalPrice = pricePerUnit * amount;

        const threadName = action === 'sell'
            ? `🛒 Verkauf • ${spawner.name} • ${mcUsername}`
            : `💰 Ankauf • ${spawner.name} • ${mcUsername}`;

        const thread = await interaction.channel.threads.create({
            name: threadName,
            autoArchiveDuration: 60,
            reason: `Trade-Anfrage von ${mcUsername}`,
            type: ChannelType.PrivateThread
        });

        await thread.members.add(interaction.user.id);

        const traderMembers = interaction.guild.members.cache.filter(m => m.roles.cache.has(spawnerData.traderRoleId));
        for (const [memberId] of traderMembers) {
            await thread.members.add(memberId).catch(() => {});
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Ticket Claimen')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔐'),
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Ticket Schließen')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        const accentColor = action === 'sell' ? 0x00FF00 : 0x6d4aff;
        const titleText = action === 'sell' ? 'VERKAUFSTICKET' : 'ANKAUFSTICKET';

        const threadContainer = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📝 ${titleText} ERSTELLT\n` +
                    `**Minecraft Name:** ${mcUsername}\n` +
                    `**Spawner:** ${spawner.emoji} ${spawner.name}\n` +
                    `**Menge:** ${amount}x\n` +
                    `**Stückpreis:** ${formatMoney(pricePerUnit)}\n` +
                    `**Gesamtpreis:** ${formatMoney(totalPrice)}\n\n` +
                    `*Warte auf Admin-Freigabe...*`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`<@${interaction.user.id}> hat dieses Ticket erstellt.`)
            )
            .addActionRowComponents(row);

        await thread.send({
            components: [threadContainer],
            flags: MessageFlags.IsComponentsV2
        });

        await interaction.reply({
            content: '✅ Ticket erstellt! Ein Team-Mitglied kümmert sich gleich darum.',
            ephemeral: true
        });
    }
});

client.login(process.env.DISCORD_TOKEN);