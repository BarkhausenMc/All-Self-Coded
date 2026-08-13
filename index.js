const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
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
        const embed = new EmbedBuilder()
            .setColor(0x6d4aff)
            .setTitle('Erstes Test Embed!')
            .setDescription('Mein erstes Embed.')
            .addFields(
                { name: 'Folgende sachen können in ein Embed eingebaut werden:', value: 'setTitle()\nsetDescription()\nsetColor()\nsetThumbnail()\nsetImage()\naddFields()\nsetFooter()\nsetTimestamp()' }
            );

        const button = new ButtonBuilder()
            .setCustomId('anleitung')
            .setLabel('Bot Anleitung')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📁');

        const row = new ActionRowBuilder()
            .addComponents(button);

        channel.send({ embeds: [embed], components: [row] });
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

            // --- JE NACH WAHL UNTERSCHIEDLICHES EMBED ---
            let replyEmbed;

            if (selected === 'embeds') {
                replyEmbed = new EmbedBuilder()
                    .setColor(0x6d4aff)
                    .setTitle('Embeds erstellen 🎨')
                    .setDescription('So baust du ein Embed auf:')
                    .addFields(
                        { name: 'Basis-Code', value: '```js\nconst embed = new EmbedBuilder()\n    .setTitle(\"Mein Titel\")\n    .setDescription(\"Inhalt\")\n    .setColor(0x6d4aff);\n```' },
                        { name: 'Wichtige Methoden', value: '.setTitle()\n.setDescription()\n.setColor()\n.setThumbnail()\n.setImage()\n.addFields()\n.setFooter()' },
                        { name: 'Limitierungen', value: '- Titel: max 256 Zeichen\n- Description: max 4096 Zeichen\n- Max 25 Fields' }
                    )
                    .setFooter({ text: 'Probier es mal aus!' });

            } else if (selected === 'buttons') {
                replyEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Buttons erstellen 🔘')
                    .setDescription('Buttons machen deinen Bot interaktiv!')
                    .addFields(
                        { name: 'Schritt 1: Button bauen', value: '```js\nconst button = new ButtonBuilder()\n    .setCustomId(\"unique_id\")\n    .setLabel(\"Click mich\")\n    .setStyle(ButtonStyle.Primary);\n```' },
                        { name: 'Schritt 2: In Row packen', value: '```js\nconst row = new ActionRowBuilder()\n    .addComponents(button);\n```' },
                        { name: 'Schritt 3: Senden', value: '```js\nawait channel.send({\n    content: \"Nachricht\",\n    components: [row]\n});\n```' },
                        { name: 'Button Styles', value: '**Primary**: Lila/Blau\n**Success**: Grün\n**Danger**: Rot\n**Secondary**: Grau\n**Link**: Öffnet URL' }
                    )
                    .setFooter({ text: 'Eigene CustomId vergeben um Klicks zu erkennen!' });

            } else if (selected === 'commands') {
                replyEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('Slash Commands ⌨️')
                    .setDescription('Commande wie `/help` oder `/ban` sind cool und einfach!')
                    .addFields(
                        { name: 'Vorteile von Slash Commands', value: '✅ Automatische Autocomplete\n✅ Bessere UX als Text-Commands\n✅ Discord zeigt dir Hilfe an' },
                        { name: 'Grundgerüst', value: '```js\napp.commands.create({\n    name: \"ping\",\n    description: \"Antwortet mit Pong!\",\n    options: []\n});\n```' },
                        { name: 'Deploy Kommando', value: 'Benutze `deploy-commands.js` um Commands global oder auf deinem Server zu registrieren.' }
                    )
                    .setFooter({ text: 'Slash Commands brauchen andere Intents!' });

            } else {
                // FALL SOLLTE WAS NICHT GEPAFT HABEN
                replyEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Ups!')
                    .setDescription('Diese Auswahl wurde noch nicht erstellt.');
            }

            // Antwornte mit dem generierten Embed schicken
            await interaction.update({
                content: '',  // Leer lassen, da wir nur das Embed zeigen wollen
                embeds: [replyEmbed],
                components: []  // Dropdown entfernen nach Auswahl
            });

        }
    }

});

client.login(process.env.DISCORD_TOKEN);