require('dotenv').config();
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, 'www');
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20;
const rateBuckets = new Map();
function rateLimited(req) {
  const now = Date.now();
  const key = req.socket.remoteAddress || 'unknown';
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};

const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean)
]);
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

function send(res,status,data,type='application/json; charset=utf-8'){
  res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
  res.end(typeof data==='string'?data:JSON.stringify(data));
}
function readBody(req,max=12*1024*1024){
  return new Promise((resolve,reject)=>{let body='',size=0;req.on('data',chunk=>{size+=chunk.length;if(size>max){reject(new Error('Przekroczono limit rozmiaru żądania.'));req.destroy();return;}body+=chunk;});req.on('end',()=>{try{resolve(JSON.parse(body||'{}'));}catch{reject(new Error('Nieprawidłowy JSON.'));}});req.on('error',reject);});
}
async function estimateFood(req,res){
  if(!process.env.OPENAI_API_KEY){return send(res,503,{error:'AI nie jest skonfigurowane. Dodaj OPENAI_API_KEY w środowisku serwera.'});}
  let data;
  if (rateLimited(req)) return send(res,429,{error:'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.'});
  try{data=await readBody(req,MAX_BODY_BYTES);}catch(e){return send(res,400,{error:e.message});}
  const description=String(data.description||'').slice(0,3000);
  const content=[{type:'text',text:`Oszacuj kalorie i makroskładniki całego posiłku na podstawie opisu i/lub zdjęcia. Odpowiedz wyłącznie JSON: {"kcal": liczba, "protein": liczba w gramach, "carbs": liczba w gramach, "fat": liczba w gramach, "assumptions": "krótkie założenia po polsku"}. Użyj rozsądnych szacunków, nie udawaj precyzji. Jeśli nie da się rozpoznać posiłku, zwróć wartości 0 i wyjaśnij dlaczego. Opis: ${description||'(brak opisu)'}`}];
  if(data.image && typeof data.image==='string' && data.image.length<11*1024*1024){
    if(!/^[A-Za-z0-9+/=]+$/.test(data.image)) return send(res,400,{error:'Nieprawidłowy format zdjęcia.'});
    const mime=['image/jpeg','image/png','image/webp','image/gif'].includes(data.imageType)?data.imageType:'image/jpeg';
    content.push({type:'image_url',image_url:{url:`data:${mime};base64,${data.image}`,detail:'low'}});
  }
  try{
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);
    let response;
    try {
      response=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        signal:controller.signal,
        body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:0.2,max_tokens:350,response_format:{type:'json_object'},messages:[{role:'system',content:'Jesteś ostrożnym asystentem szacującym wartości odżywcze. Nie przedstawiaj szacunków jako pomiaru laboratoryjnego. Podaj założenia dotyczące porcji, składników i niepewności.'},{role:'user',content}]})
      });
    } finally { clearTimeout(timeout); }
    const result=await response.json();
    if(!response.ok){console.error('AI provider error',response.status);return send(res,502,{error:'Usługa AI zwróciła błąd. Sprawdź konfigurację klucza i dostęp do modelu.'});}
    let parsed;try{parsed=JSON.parse(result.choices?.[0]?.message?.content||'{}');}catch{return send(res,502,{error:'AI zwróciło nieprawidłowy format danych.'});}
    const out={kcal:Number(parsed.kcal),protein:Number(parsed.protein),carbs:Number(parsed.carbs),fat:Number(parsed.fat),assumptions:String(parsed.assumptions||'Szacunek orientacyjny.')};
    if(!Object.values(out).slice(0,4).every(v=>Number.isFinite(v)&&v>=0&&v<=20000))return send(res,502,{error:'AI zwróciło wartości poza dozwolonym zakresem.'});
    return send(res,200,out);
  }catch(e){console.error('AI request failed:',e.message);return send(res,502,{error:'Nie udało się połączyć z usługą AI.'});}
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')) applyCors(req,res);
  if(req.method==='OPTIONS'&&url.pathname.startsWith('/api/')) { res.writeHead(204); return res.end(); }
  if(req.method==='POST'&&url.pathname==='/api/estimate-food')return estimateFood(req,res);
  if(url.pathname.startsWith('/api/'))return send(res,404,{error:'Nie znaleziono endpointu.'});
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Metoda niedozwolona.'});
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/')pathname='/index.html';
  const file=path.resolve(ROOT,'.'+pathname);
  if(!file.startsWith(ROOT+path.sep))return send(res,403,{error:'Brak dostępu.'});
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile())return send(res,404,'Nie znaleziono pliku.','text/plain; charset=utf-8');
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':path.basename(file)==='index.html'?'no-cache':'public, max-age=3600'});
    if(req.method==='HEAD')return res.end();
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT,'0.0.0.0',()=>console.log(`FORM LAB działa: http://localhost:${PORT}`));
