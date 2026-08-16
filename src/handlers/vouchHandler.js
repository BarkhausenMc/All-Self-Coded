    if (trade.vouches.length >= 2) {
        const vouch1 = trade.vouchEntries[0];
        const vouch2 = trade.vouchEntries[1];

        const customerVouch = vouch1.reviewerId === trade.kundeId ? vouch1 : vouch2;
        const traderVouch = vouch1.reviewerId === trade.claimedBy ? vouch1 : vouch2;

        const customerStars = '⭐'.repeat(customerVouch.rating);
        const traderStars = '⭐'.repeat(traderVouch.rating);

        const vouchContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${trade.emoji} • Handel #${trade.handNummer}\n\n` +
                    `**${trade.emoji} Aktion:** ${trade.action}\n` +
                    `**${trade.spawnerEmoji} Spawner:** ${trade.spawnerType}\n` +
                    `**📦 Menge:** ${trade.amount}\n` +
                    `**💰 Gesamtpreis:** ${trade.totalPrice.toFixed(1)}M\n\n` +
                    `**👤 Kunde:** <@${trade.kundeId}>\n` +
                    `**🤝 Trader:** <@${trade.claimedBy}>`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 📝 Bewertung von Kunde → Trader\n` +
                    `${customerStars} (${customerVouch.rating}/5)\n` +
                    `> ${customerVouch.text}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 📝 Bewertung von Trader → Kunde\n` +
                    `${traderStars} (${traderVouch.rating}/5)\n` +
                    `> ${traderVouch.text}`
                )
            );

        const vouchChannel = interaction.guild.channels.cache.get(constants.VOUCH_CHANNEL_ID);
        if (vouchChannel) {
            await vouchChannel.send({
                components: [vouchContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Trade abschließen
        trade.awaitingVouch = false;
        trade.closed = true;
        store.save();

        // Original-Nachricht aktualisieren (vor Archivierung!)
        try {
            const container = buildTradeContainer(trade);
            const msg = await interaction.channel.messages.fetch(trade.messageId);
            await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (err) {
            // Thread vielleicht schon weg
        }

        // 5 Sekunden Countdown
        await interaction.channel.send({
            content: `⏳ Dieses Ticket wird in **5 Sekunden** geschlossen...`,
        });

        // Reply BEVOR der Thread schließt
        await interaction.reply({
            content: `✅ Beide haben bewertet! Trade abgeschlossen und im Vouch-Channel gepostet.`,
            flags: MessageFlags.Ephemeral
        });

        // Nach 5 Sekunden locken + archivieren
        setTimeout(async () => {
            try {
                await interaction.channel.setLocked(true);
                await interaction.channel.setArchived(true);
            } catch (err) {
                // Ignorieren
            }
        }, 5000);

        delete store.trades[interaction.channelId];
        store.save();
    } else {
        await interaction.reply({
            content: `✅ Danke für deine Bewertung! (${trade.vouches.length}/2)\nWarte noch auf den anderen Trade-Partner.`,
            flags: MessageFlags.Ephemeral
        });
    }