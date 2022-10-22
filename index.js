const axios = require('axios');
const standings_url = "https://fantasy.premierleague.com/api/leagues-classic/314/standings/?page_new_entries=1&page_standings=1&phase=1";
const master_list_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
const week = 12;

const fs = require('fs');

const get_top_teams = async () => {
  const top_teams = await get_data(standings_url)
  const { data: { standings: { results } } } = top_teams;
  return results;
}

const get_master_player_list = async () => {
    const master_list = await get_data(master_list_url)
    const { data : { elements: all_players } } = master_list;
    return all_players.reduce((agg, item) => {
      const { id, first_name, second_name, code, team_code, element_type } = item;
      agg[id] = { first_name, second_name };
      return agg;
    }, {})
}



const get_data = async (url) => {
  return await axios.get(url);
}

const getLastWeeksDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
}

(async () => {
    
  try {

    // get top scoring teams
    const top_teams = await get_top_teams();
    
    // get the master list of all the players
    const master_list = await get_master_player_list();



    
    // console.log({ all_player_slim })


    let selected_players = {};

    let file_metadata
    try {
      file_metadata = await fs.promises.stat('./data.json')
    } catch(e) {
      console.log("Error while getting file stats. Can be ignored")
    }

    const { birthtime } = file_metadata || {}

    if(birthtime && birthtime < getLastWeeksDate()) {
      for(let i = 0; i < top_teams.length; i++) {
        const team = top_teams[i]

        const { entry } = team;
        const players_picks = `https://fantasy.premierleague.com/api/entry/${entry}/event/${week}/picks/`

        const { data: { picks  } } = await get_data(players_picks)

        // wait a random interval as to not spam the api
        await new Promise((resolve) => setTimeout(() => { resolve() }, (Math.random() * 2000 + 1000)))  
        picks.forEach(pick => {
          const { element } = pick;
          if(selected_players[element]) {
            selected_players[element] = selected_players[element] + 1
          } else {
            selected_players[element] = 1;
          }
        });
      }

      const data = JSON.stringify(selected_players);
      await fs.promises.writeFile('data.json', data);

    } else {
      const raw_data = await fs.promises.readFile('data.json');
      selected_players = JSON.parse(raw_data)
    }
    


    let player_list = [];


    const keys_list =  Object.keys(selected_players)
    let sortable = [];
    for(let j = 0; j < keys_list.length; j++) {
        const key = keys_list[j];
        sortable.push([key, selected_players[key]]);
    }

    sortable.sort(function(a, b) {
        return b[1] - a[1];
    });

    sortable.forEach(entity => {
      const [ key, val ] = entity
      master_list[key].num_teams = val;
      player_list.push(master_list[key])
    })




    // console.log({ master_list })
    // console.log({ selected_players })
    console.log({ player_list })

    const data = JSON.stringify(player_list, null, 2);
    await fs.promises.writeFile('top_players.json', data);


    // top_teams.forEach(async team => {

    // })


    // console.log(top_teams);
  } catch(e) {
    console.log("error ", e)
  }

})()
