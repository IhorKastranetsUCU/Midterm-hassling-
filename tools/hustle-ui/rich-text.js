import {marked} from 'marked';
import DOMPurify from 'dompurify';
let renderer;
const safeURL=value=>{try{const url=new URL(value,location.origin);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}};
window.HustleRich={
  markdown(value){
    const fragment=DOMPurify.sanitize(marked.parse(value,{gfm:true,breaks:false}),{RETURN_DOM_FRAGMENT:true,USE_PROFILES:{html:true},FORBID_TAGS:['style','form','input','button','iframe','object','embed'],FORBID_ATTR:['style','id','name']});
    for(const link of fragment.querySelectorAll('a')){if(!safeURL(link.getAttribute('href')))link.removeAttribute('href');else{link.target='_blank';link.rel='noopener noreferrer';}}
    for(const img of fragment.querySelectorAll('img')){if(!safeURL(img.getAttribute('src')))img.removeAttribute('src');img.loading='lazy';img.referrerPolicy='no-referrer';}
    const container=document.createElement('div');container.append(fragment);return container.innerHTML;
  },
  async enhance(root){
    const diagrams=[...root.querySelectorAll('[data-diagram]:not([data-rendered])')];
    for(const code of root.querySelectorAll('pre > code.language-mermaid')){const figure=document.createElement('figure');figure.className='diagram';figure.dataset.diagram=code.textContent;code.parentElement.replaceWith(figure);diagrams.push(figure);}
    if(!diagrams.length)return;
    try{renderer ||= import('./diagrams.js');const {render}=await renderer;for(const el of diagrams){if(!el.isConnected)continue;el.dataset.rendered='true';try{const svg=await render(el.dataset.diagram);if(el.isConnected)el.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['foreignObject','a'],FORBID_ATTR:['onload']});}catch{el.textContent='Схему не вдалося відобразити.';}}}catch{renderer=null;for(const el of diagrams)el.textContent='Схема тимчасово недоступна.';}
  }
};
