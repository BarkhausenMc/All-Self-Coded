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
        const embed = new EmbedBuilder()
            .setColor(0x6d4aff)
            .setTitle('Erstes Test Embed!')
            .setDescription('Mein erstes Embed.')
            .addFields(
                { name: 'Folgende sachen können in ein Embed eingebaut werden:', value: 'setTitle()\nsetDescription()\nsetColor()\nsetThumbnail()\nsetImage()\naddFields()\nsetFooter()\nsetTimestamp()' }
            );

        channel.send({ embeds: [embed] });
    } else {
        console.log('Channel nicht gefunden!');
    }
});

client.login(process.env.DISCORD_TOKEN);