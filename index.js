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
            .setTitle('**Erstes Test Embed!**?')
            .setDescription('Mein erstes Embed.')
.addFields(

{Man kann folgende sachen einbauen: /n
```setTitle()/n
setDescription()/n
setColor()/n
setThumbnail()/n
setImage()/n
addFields()/n
setFooter()/n
setTimestamp()/n
setAuthor()/n
setURL()```'}
)
             };

        // --- Embed senden ---
        channel.send({ embeds: [embed] });
    } else {
        console.log('Channel nicht gefunden!');
    }
});

client.login(process.env.DISCORD_TOKEN);