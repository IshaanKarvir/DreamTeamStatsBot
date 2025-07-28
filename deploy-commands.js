require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'summoner',
        description: 'Get summoner information from League of Legends',
        options: [
            {
                name: 'gamename',
                description: 'The game name (e.g., Faker)',
                type: 3, // STRING type
                required: true
            },
            {
                name: 'tagline',
                description: 'The tag line (e.g., NA1)',
                type: 3, // STRING type
                required: true
            }
        ]
    },
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();