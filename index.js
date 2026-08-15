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
                new TextDisplayBuilder().setContent('## 💎 SPAWNER PREISE 💎\n**VOID Market — HUGOSMP**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('💰 **ANKAUF** — Wir kaufen deinen Spawner — so viel bekommst du')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('🛒 **VERKAUF** — Wir verkaufen dir einen Spawner — so viel zahlst du')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '```\n' +
                    'SPAWNER        ANKAUF      VERKAUF\n' +
                    '────────────────────────────────────\n' +
                    '👾 Creeper      6.0M        9.0M\n' +
                    '🤖 Iron Golem   5.0M        STOP\n' +
                    '💀 Skelly       9.5M        STOP\n' +
                    '```'
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Wir versuchen immer faire und optimale Preise anzubieten. ❤️\nWähle eine Option, um direkt zu handeln 👇')
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('anleitung')
                        .setLabel('Bot Anleitung')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📁')
                )
            );

        channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    } else {
        console.log('Channel nicht gefunden!');
    }
});

client.on('interactionCreate', async (interaction) => {

    // --- BUTTON KLICK ---
    if (interaction.isButton()) {
        if (interaction.customId === 'anleitung') {

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('anleitung_auswahl')
                .setPlaceholder('Wähle ein Thema...')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    {
                        label: 'Embeds',
                        description: 'Wie erstelle ich Embeds?',
                        value: 'embeds',
                        emoji: '🎨'
                    },
                    {
                        label: 'Buttons',
                        description: 'Wie funktionieren Buttons?',
                        value: 'buttons',
                        emoji: '🔘'
                    },
                    {
                        label: 'Commands',
                        description: 'Wie mache ich Slash Commands?',
                        value: 'commands',
                        emoji: '⌨️'
                    }
                );

            const menuRow = new ActionRowBuilder()
                .addComponents(selectMenu);

            await interaction.reply({
                content: 'Wähle unten, was du lernen möchtest:',
                components: [menuRow],
                ephemeral: true
            });
        }
    }

    // --- DROPDOWN AUSWAHL ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'anleitung_auswahl') {

            const selected = interaction.values[0];

            let replyContent = '';

            if (selected === 'embeds') {
                replyContent =
                    '## 🎨 Embeds erstellen\n' +
                    'So baust du ein Embed auf:\n\n' +
                    '**Basis-Code:**\n' +
                    '```js\nconst embed = new EmbedBuilder()\n    .setTitle("Mein Titel")\n    .setDescription("Inhalt")\n    .setColor(0x6d4aff);\n```\n\n' +
                    '**Wichtige Methoden:**\n.setTitle()\n.setDescription()\n.setColor()\n.setThumbnail()\n.setImage()\n.addFields()\n.setFooter()\n\n' +
                    '**Limitierungen:**\n- Titel: max 256 Zeichen\n- Description: max 4096 Zeichen\n- Max 25 Fields\n\n' +
                    '*Probier es mal aus!*';
            } else if (selected === 'buttons') {
                replyContent =
                    '## 🔘 Buttons erstellen\n' +
                    'Buttons machen deinen Bot interaktiv!\n\n' +
                    '**Schritt 1: Button bauen**\n' +
                    '```js\nconst button = new ButtonBuilder()\n    .setCustomId("unique_id")\n    .setLabel("Click mich")\n    .setStyle(ButtonStyle.Primary);\n```\n\n' +
                    '**Schritt 2: In Row packen**\n' +
                    '```js\nconst row = new ActionRowBuilder()\n    .addComponents(button);\n```\n\n' +
                    '**Schritt 3: Senden**\n' +
                    '```js\nawait channel.send({\n    content: "Nachricht",\n    components: [row]\n});\n```\n\n' +
                    '**Button Styles:**\n**Primary**: Lila/Blau\n**Success**: Grün\n**Danger**: Rot\n**Secondary**: Grau\n**Link**: Öffnet URL\n\n' +
                    '*Eigene CustomId vergeben um Klicks zu erkennen!*';
            } else if (selected === 'commands') {
                replyContent =
                    '## ⌨️ Slash Commands\n' +
                    'Commands wie `/help` oder `/ban` sind cool und einfach!\n\n' +
                    '**Vorteile:**\n✅ Automatische Autocomplete\n✅ Bessere UX als Text-Commands\n✅ Discord zeigt dir Hilfe an\n\n' +
                    '**Grundgerüst:**\n' +
                    '```js\napp.commands.create({\n    name: "ping",\n    description: "Antwortet mit Pong!",\n    options: []\n});\n```\n\n' +
                    '**Deploy Kommando:**\nBenutze `deploy-commands.js` um Commands global oder auf deinem Server zu registrieren.\n\n' +
                    '*Slash Commands brauchen andere Intents!*';
            } else {
                replyContent = '## Ups!\nDiese Auswahl wurde noch nicht erstellt.';
            }

            await interaction.update({
                content: replyContent,
                components: [],
                ephemeral: true
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);