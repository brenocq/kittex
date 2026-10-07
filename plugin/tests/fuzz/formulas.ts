// The formulas the fuzz generator writes, as Claude writes them in technical
// replies: inline ones from short to wide and tall, with the scripts, bars,
// stars and pipes that clash with markdown, and refused or unsupported ones;
// display ones of its own (core/test/fuzz adds the stress corpus's 425).

const t = String.raw

/** Inline formulas, by kind. */
export const INLINE = {
  short: [
    t`x`, t`n`, t`k`, t`x_i`, t`a^2`, t`x^2`, t`n \ge 1`, t`a < b`, t`f(x)`, t`\alpha`, t`\beta_1`, t`\theta`, t`\lambda`,
    t`O(n \log n)`, t`O(n^2)`, t`\mathbb{R}^n`, t`\nabla f`, t`y_w`, t`x \in [0, 1]`, t`e^{i\pi} + 1 = 0`, t`E = mc^2`,
    t`\epsilon_0`, t`\mu`, t`\sigma^2`, t`p < 0.05`, t`i`, t`j`, t`N`, t`2^{10}`, t`10^{-3}`, t`\pi \approx 3.14`,
    t`a \ne b`, t`x \to \infty`, t`f \circ g`, t`\partial_t u`, t`\mathrm{d}x`, t`x \bmod p`, t`\pm 1`, t`\infty`,
    t`T_{\mu\nu}`, t`\Gamma^\lambda_{\mu\nu}`, t`\pi_{\text{ref}}`, t`D_{KL}`, t`x_1, \dots, x_n`, t`a \cdot b`,
    t`\langle u, v \rangle`, t`\{x\}`, t`\lfloor x \rfloor`, t`\lceil n/2 \rceil`, t`A^{-1}`, t`A^T`, t`A^\top`,
    t`\det(A)`, t`\operatorname{tr}(A)`, t`\operatorname{rank} A`, t`\mathcal{L}`, t`\mathcal{O}(1)`, t`\mathbf{x}`,
    t`\boldsymbol{\mu}`, t`\vec{v}`, t`\hat{y}`, t`\bar{x}`, t`\tilde{f}`, t`\dot{\theta}_i`, t`\ddot{x}`, t`f'(x)`,
    t`f''(x)`, t`n!`, t`\sqrt{2}`, t`\sqrt{x^2 + y^2}`, t`\log_2 n`, t`\ln x`, t`\sin\theta`, t`\cos^2 x + \sin^2 x = 1`,
    t`\exp(-x)`, t`\max(a, b)`, t`\min_i x_i`, t`\arg\max_x f(x)`, t`\Pr[X = 1]`, t`\mathbb{E}[X]`, t`\operatorname{Var}(X)`,
    t`\#S`, t`\%`, t`\$5`, t`100\%`, t`\star`, t`\dagger`, t`\hbar`, t`\ell`, t`\aleph_0`, t`\emptyset`, t`\mathfrak{g}`,
    t`\mathscr{F}`, t`x \mapsto x^2`, t`A \subseteq B`, t`A \cup B`, t`\neg p`, t`p \land q`, t`p \Rightarrow q`,
    t`\forall x`, t`\exists y`, t`\mathbb{Z}/n\mathbb{Z}`, t`\gcd(a, b) = 1`, t`a \equiv b \pmod{n}`, t`\binom{n}{k}`,
  ],
  /** Markdown clashes: stars, underscores, pipes, brackets, backticks, tildes, angle brackets. */
  clash: [
    t`|x|`, t`P(A|B)`, t`P(A \mid B)`, t`\|v\|_2`, t`\|x\|`, t`\hat{x}_{k|k-1}`, t`P_{k|k-1}`, t`(AB)^* = B^*A^*`, t`A^*`,
    t`\theta^*`, t`f^*`, t`a*b`, t`f * g`, t`x_1 * y_2`, t`a_{ij}`, t`b_{kl}`, t`[a](b)`, t`[0, 1)`, t`\tilde{x}`, t`\sim`,
    t`a \sim b`, t`a < b > c`, t`x<y`, t`\langle x|`, t`|\psi\rangle`, t`\langle\phi|\psi\rangle`, t`|a| + |b|`,
    t`x_{\text{max}}`, t`\#`, t`_a b`, t`\_`, t`a\_b`, t`!x`, t`\neg x`, t`x \mathbin{\&} y`, t`\&`, t`>`, t`\gg`, t`\ll`,
  ],
  /** Wide: longer than a few cells, some wider than a narrow row. */
  wide: [
    t`\sum_{i=1}^{n} x_i^2 = x_1^2 + x_2^2 + \cdots + x_n^2`,
    t`f(x) = a_0 + a_1 x + a_2 x^2 + a_3 x^3 + a_4 x^4 + a_5 x^5 + a_6 x^6`,
    t`\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}`,
    t`L(\theta) = -\sum_{i} y_i \log \hat{y}_i + (1 - y_i)\log(1 - \hat{y}_i)`,
    t`\mathcal{L}(\theta) = \mathbb{E}_{x \sim p_{\text{data}}}[\log p_\theta(x)]`,
    t`x_{k+1} = x_k - \alpha \nabla f(x_k)`,
    t`\hat{x}_{k|k} = \hat{x}_{k|k-1} + K_k (z_k - H_k \hat{x}_{k|k-1})`,
    t`P(x_1, x_2, \ldots, x_n) = \prod_{i=1}^{n} P(x_i \mid x_1, \ldots, x_{i-1})`,
    t`\text{softmax}(z)_i = e^{z_i} / \sum_j e^{z_j}`,
    t`\operatorname{Attention}(Q, K, V) = \operatorname{softmax}(QK^T / \sqrt{d_k}) V`,
    t`a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9 + a_{10} + a_{11} + a_{12} + a_{13} + a_{14} + a_{15}`,
    t`D_{KL}(p \| q) = \sum_x p(x) \log \frac{p(x)}{q(x)}`,
    t`\text{if } x > 0 \text{ then } f(x) = 1 \text{ else } f(x) = 0`,
  ],
  /** Tall: fractions, limits, matrices (too tall for a row; some have no one-line Unicode). */
  tall: [
    t`\frac{1}{2}`, t`\frac{a}{b}`, t`\frac{n(n+1)}{2}`, t`\sum_{i=1}^n x_i`, t`\int_0^1 f(x)\,dx`, t`\lim_{x \to 0} \frac{\sin x}{x}`,
    t`\prod_{k=1}^{n} k`, t`\begin{pmatrix} a & b \\ c & d \end{pmatrix}`, t`\begin{bmatrix} 1 \\ 0 \end{bmatrix}`,
    t`\left(\frac{a}{b}\right)^2`, t`e^{-\frac{x^2}{2}}`, t`\sigma(z) = \frac{1}{1 + e^{-z}}`, t`\tfrac{1}{2}`, t`\dfrac{a}{b}`,
    t`\underbrace{a + b}_{n}`, t`\overbrace{x + y}^{k}`, t`\overline{z}`, t`\sqrt[3]{y + 1}`, t`\vec{AB}`, t`\widehat{xyz}`,
    t`\begin{cases} 1 & x > 0 \\ 0 & \text{else} \end{cases}`, t`x^{x^{x}}`, t`a^{\frac{p-1}{2}}`, t`\binom{2n}{n}`,
    t`\mathbf{p} = \begin{pmatrix} l_1 c_1 + l_2 c_{12} \\ l_1 s_1 + l_2 s_{12} \end{pmatrix}`, t`\boxed{x = 1}`,
  ],
  /** Refused by MathJax, or characters the font lacks. */
  refused: [
    t`\ce{H2O}`, t`\foo{x}`, t`\undefinedmacro`, t`\text{速度}`, t`\text{Привет}`, t`\frac{a}{`, t`x^{2`, t`\begin{tikzcd} A \arrow[r] & B \end{tikzcd}`,
    t`\slashed{D}`, t`\mathbbm{1}`, t`\bm{x}`, t`\SI{3}{\meter}`, t`\textsc{Abc}`,
  ],
} as const

