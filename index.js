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

    // --- BUTTON HANDLER ---
    if (interaction.isButton()) {
    switch (interaction.customId) {
        case 'spawner_ankaufen': {
            const modal = new ModalBuilder()
                .setCustomId('trade_modal:ankauf')
                .setTitle('🛒 Spawner Ankauf');

            const ingameNameInput = new TextInputBuilder()
                .setCustomId('ingame_name')
                .setLabel('Wie lautet dein Ingame-Name?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('z.B. Steve')
                .setRequired(true);

            const amountInput = new TextInputBuilder()
                .setCustomId('amount')
                .setLabel('Wie viele Spawner möchtest du kaufen?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('z.B. 3')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(ingameNameInput),
                new ActionRowBuilder().addComponents(amountInput)
            );

            await interaction.showModal(modal);
            break;
        }

        case 'spawner_verkaufen': {
            const modal = new ModalBuilder()
                .setCustomId('trade_modal:verkauf')
                .setTitle('💰 Spawner Verkauf');

            const ingameNameInput = new TextInputBuilder()
                .setCustomId('ingame_name')
                .setLabel('Wie lautet dein Ingame-Name?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('z.B. Steve')
                .setRequired(true);

            const amountInput = new TextInputBuilder()
                .setCustomId('amount')
                .setLabel('Wie viele Spawner möchtest du verkaufen?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('z.B. 3')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(ingameNameInput),
                new ActionRowBuilder().addComponents(amountInput)
            );

            await interaction.showModal(modal);
            break;
        }
    }
}

    // --- MODAL SUBMIT HANDLER ---
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('trade_modal:')) {
            const tradeType = interaction.customId.split(':')[1];  // 'ankauf' oder 'verkauf'
            const ingameName = interaction.fields.getTextInputValue('ingame_name');
            const amount = interaction.fields.getTextInputValue('amount');

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`select_after_modal:${tradeType}`)
                .setPlaceholder('Spawner auswählen...')
                .addOptions([
                    {
                        label: '💀 Skeleton Spawner',
                        description: tradeType === 'ankauf' ? 'Preis: 10.0M' : 'Du bekommst: 8.0M',
                        value: 'skeleton_spawner',
                        emoji: '💀'
                    },
                    {
                        label: '💥 Creeper Spawner',
                        description: tradeType === 'ankauf' ? 'Preis: 10.0M' : 'Du bekommst: 9.0M',
                        value: 'creeper_spawner',
                        emoji: '💥'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${tradeType === 'ankauf' ? '🛒' : '💰'} • Trade Details\n\n` +
                        `**Ingame-Name:** \`${ingameName}\`\n` +
                        `**Menge:** ${amount}\n\n` +
                        `Wähle unten den Spawner-Typ aus:`
                    )
                )
                .addActionRowComponents(row);

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }

    // --- SELECT MENU HANDLER ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('select_after_modal:')) {
            const tradeType = interaction.customId.split(':')[1];
            const selected = interaction.values[0];

            const emoji = tradeType === 'ankauf' ? '🛒' : '💰';
            const action = tradeType === 'ankauf' ? 'Ankauf' : 'Verkauf';

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
                        `**Spawner-Typ:** ${selected}\n` +
                        `**Menge:** ${amount}\n\n` +
                        `Ein Staff-Mitglied wird sich gleich um deinen Trade kümmern.\n` +
                        `Bitte habe etwas Geduld! 🕐`
                    )
                );

            await thread.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            await interaction.update({
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