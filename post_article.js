import fetch from 'node-fetch';
import fs from 'fs';
import express from 'express';
import multer from 'multer';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import FormData from 'form-data';

const tokenPath = './token.txt';
const userToken = fs.readFileSync(tokenPath, 'utf8');
const API_BASE = 'https://graph.facebook.com/v15.0';
let autopostDataFacebook;
let autopostDataInstagram;

async function getCsrfToken() {
  return client.get('https://sportscore.io/api/v1/blog/?page=0', {
    headers: {
        "accept": "application/json",
        'X-API-Key': 'uqzmebqojezbivd2dmpakmj93j7gjm',
    },
    }).then(response => {
        const csrfToken = jar.getCookiesSync('https://sportscore.io').find(cookie => cookie.key === 'csrftoken')?.value;
        console.log('CSRF Token:', csrfToken);
        return csrfToken;
    }).catch(error => {
        console.error('Error:', error);
    });
}

//log error to admin panel
async function postStatus(socialMedia, ErrorMessage) {
  const url = 'https://sportscore.io/api/v1/autopost/status/';
  const csrfToken = await getCsrfToken();
  const data = {
    bot: 1,
    type: 1,
    title: socialMedia,
    details: ErrorMessage
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': 'uqzmebqojezbivd2dmpakmj93j7gjm',
        'X-Csrftoken': csrfToken,
        'Cookie': `csrftoken=${csrfToken}`,
        'Origin': 'https://sportscore.io'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Response:', responseData);
  } catch (error) {
    console.error('Error:', error);
  }
}

//get autopost is on or off
async function fetchAutopost(social) {
  fetch(`https://sportscore.io/api/v1/autopost/settings/${social}/`, {
      method: 'GET',
      headers: {
          "accept": "application/json",
          'X-API-Key': 'uqzmebqojezbivd2dmpakmj93j7gjm',
      },
  })
  .then(response => response.json())
  .then(data => {
      if (social == 'facebook') {
        autopostDataFacebook = data.some(obj => obj.enabled === true);
      } else if (social == 'instagram') {
        autopostDataInstagram = data.some(obj => obj.enabled === true);
      }
      
  })
  .catch(error => {
      console.error('Error:', error);
  });
}


//Create server
const app = express();
const port = 3000; 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/facebook/')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

app.use('/uploads/facebook', express.static('uploads/facebook'));

app.post('/upload', upload.single('image'), (req, res) => {
  const filePath = `/uploads/facebook/${req.file.filename}`;
  res.send({ filePath });
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

//Post on facebook
async function postOnFacebook(item, match) {
  console.log('start facebook post');
  let pageResp;

  try {
    pageResp = await fetch(`${API_BASE}/me/accounts?access_token=${userToken}`);
    if (!pageResp.ok) {
      throw new Error('Failed to retrieve Facebook page details');
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
    console.log(post)
    console.log('end facebook post');
  } catch (error) {
    await postStatus('Facebook', error)
    console.log(error);
  }
}

//Clear uploads folder

async function clearUploadsFolder() {
  const directory = 'uploads/facebook/';

  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), err => {
        if (err) throw err;
      });
    }
  });
}

//Convert image to jpeg
async function convertAndSendImage(imageUrl) {
  try {
      await clearUploadsFolder();
      const response = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'arraybuffer'
      });

      let image = sharp(response.data);
      
      const metadata = await image.metadata();
      
      image = image.resize({
          width: metadata.width,
          height: Math.floor(metadata.width / 1.91),
          fit: 'cover'
      });

      const convertedImage = await image.jpeg().toBuffer();

      const form = new FormData();
      form.append('image', convertedImage, { filename: 'temp-converted-image.jpg' });

      const uploadResponse = await axios.post('http://localhost:3000/upload', form, {
          headers: {
              ...form.getHeaders(),
          },
      });

      return uploadResponse.data;
  } catch (error) {
      console.error('Error in converting or sending the image:', error);
  }
}

//Create instagram post
async function postOnInstagram(item, match) {
  console.log('start instagram post');
  const convertedImageResponse = await convertAndSendImage(item.social_picture);
  const myConvertedImagePath = convertedImageResponse.filePath;

  const homeTeamName = item.home_team?.name || '';
  const awayTeamName = item.away_team?.name || '';
  const competitionName = match.competition?.name || '';
  const venueName = item.venue?.name || '';

  const instagramMessage = `🎌Match Started!🎌 \n\n${homeTeamName} vs ${awayTeamName} \n\n${item.url} \n\n #${homeTeamName.replace(/[^a-zA-Z]/g, "")} #${awayTeamName.replace(/[^a-zA-Z]/g, "")} #${competitionName.replace(/[^a-zA-Z]/g, "")} ${venueName ? '#' + venueName.replace(/[^a-zA-Z]/g, "") : ''}`; 
  let instagramResponse;

  try {
    instagramResponse = await fetch(`https://graph.facebook.com/v15.0/17841462745627692/media?image_url=http://45.61.138.203${myConvertedImagePath}&caption=${encodeURIComponent(instagramMessage)}&access_token=${userToken}`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error:', error);
  }

  const instagramDate = await instagramResponse.json();

  await fetch(`https://graph.facebook.com/v15.0/17841462745627692/media_publish?creation_id=${instagramDate.id}&access_token=${userToken}`, {
    method: 'POST',
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch((error) => console.error('Error:', error));

  console.log('end instagram post');
}

//Start post facebook and instagram
async function processItem(item, match, facebookAutopost, instagramAutopost) {

  await new Promise(resolve => setTimeout(resolve, 20000));

  console.log('facebookAutopost: ', facebookAutopost)

  if (facebookAutopost) {
    if (Number(item.state_display) && Number(item.state_display) < 2) {
      await postOnFacebook(item, match);
    }
  }

  console.log('instagramAutopost: ', instagramAutopost);

  if (instagramAutopost) {
    if (Number(item.state_display) && Number(item.state_display) < 2) {
      await postOnInstagram(item, match);
    }
  }
}

// ===== MAKE POST ON PAGE =====
async function getMatch(matches) {
  await fetchAutopost('facebook');
  await fetchAutopost('instagram');
  
  for (const match of matches) {
      for (const item of match.matches) {
          await processItem(item, match, autopostDataFacebook, autopostDataInstagram);
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

// start every 1 minute
setInterval(fetchData, 60000);

fetchData();