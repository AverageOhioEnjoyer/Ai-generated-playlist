const express = require('express');
const path = require('path');
const process = require('process');

// Uses global fetch if available (Node 18+). If not, user should run with a Node version that has fetch or install node-fetch.
const PORT = process.env.PORT || 3000;
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || '';

const app = express();

app.use(express.json());

// Serve main page
app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AI-generated playlist</title>
  <style>
    :root{--bg:#0f172a;--card:#0b1220;--accent:#06b6d4}
    html,body{height:100%;margin:0;font-family:system-ui,Segoe UI,Roboto,'Helvetica Neue',Arial}
    body{background:linear-gradient(180deg,var(--bg),#071025);display:flex;align-items:center;justify-content:center;color:#fff}
    .panel{background:linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01));padding:28px;border-radius:12px;backdrop-filter: blur(6px);box-shadow:0 8px 30px rgba(2,6,23,0.6);display:flex;gap:12px;align-items:center}
    input[type=text]{padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:inherit;min-width:260px}
    select{padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:inherit}
    button#generate{padding:12px 20px;border-radius:10px;border:0;background:var(--accent);color:#022;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:10px}
    .center-wrap{display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:16px}
    .emoji-deco{position:fixed;pointer-events:none;font-size:28px;opacity:0.95;transform:translate(-50%,-50%)}
    .spinning{animation:spin 700ms linear}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="center-wrap">
    <div class="panel" aria-hidden="false">
      <input id="prompt" type="text" value="enter mood/theme here." aria-label="prompt" />
      <select id="count" aria-label="count"></select>
      <button id="generate">🔮 Generate</button>
    </div>
    <small style="opacity:0.6">Powered by SoundCloud (you must provide SOUNDCLOUD_CLIENT_ID as an env var for real results)</small>
  </div>

  <script>
    // populate dropdown 1..20 default 5
    const select = document.getElementById('count');
    for(let i=1;i<=20;i++){const o=document.createElement('option');o.value=i;o.textContent=i; if(i===5) o.selected=true; select.appendChild(o)}

    function themeFromText(text){
      // simple hash to generate hue
      let h=0; for(let i=0;i<text.length;i++) h=(h*31 + text.charCodeAt(i))|0;
      h = Math.abs(h) % 360;
      const hue = h;
      const bg = `linear-gradient(135deg,hsl(${hue} 80% 6%), hsl(${(hue+40)%360} 70% 12%))`;
      const accent = `hsl(${(hue+200)%360} 85% 60%)`;
      return {bg,accent,hue};
    }

    function randomEmojiForText(text){
      // very naive mapping
      const emojiPool = ['🎧','🎶','💤','🔥','🌊','🌸','🌙','☀️','⚡️','🎉','😌','😊','😎','🤘','💖','🖤','🌴','🏖️','🏔️','🚀'];
      let idx = 0; for(let i=0;i<text.length;i++) idx = (idx*131 + text.charCodeAt(i)) % emojiPool.length;
      return emojiPool[idx];
    }

    const btn = document.getElementById('generate');
    const promptInput = document.getElementById('prompt');

    btn.addEventListener('click', async () =>{
      const text = promptInput.value.trim() || 'mood';
      const n = parseInt(select.value,10) || 5;

      // animate button: spin and change color + create floating emojis
      const t = themeFromText(text);
      document.body.style.background = t.bg;
      btn.style.background = t.accent;
      btn.classList.add('spinning');

      // create decorative emojis
      const emojis = [];
      const emojiChar = randomEmojiForText(text);
      for(let i=0;i<7;i++){
        const el = document.createElement('div');
        el.className='emoji-deco';
        el.textContent = emojiChar;
        document.body.appendChild(el);
        emojis.push(el);
        // random start position
        el.style.left = (20 + Math.random()*60) + '%';
        el.style.top = (10 + Math.random()*80) + '%';
        el.style.opacity = 0.9 - Math.random()*0.5;
        el.style.transition = 'transform 2.5s ease, left 2.5s ease, top 2.5s ease, opacity 2.5s ease';
      }

      // move emojis slightly
      setTimeout(()=>{
        emojis.forEach((el,idx)=>{
          el.style.left = (10 + Math.random()*80) + '%';
          el.style.top = (5 + Math.random()*90) + '%';
          el.style.transform = `translateY(${(idx%2===0? -1:1) * (10 + Math.random()*30)}px) rotate(${(Math.random()*40-20).toFixed(1)}deg)`;
        })
      },80);

      // stop spinning after animation
      setTimeout(()=>{btn.classList.remove('spinning');},900);

      // open new window and populate
      const w = window.open('about:blank','_blank');
      if(!w){alert('Popup blocked. Allow popups for this page or press Ctrl/Cmd+Click the Generate button.'); return}

      // Build skeleton for new page
      const doc = w.document;
      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Results for ${escapeHtml(text)}</title><style>
        body{margin:0;font-family:system-ui,Segoe UI,Roboto,'Helvetica Neue',Arial;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center}
        header{width:100%;padding:18px 20px;background:rgba(0,0,0,0.15);display:flex;align-items:center;gap:12px}
        main{flex:1;display:flex;align-items:center;justify-content:center;width:100%;}
        .card{width:min(920px,92%);background:rgba(0,0,0,0.35);border-radius:14px;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,0.6)}
        .track{display:flex;gap:12px;align-items:center;padding:8px;border-radius:10px;margin-bottom:8px;background:linear-gradient(90deg,rgba(255,255,255,0.02),transparent)}
        .art{width:72px;height:72px;border-radius:8px;background:#222;flex:0 0 72px;display:flex;align-items:center;justify-content:center;font-size:28px}
        .meta{flex:1}
        .title{font-weight:700}
        .artist{opacity:0.8;font-size:14px}
        .controls{display:flex;gap:8px}
        audio{width:220px}
      </style></head><body><header><div style="font-size:20px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.04)">${escapeHtml(text)}</div><div style="margin-left:auto;opacity:0.9">${emojiChar}</div></header><main><div class="card" id="list"><div style="text-align:center;padding:18px;opacity:0.9">Searching SoundCloud for <strong>${escapeHtml(text)}</strong> — loading...</div></div></main><script>
      function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
      // fetch tracks from our server
      fetch('/search?q=' + encodeURIComponent(${JSON.stringify(text)}) + '&limit=${n}')
        .then(r=>r.json())
        .then(data=>{
          const list = doc.getElementById('list');
          list.innerHTML='';
          if(!data || !data.length){ list.innerHTML='<div style="text-align:center;padding:18px;opacity:0.9">No tracks found. Try a different prompt or provide a SOUNDCLOUD_CLIENT_ID on the server.</div>'; return }
          data.forEach(tr=>{
            const el = doc.createElement('div'); el.className='track';
            const art = doc.createElement('div'); art.className='art';
            if(tr.artwork_url) art.style.backgroundImage = 'url('+tr.artwork_url+')', art.style.backgroundSize='cover', art.textContent=''; else art.textContent='🎵';
            const meta = doc.createElement('div'); meta.className='meta';
            meta.innerHTML = `<div class="title">${escapeHtml(tr.title || '')}</div><div class="artist">${escapeHtml((tr.user && tr.user.username) || '')}</div>`;
            const controls = doc.createElement('div'); controls.className='controls';
            if(tr.stream_url || tr.preview_url || tr.media && tr.media.transcodings){
              // best-effort: try to use a stream URL if provided by server
              const audio = doc.createElement('audio'); audio.controls = true;
              if(tr.stream_url) audio.src = tr.stream_url; else if(tr.preview_url) audio.src = tr.preview_url; else if(tr.streamable && tr.stream_url) audio.src=tr.stream_url;
              controls.appendChild(audio);
            }
            el.appendChild(art); el.appendChild(meta); el.appendChild(controls);
            list.appendChild(el);
          })
        }).catch(err=>{
          const list = doc.getElementById('list'); list.innerHTML = '<div style="text-align:center;padding:18px;opacity:0.9">Error fetching tracks: '+escapeHtml(String(err))+'</div>'
        })
      </script></body></html>
      `);
      doc.close();

      // cleanup decorations after a while
      setTimeout(()=>{emojis.forEach(e=>e.remove())},4200);
    })

    function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  </script>
</body>
</html>`);
});

