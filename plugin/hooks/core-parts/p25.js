import{ux,tx,m9,Hg,Dx,Vg,Xg,Yg,Jg,tM,Hx,Gx,PL,uM,UL,Ou,k3,Y3,N9,F1,T9,qL,T6,X7,$7,GL,yC,DM,m7,eL,Iu,MM,EM,I7,kM,P7,BC,lp,ns,ss,is}from'./p24.js';export*from'./p24.js';
function Mx(e,C){try{let t=C.breakLines?C.maxWidth:void 0,L=ux(tx(e),C.display,{compact:C.display&&C.compact===!0,breakWidth:t,tight:C.tight});return!C.display&&L.rows.length!==1&&t===void 0||C.maxWidth!==void 0&&L.width>C.maxWidth?null:{lines:m9(L),baseline:L.base,width:L.width}}catch{return null}}
function Ax(e){return"#"+[e.r,e.g,e.b].map(C=>C.toString(16).padStart(2,"0")).join("")}
function A6(e){let C=e.trim().toLowerCase(),t=Hg[C.replace(/\s+/g,"")];if(t)return t;let L=/^#?([0-9a-f]+)$/.exec(C);if(L){let i=L[1];if(!C.startsWith("#")&&i.length!==3&&i.length!==6||i.length%3!==0||i.length>12)return;let s=i.length/3,[r,o,a]=[0,1,2].map(l=>D9(i.slice(l*s,(l+1)*s)));return{r,g:o,b:a}}let n=/^rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})$/.exec(C);if(n)return{r:D9(n[1]),g:D9(n[2]),b:D9(n[3])}}
function D9(e){if(e.length===2)return parseInt(e,16);let C=16**e.length-1;return Math.round(parseInt(e,16)/C*255)}
function jg(e){let C=t=>{let L=t/255;return L<=.04045?L/12.92:((L+.055)/1.055)**2.4};return .2126*C(e.r)+.7152*C(e.g)+.0722*C(e.b)}
function yL(e){return jg(e)<.18}
function Ex(e){if(!Number.isInteger(e)||e<16||e>255)return;if(e>=232){let L=8+(e-232)*10;return{r:L,g:L,b:L}}let C=L=>L===0?0:55+L*40,t=e-16;return{r:C(Math.floor(t/36)),g:C(Math.floor(t/6)%6),b:C(t%6)}}
function R5(e){return e.HOME||void 0}
function E6(e,C,t){let L=e.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,(n,i,s)=>C[i??s]??n);if(L==="~"||L.startsWith("~/")){let n=R5(C);if(!n)return;L=n+L.slice(1)}if(!L.startsWith("/")){if(!t)return;L=t.replace(/\/+$/,"")+"/"+L}return qg(L)}
function y9(e){let C=e.replace(/\/+$/,"").lastIndexOf("/");return C<=0?"/":e.slice(0,C)}
function qg(e){let C=[];for(let t of e.split("/"))t===""||t==="."||(t===".."?C.pop():C.push(t));return"/"+C.join("/")}
function p7(e){if(e.XDG_CONFIG_HOME?.startsWith("/"))return e.XDG_CONFIG_HOME.replace(/\/+$/,"");let C=R5(e);return C?`${C}/.config`:void 0}
async function h7(e,C){if(C)try{return await e(C)}catch{return}}
var Ug=[[/(?:extra|ultra)[-_\s]?light/i,200],[/(?:semi|demi)[-_\s]?bold/i,600],[/(?:extra|ultra)[-_\s]?bold/i,800],[/thin|hairline/i,100],[/black|heavy/i,900],[/light/i,300],[/retina/i,450],[/medium/i,500],[/bold/i,700],[/regular|normal|book|roman/i,400]];
function d7(e){for(let C of e){if(!C)continue;let t=/\bwght\s*[=:]\s*(\d{3})\b/i.exec(C);if(t)return bx(Number(t[1]));if(/^\s*\d{3}\s*$/.test(C))return bx(Number(C));for(let[L,n]of Ug)if(L.test(C))return n}}
function bx(e){return Math.min(900,Math.max(100,e))}
var Kg=[1908513,13395558,11910504,15779444,8495806,11703483,9092791,12961990,6710886,13979219,12175946,15189319,8038106,12818392,7389361,15395562].map(e=>({r:e>>16,g:e>>8&255,b:e&255}));
function k9(e){let C=[];for(let t of e.split(`
`)){let L=t.trim();if(!L||L.startsWith("#"))continue;let n=L.indexOf("=");if(n<0)continue;let i=L.slice(0,n).trim(),s=L.slice(n+1).trim();s.length>=2&&s.startsWith('"')&&s.endsWith('"')&&(s=s.slice(1,-1)),C.push([i,s])}return C}
function yx(e){let C=e.trim();if(!C)return;if(!/[,:=]/.test(C))return{light:C,dark:C};let t,L;for(let n of C.split(",")){let i=/^\s*(light|dark)\s*[:=]\s*(.+?)\s*$/.exec(n);i?.[1]==="light"?t=i[2]:i?.[1]==="dark"&&(L=i[2])}return t&&L?{light:t,dark:L}:void 0}
function kx(e){let C=e.trim();if(C.endsWith("%")){let t=Number(C.slice(0,-1));return C.length<2||!Number.isFinite(t)?void 0:{factor:Math.max(0,1+t/100)}}return/^[+-]?\d+$/.test(C)?{px:Number(C)}:void 0}
function kL(){return{values:new Map,palette:new Map,adjust:{},font:{}}}
function Bx(e){let C=e.trim();return C==="native"||C==="linear"||C==="linear-corrected"?C:void 0}
function wx(e){return e==="darwin"?"native":"linear-corrected"}
function BL(e,C,t){if(Object.prototype.hasOwnProperty.call(Dx,C)){let L=Dx[C],n=t?kx(t):void 0;n?e.adjust[L]=n:delete e.adjust[L]}else if(C==="font-family"||C==="font-style"||C==="font-variation"){let L=C==="font-family"?"family":C==="font-style"?"style":"variation";t?(L!=="family"||e.font.family===void 0)&&(e.font[L]=t):delete e.font[L]}else if(C==="font-size"){let L=Number(t);t&&L>0&&Number.isFinite(L)?e.font.size=L:delete e.font.size}else if(C==="alpha-blending")e.alphaBlending=Bx(t);else if(C==="foreground"||C==="background"){if(!t){e.values.delete(C);return}let L=A6(t);L&&e.values.set(C,L)}else if(C==="palette"){let L=/^\s*(0x[0-9a-f]+|0o[0-7]+|0b[01]+|\d+)\s*=\s*(.+)$/i.exec(t);if(!L)return;let n=Number(L[1].toLowerCase()),i=A6(L[2]);i&&n>=0&&n<16&&e.palette.set(n,i)}}
function Fx(e){return e==="unicode"||e==="legacy"?e:void 0}
function vx(...e){let C=a=>e.reduce((l,u)=>u.values.get(a)??l,void 0),t={foreground:C("foreground")??Vg,background:C("background")??Xg,palette:Kg.map((a,l)=>e.reduce((u,x)=>x.palette.get(l)??u,a))},L=e.reduce((a,l)=>l.alphaBlending??a,void 0);L&&(t.alphaBlending=L);let n=Object.assign({},...e.map(a=>a.adjust));Object.keys(n).length>0&&(t.cellAdjust=n);let i=Object.assign({},...e.map(a=>a.font)),s=i.style===void 0||["default","true","false"].includes(i.style)?void 0:i.style,r=d7([i.variation,s,i.family])??(i.family===void 0&&s===void 0?400:void 0);r&&(t.fontWeight=r);let o={};return i.family&&(o.family=i.family),i.family&&s&&(o.style=s),i.size&&(o.sizePt=i.size),Object.keys(o).length>0&&(t.font=o),t}
function Sx(e,C){let t=kL(),L,n;for(let[i,s]of k9(e))i==="theme"?L=yx(s):i==="grapheme-width-method"?n=Fx(s):BL(t,i,s);if(!(!t.values.has("foreground")&&!t.values.has("background"))&&!(C==="dark"&&L&&L.light!==L.dark))return{...vx(t),...n?{graphemeWidth:n}:{}}}
function Rx(e,C){let t=[];return e.GHOSTTY_BIN_DIR?.startsWith("/")&&t.push(`${e.GHOSTTY_BIN_DIR.replace(/\/+$/,"")}/ghostty`),t.push("ghostty","/Applications/Ghostty.app/Contents/MacOS/ghostty"),t.map(L=>({argv:[L,"+show-config","--changes-only=false"],parse:n=>Sx(n,C)}))}
function Qg(e,C){let t=[],L=p7(e);L&&t.push(`${L}/ghostty/config`,`${L}/ghostty/config.ghostty`);let n=R5(e);if(n&&(C===void 0||C==="darwin")){let i=`${n}/Library/Application Support/com.mitchellh.ghostty`;t.push(`${i}/config`,`${i}/config.ghostty`)}return t}
function Zg(e){let C=[],t=p7(e);return t&&C.push(`${t}/ghostty/themes`),e.GHOSTTY_RESOURCES_DIR?.startsWith("/")?C.push(`${e.GHOSTTY_RESOURCES_DIR.replace(/\/+$/,"")}/themes`):(e.GHOSTTY_BIN_DIR?.startsWith("/")&&C.push(E6("../share/ghostty/themes",e,e.GHOSTTY_BIN_DIR)),C.push("/Applications/Ghostty.app/Contents/Resources/ghostty/themes","/usr/share/ghostty/themes","/usr/local/share/ghostty/themes")),C}
async function wL(e,C){let{env:t}=C,L=kL(),n,i,s=Qg(t,C.platform),r=new Set;for(let u=0;u<s.length&&u<64;u++){let x=s[u];if(r.has(x))continue;r.add(x);let p=await h7(e,x);if(p!==void 0)for(let[h,d]of k9(p))if(h==="config-file"){if(!d)continue;let m=E6(d.startsWith("?")?d.slice(1):d,t,y9(x));m&&s.push(m)}else h==="theme"?n=yx(d):h==="grapheme-width-method"?i=Fx(d):BL(L,h,d)}let o=kL(),a=n&&(C.scheme==="dark"?n.dark:n.light);if(a){let u=a.startsWith("/")||a.startsWith("~/")?[E6(a,t)]:a.includes("/")?[]:Zg(t).map(x=>`${x}/${a}`);for(let x of u){let p=await h7(e,x);if(p!==void 0){for(let[h,d]of k9(p))BL(o,h,d);break}}}let l=vx(o,L);return!l.alphaBlending&&C.platform!==void 0&&(l.alphaBlending=wx(C.platform)),{...l,...i?{graphemeWidth:i}:{}}}
var CM=[0,13370371,1690368,13552384,881612,13311697,904653,14540253,7763574,15867935,2358528,16776448,1740799,16591103,1376255,16777215].map(e=>({r:e>>16,g:e>>8&255,b:e&255}));
var eM=String.raw`
from kitty.cli import create_default_opts
def h(v):
    return '#%06x' % (int(v) & 0xffffff)
keys = ['foreground', 'background'] + ['color%d' % i for i in range(16)]
o = create_default_opts()
print('foreground', h(o.foreground))
print('background', h(o.background))
for i in range(16):
    print('color%d' % i, h(o.color_table[i]))
try:
    import json
    f = o.font_family
    if isinstance(f, str):
        names = [f]
    else:
        names = [str(a) for a in (getattr(f, 'axes', None) or ())]
        names += [getattr(f, k, None) for k in ('style', 'full_name', 'postscript_name', 'family', 'created_from_string')]
    print('font_spec', json.dumps([n for n in names if isinstance(n, str) and n]))
except Exception:
    pass
try:
    print('font_size', float(o.font_size))
    for k, m in o.modify_font.items():
        if k in ('cell_width', 'cell_height', 'baseline'):
            v, u = m.mod_value
            print('modify_font', k, float(v), getattr(u, 'name', u))
    print('text_composition', o.text_composition_strategy)
except Exception:
    pass
try:
    from kitty.fonts.render import get_font_files
    f = get_font_files(o)['medium']
    if isinstance(f, dict) and f.get('path'):
        print('font_file', int(f.get('index') or 0), f['path'])
except Exception:
    pass
try:
    from kitty.colors import theme_colors
    theme_colors.refresh()
    for name in ('dark', 'light', 'no_preference'):
        if getattr(theme_colors, 'has_%s_theme' % name):
            spec = getattr(theme_colors, '%s_spec' % name)
            for k in keys:
                if spec.get(k) is not None:
                    print('%s:%s' % (name, k), h(spec[k]))
except Exception:
    pass
`;
function SL(e,C){let t=new Map,L=new Map,n,i={},s={},r;for(let a of e.split(`
`)){if(a.startsWith("font_spec ")){n=d7(LM(a.slice(10)));continue}let l=/^(font_size|font_file|modify_font|text_composition) (.*)$/.exec(a);if(l){let[,h,d]=l;if(h==="font_size"){let m=Number(d);m>0&&Number.isFinite(m)&&(i.sizePt=m)}else if(h==="font_file"){let m=/^(\d+) (\/.+)$/.exec(d);m&&([i.index,i.file]=[Number(m[1]),m[2]])}else if(h==="modify_font"){let m=/^(cell_width|cell_height|baseline) (-?[\d.]+) (pt|pixel|percent)$/.exec(d),b=m&&{cell_width:"cellWidth",cell_height:"cellHeight",baseline:"baseline"}[m[1]];m&&b&&Number.isFinite(Number(m[2]))&&(s[b]={value:Number(m[2]),unit:m[3]==="pixel"?"px":m[3]==="percent"?"%":"pt"})}else r=Tx(d);continue}let u=/^\s*(?:(dark|light|no_preference):)?([a-z_0-9]+)\s+(\S+)\s*$/.exec(a);if(!u)continue;let x=A6(u[3]);if(!x)continue;(u[1]?L.get(u[1])??L.set(u[1],new Map).get(u[1]):t).set(u[2],x)}let o=C&&L.get(C)||t;if(!(!o.has("foreground")&&!o.has("background")))return{...FL(o),...n?{fontWeight:n}:{},...Object.keys(i).length>0?{font:i}:{},...Object.keys(s).length>0?{kittyAdjust:s}:{},...r?{textComposition:r}:{}}}
function Tx(e){let C=e.trim();if(C==="platform"||C==="legacy")return C;let t=/^(\d+(?:\.\d+)?|\.\d+)(?:\s+(\d+(?:\.\d+)?))?$/.exec(C);if(!t)return;let L=Number(t[1]),n=t[2]===void 0?0:Number(t[2]);return L>=.01&&n<=100?{gamma:L,contrast:n}:void 0}
function LM(e){try{let C=JSON.parse(e);return Array.isArray(C)?C.filter(t=>typeof t=="string"):[]}catch{return[]}}
function FL(e){return{foreground:e.get("foreground")??Yg,background:e.get("background")??Jg,palette:CM.map((C,t)=>e.get(`color${t}`)??C)}}
function Nx(e,C){let t=["kitty"];return e.KITTY_INSTALLATION_DIR?.startsWith("/")&&t.push(`${e.KITTY_INSTALLATION_DIR.replace(/\/+$/,"")}/kitty/launcher/kitty`),t.push("/Applications/kitty.app/Contents/MacOS/kitty"),t.map(L=>({argv:[L,"+runpy",eM],parse:n=>SL(n,C)}))}
function vL(e,C){let t=[],L=s=>{s?.startsWith("/")&&!t.includes(s)&&t.push(s.replace(/\/+$/,""))};if(e.KITTY_CONFIG_DIRECTORY)return[E6(e.KITTY_CONFIG_DIRECTORY,e)??e.KITTY_CONFIG_DIRECTORY];let n=p7(e);L(n&&`${n}/kitty`);let i=R5(e);L(i&&`${i}/.config/kitty`),(C===void 0||C==="darwin")&&L(i&&`${i}/Library/Preferences/kitty`);for(let s of(e.XDG_CONFIG_DIRS??"/etc/xdg").split(":"))L(s&&`${s}/kitty`);return t}
async function RL(e,C){let{env:t}=C,L=new Map,n={read:e,env:t,platform:C.platform,seen:new Set,values:L,lines:[]},i=await B9(n,"/etc/xdg/kitty/kitty.conf"),s;for(let p of vL(t,C.platform))if(await B9(n,`${p}/kitty.conf`)){s=p,i=!0;break}if(s??=vL(t,C.platform)[0],C.scheme&&s){let p=new Map;if(await B9({...n,seen:new Set,values:p},`${s}/${tM[C.scheme]}`))return FL(p)}if(!i)return;let r=n.font===void 0?void 0:/\bstyle\s*=\s*"([^"]*)"/.exec(n.font)?.[1],o=n.font===void 0?void 0:d7([r,n.font]),a=n.font===void 0?void 0:/\bfamily\s*=\s*"([^"]*)"/.exec(n.font)?.[1]??(/=/.test(n.font)?void 0:n.font),l=n.lines.flatMap(([p,h])=>{if(p==="font_size")return[`font_size ${h}`];if(p==="text_composition_strategy")return[`text_composition ${h}`];let d=/^(cell_width|cell_height|baseline)\s+(-?[\d.]+)(%|px)?$/.exec(h);return d?[`modify_font ${d[1]} ${d[2]} ${d[3]==="%"?"percent":d[3]==="px"?"pixel":"pt"}`]:[]}),u=SL(["foreground #000000",...l].join(`
`)),x={...u?.font,...a&&a!=="monospace"?{family:a}:{},...a&&r?{style:r}:{}};return{...FL(L),...o?{fontWeight:o}:{},...Object.keys(x).length>0?{font:x}:{},...u?.kittyAdjust?{kittyAdjust:u.kittyAdjust}:{},textComposition:u?.textComposition??"platform"}}
var nM=/^(foreground|background|color(?:[0-9]|1[0-5]))$/;
async function B9(e,C,t=0){if(e.seen.has(C)||t>16)return!1;let L=await h7(e.read,C);return L===void 0?!1:(e.seen.add(C),await Ox(e,L,y9(C),t),!0)}
async function Ox(e,C,t,L){let n={...e.env,KITTY_OS:e.platform==="darwin"?"macos":e.platform??"linux"};for(let i of C.split(`
`)){let s=i.trim();if(!s||s.startsWith("#"))continue;let r=/^([a-zA-Z][a-zA-Z0-9_-]*)\s+(.+)$/.exec(s);if(!r)continue;let[,o,a]=r;if(o==="include"){let l=E6(a.trim(),n,t);l&&await B9(e,l,L+1)}else if(o==="envinclude"){let l=iM(a.trim());for(let[u,x]of Object.entries(e.env))x!==void 0&&l.test(u)&&await Ox(e,x,t,L+1)}else if(nM.test(o)){let l=A6(a);l&&e.values.set(o,l)}else o==="font_family"?e.font=a.trim():(o==="font_size"||o==="modify_font"||o==="text_composition_strategy")&&e.lines.push([o,a.trim()])}}
function iM(e){let C=e.replace(/[.+^${}()|\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".");return new RegExp(`^${C}$`)}
var sM=String.raw`
use strict;
use Fcntl qw(O_RDONLY O_NOCTTY);
my $req = ($^O eq 'darwin' || $^O =~ /bsd/i) ? 0x40087468 : 0x5413;
my $proc = -d '/proc/self/fd';
sub tty_path {
  my ($t) = @_;
  return unless defined $t && $t =~ m{^(?:/dev/)?(pts/\d+|tty\w+|s\d+)$};
  my $n = $1;
  return '/dev/' . ($n =~ /^s\d/ ? "tty$n" : $n);
}
sub try_size {
  my $t = tty_path($_[0]) or return;
  sysopen(my $h, $t, O_RDONLY | O_NOCTTY) or return;
  my $ws = "\0" x 8;
  ioctl($h, $req, $ws) or return;
  my ($r, $c, $x, $y) = unpack('S4', $ws);
  print "$r $c $x $y\n";
  exit 0;
}
my $p = getppid();
for (1 .. 64) {
  last if !$p || $p <= 1;
  my $next;
  if ($proc) {
    try_size(readlink("/proc/$p/fd/$_")) for 0 .. 2;
    open(my $s, '<', "/proc/$p/stat") or last;
    my ($rest) = (scalar(<$s>) =~ /\)\s+(.*)/s);
    last unless defined $rest;
    $next = (split ' ', $rest)[1];
  } else {
    open(my $ps, '-|', 'ps', '-o', 'ppid=,tty=', '-p', $p) or last;
    my $line = <$ps>;
    close $ps;
    last unless defined $line && $line =~ /^\s*(\d+)\s+(\S+)/;
    $next = $1;
    try_size($2);
  }
  $p = $next;
}
exit 1;
`;
var rM=String.raw`
import fcntl, os, re, struct, subprocess, sys, termios
def tty_path(t):
    m = re.fullmatch(r'(?:/dev/)?(pts/\d+|tty\w+|s\d+)', t or '')
    if not m:
        return None
    n = m.group(1)
    return '/dev/' + ('tty' + n if re.match(r's\d', n) else n)
def try_size(t):
    t = tty_path(t)
    if not t:
        return
    try:
        fd = os.open(t, os.O_RDONLY | os.O_NOCTTY)
    except OSError:
        return
    try:
        r, c, x, y = struct.unpack('4H', fcntl.ioctl(fd, termios.TIOCGWINSZ, b'\0' * 8))
    except OSError:
        return
    finally:
        os.close(fd)
    print(r, c, x, y)
    sys.exit(0)
proc = os.path.isdir('/proc/self/fd')
p = os.getppid()
for _ in range(64):
    if p <= 1:
        break
    if proc:
        for fd in (0, 1, 2):
            try:
                try_size(os.readlink('/proc/%d/fd/%d' % (p, fd)))
            except OSError:
                pass
        try:
            with open('/proc/%d/stat' % p) as f:
                p = int(f.read().rsplit(')', 1)[1].split()[1])
        except (OSError, ValueError, IndexError):
            break
    else:
        try:
            out = subprocess.run(['ps', '-o', 'ppid=,tty=', '-p', str(p)], capture_output=True, text=True).stdout.split()
            p = int(out[0])
        except (OSError, ValueError, IndexError):
            break
        if len(out) > 1:
            try_size(out[1])
sys.exit(1)
`;
function TL(e){let C=/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/m.exec(e);if(!C)return;let[t,L,n,i]=C.slice(1).map(Number);if(!(t>0&&L>0&&n>0&&i>0))return;let s=Math.floor(n/L),r=Math.floor(i/t);if(!(s<1||r<1))return{cellWidth:s,cellHeight:r,columns:L,rows:t}}
var NL={argv:["perl","-e",sM],parse:TL};
var Px={argv:["python3","-I","-c",rM],parse:TL};
var _x=[NL,Px];
function OL(e,C=1.15){return e.cellWidth/.6*C}
function zx(e,C){return{cellWidth:f7(e.cellWidth,C?.width),cellHeight:f7(e.cellHeight,C?.height)}}
function f7(e,C){if(!C)return e;let t="factor"in C?C.factor>0?e/C.factor:e:e-C.px;return Number.isFinite(t)?Math.max(1,Math.round(t)):e}
function Wx(e,C,t){let L=f7(e,t?.height);return $x(e,Math.round(L*C),L,t)}
function $x(e,C,t,L){let n=C+Math.ceil((e-t)/2),i=L?.baseline;if(i){let s=e-n;n=e-("factor"in i?Math.round(s*i.factor):s+i.px)}return Math.min(e,Math.max(0,n))}
function jx(e){return(e===void 0?[96,72]:e==="darwin"?[72]:[96]).flatMap(t=>[1,1.25,1.5,1.75,2,2.25,2.5,3,4].map(L=>t*L))}
function qx(e,C,t,L={}){let n=C.unitsPerEm,i=(C.ascender-C.descender+C.lineGap)/n;if(!(n>0&&i>.5&&i<4&&t.cellHeight>=2))return;let s=e==="kitty"?oM(C,i,t,L):e==="ghostty"?cM(C,i,t,L):void 0;if(!(!s||!Number.isFinite(s.emPx)||s.emPx<=0))return C.xHeight&&(s.xHeightPx=C.xHeight/n*s.emPx),s.baselinePx=Math.min(t.cellHeight,Math.max(1,s.baselinePx)),s}
function Ux(e,C){let t=OL(C),L=e.xHeightPx?Hx*e.xHeightPx/Gx:e.emPx*1.15;return Math.min(t*1.35,Math.max(t*.75,L))}
function oM(e,C,t,L){let n=e.unitsPerEm,i=L.kittyAdjust,s=(d,m)=>Math.ceil(Math.round(d/n*m*64)/64),r=e.ascender-e.descender+e.lineGap,o=d=>!e.advance||i?.cellWidth!==void 0||Math.abs(s(e.advance,d)-t.cellWidth)<=1,a,l,u=96;if(L.sizePt&&L.sizePt>0)C:for(let d of[0,1,2])for(let m of jx(L.platform)){let b=L.sizePt*m/72,B=s(r,b)+d;if(o(b)&&Ix(B,i?.cellHeight,m)===t.cellHeight){[a,l,u]=[b,B,m];break C}}if(a===void 0||l===void 0){l=i?.cellHeight?aM(t.cellHeight,i.cellHeight,u):t.cellHeight;let d=(l-1)/C,m=l/C;if(e.advance&&!i?.cellWidth){let b=e.advance/n,[B,A]=[(t.cellWidth-1.5)/b,(t.cellWidth+.5)/b];Math.max(d,B)<Math.min(m,A)&&([d,m]=[Math.max(d,B),Math.min(m,A)])}a=(d+m)/2}let x=t.cellHeight,p=s(e.ascender,a);if(i?.baseline){let d=Ix(p,i.baseline,u)-p,m=d>=0?Math.min(d,p-1):Math.max(d,p-x+1);p-=m}let h=x-l;return h>1&&(p+=Math.min(x-1,Math.floor(h/2))),{emPx:a,baselinePx:p}}
function Ix(e,C,t){if(!C||C.value===0)return e;if(C.unit==="%")return Math.round(Math.abs(C.value)*e/100);let L=C.unit==="px"?Math.round(C.value):Math.round(C.value*t/72);return L<0&&-L>e?0:e+L}
function aM(e,C,t){if(C.value===0)return e;if(C.unit==="%")return Math.max(1,Math.round(e*100/Math.abs(C.value)));let L=C.unit==="px"?Math.round(C.value):Math.round(C.value*t/72);return Math.max(1,e-L)}
function cM(e,C,t,L){let n=e.unitsPerEm,i=f7(t.cellHeight,L.adjust?.height),s=f7(t.cellWidth,L.adjust?.width),r=x=>Math.round(C*x)===i&&(!e.advance||Math.abs(Math.round(e.advance/n*x)-s)<=1),o,a;if(L.sizePt&&L.sizePt>0)for(let x of jx(L.platform)){let p=Math.round(Math.round(L.sizePt*64)*x/72/64);if(p>0&&r(p)){o=p,a=L.sizePt*x/72;break}}o??=Math.max(1,Math.round(i/C)),a??=o;let l=C*o,u=Math.round((e.lineGap/2-e.descender)/n*o-(i-l)/2);return{emPx:a,baselinePx:$x(t.cellHeight,i-u,i,L.adjust)}}
var w9=(e,C)=>String.fromCharCode(e[C],e[C+1],e[C+2],e[C+3]);
var Y1=(e,C)=>e[C]<<8|e[C+1];
var X3=(e,C)=>Y1(e,C)<<16>>16;
var P2=(e,C)=>(e[C]<<24>>>0)+(e[C+1]<<16|e[C+2]<<8|e[C+3]);
async function Vx(e,C=0){let t=async(k,D)=>{let v=await e(k,D);return v&&v.length>=D?v:void 0},L=0,n=await t(0,12);if(!n)return;if(w9(n,0)==="ttcf"){let k=P2(n,8);if(C<0||C>=k||k>4096)return;let D=await t(12+4*C,4);if(!D||(L=P2(D,0),n=await t(L,12),!n))return}if(P2(n,0)!==65536&&w9(n,0)!=="OTTO"&&w9(n,0)!=="true")return;let s=Y1(n,4);if(s===0||s>1024)return;let r=await t(L+12,16*s);if(!r)return;let o=new Map;for(let k=0;k<s;k++)o.set(w9(r,16*k),{offset:P2(r,16*k+8),length:P2(r,16*k+12)});let a=async(k,D,v=D)=>{let F=o.get(k);if(!(!F||F.length<D))return t(F.offset,Math.min(F.length,v))},l=await a("head",54),u=await a("hhea",36);if(!l||!u)return;let x=Y1(l,18);if(x<16||x>16384)return;let p=await a("OS/2",78,96),h=[X3(u,4),X3(u,6),X3(u,8)],d=h,m,b;if(p){let k=[X3(p,68),X3(p,70),X3(p,72)];(Y1(p,62)&128)!==0?d=k:h[0]===0&&h[1]===0&&(d=k[0]!==0||k[1]!==0?k:[Y1(p,74),-Y1(p,76),0]),b=Y1(p,4)||void 0,Y1(p,0)>=2&&p.length>=88&&(m=X3(p,86)||void 0)}let B={unitsPerEm:x,ascender:d[0],descender:d[1],lineGap:Math.max(0,d[2])};b&&(B.weight=b);let A=await lM(o,t,Y1(u,34),X3(l,50));if(A){m===void 0&&(m=await A.top(120));let k=await A.maxAdvance(32,126);k&&(B.advance=k)}return m!==void 0&&m>0&&(B.xHeight=m),B}
async function lM(e,C,t,L){let n=e.get("cmap");if(!n||n.length<4)return;let i=await C(n.offset,Math.min(n.length,516));if(!i)return;let s=Math.min(Y1(i,2),Math.floor((i.length-4)/8)),r;for(let b=0;b<s;b++){let B=Y1(i,4+8*b),A=Y1(i,6+8*b),k=P2(i,8+8*b),D=B===3&&A===10?4:B===0&&A>=4?3:B===3&&A===1?2:B===0?1:0;D>0&&(!r||D>r.rank)&&(r={offset:k,rank:D})}if(!r||r.offset>=n.length)return;let o=n.offset+r.offset,a=await C(o,8);if(!a)return;let l=Y1(a,0),u=l===12?P2(a,4):Y1(a,2);if(u>1<<20||r.offset+u>n.length)return;let x=await C(o,u);if(!x)return;let p=b=>{if(l===4){let B=Y1(x,6)/2;for(let A=0;A<B;A++){let k=Y1(x,14+2*A);if(b>k)continue;let D=16+2*B+2*A,v=Y1(x,D);if(b<v)return 0;let F=Y1(x,D+2*B),y=D+4*B,S=Y1(x,y);if(S===0)return b+F&65535;let I=y+S+2*(b-v);if(I+2>x.length)return 0;let U=Y1(x,I);return U===0?0:U+F&65535}return 0}if(l===12){let B=P2(x,12);for(let A=0;A<B&&16+12*A+12<=x.length;A++){let k=P2(x,16+12*A),D=P2(x,20+12*A);if(b>=k&&b<=D)return P2(x,24+12*A)+(b-k)}}return 0},h=e.get("hmtx"),d=e.get("loca"),m=e.get("glyf");return{async top(b){let B=p(b);if(!B||!d||!m)return;let A=L===1,k=await C(d.offset+B*(A?4:2),A?8:4);if(!k)return;let D=A?P2(k,0):2*Y1(k,0);if((A?P2(k,4):2*Y1(k,2))-D<10||D+10>m.length)return;let F=await C(m.offset+D,10);return F?X3(F,8):void 0},async maxAdvance(b,B){if(!h||t===0)return;let A=0;for(let k=b;k<=B;k++){let D=p(k);if(!D)continue;let v=Math.min(D,t-1)*4;if(v+2>h.length)continue;let F=await C(h.offset+v,2);F&&(A=Math.max(A,Y1(F,0)))}return A||void 0}}}
function Kx(e,C){let t=L=>L.replace(/[\\:,-]/g,n=>`\\${n}`);return C?`${t(e)}:style=${t(C)}`:t(e)}
function Qx(e,C){return["fc-match","--format=%{file}\\n%{index}\\n%{family}\\n",Kx(e,C)]}
function Zx(e){let[C,t,L]=e.split(`
`);if(!C?.startsWith("/"))return;let n=Number(t);return{file:C,index:Number.isInteger(n)&&n>=0?n:0,families:(L??"").split(",").map(i=>i.trim()).filter(Boolean)}}
function Yx(e,C){let t=C.trim().toLowerCase();return e.families.some(L=>L.toLowerCase()===t)}
function Jx(e,C,t){return["od","-An","-v","-tu1","-j",String(C),"-N",String(t),e]}
function Cp(e){let C=e.split(/\s+/).filter(Boolean),t=new Uint8Array(C.length);for(let L=0;L<C.length;L++){let n=Number(C[L]);if(!Number.isInteger(n)||n<0||n>255)return;t[L]=n}return t}
function IL(e){return typeof e=="string"&&Object.hasOwn(PL,e)}
function F9(e,C){if(typeof e!="string")return;let t=/^rgb\(\s?(\d{1,3}),\s?(\d{1,3}),\s?(\d{1,3})\s?\)$/.exec(e);if(t){let[s,r,o]=t.slice(1).map(Number);return s<=255&&r<=255&&o<=255?{r:s,g:r,b:o}:void 0}let L=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(e);if(L)return{r:parseInt(L[1],16),g:parseInt(L[2],16),b:parseInt(L[3],16)};let n=/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(e);if(n)return{r:parseInt(n[1]+n[1],16),g:parseInt(n[2]+n[2],16),b:parseInt(n[3]+n[3],16)};let i=/^ansi256\((\d{1,3})\)$/.exec(e);if(i){let s=Number(i[1]);return s<16?C?.[s]:Ex(s)}if(e.startsWith("ansi:")){let s=/^([a-z]+?)(Bright)?$/.exec(e.slice(5)),r=s?uM.indexOf(s[1]):-1;return r<0?void 0:C?.[r+(s[2]?8:0)]}}
function xM(e){return F9(e,Array(16).fill({r:0,g:0,b:0}))!==void 0}
function v9(e){let C=e;if(typeof C=="string")try{C=JSON.parse(C)}catch{return}if(typeof C!="object"||C===null||Array.isArray(C))return;let t=C,L={base:IL(t.base)?t.base:"dark",overrides:{}};if(typeof t.name=="string"&&(L.name=t.name),typeof t.overrides=="object"&&t.overrides!==null)for(let[n,i]of Object.entries(t.overrides))xM(i)&&(L.overrides[n]=i);return L}
function tp(e,C){let t=e?.startsWith("custom:")?e.slice(7):void 0;if(!(!t||t.includes(":")||t.includes("/")||t.startsWith(".")))return`${C.replace(/\/+$/,"")}/themes/${t}.json`}
function _L(e,C,t){if(IL(e))return e;if(e==="auto")return t?.background&&!yL(t.background)?"light":"dark";if(e?.startsWith("custom:")){let L=v9(C)?.base;if(IL(L))return L}return"dark"}
function zL(e,C,t){return _L(e,C,t).startsWith("light")?"light":"dark"}
function WL(e,C,t){let n=(e?.startsWith("custom:")?v9(C)?.overrides?.text:void 0)??PL[_L(e,C,t)];return F9(n,t?.palette)}
function ep(e){let{theme:C,customTheme:t,terminal:L}=e,n=()=>e.themeInk??(C===void 0?void 0:WL(C,t,L)),i=()=>L?.foreground,s;if(e.prefer==="theme")s=n()??i();else if(e.prefer==="terminal")s=i()??n();else{let r=C?.startsWith("custom:")?v9(t)?.overrides?.text:void 0;s=e.themeInk??(r===void 0?void 0:F9(r,L?.palette))??i()??n()}return s??(zL(C,t,L)==="light"?{r:34,g:34,b:34}:{r:230,g:230,b:230})}
function Lp(e){let C=hM(e),t=pM(e),L=b2(e.CLAUDE_CODE_FORCE_TERMINAL_IMAGES),n=e.CLAUDE_CODE_SESSION_KIND==="bg",s={kind:t,images:L||!n&&C===void 0&&(t==="kitty"||t==="ghostty"),multiplexed:C!==void 0};return C&&(s.multiplexer=C),(b2(e.SSH_CONNECTION)||b2(e.SSH_CLIENT)||b2(e.SSH_TTY))&&(s.ssh=!0),s}
function pM(e){let C=e.TERM??"";if(C==="xterm-ghostty")return"ghostty";if(C.includes("kitty"))return"kitty";switch(e.TERM_PROGRAM){case"ghostty":return"ghostty";case"kitty":return"kitty";case"WezTerm":return"wezterm";case"iTerm.app":return"iterm2"}return C==="wezterm"?"wezterm":e.LC_TERMINAL==="iTerm2"?"iterm2":b2(e.KITTY_WINDOW_ID)||b2(e.KITTY_PID)?"kitty":b2(e.GHOSTTY_RESOURCES_DIR)||b2(e.GHOSTTY_BIN_DIR)?"ghostty":b2(e.WEZTERM_PANE)||b2(e.WEZTERM_EXECUTABLE)?"wezterm":b2(e.ITERM_SESSION_ID)?"iterm2":"other"}
function hM(e){let C=e.TERM??"";if(b2(e.TMUX)||e.TERM_PROGRAM==="tmux"||/^tmux(-|$)/.test(C))return"tmux";if(b2(e.STY)||/^screen(\.|-|$)/.test(C))return"screen";if(b2(e.ZELLIJ)||b2(e.ZELLIJ_SESSION_NAME))return"zellij"}
function b2(e){return e!==void 0&&e!==""}
function dM(e,C={}){if(e.ssh)return[];let t=C.env??{};switch(e.kind){case"kitty":return Nx(t,C.scheme);case"ghostty":return Rx(t,C.scheme);default:return[]}}
function fM(e,C){return e.ssh||e.multiplexed?!1:e.kind==="kitty"?!0:e.kind==="ghostty"&&C?.graphemeWidth!=="legacy"}
async function mM(e,C,t){if(!e.ssh)switch(e.kind){case"kitty":return RL(C,t);case"ghostty":return wL(C,t);default:return}}
function gM(e,C,t){if(e==="ghostty")return C?.alphaBlending==="linear-corrected"?C.background:void 0;if(!(e!=="kitty"||!C))return C.textComposition==="legacy"||np(e,C,t)?C.background:void 0}
function np(e,C,t){if(e!=="kitty"||!C||C.textComposition==="legacy")return;let L=C.textComposition??"platform",n=L==="platform"?t==="darwin"?{gamma:1.7,contrast:30}:void 0:L;return n&&(Math.abs(n.gamma-1)>1e-6||n.contrast!==0)?n:void 0}
var ip=2*1024*1024;
function VL(e){return Math.max(1,Math.min(255,Math.floor(e.maxColumns),Math.floor(UL/e.cellWidth)))}
var AM;
function fj(){return AM??=Ou()}
var S9=new Map;
var R9=new Map;
function HL(e){return Math.max(1,Math.min(255,e)-2)}
function mj(e,C){let t;try{t=rp(e,C)}catch(s){let r=s instanceof k3?jL(e,HL(C.maxColumns))[0]:void 0;if(r)return{columns:Math.max(1,Math.min(255,C.maxColumns)),rows:Math.min(255,r.lines.length),scale:1};throw s}let L=Y3(t,g7(C));if(L.scale<N9)throw new F1(O9(L.scale));let n=jL(e,HL(C.maxColumns)),i=n.length===0||n.some(s=>s.lines.length<=L.rows)?L:Y3(t,g7(C,Math.min(255,...n.map(s=>s.lines.length))));if(i.rows*C.cellHeight>UL)throw new F1(T9);return i}
function O9(e){return`formula too wide to draw legibly (it would be drawn at ${Math.round(e*100)}% size)`}
function gj(e,C,t){let L=[C.cellWidth,C.cellHeight,C.maxColumns,C.emPx,C.weight??"",t??0,e].join(`
`),n=M7(R9,L);if(!n){let i=rp(e,C),s=g7(C,t),r=Y3(i,s);if(r.scale<N9)throw new F1(O9(r.scale));if(r.columns*C.cellWidth*r.rows*C.cellHeight>qL||r.rows*C.cellHeight>UL)throw new F1(T9);let o=T6(i,s),a=X7(o,C.ink,C.inkOver,C.inkCurve);if(a.length>ip)throw new F1(T9);n=A7(R9,L,{columns:o.columns,rows:o.rows,scale:o.scale,png:a})}return{...n,png:$7(n.png,C.ink,C.inkOver,C.inkCurve)}}
function Mj(e,C,t){let L=jL(e,C.maxColumns).find(s=>t===void 0||s.lines.length<=t);if(!L)return null;if(t===void 0||L.lines.length===t)return L.lines;let n=" ".repeat(L.width),i=Math.floor((t-L.lines.length)/2);return[...Array(i).fill(n),...L.lines,...Array(t-L.lines.length-i).fill(n)]}
function Aj(e,C,t=255){let L;try{L=ap(e)}catch(n){if(n instanceof F1)return null;throw n}return bM(L,C,t)}
function bM(e,C,t=255){let L=cp(C,t,"left"),n=Y3(e,L);return n.scale<GL||Y3(e,{...L,overflowPx:0}).scale<GL&&!yM(e,L)?null:n}
function yM(e,C){let t=Math.max(0,Math.ceil(C.overflowPx??0)),L=t+Math.ceil(yC),n=T6(e,C),i=T6(e,{...C,emPx:C.emPx*n.scale,cellHeight:C.cellHeight+L+t,baselinePx:n.baselinePx+L,minColumns:n.columns,minScale:0,overflowPx:0});if(Math.abs(i.scale-1)>1e-6)return!1;let{alpha:s,widthPx:r,heightPx:o}=i;for(let a=0;a<o;a++){if(a>=L&&a<o-t)continue;let l=0;for(let u=0;u<r;u++)if(l=s[a*r+u]>=64?l+1:0,l>DM)return!1}return!0}
function Ej(e,C,t,L="center"){let n=["inline",C.cellWidth,C.cellHeight,C.emPx,C.weight??"",C.baselinePx,t,L,e].join(`
`),i=M7(R9,n);if(!i){let s=sp(ap(e),C,t,L);if(s.png.length>ip)throw new F1(T9);i=A7(R9,n,s)}return{...i,png:$7(i.png,C.ink,C.inkOver,C.inkCurve)}}
function bj(e,C,t,L="center"){return sp(e,C,t,L)}
function sp(e,C,t,L){let n={...cp(C,t,"left"),minColumns:t,inkPlace:L},i=T6(e,n);return{columns:i.columns,rows:i.rows,scale:i.scale,png:X7(i,C.ink,C.inkOver,C.inkCurve)}}
function Dj(e,C,t={}){let L=op(e,t.tight===!1?"inline":"tight",C);return L&&L.lines.length===1?L.lines[0]:null}
function yj(e){let C="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",t="";for(let L=0;L<e.length;L+=3){let n=e[L]<<16|(e[L+1]??0)<<8|(e[L+2]??0);t+=C[n>>18&63]+C[n>>12&63],t+=L+1<e.length?C[n>>6&63]:"=",t+=L+2<e.length?C[n&63]:"="}return t}
function rp(e,C){if(e.length>m7)throw new F1(`formula longer than ${m7} characters`);let t=HL(VL(C))*C.cellWidth/C.emPx,L=`${t.toFixed(3)}
${e}`;return M7(S9,L)??A7(S9,L,eL(e,{display:!0,lineWidth:t}))}
function jL(e,C){return["stacked","compact","lines"].flatMap(t=>op(e,t,C)??[])}
var $L=new Map;
function op(e,C,t){if(e.length>m7)return null;let L=`${C}${t??""}
${e}`;if($L.has(L))return M7($L,L)??null;let n=C==="stacked"||C==="compact",i=C!=="inline"&&C!=="tight",s;try{s=Mx(Iu(e,{display:n}),{display:n,maxWidth:t,compact:C==="compact",breakLines:i,tight:C==="tight"})}catch{s=null}return A7($L,L,s)}
function ap(e){if(e.length>m7)throw new F1(`formula longer than ${m7} characters`);let C=`inline
${e}`;return M7(S9,C)??A7(S9,C,eL(e,{display:!1}))}
function cp(e,C,t){return{emPx:e.emPx,cellWidth:e.cellWidth,cellHeight:e.cellHeight,maxColumns:VL({cellWidth:e.cellWidth,maxColumns:C}),align:t,minRows:1,baselinePx:e.baselinePx,centerInk:t==="left",minScale:GL,overflowPx:Math.max(1,Math.round(e.cellHeight*MM)),...e.weight!==void 0?{weight:e.weight}:{}}}
function g7(e,C){return{emPx:e.emPx,cellWidth:e.cellWidth,cellHeight:e.cellHeight,maxColumns:VL(e),align:"center",minRows:C,...e.weight!==void 0?{weight:e.weight}:{}}}
function M7(e,C){let t=e.get(C);return t!==void 0&&(e.delete(C),e.set(C,t)),t}
function A7(e,C,t){return e.set(C,t),e.size>EM&&e.delete(e.keys().next().value),t}
var BM=2*1024*1024;
function up(e,C){let t={ink:e.ink,background:e.background??I7(e.ink)};return{emPx:e.emPx,cellWidth:e.cellWidth,cellHeight:e.cellHeight,maxColumns:Math.max(1,Math.min(255,e.maxColumns)),maxRows:Math.max(1,Math.min(255,e.maxRows??kM)),...C!==void 0?{minRows:C}:{},...e.weight!==void 0?{weight:e.weight}:{},...e.inkOver?{over:e.inkOver}:{},color:(L,n)=>P7(L,t,n)}}
function kj(e,C){let t=BC(e,up(C));if(t.scale<lp)throw new F1(`picture too large to draw legibly (it would be drawn at ${Math.round(t.scale*100)}% size)`);return t}
function Bj(e,C,t){let L=up(C,t),n=BC(e,L);if(n.scale<lp)throw new F1(`picture too large to draw legibly (it would be drawn at ${Math.round(n.scale*100)}% size)`);if(n.columns*C.cellWidth*n.rows*C.cellHeight>qL)throw new F1("picture too large to draw");let i=ns(e,L),s=ss(i);if(s.length>BM)throw new F1("picture too large to send to the terminal");return{columns:i.columns,rows:i.rows,scale:i.scale,png:s}}
function wj(e){return is(e)}
function Fj(e,C){let t=Y3(e,g7(C));if(t.scale<N9)throw new F1(O9(t.scale));return t}
function vj(e,C,t){let L=g7(C,t),n=Y3(e,L);if(n.scale<N9)throw new F1(O9(n.scale));if(n.columns*C.cellWidth*n.rows*C.cellHeight>qL)throw new F1("formula too large to draw");let i=T6(e,L);return{columns:i.columns,rows:i.rows,scale:i.scale,png:X7(i,C.ink,C.inkOver,C.inkCurve)}}
export{ip,BM,NL,_x,ep,tp,WL,zL,dM,Lp,fM,OL,zx,Qx,VL,gM,np,fj,Yx,Ux,mj,Fj,Aj,bM,kj,Jx,Zx,Cp,Mj,Dj,HL,Vx,mM,gj,vj,Ej,bj,Bj,wj,Wx,qx,yj,Ax,Mx};
