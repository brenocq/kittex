import{v7,_2,v6,A3,CC,_n,iC,Qn,l2,Kh,O7,si,N7,I7,Zh,Yh,rd,gi,od,Ei,ci,cd,Fi,V5}from'./p20.js';export*from'./p20.js';
var Yn=new Set(["table","blockquote"]);
var Gh=new Set(["paragraph","list","heading","code","table","blockquote","hr"]);
function Jn(e){let C=v7(e);if(!C)return null;let t=[];for(let L of C){let n=t.length>0,i=L.paragraph||L.quote?null:Hh(e,L.start,L.end);if(i)t.push(...i.map((s,r)=>({...s,...r===0?{gap:n}:{},block:L.start})));else{let s=L.paragraph?"paragraph":L.list?"list":L.quote?"blockquote":L.heading?"heading":L.table?"table":"block";t.push({...L,type:s,gap:n,block:L.start})}}return t}
function Hh(e,C,t){let L=e.slice(C,t),n;try{n=_2.lexer(L)}catch{return null}let i=[],s=0;for(let r of n){if(!L.startsWith(r.raw,s))return null;if(!Gh.has(r.type)||r.type==="code"&&r.text===""){let l=i.at(-1);return l?(l.end=t,i):null}let o=r.raw.replace(/(?:\r?\n[ \t]*)+$/,""),c=i.at(-1);r.type==="list"&&c?.type==="list"?c.end=C+s+o.length:i.push({start:C+s,end:C+s+o.length,paragraph:r.type==="paragraph",...r.type==="list"?{list:!0}:{},...r.type==="blockquote"?{quote:!0}:{},...r.type==="heading"?{heading:!0}:{},...r.type==="table"?{table:!0}:{},type:r.type,gap:c!==void 0&&Ci(c.type,r.type)}),s+=r.raw.length}return s!==L.length||i.length===0?null:i}
function Ci(e,C){return e==="heading"||Yn.has(e)||Yn.has(C)}
function jh(e,C,t=[],L={},n=!1){let i=v6(e,L,n);if(!i)return null;let{text:s,source:r}=i,o=i.stop??1/0,c=new Int32Array(s.length),l=new Int32Array(s.length),u=[],x=0,p=0;for(let D of s.split(`
`)){let k=A3(D,C,!0,L.emojiSequences===!0,n);if(!k)return null;let y=k.known??D.length,E=u.length;for(let b=0;b<k.rows;b++)u.push("");for(let b=0;b<y;b++){c[p+b]=x+k.row[b],l[p+b]=k.col[b];let F=E+k.row[b];k.hidden[b]||(u[F]=u[F]+D[b])}if(x+=k.rows,y<D.length){for(let b=p+y;b<s.length;b++)r[b]>=0&&(o=Math.min(o,r[b]));s=s.slice(0,p+y),r=r.slice(0,p+y);break}p+=D.length+1}let h=o<1/0?()=>!1:D=>D===s.length-1,d=ti(r),m=t.map(D=>D.end>o?null:ei(e,D,s,r,c,l,C,h,L,d));return o<1/0?{rows:x,places:m,lines:u,stop:o}:{rows:x,places:m,lines:u}}
function qh(e,C,t=[],L={},n=!1){return T7(e,CC(e,C,L,n),C,t,L)}
function Uh(e,C,t=[],L={},n=!1){return T7(e,_n(e,C,L,n),C,t,L)}
function Vh(e,C,t=[],L={},n=!1){return T7(e,iC(e,C,L,n),C,t,L)}
function Xh(e,C,t=[],L=C-2,n={}){return T7(e,Qn(e,C,L,n),C-2,t,n,()=>!1)}
function T7(e,C,t,L,n,i=s=>C?.end[s]===!0){if(!C)return null;let s=C.text.join(""),{stop:r}=C,o=r<1/0?()=>!1:i,c=ti(C.source),l=L.map(u=>u.end>r?null:ei(e,u,s,C.source,C.row,C.col,t,o,n,c));return r<1/0?{rows:C.rows,places:l,lines:C.lines(),stop:r}:{rows:C.rows,places:l,lines:C.lines()}}
function ti(e){let C=0;for(let n of e)n>=C&&(C=n+1);let t=new Int32Array(C).fill(-1),L=new Int32Array(C).fill(-1);for(let n=0;n<e.length;n++){let i=e[n];i<0||(t[i]<0&&(t[i]=n),L[i]=n)}return{first:t,last:L}}
function ei(e,C,t,L,n,i,s,r,o,c){let l=h=>L[h]>=C.start&&L[h]<C.end,u=-1,x=-1;for(let h=Math.max(0,C.start);h<Math.min(C.end,c.first.length);h++){let d=c.first[h];d<0||((u<0||d<u)&&(u=d),c.last[h]>x&&(x=c.last[h]))}if(u<0)return null;for(let h=u;h<=x;h++)if(!l(h)||n[h]!==n[u])return null;let p=Math.max(0,l2(t.slice(u,x+1),o.emojiSequences===!0));if(C.width!==void 0&&C.width!==p){let h=e.slice(L[x]+1,C.end);if(!r(x)||C.width<p||!/^\s*$/.test(h))return null;p=C.width}return i[u]+p>s?null:{row:n[u],col:i[u],columns:p}}
var cC=/[A-Za-z_:][-A-Za-z0-9_.:]*/y;
var lC=/[ \t\r\n]*/y;
var j5=class extends Error{};
function Li(e){let C=0,t=0,L=l=>{throw new j5(`XML: ${l} at ${C}`)},n=()=>{lC.lastIndex=C,lC.exec(e),C=lC.lastIndex},i=()=>{cC.lastIndex=C;let l=cC.exec(e);return l||L("name expected"),C=cC.lastIndex,l[0]},s=l=>{let u=e.indexOf(l,C);u<0&&L(`unclosed ${l}`),C=u+l.length},r=()=>{if(e.startsWith("<!--",C))s("-->");else if(e.startsWith("<?",C))s("?>");else if(e.startsWith("<![CDATA[",C))s("]]>");else if(e.startsWith("<!",C))s(">");else return!1;return!0},o=()=>{++t>2e5&&L("too many elements"),C++;let l=i(),u=Object.create(null);for(;;){n();let x=e[C];if(x==="/"&&e[C+1]===">")return C+=2,{el:{name:l,attrs:u,children:[]},closed:!0};if(x===">")return C++,{el:{name:l,attrs:u,children:[]},closed:!1};x===void 0&&L("unclosed tag");let p=i();n(),e[C]!=="="&&L("= expected"),C++,n();let h=e[C];h!=='"'&&h!=="'"&&L("quote expected");let d=e.indexOf(h,C+1);d<0&&L("unclosed attribute"),u[p]=Qh(e.slice(C+1,d)),C=d+1}},c=()=>{let l=o();if(l.closed)return l.el;let u=[l.el];for(;;){let x=e.indexOf("<",C),p=u[u.length-1];if(x<0&&L(`unclosed <${p.name}>`),C=x,r())continue;if(e[C+1]==="/"){C+=2;let d=i();if(d!==p.name&&L(`</${d}> closes <${p.name}>`),n(),e[C]!==">"&&L("> expected"),C++,u.pop(),u.length===0)return p;continue}let h=o();p.children.push(h.el),!h.closed&&(u.length>=2e4&&L("nested too deep"),u.push(h.el))}};for(;;){if(n(),C>=e.length&&L("no root element"),e[C]!=="<"&&L("< expected"),r())continue;return c()}}
function Qh(e){return e.includes("&")?e.replace(/&(#x[0-9A-Fa-f]{1,6}|#[0-9]{1,7}|[A-Za-z]+);/g,(C,t)=>{if(t[0]==="#"){let L=t[1]==="x"?parseInt(t.slice(2),16):parseInt(t.slice(1),10);return L>0&&L<=1114111?String.fromCodePoint(L):C}return Kh[t]??C}):e}
var m2=class extends Error{};
var Jh={fill:O7,fillOpacity:1,fillRule:"nonzero",stroke:null,strokeOpacity:1,strokeWidth:1,cap:"butt",join:"miter",miterLimit:4,dash:void 0,dashOffset:0,opacity:1,color:O7,clip:void 0};
var Cd=new Set(["defs","clipPath","linearGradient","radialGradient","pattern","symbol","marker","title","desc","metadata","style","script"]);
var td=new Set(["text","image","foreignObject","mask","svg","video","iframe"]);
function xC(e,C){let t=Li(e);if(t.name!=="svg")throw new m2("not an SVG document");let L=ed(t),n=new Map,i=E=>{let b=E.attrs.id;b!==void 0&&!n.has(b)&&n.set(b,E);for(let F of E.children)i(F)};i(t);let s=C.emPerUnit,r=C.baseline==="origin"?0:L.y+L.height,o=[s,0,0,s,-L.x*s,-r*s],c=[],l=[],u=new Map,x=E=>{if(c.length>=si)throw new m2("picture too complex");c.push(E)},p=(E,b,F)=>{if(E===null||!(b>0))return null;if("ref"in E){let w=id(E.ref,n,F.color);return w?{color:w.color,opacity:b*w.opacity}:null}return{color:E,opacity:b}},h=(E,b,F,w,B=!0)=>{if(E.trim()==="")return;let S=r3(o,b),N=B?p(F.fill,F.fillOpacity*F.opacity,F):null;N&&x({type:"fill",d:E,transform:S,rule:F.fillRule,paint:N,...w?{glyph:!0}:{},...F.clip!==void 0?{clip:F.clip}:{}});let q=p(F.stroke,F.strokeOpacity*F.opacity,F);if(q&&F.strokeWidth>0){let j={width:F.strokeWidth,cap:F.cap,join:F.join,miterLimit:F.miterLimit};F.dash&&(j.dash=F.dash,j.dashOffset=F.dashOffset),x({type:"stroke",d:E,transform:S,style:j,paint:q,...F.clip!==void 0?{clip:F.clip}:{}})}},d=(E,b,F)=>{let w=n.get(E);if(!w||w.name!=="clipPath")return F;let B=`${E}
${b.join(",")}
${F??""}`,S=u.get(B);if(S!==void 0)return S;let N=r3(b,uC(w.attrs.transform)),q=[],j=(O,H,W)=>{if(W>N7)throw new m2("clip path nested too deep");let U=r3(H,uC(O.attrs.transform)),e1=(o2(O,"clip-rule")??"nonzero")==="evenodd"?"evenodd":"nonzero";if(O.name==="use"){let J=n.get(P7(O)??"");J&&j(J,r3(U,ni(O)),W+1);return}let t1=ii(O);if(t1!==void 0){q.push({d:t1,transform:r3(o,U),rule:e1});return}if(O.name==="g")for(let J of O.children)j(J,U,W+1)};for(let O of w.children)j(O,N,0);l.push({paths:q,...F!==void 0?{within:F}:{}});let K=l.length-1;return u.set(B,K),K},m=[{el:t,ctm:I7,inherited:{...Jh},root:!0,glyph:!1,uses:0}],D=0;for(;m.length>0;){let{el:E,ctm:b,inherited:F,root:w,glyph:B,uses:S}=m.pop();if(++D>Zh)throw new m2("picture too complex");if(Cd.has(E.name))continue;if(td.has(E.name)&&!w)throw new m2(`<${E.name}> is not drawn`);if(o2(E,"display")==="none")continue;let N=E.name==="svg"?b:r3(b,uC(E.attrs.transform)),q=nd(E,F),j=pC(o2(E,"clip-path"));if(j!==void 0&&(q.clip=d(j,N,F.clip)),o2(E,"mask")!==void 0&&o2(E,"mask")!=="none")throw new m2("masks are not drawn");let K=o2(E,"visibility")==="hidden";switch(E.name){case"svg":case"g":case"a":case"switch":for(let O=E.children.length-1;O>=0;O--)m.push({el:E.children[O],ctm:N,inherited:q,root:!1,glyph:B,uses:S});continue;case"use":{let O=P7(E),H=O===void 0?void 0:n.get(O);if(!H||H===E)continue;if(S>=N7||Ld(E,n)>N7)throw new m2("use nested too deep");let W=H.name==="path"&&/^g\d*-/.test(O??"");m.push({el:H.name==="symbol"?{...H,name:"g"}:H,ctm:r3(N,ni(E)),inherited:q,root:!1,glyph:B||W,uses:S+1});continue}default:{let O=ii(E);if(O===void 0||K)continue;h(O,N,q,B,E.name!=="line")}}}let k=(r-L.y)*s,y=(L.y+L.height-r)*s;return{width:L.width*s,height:Math.max(0,k),depth:Math.max(0,y),ops:c,clips:l}}
function ed(e){let C=(e.attrs.viewBox??"").trim().split(/[\s,]+/).map(Number);if(C.length===4&&C.every(Number.isFinite)&&C[2]>0&&C[3]>0){let[n,i,s,r]=C;return{x:n,y:i,width:s,height:r}}let t=K4(e.attrs.width),L=K4(e.attrs.height);if(t&&L&&t>0&&L>0)return{x:0,y:0,width:t,height:L};throw new m2("the picture is empty")}
function K4(e){if(e===void 0)return;let C=parseFloat(e);return Number.isFinite(C)?C:void 0}
function P7(e){let C=e.attrs["xlink:href"]??e.attrs.href;return C?.startsWith("#")?C.slice(1):void 0}
function Ld(e,C){let t=0,L=e,n=new Set;for(;L&&L.name==="use";){if(n.has(L))return 1/0;n.add(L),t++;let i=P7(L);L=i===void 0?void 0:C.get(i)}return t}
function ni(e){return[1,0,0,1,K4(e.attrs.x)??0,K4(e.attrs.y)??0]}
function o2(e,C){let t=e.attrs.style;if(t!==void 0)for(let n of t.split(";")){let i=n.indexOf(":");if(i>0&&n.slice(0,i).trim()===C)return n.slice(i+1).trim()}let L=e.attrs[C];return L===void 0?void 0:L.trim()}
function nd(e,C){let t={...C},L=o2(e,"color");L!==void 0&&L!=="inherit"&&(t.color=_7(L,C.color)??C.color);let n=(l,u)=>{if(l===void 0||l==="inherit")return u;if(l==="none")return null;let x=pC(l);return x!==void 0?{ref:x}:l==="currentColor"?t.color:_7(l,t.color)??u};t.fill=n(o2(e,"fill"),C.fill),t.stroke=n(o2(e,"stroke"),C.stroke);let i=(l,u)=>{let x=o2(e,l);if(x===void 0||x==="inherit")return u;let p=x.endsWith("%")?parseFloat(x)/100:parseFloat(x);return Number.isFinite(p)?p:u};t.fillOpacity=q5(i("fill-opacity",C.fillOpacity)),t.strokeOpacity=q5(i("stroke-opacity",C.strokeOpacity)),t.opacity=C.opacity*q5(i("opacity",1)),t.strokeWidth=Math.max(0,i("stroke-width",C.strokeWidth)),t.miterLimit=Math.max(1,i("stroke-miterlimit",C.miterLimit)),t.dashOffset=i("stroke-dashoffset",C.dashOffset);let s=o2(e,"fill-rule");(s==="evenodd"||s==="nonzero")&&(t.fillRule=s);let r=o2(e,"stroke-linecap");(r==="butt"||r==="round"||r==="square")&&(t.cap=r);let o=o2(e,"stroke-linejoin");o==="miter"||o==="round"||o==="bevel"?t.join=o:(o==="miter-clip"||o==="arcs")&&(t.join="miter");let c=o2(e,"stroke-dasharray");if(c!==void 0&&c!=="inherit"){let l=c==="none"?[]:c.split(/[\s,]+/).filter(Boolean).map(Number),u=l.length>0&&l.every(x=>Number.isFinite(x)&&x>=0)&&l.some(x=>x>0);t.dash=u?l.length%2===1?[...l,...l]:l:void 0}return t}
function pC(e){let C=e===void 0?null:/^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(e);return C?C[1]:void 0}
function id(e,C,t){let L=C.get(e);if(!L)return null;if(L.name==="linearGradient"||L.name==="radialGradient"){let n=ri(L,C,0);if(n.length===0)return null;if(n.length===1)return n[0].paint;let i=0,s=0,r=0,o=0,c=0;for(let l=0;l+1<n.length;l++){let u=Math.max(0,n[l+1].offset-n[l].offset);for(let x of[n[l],n[l+1]])s+=x.paint.color.r*u,r+=x.paint.color.g*u,o+=x.paint.color.b*u,c+=x.paint.opacity*u;i+=2*u}return i>0?{color:{r:Math.round(s/i),g:Math.round(r/i),b:Math.round(o/i)},opacity:c/i}:n[0].paint}if(L.name==="pattern"){let n=oi(L,t);return n?{color:n,opacity:Yh}:null}return null}
function ri(e,C,t){let L=e.children.filter(i=>i.name==="stop").map(i=>{let s=o2(i,"offset")??"0",r=q5(s.endsWith("%")?parseFloat(s)/100:parseFloat(s)||0),o=_7(o2(i,"stop-color")??"black",O7)??O7,c=q5(parseFloat(o2(i,"stop-opacity")??"1"));return{offset:r,paint:{color:o,opacity:Number.isFinite(c)?c:1}}});if(L.length>0||t>N7)return L;let n=C.get(P7(e)??"");return n?ri(n,C,t+1):[]}
function oi(e,C){for(let t of e.children){for(let n of["fill","stroke"]){let i=o2(t,n);if(i&&i!=="none"&&pC(i)===void 0){let s=i==="currentColor"?C:_7(i,C);if(s)return s}}let L=oi(t,C);if(L)return L}}
function ii(e){let C=e.attrs,t=L=>K4(L)??0;switch(e.name){case"path":return C.d??"";case"rect":{let L=t(C.width),n=t(C.height);if(!(L>0&&n>0))return"";let i=t(C.x),s=t(C.y),r=K4(C.rx),o=K4(C.ry);return r===void 0&&(r=o),o===void 0&&(o=r),r=Math.min(Math.max(0,r??0),L/2),o=Math.min(Math.max(0,o??0),n/2),r>0&&o>0?`M${i+r} ${s}H${i+L-r}A${r} ${o} 0 0 1 ${i+L} ${s+o}V${s+n-o}A${r} ${o} 0 0 1 ${i+L-r} ${s+n}H${i+r}A${r} ${o} 0 0 1 ${i} ${s+n-o}V${s+o}A${r} ${o} 0 0 1 ${i+r} ${s}Z`:`M${i} ${s}H${i+L}V${s+n}H${i}Z`}case"circle":case"ellipse":{let L=t(C.cx),n=t(C.cy),i=e.name==="circle"?t(C.r):t(C.rx),s=e.name==="circle"?t(C.r):t(C.ry);return i>0&&s>0?`M${L+i} ${n}A${i} ${s} 0 1 1 ${L-i} ${n}A${i} ${s} 0 1 1 ${L+i} ${n}Z`:""}case"line":return`M${t(C.x1)} ${t(C.y1)}L${t(C.x2)} ${t(C.y2)}`;case"polyline":case"polygon":{let L=(C.points??"").trim().split(/[\s,]+/).filter(Boolean).map(Number);if(L.length<4||L.some(i=>!Number.isFinite(i)))return"";let n=`M${L[0]} ${L[1]}`;for(let i=2;i+1<L.length;i+=2)n+=`L${L[i]} ${L[i+1]}`;return e.name==="polygon"?n+"Z":n}default:return}}
function r3(e,C){return[e[0]*C[0]+e[2]*C[1],e[1]*C[0]+e[3]*C[1],e[0]*C[2]+e[2]*C[3],e[1]*C[2]+e[3]*C[3],e[0]*C[4]+e[2]*C[5]+e[4],e[1]*C[4]+e[3]*C[5]+e[5]]}
function uC(e){if(e===void 0||e.trim()==="")return I7;let C=I7,t=/\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)\s*,?/gy,L=0;for(let n=t.exec(e);n;n=t.exec(e)){L=t.lastIndex;let i=n[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);if(i.some(s=>!Number.isFinite(s)))throw new m2(`unreadable transform ${n[0]}`);C=r3(C,sd(n[1],i))}if(e.slice(L).trim()!=="")throw new m2(`unreadable transform ${e}`);return C}
function sd(e,C){let[t=0,L,n]=C;switch(e){case"matrix":if(C.length!==6)throw new m2("matrix() takes six numbers");return C;case"translate":return[1,0,0,1,t,L??0];case"scale":return[t,0,0,L??t,0,0];case"rotate":{let i=t*Math.PI/180,s=Math.cos(i),r=Math.sin(i),o=[s,r,-r,s,0,0];return L===void 0||n===void 0?o:r3(r3([1,0,0,1,L,n],o),[1,0,0,1,-L,-n])}case"skewX":return[1,0,Math.tan(t*Math.PI/180),1,0,0];case"skewY":return[1,Math.tan(t*Math.PI/180),0,1,0,0];default:return I7}}
function _7(e,C){let t=e.trim().toLowerCase();if(t==="currentcolor")return C;let L=/^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t);if(L){let i=L[1],s=i.length===3?[...i].map(r=>r+r).join(""):i;return{r:parseInt(s.slice(0,2),16),g:parseInt(s.slice(2,4),16),b:parseInt(s.slice(4,6),16)}}let n=/^rgba?\(([^)]*)\)$/.exec(t);if(n){let i=n[1].split(/[\s,/]+/).filter(Boolean);if(i.length<3)return;let s=u=>u.endsWith("%")?parseFloat(u)/100*255:parseFloat(u),[r,o,c]=i.slice(0,3).map(s);if(![r,o,c].every(Number.isFinite))return;let l=u=>Math.min(255,Math.max(0,Math.round(u)));return{r:l(r),g:l(o),b:l(c)}}return rd[t]}
var q5=e=>Number.isFinite(e)?Math.min(1,Math.max(0,e)):1;
function di(e){let C=e.trim().split(/\s+/,1)[0].toLowerCase();if(C==="latex"||C==="tex")return"latex";if(C==="tikz")return"tikz"}
function fi(e,C){return C!=="latex"||mi(e)?!0:/\\begin\{(?:tikzpicture|tikzcd|circuitikz|axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|ternaryaxis|picture|forest|chemfig)\}|\\(?:tikz|chemfig|schemestart|chemname|ctikzset|draw|SI|qty|si|unit|num)\b/.test(e)}
function mi(e){return/^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(e)||/\\begin\{document\}/.test(e)}
var Mi=["\\documentclass[dvisvgm,border=1pt]{standalone}",`\\makeatletter${gi}\\makeatother`,"\\usepackage{amsmath,amssymb}","\\usepackage{tikz}",`\\usetikzlibrary{${od}}`,"\\usepackage{pgfplots}","\\pgfplotsset{compat=1.18}","\\usepgfplotslibrary{fillbetween}","\\usepackage{chemfig}","\\usepackage{circuitikz}","\\usepackage{tikz-cd}","\\usepackage{siunitx}"];
var ai=/^[ \t]*\\(?:usepackage|RequirePackage|usetikzlibrary|usepgfplotslibrary|usepgflibrary|usegdlibrary)\b[^\n]*$/gm;
function Ai(e,C){let t=e.replace(/^\s*\n/,"").replace(/\s+$/,"").replace(/shader\s*=\s*interp\b/g,"shader=flat");if(C==="latex"&&mi(t)){let o=/^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(t),c=o?t:`\\documentclass[dvisvgm,border=1pt]{standalone}
${t}`,l=`\\def\\pgfsysdriver{pgfsys-dvisvgm.def}\\PassOptionsToPackage{dvisvgm}{graphicx}\\makeatletter\\AddToHook{class/standalone/after}{${gi}}\\makeatother`,u=c.replace(/\\documentclass\s*(?:\[([^\]]*)\])?\s*\{/,(p,h)=>h===void 0?"\\documentclass[dvisvgm]{":/(?:^|,)\s*dvisvgm\s*(?:,|$)/.test(h)?`\\documentclass[${h}]{`:`\\documentclass[${h},dvisvgm]{`);return{text:`${l}
${u.replace(/\\begin\{document\}/,"\\begin{document}\\pagestyle{empty}\\thispagestyle{empty}")}
`,offset:o?1:2,baseline:"bottom",fontSize:ad(c)}}let L=[...t.matchAll(ai)].map(o=>o[0].trim()),n=L.length>0?t.replace(ai,""):t;C==="tikz"&&!/\\begin\{tikzpicture\}|\\tikz\b/.test(n)&&(n=`\\begin{tikzpicture}
${n}
\\end{tikzpicture}`);let i=[...Mi,Ei,...L,"\\begin{document}"],s=C==="tikz"&&n!==t&&n.startsWith(`\\begin{tikzpicture}
`)&&!t.startsWith("\\begin{tikzpicture}"),r=i.length+(s?1:0);return{text:`${i.join(`
`)}
${n}
\\end{document}
`,offset:r,baseline:"bottom",fontSize:10,format:!0}}
var hC=`${[...Mi,Ei,"\\begin{document}","\\end{document}"].join(`
`)}
`;
function bi(e){let C=2166136261;for(let t of`3
${e}
${hC}`)C=Math.imul(C^t.charCodeAt(0),16777619);return`kittex-${(C>>>0).toString(16).padStart(8,"0")}`}
function Di(e){return["latex","-ini","-no-shell-escape","-interaction=nonstopmode","-halt-on-error","-no-mktex=tex","-no-mktex=tfm","-no-mktex=pk",`-jobname=${e}`,"&latex","mylatexformat.ltx",`${e}.tex`]}
function yi(e){return e===void 0?[...U5]:[...U5.slice(0,-2),`-fmt=${e}`,...U5.slice(-2)]}
var li=/^\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray)\*?\}/;
function ki(e,C){let t=e.trim();if(!C){let i=[...ci.slice(0,3),"\\usepackage[active]{preview}","\\begin{document}"];return{text:`${i.join(`
`)}
\\begin{preview}$${t}$\\end{preview}
\\end{document}
`,offset:i.length,baseline:"origin",fontSize:10}}let L=[...ci,"\\begin{document}"],n=li.test(t)?t:`\\[
${t}
\\]`;return{text:`${L.join(`
`)}
${n}
\\end{document}
`,offset:L.length+(li.test(t)?0:1),baseline:"bottom",fontSize:10}}
function ad(e){let C=/\\documentclass\s*\[([^\]]*)\]/.exec(e)?.[1]??"",t=/(?:^|,)\s*(\d{1,2}(?:\.\d+)?)pt\s*(?:,|$)/.exec(C)?.[1],L=t===void 0?10:Number(t);return L>=5&&L<=25?L:10}
function dC(e){return 72.27/72/e.fontSize}
var ld=new RegExp(String.raw`\\(?:${cd.map(e=>e.replace(/[*]/g,"\\*")).join("|")})(?![A-Za-z@])`);
var ud=new Set(["shellesc","minted","pythontex","sagetex","bashful","gnuplottex","svg","epstopdf","auto-pst-pdf","pst-pdf","luacode","luatextra","luapackageloader","fontspec","filecontents","catchfile","verbatim","fancyvrb","listings","import","standalone","datatool","csvsimple","readarray","pgfplotstable","xstring","docmute","subfiles","embedfile","attachfile","attachfile2","write18","pstricks","pst-node"]);
var xd=/\\(?:usepackage|RequirePackage|documentclass|LoadClass|usetikzlibrary|usepgfplotslibrary|usepgflibrary)\s*(?:\[[^\]]*\]\s*)?(?:\{([^}]*)\}|([^\s{\\][^\s\\]*))/g;
var pd=/\b(?:table|file|graphics)\s*(?:\[[^\]]*\]\s*)?\{([^}\\\n]*)\}/g;
var hd=/\b(?:table|file|graphics)\s*(?:\[[^\]]*\]\s*)?\{\s*\\[A-Za-z]/;
function Bi(e){if(e.length>24e3)return"source longer than 24000 characters";if(e.includes("^^"))return"uses ^^ character notation";if(/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(e))return"holds control characters";let C=ld.exec(e);if(C)return`uses ${C[0]}`;let t=/\\[A-Za-z]*@[A-Za-z@]*/.exec(e);if(t)return`uses ${t[0]}`;if(/\\begin\{(?:luacode\*?|filecontents\*?|verbatimwrite|VerbatimOut|lstlisting|minted|pycode|sagesilent|sageblock|bash)\}/.test(e))return"uses an environment that runs code or writes files";for(let n of e.matchAll(xd)){let i=(n[1]??n[2]??"").split(",");for(let s of i){let r=s.trim();if(ui(r))return`reads ${r}`;if(/^\\(?:usepackage|RequirePackage)/.test(n[0])&&ud.has(r))return`uses the ${r} package`}}for(let n of e.matchAll(pd)){let i=n[1].trim();if(i!==""&&ui(i))return`reads ${i}`}if(hd.test(e))return"reads a plot file named by a macro";if(/\bgnuplot\b|\\addplot[^;]*\bshell\b/.test(e))return"runs gnuplot or a shell";let L=/(?:^|[\s{=,(])((?:~|\$HOME|\$\{HOME\})\/|\.\.[/\\]|\/+(?:home|root|etc|Users|private|var|tmp|proc|sys|dev|run|mnt|media|srv|opt|usr|Library|Volumes|System|boot|snap|nix)\b)/.exec(e);if(L)return`names a path outside the picture (${L[1]})`}
function ui(e){return/^[/\\~]|^[A-Za-z]:|\.\.|^\.|\$|\||[`"'<>]|^\s*-/.test(e)||/[/\\]\./.test(e)}
var wi=64*1024*1024;
function vi(e){return["bwrap",...Si(e,void 0),"true"]}
function Si(e,C,t=[]){let L=["--ro-bind","/","/","--dev","/dev","--proc","/proc"];for(let n of e)L.push("--tmpfs",n);for(let n of t)L.push("--ro-bind",n,n);return C!==void 0&&L.push("--bind",C,C,"--chdir",C),L.push("--unshare-all","--die-with-parent","--new-session"),L}
function Ri(e,C,t,L=[]){let n=[...e];return t.bwrap&&(n=["bwrap",...Si(t.bwrap.hide,C,L),...n]),t.prlimit&&(n=["prlimit",`--fsize=${wi}`,`--cpu=${Fi}`,...n]),n}
var U5=["latex","-no-shell-escape","-interaction=nonstopmode","-halt-on-error","-no-mktex=tex","-no-mktex=tfm","-no-mktex=pk",`-jobname=${V5}`,`${V5}.tex`];
function Ti(e){return["dvisvgm","--no-fonts","--exact-bbox","--no-specials=ps,pdf,html",`--libgs=${e}/no-ghostscript`,"--no-mktexmf","--cache=none",`--tmpdir=${e}`,"--page=1","--stdout","--verbosity=1",`${V5}.dvi`]}
function Ni(e){return{shell_escape:"f",openin_any:"p",openout_any:"p",TEXMFOUTPUT:e,HOME:e,MKTEXTEX:"0",MKTEXTFM:"0",MKTEXPK:"0",MKTEXMF:"0",MKTEXFMT:"0",max_print_line:"1000",error_line:"254",half_error_line:"238"}}
function Oi(e){return`${(e&&e.startsWith("/")?e:"/tmp").replace(/\/+$/,"")}/kittex-tex.XXXXXXXXXX`}
function Ii(e){return/^\/(?:[^\n/]+\/)*kittex-tex\.[A-Za-z0-9]{10}$/.test(e)&&!e.includes("/../")&&!e.includes("/./")}
function Pi(e,C=0){let t=e.split(/\r?\n/),L=t.findIndex(s=>s.startsWith("! "));if(L<0)return/No pages of output/.test(e)?"the picture is empty":/Emergency stop|Fatal error/.test(e)?"TeX stopped":"TeX failed";let n=t[L].slice(2).trim().replace(/\.$/,"");n=n.replace(/^(?:LaTeX|Package \S+|Class \S+) Error:\s*/,"");let i;for(let s of t.slice(L+1,L+12)){let r=/^l\.(\d+) (.*)$/.exec(s);if(r){let o=Number(r[1])-C;if(o>=1&&(i=o),/^Undefined control sequence$/.test(n)){let c=/(\\[A-Za-z@]+|\\.)\s*$/.exec(r[2])?.[1];c&&(n+=` ${c}`)}break}}return i===void 0?n:`${n} (line ${i})`}
function W7(e){return z7(e).l>.5?{r:24,g:24,b:24}:{r:255,g:255,b:255}}
function $7(e,C,t){if(e.r<=2&&e.g<=2&&e.b<=2)return C.ink;if(e.r>=253&&e.g>=253&&e.b>=253)return"erase";let L=z7(e),n=z7(C.ink).l,i=z7(C.background).l,s=L.l;if(i<.5){let r=n+L.l*(i-n),o=Math.hypot(L.a,L.b),c=mC(o/.12)*mC(1-Math.abs(L.l-.55)/.4);s=r+(L.l-r)*c}if(s===L.l&&!(t&&Math.abs(s-i)<.3))return{...e};if(t&&Math.abs(s-i)<.3){let r=n>=i?1:-1;s=mC(i+r*.3)}return fd(s,L.a,L.b)}
var fC=e=>{let C=e/255;return C<=.04045?C/12.92:((C+.055)/1.055)**2.4};
var dd=e=>(e<=.0031308?12.92*e:1.055*e**(1/2.4)-.055)*255;
function z7(e){let C=fC(e.r),t=fC(e.g),L=fC(e.b),n=Math.cbrt(.4122214708*C+.5363325363*t+.0514459929*L),i=Math.cbrt(.2119034982*C+.6806995451*t+.1073969566*L),s=Math.cbrt(.0883024619*C+.2817188376*t+.6299787005*L);return{l:.2104542553*n+.793617785*i-.0040720468*s,a:1.9779984951*n-2.428592205*i+.4505937099*s,b:.0259040371*n+.7827717662*i-.808675766*s}}
function _i(e,C,t){let L=(e+.3963377774*C+.2158037573*t)**3,n=(e-.1055613458*C-.0638541728*t)**3,i=(e-.0894841775*C-1.291485548*t)**3;return[4.0767416621*L-3.3077115913*n+.2309699292*i,-1.2684380046*L+2.6097574011*n-.3413193965*i,-.0041960863*L-.7034186147*n+1.707614701*i]}
function fd(e,C,t){let L=c=>_i(e,C*c,t*c).every(l=>l>=-1e-6&&l<=1.000001),n=1;if(!L(1)){let c=0,l=1;for(let u=0;u<20;u++){let x=(c+l)/2;L(x)?c=x:l=x}n=c}let[i,s,r]=_i(e,C*n,t*n),o=c=>Math.min(255,Math.max(0,Math.round(dd(Math.min(1,Math.max(0,c))))));return{r:o(i),g:o(s),b:o(r)}}
var mC=e=>Math.min(1,Math.max(0,e));
function md(e,C){return xC(e,{baseline:C.baseline,emPerUnit:dC(C)})}
var S6=class{width;height;stride;acc;constructor(C,t){this.width=C,this.height=t,this.stride=C+2,this.acc=new Float32Array(this.stride*t)}fill(C,t){let L=C.length,n=C[L-2],i=C[L-1];for(let s=0;s<L;s+=2){let r=C[s],o=C[s+1];this.line(n,i,r,o,t),n=r,i=o}}line(C,t,L,n,i){if(t===n)return;let s=this.width;if(C>=0&&L>=0&&C<=s&&L<=s){this.edge(C,t,L,n,i);return}let r=[0,1];for(let o of[0,s])(C-o)*(L-o)<0&&r.push((o-C)/(L-C));r.sort((o,c)=>o-c);for(let o=1;o<r.length;o++){let c=r[o-1],l=r[o],u=C+(L-C)*c,x=C+(L-C)*l,p=t+(n-t)*c,h=t+(n-t)*l;this.edge(Math.min(s,Math.max(0,u)),p,Math.min(s,Math.max(0,x)),h,i)}}edge(C,t,L,n,i){if(t===n)return;let s=i,r=C,o=t,c=L,l=n;o>l&&(s=-i,r=L,o=n,c=C,l=t);let u=this.height;if(l<=0||o>=u)return;let x=this.acc,p=this.stride,h=(c-r)/(l-o),d=r;o<0&&(d-=o*h);let m=Math.max(0,Math.floor(o)),D=Math.min(u,Math.ceil(l));for(let k=m;k<D;k++){let y=k*p,E=Math.min(k+1,l)-Math.max(k,o),b=d+h*E,F=E*s,w=d<b?d:b,B=d<b?b:d,S=Math.floor(w),N=S,q=Math.ceil(B),j=q;if(j<=N+1){let K=.5*(d+b)-S;x[y+N]+=F-F*K,x[y+N+1]+=F*K}else{let K=1/(B-w),O=w-S,H=.5*K*(1-O)*(1-O),W=B-q+1,U=.5*K*W*W;if(x[y+N]+=F*H,j===N+2)x[y+N+1]+=F*(1-H-U);else{let e1=K*(1.5-O);x[y+N+1]+=F*(e1-H);for(let J=N+2;J<j-1;J++)x[y+J]+=F*K;let t1=e1+(j-N-3)*K;x[y+j-1]+=F*(1-t1-U)}x[y+j]+=F*U}d=b}}toAlphaEvenOdd(){let{width:C,height:t,stride:L,acc:n}=this,i=new Uint8Array(C*t);for(let s=0;s<t;s++){let r=0,o=s*L,c=s*C;for(let l=0;l<C;l++){r+=n[o+l];let u=(r<0?-r:r)%2;u>1&&(u=2-u),i[c+l]=u*255+.5|0}}return i}toAlpha(C){let{width:t,height:L,stride:n,acc:i}=this,s=new Uint8Array(t*L);for(let r=0;r<L;r++){let o=0,c=r*n,l=r*t;for(let u=0;u<t;u++){o+=i[c+u];let x=o<0?-o:o,p=x>=1?255:x*255+.5|0;s[l+u]=C?C[p]:p}}return s}};
var X2=Uint8Array;
var F2=Uint16Array;
var bC=Int32Array;
var DC=new X2([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]);
var yC=new X2([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]);
var zi=new X2([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);
var Hi=function(e,C){for(var t=new F2(31),L=0;L<31;++L)t[L]=C+=1<<e[L-1];for(var n=new bC(t[30]),L=1;L<30;++L)for(var i=t[L];i<t[L+1];++i)n[i]=i-t[L]<<5|L;return{b:t,r:n}};
var ji=Hi(DC,2);
var gd=ji.b;
var MC=ji.r;
gd[28]=258,MC[258]=28;
var qi=Hi(yC,0);
var QA=qi.b;
var Wi=qi.r;
var AC=new F2(32768);
for(F1=0;F1<32768;++F1)b3=(F1&43690)>>1|(F1&21845)<<1,b3=(b3&52428)>>2|(b3&13107)<<2,b3=(b3&61680)>>4|(b3&3855)<<4,AC[F1]=((b3&65280)>>8|(b3&255)<<8)>>1;
var b3;
var F1;
var Q5=(function(e,C,t){for(var L=e.length,n=0,i=new F2(C);n<L;++n)e[n]&&++i[e[n]-1];var s=new F2(C);for(n=1;n<C;++n)s[n]=s[n-1]+i[n-1]<<1;var r;if(t){r=new F2(1<<C);var o=15-C;for(n=0;n<L;++n)if(e[n])for(var c=n<<4|e[n],l=C-e[n],u=s[e[n]-1]++<<l,x=u|(1<<l)-1;u<=x;++u)r[AC[u]>>o]=c}else for(r=new F2(L),n=0;n<L;++n)e[n]&&(r[n]=AC[s[e[n]-1]++]>>15-e[n]);return r});
var Q4=new X2(288);
for(F1=0;F1<144;++F1)Q4[F1]=8;
var F1;
for(F1=144;F1<256;++F1)Q4[F1]=9;
var F1;
for(F1=256;F1<280;++F1)Q4[F1]=7;
var F1;
for(F1=280;F1<288;++F1)Q4[F1]=8;
var F1;
var G7=new X2(32);
for(F1=0;F1<32;++F1)G7[F1]=5;
var F1;
export{Q5,Q4,G7,X2,F2,zi,DC,yC,bC,MC,Wi,S6,W7,$7,hC,U5,m2,j5,Jn,vi,Ri,Ai,di,fi,Ti,Di,bi,Ii,Oi,yi,Uh,qh,jh,Vh,Xh,ki,Ni,Pi,md,Bi};
