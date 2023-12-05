import fetch from 'node-fetch';
import fs from 'fs';
import axios from 'axios';
import sharp from 'sharp';

const tokenPath = './token.txt';
const userToken = fs.readFileSync(tokenPath, 'utf8');

const API_BASE = 'https://graph.facebook.com/v15.0';
let countOfPosts = 0;

// Post on Facebook 
async function postOnFacebook(item, match) {
  console.log('start facebook post');
  let pageResp;

  try {
    pageResp = await fetch(`${API_BASE}/me/accounts?access_token=${userToken}`);
  } catch (error) {
    console.error("Виникла помилка у запиті:", error);
  }
  const pages = await pageResp.json();

  const page = pages.data[0];
  const pageToken = page.access_token;
  const pageId = page.id;

  const homeTeamName = item.home_team?.name || '';
  const awayTeamName = item.away_team?.name || '';
  const competitionName = match.competition?.name || '';
  const venueName = item.venue?.name || '';

  const fbPostObj = {
    message: `🎌Match Started!🎌 \n\n💥⚽️💥 ${homeTeamName} vs ${awayTeamName} League: ${competitionName} 💥⚽️💥 \n\nWatch Now on SportScore: ${item.url} \n\n #${homeTeamName.replace(/[^a-zA-Z]/g, "")} #${awayTeamName.replace(/[^a-zA-Z]/g, "")} #${competitionName.replace(/[^a-zA-Z]/g, "")} ${venueName ? '#' + venueName.replace(/[^a-zA-Z]/g, "") : ''}`,
    link: item.url,
  };

  const postResp = await fetch(`${API_BASE}/${pageId}/feed?access_token=${pageToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fbPostObj)
  });

  const post = await postResp.json();
  console.log('end facebook post');
}

//Convert Image
async function convertAndSendImage(item, match) {
  try {
      // get in WEBP
      const response = await axios.get(item.social_picture, { responseType: 'arraybuffer' });
      const webpData = response.data;

      // convert to JPEG
      const jpegData = await sharp(webpData)
          .toFormat('jpeg')
          .toBuffer();

      // send image to API
      await postOnInstagram(item, match, jpegData);

      console.log(jpegData);
  } catch (error) {
      console.error(error);
  }
}

//Post on Instagram
async function postOnInstagram(item, match, convertImg) {
  console.log('start instagram post');
  const homeTeamName = item.home_team?.name || '';
  const awayTeamName = item.away_team?.name || '';
  const competitionName = match.competition?.name || '';
  const venueName = item.venue?.name || '';

  const instagramMessage = `🎌Match Started!🎌 \n\n💥⚽️💥 ${homeTeamName} vs ${awayTeamName} League: ${competitionName} 💥⚽️💥 \n\nWatch Now on SportScore: ${item.url} \n\n #${homeTeamName.replace(/[^a-zA-Z]/g, "")} #${awayTeamName.replace(/[^a-zA-Z]/g, "")} #${competitionName.replace(/[^a-zA-Z]/g, "")} ${venueName ? '#' + venueName.replace(/[^a-zA-Z]/g, "") : ''}`; 
  let instagramResponse;

  try {
    instagramResponse = await fetch(`https://graph.facebook.com/v18.0/17841462745627692/media?image_url=${convertImg}&caption=${encodeURIComponent(instagramMessage)}&access_token=${userToken}`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error:', error);
  }

  const instagramDate = await instagramResponse.json();

  console.log(instagramDate)

  await fetch(`https://graph.facebook.com/v18.0/17841462745627692/media_publish?creation_id=${Number(instagramDate.id)}&access_token=${userToken}`, {
    method: 'POST',
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch((error) => console.error('Error:', error));

  console.log('end instagram post');
}

async function processItem(item, match) {
  if (Number(item.state_display) && Number(item.state_display) < 2) {
      await postOnFacebook(item, match);
      if (countOfPosts < 50) {
          await convertAndSendImage(item, match);
          countOfPosts++;
      }
  }
}

// ===== MAKE POST ON PAGE =====
async function getMatch(matches) {
  for (const match of matches) {
      for (const item of match.matches) {
          await processItem(item, match);
      }
  }
}

// get data from Sport Score
function fetchData() {
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

function resetCount() {
  countOfPosts = 0;
}

// start every 2 minute
setInterval(fetchData, 60000);
setInterval(resetCount, 86400000)

fetchData();
