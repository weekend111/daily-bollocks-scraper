// ============================================
// DAILY BOLLOCKS SCRAPER - RENDER READY
// ============================================

require('dotenv').config();
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// CHANNEL CONFIGURATION
// ============================================
const CHANNELS = {
  newMedia: [
    { id: 'UC0vn8ISa4LKMunLbzaXLnOQ', name: 'GB News', bias: 'right' },
    { id: 'UCY8xv3_NT4zAwq2-xExyJYw', name: 'Mahyar Tousi TV', bias: 'right' },
    { id: 'UCmn84Mr7M5PC_8kH5-C0FeQ', name: 'Talk TV', bias: 'right' },
    { id: 'UCGy6uV7yqGWDeUWTZzT3ZEg', name: 'Rebel News', bias: 'right' },
    { id: 'UCGSGPehp0RWfca-kENgBJ9Q', name: 'Turning Point UK', bias: 'right' }
  ],
  auditors: [
  { id: 'UCH4IHPEhj3u9AY41L1XDzEQ', name: 'AY Audits', bias: 'center' },
    { id: 'UCnV9btCxBukTundI7-JJeMA', name: 'Knockout Audit', bias: 'center' },
    { id: 'UCDwFuH2iQhxGEcWN78C2vTw', name: 'BB Audit', bias: 'center' },
    { id: 'UCAT1hrz2Uu3fneWaRuk2d0A', name: 'Laudits', bias: 'center' },
    { id: 'UCVtsg1b7bNsWaDPauIWYShg', name: 'Cozzy', bias: 'center' },
    { id: 'UCDGZXSC6ktsKk5yiAGlsJIQ', name: 'Baraka', bias: 'center' },
    { id: 'UCnRnLjggWqNbROyuwlgvt1g', name: 'Laine Audits', bias: 'center' },
    { id: 'UC0znI3dRWpNF8lvbPBTlzyw', name: 'Charlie Veitch', bias: 'center' },
    { id: 'UCLDQOK25QpaXMDuBiDGBrnA', name: 'The Lesbian Cartel', bias: 'center' },
    { id: 'UCPCTvUrihN3AUsuPnMtxxHw', name: 'Yorkshire Rose', bias: 'center' },
    { id: 'UCfWrLC5krwM6yhNaJLHklYg', name: 'Mystic Media', bias: 'center' },
    { id: 'UCZtL7N0QfW3Oiqb-A0y4TgA', name: 'DJE Media', bias: 'center' },
    { id: 'UCjhRn5K-E1bP9yoXHGqhJ_g', name: 'Focus Pocus', bias: 'center' },
    { id: 'UCBnoqPuKp8WB2GVPTq0dcEA', name: 'Auditing Britain', bias: 'center' },
    { id: 'UCS1Q6F0jbvk0gHM8c-u6jEA', name: 'Power To The Proletariat', bias: 'center' },
    { id: 'UCdl8xpTnbcJSsEo1Z5VvHOQ', name: 'Koleeberks', bias: 'center' }
  ],
  
  mainstream: [
    { id: 'UC16niRr50-MSBwiO3YDb3RA', name: 'BBC News', bias: 'woke' },
    { id: 'UCpko_-a4wgz2u_DgDgd9fqA', name: 'Sky News', bias: 'woke' },
    { id: 'UCsYc88bu6GUHN7TdJZFilSQ', name: 'Channel 4 News', bias: 'woke' }
  ],
  
leftSocial: [
    { id: 'UCJm5yQ1KpqCidHJPc6xVZpg', name: 'Novara Media', bias: 'left' },
    { id: 'UCO79NsDE5FpMowUH1YcBFcA', name: 'Jonathan Pie', bias: 'left' },
    { id: 'UCyzkxMLeZDcd_Qhzh6uMgbg', name: 'PoliticsJOE', bias: 'left' },
    { id: 'UCf_HItERkRB3vnkWt2RSOLg', name: 'George Galloway', bias: 'left' },
    { id: 'UCj1_pZ7vmxnhy5clIcMVJtg', name: 'A Different Bias', bias: 'left' },
    { id: 'UC2DHAQOeEg-Z-4trARDXHRA', name: 'The New Statesman', bias: 'left' }
  ]
};

// ============================================
// YOUTUBE SCRAPER FUNCTIONS
// ============================================
async function fetchLatestVideos(channelId, maxResults = 3) {
  try {
    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          channelId: channelId,
          part: 'snippet',
          order: 'date',
          maxResults: maxResults,
          type: 'video'
        }
      }
    );

    return response.data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle
    }));
  } catch (error) {
    console.error(`Error fetching videos for ${channelId}:`, error.message);
    return [];
  }
}

async function getVideoStats(videoId) {
  try {
    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          id: videoId,
          part: 'statistics'
        }
      }
    );

    const stats = response.data.items[0]?.statistics;
    return {
      views: stats?.viewCount || '0',
      likes: stats?.likeCount || '0',
      comments: stats?.commentCount || '0'
    };
  } catch (error) {
    console.error(`Error fetching stats:`, error.message);
    return { views: '0', likes: '0', comments: '0' };
  }
}

