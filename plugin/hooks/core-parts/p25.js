import{ix,Xu,x9,Ag,fx,kg,Bg,vg,Sg,Tg,vL,zg,WL,wu,D3,K3,w9,F1,y9,_L,v6,H7,I7,OL,gC,Yg,p7,Qe,Fu,Xg,Qg,R7,CM,T7,AC,Hx,Zi,Ji,Yi}from'./p24.js';export*from'./p24.js';
function xx(e,C){try{let t=C.breakLines?C.maxWidth:void 0,L=ix(Xu(e),C.display,{compact:C.display&&C.compact===!0,breakWidth:t,tight:C.tight});return!C.display&&L.rows.length!==1&&t===void 0||C.maxWidth!==void 0&&L.width>C.maxWidth?null:{lines:x9(L),baseline:L.base,width:L.width}}catch{return null}}
function px(e){return"#"+[e.r,e.g,e.b].map(C=>C.toString(16).padStart(2,"0")).join("")}
function m6(e){let C=e.trim().toLowerCase(),t=Ag[C.replace(/\s+/g,"")];if(t)return t;let L=/^#?([0-9a-f]+)$/.exec(C);if(L){let i=L[1];if(!C.startsWith("#")&&i.length!==3&&i.length!==6||i.length%3!==0||i.length>12)return;let s=i.length/3,[r,o,c]=[0,1,2].map(l=>g9(i.slice(l*s,(l+1)*s)));return{r,g:o,b:c}}let n=/^rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})$/.exec(C);if(n)return{r:g9(n[1]),g:g9(n[2]),b:g9(n[3])}}
function g9(e){if(e.length===2)return parseInt(e,16);let C=16**e.length-1;return Math.round(parseInt(e,16)/C*255)}
function Eg(e){let C=t=>{let L=t/255;return L<=.04045?L/12.92:((L+.055)/1.055)**2.4};return .2126*C(e.r)+.7152*C(e.g)+.0722*C(e.b)}
function gL(e){return Eg(e)<.18}
function hx(e){if(!Number.isInteger(e)||e<16||e>255)return;if(e>=232){let L=8+(e-232)*10;return{r:L,g:L,b:L}}let C=L=>L===0?0:55+L*40,t=e-16;return{r:C(Math.floor(t/36)),g:C(Math.floor(t/6)%6),b:C(t%6)}}
function F5(e){return e.HOME||void 0}
function g6(e,C,t){let L=e.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,(n,i,s)=>C[i??s]??n);if(L==="~"||L.startsWith("~/")){let n=F5(C);if(!n)return;L=n+L.slice(1)}if(!L.startsWith("/")){if(!t)return;L=t.replace(/\/+$/,"")+"/"+L}return bg(L)}
function M9(e){let C=e.replace(/\/+$/,"").lastIndexOf("/");return C<=0?"/":e.slice(0,C)}
function bg(e){let C=[];for(let t of e.split("/"))t===""||t==="."||(t===".."?C.pop():C.push(t));return"/"+C.join("/")}
function l7(e){if(e.XDG_CONFIG_HOME?.startsWith("/"))return e.XDG_CONFIG_HOME.replace(/\/+$/,"");let C=F5(e);return C?`${C}/.config`:void 0}
async function u7(e,C){if(C)try{return await e(C)}catch{return}}
var Dg=[[/(?:extra|ultra)[-_\s]?light/i,200],[/(?:semi|demi)[-_\s]?bold/i,600],[/(?:extra|ultra)[-_\s]?bold/i,800],[/thin|hairline/i,100],[/black|heavy/i,900],[/light/i,300],[/retina/i,450],[/medium/i,500],[/bold/i,700],[/regular|normal|book|roman/i,400]];
function x7(e){for(let C of e){if(!C)continue;let t=/\bwght\s*[=:]\s*(\d{3})\b/i.exec(C);if(t)return dx(Number(t[1]));if(/^\s*\d{3}\s*$/.test(C))return dx(Number(C));for(let[L,n]of Dg)if(L.test(C))return n}}
function dx(e){return Math.min(900,Math.max(100,e))}
var yg=[1908513,13395558,11910504,15779444,8495806,11703483,9092791,12961990,6710886,13979219,12175946,15189319,8038106,12818392,7389361,15395562].map(e=>({r:e>>16,g:e>>8&255,b:e&255}));
function A9(e){let C=[];for(let t of e.split(`
`)){let L=t.trim();if(!L||L.startsWith("#"))continue;let n=L.indexOf("=");if(n<0)continue;let i=L.slice(0,n).trim(),s=L.slice(n+1).trim();s.length>=2&&s.startsWith('"')&&s.endsWith('"')&&(s=s.slice(1,-1)),C.push([i,s])}return C}
function mx(e){let C=e.trim();if(!C)return;if(!/[,:=]/.test(C))return{light:C,dark:C};let t,L;for(let n of C.split(",")){let i=/^\s*(light|dark)\s*[:=]\s*(.+?)\s*$/.exec(n);i?.[1]==="light"?t=i[2]:i?.[1]==="dark"&&(L=i[2])}return t&&L?{light:t,dark:L}:void 0}
function gx(e){let C=e.trim();if(C.endsWith("%")){let t=Number(C.slice(0,-1));return C.length<2||!Number.isFinite(t)?void 0:{factor:Math.max(0,1+t/100)}}return/^[+-]?\d+$/.test(C)?{px:Number(C)}:void 0}
function ML(){return{values:new Map,palette:new Map,adjust:{},font:{}}}
function Mx(e){let C=e.trim();return C==="native"||C==="linear"||C==="linear-corrected"?C:void 0}
function Ax(e){return e==="darwin"?"native":"linear-corrected"}
function AL(e,C,t){if(Object.prototype.hasOwnProperty.call(fx,C)){let L=fx[C],n=t?gx(t):void 0;n?e.adjust[L]=n:delete e.adjust[L]}else if(C==="font-family"||C==="font-style"||C==="font-variation"){let L=C==="font-family"?"family":C==="font-style"?"style":"variation";t?(L!=="family"||e.font.family===void 0)&&(e.font[L]=t):delete e.font[L]}else if(C==="alpha-blending")e.alphaBlending=Mx(t);else if(C==="foreground"||C==="background"){if(!t){e.values.delete(C);return}let L=m6(t);L&&e.values.set(C,L)}else if(C==="palette"){let L=/^\s*(0x[0-9a-f]+|0o[0-7]+|0b[01]+|\d+)\s*=\s*(.+)$/i.exec(t);if(!L)return;let n=Number(L[1].toLowerCase()),i=m6(L[2]);i&&n>=0&&n<16&&e.palette.set(n,i)}}
function Ex(e){return e==="unicode"||e==="legacy"?e:void 0}
function bx(...e){let C=o=>e.reduce((c,l)=>l.values.get(o)??c,void 0),t={foreground:C("foreground")??kg,background:C("background")??Bg,palette:yg.map((o,c)=>e.reduce((l,u)=>u.palette.get(c)??l,o))},L=e.reduce((o,c)=>c.alphaBlending??o,void 0);L&&(t.alphaBlending=L);let n=Object.assign({},...e.map(o=>o.adjust));Object.keys(n).length>0&&(t.cellAdjust=n);let i=Object.assign({},...e.map(o=>o.font)),s=i.style===void 0||["default","true","false"].includes(i.style)?void 0:i.style,r=x7([i.variation,s,i.family])??(i.family===void 0&&s===void 0?400:void 0);return r&&(t.fontWeight=r),t}
function Dx(e,C){let t=ML(),L,n;for(let[i,s]of A9(e))i==="theme"?L=mx(s):i==="grapheme-width-method"?n=Ex(s):AL(t,i,s);if(!(!t.values.has("foreground")&&!t.values.has("background"))&&!(C==="dark"&&L&&L.light!==L.dark))return{...bx(t),...n?{graphemeWidth:n}:{}}}
function kx(e,C){let t=[];return e.GHOSTTY_BIN_DIR?.startsWith("/")&&t.push(`${e.GHOSTTY_BIN_DIR.replace(/\/+$/,"")}/ghostty`),t.push("ghostty","/Applications/Ghostty.app/Contents/MacOS/ghostty"),t.map(L=>({argv:[L,"+show-config","--changes-only=false"],parse:n=>Dx(n,C)}))}
function wg(e,C){let t=[],L=l7(e);L&&t.push(`${L}/ghostty/config`,`${L}/ghostty/config.ghostty`);let n=F5(e);if(n&&(C===void 0||C==="darwin")){let i=`${n}/Library/Application Support/com.mitchellh.ghostty`;t.push(`${i}/config`,`${i}/config.ghostty`)}return t}
function Fg(e){let C=[],t=l7(e);return t&&C.push(`${t}/ghostty/themes`),e.GHOSTTY_RESOURCES_DIR?.startsWith("/")?C.push(`${e.GHOSTTY_RESOURCES_DIR.replace(/\/+$/,"")}/themes`):(e.GHOSTTY_BIN_DIR?.startsWith("/")&&C.push(g6("../share/ghostty/themes",e,e.GHOSTTY_BIN_DIR)),C.push("/Applications/Ghostty.app/Contents/Resources/ghostty/themes","/usr/share/ghostty/themes","/usr/local/share/ghostty/themes")),C}
async function EL(e,C){let{env:t}=C,L=ML(),n,i,s=wg(t,C.platform),r=new Set;for(let u=0;u<s.length&&u<64;u++){let x=s[u];if(r.has(x))continue;r.add(x);let p=await u7(e,x);if(p!==void 0)for(let[h,d]of A9(p))if(h==="config-file"){if(!d)continue;let M=g6(d.startsWith("?")?d.slice(1):d,t,M9(x));M&&s.push(M)}else h==="theme"?n=mx(d):h==="grapheme-width-method"?i=Ex(d):AL(L,h,d)}let o=ML(),c=n&&(C.scheme==="dark"?n.dark:n.light);if(c){let u=c.startsWith("/")||c.startsWith("~/")?[g6(c,t)]:c.includes("/")?[]:Fg(t).map(x=>`${x}/${c}`);for(let x of u){let p=await u7(e,x);if(p!==void 0){for(let[h,d]of A9(p))AL(o,h,d);break}}}let l=bx(o,L);return!l.alphaBlending&&C.platform!==void 0&&(l.alphaBlending=Ax(C.platform)),{...l,...i?{graphemeWidth:i}:{}}}
var Rg=[0,13370371,1690368,13552384,881612,13311697,904653,14540253,7763574,15867935,2358528,16776448,1740799,16591103,1376255,16777215].map(e=>({r:e>>16,g:e>>8&255,b:e&255}));
var Ng=String.raw`
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
function Bx(e,C){let t=new Map,L=new Map,n;for(let s of e.split(`
`)){if(s.startsWith("font_spec ")){n=x7(Og(s.slice(10)));continue}let r=/^\s*(?:(dark|light|no_preference):)?([a-z_0-9]+)\s+(\S+)\s*$/.exec(s);if(!r)continue;let o=m6(r[3]);if(!o)continue;(r[1]?L.get(r[1])??L.set(r[1],new Map).get(r[1]):t).set(r[2],o)}let i=C&&L.get(C)||t;if(!(!i.has("foreground")&&!i.has("background")))return{...bL(i),...n?{fontWeight:n}:{}}}
function Og(e){try{let C=JSON.parse(e);return Array.isArray(C)?C.filter(t=>typeof t=="string"):[]}catch{return[]}}
function bL(e){return{foreground:e.get("foreground")??vg,background:e.get("background")??Sg,palette:Rg.map((C,t)=>e.get(`color${t}`)??C)}}
function yx(e,C){let t=["kitty"];return e.KITTY_INSTALLATION_DIR?.startsWith("/")&&t.push(`${e.KITTY_INSTALLATION_DIR.replace(/\/+$/,"")}/kitty/launcher/kitty`),t.push("/Applications/kitty.app/Contents/MacOS/kitty"),t.map(L=>({argv:[L,"+runpy",Ng],parse:n=>Bx(n,C)}))}
function DL(e,C){let t=[],L=s=>{s?.startsWith("/")&&!t.includes(s)&&t.push(s.replace(/\/+$/,""))};if(e.KITTY_CONFIG_DIRECTORY)return[g6(e.KITTY_CONFIG_DIRECTORY,e)??e.KITTY_CONFIG_DIRECTORY];let n=l7(e);L(n&&`${n}/kitty`);let i=F5(e);L(i&&`${i}/.config/kitty`),(C===void 0||C==="darwin")&&L(i&&`${i}/Library/Preferences/kitty`);for(let s of(e.XDG_CONFIG_DIRS??"/etc/xdg").split(":"))L(s&&`${s}/kitty`);return t}
async function kL(e,C){let{env:t}=C,L=new Map,n={read:e,env:t,platform:C.platform,seen:new Set,values:L},i=await E9(n,"/etc/xdg/kitty/kitty.conf"),s;for(let o of DL(t,C.platform))if(await E9(n,`${o}/kitty.conf`)){s=o,i=!0;break}if(s??=DL(t,C.platform)[0],C.scheme&&s){let o=new Map;if(await E9({...n,seen:new Set,values:o},`${s}/${Tg[C.scheme]}`))return bL(o)}if(!i)return;let r=n.font===void 0?void 0:x7([/\bstyle\s*=\s*"([^"]*)"/.exec(n.font)?.[1],n.font]);return{...bL(L),...r?{fontWeight:r}:{}}}
var Ig=/^(foreground|background|color(?:[0-9]|1[0-5]))$/;
async function E9(e,C,t=0){if(e.seen.has(C)||t>16)return!1;let L=await u7(e.read,C);return L===void 0?!1:(e.seen.add(C),await wx(e,L,M9(C),t),!0)}
async function wx(e,C,t,L){let n={...e.env,KITTY_OS:e.platform==="darwin"?"macos":e.platform??"linux"};for(let i of C.split(`
`)){let s=i.trim();if(!s||s.startsWith("#"))continue;let r=/^([a-zA-Z][a-zA-Z0-9_-]*)\s+(.+)$/.exec(s);if(!r)continue;let[,o,c]=r;if(o==="include"){let l=g6(c.trim(),n,t);l&&await E9(e,l,L+1)}else if(o==="envinclude"){let l=Pg(c.trim());for(let[u,x]of Object.entries(e.env))x!==void 0&&l.test(u)&&await wx(e,x,t,L+1)}else if(Ig.test(o)){let l=m6(c);l&&e.values.set(o,l)}else o==="font_family"&&(e.font=c.trim())}}
function Pg(e){let C=e.replace(/[.+^${}()|\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".");return new RegExp(`^${C}$`)}
var _g=String.raw`
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
var Wg=String.raw`
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
function yL(e){let C=/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/m.exec(e);if(!C)return;let[t,L,n,i]=C.slice(1).map(Number);if(!(t>0&&L>0&&n>0&&i>0))return;let s=Math.floor(n/L),r=Math.floor(i/t);if(!(s<1||r<1))return{cellWidth:s,cellHeight:r,columns:L,rows:t}}
var wL={argv:["perl","-e",_g],parse:yL};
var Fx={argv:["python3","-I","-c",Wg],parse:yL};
var vx=[wL,Fx];
function Sx(e,C=1.15){return e.cellWidth/.6*C}
function Rx(e,C){return{cellWidth:BL(e.cellWidth,C?.width),cellHeight:BL(e.cellHeight,C?.height)}}
function BL(e,C){if(!C)return e;let t="factor"in C?C.factor>0?e/C.factor:e:e-C.px;return Number.isFinite(t)?Math.max(1,Math.round(t)):e}
function Tx(e,C,t){let L=BL(e,t?.height),n=Math.round(L*C)+Math.ceil((e-L)/2),i=t?.baseline;if(i){let s=e-n;n=e-("factor"in i?Math.round(s*i.factor):s+i.px)}return Math.min(e,Math.max(0,n))}
function FL(e){return typeof e=="string"&&Object.hasOwn(vL,e)}
function b9(e,C){if(typeof e!="string")return;let t=/^rgb\(\s?(\d{1,3}),\s?(\d{1,3}),\s?(\d{1,3})\s?\)$/.exec(e);if(t){let[s,r,o]=t.slice(1).map(Number);return s<=255&&r<=255&&o<=255?{r:s,g:r,b:o}:void 0}let L=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(e);if(L)return{r:parseInt(L[1],16),g:parseInt(L[2],16),b:parseInt(L[3],16)};let n=/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(e);if(n)return{r:parseInt(n[1]+n[1],16),g:parseInt(n[2]+n[2],16),b:parseInt(n[3]+n[3],16)};let i=/^ansi256\((\d{1,3})\)$/.exec(e);if(i){let s=Number(i[1]);return s<16?C?.[s]:hx(s)}if(e.startsWith("ansi:")){let s=/^([a-z]+?)(Bright)?$/.exec(e.slice(5)),r=s?zg.indexOf(s[1]):-1;return r<0?void 0:C?.[r+(s[2]?8:0)]}}
function $g(e){return b9(e,Array(16).fill({r:0,g:0,b:0}))!==void 0}
function D9(e){let C=e;if(typeof C=="string")try{C=JSON.parse(C)}catch{return}if(typeof C!="object"||C===null||Array.isArray(C))return;let t=C,L={base:FL(t.base)?t.base:"dark",overrides:{}};if(typeof t.name=="string"&&(L.name=t.name),typeof t.overrides=="object"&&t.overrides!==null)for(let[n,i]of Object.entries(t.overrides))$g(i)&&(L.overrides[n]=i);return L}
function Nx(e,C){let t=e?.startsWith("custom:")?e.slice(7):void 0;if(!(!t||t.includes(":")||t.includes("/")||t.startsWith(".")))return`${C.replace(/\/+$/,"")}/themes/${t}.json`}
function SL(e,C,t){if(FL(e))return e;if(e==="auto")return t?.background&&!gL(t.background)?"light":"dark";if(e?.startsWith("custom:")){let L=D9(C)?.base;if(FL(L))return L}return"dark"}
function RL(e,C,t){return SL(e,C,t).startsWith("light")?"light":"dark"}
function TL(e,C,t){let n=(e?.startsWith("custom:")?D9(C)?.overrides?.text:void 0)??vL[SL(e,C,t)];return b9(n,t?.palette)}
function Ox(e){let{theme:C,customTheme:t,terminal:L}=e,n=()=>e.themeInk??(C===void 0?void 0:TL(C,t,L)),i=()=>L?.foreground,s;if(e.prefer==="theme")s=n()??i();else if(e.prefer==="terminal")s=i()??n();else{let r=C?.startsWith("custom:")?D9(t)?.overrides?.text:void 0;s=e.themeInk??(r===void 0?void 0:b9(r,L?.palette))??i()??n()}return s??(RL(C,t,L)==="light"?{r:34,g:34,b:34}:{r:230,g:230,b:230})}
function Ix(e){let C=Hg(e),t=Gg(e),L=E2(e.CLAUDE_CODE_FORCE_TERMINAL_IMAGES),n=e.CLAUDE_CODE_SESSION_KIND==="bg",s={kind:t,images:L||!n&&C===void 0&&(t==="kitty"||t==="ghostty"),multiplexed:C!==void 0};return C&&(s.multiplexer=C),(E2(e.SSH_CONNECTION)||E2(e.SSH_CLIENT)||E2(e.SSH_TTY))&&(s.ssh=!0),s}
function Gg(e){let C=e.TERM??"";if(C==="xterm-ghostty")return"ghostty";if(C.includes("kitty"))return"kitty";switch(e.TERM_PROGRAM){case"ghostty":return"ghostty";case"kitty":return"kitty";case"WezTerm":return"wezterm";case"iTerm.app":return"iterm2"}return C==="wezterm"?"wezterm":e.LC_TERMINAL==="iTerm2"?"iterm2":E2(e.KITTY_WINDOW_ID)||E2(e.KITTY_PID)?"kitty":E2(e.GHOSTTY_RESOURCES_DIR)||E2(e.GHOSTTY_BIN_DIR)?"ghostty":E2(e.WEZTERM_PANE)||E2(e.WEZTERM_EXECUTABLE)?"wezterm":E2(e.ITERM_SESSION_ID)?"iterm2":"other"}
function Hg(e){let C=e.TERM??"";if(E2(e.TMUX)||e.TERM_PROGRAM==="tmux"||/^tmux(-|$)/.test(C))return"tmux";if(E2(e.STY)||/^screen(\.|-|$)/.test(C))return"screen";if(E2(e.ZELLIJ)||E2(e.ZELLIJ_SESSION_NAME))return"zellij"}
function E2(e){return e!==void 0&&e!==""}
function jg(e,C={}){if(e.ssh)return[];let t=C.env??{};switch(e.kind){case"kitty":return yx(t,C.scheme);case"ghostty":return kx(t,C.scheme);default:return[]}}
function qg(e,C){return e.ssh||e.multiplexed?!1:e.kind==="kitty"?!0:e.kind==="ghostty"&&C?.graphemeWidth!=="legacy"}
async function Ug(e,C,t){if(!e.ssh)switch(e.kind){case"kitty":return kL(C,t);case"ghostty":return EL(C,t);default:return}}
function Vg(e,C){if(!(e!=="ghostty"||C?.alphaBlending!=="linear-corrected"))return C.background}
var Px=2*1024*1024;
function zL(e){return Math.max(1,Math.min(255,Math.floor(e.maxColumns),Math.floor(WL/e.cellWidth)))}
var Kg;
function GH(){return Kg??=wu()}
var k9=new Map;
var B9=new Map;
function IL(e){return Math.max(1,Math.min(255,e)-2)}
function HH(e,C){let t;try{t=Wx(e,C)}catch(s){let r=s instanceof D3?PL(e,IL(C.maxColumns))[0]:void 0;if(r)return{columns:Math.max(1,Math.min(255,C.maxColumns)),rows:Math.min(255,r.lines.length),scale:1};throw s}let L=K3(t,h7(C));if(L.scale<w9)throw new F1(F9(L.scale));let n=PL(e,IL(C.maxColumns)),i=n.length===0||n.some(s=>s.lines.length<=L.rows)?L:K3(t,h7(C,Math.min(255,...n.map(s=>s.lines.length))));if(i.rows*C.cellHeight>WL)throw new F1(y9);return i}
function F9(e){return`formula too wide to draw legibly (it would be drawn at ${Math.round(e*100)}% size)`}
function jH(e,C,t){let L=[C.cellWidth,C.cellHeight,C.maxColumns,C.emPx,C.weight??"",t??0,e].join(`
`),n=d7(B9,L);if(!n){let i=Wx(e,C),s=h7(C,t),r=K3(i,s);if(r.scale<w9)throw new F1(F9(r.scale));if(r.columns*C.cellWidth*r.rows*C.cellHeight>_L||r.rows*C.cellHeight>WL)throw new F1(y9);let o=v6(i,s),c=H7(o,C.ink,C.inkOver);if(c.length>Px)throw new F1(y9);n=f7(B9,L,{columns:o.columns,rows:o.rows,scale:o.scale,png:c})}return{...n,png:I7(n.png,C.ink,C.inkOver)}}
function qH(e,C,t){let L=PL(e,C.maxColumns).find(s=>t===void 0||s.lines.length<=t);if(!L)return null;if(t===void 0||L.lines.length===t)return L.lines;let n=" ".repeat(L.width),i=Math.floor((t-L.lines.length)/2);return[...Array(i).fill(n),...L.lines,...Array(t-L.lines.length-i).fill(n)]}
function UH(e,C,t=255){let L;try{L=$x(e)}catch(n){if(n instanceof F1)return null;throw n}return Zg(L,C,t)}
function Zg(e,C,t=255){let L=Gx(C,t,"left"),n=K3(e,L);return n.scale<OL||K3(e,{...L,overflowPx:0}).scale<OL&&!Jg(e,L)?null:n}
function Jg(e,C){let t=Math.max(0,Math.ceil(C.overflowPx??0)),L=t+Math.ceil(gC),n=v6(e,C),i=v6(e,{...C,emPx:C.emPx*n.scale,cellHeight:C.cellHeight+L+t,baselinePx:n.baselinePx+L,minColumns:n.columns,minScale:0,overflowPx:0});if(Math.abs(i.scale-1)>1e-6)return!1;let{alpha:s,widthPx:r,heightPx:o}=i;for(let c=0;c<o;c++){if(c>=L&&c<o-t)continue;let l=0;for(let u=0;u<r;u++)if(l=s[c*r+u]>=64?l+1:0,l>Yg)return!1}return!0}
function VH(e,C,t,L="center"){let n=["inline",C.cellWidth,C.cellHeight,C.emPx,C.weight??"",C.baselinePx,t,L,e].join(`
`),i=d7(B9,n);if(!i){let s=_x($x(e),C,t,L);if(s.png.length>Px)throw new F1(y9);i=f7(B9,n,s)}return{...i,png:I7(i.png,C.ink,C.inkOver)}}
function XH(e,C,t,L="center"){return _x(e,C,t,L)}
function _x(e,C,t,L){let n={...Gx(C,t,"left"),minColumns:t,inkPlace:L},i=v6(e,n);return{columns:i.columns,rows:i.rows,scale:i.scale,png:H7(i,C.ink,C.inkOver)}}
function KH(e,C,t={}){let L=zx(e,t.tight===!1?"inline":"tight",C);return L&&L.lines.length===1?L.lines[0]:null}
function QH(e){let C="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",t="";for(let L=0;L<e.length;L+=3){let n=e[L]<<16|(e[L+1]??0)<<8|(e[L+2]??0);t+=C[n>>18&63]+C[n>>12&63],t+=L+1<e.length?C[n>>6&63]:"=",t+=L+2<e.length?C[n&63]:"="}return t}
function Wx(e,C){if(e.length>p7)throw new F1(`formula longer than ${p7} characters`);let t=IL(zL(C))*C.cellWidth/C.emPx,L=`${t.toFixed(3)}
${e}`;return d7(k9,L)??f7(k9,L,Qe(e,{display:!0,lineWidth:t}))}
function PL(e,C){return["stacked","compact","lines"].flatMap(t=>zx(e,t,C)??[])}
var NL=new Map;
function zx(e,C,t){if(e.length>p7)return null;let L=`${C}${t??""}
${e}`;if(NL.has(L))return d7(NL,L)??null;let n=C==="stacked"||C==="compact",i=C!=="inline"&&C!=="tight",s;try{s=xx(Fu(e,{display:n}),{display:n,maxWidth:t,compact:C==="compact",breakLines:i,tight:C==="tight"})}catch{s=null}return f7(NL,L,s)}
function $x(e){if(e.length>p7)throw new F1(`formula longer than ${p7} characters`);let C=`inline
${e}`;return d7(k9,C)??f7(k9,C,Qe(e,{display:!1}))}
function Gx(e,C,t){return{emPx:e.emPx,cellWidth:e.cellWidth,cellHeight:e.cellHeight,maxColumns:zL({cellWidth:e.cellWidth,maxColumns:C}),align:t,minRows:1,baselinePx:e.baselinePx,centerInk:t==="left",minScale:OL,overflowPx:Math.max(1,Math.round(e.cellHeight*Xg)),...e.weight!==void 0?{weight:e.weight}:{}}}
function h7(e,C){return{emPx:e.emPx,cellWidth:e.cellWidth,cellHeight:e.cellHeight,maxColumns:zL(e),align:"center",minRows:C,...e.weight!==void 0?{weight:e.weight}:{}}}
function d7(e,C){let t=e.get(C);return t!==void 0&&(e.delete(C),e.set(C,t)),t}
function f7(e,C,t){return e.set(C,t),e.size>Qg&&e.delete(e.keys().next().value),t}
var tM=2*1024*1024;
function jx(e,C){let t={ink:e.ink,background:e.background??R7(e.ink)};return{emPx:e.emPx,cellWidth:e.cellWidth,cellHeight:e.cellHeight,maxColumns:Math.max(1,Math.min(255,e.maxColumns)),maxRows:Math.max(1,Math.min(255,e.maxRows??CM)),...C!==void 0?{minRows:C}:{},...e.weight!==void 0?{weight:e.weight}:{},...e.inkOver?{over:e.inkOver}:{},color:(L,n)=>T7(L,t,n)}}
function ZH(e,C){let t=AC(e,jx(C));if(t.scale<Hx)throw new F1(`picture too large to draw legibly (it would be drawn at ${Math.round(t.scale*100)}% size)`);return t}
function YH(e,C,t){let L=jx(C,t),n=AC(e,L);if(n.scale<Hx)throw new F1(`picture too large to draw legibly (it would be drawn at ${Math.round(n.scale*100)}% size)`);if(n.columns*C.cellWidth*n.rows*C.cellHeight>_L)throw new F1("picture too large to draw");let i=Zi(e,L),s=Ji(i);if(s.length>tM)throw new F1("picture too large to send to the terminal");return{columns:i.columns,rows:i.rows,scale:i.scale,png:s}}
function JH(e){return Yi(e)}
function Cj(e,C){let t=K3(e,h7(C));if(t.scale<w9)throw new F1(F9(t.scale));return t}
function tj(e,C,t){let L=h7(C,t),n=K3(e,L);if(n.scale<w9)throw new F1(F9(n.scale));if(n.columns*C.cellWidth*n.rows*C.cellHeight>_L)throw new F1("formula too large to draw");let i=v6(e,L);return{columns:i.columns,rows:i.rows,scale:i.scale,png:H7(i,C.ink,C.inkOver)}}
export{Px,tM,wL,vx,Ox,Nx,TL,RL,jg,Ix,qg,Sx,Rx,zL,Vg,GH,HH,Cj,UH,Zg,ZH,qH,KH,IL,Ug,jH,tj,VH,XH,YH,JH,Tx,QH,px,xx};
