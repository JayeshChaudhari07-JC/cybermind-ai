const ALLOWED_ORIGIN = "https://jayeshchaudhari07-jc.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin"
};
function json(data, status=200) {
  return new Response(JSON.stringify(data), {status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
}
function cors(request) {
  const origin=request.headers.get("Origin");
  return origin===ALLOWED_ORIGIN || origin===null;
}
async function agentRouter(env, question, history) {
  if(!env.AGENTROUTER_API_KEY || !env.AGENTROUTER_MODEL) throw new Error("AgentRouter key/model not configured");
  const messages=[...(history||[]).filter(m=>m && ["user","assistant"].includes(m.role) && typeof m.content==="string").slice(-12),{role:"user",content:question}];
  const r=await fetch("https://agentrouter.org/v1/chat/completions",{
    method:"POST",headers:{"Authorization":"Bearer "+env.AGENTROUTER_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({model:env.AGENTROUTER_MODEL,messages,temperature:0.5,max_tokens:1200})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error?.message||d.message||"AgentRouter request failed ("+r.status+")");
  const reply=d.choices?.[0]?.message?.content;
  if(typeof reply!=="string" || !reply.trim()) throw new Error("AgentRouter returned an empty response");
  return reply;
}
async function anthropic(env, question, history) {
  if(!env.ANTHROPIC_API_KEY || !env.ANTHROPIC_MODEL) throw new Error("Anthropic key/model not configured");
  const messages=[...(history||[]).filter(m=>m && ["user","assistant"].includes(m.role) && typeof m.content==="string").slice(-12),{role:"user",content:question}];
  const r=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"x-api-key":env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},
    body:JSON.stringify({model:env.ANTHROPIC_MODEL,max_tokens:1200,system:"You are CyberMind AI, a cybersecurity learning mentor. Answer in Hinglish if the user writes Hinglish. Keep guidance educational and legal; emphasize authorized lab practice.",messages})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error?.message||"Anthropic request failed ("+r.status+")");
  const reply=(d.content||[]).map(x=>x.text||"").join("").trim();
  if(!reply) throw new Error("Anthropic returned an empty response");
  return reply;
}
export default {
  async fetch(request, env) {
    if(!cors(request)) return json({error:"Origin not allowed"},403);
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders});
    const url=new URL(request.url);
    if(request.method==="GET" && url.pathname==="/health") return json({ok:true,service:"CyberMind AI backend",providers:{agentrouter:!!env.AGENTROUTER_API_KEY,anthropic:!!env.ANTHROPIC_API_KEY}});
    if(request.method!=="POST" || url.pathname!=="/chat") return json({error:"Not found"},404);
    let body;
    try { body=await request.json(); } catch { return json({error:"Invalid JSON body"},400); }
    const question=typeof body.question==="string"?body.question.trim():"";
    if(!question) return json({error:"Question required"},400);
    if(question.length>4000) return json({error:"Question too long (max 4000 chars)"},413);
    const history=Array.isArray(body.history)?body.history:[];
    const provider=body.provider||"auto";
    try {
      if(provider==="agentrouter") return json({reply:await agentRouter(env,question,history),provider:"agentrouter"});
      if(provider==="anthropic") return json({reply:await anthropic(env,question,history),provider:"anthropic"});
      if(provider==="auto") {
        if(env.AGENTROUTER_API_KEY && env.AGENTROUTER_MODEL) {
          try{return json({reply:await agentRouter(env,question,history),provider:"agentrouter"});}
          catch(arErr){ if(!env.ANTHROPIC_API_KEY || !env.ANTHROPIC_MODEL) throw arErr; }
        }
        if(env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL) return json({reply:await anthropic(env,question,history),provider:"anthropic"});
        return json({error:"No AI provider configured on backend"},503);
      }
      return json({error:"Unknown provider"},400);
    } catch(e) { return json({error:String(e.message||e).slice(0,500)},502); }
  }
};
