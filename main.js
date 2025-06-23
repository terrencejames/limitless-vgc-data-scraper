const axios = require('axios');
const cheerio = require('cheerio');

const getPlayerTeamlists = async () => {
	try {
		const { data } = await axios.get(
			'https://play.limitlesstcg.com/tournament/6850825127d8bc24cf2556aa/metagame/armarouge'
		);

		// Parse HTML with Cheerio
		const $ = cheerio.load(data);

		var playerURLs = [];

		$('tbody > tr > td > a').each((_idx, el) => {
            const el1 = $(el);
			const playerURL = el.attribs['href'];
			playerURLs.push(playerURL)
		});

        playerURLs = playerURLs.filter(url => url.includes('teamlist'));
		return playerURLs;
	} catch (error) {
		throw error;
	}
};

const getItemsAndMoves = async (teamLists, pokemonName = "Armarouge") => {
    const limitlessBaseUrl = 'https://play.limitlesstcg.com';
    var movesMap = {};
    var itemMap = {};
    var teraMap = {};
    var abilityMap = {}
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
        console.log(pokemonName);
        console.log(itemMap);
        console.log(movesMap);
        console.log(teraMap);
        console.log(abilityMap);

    } catch (error) {
        throw error;
    }

}

getPlayerTeamlists()
    .then(playerURLs => getItemsAndMoves(playerURLs));