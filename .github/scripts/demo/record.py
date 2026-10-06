#!/usr/bin/env python3
"""Records one real Claude Code turn with kittex loaded, for the README demo.

Usage (from the repository root, after `npm ci && npm run build`):

    npm run readme:demo:record   # one Opus turn -> .github/assets/demo.rec.gz
    npm run readme:demo          # renders it (render.mjs)

    python3 .github/scripts/demo/record.py [--model M] [--prompt P] [--out F]
        [--no-submit --debug-file F]   # type but never send: no model turn

Claude Code runs in a pty that poses as kitty: TERM=xterm-kitty, answers to
the queries kitty answers (device attributes, XTVERSION, DECRQM, the cell and
window size in pixels, OSC 10/11 colours, kitty graphics a=q), and a window
size set in cells and pixels (TIOCSWINSZ), so kittex's cell probe sees real
pixels and rasterizes its formulas for them. The prompt is typed one character
at a time with human jitter. Every byte Claude Code writes is kept with its
time; nothing is emulated here (render.mjs does that offline).

All tools are off (--tools '' and --disallowedTools), kittex is loaded only
with --plugin-dir, and the session runs in a neutral directory (a `kittex`
folder under the temporary directory) with CLAUDE_CODE_HIDE_CWD set; its trust
dialog is accepted (IS_DEMO would skip it, but then no plugin hooks load). Don't
pass --debug-file to a take: Claude Code then prints the log's path in its header.
Standard library only.

The recording is gzipped JSON lines: a header, then {"t", "o": base64 output},
{"t", "i": input} and {"t", "mark": ready|submit|done} records, t in seconds.
"""
import argparse
import base64
import fcntl
import gzip
import json
import os
import pty
import random
import re
import select
import signal
import struct
import sys
import tempfile
import termios
import time

PROMPT = 'Show one key equation each for pretraining, RLHF and DPO, with one short sentence each.'
# Claude Code's fullscreen layout (alternate screen), where kittex lands its images without a blank frame.
SETTINGS = '{"tui": "fullscreen"}'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DEFAULT_CLAUDE = os.path.expanduser('~/.local/share/claude/versions/2.1.291')

# Variables of a parent Claude Code session that must not leak into the child.
UNSET = ('CLAUDECODE CLAUDE_CODE_SESSION_ID CLAUDE_CODE_CHILD_SESSION CLAUDE_CODE_ENTRYPOINT '
         'CLAUDE_CODE_MESSAGING_SOCKET CLAUDE_CODE_MESSAGING_TOKEN CLAUDE_PID CLAUDE_EFFORT '
         'CLAUDE_CODE_SESSION_ATTENDED CLAUDE_CODE_EXECPATH').split()

# Every tool off: a reply is all the demo needs, and test sessions with tools
# once published an artifact and created documents on the account. `--tools ''`
# leaves the claude.ai connectors (Docs, Drive, ...) on, so they are turned off
# too: --strict-mcp-config, their names below, and ENABLE_CLAUDEAI_MCP_SERVERS.
NO_TOOLS = ['--tools', '', '--strict-mcp-config', '--disallowedTools',
            'Artifact,ArtifactComments,ArtifactData,Skill,Agent,Bash,Write,Edit,NotebookEdit,WebFetch,WebSearch,'
            'mcp__claude_ai_Claude_Docs,mcp__claude_ai_Improved,mcp__claude_ai_Google_Drive']

TRUST = r'trust\s*(the\s*files|this\s*folder)|Yes,\s*I\s*trust'
APC = re.compile(rb'\x1b_(.*?)\x1b\\', re.S)
ESCAPES = re.compile(r'\x1b\[\d*[CG]|\x1b\[[0-9;:?<>=]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[P_^X].*?\x1b\\|\x1b.', re.S)


def spaces(m):
    """An escape as the text it leaves: a cursor move along the line is a gap."""
    return ' ' if m.group(0)[-1] in 'CG' and m.group(0)[1] == '[' else ''


def hex16(rgb):
    """#rrggbb as the rgb:rrrr/gggg/bbbb an OSC 10/11 answer carries."""
    return 'rgb:' + '/'.join(rgb[i:i + 2] * 2 for i in (1, 3, 5))


