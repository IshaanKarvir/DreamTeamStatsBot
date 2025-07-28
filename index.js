require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const RiotAPI = require('./riot-api');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
    console.log("Received interaction");
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (interaction.commandName === 'summoner') {
        await handleSummonerCommand(interaction);
    }
});

async function handleSummonerCommand(interaction) {
    const gameName = interaction.options.getString('gamename');
    const tagLine = interaction.options.getString('tagline');
    
    if (!process.env.RIOT_API_KEY) {
        await interaction.reply('Riot API key not configured. Please contact the bot administrator.');
        return;
    }

    try {
        await interaction.deferReply();
        
        const riotAPI = new RiotAPI(process.env.RIOT_API_KEY);
        const account = await riotAPI.getAccountByRiotId(gameName, tagLine);
        console.log('Account data:', account);
        const summoner = await riotAPI.getSummonerByPuuid(account.puuid);
        console.log('Summoner data:', summoner);
        
        const embed = {
            color: 0x0099ff,
            title: `Summoner: ${account.gameName}#${account.tagLine}`,
            fields: [
                {
                    name: 'Level',
                    value: (summoner.summonerLevel || 'Unknown').toString(),
                    inline: true
                },
                {
                    name: 'PUUID',
                    value: summoner.puuid || 'Unknown',
                    inline: true
                },
                {
                    name: 'Profile Icon ID',
                    value: (summoner.profileIconId || 'Unknown').toString(),
                    inline: true
                },
                {
                    name: 'Last Updated',
                    value: summoner.revisionDate ? new Date(summoner.revisionDate).toLocaleDateString() : 'Unknown',
                    inline: false
                }
            ],
            timestamp: new Date()
        };

        // Only add thumbnail if profileIconId exists
        if (summoner.profileIconId) {
            embed.thumbnail = {
                url: `http://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${summoner.profileIconId}.png`
            };
        }
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error fetching summoner:', error);
        
        let errorMessage = 'An error occurred while fetching summoner data.';
        if (error.message === 'Summoner not found' || error.message === 'Account not found') {
            errorMessage = `Account "${gameName}#${tagLine}" not found. Please check the game name and tag line.`;
        } else if (error.message === 'Invalid API key') {
            errorMessage = 'Invalid Riot API key. Please contact the bot administrator.';
        } else if (error.message === 'Rate limit exceeded') {
            errorMessage = 'Rate limit exceeded. Please try again later.';
        }
        
        await interaction.editReply(errorMessage);
    }
}

client.login(process.env.DISCORD_TOKEN);