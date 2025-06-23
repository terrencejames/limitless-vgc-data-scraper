const axios = require('axios');
const cheerio = require('cheerio');

const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const limitlessBaseUrl = 'https://play.limitlesstcg.com';
// const limitlessTourneyEndpoint = 'tournament';
// const limitlessMetagameEndpoint = 'metagame';
const getLimitlessMetagameEndpoint = (tourneyId) => `https://play.limitlesstcg.com/tournament/${tourneyId}/metagame`

const pokemonTestObj = {
    usageTotal: '18',
    href: '/tournament/6850825127d8bc24cf2556aa/metagame/glimmora',
    name: 'Glimmora',
    usagePercent: '81.82%',
    winPercent: '53.40%'
};
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

const getTournamentStats = async (tourneyId = '6850825127d8bc24cf2556aa') => {
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
                    pokemonObj['href'] = anchor[0].attribs['href'];
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
const getPlayerTeamlists = async (pokemonObj) => {
	try {
		const { data } = await axios.get(limitlessBaseUrl + pokemonObj.href);

		// Parse HTML with Cheerio
		const $ = cheerio.load(data);

		var playerURLs = [];

		$('tbody > tr > td > a').each((_idx, el) => {
			const playerURL = el.attribs['href'];
			playerURLs.push(playerURL)
		});

        playerURLs = playerURLs.filter(url => url.includes('teamlist'));
		return playerURLs;
	} catch (error) {
		throw error;
	}
};

const getItemsAndMoves = async (pokemonObj) => {
    var movesMap = {};
    var itemMap = {};
    var teraMap = {};
    var abilityMap = {}

    const stats = {};

    const teamLists = await getPlayerTeamlists(pokemonObj);
    const total = teamLists.length;

    const pokemonName = pokemonObj.name;
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

        console.log(pokemonName);
        console.log(stats);

    } catch (error) {
        throw error;
    }

}

//getTournamentStats();
getItemsAndMoves(pokemonTestObj);