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

    // --- 1. BUTTON → Select Menu öffnen ---
    if (interaction.isButton()) {
        switch (interaction.customId) {
            case 'spawner_ankaufen': {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_spawner:ankauf')
                    .setPlaceholder('Spawner auswählen...')
                    .addOptions([
                        { label: '💀 Skeleton Spawner', description: 'Preis: 10.0M', value: 'Skeleton', emoji: '💀' },
                        { label: '💥 Creeper Spawner', description: 'Preis: 10.0M', value: 'Creeper', emoji: '💥' }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('## 🛒 • Spawner Ankauf\nWähle unten den Spawner, den du **kaufen** möchtest.')
                    )
                    .addActionRowComponents(row);

                await interaction.reply({
                    components: [container],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
                break;
            }

            case 'spawner_verkaufen': {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_spawner:verkauf')
                    .setPlaceholder('Spawner auswählen...')
                    .addOptions([
                        { label: '💀 Skeleton Spawner', description: 'Du bekommst: 8.0M', value: 'Skeleton', emoji: '💀' },
                        { label: '💥 Creeper Spawner', description: 'Du bekommst: 9.0M', value: 'Creeper', emoji: '💥' }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('## 💰 • Spawner Verkauf\nWähle unten den Spawner, den du **verkaufen** möchtest.')
                    )
                    .addActionRowComponents(row);

                await interaction.reply({
                    components: [container],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
                break;
            }
        }
    }

    // --- 2. SELECT MENU → Modal öffnen ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('select_spawner:')) {
            const tradeType = interaction.customId.split(':')[1];  // 'ankauf' oder 'verkauf'
            const spawnerType = interaction.values[0];              // 'skeleton' oder 'creeper'

            // tradeType + spawnerType in die Modal-customId packen
            const modal = new ModalBuilder()
                .setCustomId(`trade_modal:${tradeType}:${spawnerType}`)
                .setTitle(tradeType === 'ankauf' ? '🛒 Spawner Ankauf' : '💰 Spawner Verkauf');

            const ingameNameInput = new TextInputBuilder()
                .setCustomId('ingame_name')
                .setLabel('Wie lautet dein Ingame-Name?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('z.B. Steve')
                .setRequired(true);

            const amountInput = new TextInputBuilder()
                .setCustomId('amount')
                .setLabel(tradeType === 'ankauf' ? 'Wie viele Spawner möchtest du kaufen?' : 'Wie viele Spawner möchtest du verkaufen?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('z.B. 3')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(ingameNameInput),
                new ActionRowBuilder().addComponents(amountInput)
            );

            await interaction.showModal(modal);
        }
    }

    // --- 3. MODAL SUBMIT → Thread erstellen ---
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('trade_modal:')) {
            const parts = interaction.customId.split(':');        // ['trade_modal', 'ankauf', 'skeleton']
            const tradeType = parts[1];                             // 'ankauf' oder 'verkauf'
            const spawnerType = parts[2];                           // 'skeleton' oder 'creeper'
            const ingameName = interaction.fields.getTextInputValue('ingame_name');
            const amount = interaction.fields.getTextInputValue('amount');

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const emoji = tradeType === 'ankauf' ? '🛒' : '💰';
            const action = tradeType === 'ankauf' ? 'Ankauf' : 'Verkauf';

            const thread = await interaction.channel.threads.create({
                name: `${emoji} ${action} - ${interaction.user.username}`,
                type: ChannelType.PrivateThread,
                invitable: false
            });

            await thread.members.add(interaction.user.id);

            // Preis-Tabelle (in Millionen)
            const prices = {
                skeleton: { ankauf: 10.0, verkauf: 8.0 },
                creeper:  { ankauf: 10.0, verkauf: 9.0 }
            };

            const pricePerUnit = prices[spawnerType][tradeType];
            const totalPrice = pricePerUnit * parseInt(amount);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${emoji} • Spawner ${action}\n\n`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Kunde:** <@${interaction.user.id}>\n` +
                        `**👤 ING:** \`${ingameName}\`\n\n` +
                        `**Spawner-Typ:** ${spawnerType}\n` +
                        `**📦 Menge:** ${amount}\n\n` +
                        `**💵 Preis/Stk:** ${pricePerUnit.toFixed(1)}M\n` +
                        `**💰 Gesamtpreis:** ${totalPrice.toFixed(1)}M`
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
                            new TextDisplayBuilder().setContent(`✅ Dein Trade-Thread wurde erstellt: <#${thread.id}>`)
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);