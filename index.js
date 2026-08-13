const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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
        // --- Embed erstellen ---
        const embed = new EmbedBuilder()
            .setColor(0x6d4aff)                    // Lila Streifen links
            .setTitle('Willkommen auf dem Server!')
            .setURL('https://example.com')          // Titel wird klickbar
            .setAuthor({ 
                name: 'Bot Name',
                iconURL: 'https://example.com/icon.png'
            })
            .setDescription('Das ist die **Beschreibung**.\nDu kannst hier *Markdown* nutzen.')
            .setThumbnail('https://example.com/thumbnail.png')
            .addFields(
                { name: 'Spieler online', value: '42', inline: true },
                { name: 'Server-Region', value: 'EU-West', inline: true },
                { name: 'Nächstes Event', value: 'Heute 20 Uhr', inline: false }
            )
            .setImage('https://example.com/banner.png')
            .setTimestamp()
            .setFooter({ 
                text: 'Powered by Flo',
                iconURL: 'https://example.com/footer-icon.png'
            });

        // --- Embed senden ---
        channel.send({ embeds: [embed] });
    } else {
        console.log('Channel nicht gefunden!');
    }
});

client.login(process.env.DISCORD_TOKEN);