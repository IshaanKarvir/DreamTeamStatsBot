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
    } else if (interaction.commandName === 'matchhistory') {
        await handleMatchHistoryCommand(interaction);
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
        
        // Step 1: Get account data (PUUID)
        const account = await riotAPI.getAccountByRiotId(gameName, tagLine);
        console.log('Step 1 - Account data:', account);
        
        // Step 2: Get summoner data using PUUID
        const summoner = await riotAPI.getSummonerByPuuid(account.puuid);
        console.log('Step 2 - Summoner data:', summoner);
        console.log('Step 2 - Summoner data keys:', Object.keys(summoner));
        
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
                    name: 'Profile Icon ID',
                    value: (summoner.profileIconId || 'Unknown').toString(),
                    inline: true
                },
                {
                    name: 'Last Updated',
                    value: summoner.revisionDate ? new Date(summoner.revisionDate).toLocaleDateString() : 'Unknown',
                    inline: true
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

async function handleMatchHistoryCommand(interaction) {
    const gameName = interaction.options.getString('gamename');
    const tagLine = interaction.options.getString('tagline');
    
    if (!process.env.RIOT_API_KEY) {
        await interaction.reply('Riot API key not configured. Please contact the bot administrator.');
        return;
    }

    try {
        await interaction.deferReply();
        
        const riotAPI = new RiotAPI(process.env.RIOT_API_KEY);
        
        // Step 1: Get account data (PUUID)
        const account = await riotAPI.getAccountByRiotId(gameName, tagLine);
        console.log('Step 1 - Account data:', account);
        
        // Step 2: Get match IDs using PUUID
        const matchIds = await riotAPI.getRecentMatches(account.puuid, 5);
        console.log('Step 2 - Match IDs:', matchIds);
        
        // Step 3: Get detailed match information for each match
        const matchResults = [];
        let wins = 0;
        
        if (matchIds && matchIds.length > 0) {
            for (const matchId of matchIds) {
                try {
                    const matchData = await riotAPI.getMatch(matchId);
                    console.log(`Match ${matchId} data:`, matchData);
                    
                    // Find the player in the match data
                    const player = matchData.info.participants.find(p => p.puuid === account.puuid);
                    if (player) {
                        const result = {
                            matchId: matchId,
                            win: player.win,
                            champion: player.championName,
                            kills: player.kills,
                            deaths: player.deaths,
                            assists: player.assists
                        };
                        matchResults.push(result);
                        if (player.win) wins++;
                    }
                } catch (error) {
                    console.error(`Error fetching match ${matchId}:`, error);
                }
            }
        }
        
        const winPercentage = matchResults.length > 0 ? ((wins / matchResults.length) * 100).toFixed(1) : 0;
        
        // Create embed with match results
        const embed = {
            color: 0x00ff00, // Green color to distinguish from original
            title: `Match History: ${account.gameName}#${account.tagLine}`,
            fields: [
                {
                    name: 'Win Rate (Last 5 Games)',
                    value: `${winPercentage}% (${wins}W/${matchResults.length - wins}L)`,
                    inline: true
                }
            ],
            timestamp: new Date()
        };
        
        // Add individual match results
        if (matchResults.length > 0) {
            const matchDetails = matchResults.map(match => 
                `${match.win ? '✅' : '❌'} ${match.champion} - ${match.kills}/${match.deaths}/${match.assists}`
            ).join('\n');
            
            embed.fields.push({
                name: 'Recent Matches',
                value: matchDetails,
                inline: false
            });
        }
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in matchhistory command:', error);
        
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