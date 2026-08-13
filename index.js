const { Client, GatewayIntentBits } = require('discord.js');
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
        await channel.send('```Hallo von meinem Bot!```');
    } else {
        console.log('Channel nicht gefunden!');
    }
});

client.login(process.env.DISCORD_TOKEN);