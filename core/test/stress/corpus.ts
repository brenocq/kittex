// Display formulas of the kind Claude writes in technical replies, for the
// stress runner (stress.test.ts). Each is tagged with its area and the stresses
// it exercises, so a failure can be traced to the construct behind it. The TeX
// is written as a model writes it, mistakes and package habits included: some
// of these are expected to fail, and the runner records how.

export interface StressFormula {
  area: string
  /** What this formula exercises (packages, layouts, sizes). */
  stress: string[]
  tex: string
}

const t = String.raw
const group = (area: string, items: [string[], string][]): StressFormula[] => items.map(([stress, tex]) => ({ area, stress, tex }))

export const STRESS_CORPUS: readonly StressFormula[] = [
  ...group('general relativity', [
    [['frac', 'tensor-indices'], t`\Gamma^{\lambda}_{\mu\nu} = \frac{1}{2} g^{\lambda\sigma}\left(\partial_\mu g_{\nu\sigma} + \partial_\nu g_{\mu\sigma} - \partial_\sigma g_{\mu\nu}\right)`],
    [['tensor-indices', 'wide'], t`R^{\rho}{}_{\sigma\mu\nu} = \partial_\mu \Gamma^\rho_{\nu\sigma} - \partial_\nu \Gamma^\rho_{\mu\sigma} + \Gamma^\rho_{\mu\lambda}\Gamma^\lambda_{\nu\sigma} - \Gamma^\rho_{\nu\lambda}\Gamma^\lambda_{\mu\sigma}`],
    [['tensor-indices'], t`R_{\mu\nu} - \frac{1}{2} R\, g_{\mu\nu} + \Lambda g_{\mu\nu} = \frac{8\pi G}{c^4} T_{\mu\nu}`],
    [['wide', 'frac', 'left-right'], t`ds^2 = -\left(1 - \frac{2GM}{c^2 r}\right) c^2\,dt^2 + \left(1 - \frac{2GM}{c^2 r}\right)^{-1} dr^2 + r^2\left(d\theta^2 + \sin^2\theta\, d\phi^2\right)`],
    [['matrix', 'frac'], t`g_{\mu\nu} = \begin{pmatrix} -\left(1-\frac{r_s}{r}\right) & 0 & 0 & 0 \\ 0 & \left(1-\frac{r_s}{r}\right)^{-1} & 0 & 0 \\ 0 & 0 & r^2 & 0 \\ 0 & 0 & 0 & r^2\sin^2\theta \end{pmatrix}`],
    [['tensor-indices', 'prescripts'], t`{}^{(4)}\!R = {}^{(3)}\!R + K_{ij}K^{ij} - K^2`],
    [['tensor-indices', 'prescripts', 'sideset'], t`\sideset{_a^b}{_c^d}\Gamma`],
    [['tensor-indices'], t`\nabla_\mu T^{\mu\nu} = \partial_\mu T^{\mu\nu} + \Gamma^\mu_{\mu\lambda} T^{\lambda\nu} + \Gamma^\nu_{\mu\lambda} T^{\mu\lambda} = 0`],
    [['tensor-indices', 'staggered'], t`R^\alpha{}_{\beta\gamma\delta} + R^\alpha{}_{\gamma\delta\beta} + R^\alpha{}_{\delta\beta\gamma} = 0`],
    [['geodesic', 'frac'], t`\frac{d^2 x^\mu}{d\tau^2} + \Gamma^\mu_{\alpha\beta}\frac{dx^\alpha}{d\tau}\frac{dx^\beta}{d\tau} = 0`],
    [['aligned', 'long-derivation'], t`\begin{aligned}
\Gamma^t_{tr} &= \frac{r_s}{2r(r - r_s)} \\
\Gamma^r_{tt} &= \frac{r_s (r - r_s)}{2 r^3} \\
\Gamma^r_{rr} &= -\frac{r_s}{2r(r - r_s)} \\
\Gamma^r_{\theta\theta} &= -(r - r_s) \\
\Gamma^r_{\phi\phi} &= -(r - r_s)\sin^2\theta \\
\Gamma^\theta_{r\theta} &= \Gamma^\phi_{r\phi} = \frac{1}{r} \\
\Gamma^\theta_{\phi\phi} &= -\sin\theta\cos\theta \\
\Gamma^\phi_{\theta\phi} &= \cot\theta
\end{aligned}`],
    [['sqrt', 'frac'], t`\Delta\tau = \Delta t\sqrt{1 - \frac{2GM}{rc^2}}`],
    [['physics', 'tensor'], t`F_{\mu\nu} = \partial_\mu A_\nu - \partial_\nu A_\mu`],
    [['action', 'sqrt'], t`S = \frac{1}{16\pi G}\int d^4x\, \sqrt{-g}\, \left(R - 2\Lambda\right) + S_{\text{matter}}`],
  ]),

  ...group('quantum field theory', [
    [['slashed'], t`\mathcal{L}_{\text{Dirac}} = \bar\psi\left(i\gamma^\mu\partial_\mu - m\right)\psi = \bar\psi (i\slashed{\partial} - m)\psi`],
    [['slashed'], t`\slashed{p} = \gamma^\mu p_\mu`],
    [['lagrangian', 'wide'], t`\mathcal{L}_{\text{QED}} = \bar\psi(i\gamma^\mu D_\mu - m)\psi - \frac{1}{4}F_{\mu\nu}F^{\mu\nu}, \quad D_\mu = \partial_\mu + ieA_\mu`],
    [['path-integral', 'mathcal'], t`Z[J] = \int \mathcal{D}\phi\, \exp\left(i\int d^4x \left[\frac{1}{2}\partial_\mu\phi\,\partial^\mu\phi - \frac{1}{2}m^2\phi^2 + J\phi\right]\right)`],
    [['propagator', 'frac'], t`\tilde{D}_F(p) = \frac{i}{p^2 - m^2 + i\epsilon}`],
    [['wide', 'trace'], t`\mathcal{L}_{\text{YM}} = -\frac{1}{2}\operatorname{Tr}\left(F_{\mu\nu}F^{\mu\nu}\right), \quad F_{\mu\nu} = \partial_\mu A_\nu - \partial_\nu A_\mu - ig[A_\mu, A_\nu]`],
    [['anticommutator'], t`\{\gamma^\mu, \gamma^\nu\} = 2\eta^{\mu\nu}\mathbb{1}_4`],
    [['feynman', 'frac', 'slashed'], t`\frac{i(\slashed{p} + m)}{p^2 - m^2 + i\varepsilon}`],
    [['time-ordered', 'braket'], t`\langle 0 | T\{\phi(x)\phi(y)\} | 0 \rangle = \int \frac{d^4p}{(2\pi)^4} \frac{i e^{-ip\cdot(x-y)}}{p^2 - m^2 + i\epsilon}`],
    [['lagrangian', 'higgs'], t`V(\phi) = -\mu^2 \phi^\dagger\phi + \lambda\left(\phi^\dagger\phi\right)^2`],
    [['mathbbm'], t`\Pi_{\mu\nu}(q) = \left(q^2 g_{\mu\nu} - q_\mu q_\nu\right)\Pi(q^2), \qquad \mathbbm{1} = \sum_n |n\rangle\langle n|`],
    [['beta-function'], t`\beta(g) = \mu\frac{\partial g}{\partial \mu} = -\frac{g^3}{16\pi^2}\left(\frac{11}{3}C_A - \frac{4}{3}T_F n_f\right)`],
  ]),

  ...group('quantum mechanics', [
    [['braket', 'hat', 'frac'], t`i\hbar\frac{\partial}{\partial t}|\psi(t)\rangle = \hat{H}|\psi(t)\rangle`],
    [['commutator', 'hat'], t`[\hat{x}, \hat{p}] = i\hbar`],
    [['pauli', 'matrix', 'inline-matrices'], t`\sigma_x = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}, \quad \sigma_y = \begin{pmatrix} 0 & -i \\ i & 0 \end{pmatrix}, \quad \sigma_z = \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}`],
    [['braket-pkg'], t`\braket{\phi | \psi} = \int \phi^*(x)\psi(x)\,dx`],
    [['braket-pkg'], t`\Bra{\psi}\hat{A}\Ket{\psi} = \langle A \rangle`],
    [['physics-pkg'], t`\expval{\hat{H}}{\psi} = \mel{\psi}{\hat{H}}{\psi}`],
    [['physics-pkg'], t`\comm{\hat{L}_i}{\hat{L}_j} = i\hbar\,\epsilon_{ijk}\hat{L}_k`],
    [['physics-pkg', 'derivative'], t`\dv{\langle \hat{A} \rangle}{t} = \frac{i}{\hbar}\expval{\comm{\hat{H}}{\hat{A}}} + \expval{\pdv{\hat{A}}{t}}`],
    [['schrodinger', 'frac', 'laplacian'], t`-\frac{\hbar^2}{2m}\nabla^2\psi(\mathbf{r}) + V(\mathbf{r})\psi(\mathbf{r}) = E\psi(\mathbf{r})`],
    [['ladder', 'sqrt'], t`\hat{a}^\dagger|n\rangle = \sqrt{n+1}\,|n+1\rangle, \qquad \hat{a}|n\rangle = \sqrt{n}\,|n-1\rangle`],
    [['spin', 'frac', 'sqrt'], t`|\psi\rangle = \frac{1}{\sqrt{2}}\left(|{\uparrow\downarrow}\rangle - |{\downarrow\uparrow}\rangle\right)`],
    [['density-matrix', 'trace'], t`\rho = \sum_i p_i |\psi_i\rangle\langle\psi_i|, \qquad \operatorname{Tr}\rho = 1, \qquad S = -\operatorname{Tr}(\rho\ln\rho)`],
    [['hat', 'vec'], t`\hat{\vec{L}} = \hat{\vec{r}} \times \hat{\vec{p}}, \qquad \hat{L}^2 |l, m\rangle = \hbar^2 l(l+1)|l, m\rangle`],
    [['perturbation', 'sum-limits'], t`E_n^{(2)} = \sum_{k \neq n} \frac{|\langle k^{(0)}|\hat{V}|n^{(0)}\rangle|^2}{E_n^{(0)} - E_k^{(0)}}`],
    [['unicode-in-math'], t`ψ(x,t) = A e^{i(kx - ωt)}, \quad E = ℏω`],
    [['hydrogen', 'frac'], t`E_n = -\frac{m_e e^4}{2(4\pi\varepsilon_0)^2\hbar^2}\frac{1}{n^2} = -\frac{13.6\ \text{eV}}{n^2}`],
  ]),

  ...group('electromagnetism', [
    [['bold', 'nabla'], t`\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}`],
    [['aligned', 'bold'], t`\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}`],
    [['oint', 'oiint', 'integral-form'], t`\oiint_{\partial V} \mathbf{E} \cdot d\mathbf{A} = \frac{Q_{\text{enc}}}{\varepsilon_0}`],
    [['oint', 'integral-form'], t`\oint_{\partial S} \mathbf{B} \cdot d\boldsymbol{\ell} = \mu_0 I_{\text{enc}} + \mu_0\varepsilon_0 \frac{d}{dt}\iint_S \mathbf{E}\cdot d\mathbf{A}`],
    [['oiint', 'aligned', 'integral-form'], t`\begin{aligned}
\oiint_{S} \mathbf{E}\cdot d\mathbf{A} &= \frac{1}{\varepsilon_0}\iiint_V \rho\, dV \\
\oiint_{S} \mathbf{B}\cdot d\mathbf{A} &= 0 \\
\oint_{C} \mathbf{E}\cdot d\boldsymbol{\ell} &= -\frac{d}{dt}\iint_{S} \mathbf{B}\cdot d\mathbf{A} \\
\oint_{C} \mathbf{B}\cdot d\boldsymbol{\ell} &= \mu_0 \iint_S \mathbf{J}\cdot d\mathbf{A} + \mu_0\varepsilon_0\frac{d}{dt}\iint_S \mathbf{E}\cdot d\mathbf{A}
\end{aligned}`],
    [['tensor-form'], t`\partial_\mu F^{\mu\nu} = \mu_0 J^\nu, \qquad \partial_{[\alpha} F_{\beta\gamma]} = 0`],
    [['tensor-form', 'levi-civita'], t`\epsilon^{\mu\nu\rho\sigma}\partial_\nu F_{\rho\sigma} = 0`],
    [['matrix', 'field-tensor', 'frac'], t`F^{\mu\nu} = \begin{pmatrix} 0 & -E_x/c & -E_y/c & -E_z/c \\ E_x/c & 0 & -B_z & B_y \\ E_y/c & B_z & 0 & -B_x \\ E_z/c & -B_y & B_x & 0 \end{pmatrix}`],
    [['wave-equation', 'laplacian'], t`\nabla^2 \mathbf{E} - \frac{1}{c^2}\frac{\partial^2 \mathbf{E}}{\partial t^2} = 0`],
    [['lorentz-force'], t`\mathbf{F} = q\left(\mathbf{E} + \mathbf{v} \times \mathbf{B}\right)`],
    [['poynting', 'hat'], t`\mathbf{S} = \frac{1}{\mu_0}\mathbf{E}\times\mathbf{B}, \qquad \langle S \rangle = \frac{1}{2}c\,\varepsilon_0 E_0^2`],
    [['vector-calculus', 'bm'], t`\bm{\nabla} \times (\bm{\nabla} \times \bm{A}) = \bm{\nabla}(\bm{\nabla}\cdot\bm{A}) - \nabla^2\bm{A}`],
    [['boldsymbol-nabla'], t`\boldsymbol{\nabla}\cdot\boldsymbol{E} = \rho/\varepsilon_0`],
    [['biot-savart', 'frac'], t`\mathbf{B}(\mathbf{r}) = \frac{\mu_0}{4\pi}\int \frac{I\, d\boldsymbol{\ell}' \times (\mathbf{r} - \mathbf{r}')}{|\mathbf{r} - \mathbf{r}'|^3}`],
  ]),

  ...group('fluid dynamics', [
    [['wide', 'bold'], t`\rho\left(\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u}\cdot\nabla)\mathbf{u}\right) = -\nabla p + \mu\nabla^2\mathbf{u} + \left(\mu_B + \frac{1}{3}\mu\right)\nabla(\nabla\cdot\mathbf{u}) + \rho\mathbf{g}`],
    [['very-wide', 'expanded'], t`\rho\left(\frac{\partial u}{\partial t} + u\frac{\partial u}{\partial x} + v\frac{\partial u}{\partial y} + w\frac{\partial u}{\partial z}\right) = -\frac{\partial p}{\partial x} + \mu\left(\frac{\partial^2 u}{\partial x^2} + \frac{\partial^2 u}{\partial y^2} + \frac{\partial^2 u}{\partial z^2}\right) + \rho g_x`],
    [['continuity'], t`\frac{\partial \rho}{\partial t} + \nabla\cdot(\rho\mathbf{u}) = 0`],
    [['bernoulli'], t`p + \frac{1}{2}\rho v^2 + \rho g h = \text{const.}`],
    [['reynolds', 'frac'], t`\mathrm{Re} = \frac{\rho u L}{\mu} = \frac{uL}{\nu}`],
    [['vorticity'], t`\frac{D\boldsymbol{\omega}}{Dt} = (\boldsymbol{\omega}\cdot\nabla)\mathbf{u} + \nu\nabla^2\boldsymbol{\omega}`],
    [['very-wide', 'cases'], t`\tau_{ij} = \mu\left(\frac{\partial u_i}{\partial x_j} + \frac{\partial u_j}{\partial x_i}\right) - \frac{2}{3}\mu\,\delta_{ij}\frac{\partial u_k}{\partial x_k}, \qquad \sigma_{ij} = -p\,\delta_{ij} + \tau_{ij}`],
    [['aligned', 'rans', 'overline'], t`\begin{aligned}
\frac{\partial \overline{u}_i}{\partial t} + \overline{u}_j\frac{\partial \overline{u}_i}{\partial x_j} &= -\frac{1}{\rho}\frac{\partial \overline{p}}{\partial x_i} + \nu\frac{\partial^2 \overline{u}_i}{\partial x_j\partial x_j} - \frac{\partial \overline{u_i' u_j'}}{\partial x_j} \\
\frac{\partial \overline{u}_i}{\partial x_i} &= 0
\end{aligned}`],
    [['euler', 'conservation-form', 'pmatrix'], t`\frac{\partial}{\partial t}\begin{pmatrix} \rho \\ \rho u \\ E \end{pmatrix} + \frac{\partial}{\partial x}\begin{pmatrix} \rho u \\ \rho u^2 + p \\ u(E + p) \end{pmatrix} = 0`],
  ]),

  ...group('robotics', [
    [['matrix-4x4', 'homogeneous'], t`T = \begin{bmatrix} R & \mathbf{p} \\ \mathbf{0}^\top & 1 \end{bmatrix} = \begin{bmatrix} r_{11} & r_{12} & r_{13} & p_x \\ r_{21} & r_{22} & r_{23} & p_y \\ r_{31} & r_{32} & r_{33} & p_z \\ 0 & 0 & 0 & 1 \end{bmatrix}`],
    [['matrix-4x4', 'dh', 'trig', 'wide'], t`{}^{i-1}T_i = \begin{bmatrix} \cos\theta_i & -\sin\theta_i\cos\alpha_i & \sin\theta_i\sin\alpha_i & a_i\cos\theta_i \\ \sin\theta_i & \cos\theta_i\cos\alpha_i & -\cos\theta_i\sin\alpha_i & a_i\sin\theta_i \\ 0 & \sin\alpha_i & \cos\alpha_i & d_i \\ 0 & 0 & 0 & 1 \end{bmatrix}`],
    [['dh-table', 'array', 'hline'], t`\begin{array}{c|cccc} i & \theta_i & d_i & a_i & \alpha_i \\ \hline 1 & \theta_1 & d_1 & 0 & \pi/2 \\ 2 & \theta_2 & 0 & a_2 & 0 \\ 3 & \theta_3 & 0 & a_3 & 0 \\ 4 & \theta_4 & d_4 & 0 & -\pi/2 \end{array}`],
    [['block-matrix', 'array-rules'], t`\left[\begin{array}{c|c} R & \mathbf{p} \\ \hline \mathbf{0}^\top & 1 \end{array}\right]`],
    [['se3', 'hat', 'wedge'], t`\hat{\boldsymbol{\xi}} = \boldsymbol{\xi}^\wedge = \begin{bmatrix} [\boldsymbol{\omega}]_\times & \mathbf{v} \\ \mathbf{0}^\top & 0 \end{bmatrix} \in \mathfrak{se}(3)`],
    [['skew', 'matrix'], t`[\boldsymbol{\omega}]_\times = \begin{bmatrix} 0 & -\omega_3 & \omega_2 \\ \omega_3 & 0 & -\omega_1 \\ -\omega_2 & \omega_1 & 0 \end{bmatrix}`],
    [['exp', 'rodrigues'], t`\exp([\hat{\omega}]\theta) = I + \sin\theta\,[\hat{\omega}] + (1 - \cos\theta)[\hat{\omega}]^2`],
    [['vee', 'log'], t`\boldsymbol{\xi} = \left(\log T\right)^\vee \in \mathbb{R}^6, \qquad T = \exp\left(\boldsymbol{\xi}^\wedge\right) \in SE(3)`],
    [['jacobian', 'matrix', 'partial'], t`J(\mathbf{q}) = \begin{bmatrix} \frac{\partial x}{\partial q_1} & \cdots & \frac{\partial x}{\partial q_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial \psi}{\partial q_1} & \cdots & \frac{\partial \psi}{\partial q_n} \end{bmatrix}`],
    [['dynamics', 'bold'], t`M(\mathbf{q})\ddot{\mathbf{q}} + C(\mathbf{q}, \dot{\mathbf{q}})\dot{\mathbf{q}} + \mathbf{g}(\mathbf{q}) = \boldsymbol{\tau}`],
    [['pseudo-inverse'], t`\dot{\mathbf{q}} = J^\dagger \dot{\mathbf{x}} + \left(I - J^\dagger J\right)\dot{\mathbf{q}}_0, \qquad J^\dagger = J^\top\left(JJ^\top + \lambda^2 I\right)^{-1}`],
    [['adjoint', 'block-matrix'], t`\mathrm{Ad}_T = \begin{bmatrix} R & 0 \\ [\mathbf{p}]_\times R & R \end{bmatrix}`],
    [['quaternion'], t`\mathbf{q} = \cos\frac{\theta}{2} + \sin\frac{\theta}{2}(u_x\mathbf{i} + u_y\mathbf{j} + u_z\mathbf{k})`],
    [['numeric-4x4', 'decimals'], t`T = \begin{bmatrix} 0.866 & -0.500 & 0.000 & 1.250 \\ 0.500 & 0.866 & 0.000 & 0.433 \\ 0.000 & 0.000 & 1.000 & 0.300 \\ 0 & 0 & 0 & 1 \end{bmatrix}`],
    [['prescripts', 'chain'], t`{}^{0}T_{4} = {}^{0}T_{1}\,{}^{1}T_{2}\,{}^{2}T_{3}\,{}^{3}T_{4}`],
  ]),

  ...group('control', [
    [['state-space', 'aligned'], t`\begin{aligned} \dot{\mathbf{x}} &= A\mathbf{x} + B\mathbf{u} \\ \mathbf{y} &= C\mathbf{x} + D\mathbf{u} \end{aligned}`],
    [['state-space', 'block-matrix'], t`\begin{bmatrix} \dot{\mathbf{x}} \\ \mathbf{y} \end{bmatrix} = \begin{bmatrix} A & B \\ C & D \end{bmatrix}\begin{bmatrix} \mathbf{x} \\ \mathbf{u} \end{bmatrix}`],
    [['riccati'], t`A^\top P + PA - PBR^{-1}B^\top P + Q = 0`],
    [['transfer-function', 'frac'], t`G(s) = \frac{Y(s)}{U(s)} = \frac{\omega_n^2}{s^2 + 2\zeta\omega_n s + \omega_n^2}`],
    [['bode', 'log', 'abs'], t`20\log_{10}|H(j\omega)| = 20\log_{10}K - 10\log_{10}\left(1 + \left(\frac{\omega}{\omega_c}\right)^2\right)\ \text{dB}`],
    [['controllability', 'matrix'], t`\mathcal{C} = \begin{bmatrix} B & AB & A^2B & \cdots & A^{n-1}B \end{bmatrix}, \qquad \operatorname{rank}\mathcal{C} = n`],
    [['lqr', 'integral'], t`J = \int_0^\infty \left(\mathbf{x}^\top Q\mathbf{x} + \mathbf{u}^\top R\mathbf{u}\right)dt, \qquad K = R^{-1}B^\top P`],
    [['pid', 'integral'], t`u(t) = K_p e(t) + K_i\int_0^t e(\tau)\,d\tau + K_d\frac{de(t)}{dt}`],
    [['lyapunov'], t`V(\mathbf{x}) = \mathbf{x}^\top P\mathbf{x} > 0, \quad \dot{V}(\mathbf{x}) = \mathbf{x}^\top\left(A^\top P + PA\right)\mathbf{x} < 0`],
    [['companion', 'matrix', 'dots'], t`A = \begin{bmatrix} 0 & 1 & 0 & \cdots & 0 \\ 0 & 0 & 1 & \cdots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ -a_0 & -a_1 & -a_2 & \cdots & -a_{n-1} \end{bmatrix}`],
    [['closed-loop', 'frac'], t`T(s) = \frac{C(s)G(s)}{1 + C(s)G(s)H(s)}`],
    [['discrete', 'z'], t`\mathbf{x}_{k+1} = e^{AT}\mathbf{x}_k + \left(\int_0^T e^{A\tau}\,d\tau\right) B\mathbf{u}_k`],
    [['mpc', 'argmin', 'substack'], t`\min_{\mathbf{u}_{0:N-1}} \sum_{k=0}^{N-1}\left(\|\mathbf{x}_k\|_Q^2 + \|\mathbf{u}_k\|_R^2\right) + \|\mathbf{x}_N\|_P^2 \quad \text{s.t. } \mathbf{x}_{k+1} = A\mathbf{x}_k + B\mathbf{u}_k`],
  ]),

  ...group('estimation', [
    [['kalman', 'k-given'], t`\hat{\mathbf{x}}_{k|k-1} = F_k\hat{\mathbf{x}}_{k-1|k-1} + B_k\mathbf{u}_k`],
    [['kalman', 'k-given', 'aligned'], t`\begin{aligned}
\hat{x}_{k|k-1} &= F_k \hat{x}_{k-1|k-1} + B_k u_k \\
P_{k|k-1} &= F_k P_{k-1|k-1} F_k^\top + Q_k \\
\tilde{y}_k &= z_k - H_k \hat{x}_{k|k-1} \\
S_k &= H_k P_{k|k-1} H_k^\top + R_k \\
K_k &= P_{k|k-1} H_k^\top S_k^{-1} \\
\hat{x}_{k|k} &= \hat{x}_{k|k-1} + K_k \tilde{y}_k \\
P_{k|k} &= (I - K_k H_k) P_{k|k-1}
\end{aligned}`],
    [['ekf', 'jacobian', 'evaluated-at'], t`F_k = \left.\frac{\partial f}{\partial \mathbf{x}}\right|_{\hat{\mathbf{x}}_{k-1|k-1},\,\mathbf{u}_k}, \qquad H_k = \left.\frac{\partial h}{\partial \mathbf{x}}\right|_{\hat{\mathbf{x}}_{k|k-1}}`],
    [['joseph-form'], t`P_{k|k} = (I - K_kH_k)P_{k|k-1}(I - K_kH_k)^\top + K_kR_kK_k^\top`],
    [['gaussian', 'exp', 'frac'], t`p(\mathbf{x}) = \frac{1}{\sqrt{(2\pi)^n|\Sigma|}}\exp\left(-\frac{1}{2}(\mathbf{x}-\boldsymbol{\mu})^\top\Sigma^{-1}(\mathbf{x}-\boldsymbol{\mu})\right)`],
    [['bayes-filter', 'integral'], t`\mathrm{bel}(x_t) = \eta\, p(z_t \mid x_t)\int p(x_t \mid u_t, x_{t-1})\,\mathrm{bel}(x_{t-1})\,dx_{t-1}`],
    [['mle', 'argmax'], t`\hat{\theta}_{\text{MLE}} = \operatorname*{arg\,max}_{\theta}\ \sum_{i=1}^{N}\log p(x_i \mid \theta)`],
    [['ukf', 'sigma-points', 'cases'], t`\mathcal{X}^{(i)} = \begin{cases} \hat{\mathbf{x}}, & i = 0 \\ \hat{\mathbf{x}} + \left(\sqrt{(n+\lambda)P}\right)_i, & i = 1,\dots,n \\ \hat{\mathbf{x}} - \left(\sqrt{(n+\lambda)P}\right)_{i-n}, & i = n+1,\dots,2n \end{cases}`],
    [['least-squares', 'hat'], t`\hat{\boldsymbol{\beta}} = (X^\top X)^{-1}X^\top\mathbf{y}`],
    [['cramer-rao'], t`\operatorname{Var}(\hat\theta) \geq \frac{1}{I(\theta)}, \qquad I(\theta) = -\mathbb{E}\left[\frac{\partial^2}{\partial\theta^2}\log p(X;\theta)\right]`],
  ]),

  ...group('optimization', [
    [['argmin', 'operatorname-star'], t`\mathbf{x}^\star = \operatorname*{arg\,min}_{\mathbf{x} \in \mathbb{R}^n} f(\mathbf{x}) \quad \text{subject to} \quad g_i(\mathbf{x}) \le 0`],
    [['kkt', 'cases'], t`\begin{cases} \nabla f(x^*) + \sum_i \lambda_i \nabla g_i(x^*) + \sum_j \nu_j \nabla h_j(x^*) = 0 \\ g_i(x^*) \le 0, \quad h_j(x^*) = 0 \\ \lambda_i \ge 0 \\ \lambda_i g_i(x^*) = 0 \end{cases}`],
    [['lagrangian', 'mathcal'], t`\mathcal{L}(x, \lambda, \nu) = f_0(x) + \sum_{i=1}^m \lambda_i f_i(x) + \sum_{i=1}^p \nu_i h_i(x)`],
    [['dual', 'inf'], t`g(\lambda, \nu) = \inf_{x \in \mathcal{D}} \mathcal{L}(x, \lambda, \nu), \qquad d^\star = \max_{\lambda \succeq 0,\, \nu} g(\lambda, \nu) \le p^\star`],
    [['gradient-descent'], t`\mathbf{x}_{k+1} = \mathbf{x}_k - \alpha_k \nabla f(\mathbf{x}_k)`],
    [['newton', 'hessian'], t`\mathbf{x}_{k+1} = \mathbf{x}_k - \left[\nabla^2 f(\mathbf{x}_k)\right]^{-1}\nabla f(\mathbf{x}_k)`],
    [['lp', 'array'], t`\begin{array}{ll} \text{minimize} & \mathbf{c}^\top\mathbf{x} \\ \text{subject to} & A\mathbf{x} = \mathbf{b} \\ & \mathbf{x} \succeq 0 \end{array}`],
    [['admm', 'aligned', 'argmin'], t`\begin{aligned}
x^{k+1} &= \operatorname*{argmin}_x \left( f(x) + \tfrac{\rho}{2}\|Ax + Bz^k - c + u^k\|_2^2 \right) \\
z^{k+1} &= \operatorname*{argmin}_z \left( g(z) + \tfrac{\rho}{2}\|Ax^{k+1} + Bz - c + u^k\|_2^2 \right) \\
u^{k+1} &= u^k + Ax^{k+1} + Bz^{k+1} - c
\end{aligned}`],
    [['proximal', 'DeclareMathOperator'], t`\DeclareMathOperator{\prox}{prox} \prox_{\lambda f}(v) = \arg\min_x \left(f(x) + \frac{1}{2\lambda}\|x - v\|_2^2\right)`],
    [['convexity'], t`f(\theta x + (1-\theta)y) \le \theta f(x) + (1-\theta)f(y), \quad \forall\, x, y \in \operatorname{dom} f,\ \theta \in [0, 1]`],
    [['qp', 'underset'], t`\underset{x}{\text{minimize}}\quad \frac{1}{2}x^\top P x + q^\top x`],
  ]),

  ...group('machine learning', [
    [['elbo', 'mathbb-E'], t`\log p_\theta(\mathbf{x}) \ge \mathbb{E}_{q_\phi(\mathbf{z}|\mathbf{x})}\left[\log p_\theta(\mathbf{x}|\mathbf{z})\right] - D_{\mathrm{KL}}\left(q_\phi(\mathbf{z}|\mathbf{x})\,\|\,p(\mathbf{z})\right)`],
    [['kl', 'integral'], t`D_{\mathrm{KL}}(P \parallel Q) = \int p(x)\log\frac{p(x)}{q(x)}\,dx`],
    [['softmax', 'frac'], t`\operatorname{softmax}(\mathbf{z})_i = \frac{e^{z_i}}{\sum_{j=1}^K e^{z_j}}`],
    [['attention', 'matrix-form'], t`\operatorname{Attention}(Q, K, V) = \operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V`],
    [['multihead', 'wide'], t`\operatorname{MultiHead}(Q,K,V) = \operatorname{Concat}(\mathrm{head}_1,\dots,\mathrm{head}_h)W^O, \quad \mathrm{head}_i = \operatorname{Attention}(QW_i^Q, KW_i^K, VW_i^V)`],
    [['backprop', 'aligned'], t`\begin{aligned}
\boldsymbol{\delta}^{(L)} &= \nabla_{\mathbf{a}} \mathcal{L} \odot \sigma'(\mathbf{z}^{(L)}) \\
\boldsymbol{\delta}^{(l)} &= \left((W^{(l+1)})^\top \boldsymbol{\delta}^{(l+1)}\right) \odot \sigma'(\mathbf{z}^{(l)}) \\
\frac{\partial \mathcal{L}}{\partial W^{(l)}} &= \boldsymbol{\delta}^{(l)} (\mathbf{a}^{(l-1)})^\top \\
\frac{\partial \mathcal{L}}{\partial \mathbf{b}^{(l)}} &= \boldsymbol{\delta}^{(l)}
\end{aligned}`],
    [['cross-entropy'], t`\mathcal{L}_{\text{CE}} = -\frac{1}{N}\sum_{i=1}^N\sum_{c=1}^C y_{i,c}\log\hat{y}_{i,c}`],
    [['adam', 'aligned', 'hat'], t`\begin{aligned} m_t &= \beta_1 m_{t-1} + (1-\beta_1) g_t \\ v_t &= \beta_2 v_{t-1} + (1-\beta_2) g_t^2 \\ \hat{m}_t &= \frac{m_t}{1-\beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1-\beta_2^t} \\ \theta_t &= \theta_{t-1} - \alpha\frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} \end{aligned}`],
    [['matrix-attention', 'numeric'], t`A = \operatorname{softmax}\begin{pmatrix} 2.1 & 0.3 & -1.2 \\ 0.4 & 1.8 & 0.1 \\ -0.5 & 0.2 & 2.4 \end{pmatrix} = \begin{pmatrix} 0.83 & 0.14 & 0.03 \\ 0.19 & 0.71 & 0.10 \\ 0.05 & 0.10 & 0.85 \end{pmatrix}`],
    [['diffusion', 'sqrt'], t`q(\mathbf{x}_t \mid \mathbf{x}_0) = \mathcal{N}\left(\mathbf{x}_t;\ \sqrt{\bar{\alpha}_t}\,\mathbf{x}_0,\ (1 - \bar{\alpha}_t)\mathbf{I}\right)`],
    [['svm', 'subject-to'], t`\min_{\mathbf{w}, b, \boldsymbol{\xi}} \frac{1}{2}\|\mathbf{w}\|^2 + C\sum_{i=1}^n \xi_i \quad \text{s.t.} \quad y_i(\mathbf{w}^\top\mathbf{x}_i + b) \ge 1 - \xi_i,\ \xi_i \ge 0`],
    [['policy-gradient', 'nabla-sub'], t`\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta}\left[\sum_{t=0}^{T}\nabla_\theta \log\pi_\theta(a_t \mid s_t)\, \hat{A}_t\right]`],
    [['bellman', 'max'], t`Q^*(s, a) = \mathbb{E}\left[r + \gamma \max_{a'} Q^*(s', a') \,\middle|\, s, a\right]`],
    [['layernorm', 'frac'], t`\operatorname{LN}(\mathbf{x}) = \boldsymbol{\gamma} \odot \frac{\mathbf{x} - \mu}{\sqrt{\sigma^2 + \epsilon}} + \boldsymbol{\beta}`],
  ]),

  ...group('numerical methods', [
    [['butcher', 'array-rules'], t`\begin{array}{c|cccc} 0 \\ \tfrac{1}{2} & \tfrac{1}{2} \\ \tfrac{1}{2} & 0 & \tfrac{1}{2} \\ 1 & 0 & 0 & 1 \\ \hline & \tfrac{1}{6} & \tfrac{1}{3} & \tfrac{1}{3} & \tfrac{1}{6} \end{array}`],
    [['rk4', 'aligned'], t`\begin{aligned}
k_1 &= f(t_n, y_n) \\
k_2 &= f\left(t_n + \tfrac{h}{2}, y_n + \tfrac{h}{2}k_1\right) \\
k_3 &= f\left(t_n + \tfrac{h}{2}, y_n + \tfrac{h}{2}k_2\right) \\
k_4 &= f(t_n + h, y_n + hk_3) \\
y_{n+1} &= y_n + \tfrac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)
\end{aligned}`],
    [['weak-form', 'integral'], t`\int_\Omega \nabla u \cdot \nabla v\,d\Omega = \int_\Omega f v\,d\Omega + \int_{\Gamma_N} g v\,d\Gamma \quad \forall v \in H_0^1(\Omega)`],
    [['galerkin', 'matrix', 'tridiagonal'], t`K = \frac{1}{h}\begin{bmatrix} 2 & -1 & & & \\ -1 & 2 & -1 & & \\ & \ddots & \ddots & \ddots & \\ & & -1 & 2 & -1 \\ & & & -1 & 2 \end{bmatrix}`],
    [['finite-difference', 'frac'], t`\frac{u_{i+1}^n - 2u_i^n + u_{i-1}^n}{\Delta x^2} \approx \frac{\partial^2 u}{\partial x^2}\bigg|_{x_i, t_n} + \mathcal{O}(\Delta x^2)`],
    [['newton-raphson'], t`x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}`],
    [['simpson', 'frac'], t`\int_a^b f(x)\,dx \approx \frac{h}{3}\left[f(x_0) + 4\sum_{i\,\text{odd}} f(x_i) + 2\sum_{i\,\text{even}} f(x_i) + f(x_n)\right]`],
    [['cfl'], t`C = \frac{u\,\Delta t}{\Delta x} \le C_{\max}`],
    [['stiffness', 'element', 'integral'], t`K_{ij}^{(e)} = \int_{\Omega_e} \frac{d\phi_i}{dx}\frac{d\phi_j}{dx}\,dx, \qquad F_i^{(e)} = \int_{\Omega_e} f\,\phi_i\,dx`],
    [['crank-nicolson'], t`\frac{u_i^{n+1} - u_i^n}{\Delta t} = \frac{\alpha}{2}\left(\frac{u_{i+1}^{n+1} - 2u_i^{n+1} + u_{i-1}^{n+1}}{\Delta x^2} + \frac{u_{i+1}^{n} - 2u_i^{n} + u_{i-1}^{n}}{\Delta x^2}\right)`],
    [['condition-number'], t`\kappa(A) = \|A\|\,\|A^{-1}\| = \frac{\sigma_{\max}(A)}{\sigma_{\min}(A)}`],
    [['error-bound', 'O'], t`|E| \le \frac{(b-a)h^4}{180}\max_{\xi\in[a,b]}\left|f^{(4)}(\xi)\right|`],
  ]),

  ...group('number theory', [
    [['pmod'], t`a^{p-1} \equiv 1 \pmod{p}`],
    [['legendre', 'left-right'], t`\left(\frac{a}{p}\right) \equiv a^{\frac{p-1}{2}} \pmod{p}`],
    [['legendre', 'quadratic-reciprocity'], t`\left(\frac{p}{q}\right)\left(\frac{q}{p}\right) = (-1)^{\frac{p-1}{2}\cdot\frac{q-1}{2}}`],
    [['cfrac'], t`\sqrt{2} = 1 + \cfrac{1}{2 + \cfrac{1}{2 + \cfrac{1}{2 + \cdots}}}`],
    [['cfrac', 'golden'], t`\varphi = 1 + \cfrac{1}{1 + \cfrac{1}{1 + \cfrac{1}{1 + \ddots}}}`],
    [['euler-product', 'prod'], t`\zeta(s) = \sum_{n=1}^\infty \frac{1}{n^s} = \prod_{p\ \text{prime}} \frac{1}{1 - p^{-s}}`],
    [['totient', 'prod'], t`\varphi(n) = n\prod_{p \mid n}\left(1 - \frac{1}{p}\right)`],
    [['bmod', 'mod'], t`\gcd(a, b) = \gcd(b, a \bmod b), \qquad x \equiv 3 \mod 7`],
    [['crt', 'cases'], t`\begin{cases} x \equiv 2 \pmod{3} \\ x \equiv 3 \pmod{5} \\ x \equiv 2 \pmod{7} \end{cases} \implies x \equiv 23 \pmod{105}`],
    [['divides', 'nmid'], t`p \mid ab \implies p \mid a \lor p \mid b, \qquad 3 \nmid 10`],
    [['floor', 'sum'], t`\nu_p(n!) = \sum_{k=1}^{\infty} \left\lfloor \frac{n}{p^k} \right\rfloor`],
    [['mobius', 'sum-divisors'], t`\sum_{d \mid n} \mu(d) = \begin{cases} 1 & n = 1 \\ 0 & n > 1 \end{cases}`],
  ]),

  ...group('combinatorics', [
    [['binom'], t`\binom{n}{k} = \frac{n!}{k!(n-k)!}`],
    [['binom', 'sum'], t`(x + y)^n = \sum_{k=0}^n \binom{n}{k} x^{n-k} y^k`],
    [['genfrac', 'stirling'], t`\genfrac{\{}{\}}{0pt}{}{n}{k} = \frac{1}{k!}\sum_{j=0}^k (-1)^{k-j}\binom{k}{j} j^n`],
    [['genfrac', 'stirling-first'], t`\genfrac{[}{]}{0pt}{}{n+1}{k} = n\genfrac{[}{]}{0pt}{}{n}{k} + \genfrac{[}{]}{0pt}{}{n}{k-1}`],
    [['stirling-approx', 'sim'], t`n! \sim \sqrt{2\pi n}\left(\frac{n}{e}\right)^n`],
    [['generating-function'], t`\sum_{n=0}^\infty F_n x^n = \frac{x}{1 - x - x^2}`],
    [['catalan', 'frac', 'binom'], t`C_n = \frac{1}{n+1}\binom{2n}{n} = \prod_{k=2}^{n}\frac{n+k}{k}`],
    [['inclusion-exclusion', 'bigcup'], t`\left|\bigcup_{i=1}^n A_i\right| = \sum_{k=1}^n (-1)^{k+1}\sum_{1 \le i_1 < \cdots < i_k \le n}\left|A_{i_1}\cap\cdots\cap A_{i_k}\right|`],
    [['substack', 'sum'], t`\sum_{\substack{0 \le i \le m \\ 0 < j < n}} P(i, j)`],
    [['multinomial', 'binom'], t`\binom{n}{k_1, k_2, \ldots, k_m} = \frac{n!}{k_1!\,k_2!\cdots k_m!}`],
    [['tbinom', 'dbinom'], t`\tbinom{n}{2} + \dbinom{n}{3}`],
    [['partition', 'prod'], t`\sum_{n=0}^\infty p(n)x^n = \prod_{k=1}^\infty \frac{1}{1 - x^k}`],
    [['brace-binom', 'brack'], t`{n \brace k} = k{n-1 \brace k} + {n-1 \brace k-1}, \qquad {n \brack k}`],
  ]),

  ...group('thermodynamics', [
    [['partial-held', 'left-right'], t`\left(\frac{\partial U}{\partial S}\right)_V = T, \qquad \left(\frac{\partial U}{\partial V}\right)_S = -p`],
    [['maxwell-relation', 'partial-held'], t`\left(\frac{\partial T}{\partial V}\right)_S = -\left(\frac{\partial p}{\partial S}\right)_V`],
    [['triple-product', 'partial-held'], t`\left(\frac{\partial x}{\partial y}\right)_z\left(\frac{\partial y}{\partial z}\right)_x\left(\frac{\partial z}{\partial x}\right)_y = -1`],
    [['physics-pdv'], t`C_p - C_V = T\left(\pdv{p}{T}\right)_V\left(\pdv{V}{T}\right)_p`],
    [['gibbs'], t`dG = -S\,dT + V\,dp + \sum_i \mu_i\,dN_i`],
    [['partition-function', 'exp'], t`Z = \sum_i g_i e^{-\beta E_i}, \qquad F = -k_B T\ln Z, \qquad \langle E \rangle = -\frac{\partial \ln Z}{\partial \beta}`],
    [['boltzmann', 'entropy'], t`S = k_B \ln \Omega`],
    [['clausius-clapeyron'], t`\frac{dP}{dT} = \frac{L}{T\,\Delta v}`],
    [['carnot', 'eta'], t`\eta = 1 - \frac{T_C}{T_H} = \frac{W}{Q_H}`],
    [['ideal-gas', 'units'], t`pV = nRT, \qquad R = 8.314\ \mathrm{J\,mol^{-1}\,K^{-1}}`],
    [['fermi-dirac', 'frac'], t`\langle n_i \rangle = \frac{1}{e^{(\varepsilon_i - \mu)/k_B T} + 1}`],
  ]),

  ...group('chemistry', [
    [['mhchem'], t`\ce{2H2 + O2 -> 2H2O}`],
    [['mhchem', 'equilibrium'], t`\ce{N2 + 3H2 <=> 2NH3}`],
    [['mhchem', 'redox', 'charges'], t`\ce{MnO4^- + 5Fe^2+ + 8H+ -> Mn^2+ + 5Fe^3+ + 4H2O}`],
    [['mhchem', 'states'], t`\ce{CaCO3(s) ->[\Delta] CaO(s) + CO2(g)}`],
    [['manual-chem', 'mathrm'], t`\mathrm{MnO_4^- + 5Fe^{2+} + 8H^+ \longrightarrow Mn^{2+} + 5Fe^{3+} + 4H_2O}`],
    [['manual-chem', 'equilibrium'], t`\mathrm{N_2(g) + 3H_2(g) \rightleftharpoons 2NH_3(g)}, \qquad K_c = \frac{[\mathrm{NH_3}]^2}{[\mathrm{N_2}][\mathrm{H_2}]^3}`],
    [['nernst', 'ln'], t`E = E^\circ - \frac{RT}{nF}\ln Q`],
    [['arrhenius', 'exp'], t`k = A\,e^{-E_a/(RT)}`],
    [['half-reaction', 'xrightarrow'], t`\mathrm{Cu^{2+}(aq) + 2e^-} \xrightarrow{\text{reduction}} \mathrm{Cu(s)}`],
    [['henderson', 'log'], t`\mathrm{pH} = \mathrm{p}K_a + \log_{10}\frac{[\mathrm{A^-}]}{[\mathrm{HA}]}`],
    [['rate-law', 'aligned'], t`\begin{aligned} -\frac{d[\mathrm{A}]}{dt} &= k[\mathrm{A}]^2 \\ \frac{1}{[\mathrm{A}]_t} &= \frac{1}{[\mathrm{A}]_0} + kt \end{aligned}`],
  ]),

  ...group('category theory', [
    [['amscd', 'CD'], t`\begin{CD} A @>f>> B \\ @VgVV @VVhV \\ C @>>k> D \end{CD}`],
    [['amscd', 'CD', 'snake'], t`\begin{CD} 0 @>>> A @>f>> B @>g>> C @>>> 0 \\ @. @VV\alpha V @VV\beta V @VV\gamma V \\ 0 @>>> A' @>f'>> B' @>g'>> C' @>>> 0 \end{CD}`],
    [['tikz-cd'], t`\begin{tikzcd} A \arrow[r, "f"] \arrow[d, "g"'] & B \arrow[d, "h"] \\ C \arrow[r, "k"'] & D \end{tikzcd}`],
    [['array-diagram', 'arrows'], t`\begin{array}{ccc} A & \xrightarrow{f} & B \\ \downarrow{\scriptstyle g} & & \downarrow{\scriptstyle h} \\ C & \xrightarrow{k} & D \end{array}`],
    [['exact-sequence', 'xrightarrow'], t`0 \longrightarrow A \xrightarrow{\ f\ } B \xrightarrow{\ g\ } C \longrightarrow 0`],
    [['long-exact', 'wide', 'xrightarrow'], t`\cdots \to \ker\alpha \to \ker\beta \to \ker\gamma \xrightarrow{\ \partial\ } \operatorname{coker}\alpha \to \operatorname{coker}\beta \to \operatorname{coker}\gamma \to \cdots`],
    [['adjunction', 'hom'], t`\operatorname{Hom}_{\mathcal{D}}(F X, Y) \cong \operatorname{Hom}_{\mathcal{C}}(X, G Y)`],
    [['natural-transformation', 'Rightarrow'], t`\eta\colon F \Rightarrow G, \qquad \eta_Y \circ F(f) = G(f) \circ \eta_X`],
    [['yoneda'], t`\operatorname{Nat}\left(\operatorname{Hom}_{\mathcal{C}}(A, -), F\right) \cong F(A)`],
    [['xleftrightarrow', 'xleftarrow'], t`A \xleftrightarrow{\ \sim\ } B \xleftarrow{\pi} E`],
    [['mathscr', 'mathfrak'], t`\mathscr{F}\colon \mathbf{Top}^{\mathrm{op}} \to \mathbf{Set}, \qquad \mathfrak{g} = \operatorname{Lie}(G)`],
  ]),

  ...group('finance', [
    [['black-scholes', 'pde'], t`\frac{\partial V}{\partial t} + \frac{1}{2}\sigma^2 S^2\frac{\partial^2 V}{\partial S^2} + rS\frac{\partial V}{\partial S} - rV = 0`],
    [['black-scholes', 'closed-form'], t`C(S, t) = S\,N(d_1) - K e^{-r(T-t)} N(d_2)`],
    [['black-scholes', 'aligned', 'sqrt'], t`\begin{aligned} d_1 &= \frac{\ln(S/K) + \left(r + \frac{\sigma^2}{2}\right)(T-t)}{\sigma\sqrt{T-t}} \\ d_2 &= d_1 - \sigma\sqrt{T-t} \end{aligned}`],
    [['gbm', 'sde'], t`dS_t = \mu S_t\,dt + \sigma S_t\,dW_t`],
    [['ito', 'lemma'], t`df(t, X_t) = \left(\frac{\partial f}{\partial t} + \mu\frac{\partial f}{\partial x} + \frac{1}{2}\sigma^2\frac{\partial^2 f}{\partial x^2}\right)dt + \sigma\frac{\partial f}{\partial x}\,dW_t`],
    [['dollar-text', 'text-dollar'], t`\text{Profit} = \$1{,}200 - \$800 = \$400`],
    [['npv', 'sum'], t`\mathrm{NPV} = \sum_{t=0}^{T}\frac{CF_t}{(1 + r)^t}`],
    [['capm'], t`\mathbb{E}[R_i] = R_f + \beta_i\left(\mathbb{E}[R_m] - R_f\right), \qquad \beta_i = \frac{\operatorname{Cov}(R_i, R_m)}{\operatorname{Var}(R_m)}`],
    [['sharpe'], t`S = \frac{\mathbb{E}[R_p - R_f]}{\sigma_p}`],
    [['compound', 'lim'], t`A = P\left(1 + \frac{r}{n}\right)^{nt} \xrightarrow{n\to\infty} Pe^{rt}`],
  ]),

  ...group('signal processing', [
    [['fourier', 'integral'], t`\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\,e^{-2\pi i x \xi}\,dx`],
    [['dft', 'sum'], t`X_k = \sum_{n=0}^{N-1} x_n e^{-\frac{2\pi i}{N}kn}, \qquad k = 0, \dots, N-1`],
    [['z-transform'], t`X(z) = \mathcal{Z}\{x[n]\} = \sum_{n=-\infty}^{\infty} x[n] z^{-n}`],
    [['convolution', 'sum'], t`(x * h)[n] = \sum_{k=-\infty}^{\infty} x[k]\,h[n-k]`],
    [['convolution-theorem'], t`\mathcal{F}\{f * g\} = \mathcal{F}\{f\}\cdot\mathcal{F}\{g\}`],
    [['sampling', 'sum'], t`x_s(t) = x(t)\sum_{n=-\infty}^{\infty}\delta(t - nT_s) \quad\Longleftrightarrow\quad X_s(f) = \frac{1}{T_s}\sum_{k=-\infty}^{\infty} X\!\left(f - \frac{k}{T_s}\right)`],
    [['transfer', 'iir'], t`H(z) = \frac{\sum_{k=0}^{M} b_k z^{-k}}{1 + \sum_{k=1}^{N} a_k z^{-k}}`],
    [['parseval'], t`\sum_{n=0}^{N-1}|x_n|^2 = \frac{1}{N}\sum_{k=0}^{N-1}|X_k|^2`],
    [['laplace', 'cases'], t`u(t) = \begin{cases} 1, & t \ge 0 \\ 0, & t < 0 \end{cases} \quad\xrightarrow{\ \mathcal{L}\ }\quad U(s) = \frac{1}{s}`],
    [['autocorrelation', 'expectation'], t`R_{xx}(\tau) = \mathbb{E}[x(t)x^*(t-\tau)], \qquad S_{xx}(f) = \int_{-\infty}^{\infty} R_{xx}(\tau)e^{-j2\pi f\tau}d\tau`],
    [['sinc', 'operatorname'], t`\operatorname{sinc}(x) = \frac{\sin(\pi x)}{\pi x}`],
  ]),

  ...group('linear algebra', [
    [['svd', 'dims'], t`A = U\Sigma V^\top, \qquad U \in \mathbb{R}^{m\times m},\ \Sigma \in \mathbb{R}^{m\times n},\ V \in \mathbb{R}^{n\times n}`],
    [['jordan', 'ddots', 'block'], t`J = \begin{pmatrix} J_{k_1}(\lambda_1) & & \\ & \ddots & \\ & & J_{k_m}(\lambda_m) \end{pmatrix}, \qquad J_k(\lambda) = \begin{pmatrix} \lambda & 1 & & \\ & \lambda & \ddots & \\ & & \ddots & 1 \\ & & & \lambda \end{pmatrix}`],
    [['augmented', 'array-cc|c'], t`\left[\begin{array}{cc|c} 1 & 2 & 5 \\ 3 & 4 & 6 \end{array}\right]`],
    [['smallmatrix'], t`A = \left(\begin{smallmatrix} a & b \\ c & d \end{smallmatrix}\right), \qquad \det A = ad - bc`],
    [['determinant', 'vmatrix', '3x3'], t`\det A = \begin{vmatrix} a_{11} & a_{12} & a_{13} \\ a_{21} & a_{22} & a_{23} \\ a_{31} & a_{32} & a_{33} \end{vmatrix} = a_{11}\begin{vmatrix} a_{22} & a_{23} \\ a_{32} & a_{33} \end{vmatrix} - a_{12}\begin{vmatrix} a_{21} & a_{23} \\ a_{31} & a_{33} \end{vmatrix} + a_{13}\begin{vmatrix} a_{21} & a_{22} \\ a_{31} & a_{32} \end{vmatrix}`],
    [['eigen'], t`A\mathbf{v} = \lambda\mathbf{v} \iff (A - \lambda I)\mathbf{v} = \mathbf{0}`],
    [['general-matrix', 'dots'], t`A = \begin{pmatrix} a_{11} & a_{12} & \cdots & a_{1n} \\ a_{21} & a_{22} & \cdots & a_{2n} \\ \vdots & \vdots & \ddots & \vdots \\ a_{m1} & a_{m2} & \cdots & a_{mn} \end{pmatrix}`],
    [['qr', 'gram-schmidt'], t`\mathbf{u}_k = \mathbf{a}_k - \sum_{j=1}^{k-1}\frac{\langle \mathbf{a}_k, \mathbf{u}_j\rangle}{\langle\mathbf{u}_j, \mathbf{u}_j\rangle}\mathbf{u}_j, \qquad \mathbf{e}_k = \frac{\mathbf{u}_k}{\|\mathbf{u}_k\|}`],
    [['block-inverse', 'wide'], t`\begin{bmatrix} A & B \\ C & D \end{bmatrix}^{-1} = \begin{bmatrix} A^{-1} + A^{-1}B(D - CA^{-1}B)^{-1}CA^{-1} & -A^{-1}B(D - CA^{-1}B)^{-1} \\ -(D - CA^{-1}B)^{-1}CA^{-1} & (D - CA^{-1}B)^{-1} \end{bmatrix}`],
    [['norms', 'Vert'], t`\|A\|_F = \sqrt{\sum_{i,j}|a_{ij}|^2} = \sqrt{\operatorname{tr}(A^* A)} = \Big(\sum_i \sigma_i^2\Big)^{1/2}`],
    [['cayley-hamilton'], t`p_A(\lambda) = \det(\lambda I - A) = \lambda^n + c_{n-1}\lambda^{n-1} + \cdots + c_0, \qquad p_A(A) = 0`],
    [['vmatrix-cross', 'bold'], t`\mathbf{a}\times\mathbf{b} = \begin{vmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} \\ a_1 & a_2 & a_3 \\ b_1 & b_2 & b_3 \end{vmatrix}`],
    [['Vmatrix', 'Bmatrix'], t`\begin{Vmatrix} 1 & 2 \\ 3 & 4 \end{Vmatrix}, \quad \begin{Bmatrix} x \\ y \end{Bmatrix}`],
    [['matrix-star', 'mathtools'], t`\begin{pmatrix*}[r] -1 & 3 \\ 2 & -4 \end{pmatrix*}`],
    [['kronecker'], t`A \otimes B = \begin{bmatrix} a_{11}B & \cdots & a_{1n}B \\ \vdots & \ddots & \vdots \\ a_{m1}B & \cdots & a_{mn}B \end{bmatrix}`],
  ]),

  ...group('complex analysis', [
    [['residue', 'oint'], t`\oint_\gamma f(z)\,dz = 2\pi i \sum_{k=1}^n \operatorname{Res}(f, a_k)`],
    [['residue-formula', 'lim'], t`\operatorname{Res}(f, a) = \frac{1}{(m-1)!}\lim_{z\to a}\frac{d^{m-1}}{dz^{m-1}}\left[(z-a)^m f(z)\right]`],
    [['cauchy-integral', 'frac'], t`f^{(n)}(a) = \frac{n!}{2\pi i}\oint_\gamma \frac{f(z)}{(z-a)^{n+1}}\,dz`],
    [['laurent', 'sum'], t`f(z) = \sum_{n=-\infty}^{\infty} a_n (z - z_0)^n, \qquad a_n = \frac{1}{2\pi i}\oint_C \frac{f(z)}{(z - z_0)^{n+1}}\,dz`],
    [['cauchy-riemann', 'partial'], t`\frac{\partial u}{\partial x} = \frac{\partial v}{\partial y}, \qquad \frac{\partial u}{\partial y} = -\frac{\partial v}{\partial x}`],
    [['contour', 'semicircle'], t`\int_{-\infty}^\infty \frac{dx}{1 + x^2} = \lim_{R\to\infty}\oint_{C_R}\frac{dz}{1 + z^2} = 2\pi i \cdot \frac{1}{2i} = \pi`],
    [['jordan-lemma', 'bigg'], t`\left|\int_{C_R} f(z)e^{iaz}\,dz\right| \le \frac{\pi}{a}\max_{\theta\in[0,\pi]}\bigg|f\big(Re^{i\theta}\big)\bigg|`],
    [['mobius', 'frac'], t`w = \frac{az + b}{cz + d}, \qquad ad - bc \neq 0`],
    [['argument-principle'], t`\frac{1}{2\pi i}\oint_C\frac{f'(z)}{f(z)}\,dz = Z - P`],
    [['overline', 'conjugate'], t`|z|^2 = z\overline{z}, \qquad \overline{z_1 z_2} = \overline{z_1}\,\overline{z_2}`],
  ]),

  ...group('simulation output', [
    [['gauss-elim', 'xrightarrow', 'augmented'], t`\left[\begin{array}{ccc|c} 1 & 2 & -1 & 3 \\ 3 & 7 & 2 & 1 \\ 4 & -2 & 1 & -2 \end{array}\right] \xrightarrow{R_2 - 3R_1} \left[\begin{array}{ccc|c} 1 & 2 & -1 & 3 \\ 0 & 1 & 5 & -8 \\ 4 & -2 & 1 & -2 \end{array}\right]`],
    [['gauss-elim', 'xrightarrow', 'very-wide', 'chain'], t`\left[\begin{array}{cccc|c} 2 & 1 & -1 & 3 & 5 \\ 4 & 3 & 1 & 2 & 9 \\ -2 & 5 & 4 & 1 & 0 \\ 6 & -1 & 2 & 7 & 4 \end{array}\right] \xrightarrow[R_3 + R_1]{R_2 - 2R_1} \left[\begin{array}{cccc|c} 2 & 1 & -1 & 3 & 5 \\ 0 & 1 & 3 & -4 & -1 \\ 0 & 6 & 3 & 4 & 5 \\ 6 & -1 & 2 & 7 & 4 \end{array}\right] \xrightarrow{R_4 - 3R_1} \left[\begin{array}{cccc|c} 2 & 1 & -1 & 3 & 5 \\ 0 & 1 & 3 & -4 & -1 \\ 0 & 6 & 3 & 4 & 5 \\ 0 & -4 & 5 & -2 & -11 \end{array}\right]`],
    [['gauss-elim', 'sim', 'pmatrix'], t`\begin{pmatrix} 1 & 1 & 1 \\ 0 & 2 & 5 \\ 2 & 5 & -1 \end{pmatrix} \sim \begin{pmatrix} 1 & 1 & 1 \\ 0 & 2 & 5 \\ 0 & 3 & -3 \end{pmatrix} \sim \begin{pmatrix} 1 & 1 & 1 \\ 0 & 1 & 5/2 \\ 0 & 0 & -21/2 \end{pmatrix}`],
    [['row-op', 'xrightarrow-arrows'], t`R_2 \leftarrow R_2 - 3R_1, \qquad R_3 \leftarrow R_3 - 4R_1, \qquad R_2 \leftrightarrow R_3`],
    [['numeric-4x4', 'negative'], t`A = \begin{bmatrix} 4 & -2 & 1 & 3 \\ -2 & 4 & -2 & 1 \\ 1 & -2 & 4 & -2 \\ 3 & 1 & -2 & 4 \end{bmatrix}, \qquad \mathbf{b} = \begin{bmatrix} 11 \\ -16 \\ 17 \\ 2 \end{bmatrix}`],
    [['numeric-4x4', 'decimals', 'lu'], t`L = \begin{bmatrix} 1 & 0 & 0 & 0 \\ -0.5 & 1 & 0 & 0 \\ 0.25 & -0.5 & 1 & 0 \\ 0.75 & 0.8333 & -0.1429 & 1 \end{bmatrix}, \quad U = \begin{bmatrix} 4 & -2 & 1 & 3 \\ 0 & 3 & -1.5 & 2.5 \\ 0 & 0 & 3 & -1.5 \\ 0 & 0 & 0 & 0.7619 \end{bmatrix}`],
    [['long-derivation', 'aligned', '16-rows'], t`\begin{aligned}
I &= \int_0^\infty x^2 e^{-ax^2}\,dx \\
&= -\frac{\partial}{\partial a}\int_0^\infty e^{-ax^2}\,dx \\
&= -\frac{\partial}{\partial a}\left(\frac{1}{2}\sqrt{\frac{\pi}{a}}\right) \\
&= -\frac{\sqrt{\pi}}{2}\frac{\partial}{\partial a}a^{-1/2} \\
&= -\frac{\sqrt{\pi}}{2}\left(-\frac{1}{2}\right)a^{-3/2} \\
&= \frac{\sqrt{\pi}}{4}a^{-3/2} \\
&= \frac{1}{4}\sqrt{\frac{\pi}{a^3}} \\
J &= \int_0^\infty x^4 e^{-ax^2}\,dx \\
&= \frac{\partial^2}{\partial a^2}\int_0^\infty e^{-ax^2}\,dx \\
&= \frac{\sqrt{\pi}}{2}\frac{\partial^2}{\partial a^2}a^{-1/2} \\
&= \frac{\sqrt{\pi}}{2}\cdot\frac{3}{4}a^{-5/2} \\
&= \frac{3\sqrt{\pi}}{8}a^{-5/2} \\
\langle x^2 \rangle &= \frac{I}{\int_0^\infty e^{-ax^2}dx} \\
&= \frac{\frac{\sqrt{\pi}}{4}a^{-3/2}}{\frac{1}{2}\sqrt{\pi}a^{-1/2}} \\
&= \frac{1}{2a} \\
\langle x^4 \rangle &= \frac{3}{4a^2}
\end{aligned}`],
    [['long-derivation', 'aligned', 'annotations'], t`\begin{aligned}
L &= T - V = \tfrac{1}{2}(m_1 + m_2)l_1^2\dot\theta_1^2 + \tfrac{1}{2}m_2 l_2^2\dot\theta_2^2 + m_2 l_1 l_2\dot\theta_1\dot\theta_2\cos(\theta_1 - \theta_2) \\
&\quad + (m_1 + m_2)g l_1\cos\theta_1 + m_2 g l_2\cos\theta_2 \\
\frac{\partial L}{\partial \dot\theta_1} &= (m_1 + m_2)l_1^2\dot\theta_1 + m_2 l_1 l_2\dot\theta_2\cos(\theta_1 - \theta_2) && \text{(generalized momentum)} \\
\frac{d}{dt}\frac{\partial L}{\partial \dot\theta_1} &= (m_1 + m_2)l_1^2\ddot\theta_1 + m_2 l_1 l_2\left[\ddot\theta_2\cos(\theta_1 - \theta_2) - \dot\theta_2(\dot\theta_1 - \dot\theta_2)\sin(\theta_1 - \theta_2)\right] \\
\frac{\partial L}{\partial \theta_1} &= -m_2 l_1 l_2\dot\theta_1\dot\theta_2\sin(\theta_1 - \theta_2) - (m_1 + m_2)g l_1\sin\theta_1
\end{aligned}`],
    [['rk4-numeric', 'aligned', 'decimals'], t`\begin{aligned}
k_1 &= f(0, 1) = -2(1) + 0 = -2 \\
k_2 &= f(0.05, 0.9) = -2(0.9) + 0.05 = -1.75 \\
k_3 &= f(0.05, 0.9125) = -1.775 \\
k_4 &= f(0.1, 0.8225) = -1.545 \\
y_1 &= 1 + \tfrac{0.1}{6}(-2 - 3.5 - 3.55 - 1.545) = 0.823417
\end{aligned}`],
    [['iteration-table', 'array', 'numeric'], t`\begin{array}{c|c|c|c} n & x_n & f(x_n) & f'(x_n) \\ \hline 0 & 1.0000 & -1.0000 & 1.0000 \\ 1 & 2.0000 & 2.0000 & 10.0000 \\ 2 & 1.8000 & 0.4320 & 7.7200 \\ 3 & 1.7440 & 0.0294 & 7.1243 \\ 4 & 1.7399 & 0.0002 & 7.0814 \end{array}`],
    [['matrix-product', 'step'], t`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}\begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix} = \begin{bmatrix} 1\cdot 5 + 2\cdot 7 & 1\cdot 6 + 2\cdot 8 \\ 3\cdot 5 + 4\cdot 7 & 3\cdot 6 + 4\cdot 8 \end{bmatrix} = \begin{bmatrix} 19 & 22 \\ 43 & 50 \end{bmatrix}`],
    [['rref', 'xrightarrow', 'text-arrow'], t`\xrightarrow{\text{RREF}} \left[\begin{array}{ccc|c} 1 & 0 & 0 & 2 \\ 0 & 1 & 0 & -1 \\ 0 & 0 & 1 & 3 \end{array}\right] \implies \mathbf{x} = \begin{pmatrix} 2 \\ -1 \\ 3 \end{pmatrix}`],
  ]),

  ...group('labels and tags', [
    [['label'], t`E = mc^2 \label{eq:einstein}`],
    [['tag'], t`a^2 + b^2 = c^2 \tag{1}`],
    [['tag-star'], t`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \tag*{(quadratic)}`],
    [['eqref'], t`\text{From } \eqref{eq:einstein} \text{ we get } m = E/c^2`],
    [['ref'], t`\text{by (\ref{eq:1})}, \quad x = 1`],
    [['equation-env', 'tag'], t`\begin{equation} F = ma \tag{2.1} \end{equation}`],
    [['align-env', 'label'], t`\begin{align} a &= b + c \label{eq:a} \\ d &= e + f \notag \end{align}`],
    [['align-star'], t`\begin{align*} f(x) &= x^2 + 2x + 1 \\ &= (x+1)^2 \end{align*}`],
    [['gather', 'nonumber'], t`\begin{gather} x + y = 1 \nonumber \\ x - y = 3 \end{gather}`],
    [['multline'], t`\begin{multline} a + b + c + d + e + f + g + h + i + j + k + l + m \\ + n + o + p + q + r + s + t + u + v + w + x + y + z \end{multline}`],
    [['split-in-equation'], t`\begin{equation} \begin{split} (a+b)^2 &= a^2 + 2ab + b^2 \\ &\ge 4ab \end{split} \end{equation}`],
    [['alignat'], t`\begin{alignat}{2} x &= 1 &\quad& \text{(given)} \\ y &= 2x &\quad& \text{(doubled)} \end{alignat}`],
    [['tag-in-aligned'], t`\begin{aligned} a &= b \tag{3} \end{aligned}`],
  ]),

  ...group('definitions', [
    [['newcommand'], t`\newcommand{\R}{\mathbb{R}} f\colon \R^n \to \R`],
    [['newcommand-args'], t`\newcommand{\norm}[1]{\left\lVert #1 \right\rVert} \norm{\mathbf{x} - \mathbf{y}}_2 \le \norm{\mathbf{x}}_2 + \norm{\mathbf{y}}_2`],
    [['renewcommand'], t`\renewcommand{\vec}[1]{\mathbf{#1}} \vec{F} = m\vec{a}`],
    [['def'], t`\def\E{\mathbb{E}} \E[X + Y] = \E[X] + \E[Y]`],
    [['DeclareMathOperator'], t`\DeclareMathOperator{\Tr}{Tr} \Tr(AB) = \Tr(BA)`],
    [['DeclareMathOperator-star'], t`\DeclareMathOperator*{\argmax}{arg\,max} \argmax_{x} f(x)`],
    [['DeclarePairedDelimiter', 'mathtools'], t`\DeclarePairedDelimiter\abs{\lvert}{\rvert} \abs*{\frac{a}{b}}`],
    [['let'], t`\let\eps\varepsilon \eps > 0`],
    [['newcommand-recursive-guard'], t`\newcommand{\x}{\x x} \x`],
    [['macro-bomb'], t`\def\a{\b\b}\def\b{\c\c}\def\c{\d\d}\def\d{\e\e}\def\e{\f\f}\def\f{xx} \a\a\a\a`],
  ]),

  ...group('fonts and accents', [
    [['mathscr'], t`\mathscr{L}\{f(t)\} = F(s), \qquad \mathscr{H} = L^2(\mathbb{R})`],
    [['mathbbm'], t`\mathbbm{1}_{A}(x) = \begin{cases} 1 & x \in A \\ 0 & x \notin A \end{cases}`],
    [['mathbb-1'], t`\mathbb{1}_{\{X > 0\}}`],
    [['bm'], t`\bm{x}^\top \bm{A} \bm{x} + \bm{b}^\top\bm{x}`],
    [['pmb'], t`\pmb{\alpha} + \pmb{\beta} = \pmb{\gamma}`],
    [['boldsymbol-greek'], t`\boldsymbol{\mu} = \frac{1}{N}\sum_{i=1}^N \boldsymbol{x}_i, \qquad \boldsymbol{\Sigma} = \frac{1}{N}\sum_{i=1}^N(\boldsymbol{x}_i - \boldsymbol{\mu})(\boldsymbol{x}_i - \boldsymbol{\mu})^\top`],
    [['boxed'], t`\boxed{E = mc^2}`],
    [['boxed', 'frac'], t`\boxed{x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}}`],
    [['underbrace', 'overbrace'], t`\underbrace{a + a + \cdots + a}_{n\text{ times}} = na, \qquad \overbrace{1 + 2 + \cdots + n}^{\frac{n(n+1)}{2}}`],
    [['underbrace-nested'], t`\underbrace{\overbrace{x_1 + x_2}^{\text{pair}} + x_3}_{\text{triple}}`],
    [['accents'], t`\dot{x}, \ddot{x}, \dddot{x}, \hat{x}, \widehat{xyz}, \tilde{x}, \widetilde{xyz}, \bar{x}, \overline{xyz}, \vec{x}, \overrightarrow{AB}, \acute{x}, \breve{x}, \check{x}, \mathring{x}`],
    [['stackrel', 'overset'], t`a \stackrel{\text{def}}{=} b, \qquad c \overset{!}{=} d, \qquad e \underset{n\to\infty}{\longrightarrow} f`],
    [['mathsf-mathtt-mathfrak'], t`\mathsf{SO}(3), \quad \mathtt{x = 1}, \quad \mathfrak{su}(2), \quad \mathcal{O}(n\log n)`],
    [['textbf-textit', 'text-mode'], t`\textbf{Theorem.}\ \textit{For all } n \ge 1:\ \sum_{k=1}^n k = \frac{n(n+1)}{2}`],
    [['cancel'], t`\frac{\cancel{(x-1)}(x+1)}{\cancel{(x-1)}} = x + 1, \qquad \bcancel{a} + \xcancel{b} + \cancelto{0}{c}`],
    [['color'], t`{\color{red} a^2} + {\color{blue} b^2} = \textcolor{green}{c^2}`],
    [['colorbox'], t`\colorbox{yellow}{$x = 1$} + \fcolorbox{red}{white}{$y$}`],
    [['phantom', 'smash'], t`\phantom{-}1 + \vphantom{\frac{a}{b}}2 + \smash{\frac{1}{2}}`],
    [['mathrlap', 'mathtools'], t`\sum_{\mathclap{1 \le i \le j \le n}} a_{ij}`],
    [['operatorname-star-limits'], t`\operatorname*{ess\,sup}_{x\in\Omega} |f(x)|`],
  ]),

  ...group('delimiters and spacing', [
    [['big-sizes'], t`\big( \Big( \bigg( \Bigg( x \Bigg) \bigg) \Big) \big)`],
    [['big-sizes', 'brackets'], t`\Bigg[ \bigg\{ \Big\langle \big| x \big| \Big\rangle \bigg\} \Bigg]`],
    [['left-dot-right-bar', 'evaluated'], t`\left. \frac{d}{dx}\left(x^3 + 2x\right) \right|_{x=1} = 5`],
    [['middle'], t`\left\{ x \in \mathbb{R} \,\middle|\, x^2 < 2 \right\}`],
    [['middle', 'conditional'], t`P\left(A \,\middle|\, \frac{B}{C}\right)`],
    [['left-right-unbalanced'], t`\left( \frac{a}{b} \right.`],
    [['floor-ceil'], t`\left\lfloor \frac{n}{2} \right\rfloor + \left\lceil \frac{n}{2} \right\rceil = n`],
    [['angle-brackets', 'bra-ket-manual'], t`\left\langle \psi \middle| \hat{O} \middle| \phi \right\rangle`],
    [['spacing'], t`a\,b\:c\;d\ e\quad f\qquad g\!h \enspace i \hspace{1cm} j`],
    [['norm-abs', 'lVert'], t`\lVert \mathbf{x} \rVert_2 = \left\lvert x \right\rvert`],
    [['nested-delims', 'deep'], t`\left( \left[ \left\{ \left( \frac{a}{b} \right) \right\} \right] \right)`],
    [['double-bars', 'Vert'], t`\left\Vert \frac{x}{y} \right\Vert \le \|x\| / \|y\|`],
    [['delims-in-subscripts'], t`\sum_{(i,j) \in \{1,\ldots,n\}^2} [a_{ij}]_{+}`],
  ]),

  ...group('arrows and stacking', [
    [['xrightarrow', 'both'], t`A \xrightarrow[\text{below}]{\text{above}} B`],
    [['xleftrightarrow', 'xRightarrow'], t`P \xleftrightarrow{\text{iso}} Q \xRightarrow{\text{implies}} R`],
    [['xmapsto', 'mathtools'], t`x \xmapsto{f} f(x) \xhookrightarrow{\iota} Y`],
    [['long-arrows'], t`\longrightarrow\ \Longrightarrow\ \longleftrightarrow\ \Longleftrightarrow\ \longmapsto\ \hookrightarrow\ \twoheadrightarrow\ \rightharpoonup`],
    [['overset-arrow'], t`\overset{\text{def}}{\iff}\quad \overset{n\to\infty}{\longrightarrow}\quad \underset{\text{a.s.}}{\to}`],
    [['stackrel-variety'], t`X_n \stackrel{d}{\to} X, \qquad X_n \stackrel{p}{\to} X, \qquad X_n \xrightarrow{\text{a.s.}} X`],
    [['limits-nolimits'], t`\sum\nolimits_{i} a_i, \qquad \int\limits_0^1 f, \qquad \lim\limits_{x\to 0}`],
    [['substack-prod'], t`\prod_{\substack{p \le x \\ p\ \text{prime}}} \left(1 - \frac{1}{p}\right)^{-1}`],
    [['underset-overset-stack'], t`\underset{k\to\infty}{\overset{\text{weak}}{\rightharpoonup}}`],
    [['iint-iiint'], t`\iint_D f\,dA, \qquad \iiint_V g\,dV, \qquad \idotsint_{\Omega} h`],
    [['oiiint'], t`\oiiint_{\Omega} \rho\,dV`],
    [['ointclockwise'], t`\varointclockwise_C f\,dz + \ointctrclockwise_C g\,dz`],
  ]),

  ...group('text and unicode', [
    [['text-nested-math'], t`f(x) = \begin{cases} x^2 & \text{if } x \ge 0 \text{ and $x$ is rational} \\ -x & \text{otherwise} \end{cases}`],
    [['text-dollar'], t`\text{costs \$5 per unit}`],
    [['text-dollar', 'textmacros'], t`C = \$5 \times n + \text{\$20 fee}`],
    [['unicode-greek'], t`α + β = γ, \qquad Δx · Δp ≥ ℏ/2`],
    [['unicode-ops'], t`∀ε > 0\ ∃δ > 0: |x − a| < δ ⇒ |f(x) − f(a)| < ε`],
    [['unicode-sets'], t`A ∪ B ⊆ C, \quad x ∈ ℝ, \quad ∅ ≠ S, \quad ∑_{i=1}^n i = n(n+1)/2`],
    [['text-accented'], t`\text{température } T = 300\,\text{K}, \quad \text{Schrödinger}`],
    [['math-accented-italic'], t`é = 1, \qquad ñ + ü`],
    [['textit-accented'], t`\textit{café} + \textbf{naïve}`],
    [['text-cyrillic'], t`\text{Привет}\ x = 1`],
    [['text-cjk'], t`\text{速度}\ v = \frac{d}{t}`],
    [['emoji'], t`\text{🚀} = v_{\text{rocket}}`],
    [['text-quotes', 'text-specials'], '\\text{the ' + '``' + "set'' of all } x \\text{ s.t. } x \\ge 0 \\text{ \\& } x < 1 \\text{ (50\\% of } S\\text{)}"],
    [['degree', 'circ'], t`T = 25^\circ\mathrm{C} = 298.15\ \mathrm{K}, \qquad \theta = 45°`],
    [['unicode-minus', 'superscript-digits'], t`x² + y² = r², \qquad 10⁻³`],
    [['textsc-texttt'], t`\textsc{Map}(x) + \texttt{foo}(y)`],
    [['mbox'], t`\mbox{if } x > 0`],
    [['units-mathrm'], t`g = 9.81\,\mathrm{m/s^2}, \qquad \hbar = 1.054\times 10^{-34}\ \mathrm{J\cdot s}`],
    [['siunitx'], t`\SI{9.81}{\meter\per\second\squared}, \qquad \si{\kilo\gram}`],
  ]),

  ...group('environment variety', [
    [['cases-text'], t`|x| = \begin{cases} x, & \text{if } x \ge 0, \\ -x, & \text{if } x < 0. \end{cases}`],
    [['dcases', 'mathtools'], t`f(x) = \begin{dcases} \frac{1}{x} & x > 0 \\ \int_0^1 t\,dt & x \le 0 \end{dcases}`],
    [['rcases', 'mathtools'], t`\begin{rcases} a &= 1 \\ b &= 2 \end{rcases} \implies a + b = 3`],
    [['gathered'], t`\begin{gathered} x + y = 1 \\ x - y = 3 \end{gathered}`],
    [['alignedat'], t`\begin{alignedat}{3} x &= 1 &\quad y &= 2 &\quad z &= 3 \\ a &= 4 & b &= 5 & c &= 6 \end{alignedat}`],
    [['subarray'], t`\sum_{\begin{subarray}{l} i \in \Lambda \\ 0 < j < n \end{subarray}} P(i, j)`],
    [['aligned-system'], t`\left\{\begin{aligned} 2x + 3y &= 7 \\ x - y &= 1 \end{aligned}\right.`],
    [['array-system', 'rl'], t`\left\{\begin{array}{rl} 2x + 3y &= 7 \\ x - y &= 1 \end{array}\right.`],
    [['matrix-plain'], t`\begin{matrix} a & b \\ c & d \end{matrix}`],
    [['nested-matrices'], t`\begin{pmatrix} \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix} & 0 \\ 0 & \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix} \end{pmatrix}`],
    [['big-matrix-8x8', 'tall'], t`\begin{pmatrix} 1&0&0&0&0&0&0&0 \\ 0&1&0&0&0&0&0&0 \\ 0&0&1&0&0&0&0&0 \\ 0&0&0&1&0&0&0&0 \\ 0&0&0&0&1&0&0&0 \\ 0&0&0&0&0&1&0&0 \\ 0&0&0&0&0&0&1&0 \\ 0&0&0&0&0&0&0&1 \end{pmatrix}`],
    [['array-hline-cline', 'table'], t`\begin{array}{|c|c|c|} \hline x & y & x \land y \\ \hline 0 & 0 & 0 \\ 0 & 1 & 0 \\ 1 & 0 & 0 \\ 1 & 1 & 1 \\ \hline \end{array}`],
    [['array-vline-double'], t`\begin{array}{c||c} a & b \\ \hline\hline c & d \end{array}`],
    [['hdashline', 'array'], t`\left[\begin{array}{cc:c} 1 & 0 & 2 \\ \hdashline 0 & 1 & 3 \end{array}\right]`],
    [['empheq-unsupported'], t`\begin{empheq}[box=\fbox]{align} a &= b \end{empheq}`],
    [['bmatrix-in-frac'], t`\frac{1}{\det A}\begin{bmatrix} d & -b \\ -c & a \end{bmatrix}`],
    [['proof-tree', 'frac-rules'], t`\frac{\Gamma \vdash A \quad \Gamma \vdash B}{\Gamma \vdash A \land B}\ (\land I)`],
  ]),

  ...group('calculus and analysis', [
    [['limit', 'epsilon-delta'], t`\lim_{x \to a} f(x) = L \iff \forall \varepsilon > 0\ \exists \delta > 0 : 0 < |x - a| < \delta \implies |f(x) - L| < \varepsilon`],
    [['taylor', 'sum'], t`f(x) = \sum_{n=0}^{\infty}\frac{f^{(n)}(a)}{n!}(x - a)^n = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \cdots`],
    [['integration-by-parts'], t`\int u\,dv = uv - \int v\,du`],
    [['gaussian-integral', 'squared'], t`\left(\int_{-\infty}^\infty e^{-x^2}dx\right)^2 = \int_0^{2\pi}\int_0^\infty e^{-r^2}r\,dr\,d\theta = \pi`],
    [['divergence-theorem'], t`\iiint_V (\nabla\cdot\mathbf{F})\,dV = \oiint_{\partial V}\mathbf{F}\cdot\hat{\mathbf{n}}\,dS`],
    [['stokes', 'differential-forms'], t`\int_{\partial\Omega}\omega = \int_\Omega d\omega`],
    [['leibniz-rule'], t`\frac{d}{dx}\int_{a(x)}^{b(x)} f(x, t)\,dt = f(x, b(x))\,b'(x) - f(x, a(x))\,a'(x) + \int_{a(x)}^{b(x)}\frac{\partial f}{\partial x}\,dt`],
    [['euler-lagrange'], t`\frac{\partial L}{\partial q_i} - \frac{d}{dt}\frac{\partial L}{\partial \dot{q}_i} = 0`],
    [['hamilton'], t`\dot{q}_i = \frac{\partial H}{\partial p_i}, \qquad \dot{p}_i = -\frac{\partial H}{\partial q_i}`],
    [['fourier-series', 'cases'], t`f(x) = \frac{a_0}{2} + \sum_{n=1}^\infty \left(a_n\cos\frac{n\pi x}{L} + b_n\sin\frac{n\pi x}{L}\right)`],
    [['heat-equation', 'separation'], t`u(x, t) = \sum_{n=1}^\infty B_n \sin\left(\frac{n\pi x}{L}\right)e^{-\alpha\left(\frac{n\pi}{L}\right)^2 t}`],
    [['jacobian-det', 'vmatrix', 'partial'], t`\frac{\partial(x, y)}{\partial(r, \theta)} = \begin{vmatrix} \frac{\partial x}{\partial r} & \frac{\partial x}{\partial \theta} \\ \frac{\partial y}{\partial r} & \frac{\partial y}{\partial \theta} \end{vmatrix} = \begin{vmatrix} \cos\theta & -r\sin\theta \\ \sin\theta & r\cos\theta \end{vmatrix} = r`],
    [['nested-fractions', 'deep'], t`\frac{1}{1 + \frac{1}{1 + \frac{1}{1 + \frac{1}{x}}}}`],
    [['nested-roots'], t`\sqrt{1 + \sqrt{1 + \sqrt{1 + \sqrt{1 + \cdots}}}} = \frac{1 + \sqrt{5}}{2}`],
    [['nth-root'], t`\sqrt[3]{x^3 + y^3}, \qquad \sqrt[n]{a}\cdot\sqrt[n]{b} = \sqrt[n]{ab}`],
    [['sup-inf-limsup'], t`\limsup_{n\to\infty} a_n = \inf_{n \ge 1}\sup_{k \ge n} a_k`],
    [['big-O', 'asymptotic'], t`T(n) = 2T\left(\frac{n}{2}\right) + \Theta(n) \implies T(n) = \Theta(n\log n)`],
    [['gamma-function'], t`\Gamma(z) = \int_0^\infty t^{z-1}e^{-t}\,dt, \qquad \Gamma(n+1) = n!`],
  ]),

  ...group('probability', [
    [['bayes'], t`p(\theta \mid \mathcal{D}) = \frac{p(\mathcal{D} \mid \theta)\,p(\theta)}{\int p(\mathcal{D} \mid \theta')\,p(\theta')\,d\theta'}`],
    [['clt', 'xrightarrow-d'], t`\sqrt{n}\left(\bar{X}_n - \mu\right) \xrightarrow{d} \mathcal{N}(0, \sigma^2)`],
    [['markov', 'chapman'], t`P^{(n+m)}_{ij} = \sum_{k} P^{(n)}_{ik}P^{(m)}_{kj}`],
    [['indep', 'perp'], t`X \perp\!\!\!\perp Y \mid Z \iff p(x, y \mid z) = p(x \mid z)\,p(y \mid z)`],
    [['moment-generating'], t`M_X(t) = \mathbb{E}\left[e^{tX}\right] = \sum_{n=0}^\infty \frac{t^n\,\mathbb{E}[X^n]}{n!}`],
    [['chebyshev', 'Pr'], t`\Pr\left(|X - \mu| \ge k\sigma\right) \le \frac{1}{k^2}`],
    [['beta-dist', 'Gamma'], t`f(x; \alpha, \beta) = \frac{\Gamma(\alpha + \beta)}{\Gamma(\alpha)\Gamma(\beta)}x^{\alpha - 1}(1 - x)^{\beta - 1}`],
    [['covariance-matrix', 'pmatrix'], t`\Sigma = \begin{pmatrix} \sigma_1^2 & \rho\sigma_1\sigma_2 \\ \rho\sigma_1\sigma_2 & \sigma_2^2 \end{pmatrix}`],
    [['poisson'], t`P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}, \qquad k = 0, 1, 2, \ldots`],
    [['expectation-integral'], t`\mathbb{E}[g(X)] = \int_{-\infty}^{\infty} g(x)f_X(x)\,dx`],
  ]),

  ...group('sizes and limits', [
    [['one-symbol'], t`x`],
    [['very-long-sum', 'line-break'], t`S = a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9 + a_{10} + a_{11} + a_{12} + a_{13} + a_{14} + a_{15} + a_{16} + a_{17} + a_{18} + a_{19} + a_{20} + a_{21} + a_{22} + a_{23} + a_{24} + a_{25} + a_{26} + a_{27} + a_{28} + a_{29} + a_{30}`],
    [['very-long-product', 'no-break-points'], t`\left(a_1 + a_2 + a_3 + a_4 + a_5 + a_6 + a_7 + a_8 + a_9 + a_{10} + a_{11} + a_{12} + a_{13} + a_{14} + a_{15} + a_{16} + a_{17} + a_{18} + a_{19} + a_{20}\right)^2`],
    [['tall-tower'], t`x^{x^{x^{x^{x^{x}}}}}`],
    [['deep-subscripts'], t`a_{b_{c_{d_{e_{f}}}}}`],
    [['tall-stack', 'aligned', '24-rows'], `\\begin{aligned}\n${Array.from({ length: 24 }, (_, i) => `x_{${i + 1}} &= ${i + 1}^2 = ${(i + 1) ** 2}`).join(' \\\\\n')}\n\\end{aligned}`],
    [['huge-matrix-12x12'], `\\begin{bmatrix} ${Array.from({ length: 12 }, (_, i) => Array.from({ length: 12 }, (_, j) => (i === j ? '1' : i < j ? `a_{${i + 1}${j + 1}}` : '0')).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`],
    [['wide-numeric-row', '10-cols'], t`\mathbf{v} = \begin{bmatrix} 0.1234 & -0.5678 & 0.9012 & -0.3456 & 0.7890 & -0.1234 & 0.5678 & -0.9012 & 0.3456 & -0.7890 \end{bmatrix}`],
    [['long-text'], t`\text{This is a rather long piece of explanatory text that a model sometimes puts inside display math instead of prose}`],
    [['many-integrals'], t`\int_0^1\!\!\int_0^1\!\!\int_0^1\!\!\int_0^1 f(x_1, x_2, x_3, x_4)\,dx_1\,dx_2\,dx_3\,dx_4`],
    [['near-limit-length'], `\\begin{aligned} ${Array.from({ length: 60 }, (_, i) => `f_{${i}}(x) &= \\frac{x^{${i}}}{${i + 1}}`).join(' \\\\ ')} \\end{aligned}`],
    [['over-limit-length'], `${Array.from({ length: 400 }, (_, i) => `a_{${i}}`).join(' + ')}`],
  ]),

  ...group('physics package clashes', [
    [['physics-div'], t`6 \div 2 = 3, \qquad \frac{a}{b} = a \div b`],
    [['physics-re-im'], t`\Re(z) = \frac{z + \bar z}{2}, \qquad \Im(z) = \frac{z - \bar z}{2i}`],
    [['physics-grad-curl'], t`\grad f, \quad \div\vb{F}, \quad \curl\vb{F}, \quad \laplacian\phi`],
    [['physics-qty-order'], t`f(x) = \qty(1 + x) + \order{x^2}`],
    [['physics-abs-norm-newcommand'], t`\newcommand{\abs}[1]{\left|#1\right|} \abs{x}`],
    [['physics-dd-dv'], t`\int f(x)\dd{x}, \qquad \dv[2]{y}{x} + \pdv{u}{x}{y}`],
    [['physics-cross'], t`\vec{a}\cross\vec{b} = -\vec{b}\times\vec{a}`],
  ]),

  ...group('model mistakes', [
    [['unknown-macro'], t`\foo{x} + 1`],
    [['unbalanced-brace'], t`\frac{a}{b + c`],
    [['double-superscript'], t`x^2^3`],
    [['misplaced-ampersand'], t`a & b`],
    [['missing-end'], t`\begin{pmatrix} 1 & 2 \\ 3 & 4`],
    [['dollar-inside-display'], t`x = $5$ + y`],
    [['text-mode-command-in-math'], t`\textrm{rate} = \emph{fast} + \underline{x}`],
    [['latex-only', 'hfill'], t`a \hfill b`],
    [['vspace', 'latex-only'], t`a \\[2ex] b`],
    [['displaystyle-inline-habits'], t`\displaystyle\sum_{n=1}^\infty \frac{1}{n^2} = \dfrac{\pi^2}{6}, \quad \tfrac{1}{2}, \quad \textstyle\sum_n`],
    [['bare-newline-in-display'], t`a = b \\ c = d`],
    [['mathbf-greek-no-effect'], t`\mathbf{\alpha} + \mathbf{\Omega}`],
    [['backslash-space-text'], t`\text{where}\ x\ \text{is real}`],
    [['percent-comment'], `a + b % a comment Claude would not write\n+ c`],
    [['ensuremath', 'mathchoice'], t`\ensuremath{x} + \mathchoice{D}{T}{S}{SS}`],
    [['href-url', 'unsafe'], t`\href{https://example.com}{x} + \url{https://example.com}`],
    [['input-include', 'unsafe'], t`\input{/etc/passwd} \include{x}`],
    [['require', 'unsafe'], t`\require{mhchem} \ce{H2O}`],
  ]),
]
