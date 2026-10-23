"""Tests for record.py's kitty answers: each query Claude Code makes at startup
is answered whatever way the pty splits its output into reads.

Run: python3 -m unittest discover -s .github/scripts/demo (npm run test:scripts).
Standard library only, like record.py.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import record  # noqa: E402  (the script beside this file, not a package)

# Claude Code's startup probe as two reads of a recorded take (f-after): the
# first ends on the kitty graphics query's ST, the second holds DA1, which
# Claude Code reads as the end of its probe.
QUERY = b'\x1b[?2026$p\x1b_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA\x1b\\'
DA1 = b'\x1b[16t\x1b[?1016$p\x1b[c'
GRAPHICS_OK = b'\x1b_Gi=31;OK\x1b\\'
DA1_ANSWER = b'\x1b[?62;22;52c'


def session():
    """A Session with no child process: its replies are kept in a list."""
    s = record.Session.__new__(record.Session)
    s.cols, s.rows, s.cw, s.ch = 92, 38, 10, 20
    s.fg, s.bg = '#ebdbb2', '#282828'
    s.tail, s.text, s.images = b'', '', 0
    s.replies = []
    s.reply = s.replies.append
    return s


def fed(*reads):
    s = session()
    for b in reads:
        s.feed(b)
    return s.replies


class Answers(unittest.TestCase):
    def test_a_read_ending_on_the_graphics_query_st_is_answered_before_da1(self):
        replies = fed(QUERY, DA1)
        self.assertIn(GRAPHICS_OK, replies)
        self.assertLess(replies.index(GRAPHICS_OK), replies.index(DA1_ANSWER))

    def test_the_probe_in_one_read_is_answered_in_order(self):
        replies = fed(QUERY + DA1)
        self.assertLess(replies.index(GRAPHICS_OK), replies.index(DA1_ANSWER))

    def test_a_read_cut_inside_the_st_waits_for_the_rest(self):
        replies = fed(QUERY[:-1], QUERY[-1:] + DA1)
        self.assertEqual(replies.count(GRAPHICS_OK), 1)
        self.assertLess(replies.index(GRAPHICS_OK), replies.index(DA1_ANSWER))

    def test_a_read_cut_inside_the_query_body_waits_for_the_rest(self):
        replies = fed(QUERY[:20], QUERY[20:], DA1)
        self.assertEqual(replies.count(GRAPHICS_OK), 1)

    def test_an_osc_colour_query_ended_by_st_at_a_read_end_is_answered(self):
        replies = fed(b'\x1b]11;?\x1b\\', b'\x1b[c')
        self.assertEqual(replies[0], b'\x1b]11;rgb:2828/2828/2828\x1b\\')


class SplitEscape(unittest.TestCase):
    def test_whole_sequences_leave_no_tail(self):
        self.assertEqual(record.split_escape(QUERY), (QUERY, b''))

    def test_a_cut_csi_is_held(self):
        self.assertEqual(record.split_escape(b'ab\x1b[?20'), (b'ab', b'\x1b[?20'))

    def test_a_lone_esc_at_the_end_is_held(self):
        self.assertEqual(record.split_escape(b'ab\x1b'), (b'ab', b'\x1b'))

    def test_a_malformed_escape_before_whole_text_is_not_held(self):
        buf = b'\x1b]8;;\x1b[c'
        self.assertEqual(record.split_escape(buf), (buf, b''))


if __name__ == '__main__':
    unittest.main()
