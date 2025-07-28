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
    } else if (interaction.commandName === 'dreamteamstats') {
        await handleTeamStatsCommand(interaction);
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

async function handleTeamStatsCommand(interaction) {
    if (!process.env.RIOT_API_KEY) {
        await interaction.reply('Riot API key not configured. Please contact the bot administrator.');
        return;
    }

    try {
        await interaction.deferReply();
        
        const riotAPI = new RiotAPI(process.env.RIOT_API_KEY);
        
        // Hardcoded list of players (assuming tag "1")
        const players = ['LigandsNeverDie', 'BBthe3xOGer3', 'ypg296', 'Sellout Tommy', 'PHire317'];
        const tagLine = 'NA1';
        
        // July 22nd, 2024 timestamp (in milliseconds)
        const july22Timestamp = Math.floor(new Date('2024-07-22T00:00:00Z').getTime() / 1000);
        
        console.log('Starting team stats analysis...');
        console.log('Players:', players);
        console.log('Since timestamp:', july22Timestamp);
        
        // Step 1: Get PUUIDs for all players
        const playerData = [];
        for (const playerName of players) {
            try {
                const account = await riotAPI.getAccountByRiotId(playerName, tagLine);
                playerData.push({
                    name: playerName,
                    puuid: account.puuid,
                    account: account
                });
                console.log(`Found player: ${playerName} - ${account.puuid}`);
            } catch (error) {
                console.log(`Player not found: ${playerName}`);
            }
        }
        
        // Step 2: Get matches since July 22nd for each player
        const allMatchIds = new Set();
        const playerMatches = {};
        
        console.log('\n=== MATCH COUNTS PER PLAYER ===');
        for (const player of playerData) {
            try {
                console.log(`Fetching matches for ${player.name}...`);
                const matches = await riotAPI.getMatchesSinceDate(player.puuid, july22Timestamp);
                playerMatches[player.name] = matches;
                matches.forEach(matchId => allMatchIds.add(matchId));
                console.log(`${player.name}: ${matches.length} matches since July 22nd`);
            } catch (error) {
                console.error(`Error getting matches for ${player.name}:`, error);
                playerMatches[player.name] = [];
                console.log(`${player.name}: 0 matches (error occurred)`);
            }
        }
        
        console.log(`\nTotal unique matches across all players: ${allMatchIds.size}`);
        
        // Step 3: Find matches that appear in at least 2 player lists
        const matchCounts = {};
        allMatchIds.forEach(matchId => {
            let count = 0;
            Object.values(playerMatches).forEach(matchList => {
                if (matchList.includes(matchId)) count++;
            });
            matchCounts[matchId] = count;
        });
        
        const commonMatches = Object.keys(matchCounts).filter(matchId => matchCounts[matchId] >= 2);
        
        console.log('\n=== COMMON MATCH ANALYSIS ===');
        console.log(`Found ${commonMatches.length} matches with at least 2 players`);
        
        // Log distribution of player counts per match
        const playerCountDistribution = {};
        Object.values(matchCounts).forEach(count => {
            playerCountDistribution[count] = (playerCountDistribution[count] || 0) + 1;
        });
        
        console.log('Match distribution by player count:');
        Object.keys(playerCountDistribution).sort((a, b) => parseInt(a) - parseInt(b)).forEach(count => {
            console.log(`  ${count} players: ${playerCountDistribution[count]} matches`);
        });
        
        if (commonMatches.length > 0) {
            console.log('\nFirst 5 common match IDs:');
            commonMatches.slice(0, 5).forEach(matchId => {
                console.log(`  ${matchId} (${matchCounts[matchId]} players)`);
            });
        }
        
        // Step 4: Analyze win rate for common matches
        let teamWins = 0;
        let totalMatches = 0;
        const matchResults = [];
        
        console.log('\n=== MATCH ANALYSIS ===');
        console.log(`Analyzing ${commonMatches.length} common matches for team performance...`);
        
        for (const matchId of commonMatches) {
            try {
                const matchData = await riotAPI.getMatch(matchId);
                const matchPlayers = matchData.info.participants.filter(p => 
                    playerData.some(player => player.puuid === p.puuid)
                );
                
                if (matchPlayers.length >= 2) {
                    const teamWin = matchPlayers.every(p => p.win);
                    matchResults.push({
                        matchId: matchId,
                        win: teamWin,
                        players: matchPlayers.map(p => p.summonerName),
                        gameMode: matchData.info.gameMode
                    });
                    
                    if (teamWin) teamWins++;
                    totalMatches++;
                    
                    console.log(`Match ${matchId}: ${matchPlayers.length} players, ${teamWin ? 'WIN' : 'LOSS'} (${matchData.info.gameMode})`);
                }
            } catch (error) {
                console.error(`Error analyzing match ${matchId}:`, error);
            }
        }
        
        console.log(`\nFinal results: ${teamWins} wins out of ${totalMatches} matches analyzed`);
        
        const winRate = totalMatches > 0 ? ((teamWins / totalMatches) * 100).toFixed(1) : 0;
        
        // Create embed with results
        const embed = {
            color: 0x0000ff, // Blue color
            title: 'Team Statistics (Since July 22nd)',
            fields: [
                {
                    name: 'Players Analyzed',
                    value: playerData.map(p => p.name).join(', '),
                    inline: false
                },
                {
                    name: 'Common Matches',
                    value: `${commonMatches.length} matches with ≥2 players`,
                    inline: true
                },
                {
                    name: 'Team Win Rate',
                    value: `${winRate}% (${teamWins}W/${totalMatches - teamWins}L)`,
                    inline: true
                }
            ],
            timestamp: new Date()
        };
        
        // Add recent match results
        if (matchResults.length > 0) {
            const recentResults = matchResults.slice(-5).map(match => 
                `${match.win ? '✅' : '❌'} ${match.gameMode} - ${match.players.length} players`
            ).join('\n');
            
            embed.fields.push({
                name: 'Recent Team Matches',
                value: recentResults,
                inline: false
            });
        }
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in teamstats command:', error);
        await interaction.editReply('An error occurred while analyzing team statistics.');
    }
}

client.login(process.env.DISCORD_TOKEN);