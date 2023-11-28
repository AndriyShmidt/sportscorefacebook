import fetch from 'node-fetch';

const userToken = 'EAAMBBQZCz47kBO0gLV5ie20e3ly8BiHMqOj4gL5lo7jeaVaw0wZAOK4PqPBjJXzhQ55cS01BKXY0ZC9CJNI6Ci4c8hTOPJvulfgf5uNJRPApJ4effbZCzLSPXGZAfi5rbBSBtzbvOivZBNMZAU2fBGsZBY90Y9Llj0S3wJ4tBRhmOS3BMv7ZC7qt61CCOEZCklaKbZBqxR9tYZA7ADvbIw8OOexVWpashIkqFBX4HAfFl8DzByhA9fKjZARPhfBMg6auO';
const API_BASE = 'https://graph.facebook.com/v15.0';

  // ===== MAKE POST ON PAGE =====
async function getMatch(matches) {
  for (const match of matches) {
    for (const item of match.matches) {
      console.log(item.state_display, item.home_team);
      if (Number(item.state_display) && Number(item.state_display) < 2) {

        console.log('After if:', item.state_display, item.home_team.name);
        // ===== GET USER'S PAGES =====
        const pageResp = await fetch(`${API_BASE}/me/accounts?access_token=${userToken}`);
        const pages = await pageResp.json();

        // Assuming user has one page...
        const page = pages.data[0];
        const pageToken = page.access_token;
        const pageId = page.id;

        const homeTeamName = item.home_team?.name || '';
        const awayTeamName = item.away_team?.name || '';
        const competitionName = match.competition?.name || '';
        const venueName = item.venue?.name || '';
        
        const fbPostObj = {
          message: `🎌Match Started!🎌 \n\n💥⚽️💥 ${homeTeamName} vs ${awayTeamName} League: ${competitionName} 💥⚽️💥 \n\nWatch Now on SportScore: ${item.url} \n\n #${homeTeamName.replace(/[^a-zA-Z]/g, "")} #${awayTeamName.replace(/[^a-zA-Z]/g, "")} #${competitionName.replace(/[^a-zA-Z]/g, "")} ${venueName ? '#' + venueName.replace(/[^a-zA-Z]/g, "") : ''}`,
          link: item.social_picture,
        };

        const postResp = await fetch(`${API_BASE}/${pageId}/feed?access_token=${pageToken}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fbPostObj)
        });

        const post = await postResp.json();
      }
    }
  }

  console.log('finish')
}

// get data from Sport Score
function fetchData() {
  console.log('start fetching data');
    fetch('https://sportscore.io/api/v1/football/matches/?match_status=live&sort_by_time=false&page=0', {
        method: 'GET',
        headers: {
            "accept": "application/json",
            'X-API-Key': 'uqzmebqojezbivd2dmpakmj93j7gjm',
        },
    })
    .then(response => response.json())
    .then(data => {
        getMatch(data.match_groups);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// start every 2 minute
setInterval(fetchData, 120000);

fetchData();