// Search proxy endpoint - calls SoundCloud API if client id provided, else returns demo data
app.get('/search', async (req, res) => {
  const q = req.query.q || '';
  const limit = Math.min(50, parseInt(req.query.limit || '5',10));

  if(!SOUNDCLOUD_CLIENT_ID){
    // return some mocked results so UI still works without a client id
    const demo = Array.from({length:limit}).map((_,i)=>({
      id: i+1,
      title: `${q} — demo track ${i+1}`,
      user: {username: 'demo-artist'},
      artwork_url: '',
      stream_url: ''
    }));
    return res.json(demo);
  }

  try{
    // SoundCloud v2 search endpoint (may require an up-to-date client id)
    const api = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&limit=${limit}&client_id=${SOUNDCLOUD_CLIENT_ID}`;
    const r = await fetch(api, {method: 'GET', headers: { 'User-Agent': 'ai-playlist-proxy/1.0' }});
    if(!r.ok) return res.status(502).json({error: 'soundcloud responded with '+r.status});
    const payload = await r.json();
    // payload.collection is an array of tracks
    const tracks = (payload && payload.collection) ? payload.collection.map(t => ({
      id: t.id, title: t.title, user: t.user, artwork_url: t.artwork_url || (t.user && t.user.avatar_url) || '',
      // some items include a media.transcodings array with progressive mp3 https links. We'll not resolve them here to keep things simple.
      stream_url: t.stream_url || '',
      media: t.media,
      streamable: t.streamable
    })) : [];
    res.json(tracks);
  }catch(err){
    console.error('search error',err);
    res.status(500).json({error: String(err)});
  }
});

app.listen(PORT, ()=>{
  console.log(`Server started on http://localhost:${PORT}`);
  console.log('Set SOUNDCLOUD_CLIENT_ID env var to enable real SoundCloud results.');
});