export type InlineKind = keyof typeof INLINE

/** Display formulas of its own, short and long, a refused one and one with glyphs the font lacks. */
export const DISPLAY: readonly string[] = [
  t`e^{i\pi} + 1 = 0`,
  t`a^2 + b^2 = c^2`,
  t`\sum_{n=1}^\infty \frac{1}{n^2} = \frac{\pi^2}{6}`,
  t`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`,
  t`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`,
  t`\hat{x}_{k|k-1} = F_k \hat{x}_{k-1|k-1} + B_k u_k`,
  t`P_{k|k-1} = F_k P_{k-1|k-1} F_k^T + Q_k`,
  t`\begin{aligned} f(x) &= x^2 \\ f'(x) &= 2x \end{aligned}`,
  t`\begin{cases} x + y = 1 \\ x - y = 0 \end{cases}`,
  t`A = \begin{pmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & 9 \end{pmatrix}`,
  t`\ce{2H2 + O2 -> 2H2O}`,
  t`\foo{bar}`,
  t`\text{Привет, мир}`,
]

/** Display formulas that are huge (a hook's time budget). */
export const GIANT: readonly string[] = [
  `\\begin{pmatrix} ${Array.from({ length: 24 }, (_, i) => Array.from({ length: 24 }, (_, j) => `a_{${i}${j}}`).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`,
  `\\begin{aligned} ${Array.from({ length: 60 }, (_, k) => `f_{${k}}(x) &= \\sum_{i=0}^{${k}} \\frac{x^i}{i!} + \\int_0^x t^{${k}}\\,dt`).join(' \\\\ ')} \\end{aligned}`,
  Array.from({ length: 400 }, (_, k) => `x_{${k}}`).join(' + '),
]

/** Bare environments a model writes on lines of their own (no `$$`). */
export const BARE_ENVS: readonly string[] = [
  t`\begin{aligned}
f(x) &= (x+1)^2 \\
&= x^2 + 2x + 1
\end{aligned}`,
  t`\begin{cases}
1 & \text{if } x > 0 \\
0 & \text{otherwise}
\end{cases}`,
  t`\begin{pmatrix}
1 & 0 \\
0 & 1
\end{pmatrix}`,
  t`\begin{align}
a &= b + c \\
d &= e
\end{align}`,
  t`\begin{equation}
E = mc^2
\end{equation}`,
]
