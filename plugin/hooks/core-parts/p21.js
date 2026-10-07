import{k7,_2,F6,A3,K9,Tn,CC,qn,l2,Wh,S7,ti,v7,R7,Gh,Zh,Yh,ii,td,mi,q5}from'./p20.js';export*from'./p20.js';
var Vn=new Set(["table","blockquote"]);
var Th=new Set(["paragraph","list","heading","code","table","blockquote","hr"]);
function Xn(e){let C=k7(e);if(!C)return null;let t=[];for(let L of C){let n=t.length>0,i=L.paragraph||L.quote?null:Nh(e,L.start,L.end);if(i)t.push(...i.map((s,r)=>({...s,...r===0?{gap:n}:{},block:L.start})));else{let s=L.paragraph?"paragraph":L.list?"list":L.quote?"blockquote":L.heading?"heading":L.table?"table":"block";t.push({...L,type:s,gap:n,block:L.start})}}return t}
function Nh(e,C,t){let L=e.slice(C,t),n;try{n=_2.lexer(L)}catch{return null}let i=[],s=0;for(let r of n){if(!L.startsWith(r.raw,s))return null;if(!Th.has(r.type)||r.type==="code"&&r.text===""){let l=i.at(-1);return l?(l.end=t,i):null}let o=r.raw.replace(/(?:\r?\n[ \t]*)+$/,""),a=i.at(-1);r.type==="list"&&a?.type==="list"?a.end=C+s+o.length:i.push({start:C+s,end:C+s+o.length,paragraph:r.type==="paragraph",...r.type==="list"?{list:!0}:{},...r.type==="blockquote"?{quote:!0}:{},...r.type==="heading"?{heading:!0}:{},...r.type==="table"?{table:!0}:{},type:r.type,gap:a!==void 0&&Kn(a.type,r.type)}),s+=r.raw.length}return s!==L.length||i.length===0?null:i}
function Kn(e,C){return e==="heading"||Vn.has(e)||Vn.has(C)}
function Oh(e,C,t=[],L={},n=!1){let i=F6(e,L,n);if(!i)return null;let{text:s,source:r}=i,o=i.stop??1/0,a=new Int32Array(s.length),l=new Int32Array(s.length),u=[],x=0,p=0;for(let b of s.split(`
`)){let B=A3(b,C,!0,L.emojiSequences===!0,n);if(!B)return null;let A=B.known??b.length,k=u.length;for(let D=0;D<B.rows;D++)u.push("");for(let D=0;D<A;D++){a[p+D]=x+B.row[D],l[p+D]=B.col[D];let v=k+B.row[D];B.hidden[D]||(u[v]=u[v]+b[D])}if(x+=B.rows,A<b.length){for(let D=p+A;D<s.length;D++)r[D]>=0&&(o=Math.min(o,r[D]));s=s.slice(0,p+A),r=r.slice(0,p+A);break}p+=b.length+1}let h=o<1/0?()=>!1:b=>b===s.length-1,d=Qn(r),m=t.map(b=>b.end>o?null:Zn(e,b,s,r,a,l,C,h,L,d));return o<1/0?{rows:x,places:m,lines:u,stop:o}:{rows:x,places:m,lines:u}}
function Ih(e,C,t=[],L={},n=!1){return F7(e,K9(e,C,L,n),C,t,L)}
function Ph(e,C,t=[],L={},n=!1){return F7(e,Tn(e,C,L,n),C,t,L)}
function _h(e,C,t=[],L={},n=!1){return F7(e,CC(e,C,L,n),C,t,L)}
function zh(e,C,t=[],L=C-2,n={}){return F7(e,qn(e,C,L,n),C-2,t,n,()=>!1)}
function F7(e,C,t,L,n,i=s=>C?.end[s]===!0){if(!C)return null;let s=C.text.join(""),{stop:r}=C,o=r<1/0?()=>!1:i,a=Qn(C.source),l=L.map(u=>u.end>r?null:Zn(e,u,s,C.source,C.row,C.col,t,o,n,a));return r<1/0?{rows:C.rows,places:l,lines:C.lines(),stop:r}:{rows:C.rows,places:l,lines:C.lines()}}
function Qn(e){let C=0;for(let n of e)n>=C&&(C=n+1);let t=new Int32Array(C).fill(-1),L=new Int32Array(C).fill(-1);for(let n=0;n<e.length;n++){let i=e[n];i<0||(t[i]<0&&(t[i]=n),L[i]=n)}return{first:t,last:L}}
function Zn(e,C,t,L,n,i,s,r,o,a){let l=h=>L[h]>=C.start&&L[h]<C.end,u=-1,x=-1;for(let h=Math.max(0,C.start);h<Math.min(C.end,a.first.length);h++){let d=a.first[h];d<0||((u<0||d<u)&&(u=d),a.last[h]>x&&(x=a.last[h]))}if(u<0)return null;for(let h=u;h<=x;h++)if(!l(h)||n[h]!==n[u])return null;let p=Math.max(0,l2(t.slice(u,x+1),o.emojiSequences===!0));if(C.width!==void 0&&C.width!==p){let h=e.slice(L[x]+1,C.end);if(!r(x)||C.width<p||!/^\s*$/.test(h))return null;p=C.width}return i[u]+p>s?null:{row:n[u],col:i[u],columns:p}}
var iC=/[A-Za-z_:][-A-Za-z0-9_.:]*/y;
var sC=/[ \t\r\n]*/y;
var H5=class extends Error{};
function Yn(e){let C=0,t=0,L=a=>{throw new H5(`XML: ${a} at ${C}`)},n=()=>{sC.lastIndex=C,sC.exec(e),C=sC.lastIndex},i=()=>{iC.lastIndex=C;let a=iC.exec(e);return a||L("name expected"),C=iC.lastIndex,a[0]},s=a=>{let l=e.indexOf(a,C);l<0&&L(`unclosed ${a}`),C=l+a.length},r=()=>{if(e.startsWith("<!--",C))s("-->");else if(e.startsWith("<?",C))s("?>");else if(e.startsWith("<![CDATA[",C))s("]]>");else if(e.startsWith("<!",C))s(">");else return!1;return!0},o=a=>{a>400&&L("nested too deep"),++t>2e5&&L("too many elements"),C++;let l=i(),u=Object.create(null);for(;;){n();let p=e[C];if(p==="/"&&e[C+1]===">")return C+=2,{name:l,attrs:u,children:[]};if(p===">"){C++;break}p===void 0&&L("unclosed tag");let h=i();n(),e[C]!=="="&&L("= expected"),C++,n();let d=e[C];d!=='"'&&d!=="'"&&L("quote expected");let m=e.indexOf(d,C+1);m<0&&L("unclosed attribute"),u[h]=$h(e.slice(C+1,m)),C=m+1}let x=[];for(;;){let p=e.indexOf("<",C);if(p<0&&L(`unclosed <${l}>`),C=p,!r()){if(e[C+1]==="/"){C+=2;let h=i();return h!==l&&L(`</${h}> closes <${l}>`),n(),e[C]!==">"&&L("> expected"),C++,{name:l,attrs:u,children:x}}x.push(o(a+1))}}};for(;;){if(n(),C>=e.length&&L("no root element"),e[C]!=="<"&&L("< expected"),r())continue;return o(0)}}
function $h(e){return e.includes("&")?e.replace(/&(#x[0-9A-Fa-f]{1,6}|#[0-9]{1,7}|[A-Za-z]+);/g,(C,t)=>{if(t[0]==="#"){let L=t[1]==="x"?parseInt(t.slice(2),16):parseInt(t.slice(1),10);return L>0&&L<=1114111?String.fromCodePoint(L):C}return Wh[t]??C}):e}
var u2=class extends Error{};
var Hh={fill:S7,fillOpacity:1,fillRule:"nonzero",stroke:null,strokeOpacity:1,strokeWidth:1,cap:"butt",join:"miter",miterLimit:4,dash:void 0,dashOffset:0,opacity:1,color:S7,clip:void 0};
var jh=new Set(["defs","clipPath","linearGradient","radialGradient","pattern","symbol","marker","title","desc","metadata","style","script"]);
var qh=new Set(["text","image","foreignObject","mask","svg","video","iframe"]);
function oC(e,C){let t=Yn(e);if(t.name!=="svg")throw new u2("not an SVG document");let L=Uh(t),n=new Map,i=A=>{let k=A.attrs.id;k!==void 0&&!n.has(k)&&n.set(k,A);for(let D of A.children)i(D)};i(t);let s=C.emPerUnit,r=C.baseline==="origin"?0:L.y+L.height,o=[s,0,0,s,-L.x*s,-r*s],a=[],l=[],u=new Map,x=A=>{if(a.length>=ti)throw new u2("picture too complex");a.push(A)},p=(A,k,D)=>{if(A===null||!(k>0))return null;if("ref"in A){let v=Kh(A.ref,n,D.color);return v?{color:v.color,opacity:k*v.opacity}:null}return{color:A,opacity:k}},h=(A,k,D,v,F=!0)=>{if(A.trim()==="")return;let y=s3(o,k),S=F?p(D.fill,D.fillOpacity*D.opacity,D):null;S&&x({type:"fill",d:A,transform:y,rule:D.fillRule,paint:S,...v?{glyph:!0}:{},...D.clip!==void 0?{clip:D.clip}:{}});let I=p(D.stroke,D.strokeOpacity*D.opacity,D);if(I&&D.strokeWidth>0){let U={width:D.strokeWidth,cap:D.cap,join:D.join,miterLimit:D.miterLimit};D.dash&&(U.dash=D.dash,U.dashOffset=D.dashOffset),x({type:"stroke",d:A,transform:y,style:U,paint:I,...D.clip!==void 0?{clip:D.clip}:{}})}},d=(A,k,D)=>{let v=n.get(A);if(!v||v.name!=="clipPath")return D;let F=`${A}
${k.join(",")}
${D??""}`,y=u.get(F);if(y!==void 0)return y;let S=s3(k,rC(v.attrs.transform)),I=[],U=(q,z,j)=>{if(j>v7)throw new u2("clip path nested too deep");let W=s3(z,rC(q.attrs.transform)),X=(o2(q,"clip-rule")??"nonzero")==="evenodd"?"evenodd":"nonzero";if(q.name==="use"){let J=n.get(T7(q)??"");J&&U(J,s3(W,Jn(q)),j+1);return}let t1=Ci(q);if(t1!==void 0){I.push({d:t1,transform:s3(o,W),rule:X});return}if(q.name==="g")for(let J of q.children)U(J,W,j+1)};for(let q of v.children)U(q,S,0);l.push({paths:I,...D!==void 0?{within:D}:{}});let H=l.length-1;return u.set(F,H),H},m=(A,k,D,v,F)=>{if(v>400)throw new u2("nested too deep");if(jh.has(A.name))return;if(qh.has(A.name)&&v>0)throw new u2(`<${A.name}> is not drawn`);if(o2(A,"display")==="none")return;let y=A.name==="svg"?k:s3(k,rC(A.attrs.transform)),S=Xh(A,D),I=aC(o2(A,"clip-path"));if(I!==void 0&&(S.clip=d(I,y,D.clip)),o2(A,"mask")!==void 0&&o2(A,"mask")!=="none")throw new u2("masks are not drawn");let U=o2(A,"visibility")==="hidden";switch(A.name){case"svg":case"g":case"a":case"switch":for(let H of A.children)m(H,y,S,v+1,F);return;case"use":{if(v>v7*50)throw new u2("use nested too deep");let H=T7(A),q=H===void 0?void 0:n.get(H);if(!q||q===A)return;if(Vh(A,n)>v7)throw new u2("use nested too deep");let z=q.name==="path"&&/^g\d*-/.test(H??"");m(q.name==="symbol"?{...q,name:"g"}:q,s3(y,Jn(A)),S,v+1,F||z);return}default:{let H=Ci(A);if(H===void 0||U)return;h(H,y,S,F,A.name!=="line")}}};m(t,R7,{...Hh},0,!1);let b=(r-L.y)*s,B=(L.y+L.height-r)*s;return{width:L.width*s,height:Math.max(0,b),depth:Math.max(0,B),ops:a,clips:l}}
function Uh(e){let C=(e.attrs.viewBox??"").trim().split(/[\s,]+/).map(Number);if(C.length===4&&C.every(Number.isFinite)&&C[2]>0&&C[3]>0){let[n,i,s,r]=C;return{x:n,y:i,width:s,height:r}}let t=K4(e.attrs.width),L=K4(e.attrs.height);if(t&&L&&t>0&&L>0)return{x:0,y:0,width:t,height:L};throw new u2("the SVG has no size")}
function K4(e){if(e===void 0)return;let C=parseFloat(e);return Number.isFinite(C)?C:void 0}
function T7(e){let C=e.attrs["xlink:href"]??e.attrs.href;return C?.startsWith("#")?C.slice(1):void 0}
function Vh(e,C){let t=0,L=e,n=new Set;for(;L&&L.name==="use";){if(n.has(L))return 1/0;n.add(L),t++;let i=T7(L);L=i===void 0?void 0:C.get(i)}return t}
function Jn(e){return[1,0,0,1,K4(e.attrs.x)??0,K4(e.attrs.y)??0]}
function o2(e,C){let t=e.attrs.style;if(t!==void 0)for(let n of t.split(";")){let i=n.indexOf(":");if(i>0&&n.slice(0,i).trim()===C)return n.slice(i+1).trim()}let L=e.attrs[C];return L===void 0?void 0:L.trim()}
function Xh(e,C){let t={...C},L=o2(e,"color");L!==void 0&&L!=="inherit"&&(t.color=N7(L,C.color)??C.color);let n=(l,u)=>{if(l===void 0||l==="inherit")return u;if(l==="none")return null;let x=aC(l);return x!==void 0?{ref:x}:l==="currentColor"?t.color:N7(l,t.color)??u};t.fill=n(o2(e,"fill"),C.fill),t.stroke=n(o2(e,"stroke"),C.stroke);let i=(l,u)=>{let x=o2(e,l);if(x===void 0||x==="inherit")return u;let p=x.endsWith("%")?parseFloat(x)/100:parseFloat(x);return Number.isFinite(p)?p:u};t.fillOpacity=j5(i("fill-opacity",C.fillOpacity)),t.strokeOpacity=j5(i("stroke-opacity",C.strokeOpacity)),t.opacity=C.opacity*j5(i("opacity",1)),t.strokeWidth=Math.max(0,i("stroke-width",C.strokeWidth)),t.miterLimit=Math.max(1,i("stroke-miterlimit",C.miterLimit)),t.dashOffset=i("stroke-dashoffset",C.dashOffset);let s=o2(e,"fill-rule");(s==="evenodd"||s==="nonzero")&&(t.fillRule=s);let r=o2(e,"stroke-linecap");(r==="butt"||r==="round"||r==="square")&&(t.cap=r);let o=o2(e,"stroke-linejoin");o==="miter"||o==="round"||o==="bevel"?t.join=o:(o==="miter-clip"||o==="arcs")&&(t.join="miter");let a=o2(e,"stroke-dasharray");if(a!==void 0&&a!=="inherit"){let l=a==="none"?[]:a.split(/[\s,]+/).filter(Boolean).map(Number),u=l.length>0&&l.every(x=>Number.isFinite(x)&&x>=0)&&l.some(x=>x>0);t.dash=u?l.length%2===1?[...l,...l]:l:void 0}return t}
function aC(e){let C=e===void 0?null:/^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(e);return C?C[1]:void 0}
function Kh(e,C,t){let L=C.get(e);if(!L)return null;if(L.name==="linearGradient"||L.name==="radialGradient"){let n=ei(L,C,0);if(n.length===0)return null;if(n.length===1)return n[0].paint;let i=0,s=0,r=0,o=0,a=0;for(let l=0;l+1<n.length;l++){let u=Math.max(0,n[l+1].offset-n[l].offset);for(let x of[n[l],n[l+1]])s+=x.paint.color.r*u,r+=x.paint.color.g*u,o+=x.paint.color.b*u,a+=x.paint.opacity*u;i+=2*u}return i>0?{color:{r:Math.round(s/i),g:Math.round(r/i),b:Math.round(o/i)},opacity:a/i}:n[0].paint}if(L.name==="pattern"){let n=Li(L,t);return n?{color:n,opacity:Gh}:null}return null}
function ei(e,C,t){let L=e.children.filter(i=>i.name==="stop").map(i=>{let s=o2(i,"offset")??"0",r=j5(s.endsWith("%")?parseFloat(s)/100:parseFloat(s)||0),o=N7(o2(i,"stop-color")??"black",S7)??S7,a=j5(parseFloat(o2(i,"stop-opacity")??"1"));return{offset:r,paint:{color:o,opacity:Number.isFinite(a)?a:1}}});if(L.length>0||t>v7)return L;let n=C.get(T7(e)??"");return n?ei(n,C,t+1):[]}
function Li(e,C){for(let t of e.children){for(let n of["fill","stroke"]){let i=o2(t,n);if(i&&i!=="none"&&aC(i)===void 0){let s=i==="currentColor"?C:N7(i,C);if(s)return s}}let L=Li(t,C);if(L)return L}}
function Ci(e){let C=e.attrs,t=L=>K4(L)??0;switch(e.name){case"path":return C.d??"";case"rect":{let L=t(C.width),n=t(C.height);if(!(L>0&&n>0))return"";let i=t(C.x),s=t(C.y),r=K4(C.rx),o=K4(C.ry);return r===void 0&&(r=o),o===void 0&&(o=r),r=Math.min(Math.max(0,r??0),L/2),o=Math.min(Math.max(0,o??0),n/2),r>0&&o>0?`M${i+r} ${s}H${i+L-r}A${r} ${o} 0 0 1 ${i+L} ${s+o}V${s+n-o}A${r} ${o} 0 0 1 ${i+L-r} ${s+n}H${i+r}A${r} ${o} 0 0 1 ${i} ${s+n-o}V${s+o}A${r} ${o} 0 0 1 ${i+r} ${s}Z`:`M${i} ${s}H${i+L}V${s+n}H${i}Z`}case"circle":case"ellipse":{let L=t(C.cx),n=t(C.cy),i=e.name==="circle"?t(C.r):t(C.rx),s=e.name==="circle"?t(C.r):t(C.ry);return i>0&&s>0?`M${L+i} ${n}A${i} ${s} 0 1 1 ${L-i} ${n}A${i} ${s} 0 1 1 ${L+i} ${n}Z`:""}case"line":return`M${t(C.x1)} ${t(C.y1)}L${t(C.x2)} ${t(C.y2)}`;case"polyline":case"polygon":{let L=(C.points??"").trim().split(/[\s,]+/).filter(Boolean).map(Number);if(L.length<4||L.some(i=>!Number.isFinite(i)))return"";let n=`M${L[0]} ${L[1]}`;for(let i=2;i+1<L.length;i+=2)n+=`L${L[i]} ${L[i+1]}`;return e.name==="polygon"?n+"Z":n}default:return}}
function s3(e,C){return[e[0]*C[0]+e[2]*C[1],e[1]*C[0]+e[3]*C[1],e[0]*C[2]+e[2]*C[3],e[1]*C[2]+e[3]*C[3],e[0]*C[4]+e[2]*C[5]+e[4],e[1]*C[4]+e[3]*C[5]+e[5]]}
function rC(e){if(e===void 0||e.trim()==="")return R7;let C=R7,t=/\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)\s*,?/gy,L=0;for(let n=t.exec(e);n;n=t.exec(e)){L=t.lastIndex;let i=n[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);if(i.some(s=>!Number.isFinite(s)))throw new u2(`unreadable transform ${n[0]}`);C=s3(C,Qh(n[1],i))}if(e.slice(L).trim()!=="")throw new u2(`unreadable transform ${e}`);return C}
function Qh(e,C){let[t=0,L,n]=C;switch(e){case"matrix":if(C.length!==6)throw new u2("matrix() takes six numbers");return C;case"translate":return[1,0,0,1,t,L??0];case"scale":return[t,0,0,L??t,0,0];case"rotate":{let i=t*Math.PI/180,s=Math.cos(i),r=Math.sin(i),o=[s,r,-r,s,0,0];return L===void 0||n===void 0?o:s3(s3([1,0,0,1,L,n],o),[1,0,0,1,-L,-n])}case"skewX":return[1,0,Math.tan(t*Math.PI/180),1,0,0];case"skewY":return[1,Math.tan(t*Math.PI/180),0,1,0,0];default:return R7}}
function N7(e,C){let t=e.trim().toLowerCase();if(t==="currentcolor")return C;let L=/^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t);if(L){let i=L[1],s=i.length===3?[...i].map(r=>r+r).join(""):i;return{r:parseInt(s.slice(0,2),16),g:parseInt(s.slice(2,4),16),b:parseInt(s.slice(4,6),16)}}let n=/^rgba?\(([^)]*)\)$/.exec(t);if(n){let i=n[1].split(/[\s,/]+/).filter(Boolean);if(i.length<3)return;let s=u=>u.endsWith("%")?parseFloat(u)/100*255:parseFloat(u),[r,o,a]=i.slice(0,3).map(s);if(![r,o,a].every(Number.isFinite))return;let l=u=>Math.min(255,Math.max(0,Math.round(u)));return{r:l(r),g:l(o),b:l(a)}}return Zh[t]}
var j5=e=>Number.isFinite(e)?Math.min(1,Math.max(0,e)):1;
function li(e){let C=e.trim().split(/\s+/,1)[0].toLowerCase();if(C==="latex"||C==="tex")return"latex";if(C==="tikz")return"tikz"}
function ui(e,C){return C!=="latex"||xi(e)?!0:/\\begin\{(?:tikzpicture|tikzcd|circuitikz|axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|ternaryaxis|picture|forest|chemfig)\}|\\(?:tikz|chemfig|schemestart|chemname|ctikzset|draw|SI|qty|si|unit|num)\b/.test(e)}
function xi(e){return/^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(e)||/\\begin\{document\}/.test(e)}
var Jh=["\\documentclass[dvisvgm,border=1pt]{standalone}","\\usepackage{amsmath,amssymb}","\\usepackage{tikz}",`\\usetikzlibrary{${Yh}}`,"\\usepackage{pgfplots}","\\pgfplotsset{compat=1.18}","\\usepgfplotslibrary{fillbetween}","\\usepackage{chemfig}","\\usepackage{circuitikz}","\\usepackage{tikz-cd}","\\usepackage{siunitx}"];
var ni=/^[ \t]*\\(?:usepackage|RequirePackage|usetikzlibrary|usepgfplotslibrary|usepgflibrary|usegdlibrary)\b[^\n]*$/gm;
function pi(e,C){let t=e.replace(/^\s*\n/,"").replace(/\s+$/,"");if(C==="latex"&&xi(t)){let o=/^(?:\s|%[^\n]*\n)*\\documentclass\b/.test(t),a=o?t:`\\documentclass[dvisvgm,border=1pt]{standalone}
${t}`;return{text:`\\def\\pgfsysdriver{pgfsys-dvisvgm.def}\\PassOptionsToPackage{dvisvgm}{graphicx}
${a.replace(/\\begin\{document\}/,"\\begin{document}\\pagestyle{empty}\\thispagestyle{empty}")}
`,offset:o?1:2,baseline:"bottom",fontSize:Cd(a)}}let L=[...t.matchAll(ni)].map(o=>o[0].trim()),n=L.length>0?t.replace(ni,""):t;C==="tikz"&&!/\\begin\{tikzpicture\}|\\tikz\b/.test(n)&&(n=`\\begin{tikzpicture}
${n}
\\end{tikzpicture}`);let i=[...Jh,...L,"\\begin{document}"],s=C==="tikz"&&n!==t&&n.startsWith(`\\begin{tikzpicture}
`)&&!t.startsWith("\\begin{tikzpicture}"),r=i.length+(s?1:0);return{text:`${i.join(`
`)}
${n}
\\end{document}
`,offset:r,baseline:"bottom",fontSize:10}}
var si=/^\\begin\{(equation|align|gather|multline|flalign|alignat|eqnarray)\*?\}/;
function hi(e,C){let t=e.trim();if(!C){let i=[...ii.slice(0,3),"\\usepackage[active,tightpage]{preview}","\\begin{document}"];return{text:`${i.join(`
`)}
\\begin{preview}$${t}$\\end{preview}
\\end{document}
`,offset:i.length,baseline:"origin",fontSize:10}}let L=[...ii,"\\begin{document}"],n=si.test(t)?t:`\\[
${t}
\\]`;return{text:`${L.join(`
`)}
${n}
\\end{document}
`,offset:L.length+(si.test(t)?0:1),baseline:"bottom",fontSize:10}}
function Cd(e){let C=/\\documentclass\s*\[([^\]]*)\]/.exec(e)?.[1]??"",t=/(?:^|,)\s*(\d{1,2}(?:\.\d+)?)pt\s*(?:,|$)/.exec(C)?.[1],L=t===void 0?10:Number(t);return L>=5&&L<=25?L:10}
function cC(e){return 72.27/72/e.fontSize}
var ed=new RegExp(String.raw`\\(?:${td.map(e=>e.replace(/[*]/g,"\\*")).join("|")})(?![A-Za-z@])`);
var Ld=new Set(["shellesc","minted","pythontex","sagetex","bashful","gnuplottex","svg","epstopdf","auto-pst-pdf","pst-pdf","luacode","luatextra","luapackageloader","fontspec","filecontents","catchfile","verbatim","fancyvrb","listings","import","standalone","datatool","csvsimple","readarray","pgfplotstable","xstring","docmute","subfiles","embedfile","attachfile","attachfile2","write18","pstricks","pst-node"]);
var nd=/\\(?:usepackage|RequirePackage|documentclass|LoadClass|usetikzlibrary|usepgfplotslibrary|usepgflibrary)\s*(?:\[[^\]]*\]\s*)?(?:\{([^}]*)\}|([^\s{\\][^\s\\]*))/g;
var id=/\b(?:table|file|graphics)\s*(?:\[[^\]]*\]\s*)?\{([^}\\\n]*)\}/g;
var sd=/\b(?:table|file|graphics)\s*(?:\[[^\]]*\]\s*)?\{\s*\\[A-Za-z]/;
function di(e){if(e.length>24e3)return"source longer than 24000 characters";if(e.includes("^^"))return"uses ^^ character notation";if(/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(e))return"holds control characters";let C=ed.exec(e);if(C)return`uses ${C[0]}`;let t=/\\[A-Za-z]*@[A-Za-z@]*/.exec(e);if(t)return`uses ${t[0]}`;if(/\\begin\{(?:luacode\*?|filecontents\*?|verbatimwrite|VerbatimOut|lstlisting|minted|pycode|sagesilent|sageblock|bash)\}/.test(e))return"uses an environment that runs code or writes files";for(let n of e.matchAll(nd)){let i=(n[1]??n[2]??"").split(",");for(let s of i){let r=s.trim();if(ri(r))return`reads ${r}`;if(/^\\(?:usepackage|RequirePackage)/.test(n[0])&&Ld.has(r))return`uses the ${r} package`}}for(let n of e.matchAll(id)){let i=n[1].trim();if(i!==""&&ri(i))return`reads ${i}`}if(sd.test(e))return"reads a plot file named by a macro";if(/\bgnuplot\b|\\addplot[^;]*\bshell\b/.test(e))return"runs gnuplot or a shell";let L=/(?:^|[\s{=,(])((?:~|\$HOME|\$\{HOME\})\/|\.\.[/\\]|\/+(?:home|root|etc|Users|private|var|tmp|proc|sys|dev|run|mnt|media|srv|opt|usr|Library|Volumes|System|boot|snap|nix)\b)/.exec(e);if(L)return`names a path outside the picture (${L[1]})`}
function ri(e){return/^[/\\~]|^[A-Za-z]:|\.\.|^\.|\$|\||[`"'<>]|^\s*-/.test(e)||/[/\\]\./.test(e)}
var fi=64*1024*1024;
function gi(e){return["bwrap",...Mi(e,void 0),"true"]}
function Mi(e,C){let t=["--ro-bind","/","/","--dev","/dev","--proc","/proc"];for(let L of e)t.push("--tmpfs",L);return C!==void 0&&t.push("--bind",C,C,"--chdir",C),t.push("--unshare-all","--die-with-parent","--new-session"),t}
function Ai(e,C,t){let L=[...e];return t.bwrap&&(L=["bwrap",...Mi(t.bwrap.hide,C),...L]),t.prlimit&&(L=["prlimit",`--fsize=${fi}`,`--cpu=${mi}`,...L]),L}
var Ei=["latex","-no-shell-escape","-interaction=nonstopmode","-halt-on-error","-no-mktex=tex","-no-mktex=tfm","-no-mktex=pk",`-jobname=${q5}`,`${q5}.tex`];
function bi(e){return["dvisvgm","--no-fonts","--exact-bbox","--no-specials=ps,pdf,html","--no-mktexmf","--cache=none",`--tmpdir=${e}`,"--page=1","--stdout","--verbosity=1",`${q5}.dvi`]}
function Di(e){return{shell_escape:"f",openin_any:"p",openout_any:"p",TEXMFOUTPUT:e,HOME:e,MKTEXTEX:"0",MKTEXTFM:"0",MKTEXPK:"0",MKTEXMF:"0",MKTEXFMT:"0",max_print_line:"1000",error_line:"254",half_error_line:"238"}}
function yi(e){return`${(e&&e.startsWith("/")?e:"/tmp").replace(/\/+$/,"")}/kittex-tex.XXXXXXXXXX`}
function ki(e){return/^\/(?:[^\n/]+\/)*kittex-tex\.[A-Za-z0-9]{10}$/.test(e)&&!e.includes("/../")&&!e.includes("/./")}
function Bi(e,C=0){let t=e.split(/\r?\n/),L=t.findIndex(s=>s.startsWith("! "));if(L<0)return/No pages of output/.test(e)?"the picture is empty":/Emergency stop|Fatal error/.test(e)?"TeX stopped":"TeX failed";let n=t[L].slice(2).trim().replace(/\.$/,"");n=n.replace(/^(?:LaTeX|Package \S+|Class \S+) Error:\s*/,"");let i;for(let s of t.slice(L+1,L+12)){let r=/^l\.(\d+) (.*)$/.exec(s);if(r){let o=Number(r[1])-C;if(o>=1&&(i=o),/^Undefined control sequence$/.test(n)){let a=/(\\[A-Za-z@]+|\\.)\s*$/.exec(r[2])?.[1];a&&(n+=` ${a}`)}break}}return i===void 0?n:`${n} (line ${i})`}
function I7(e){return O7(e).l>.5?{r:24,g:24,b:24}:{r:255,g:255,b:255}}
function P7(e,C,t){if(e.r<=2&&e.g<=2&&e.b<=2)return C.ink;if(e.r>=253&&e.g>=253&&e.b>=253)return"erase";let L=O7(e),n=O7(C.ink).l,i=O7(C.background).l,s=L.l;if(i<.5){let r=n+L.l*(i-n),o=Math.hypot(L.a,L.b),a=uC(o/.12)*uC(1-Math.abs(L.l-.55)/.4);s=r+(L.l-r)*a}if(s===L.l&&!(t&&Math.abs(s-i)<.3))return{...e};if(t&&Math.abs(s-i)<.3){let r=n>=i?1:-1;s=uC(i+r*.3)}return od(s,L.a,L.b)}
var lC=e=>{let C=e/255;return C<=.04045?C/12.92:((C+.055)/1.055)**2.4};
var rd=e=>(e<=.0031308?12.92*e:1.055*e**(1/2.4)-.055)*255;
function O7(e){let C=lC(e.r),t=lC(e.g),L=lC(e.b),n=Math.cbrt(.4122214708*C+.5363325363*t+.0514459929*L),i=Math.cbrt(.2119034982*C+.6806995451*t+.1073969566*L),s=Math.cbrt(.0883024619*C+.2817188376*t+.6299787005*L);return{l:.2104542553*n+.793617785*i-.0040720468*s,a:1.9779984951*n-2.428592205*i+.4505937099*s,b:.0259040371*n+.7827717662*i-.808675766*s}}
function wi(e,C,t){let L=(e+.3963377774*C+.2158037573*t)**3,n=(e-.1055613458*C-.0638541728*t)**3,i=(e-.0894841775*C-1.291485548*t)**3;return[4.0767416621*L-3.3077115913*n+.2309699292*i,-1.2684380046*L+2.6097574011*n-.3413193965*i,-.0041960863*L-.7034186147*n+1.707614701*i]}
function od(e,C,t){let L=a=>wi(e,C*a,t*a).every(l=>l>=-1e-6&&l<=1.000001),n=1;if(!L(1)){let a=0,l=1;for(let u=0;u<20;u++){let x=(a+l)/2;L(x)?a=x:l=x}n=a}let[i,s,r]=wi(e,C*n,t*n),o=a=>Math.min(255,Math.max(0,Math.round(rd(Math.min(1,Math.max(0,a))))));return{r:o(i),g:o(s),b:o(r)}}
var uC=e=>Math.min(1,Math.max(0,e));
function ad(e,C){return oC(e,{baseline:C.baseline,emPerUnit:cC(C)})}
var v6=class{width;height;stride;acc;constructor(C,t){this.width=C,this.height=t,this.stride=C+2,this.acc=new Float32Array(this.stride*t)}fill(C,t){let L=C.length,n=C[L-2],i=C[L-1];for(let s=0;s<L;s+=2){let r=C[s],o=C[s+1];this.line(n,i,r,o,t),n=r,i=o}}line(C,t,L,n,i){if(t===n)return;let s=this.width;if(C>=0&&L>=0&&C<=s&&L<=s){this.edge(C,t,L,n,i);return}let r=[0,1];for(let o of[0,s])(C-o)*(L-o)<0&&r.push((o-C)/(L-C));r.sort((o,a)=>o-a);for(let o=1;o<r.length;o++){let a=r[o-1],l=r[o],u=C+(L-C)*a,x=C+(L-C)*l,p=t+(n-t)*a,h=t+(n-t)*l;this.edge(Math.min(s,Math.max(0,u)),p,Math.min(s,Math.max(0,x)),h,i)}}edge(C,t,L,n,i){if(t===n)return;let s=i,r=C,o=t,a=L,l=n;o>l&&(s=-i,r=L,o=n,a=C,l=t);let u=this.height;if(l<=0||o>=u)return;let x=this.acc,p=this.stride,h=(a-r)/(l-o),d=r;o<0&&(d-=o*h);let m=Math.max(0,Math.floor(o)),b=Math.min(u,Math.ceil(l));for(let B=m;B<b;B++){let A=B*p,k=Math.min(B+1,l)-Math.max(B,o),D=d+h*k,v=k*s,F=d<D?d:D,y=d<D?D:d,S=Math.floor(F),I=S,U=Math.ceil(y),H=U;if(H<=I+1){let q=.5*(d+D)-S;x[A+I]+=v-v*q,x[A+I+1]+=v*q}else{let q=1/(y-F),z=F-S,j=.5*q*(1-z)*(1-z),W=y-U+1,X=.5*q*W*W;if(x[A+I]+=v*j,H===I+2)x[A+I+1]+=v*(1-j-X);else{let t1=q*(1.5-z);x[A+I+1]+=v*(t1-j);for(let e1=I+2;e1<H-1;e1++)x[A+e1]+=v*q;let J=t1+(H-I-3)*q;x[A+H-1]+=v*(1-J-X)}x[A+H]+=v*X}d=D}}toAlphaEvenOdd(){let{width:C,height:t,stride:L,acc:n}=this,i=new Uint8Array(C*t);for(let s=0;s<t;s++){let r=0,o=s*L,a=s*C;for(let l=0;l<C;l++){r+=n[o+l];let u=(r<0?-r:r)%2;u>1&&(u=2-u),i[a+l]=u*255+.5|0}}return i}toAlpha(C){let{width:t,height:L,stride:n,acc:i}=this,s=new Uint8Array(t*L);for(let r=0;r<L;r++){let o=0,a=r*n,l=r*t;for(let u=0;u<t;u++){o+=i[a+u];let x=o<0?-o:o,p=x>=1?255:x*255+.5|0;s[l+u]=C?C[p]:p}}return s}};
var V2=Uint8Array;
var F2=Uint16Array;
var fC=Int32Array;
var mC=new V2([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]);
var gC=new V2([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]);
var Fi=new V2([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);
var Ti=function(e,C){for(var t=new F2(31),L=0;L<31;++L)t[L]=C+=1<<e[L-1];for(var n=new fC(t[30]),L=1;L<30;++L)for(var i=t[L];i<t[L+1];++i)n[i]=i-t[L]<<5|L;return{b:t,r:n}};
var Ni=Ti(mC,2);
var cd=Ni.b;
var pC=Ni.r;
cd[28]=258,pC[258]=28;
var Oi=Ti(gC,0);
var PA=Oi.b;
var vi=Oi.r;
var hC=new F2(32768);
for(w1=0;w1<32768;++w1)b3=(w1&43690)>>1|(w1&21845)<<1,b3=(b3&52428)>>2|(b3&13107)<<2,b3=(b3&61680)>>4|(b3&3855)<<4,hC[w1]=((b3&65280)>>8|(b3&255)<<8)>>1;
var b3;
var w1;
var X5=(function(e,C,t){for(var L=e.length,n=0,i=new F2(C);n<L;++n)e[n]&&++i[e[n]-1];var s=new F2(C);for(n=1;n<C;++n)s[n]=s[n-1]+i[n-1]<<1;var r;if(t){r=new F2(1<<C);var o=15-C;for(n=0;n<L;++n)if(e[n])for(var a=n<<4|e[n],l=C-e[n],u=s[e[n]-1]++<<l,x=u|(1<<l)-1;u<=x;++u)r[hC[u]>>o]=a}else for(r=new F2(L),n=0;n<L;++n)e[n]&&(r[n]=hC[s[e[n]-1]++]>>15-e[n]);return r});
var Q4=new V2(288);
for(w1=0;w1<144;++w1)Q4[w1]=8;
var w1;
for(w1=144;w1<256;++w1)Q4[w1]=9;
var w1;
for(w1=256;w1<280;++w1)Q4[w1]=7;
var w1;
for(w1=280;w1<288;++w1)Q4[w1]=8;
var w1;
var _7=new V2(32);
for(w1=0;w1<32;++w1)_7[w1]=5;
var w1;
var ld=X5(Q4,9,0);
var ud=X5(_7,5,0);
var Ii=function(e){return(e+7)/8|0};
var xd=function(e,C,t){return(C==null||C<0)&&(C=0),(t==null||t>e.length)&&(t=e.length),new V2(e.subarray(C,t))};
var D3=function(e,C,t){t<<=C&7;var L=C/8|0;e[L]|=t,e[L+1]|=t>>8};
var U5=function(e,C,t){t<<=C&7;var L=C/8|0;e[L]|=t,e[L+1]|=t>>8,e[L+2]|=t>>16};
export{V2,F2,Ii,D3,Fi,Q4,_7,X5,ld,ud,U5,mC,gC,fC,pC,vi,xd,v6,I7,P7,Ei,u2,H5,Xn,gi,Ai,pi,li,ui,bi,ki,yi,Ph,Ih,Oh,_h,zh,hi,Di,Bi,ad,di};
