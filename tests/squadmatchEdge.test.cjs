const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const raw = fs.readFileSync(path.join(__dirname, '../supabase/functions/squadmatch-ai/index.ts'), 'utf8');
const javascript = ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const lobby = {
  id: 'lobby-valid', activity_type: 'Badminton', skill_level: 'Friendly', location_name: 'Test Court',
  starts_at: '2027-05-01T12:00:00Z', current_players: 2, max_players: 4,
};
const payload = {language:'en',preferences:{favourite_sports:['Badminton'],play_style:'Friendly',preferred_days:['Sat']},lobbies:[lobby]};
function setup(env = {SUPABASE_URL:'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEYS:'{"default":"sb_publishable_test"}', SQUADMATCH_GEMINI_API_KEY:'fake-test-key'}) {
  let handler;
  let authCalls=0, googleCalls=0;
  let googlePayload={candidates:[{content:{parts:[{text:JSON.stringify({recommendations:[{id:'lobby-valid',reason:'Matches your badminton preference'}]})}]}}]};
  const context={
    Deno:{env:{get:key=>env[key]}, serve: fn=>handler=fn},
    fetch:async (url,options)=>{
      if(String(url).includes('/auth/v1/user')) {authCalls++; return Response.json({id:'user-ok'});}
      googleCalls++;
      assert.equal(options.headers['x-goog-api-key'],'fake-test-key');
      return Response.json(googlePayload);
    },
    Response,Request,AbortSignal,JSON,Set,Number,Math,Date,Error,RegExp,Object,String,Array,console,
  };
  vm.runInNewContext(javascript,context,{timeout:1000});
  return {call:(p=payload,token='signed-in-user')=>handler(new Request('https://test.supabase.co/functions/v1/squadmatch-ai',{method:'POST',headers:{Authorization:token?`Bearer ${token}`:''},body:JSON.stringify(p)})),
    get authCalls(){return authCalls;},get googleCalls(){return googleCalls;},setGooglePayload:p=>googlePayload=p};
}
test('rejects anonymous invocation before reaching Gemini',async()=>{
  const app=setup();const res=await app.call(payload,'');assert.equal(res.status,401);assert.equal(app.googleCalls,0);
});
test('returns only whitelisted recommendations and grounded explanation',async()=>{
  const app=setup();const res=await app.call();const json=await res.json();assert.equal(res.status,200);assert.equal(json.source,'gemini');assert.equal(json.recommendations[0].id,'lobby-valid');assert.equal(app.authCalls,1);assert.equal(app.googleCalls,1);
});
test('does not forward unknown lobby IDs from model',async()=>{
  const app=setup();app.setGooglePayload({candidates:[{content:{parts:[{text:JSON.stringify({recommendations:[{id:'fake-lobby',reason:'anything'}]})}]}}]});
  const res=await app.call();assert.equal(res.status,503);assert.equal(app.googleCalls,1);
});
test('rejects oversized lobby list before using Gemini',async()=>{
  const app=setup();const many=Array.from({length:11},(_,i)=>({...lobby,id:`lobby-${i}`}));
  const res=await app.call({...payload,lobbies:many});assert.equal(res.status,400);assert.equal(app.googleCalls,0);
});
test('rejects missing Gemini key without unprotected fallback',async()=>{
  const app=setup({SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'anon-test'});
  const res=await app.call();assert.equal(res.status,503);assert.equal(app.googleCalls,0);
});

test('chat moderation GEMINI_API_KEY cannot silently authenticate SquadMatch',async()=>{
  const app=setup({SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'anon-test',GEMINI_API_KEY:'moderation-only-key'});
  const res=await app.call();assert.equal(res.status,503);assert.equal(app.googleCalls,0);
});