// ============================================
// AI SATIRE GENERATOR
// ============================================
async function generateSatire(originalTitle, description, channelName, bias) {
  const prompt = `You are a British satirical news writer for "The Daily Bollocks".

Take this REAL news headline: "${originalTitle}"
Source: ${channelName}

Create satirical version with:
1. Funny satirical headline (British humor, punchy)
2. 2-sentence excerpt
3. 3-paragraph satirical story

Return ONLY valid JSON:
{
  "headline": "satirical headline",
  "excerpt": "2 sentences",
  "fullStory": "3 paragraphs"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 600
    });

    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON in response');
  } catch (error) {
    console.error('AI error:', error.message);
    return {
      headline: `${channelName} Says Predictable Thing About ${originalTitle.slice(0, 30)}...`,
      excerpt: "In shocking news, exactly what you'd expect happened.",
      fullStory: "The incident occurred as predicted. More at 11."
    };
  }
}

// ============================================
// MAIN SCRAPER
// ============================================
async function scrapeAllChannels() {
  console.log('🚀 Scraping started:', new Date().toISOString());
  
  const allArticles = {
    newMedia: [],
    auditors: [],
    mainstream: [],
    leftSocial: []
  };

  for (const [category, channels] of Object.entries(CHANNELS)) {
    console.log(`\n📺 Scraping ${category}...`);
    
    for (const channel of channels) {
      if (channel.id === 'CHANNEL_ID') continue;
      
      console.log(`  - ${channel.name}`);
      
      const videos = await fetchLatestVideos(channel.id, 2);
      
      for (const video of videos) {
        const stats = await getVideoStats(video.videoId);
        const satire = await generateSatire(
          video.title,
          video.description,
          channel.name,
          channel.bias
        );
        
        const article = {
          id: `${channel.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`,
          headline: satire.headline,
          sources: [channel.name],
          excerpt: satire.excerpt,
          fullStory: satire.fullStory,
          views: formatViews(stats.views),
          trending: parseInt(stats.views) > 50000,
          spicy: Math.random() > 0.7,
          bias: channel.bias,
          breaking: Math.random() > 0.8,
          scrapedAt: new Date().toISOString()
        };
        
        allArticles[category].push(article);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n✅ Scraping complete!');
  console.log(`   New Media: ${allArticles.newMedia.length}`);
  console.log(`   Auditors: ${allArticles.auditors.length}`);
  console.log(`   Mainstream: ${allArticles.mainstream.length}`);
  console.log(`   Left Social: ${allArticles.leftSocial.length}`);
  
  return allArticles;
}

function formatViews(views) {
  const num = parseInt(views);
  if (num > 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num > 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function saveArticles(articles) {
  fs.writeFileSync('latest.json', JSON.stringify(articles, null, 2));
  console.log('💾 Saved latest.json');
}

// ============================================
// EXPRESS API SERVER
// ============================================
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'Daily Bollocks Scraper API',
    endpoints: {
      articles: '/api/articles',
      scrape: '/api/scrape (POST)',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/articles', (req, res) => {
  try {
    if (fs.existsSync('latest.json')) {
      const articles = JSON.parse(fs.readFileSync('latest.json', 'utf8'));
      res.json(articles);
    } else {
      res.json({ 
        message: 'No articles yet. Trigger /api/scrape to generate.',
        newMedia: [],
        auditors: [],
        mainstream: [],
        leftSocial: []
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scrape', async (req, res) => {
  res.json({ message: 'Scraping started...' });
  try {
    const articles = await scrapeAllChannels();
    saveArticles(articles);
  } catch (error) {
    console.error('Scrape error:', error);
  }
});

// ============================================
// SCHEDULER
// ============================================
function startScheduler() {
  console.log('⏰ Scheduler started');
  console.log('   Morning scrape: 6:00 AM GMT');
  console.log('   Evening scrape: 6:00 PM GMT');
  
  cron.schedule('0 6 * * *', async () => {
    console.log('\n☀️ MORNING SCRAPE');
    const articles = await scrapeAllChannels();
    saveArticles(articles);
  }, {
    timezone: "Europe/London"
  });
  
  cron.schedule('0 18 * * *', async () => {
    console.log('\n🌙 EVENING SCRAPE');
    const articles = await scrapeAllChannels();
    saveArticles(articles);
  }, {
    timezone: "Europe/London"
  });
}

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3001;

async function start() {
  console.log('═══════════════════════════════════════');
  console.log('   THE DAILY BOLLOCKS SCRAPER v1.0');
  console.log('═══════════════════════════════════════\n');
  
  console.log('🎬 Running initial scrape...');
  try {
    const articles = await scrapeAllChannels();
    saveArticles(articles);
  } catch (error) {
    console.error('Initial scrape failed:', error.message);
  }
  
  startScheduler();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 Server running on port ${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/articles`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
}

start().catch(console.error);
