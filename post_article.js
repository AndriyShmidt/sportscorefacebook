import fetch from 'node-fetch';
import fs from 'fs';

//Format image
function resizeImage(imageUrl, aspectRatio = 1.91) {
  return new Promise((resolve, reject) => {
      var img = new Image();
      img.crossOrigin = 'Anonymous'; 
      img.onload = function() {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');

          if (this.width > this.height * aspectRatio) {
              canvas.width = this.height * aspectRatio;
              canvas.height = this.height;
          } else {
              canvas.width = this.width;
              canvas.height = this.width / aspectRatio;
          }

          ctx.drawImage(this, 0, 0, canvas.width, canvas.height);

          var resizedImage = canvas.toDataURL('image/jpeg');
          resolve(resizedImage); // Замість виводу в консоль, повертаємо URL
      };

      img.onerror = function() {
          reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
  });
}

const tokenPath = './token.txt';
const userToken = fs.readFileSync(tokenPath, 'utf8');

const API_BASE = 'https://graph.facebook.com/v15.0';

  // ===== MAKE POST ON PAGE =====
async function getMatch(matches) {
  for (const match of matches) {
    for (const item of match.matches) {
      if (Number(item.state_display) && Number(item.state_display) < 2) {

        // Post on Facebook
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
      }

      // Post on Instagram
      const formatImage = '';
      resizeImage(item.social_picture)
        .then(resizedImageUrl => {
          console.log('Resized image URL:', resizedImageUrl);
          formatImage = resizedImageUrl
        })
        .catch(error => {
          console.error('Error:', error);
        });

      const url = `https://graph.facebook.com/v13.0/17841462745627692/media`;
      // const instagramMessage = `🎌Match Started!🎌 \n\n💥⚽️💥 ${homeTeamName} vs ${awayTeamName} League: ${competitionName} 💥⚽️💥 \n\nWatch Now on SportScore: ${item.url} \n\n #${homeTeamName.replace(/[^a-zA-Z]/g, "")} #${awayTeamName.replace(/[^a-zA-Z]/g, "")} #${competitionName.replace(/[^a-zA-Z]/g, "")} ${venueName ? '#' + venueName.replace(/[^a-zA-Z]/g, "") : ''} \n\n ${item.url}`
      const instagramMessage = 'test'
      const mediaObjectParams = {
        image_url: formatImage,
        caption: instagramMessage,
        access_token: userToken
      };

      fetch(url, {
          method: 'POST',
          body: JSON.stringify(mediaObjectParams),
          headers: { 'Content-Type': 'application/json' }
      })
      .then(response => response.json())
      .then(data => {
          console.log('Media Object created', data);

          const mediaObjectId = data.id;

          const publishUrl = `https://graph.facebook.com/v13.0/17841462745627692/media_publish`;

          const publishParams = {
              creation_id: mediaObjectId,
              access_token: userToken
          };

          return fetch(publishUrl, {
              method: 'POST',
              body: JSON.stringify(publishParams),
              headers: { 'Content-Type': 'application/json' }
          });
      })
      .then(response => response.json())
      .then(data => {
          console.log('Media published', data);
      })
      .catch(error => {
          console.error('Error:', error);
      });
    }
  }
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
setInterval(fetchData, 60000);

fetchData();

