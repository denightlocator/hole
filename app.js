const $=s=>document.querySelector(s), key='habitat.v1';let state=JSON.parse(localStorage.getItem(key)||'null')||{born:Date.now(),n:0,facts:[],chat:[]};function save(){localStorage.setItem(key,JSON.stringify(state))}function bubble(w,t){let name=document.createElement('small'),b=document.createElement('div');name.textContent=w;b.className='bubble'+(w==='YOU'?' mine':'');b.textContent=t;$('#msgs').append(name,b)}function draw(){let m=$('#msgs');m.replaceChildren();bubble('✳ SPROUT','Hi, I’m Sprout. Tell me something about yourself, and I’ll remember it here in our habitat.');state.chat.forEach(x=>bubble(...x));m.scrollTop=m.scrollHeight;$('#days').textContent=1+Math.floor((Date.now()-state.born)/86400000);$('#turns').textContent=state.n;$('#count').textContent=state.facts.length;let bank=$('#bank');bank.replaceChildren();if(!state.facts.length)bank.textContent='No memories yet. Try telling Sprout “I like hiking.”';state.facts.forEach((f,i)=>{let row=document.createElement('div'),b=document.createElement('button');row.textContent=f;b.textContent='×';b.setAttribute('aria-label','Forget '+f);b.onclick=()=>{state.facts.splice(i,1);save();draw()};row.append(b);bank.append(row)})}const form = document.querySelector('form');
form.onsubmit = async event => {
  event.preventDefault();
  const entry = $('#entry'), send = $('.send'), lookup = $('#online');
  const prompt = entry.value.trim();
  if (!prompt || send.disabled) return;
  const history = state.chat.slice(-8), online = lookup.checked;
  const fact = prompt.match(/^remember\s+(.+)/i)?.[1] ||
    (/^(i |i’m |i'm |my |we )/i.test(prompt) && !prompt.endsWith('?') ? prompt : null);
  if (fact && !state.facts.includes(fact)) state.facts.push(fact);
  state.chat.push(['YOU', prompt]);
  entry.value = ''; send.disabled = true; lookup.checked = false;
  save(); draw(); bubble('✳ SPROUT', online ? 'Looking that up…' : 'Thinking…');
  $('#msgs').scrollTop = $('#msgs').scrollHeight;
  let reply;
  try {
    const res = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt, history, facts:state.facts.slice(-80), online})});
    if (!res.ok) throw Error();
    const data = await res.json();
    reply = data.reply + (data.source ? ' — Source: '+data.source : '') + (data.note ? ' ('+data.note+')' : '');
  } catch {
    reply = 'My local model is unavailable. Start me with start.bat on your PC and check the launcher window.' + (fact ? ' I saved your memory in this browser.' : '');
  } finally { send.disabled = false; }
  state.chat.push(['✳ SPROUT', reply]); state.chat = state.chat.slice(-80);
  state.n++; save(); draw(); entry.focus();
};
save(); draw();
