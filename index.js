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

            // Dropdown erstellen
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

            // Dropdown in Action Row packen
            const menuRow = new ActionRowBuilder()
                .addComponents(selectMenu);

            // Antwort mit Dropdown schicken
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

            await interaction.reply({
                content: `Du hast **${selected}** gewählt!`,
                ephemeral: true
            });
        }
    }

});

client.login(process.env.DISCORD_TOKEN);