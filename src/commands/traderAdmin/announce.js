const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const constants = require('../../config/constants');
const store = require('../../data/store');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('📢 Preisänderungen ankündigen (Trader Admin)')
        .addStringOption(opt =>
            opt.setName('titel')
                .setDescription('Titel der Ankündigung (z.B. "Preisanpassung KW 34")')
                .setRequired(false)
        )
        .addBooleanOption(opt =>
            opt.setName('ping')
                .setDescription('Soll die Spawner Price Rolle gepingt werden?')
                .setRequired(false)
        ),

    async execute(interaction) {
        // ⭐ SOFORT DEFER REPLY!
        await interaction.deferReply({ flags: 64 });

        if (!interaction.member.roles.cache.has(constants.TRADER_ADMIN_ROLE_ID)) {
            await interaction.editReply({ content: '❌ Nur Trader Admins dürfen Ankündigungen machen!' });
            return;
        }

        const titel = interaction.options.getString('titel') || '📋 Aktuelle Preise';
        const ping = interaction.options.getBoolean('ping') ?? false;

        // Alle Preise holen
        const priceLines = Object.entries(constants.prices).map(([name]) => {
            const ankauf = store.getPrice(name, 'ankauf');
            const verkauf = store.getPrice(name, 'verkauf');
            const emoji = constants.spawnerEmojis[name] || '📦';
            
            const ankaufStr = ankauf === 'Stop' ? '🔴 STOP' : `🟢 ${ankauf.toFixed(1)}M`;
            const verkaufStr = verkauf === 'Stop' ? '🔴 STOP' : `🟢 ${verkauf.toFixed(1)}M`;
            
            return `### ${emoji} ${name}\n🛒 Ankauf: ${ankaufStr} | 💰 Verkauf: ${verkaufStr}`;
        }).join('\n\n');

        // ⭐ ROLLE PING IN TEXTDISPLAY (nicht als content!)
        const rolePing = ping && constants.SPAWNER_PRICE_ROLE_ID
            ? `<@&${constants.SPAWNER_PRICE_ROLE_ID}>\n\n`
            : '';

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📢 ${titel}\n\n` +
                    `${rolePing}` +
                    `> *Die Preise wurden aktualisiert!*\n` +
                    `> *Stand: <t:${Math.floor(Date.now() / 1000)}:R>*\n\n` +
                    `**Geändert von:** <@${interaction.user.id}>`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(priceLines)
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `*Bei Fragen wendet euch an einen Trader Admin.*\n` +
                    `*Um einen Trade zu starten, gehe ins Trading Panel.*`
                )
            );

        const announceChannelId = constants.ANNOUNCE_CHANNEL_ID || constants.CHANNEL_ID;
        const channel = interaction.guild.channels.cache.get(announceChannelId);

        if (!channel) {
            await interaction.editReply({ content: '❌ Ankündigungs-Channel nicht gefunden! Überprüfe ANNOUNCE_CHANNEL_ID in der .env.' });
            return;
        }

        // ⭐ COMPONENTS V2 OHNE content — Rolle-Ping ist im Container!
        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: ['roles', 'everyone', 'users'] }
        });

        await interaction.editReply({ content: `✅ Ankündigung gesendet in <#${announceChannelId}>!` });
    }
};