class Session:
    def __init__(self, argv, cwd, env, cols, rows, cw, ch, fg, bg, log):
        self.cols, self.rows, self.cw, self.ch = cols, rows, cw, ch
        self.fg, self.bg = fg, bg
        self.log = log
        self.t0 = time.time()
        self.text = ''  # everything shown so far, escapes stripped (for waiting)
        self.tail = b''  # an escape sequence cut by a read
        self.last_output = time.time()
        self.images = 0
        pid, fd = pty.fork()
        if pid == 0:
            os.chdir(cwd)
            os.execve(argv[0], argv, env)
        self.pid, self.fd = pid, fd
        ws = struct.pack('HHHH', rows, cols, cols * cw, rows * ch)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, ws)
        self.alive = True

    def t(self):
        return round(time.time() - self.t0, 4)

    def record(self, **kw):
        self.log.write(json.dumps({'t': self.t(), **kw}) + '\n')

    def mark(self, name):
        self.record(mark=name)

    def send(self, data):
        os.write(self.fd, data.encode())
        self.record(i=data)

    def reply(self, data):
        os.write(self.fd, data)

    def answer(self, b):
        """The answers kitty gives to the queries Claude Code makes at startup.
        The kitty keyboard query (CSI ? u) stays unanswered, so keys are sent
        as plain bytes."""
        for m in re.finditer(rb'\x1b\[(>?)(\d*)c', b):
            self.reply(b'\x1b[>1;4000;29c' if m.group(1) else b'\x1b[?62;22;52c')
        for _ in re.finditer(rb'\x1b\[>0?q', b):
            self.reply(b'\x1bP>|kitty(0.39.1)\x1b\\')
        for m in re.finditer(rb'\x1b\[\?(\d+)\$p', b):
            self.reply(b'\x1b[?' + m.group(1) + b';2$y')
        for m in re.finditer(rb'\x1b\[(\d+)t', b):
            n = m.group(1)
            if n == b'14':
                self.reply(f'\x1b[4;{self.rows * self.ch};{self.cols * self.cw}t'.encode())
            elif n == b'16':
                self.reply(f'\x1b[6;{self.ch};{self.cw}t'.encode())
            elif n == b'18':
                self.reply(f'\x1b[8;{self.rows};{self.cols}t'.encode())
        for m in re.finditer(rb'\x1b\](1[01]);\?(\x07|\x1b\\)', b):
            col = self.fg if m.group(1) == b'10' else self.bg
            self.reply(b'\x1b]' + m.group(1) + b';' + hex16(col).encode() + b'\x1b\\')
        for m in APC.finditer(b):
            body = m.group(1)
            if not body.startswith(b'G'):
                continue
            keys = dict(kv.split(b'=', 1) for kv in body[1:].split(b';', 1)[0].split(b',') if b'=' in kv)
            if keys.get(b'a') == b'q':
                self.reply(b'\x1b_Gi=' + keys.get(b'i', b'0') + b';OK\x1b\\')
            elif keys.get(b'a') in (b'T', b't'):  # the first chunk of an image
                self.images += 1

    def pump(self, dt):
        end = time.time() + dt
        while self.alive:
            left = end - time.time()
            if left <= 0:
                return
            r, _, _ = select.select([self.fd], [], [], left)
            if not r:
                continue
            try:
                b = os.read(self.fd, 1 << 16)
            except OSError:
                b = b''
            if not b:
                self.alive = False
                return
            self.record(o=base64.b64encode(b).decode())
            self.last_output = time.time()
            buf = self.tail + b
            cut = buf.rfind(b'\x1b')
            if cut != -1 and not re.match(rb'\x1b(\[[0-9;:?<>=]*[ -/]*[@-~]|\][^\x07]*\x07|.*?\x1b\\)', buf[cut:], re.S):
                self.tail, buf = buf[cut:], buf[:cut]
            else:
                self.tail = b''
            self.answer(buf)
            plain = ESCAPES.sub(spaces, buf.decode('utf-8', 'replace'))
            self.text = (self.text + plain)[-20000:]

    def wait_for(self, pattern, timeout):
        rx = re.compile(pattern, re.I)
        end = time.time() + timeout
        while time.time() < end and self.alive:
            if rx.search(self.text):
                return True
            self.pump(0.1)
        return False

    def type(self, text, rng):
        """One character at a time, at a human's uneven pace."""
        for i, c in enumerate(text):
            self.send(c)
            delay = rng.gauss(0.05, 0.018)
            if c == ' ':
                delay += rng.uniform(0.0, 0.04)
            if c in ',.?' and i + 1 < len(text):
                delay += rng.uniform(0.08, 0.18)
            self.pump(min(max(delay, 0.02), 0.3))

    def close(self):
        try:
            os.kill(self.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        self.pump(1)
        try:
            os.waitpid(self.pid, 0)
        except ChildProcessError:
            pass


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--prompt', default=PROMPT)
    ap.add_argument('--model', default='claude-opus-5-5')
    ap.add_argument('--out', default=os.path.join(ROOT, '.github', 'assets', 'demo.rec.gz'))
    ap.add_argument('--claude', default=DEFAULT_CLAUDE)
    ap.add_argument('--cols', type=int, default=92)
    ap.add_argument('--rows', type=int, default=38)
    ap.add_argument('--cell', default='18x40', help='cell size in device pixels, WxH')
    ap.add_argument('--fg', default='#ebdbb2')
    ap.add_argument('--bg', default='#282828')
    ap.add_argument('--seed', type=int, default=7, help='seed of the typing rhythm')
    ap.add_argument('--timeout', type=float, default=300)
    ap.add_argument('--settings', default=SETTINGS, help='--settings JSON for Claude Code')
    ap.add_argument('--debug-file', default='', help="Claude Code's --debug-file")
    ap.add_argument('--no-submit', action='store_true', help='type the prompt but never send it (no model turn)')
    ap.add_argument('--env', action='append', default=[], help='extra KEY=VALUE for Claude Code')
    ap.add_argument('--cwd', default='', help='a neutral directory named kittex to run in (default: <tmp>/kittex-demo/kittex)')
    args = ap.parse_args()
    cw, ch = (int(n) for n in args.cell.split('x'))

    env = {k: v for k, v in os.environ.items() if k not in UNSET}
    env.update({
        'TERM': 'xterm-kitty', 'TERM_PROGRAM': 'kitty', 'KITTY_WINDOW_ID': '1', 'COLORTERM': 'truecolor',
        'CLAUDE_CODE_FORCE_TERMINAL_IMAGES': '1', 'DISABLE_AUTOUPDATER': '1', 'ENABLE_CLAUDEAI_MCP_SERVERS': 'false',
        'CLAUDE_CODE_HIDE_CWD': '1',
    })
    cwd = args.cwd or os.path.join(tempfile.gettempdir(), 'kittex-demo', 'kittex')
    os.makedirs(cwd, exist_ok=True)
    argv = [args.claude, '--model', args.model, *NO_TOOLS, '--plugin-dir', os.path.join(ROOT, 'plugin')]
    if args.settings:
        argv += ['--settings', args.settings]
    if args.debug_file:
        argv += ['--debug-file', args.debug_file]
    env.update(kv.split('=', 1) for kv in args.env)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with gzip.open(args.out, 'wt') as log:
        log.write(json.dumps({
            'kind': 'kittex-demo-recording', 'version': 1, 'cols': args.cols, 'rows': args.rows,
            'cellWidth': cw, 'cellHeight': ch, 'model': args.model, 'prompt': args.prompt,
            'claude': os.path.basename(args.claude), 'recorded': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        }) + '\n')
        s = Session(argv, cwd, env, args.cols, args.rows, cw, ch, args.fg, args.bg, log)
        ready = r'\?\s*for\s*shortcuts|shift\+tab|/help'
        if not s.wait_for(ready + '|' + TRUST, 60):
            sys.exit('Claude Code did not start')
        if re.search(TRUST, s.text, re.I):
            # "No, exit" is selected first: move to "Yes, I trust this folder".
            s.pump(1.5)
            s.text = ''
            s.send('\x1b[B')
            s.pump(0.5)
            s.send('\r')
            if not s.wait_for(ready, 30):
                sys.exit('no prompt after the trust dialog')
        s.pump(2.5)  # let the startup settle (mods load, the prompt box draws)
        s.mark('ready')
        s.pump(0.8)
        s.type(args.prompt, random.Random(args.seed))
        s.pump(0.45)
        if args.no_submit:
            s.pump(2)
            s.send('\x03')
            s.pump(0.5)
            s.send('\x03')
            s.pump(1.5)
            s.close()
            return
        s.mark('submit')
        s.send('\r')
        # Done when the output has been quiet for a while after kittex's images
        # went out (or for longer without any).
        end = time.time() + args.timeout
        while s.alive and time.time() < end:
            s.pump(0.25)
            quiet = time.time() - s.last_output
            if (s.images and quiet > 5) or quiet > 20:
                break
        s.mark('done')
        s.pump(1)
        s.send('\x03')
        s.pump(0.5)
        s.send('\x03')
        s.pump(1.5)
        s.close()
    print(f'{args.out}: {s.images} images, {s.t():.1f} s', file=sys.stderr)


if __name__ == '__main__':
    main()
