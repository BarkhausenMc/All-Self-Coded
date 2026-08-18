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
        if (!interaction.member.roles.cache.has(constants.TRADER_ADMIN_ROLE_ID)) {
            await interaction.reply({ content: '❌ Nur Trader Admins dürfen Ankündigungen machen!', flags: 64 });
            return;
        }

        const titel = interaction.options.getString('titel') || '📋 Preisänderung';
        const ping = interaction.options.getBoolean('ping') ?? false;

        const recentChanges = store.getRecentPriceChanges(5);

        if (recentChanges.length === 0) {
            await interaction.reply({ content: '❌ Keine Preisänderungen in den letzten 5 Minuten! Nutze erst `/setprice` oder `/toggletrade`.' });
            return;
        }

        const changeLines = recentChanges.map(change => {
            const emoji = constants.spawnerEmojis[change.spawner] || '📦';
            const typLabel = change.type === 'ankauf' ? '🛒 Ankauf' : '💰 Verkauf';
            
            const oldStr = change.oldValue === 'Stop' ? 'GESTOPPT' : `${change.oldValue.toFixed(1)}M`;
            const newStr = change.newValue === 'Stop' ? 'GESTOPPT' : `${change.newValue.toFixed(1)}M`;
            
            const isNewStop = change.newValue === 'Stop';
            const wasStop = change.oldValue === 'Stop';
            
            let arrow;
            if (isNewStop) arrow = '🔴';
            else if (wasStop) arrow = '🟢';
            else if (change.newValue > change.oldValue) arrow = '📈';
            else if (change.newValue < change.oldValue) arrow = '📉';
            else arrow = '➡️';
            
            return `### ${emoji} ${change.spawner} — ${typLabel}\n${arrow} ~~${oldStr}~~ → **${newStr}**\n*vor <t:${Math.floor(change.timestamp / 1000)}:R>*`;
        }).join('\n\n');

        const rolePing = ping && constants.SPAWNER_PRICE_ROLE_ID
            ? `<@&${constants.SPAWNER_PRICE_ROLE_ID}>\n\n`
            : '';

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📢 ${titel}\n\n` +
                    `${rolePing}` +
                    `> *Folgende Preise wurden geändert:*\n` +
                    `> *Geändert von <@${interaction.user.id}>*\n\n` +
                    changeLines
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `📋 **Aktuelle Preise** siehe Trading Panel.\n\n` +
                    `*Bei Fragen wendet euch an einen Trader Admin.*`
                )
            );

        const announceChannelId = constants.ANNOUNCE_CHANNEL_ID || constants.CHANNEL_ID;
        const channel = interaction.guild.channels.cache.get(announceChannelId);

        if (!channel) {
            await interaction.reply({ content: '❌ Ankündigungs-Channel nicht gefunden!' });
            return;
        }

        // ⭐ SOFORT REPLY
        await interaction.reply({ content: `✅ Ankündigung wird gesendet...`, flags: 64 });

        // ⭐ DANN ERST SENDEN
        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: ['roles', 'everyone', 'users'] }
        });

        await interaction.editReply({ content: `✅ Ankündigung gesendet in <#${announceChannelId}>!` });
    }
};