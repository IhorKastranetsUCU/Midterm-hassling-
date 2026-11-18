(() => {
  const shapes = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="11" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="18" width="7" height="3" rx="1.5"/>',
    plan: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5M8 16h6"/>',
    courses: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z"/><path d="M12 6v15"/>',
    practice: '<rect x="5" y="3" width="15" height="17" rx="3"/><path d="M2 7v13a3 3 0 0 0 3 3M9 11l2 2 5-5"/>',
    files: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    link: '<path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(2 0) scale(.85)"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    logout: '<path d="M9 4H4v16h5M12 12h9m-4-4 4 4-4 4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/>',
  };
window.UI = {
escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
icon(name) { return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.plan}</svg>`; },
async api(path, options = {}) {
 const response = await fetch(path, {credentials:'same-origin', ...options});
 const data = await response.json().catch(() => null);
 if (!response.ok) {
  const detail = data?.detail;
  throw new Error(response.status === 503 ? 'Сервіс ще не налаштований. Спробуй гостьовий простір.' : response.status === 401 ? 'Сесія завершилася. Увійди ще раз.' : typeof detail === 'string' ? detail : 'Не вдалося виконати дію. Спробуй ще раз.');
 }
 return data;
},
markdown(value) {
 const source = window.HustleMath ? HustleMath.protectMarkdown(String(value || '')) : String(value || '');
 if(window.HustleRich) return HustleRich.markdown(source);

 const inline = text => this.escape(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
 const out = []; let list = false, paragraph = [], code = null;
 const flush = () => { if(paragraph.length) {out.push(`<p>${paragraph.join('<br>')}</p>`);paragraph=[];} if(list) {out.push('</ul>');list=false;} };
 for(const line of source.split('\n')) {
  if(line.startsWith('```')) { flush(); if(code!==null) {out.push(`<pre><code>${this.escape(code.join('\n'))}</code></pre>`);code=null;} else code=[]; continue; }
  if(code!==null) {code.push(line);continue;}
  if(!line.trim()) {flush();continue;}
  const heading=line.match(/^#{1,6}\s+(.+)$/), bullet=line.match(/^[-*]\s+(.+)$/), quote=line.match(/^>\s?(.*)$/);
  if(heading) {flush();out.push(`<h3>${inline(heading[1])}</h3>`);}
  else if(bullet) {if(paragraph.length)flush();if(!list){out.push('<ul>');list=true;}out.push(`<li>${inline(bullet[1])}</li>`);}
  else if(quote) {flush();out.push(`<blockquote>${inline(quote[1])}</blockquote>`);}
  else {if(list)flush();paragraph.push(inline(line));}
 }
 flush(); if(code!==null)out.push(`<pre><code>${this.escape(code.join('\n'))}</code></pre>`);
 return out.join('');
},
inlineMath(value) { return window.HustleMath ? HustleMath.inlineHtml(value) : this.escape(value); },
route() {
 const [path,query='']=location.hash.slice(1).split('?');const parts=path.split('/');const params=new URLSearchParams(query);
 return {view:parts[0]||'dashboard',courseId:parts[0]==='course'&&/^\d+$/.test(parts[1]||'')?parts[1]:null,section:parts[2]||'overview',topic:parts[3],from:['materials','practice'].includes(params.get('from'))?params.get('from'):null};
},
courseLink(id,section='overview',topic) {const from=this.route().from;return `#course/${encodeURIComponent(id)}/${section}${topic!==undefined?'/'+encodeURIComponent(topic):''}${from?'?from='+from:''}`;},
safeLink(value) {if(!value)return null;try {const url=new URL(value,location.origin);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}},
plain(value) {const doc=new DOMParser().parseFromString(String(value||''),'text/html');return doc.body.textContent||'';},
courseName(value) {
 let text = String(value ?? '');
 if (text.includes('&')) {
  const decoder = document.createElement('textarea');
  // Decode entity tokens only. Literal angle brackets in course titles remain text.
  for (let pass = 0; pass < 2; pass++) {
   const decoded = text.replace(/&(?:#(?:\d+|x[0-9a-f]+)|[a-z][a-z0-9]*);/gi, entity => {
    decoder.innerHTML = entity;
    return decoder.value;
   });
   if (text === decoded) break;
   text = decoded;
  }
 }
 return text.normalize('NFC').replace(/\s+/g, ' ').trim();
},
countLabel(value,one,few,many) {const rule=new Intl.PluralRules('uk-UA').select(Number(value));return `${value} ${{one,few,many,other:many}[rule]}`;},
date(value,withTime=false) {if(!value)return '';const d=new Date(typeof value==='number'?value*1000:value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(d);},
toast(message) {const el=document.querySelector('.toast');if(!el)return;clearTimeout(this.toastTimer);el.textContent=message;el.hidden=false;this.toastTimer=setTimeout(()=>el.hidden=true,5000);},
async enhance(root) {await Promise.all([window.HustleRich?.enhance(root), window.HustleMath?.enhance(root)]);},
post(path, data) { return this.api(path, {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); }
}; })();
