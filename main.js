const axios = require('axios');
const cheerio = require('cheerio');

const express = require('express');
const app = express();
const port = 3000;

const limitlessBaseUrl = 'https://play.limitlesstcg.com';
// const limitlessTourneyEndpoint = 'tournament';
// const limitlessMetagameEndpoint = 'metagame';
const getLimitlessMetagameEndpoint = (tourneyId) => `https://play.limitlesstcg.com/tournament/${tourneyId}/metagame`;
const getLimitlessPokemonMetagameEndpoint = (tourneyId, pokemonId) => `${getLimitlessMetagameEndpoint(tourneyId)}/${pokemonId}`; 

const pokemonTestObj = {
    usageTotal: '18',
    id: 'glimmora',
    name: 'Glimmora',
    usagePercent: '81.82%',
    winPercent: '53.40%'
};

const testTourneyId = "6850825127d8bc24cf2556aa";
const sortObject = (obj) => {
    const clone = structuredClone(obj);
    return Object.fromEntries(Object.entries(clone).sort((a,b) => b[1] - a[1]));
}

const convertTotalsToPercent = (obj, total) => {
    const clone = structuredClone(obj);
    Object.keys(clone).forEach((key, index) => {
        clone[key] = ((clone[key] / total)*100).toFixed(2) + '%';
    });
    return clone;
}

const getTournamentStats = async (tourneyId) => {
    const pokemonStats = {};
    try {
        const { data } = await axios.get(getLimitlessMetagameEndpoint(tourneyId));

        // Parse HTML with Cheerio
		var $ = cheerio.load(data);

        $('tbody > tr').each((_idx, el) => {
            $ = cheerio.load(el);

            const pokemonObj = {};
            var pokemonKey = "";
            $('td').each((_idx, el) => {
                
                // Total player usage
                if (_idx == 1) {
                    pokemonObj['usageTotal'] = $(el).text();
                } 
                // Name/link
                else if (_idx == 2) {
                    const anchor = $(el.children[0]);
                    const href = anchor[0].attribs['href'];
                    pokemonObj['id'] = href.split("/").pop();
                    pokemonKey = $(anchor[0].children[0]).text();
                    pokemonObj['name'] = pokemonKey;
                } 
                
                // Usage %
                else if (_idx == 3){
                    pokemonObj['usagePercent'] = $(el).text();
                }

                // Win %
                else if (_idx == 5){
                    pokemonObj['winPercent'] = $(el).text();
                }
            });
            if (pokemonKey) {
                pokemonStats[pokemonKey] = pokemonObj;
            }

		});
        return pokemonStats;
    } catch (err) {
        throw err;
    }
}
const getPlayerTeamlists = async (tourneyId, pokemonId) => {
	try {
        const url = getLimitlessPokemonMetagameEndpoint(tourneyId, pokemonId);
		const { data } = await axios.get(getLimitlessPokemonMetagameEndpoint(tourneyId, pokemonId));

		// Parse HTML with Cheerio
		const $ = cheerio.load(data);

		var playerURLs = [];
        var pokemonName = "";

        $('div.name').each((_idx, el) => {
            pokemonName = $(el).text();
        });

		$('tbody > tr > td > a').each((_idx, el) => {
			const playerURL = el.attribs['href'];
			playerURLs.push(playerURL)
		});
        playerURLs = playerURLs.filter(url => url.includes('teamlist'));

		return {
            pokemonName: pokemonName,
            teamLists: playerURLs
        };
	} catch (error) {
		throw error;
	}
};

const getPokemonStats = async (tourneyId, pokemonId) => {
    var movesMap = {};
    var itemMap = {};
    var teraMap = {};
    var abilityMap = {}

    const stats = {};

    const response = await getPlayerTeamlists(tourneyId, pokemonId);
    const pokemonName = response.pokemonName, teamLists = response.teamLists;

    const total = teamLists.length;

    try {
        for (const teamList of teamLists) {
            const { data } = await axios.get(limitlessBaseUrl + teamList)

            // Parse HTML with Cheerio
		    var $ = cheerio.load(data);

            $('div.teamlist-pokemon > div > div.name > span').each((_idx, el) => {
                var pokemon = $(el);
                if (pokemon.text() == pokemonName) {
                    $ = cheerio.load(pokemon[0].parent.parent);

                    // get item
                    $('div.item').each((_idx, el) => {
                        const item = $(el).text();
                        itemMap[item] = (itemMap[item] || 0) + 1;
                    });

                    // get moves
                    $('li').each((_idx, el) => {
                        const move = $(el).text();
                        movesMap[move] = (movesMap[move] || 0) + 1;
                    });

                    // get Tera
                    $('div.tera').each((_idx, el) => {
                        const tera = $(el).text();
                        teraMap[tera] = (teraMap[tera] || 0) + 1;
                    });

                    //get ability
                    $('div.ability').each((_idx, el) => {
                        const ability = $(el).text();
                        abilityMap[ability] = (abilityMap[ability] || 0) + 1;
                    });
                }

            })
        }
        itemMap = sortObject(itemMap);
        movesMap = sortObject(movesMap);
        teraMap = sortObject(teraMap);
        ability = sortObject(abilityMap);

        stats['itemTotals'] = itemMap;
        stats['itemPercents'] = convertTotalsToPercent(itemMap, total);

        stats['moveTotals'] = movesMap;
        stats['movePercents'] = convertTotalsToPercent(movesMap, total);

        stats['teraTotal'] = teraMap;
        stats['teraPercents'] = convertTotalsToPercent(teraMap, total);

        stats['abilityTotals'] = abilityMap;
        stats['abilityPercents'] = convertTotalsToPercent(abilityMap, total); 

        return {
            pokemonName: pokemonName,
            stats: stats
        }

    } catch (error) {
        throw error;
    }

}

app.get('/api/v1/tournaments/:tourneyId/', async (req, res) => {
    const tourneyId = req.params.tourneyId;

    const tourneyStats = await getTournamentStats(tourneyId);
    res.send(tourneyStats);
});

app.get('/api/v1/tournaments/:tourneyId/:pokemonId', async (req, res) => {
    const tourneyId = req.params.tourneyId;
    const pokemonId = req.params.pokemonId;

    const pokemonStats = await getPokemonStats(tourneyId, pokemonId)
    res.send(pokemonStats);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})



//getTournamentStats(testTourneyId).then(response => console.log(response));
//getPokemonStats(testTourneyId, pokemonTestObj.id).then(response => console.log(response));