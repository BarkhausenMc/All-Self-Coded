const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, AllowedMentionsType } = require('discord.js');
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
                .setDescription('Soll @everyone gepingt werden?')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(constants.TRADER_ADMIN_ROLE_ID)) {
            await interaction.reply({
                content: '❌ Nur Trader Admins dürfen Ankündigungen machen!',
                flags: 64
            });
            return;
        }

        await interaction.deferReply({ flags: 64 });

        const titel = interaction.options.getString('titel') || '📋 Aktuelle Preise';
        const ping = interaction.options.getBoolean('ping') ?? false;

        // Alle Preise holen
        const priceLines = Object.entries(constants.prices).map(([name, defaultPrices]) => {
            const ankauf = store.getPrice(name, 'ankauf');
            const verkauf = store.getPrice(name, 'verkauf');
            const emoji = constants.spawnerEmojis[name] || '📦';
            
            const ankaufStr = ankauf === 'Stop' ? '🔴 STOP' : `🟢 ${ankauf.toFixed(1)}M`;
            const verkaufStr = verkauf === 'Stop' ? '🔴 STOP' : `🟢 ${verkauf.toFixed(1)}M`;
            
            return `### ${emoji} ${name}\n🛒 Ankauf: ${ankaufStr} | 💰 Verkauf: ${verkaufStr}`;
        }).join('\n\n');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📢 ${titel}\n\n` +
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

        // In welchen Channel posten?
        const announceChannelId = constants.ANNOUNCE_CHANNEL_ID || constants.CHANNEL_ID;
        const channel = interaction.guild.channels.cache.get(announceChannelId);

        if (!channel) {
            await interaction.editReply({ content: '❌ Ankündigungs-Channel nicht gefunden! Überprüfe ANNOUNCE_CHANNEL_ID in der .env.' });
            return;
        }

        // ⭐ WICHTIG: content NICHT mit IsComponentsV2 kombinieren
        // Stattdessen: allowed_mentions für @everyone verwenden
        await channel.send({
            content: ping ? '@everyone' : undefined,
            components: [container],
            allowedMentions: ping ? { parse: ['everyone', 'roles', 'users'] } : undefined
        });

        await interaction.editReply({ content: `✅ Ankündigung gesendet in <#${announceChannelId}>!` });
    }
};