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
    ChannelType,
    ModalBuilder,        
    TextInputBuilder,    
    TextInputStyle        
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

    if (interaction.isButton()) {
        switch (interaction.customId) {
            case 'spawner_ankaufen': {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('spawner_ankauf_select')
                    .setPlaceholder('Spawner auswählen...')
                    .addOptions([
                        {
                            label: '💀 Skeleton Spawner',
                            description: 'Preis: 10.0M',
                            value: 'skeleton_spawner',
                            emoji: '💀'
                        },
                        {
                            label: '💥 Creeper Spawner',
                            description: 'Preis: 10.0M',
                            value: 'creeper_spawner',
                            emoji: '💥'
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('## 🛒 • Spawner Ankauf\nWähle unten den Spawner, den du **kaufen** möchtest.')
                    )
                    .addActionRowComponents(row);

                await interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
                break;
            }

            case 'spawner_verkaufen': {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('spawner_verkauf_select')
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
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('## 💰 • Spawner Verkauf\nWähle unten den Spawner, den du **verkaufen** möchtest.')
                    )
                    .addActionRowComponents(row);

                await interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
                break;
            }
        }
    }

if (interaction.isStringSelectMenu()) {
    const selected = interaction.values[0];

    // Modal bauen — customId enthält die Spawner-Auswahl, damit wir sie später auslesen können
    const modal = new ModalBuilder()
        .setCustomId(`spawner_trade_modal:${selected}`)
        .setTitle('🛒 Spawner Trade Details');

    const ingameNameInput = new TextInputBuilder()
        .setCustomId('ingame_name')
        .setLabel('Wie lautet dein Ingame-Name?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. Steve')
        .setRequired(true);

    const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Wie viele Spawner möchtest du trade-en?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. 3')
        .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(ingameNameInput);
    const secondRow = new ActionRowBuilder().addComponents(amountInput);

    modal.addComponents(firstRow, secondRow);

    await interaction.showModal(modal);
}
if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('spawner_trade_modal:')) {
        const selected = interaction.customId.split(':')[1];
        const ingameName = interaction.fields.getTextInputValue('ingame_name');
        const amount = interaction.fields.getTextInputValue('amount');

        // Thread-Namen basierend auf Ankauf/Verkauf
        const isVerkauf = selected.startsWith('sell_');
        const spawnerName = isVerkauf ? selected.replace('sell_', '') : selected;
        const emoji = isVerkauf ? '💰' : '🛒';
        const action = isVerkauf ? 'Verkauf' : 'Ankauf';

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const thread = await interaction.channel.threads.create({
            name: `${emoji} ${action} - ${interaction.user.username}`,
            type: ChannelType.PrivateThread,
            invitable: false
        });

        await thread.members.add(interaction.user.id);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${emoji} • Spawner ${action}\n\n` +
                    `**Spieler:** <@${interaction.user.id}>\n` +
                    `**Ingame-Name:** \`${ingameName}\`\n` +
                    `**Spawner-Typ:** ${spawnerName}\n` +
                    `**Menge:** ${amount}\n\n` +
                    `Ein Staff-Mitglied wird sich gleich um deinen Trade kümmern.\n` +
                    `Bitte habe etwas Geduld! 🕐`
                )
            );

        await thread.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        await interaction.editReply({
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `✅ Dein Trade-Thread wurde erstellt: <#${thread.id}>`
                        )
                    )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
});

client.login(process.env.DISCORD_TOKEN);