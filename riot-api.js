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


}

module.exports = RiotAPI; 