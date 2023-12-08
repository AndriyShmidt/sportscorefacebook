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


//Create server
const app = express();
const port = 3000; 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static('uploads'));

app.post('/upload', upload.single('image'), (req, res) => {
  const filePath = `/uploads/${req.file.filename}`;
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
  } catch (error) {
    console.error(error);
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

//Clear uploads folder

async function clearUploadsFolder() {
  const directory = 'uploads/';

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

  const instagramMessage = `🎌Match Started!🎌 \n\n💥⚽️💥 ${homeTeamName} vs ${awayTeamName} League: ${competitionName} 💥⚽️💥 \n\nWatch Now on SportScore: ${item.url} \n\n #${homeTeamName.replace(/[^a-zA-Z]/g, "")} #${awayTeamName.replace(/[^a-zA-Z]/g, "")} #${competitionName.replace(/[^a-zA-Z]/g, "")} ${venueName ? '#' + venueName.replace(/[^a-zA-Z]/g, "") : ''}`; 
  let instagramResponse;

  try {
    instagramResponse = await fetch(`https://graph.facebook.com/v15.0/17841462745627692/media?image_url=http://45.61.138.203${myConvertedImagePath}&caption=${encodeURIComponent(instagramMessage)}&access_token=${userToken}`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error:', error);
  }

  const instagramDate = await instagramResponse.json();

  console.log(instagramDate)
  console.log(Number(instagramDate.id))

  await fetch(`https://graph.facebook.com/v15.0/17841462745627692/media_publish?creation_id=${Number(instagramDate.id)}&access_token=${userToken}`, {
    method: 'POST',
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch((error) => console.error('Error:', error));

  console.log(instagramDate)
  console.log(Number(instagramDate.id))
  console.log('end instagram post');
}

//Start post facebook and instagram
async function processItem(item, match) {
  if (Number(item.state_display) && Number(item.state_display) < 2) {
      await postOnFacebook(item, match);
      await postOnInstagram(item, match);
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

// start every 1 minute
setInterval(fetchData, 60000);

fetchData();