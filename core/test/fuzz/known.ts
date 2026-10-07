// The failures the fuzz suite knows of, by the cause diagnose.ts names: each
// is a finding of the fuzz report (FUZZ-n) with its regression test in
// regressions.test.ts (skipped until it is fixed). A default run fails only
// on a failure none of these explains; when a finding is fixed, drop its
// patterns here and unskip its regression.

import type { Failure } from './drive.js'

export interface Known {
  id: string
  title: string
  /** `check/cause` keys it explains. */
  keys: RegExp[]
}

export const KNOWN: readonly Known[] = [
  {
    id: 'FUZZ-12',
    title: 'the landed text is scanned again: dollar signs the streaming left (currency, a `\\$` inside a formula) pair into new formulas',
    keys: [/^resumed\/rows$/, /^phantom\/rescan$/, /:dollars-paired$/],
  },
  {
    id: 'FUZZ-2',
    title: 'with maxProseWidth narrower than the window, display previews (and refused notes) are laid out for the window and wrap',
    keys: [/preview-wider-than-prose\(maxProseWidth\)/, /refused-note-wraps\(maxProseWidth\)/],
  },
  {
    id: 'FUZZ-5',
    title: 'a display preview line in a list item or quote is wider than the item text: it wraps while streaming',
    keys: [/preview-wider-than-prose\((indent|quote|wide)\)/],
  },
  {
    // Mostly fixed on main (90c1bba: list display math is drawn in its item); what is left: a list whose
    // display formula keeps its preview or its source (refused, a glyph the font lacks) is still cut there.
    id: 'FUZZ-1',
    title: 'a list holding a display formula that is not drawn (refused, kept as preview) is cut at it: the rest is drawn as a new text (a blank row added, indent and numbering lost)',
    keys: [/^moved\/(rows|cells):list>/],
  },
  {
    // Mostly fixed (fix/stream-plan: the stream reads the whole part, the replays stop at what they can't follow);
    // what is left: marked reading a quote's lazy lines (or a later setext underline) otherwise than the lines
    // before them, so the part streamed is not the part landed.
    id: 'FUZZ-3',
    title: 'an inline formula padded while streaming lands where the replay refuses its part (something later in it): its pads stay as gaps',
    keys: [
      /^inlineImage\/inline-missing:\w+-refused-/,
      /^inlineImage\/inline-missing:(no-part|in-\w+|not-found)$/,
      /^padVisible\/pad:opaque-/,
      /^padVisible\/pad:[\w-]+-refused-/,
      /^inlineImage\/inline-missing:as-written-refused-/,
      /^resumed\/(pads-left-live|structure)$/,
    ],
  },
  {
    // The header-row case is fixed (fix/stream-plan: a table with inline math is held until it ends).
    id: 'FUZZ-4',
    title: 'an inline preview wider than its table cell or list item text, or than the row with punctuation glued to it, is padded, wraps, and never gets its image',
    keys: [
      /^inlineImage\/inline-missing:(table|list|heading|blockquote|paragraph)-laid-out$/,
      /^padVisible\/pad:(table|list|blockquote|paragraph)$/,
      // The formula after such a wrapped preview, misplaced by a cell (the replay's hard wrap puts its zero-width mark on the next row).
      /^predicted\/inline$/,
      /^overPreview\/inline:list>list$/,
      // A table's header row is padded as a paragraph until its delimiter row arrives; in a narrow cell the preview wraps.
      /^imageShape\/inline-columns$/,
      /^overPreview\/inline:table>table$/,
    ],
  },
  {
    id: 'FUZZ-6',
    title: 'inline math with no one-line Unicode form (matrices, cases, braces) stays raw LaTeX',
    keys: [/^rawLatex\/inline-no-unicode$/],
  },
  {
    id: 'FUZZ-7',
    title: 'two formulas with the same preview (\\tfrac12 and \\frac12, A^T and A^\\top) both land with the later one\'s image',
    keys: [/^impure\/collision$/, /^inlineImage\/inline-extra$/, /^inlineImage\/inline-missing:collision$/, /^resumed\/images-swapped$/],
  },
  {
    id: 'FUZZ-8',
    title: 'a ```math fence in a reply with no other math is drawn live, but stays a code block after --resume',
    keys: [/^resumed\/live-only-d$/],
  },
  {
    id: 'FUZZ-9',
    title: 'display math in a quote the replay refuses, or nested two quotes deep, keeps its Unicode preview or its source',
    keys: [
      /^rawLatex\/(display|note)$/,
      /^displayImage\/display-missing$/,
      /^overPreview\/quoted:/,
      /^unverified\/structure:opaque-blockquote/,
      /^resumed\/(resumed|live)-only-q$/,
      /^overlap\/images-below-opaque$/,
    ],
  },
  {
    id: 'FUZZ-11',
    title: 'a prose piece cut out at an image, with no markdown in it, is drawn as written: its escapes show (`\\$5`)',
    keys: [/^moved\/(cells|rows):paragraph>text/],
  },
  {
    // Not failures: where the replay can't follow a part (rows unknown), the comparison can't be made.
    id: 'UNVERIFIED',
    title: 'parts the replay cannot follow differ between the streamed and landed drawings (can not be told offline)',
    keys: [/^unverified\/structure:/],
  },
  {
    // The long list is fixed (fix/stream-plan: the writer keeps everything).
    id: 'FUZZ-15',
    title: 'in a list longer than the writer\'s 2 KB tail, a nested item\'s display image is sized for the wrong depth and passes the right edge',
    keys: [/^overlap\/edge-(quoted|display)$/],
    // Also without a long list: a display in an item nested under a lazy line (seed 7952).
  },
  {
    // Mostly fixed (fix/stream-plan: the stream reads parts as the landing does); what is left is the landing's:
    // no link mode without inline images, the resumed plan's passes (padded, then plain), refused display math
    // in quotes, rescanned dollars.
    id: 'FUZZ-16',
    title: 'resumed lands images where the live landing keeps Unicode: streaming refuses a part (its block so far) that the landing lays out alone',
    keys: [/^resumed\/(resumed|live)-only-[diq]+$/, /^resumed\/images-differ$/],
  },
  {
    // The stream is fixed (fix/stream-plan: a part laid out once per flush); what is left is the landing's.
    id: 'FUZZ-10',
    title: 'MessageDisplay re-lexes the block written so far for every inline formula: a flush of a long list takes seconds (and a huge resumed reply lands in ~2 s)',
    keys: [/^slow\/(push|land|resume)$/],
  },
]

/** The finding that explains a failure, if any (the first that does: those named by a cause's tail come first). */
export function knownCause(failure: Failure): Known | undefined {
  const key = `${failure.check}/${failure.cause}`
  return KNOWN.find(known => known.keys.some(pattern => pattern.test(key)))
}
