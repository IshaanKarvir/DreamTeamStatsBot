const axios = require('axios');

class RiotAPI {
    constructor(apiKey, region = 'na1') {
        this.apiKey = apiKey;
        this.region = region;
        this.baseURL = `https://${region}.api.riotgames.com`;
    }

    // Get summoner by name
    async getSummonerByName(summonerName) {
        try {
            const response = await axios.get(`${this.baseURL}/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`, {
                headers: {
                    'X-Riot-Token': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new Error('Summoner not found');
                } else if (error.response.status === 403) {
                    throw new Error('Invalid API key');
                } else if (error.response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
            }
            throw new Error('Failed to fetch summoner data');
        }
    }

    // Get summoner by PUUID
    async getSummonerByPuuid(puuid) {
        try {
            const response = await axios.get(`${this.baseURL}/lol/summoner/v4/summoners/by-puuid/${puuid}`, {
                headers: {
                    'X-Riot-Token': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new Error('Summoner not found');
                } else if (error.response.status === 403) {
                    throw new Error('Invalid API key');
                } else if (error.response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
            }
            throw new Error('Failed to fetch summoner data');
        }
    }

    // Get account by Riot ID (using account-v1 API)
    async getAccountByRiotId(gameName, tagLine) {
        try {
            // Note: This uses a different base URL for account-v1 API
            const accountBaseURL = 'https://americas.api.riotgames.com';
            const response = await axios.get(`${accountBaseURL}/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`, {
                headers: {
                    'X-Riot-Token': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new Error('Account not found');
                } else if (error.response.status === 403) {
                    throw new Error('Invalid API key');
                } else if (error.response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
            }
            throw new Error('Failed to fetch account data');
        }
    }

    // Get summoner by name using account-v1 + summoner-v4
    async getSummonerByName(summonerName) {
        try {
            // First, try to get account info using account-v1 API
            const account = await this.getAccountByRiotId(summonerName, 'NA1'); // Assuming NA region
            const puuid = account.puuid;
            
            // Then get summoner info using the PUUID
            return await this.getSummonerByPuuid(puuid);
        } catch (error) {
            throw new Error(`Failed to get summoner by name: ${error.message}`);
        }
    }

    // Get ranked information for a summoner
    async getRankedInfo(summonerId) {
        try {
            const response = await axios.get(`${this.baseURL}/lol/league/v4/entries/by-summoner/${summonerId}`, {
                headers: {
                    'X-Riot-Token': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    return []; // No ranked data found
                } else if (error.response.status === 403) {
                    throw new Error('Invalid API key');
                } else if (error.response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
            }
            throw new Error('Failed to fetch ranked data');
        }
    }

    // Get champion mastery for a summoner
    async getChampionMastery(puuid) {
        try {
            const response = await axios.get(`${this.baseURL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`, {
                headers: {
                    'X-Riot-Token': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    return []; // No mastery data found
                } else if (error.response.status === 403) {
                    throw new Error('Invalid API key');
                } else if (error.response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
            }
            throw new Error('Failed to fetch champion mastery data');
        }
    }

    // Get recent matches for a summoner
    async getRecentMatches(puuid, count = 5) {
        try {
            // First get match IDs
            const matchBaseURL = 'https://americas.api.riotgames.com';
            const response = await axios.get(`${matchBaseURL}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`, {
                headers: {
                    'X-Riot-Token': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    return []; // No matches found
                } else if (error.response.status === 403) {
                    throw new Error('Invalid API key');
                } else if (error.response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
            }
            throw new Error('Failed to fetch match data');
        }
    }

    // Get matches since a specific date with pagination
    async getMatchesSinceDate(puuid, startTime) {
        try {
            const matchBaseURL = 'https://americas.api.riotgames.com';
            let allMatches = [];
            let startIndex = 0;
            const count = 100; // Maximum allowed per request
            
            while (true) {
                const response = await axios.get(`${matchBaseURL}/lol/match/v5/matches/by-puuid/${puuid}/ids?startTime=${startTime}&start=${startIndex}&count=${count}`, {
                    headers: {
                        'X-Riot-Token': this.apiKey
                    }
                });
                
                const matches = response.data;
                allMatches = allMatches.concat(matches);
                
                // If we got less than the maximum count, we've reached the end
                if (matches.length < count) {
                    break;
                }
                
                startIndex += count;
                
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return allMatches;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    return []; // No matches found
                } else if (error.response.status === 403) {
                    throw new Error('Invalid API key');
                } else if (error.response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
            }
            throw new Error('Failed to fetch match data');
        }
    }

    // Get detailed match information
    async getMatch(matchId) {
        try {
            const matchBaseURL = 'https://americas.api.riotgames.com';
            const response = await axios.get(`${matchBaseURL}/lol/match/v5/matches/${matchId}`, {
                headers: {
                    'X-Riot-Token': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new Error('Match not found');
                } else if (error.response.status === 403) {
                    throw new Error('Invalid API key');
                } else if (error.response.status === 429) {
                    throw new Error('Rate limit exceeded');
                }
            }
            throw new Error('Failed to fetch match data');
        }
    }

}

module.exports = RiotAPI; 