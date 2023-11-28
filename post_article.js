const userToken = 'EAAMBBQZCz47kBO0gLV5ie20e3ly8BiHMqOj4gL5lo7jeaVaw0wZAOK4PqPBjJXzhQ55cS01BKXY0ZC9CJNI6Ci4c8hTOPJvulfgf5uNJRPApJ4effbZCzLSPXGZAfi5rbBSBtzbvOivZBNMZAU2fBGsZBY90Y9Llj0S3wJ4tBRhmOS3BMv7ZC7qt61CCOEZCklaKbZBqxR9tYZA7ADvbIw8OOexVWpashIkqFBX4HAfFl8DzByhA9fKjZARPhfBMg6auO';
const API_BASE = 'https://graph.facebook.com/v15.0';

  // ===== MAKE POST ON PAGE =====
async function getMatch(matches) {

  // ===== GET USER'S PAGES =====
  const pageResp = await fetch(`${API_BASE}/me/accounts?access_token=${userToken}`);

  const pages = await pageResp.json();

  // Assuming user has one page...
  const page = pages.data[0];
  const pageToken = page.access_token;
  const pageId = page.id;

  for (const match of matches) {
    for (const item of match.matches) {
      if (Number(item.state_display) && Number(item.state_display) < 15) {
        
        const fbPostObj = {
          message: `🎌Match Started!🎌 \n\n💥⚽️💥 ${item.home_team.name} vs ${item.away_team.name} League: ${match.competition.name} 💥⚽️💥 \n\nWatch Now on SportScore: ${item.url} \n\n #${item.home_team.name.replace(/[^a-zA-Z]/g, "")} #${item.away_team.name.replace(/[^a-zA-Z]/g, "")}, #${match.competition.name.replace(/[^a-zA-Z]/g, "")} ${item.venue.name ? '#' + item.venue.name.replace(/[^a-zA-Z]/g, "") : ''}`,
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
}

// get data from Sport Score
function fetchData() {
    fetch('https://sportscore.io/api/v1/football/matches/?match_status=all&sort_by_time=false&page=0', {
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

// start every 15 minute
setInterval(fetchData, 900000);

fetchData();
