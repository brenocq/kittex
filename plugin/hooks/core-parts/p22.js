import{__esm,init_BBox,init_FontData,init_string,init_numeric,init_Styles,init_Wrapper3,init_mtable,CommonMtableMixin,SvgWrapper,MmlMtable,DIRECTION,init_mtr,MmlMtr,MmlMlabeledtr,init_mtd,MmlMtd,split,init_maction,init_MathItem,MmlMaction,STATE,init_menclose,MmlMenclose,__kittexLate}from'./p21.js';export*from'./p21.js';
__kittexLate.BREAK_BELOW=()=>BREAK_BELOW;
var BREAK_BELOW;
var init_mtable2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mtable.js"() {
    init_BBox();
    init_FontData();
    init_string();
    init_numeric();
    init_Styles();
    BREAK_BELOW = 0.333;
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mtable.js
var CLASSPREFIX;
var SvgMtable;
var init_mtable3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mtable.js"() {
    init_Wrapper3();
    init_mtable2();
    init_mtable();
    CLASSPREFIX = "mjx-";
    SvgMtable = (function() {
      var _a2;
      const Base2 = CommonMtableMixin(SvgWrapper);
      return _a2 = class SvgMtable extends Base2 {
        placeRows(svg) {
          const equal = this.node.attributes.get("equalrows");
          const { H: H2, D } = this.getTableData();
          const HD = this.getEqualRowHeight();
          const rSpace = this.getRowHalfSpacing();
          const rLines = [this.fLine, ...this.rLines, this.fLine];
          let y = this.getBBox().h - rLines[0];
          for (let i2 = 0; i2 < this.numRows; i2++) {
            const row = this.childNodes[i2];
            [row.H, row.D] = this.getRowHD(equal, HD, H2[i2], D[i2]);
            [row.tSpace, row.bSpace] = [rSpace[i2], rSpace[i2 + 1]];
            [row.tLine, row.bLine] = [rLines[i2], rLines[i2 + 1]];
            row.toSVG([svg]);
            row.place(0, y - rSpace[i2] - row.H);
            y -= rSpace[i2] + row.H + row.D + rSpace[i2 + 1] + rLines[i2 + 1];
          }
        }
        getRowHD(equal, HD, H2, D) {
          return equal ? [(HD + H2 - D) / 2, (HD - H2 + D) / 2] : [H2, D];
        }
        handleColor() {
          super.handleColor();
          const rect = this.firstChild();
          if (rect) {
            this.adaptor.setAttribute(rect, "width", this.fixed(this.getWidth()));
          }
        }
        handleColumnLines(svg) {
          if (this.node.attributes.get("columnlines") === "none")
            return;
          const lines2 = this.getColumnAttributes("columnlines");
          if (!lines2)
            return;
          const cSpace = this.getColumnHalfSpacing();
          const cLines = this.cLines;
          const cWidth = this.getComputedWidths();
          let x2 = this.fLine;
          for (let i2 = 0; i2 < lines2.length; i2++) {
            x2 += cSpace[i2] + cWidth[i2] + cSpace[i2 + 1];
            if (lines2[i2] !== "none") {
              this.adaptor.append(svg, this.makeVLine(x2, lines2[i2], cLines[i2]));
            }
            x2 += cLines[i2];
          }
        }
        handleRowLines(svg) {
          if (this.node.attributes.get("rowlines") === "none")
            return;
          const lines2 = this.getRowAttributes("rowlines");
          if (!lines2)
            return;
          const equal = this.node.attributes.get("equalrows");
          const { H: H2, D } = this.getTableData();
          const HD = this.getEqualRowHeight();
          const rSpace = this.getRowHalfSpacing();
          const rLines = this.rLines;
          let y = this.getBBox().h - this.fLine;
          for (let i2 = 0; i2 < lines2.length; i2++) {
            const [rH, rD] = this.getRowHD(equal, HD, H2[i2], D[i2]);
            y -= rSpace[i2] + rH + rD + rSpace[i2 + 1];
            if (lines2[i2] !== "none") {
              this.adaptor.append(svg, this.makeHLine(y, lines2[i2], rLines[i2]));
            }
            y -= rLines[i2];
          }
        }
        handleFrame(svg) {
          if (this.frame && this.fLine) {
            const { h, d, w } = this.getBBox();
            const style = this.node.attributes.get("frame");
            this.adaptor.append(svg, this.makeFrame(w, h, d, style));
          }
        }
        handlePWidth(svg) {
          if (!this.pWidth) {
            return 0;
          }
          const { w, L, R } = this.getBBox();
          const W = L + this.pWidth + R;
          const align = this.getAlignShift()[0];
          const max2 = Math.max(this.isTop ? W : 0, this.container.getWrapWidth(this.containerI));
          const CW = max2 - L - R;
          const dw = w - (this.pWidth > CW ? CW : this.pWidth);
          const dx = align === "left" ? 0 : align === "right" ? dw : dw / 2;
          if (dx) {
            const table2 = this.svg("g", {}, this.adaptor.childNodes(svg));
            this.place(dx, 0, table2);
            this.adaptor.append(svg, table2);
          }
          return dx;
        }
        lineClass(style) {
          return CLASSPREFIX + style;
        }
        makeFrame(w, h, d, style) {
          const t = this.fLine;
          return this.svg("rect", this.setLineThickness(t, style, {
            "data-frame": true,
            class: this.lineClass(style),
            width: this.fixed(w - t),
            height: this.fixed(h + d - t),
            x: this.fixed(t / 2),
            y: this.fixed(t / 2 - d)
          }));
        }
        makeVLine(x2, style, t) {
          const { h, d } = this.getBBox();
          const dt = style === "dotted" ? t / 2 : 0;
          const X = this.fixed(x2 + t / 2);
          return this.svg("line", this.setLineThickness(t, style, {
            "data-line": "v",
            class: this.lineClass(style),
            x1: X,
            y1: this.fixed(dt - d),
            x2: X,
            y2: this.fixed(h - dt)
          }));
        }
        makeHLine(y, style, t) {
          const w = this.getBBox().w;
          const dt = style === "dotted" ? t / 2 : 0;
          const Y = this.fixed(y - t / 2);
          return this.svg("line", this.setLineThickness(t, style, {
            "data-line": "h",
            class: this.lineClass(style),
            x1: this.fixed(dt),
            y1: Y,
            x2: this.fixed(w - dt),
            y2: Y
          }));
        }
        setLineThickness(t, style, properties) {
          if (t !== 0.07) {
            properties["stroke-thickness"] = this.fixed(t);
            if (style !== "solid") {
              properties["stroke-dasharray"] = (style === "dotted" ? "0," : "") + this.fixed(2 * t);
            }
          }
          return properties;
        }
        handleLabels(svg, _parent, dx) {
          if (!this.hasLabels)
            return;
          const labels = this.labels;
          const attributes = this.node.attributes;
          const side = attributes.get("side");
          this.spaceLabels();
          this.isTop ? this.topTable(svg, labels, side) : this.subTable(svg, labels, side, dx);
        }
        spaceLabels() {
          const adaptor = this.adaptor;
          const h = this.getBBox().h;
          const L = this.getTableData().L;
          const space = this.getRowHalfSpacing();
          let y = h - this.fLine;
          let current = adaptor.firstChild(this.labels);
          for (let i2 = 0; i2 < this.numRows; i2++) {
            const row = this.childNodes[i2];
            if (row.node.isKind("mlabeledtr")) {
              const cell = row.childNodes[0];
              y -= space[i2] + row.H;
              row.placeCell(cell, {
                x: 0,
                y,
                w: L,
                lSpace: 0,
                rSpace: 0,
                lLine: 0,
                rLine: 0
              });
              y -= row.D + space[i2 + 1] + this.rLines[i2];
              current = adaptor.next(current);
            } else {
              y -= space[i2] + row.H + row.D + space[i2 + 1] + this.rLines[i2];
            }
          }
        }
        topTable(svg, labels, side) {
          const adaptor = this.adaptor;
          const { h, d, w, L, R } = this.getBBox();
          const W = L + (this.pWidth || w) + R;
          const LW = this.getTableData().L;
          const [, align, shift] = this.getPadAlignShift(side);
          const dx = shift + (align === "right" ? -W : align === "center" ? -W / 2 : 0) + L;
          const matrix = "matrix(1 0 0 -1 0 0)";
          const scale2 = `scale(${this.jax.fixed(this.font.params.x_height * 1e3 / this.metrics.ex, 2)})`;
          const transform = `translate(0 ${this.fixed(h)}) ${matrix} ${scale2}`;
          const table2 = this.svg("svg", {
            "data-table": true,
            preserveAspectRatio: align === "left" ? "xMinYMid" : align === "right" ? "xMaxYMid" : "xMidYMid",
            viewBox: `${this.fixed(-dx)} ${this.fixed(-h)} 1 ${this.fixed(h + d)}`
          }, [this.svg("g", { transform: matrix }, adaptor.childNodes(svg))]);
          labels = this.svg("svg", {
            "data-labels": true,
            preserveAspectRatio: side === "left" ? "xMinYMid" : "xMaxYMid",
            viewBox: [
              side === "left" ? 0 : this.fixed(LW),
              this.fixed(-h),
              1,
              this.fixed(h + d)
            ].join(" ")
          }, [labels]);
          adaptor.append(svg, this.svg("g", { transform }, [table2, labels]));
          this.place(-L, 0, svg);
        }
        subTable(svg, labels, side, dx) {
          const adaptor = this.adaptor;
          const { w, L, R } = this.getBBox();
          const W = L + (this.pWidth || w) + R;
          const labelW = this.getTableData().L;
          const align = this.getAlignShift()[0];
          const CW = Math.max(W, this.container.getWrapWidth(this.containerI));
          this.place(side === "left" ? (align === "left" ? 0 : align === "right" ? W - CW + dx : (W - CW) / 2 + dx) - L : (align === "left" ? CW : align === "right" ? W + dx : (CW + W) / 2 + dx) - L - labelW, 0, labels);
          adaptor.append(svg, labels);
        }
        constructor(factory, node, parent = null) {
          super(factory, node, parent);
          const def2 = { "data-labels": true };
          if (this.isTop) {
            def2.transform = "matrix(1 0 0 -1 0 0)";
          }
          this.labels = this.svg("g", def2);
        }
        toSVG(parents) {
          const svg = this.standardSvgNodes(parents)[0];
          this.placeRows(svg);
          this.handleColumnLines(svg);
          this.handleRowLines(svg);
          this.handleFrame(svg);
          const dx = this.handlePWidth(svg);
          this.handleLabels(svg, parents[0], dx);
        }
      }, _a2.kind = MmlMtable.prototype.kind, _a2.styles = {
        'g[data-mml-node="mtable"] > line[data-line], svg[data-table] > g > line[data-line]': {
          "stroke-width": "70px",
          fill: "none"
        },
        'g[data-mml-node="mtable"] > rect[data-frame], svg[data-table] > g > rect[data-frame]': {
          "stroke-width": "70px",
          fill: "none"
        },
        'g[data-mml-node="mtable"] > .mjx-dashed, svg[data-table] > g > .mjx-dashed': {
          "stroke-dasharray": "140"
        },
        'g[data-mml-node="mtable"] > .mjx-dotted, svg[data-table] > g > .mjx-dotted': {
          "stroke-linecap": "round",
          "stroke-dasharray": "0,140"
        },
        'g[data-mml-node="mtable"] > g > svg': {
          overflow: "visible"
        }
      }, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mtr.js
function CommonMtrMixin(Base2) {
  return class CommonMtrMixin extends Base2 {
    get numCells() {
      return this.childNodes.length;
    }
    get labeled() {
      return false;
    }
    get tableCells() {
      return this.childNodes;
    }
    getChild(i2) {
      return this.childNodes[i2];
    }
    getChildBBoxes() {
      return this.childNodes.map((cell) => cell.getBBox());
    }
    stretchChildren(HD = null) {
      const stretchy = [];
      const children = this.labeled ? this.childNodes.slice(1) : this.childNodes;
      for (const mtd of children) {
        const child = mtd.childNodes[0];
        if (child.canStretch(DIRECTION.Vertical)) {
          stretchy.push(child);
        }
      }
      const count = stretchy.length;
      const nodeCount = this.childNodes.length;
      if (count && nodeCount > 1 && !HD) {
        let H2 = 0;
        let D = 0;
        const all = count > 1 && count === nodeCount;
        for (const mtd of children) {
          const child = mtd.childNodes[0];
          const noStretch = child.stretch.dir === DIRECTION.None;
          if (all || noStretch) {
            const { h, d } = child.getBBox(noStretch);
            if (h > H2) {
              H2 = h;
            }
            if (d > D) {
              D = d;
            }
          }
        }
        HD = [H2, D];
      }
      if (HD) {
        for (const child of stretchy) {
          const rscale = child.coreRScale();
          child.coreMO().getStretchedVariant(HD.map((x2) => x2 * rscale));
        }
      }
    }
    get fixesPWidth() {
      return false;
    }
  };
}
function CommonMlabeledtrMixin(Base2) {
  return class CommonMlabeledtrMixin extends Base2 {
    get numCells() {
      return Math.max(0, this.childNodes.length - 1);
    }
    get labeled() {
      return true;
    }
    get tableCells() {
      return this.childNodes.slice(1);
    }
    getChild(i2) {
      return this.childNodes[i2 + 1];
    }
    getChildBBoxes() {
      return this.childNodes.slice(1).map((cell) => cell.getBBox());
    }
  };
}
var init_mtr2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mtr.js"() {
    init_FontData();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mtr.js
var SvgMtr;
var SvgMlabeledtr;
var init_mtr3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mtr.js"() {
    init_Wrapper3();
    init_mtr2();
    init_mtr();
    SvgMtr = (function() {
      var _a2;
      const Base2 = CommonMtrMixin(SvgWrapper);
      return _a2 = class SvgMtr extends Base2 {
        placeCell(cell, sizes) {
          const { x: x2, y, lSpace, w, rSpace, lLine, rLine } = sizes;
          const scale2 = 1 / this.getBBox().rscale;
          const [h, d] = [this.H * scale2, this.D * scale2];
          const [t, b] = [this.tSpace * scale2, this.bSpace * scale2];
          const [dx, dy] = cell.placeCell(x2 + lSpace, y, w, h, d);
          const W = lSpace + w + rSpace;
          cell.placeColor(-(dx + lSpace + lLine / 2), -(d + b + dy), W + (lLine + rLine) / 2, h + d + t + b);
          return W + rLine;
        }
        placeCells(svg) {
          const parent = this.parent;
          const cSpace = parent.getColumnHalfSpacing();
          const cLines = [parent.fLine, ...parent.cLines, parent.fLine];
          const cWidth = parent.getComputedWidths();
          const scale2 = 1 / this.getBBox().rscale;
          let x2 = cLines[0];
          for (let i2 = 0; i2 < this.numCells; i2++) {
            const child = this.getChild(i2);
            child.toSVG(svg);
            x2 += this.placeCell(child, {
              x: x2,
              y: 0,
              lSpace: cSpace[i2] * scale2,
              rSpace: cSpace[i2 + 1] * scale2,
              w: cWidth[i2] * scale2,
              lLine: cLines[i2] * scale2,
              rLine: cLines[i2 + 1] * scale2
            });
          }
        }
        placeColor() {
          const scale2 = 1 / this.getBBox().rscale;
          const adaptor = this.adaptor;
          const child = this.firstChild();
          if (child && adaptor.kind(child) === "rect" && adaptor.getAttribute(child, "data-bgcolor")) {
            const [TL, BL] = [this.tLine / 2 * scale2, this.bLine / 2 * scale2];
            const [TS, BS] = [this.tSpace * scale2, this.bSpace * scale2];
            const [H2, D] = [this.H * scale2, this.D * scale2];
            adaptor.setAttribute(child, "y", this.fixed(-(D + BS + BL)));
            adaptor.setAttribute(child, "width", this.fixed(this.parent.getWidth() * scale2));
            adaptor.setAttribute(child, "height", this.fixed(TL + TS + H2 + D + BS + BL));
          }
        }
        toSVG(parents) {
          const svg = this.standardSvgNodes(parents);
          this.placeCells(svg);
          this.placeColor();
        }
      }, _a2.kind = MmlMtr.prototype.kind, _a2;
    })();
    SvgMlabeledtr = (function() {
      var _a2;
      const Base2 = CommonMlabeledtrMixin(SvgMtr);
      return _a2 = class SvgMlabeledtr extends Base2 {
        toSVG(parents) {
          super.toSVG(parents);
          const child = this.childNodes[0];
          if (child) {
            child.toSVG([this.parent.labels]);
          }
        }
      }, _a2.kind = MmlMlabeledtr.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/mtd.js
function CommonMtdMixin(Base2) {
  return class CommonMtdMixin extends Base2 {
    get fixesPWidth() {
      return false;
    }
    invalidateBBox() {
      this.bboxComputed = false;
      this.lineBBox = [];
    }
    getWrapWidth(_j) {
      const table2 = this.parent.parent;
      const row = this.parent;
      const i2 = this.node.childPosition() - (row.labeled ? 1 : 0);
      return typeof table2.cWidths[i2] === "number" ? table2.cWidths[i2] : table2.getTableData().W[i2];
    }
    getChildAlign(_i) {
      return this.node.attributes.get("columnalign");
    }
  };
}
var init_mtd2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/mtd.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/mtd.js
var SvgMtd;
var init_mtd3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/mtd.js"() {
    init_Wrapper3();
    init_mtd2();
    init_mtd();
    SvgMtd = (function() {
      var _a2;
      const Base2 = CommonMtdMixin(SvgWrapper);
      return _a2 = class SvgMtd extends Base2 {
        placeCell(x2, y, W, H2, D) {
          const bbox = this.getBBox();
          const h = Math.max(bbox.h, 0.75);
          const d = Math.max(bbox.d, 0.25);
          const calign = this.node.attributes.get("columnalign");
          const ralign = this.node.attributes.get("rowalign");
          const alignX = this.getAlignX(W, bbox, calign);
          const alignY = this.getAlignY(H2, D, h, d, ralign);
          this.place(x2 + alignX, y + alignY);
          return [alignX, alignY];
        }
        placeColor(x2, y, W, H2) {
          const adaptor = this.adaptor;
          const child = this.firstChild();
          if (child && adaptor.kind(child) === "rect" && adaptor.getAttribute(child, "data-bgcolor")) {
            adaptor.setAttribute(child, "x", this.fixed(x2));
            adaptor.setAttribute(child, "y", this.fixed(y));
            adaptor.setAttribute(child, "width", this.fixed(W));
            adaptor.setAttribute(child, "height", this.fixed(H2));
          }
        }
      }, _a2.kind = MmlMtd.prototype.kind, _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/maction.js
function CommonMactionMixin(Base2) {
  return class CommonMactionMixin extends Base2 {
    get selected() {
      const selection = this.node.attributes.get("selection");
      const i2 = Math.max(1, Math.min(this.childNodes.length, selection)) - 1;
      return this.childNodes[i2] || this.wrap(this.node.selected);
    }
    getParameters() {
      const offsets = this.node.attributes.get("data-offsets");
      const [dx, dy] = split(offsets || "");
      this.tipDx = this.length2em(dx || TooltipData.dx);
      this.tipDy = this.length2em(dy || TooltipData.dy);
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      const actions = this.constructor.actions;
      const action = this.node.attributes.get("actiontype");
      const [handler, data] = actions.get(action) || [
        ((_node, _data) => {
        }),
        {}
      ];
      this.action = handler;
      this.data = data;
      this.getParameters();
    }
    computeBBox(bbox, recompute = false) {
      bbox.updateFrom(this.selected.getOuterBBox());
      this.selected.setChildPWidths(recompute);
    }
    get breakCount() {
      return this.node.isEmbellished ? this.selected.coreMO().embellishedBreakCount : this.selected.breakCount;
    }
    computeLineBBox(i2) {
      return this.getChildLineBBox(this.selected, i2);
    }
  };
}
var TooltipData;
var init_maction2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/maction.js"() {
    init_string();
    TooltipData = {
      dx: ".2em",
      dy: ".1em",
      postDelay: 600,
      clearDelay: 100,
      hoverTimer: /* @__PURE__ */ new Map(),
      clearTimer: /* @__PURE__ */ new Map(),
      stopTimers: (node, data) => {
        if (data.clearTimer.has(node)) {
          clearTimeout(data.clearTimer.get(node));
          data.clearTimer.delete(node);
        }
        if (data.hoverTimer.has(node)) {
          clearTimeout(data.hoverTimer.get(node));
          data.hoverTimer.delete(node);
        }
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/maction.js
var SvgMaction;
var init_maction3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/maction.js"() {
    init_Wrapper3();
    init_maction2();
    init_maction2();
    init_maction();
    init_MathItem();
    SvgMaction = (function() {
      var _a2;
      const Base2 = CommonMactionMixin(SvgWrapper);
      return _a2 = class SvgMaction extends Base2 {
        setEventHandler(type, handler, dom = null) {
          (dom ? [dom] : this.dom).forEach((node) => node.addEventListener(type, handler));
        }
        Px(m) {
          return this.px(m);
        }
        toSVG(parents) {
          if (this.toEmbellishedSVG(parents))
            return;
          const svg = this.standardSvgNodes(parents);
          const child = this.selected;
          let i2 = 0;
          this.dom.forEach((node) => {
            const { h, d, w } = child.getLineBBox(i2++);
            this.adaptor.append(node, this.svg("rect", {
              width: this.fixed(w),
              height: this.fixed(h + d),
              x: i2 === 1 ? this.fixed(-this.dx) : 0,
              y: this.fixed(-d),
              fill: "none",
              "pointer-events": "all"
            }));
          });
          child.toSVG(svg);
          const bbox = child.getOuterBBox();
          if (child.dom) {
            child.place(bbox.L * bbox.rscale, 0);
          }
          this.action(this, this.data);
        }
      }, _a2.kind = MmlMaction.prototype.kind, _a2.styles = JSON.parse(`{
 "[jax=\\"SVG\\"] mjx-tool":{"display":"inline-block","position":"relative","width":0,"height":0},
 "[jax=\\"SVG\\"] mjx-tool > mjx-tip":{"position":"absolute","top":0,"left":0},
 "mjx-tool > mjx-tip":{"display":"inline-block","line-height":0,"padding":".2em","border":"1px solid #888","background-color":"#F8F8F8","color":"black","box-shadow":"2px 2px 5px #AAAAAA"},
 "g[data-mml-node=\\"maction\\"][data-toggle]":{"cursor":"pointer"},
 "mjx-status":{"display":"block","position":"fixed","left":"1em","bottom":"1em","min-width":"25%","padding":".2em .4em","border":"1px solid #888","font-size":"90%","background-color":"#F8F8F8","color":"black"},
 "g[data-mjx-collapsed]":{"fill":"#55F"},
 "@media (prefers-color-scheme: dark) /* svg maction */":{
  "mjx-tool > mjx-tip":{"background-color":"#303030","color":"#E0E0E0","box-shadow":"2px 2px 5px #000"},
  "mjx-status":{"background-color":"#303030","color":"#E0E0E0"},
  "g[data-mjx-collapsed]":{"fill":"#88F"}
 }
}`), _a2.actions = /* @__PURE__ */ new Map([
        [
          "toggle",
          [
            (node, _data) => {
              node.dom.forEach((dom) => {
                node.adaptor.setAttribute(dom, "data-toggle", node.node.attributes.get("selection"));
              });
              const math = node.factory.jax.math;
              const document = node.factory.jax.document;
              const mml = node.node;
              node.setEventHandler("click", (event) => {
                if (!math.end.node) {
                  math.start.node = math.end.node = math.typesetRoot;
                  math.start.n = math.end.n = 0;
                }
                mml.nextToggleSelection();
                math.rerender(document, mml.attributes.get("data-maction-id") ? STATE.ENRICHED : STATE.RERENDER);
                event.stopPropagation();
              });
            },
            {}
          ]
        ],
        [
          "tooltip",
          [
            (node, data) => {
              const tip = node.childNodes[1];
              if (!tip)
                return;
              for (const dom of node.dom) {
                const rect = node.firstChild(dom);
                if (tip.node.isKind("mtext")) {
                  const text = tip.node.getText();
                  node.adaptor.insert(node.svg("title", {}, [node.text(text)]), rect);
                } else {
                  const adaptor = node.adaptor;
                  const container = node.jax.container;
                  const math = node.node.factory.create("math", {}, [node.childNodes[1].node]);
                  const tool = node.html("mjx-tool", {}, [node.html("mjx-tip")]);
                  const hidden = adaptor.append(rect, node.svg("foreignObject", { style: { display: "none" } }, [
                    tool
                  ]));
                  node.jax.processMath(node.jax.factory.wrap(math), adaptor.firstChild(tool));
                  node.childNodes[1].node.parent = node.node;
                  node.setEventHandler("mouseover", (event) => {
                    data.stopTimers(dom, data);
                    data.hoverTimer.set(dom, setTimeout(() => {
                      adaptor.setStyle(tool, "left", "0");
                      adaptor.setStyle(tool, "top", "0");
                      adaptor.append(container, tool);
                      const tbox = adaptor.nodeBBox(tool);
                      const nbox = adaptor.nodeBBox(dom);
                      const dx = (nbox.right - tbox.left) / node.metrics.em + node.tipDx;
                      const dy = (nbox.bottom - tbox.bottom) / node.metrics.em + node.tipDy;
                      adaptor.setStyle(tool, "left", node.Px(dx));
                      adaptor.setStyle(tool, "top", node.Px(dy));
                    }, data.postDelay));
                    event.stopPropagation();
                  }, dom);
                  node.setEventHandler("mouseout", (event) => {
                    data.stopTimers(dom, data);
                    const timer = setTimeout(() => adaptor.append(hidden, tool), data.clearDelay);
                    data.clearTimer.set(dom, timer);
                    event.stopPropagation();
                  }, dom);
                }
              }
            },
            TooltipData
          ]
        ],
        [
          "statusline",
          [
            (node, data) => {
              const tip = node.childNodes[1];
              if (!tip)
                return;
              if (tip.node.isKind("mtext")) {
                const adaptor = node.adaptor;
                const text = tip.node.getText();
                node.dom.forEach((dom) => adaptor.setAttribute(dom, "data-statusline", text));
                node.setEventHandler("mouseover", (event) => {
                  if (data.status === null) {
                    const body = adaptor.body(adaptor.document);
                    data.status = adaptor.append(body, node.html("mjx-status", {}, [node.text(text)]));
                  }
                  event.stopPropagation();
                });
                node.setEventHandler("mouseout", (event) => {
                  if (data.status) {
                    adaptor.remove(data.status);
                    data.status = null;
                  }
                  event.stopPropagation();
                });
              }
            },
            {
              status: null
            }
          ]
        ]
      ]), _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Notation.js
var ARROWX;
var ARROWDX;
var ARROWY;
var THICKNESS;
var PADDING;
var SOLID2;
var sideIndex;
var sideNames;
var fullBBox;
var fullBorder;
var arrowHead;
var arrowBBoxHD;
var arrowBBoxW;
var arrowDef;
var diagonalArrowDef;
var arrowBBox;
var CommonBorder;
var CommonBorder2;
var CommonDiagonalStrike;
var CommonDiagonalArrow;
var CommonArrow;
var init_Notation = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Notation.js"() {
    ARROWX = 4;
    ARROWDX = 1;
    ARROWY = 2;
    THICKNESS = 0.067;
    PADDING = 0.2;
    SOLID2 = THICKNESS + "em solid";
    sideIndex = { top: 0, right: 1, bottom: 2, left: 3 };
    sideNames = Object.keys(sideIndex);
    fullBBox = ((node) => new Array(4).fill(node.thickness + node.padding));
    fullBorder = ((node) => new Array(4).fill(node.thickness));
    arrowHead = (node) => {
      return Math.max(node.padding, node.thickness * (node.arrowhead.x + node.arrowhead.dx + 1));
    };
    arrowBBoxHD = (node, TRBL2) => {
      if (node.childNodes[0]) {
        const { h, d } = node.childNodes[0].getBBox();
        TRBL2[0] = TRBL2[2] = Math.max(0, node.thickness * node.arrowhead.y - (h + d) / 2);
      }
      return TRBL2;
    };
    arrowBBoxW = (node, TRBL2) => {
      if (node.childNodes[0]) {
        const { w } = node.childNodes[0].getBBox();
        TRBL2[1] = TRBL2[3] = Math.max(0, node.thickness * node.arrowhead.y - w / 2);
      }
      return TRBL2;
    };
    arrowDef = {
      up: [-Math.PI / 2, false, true, "verticalstrike"],
      down: [Math.PI / 2, false, true, "verticakstrike"],
      right: [0, false, false, "horizontalstrike"],
      left: [Math.PI, false, false, "horizontalstrike"],
      updown: [Math.PI / 2, true, true, "verticalstrike uparrow downarrow"],
      leftright: [0, true, false, "horizontalstrike leftarrow rightarrow"]
    };
    diagonalArrowDef = {
      updiagonal: [-1, 0, false, "updiagonalstrike northeastarrow"],
      northeast: [-1, 0, false, "updiagonalstrike updiagonalarrow"],
      southeast: [1, 0, false, "downdiagonalstrike"],
      northwest: [1, Math.PI, false, "downdiagonalstrike"],
      southwest: [-1, Math.PI, false, "updiagonalstrike"],
      northeastsouthwest: [
        -1,
        0,
        true,
        "updiagonalstrike northeastarrow updiagonalarrow southwestarrow"
      ],
      northwestsoutheast: [
        1,
        0,
        true,
        "downdiagonalstrike northwestarrow southeastarrow"
      ]
    };
    arrowBBox = {
      up: (node) => arrowBBoxW(node, [arrowHead(node), 0, node.padding, 0]),
      down: (node) => arrowBBoxW(node, [node.padding, 0, arrowHead(node), 0]),
      right: (node) => arrowBBoxHD(node, [0, arrowHead(node), 0, node.padding]),
      left: (node) => arrowBBoxHD(node, [0, node.padding, 0, arrowHead(node)]),
      updown: (node) => arrowBBoxW(node, [arrowHead(node), 0, arrowHead(node), 0]),
      leftright: (node) => arrowBBoxHD(node, [0, arrowHead(node), 0, arrowHead(node)])
    };
    CommonBorder = function(render) {
      return (side) => {
        const i2 = sideIndex[side];
        return [
          side,
          {
            renderer: render,
            bbox: (node) => {
              const bbox = [0, 0, 0, 0];
              bbox[i2] = node.thickness + node.padding;
              return bbox;
            },
            border: (node) => {
              const bbox = [0, 0, 0, 0];
              bbox[i2] = node.thickness;
              return bbox;
            }
          }
        ];
      };
    };
    CommonBorder2 = function(render) {
      return (name, side1, side2) => {
        const i1 = sideIndex[side1];
        const i2 = sideIndex[side2];
        return [
          name,
          {
            renderer: render,
            bbox: (node) => {
              const t = node.thickness + node.padding;
              const bbox = [0, 0, 0, 0];
              bbox[i1] = bbox[i2] = t;
              return bbox;
            },
            border: (node) => {
              const bbox = [0, 0, 0, 0];
              bbox[i1] = bbox[i2] = node.thickness;
              return bbox;
            },
            remove: side1 + " " + side2
          }
        ];
      };
    };
    CommonDiagonalStrike = function(render) {
      return (name) => {
        const cname = "mjx-" + name.charAt(0) + "strike";
        return [
          name + "diagonalstrike",
          {
            renderer: render(cname),
            bbox: fullBBox
          }
        ];
      };
    };
    CommonDiagonalArrow = function(render) {
      return (name) => {
        const [c, pi, double, remove] = diagonalArrowDef[name];
        return [
          name + "arrow",
          {
            renderer: (node, _child) => {
              const [a, W] = node.arrowAW();
              const arrow = node.arrow(W, c * (a - pi), double);
              render(node, arrow);
            },
            bbox: (node) => {
              const { a, x: x2, y } = node.arrowData();
              const [ax, ay, adx] = [
                node.arrowhead.x,
                node.arrowhead.y,
                node.arrowhead.dx
              ];
              const [b, ar] = node.getArgMod(ax + adx, ay);
              const dy = y + (b > a ? node.thickness * ar * Math.sin(b - a) : 0);
              const dx = x2 + (b > Math.PI / 2 - a ? node.thickness * ar * Math.sin(b + a - Math.PI / 2) : 0);
              return [dy, dx, dy, dx];
            },
            remove
          }
        ];
      };
    };
    CommonArrow = function(render) {
      return (name) => {
        const [angle, double, isVertical, remove] = arrowDef[name];
        return [
          name + "arrow",
          {
            renderer: (node, _child) => {
              const { w, h, d } = node.getBBox();
              const [W, offset] = isVertical ? [h + d, "X"] : [w, "Y"];
              const dd = node.getOffset(offset);
              const arrow = node.arrow(W, angle, double, offset, dd);
              render(node, arrow);
            },
            bbox: arrowBBox[name],
            remove
          }
        ];
      };
    };
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/menclose.js
function CommonMencloseMixin(Base2) {
  return class CommonMencloseMixin extends Base2 {
    getParameters() {
      const attributes = this.node.attributes;
      const padding2 = attributes.get("data-padding");
      if (padding2 !== void 0) {
        this.padding = this.length2em(padding2, PADDING);
      }
      const thickness = attributes.get("data-thickness");
      if (thickness !== void 0) {
        this.thickness = this.length2em(thickness, THICKNESS);
      }
      const arrowhead = attributes.get("data-arrowhead");
      if (arrowhead !== void 0) {
        const [x2, y, dx] = split(arrowhead);
        this.arrowhead = {
          x: x2 ? parseFloat(x2) : ARROWX,
          y: y ? parseFloat(y) : ARROWY,
          dx: dx ? parseFloat(dx) : ARROWDX
        };
      }
    }
    getNotations() {
      const Notations = this.constructor.notations;
      for (const name of split(this.node.attributes.get("notation"))) {
        const notation = Notations.get(name);
        if (notation) {
          this.notations[name] = notation;
          if (notation.renderChild) {
            this.renderChild = notation.renderer;
          }
        }
      }
    }
    removeRedundantNotations() {
      for (const name of Object.keys(this.notations)) {
        if (this.notations[name]) {
          const remove = this.notations[name].remove || "";
          for (const notation of remove.split(/ /)) {
            delete this.notations[notation];
          }
        }
      }
    }
    initializeNotations() {
      for (const name of Object.keys(this.notations)) {
        const init2 = this.notations[name].init;
        if (init2) {
          init2(this);
        }
      }
    }
    getBBoxExtenders() {
      const TRBL2 = [0, 0, 0, 0];
      for (const name of Object.keys(this.notations)) {
        this.maximizeEntries(TRBL2, this.notations[name].bbox(this));
      }
      return TRBL2;
    }
    getPadding() {
      const BTRBL = [0, 0, 0, 0];
      for (const name of Object.keys(this.notations)) {
        const border = this.notations[name].border;
        if (border) {
          this.maximizeEntries(BTRBL, border(this));
        }
      }
      return [0, 1, 2, 3].map((i2) => this.TRBL[i2] - BTRBL[i2]);
    }
    maximizeEntries(X, Y) {
      for (let i2 = 0; i2 < X.length; i2++) {
        if (X[i2] < Y[i2]) {
          X[i2] = Y[i2];
        }
      }
    }
    getOffset(direction) {
      const [T, R, B, L] = this.TRBL;
      const d = (direction === "X" ? R - L : B - T) / 2;
      return Math.abs(d) > 1e-3 ? d : 0;
    }
    getArgMod(w, h) {
      return [Math.atan2(h, w), Math.sqrt(w * w + h * h)];
    }
    arrow(_w, _a2, _double, _offset = "", _dist = 0) {
      return null;
    }
    arrowData() {
      const [p, t] = [this.padding, this.thickness];
      const r = t * (this.arrowhead.x + Math.max(1, this.arrowhead.dx));
      const { h, d, w } = this.childNodes[0].getBBox();
      const H2 = h + d;
      const R = Math.sqrt(H2 * H2 + w * w);
      const x2 = Math.max(p, r * w / R);
      const y = Math.max(p, r * H2 / R);
      const [a, W] = this.getArgMod(w + 2 * x2, H2 + 2 * y);
      return { a, W, x: x2, y };
    }
    arrowAW() {
      const { h, d, w } = this.childNodes[0].getBBox();
      const [T, R, B, L] = this.TRBL;
      return this.getArgMod(L + w + R, T + h + d + B);
    }
    createMsqrt(child) {
      const mmlFactory = this.node.factory;
      const mml = mmlFactory.create("msqrt");
      mml.inheritAttributesFrom(this.node);
      mml.childNodes[0] = child.node;
      const node = this.wrap(mml);
      node.parent = this;
      return node;
    }
    sqrtTRBL() {
      const bbox = this.msqrt.getBBox();
      const cbox = this.msqrt.childNodes[0].getBBox();
      return [bbox.h - cbox.h, 0, bbox.d - cbox.d, bbox.w - cbox.w];
    }
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.notations = {};
      this.renderChild = null;
      this.msqrt = null;
      this.padding = PADDING;
      this.thickness = THICKNESS;
      this.arrowhead = {
        x: ARROWX,
        y: ARROWY,
        dx: ARROWDX
      };
      this.TRBL = [0, 0, 0, 0];
      this.getParameters();
      this.getNotations();
      this.removeRedundantNotations();
      this.initializeNotations();
      this.TRBL = this.getBBoxExtenders();
    }
    computeBBox(bbox, recompute = false) {
      const [T, R, B, L] = this.TRBL;
      const child = this.childNodes[0].getBBox();
      bbox.combine(child, L, 0);
      bbox.h += T;
      bbox.d += B;
      bbox.w += R;
      this.setChildPWidths(recompute);
    }
  };
}
var init_menclose2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/menclose.js"() {
    init_Notation();
    init_string();
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Notation.js
var computeLineData;
var lineData;
var lineOffset;
var RenderLine;
var Border;
var Border2;
var DiagonalStrike;
var DiagonalArrow;
var Arrow;
var init_Notation2 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Notation.js"() {
    init_Notation();
    init_Notation();
    computeLineData = {
      top: (h, _d, w, t) => [0, h - t, w, h - t],
      right: (h, d, w, t) => [w - t, -d, w - t, h],
      bottom: (_h, d, w, t) => [0, t - d, w, t - d],
      left: (h, d, _w, t) => [t, -d, t, h],
      vertical: (h, d, w, _t) => [w / 2, h, w / 2, -d],
      horizontal: (h, d, w, _t) => [0, (h - d) / 2, w, (h - d) / 2],
      up: (h, d, w, t) => [t, t - d, w - t, h - t],
      down: (h, d, w, t) => [t, h - t, w - t, t - d]
    };
    lineData = function(node, kind, offset = "") {
      const { h, d, w } = node.getBBox();
      const t = node.thickness / 2;
      return lineOffset(computeLineData[kind](h, d, w, t), node, offset);
    };
    lineOffset = function(data, node, offset) {
      if (offset) {
        const d = node.getOffset(offset);
        if (d) {
          if (offset === "X") {
            data[0] -= d;
            data[2] -= d;
          } else {
            data[1] -= d;
            data[3] -= d;
          }
        }
      }
      return data;
    };
    RenderLine = function(line, offset = "") {
      return (node, _child) => {
        const L = node.line(lineData(node, line, offset));
        node.adaptor.append(node.dom[0], L);
      };
    };
    Border = function(side) {
      return CommonBorder((node, _child) => {
        node.adaptor.append(node.dom[0], node.line(lineData(node, side)));
      })(side);
    };
    Border2 = function(name, side1, side2) {
      return CommonBorder2((node, _child) => {
        node.adaptor.append(node.dom[0], node.line(lineData(node, side1)));
        node.adaptor.append(node.dom[0], node.line(lineData(node, side2)));
      })(name, side1, side2);
    };
    DiagonalStrike = function(name) {
      return CommonDiagonalStrike((_cname) => (node, _child) => {
        node.adaptor.append(node.dom[0], node.line(lineData(node, name)));
      })(name);
    };
    DiagonalArrow = function(name) {
      return CommonDiagonalArrow((node, arrow) => {
        node.adaptor.append(node.dom[0], arrow);
      })(name);
    };
    Arrow = function(name) {
      return CommonArrow((node, arrow) => {
        node.adaptor.append(node.dom[0], arrow);
      })(name);
    };
  }
});
// node_modules/@mathjax/src/mjs/output/svg/Wrappers/menclose.js
var SvgMenclose;
var init_menclose3 = __esm({
  "node_modules/@mathjax/src/mjs/output/svg/Wrappers/menclose.js"() {
    init_Wrapper3();
    init_menclose2();
    init_menclose();
    init_Notation2();
    SvgMenclose = (function() {
      var _a2;
      const Base2 = CommonMencloseMixin(SvgWrapper);
      return _a2 = class SvgMenclose extends Base2 {
        line(pq) {
          const [x1, y1, x2, y2] = pq;
          return this.svg("line", {
            x1: this.fixed(x1),
            y1: this.fixed(y1),
            x2: this.fixed(x2),
            y2: this.fixed(y2),
            "stroke-width": this.fixed(this.thickness)
          });
        }
        box(w, h, d, r = 0) {
          const t = this.thickness;
          const def2 = {
            x: this.fixed(t / 2),
            y: this.fixed(t / 2 - d),
            width: this.fixed(w - t),
            height: this.fixed(h + d - t),
            fill: "none",
            "stroke-width": this.fixed(t)
          };
          if (r) {
            def2.rx = this.fixed(r);
          }
          return this.svg("rect", def2);
        }
        ellipse(w, h, d) {
          const t = this.thickness;
          return this.svg("ellipse", {
            rx: this.fixed((w - t) / 2),
            ry: this.fixed((h + d - t) / 2),
            cx: this.fixed(w / 2),
            cy: this.fixed((h - d) / 2),
            fill: "none",
            "stroke-width": this.fixed(t)
          });
        }
        path(join2, ...P) {
          return this.svg("path", {
            d: P.map((x2) => typeof x2 === "string" ? x2 : this.fixed(x2)).join(" "),
            style: { "stroke-width": this.fixed(this.thickness) },
            "stroke-linecap": "round",
            "stroke-linejoin": join2,
            fill: "none"
          });
        }
        fill(...P) {
          return this.svg("path", {
            d: P.map((x2) => typeof x2 === "string" ? x2 : this.fixed(x2)).join(" ")
          });
        }
        arrow(W, a, double, offset = "", dist = 0) {
          const { w, h, d } = this.getBBox();
          const dw = (W - w) / 2;
          const m = (h - d) / 2;
          const t = this.thickness;
          const t2 = t / 2;
          const [x2, y, dx] = [t * this.arrowhead.x, t * this.arrowhead.y, t * this.arrowhead.dx];
          const arrow = double ? this.fill("M", w + dw, m, "l", -(x2 + dx), y, "l", dx, t2 - y, "L", x2 - dw, m + t2, "l", dx, y - t2, "l", -(x2 + dx), -y, "l", x2 + dx, -y, "l", -dx, y - t2, "L", w + dw - x2, m - t2, "l", -dx, t2 - y, "Z") : this.fill("M", w + dw, m, "l", -(x2 + dx), y, "l", dx, t2 - y, "L", -dw, m + t2, "l", 0, -t, "L", w + dw - x2, m - t2, "l", -dx, t2 - y, "Z");
          const transform = [];
          if (dist) {
            transform.push(offset === "X" ? `translate(${this.fixed(-dist)} 0)` : `translate(0 ${this.fixed(dist)})`);
          }
          if (a) {
            const A = this.jax.fixed(-a * 180 / Math.PI);
            transform.push(`rotate(${A} ${this.fixed(w / 2)} ${this.fixed(m)})`);
          }
          if (transform.length) {
            this.adaptor.setAttribute(arrow, "transform", transform.join(" "));
          }
          return arrow;
        }
        toSVG(parents) {
          const svg = this.standardSvgNodes(parents);
          const left = this.getBBoxExtenders()[3];
          const def2 = {};
          if (left > 0) {
            def2.transform = "translate(" + this.fixed(left) + ", 0)";
          }
          const block2 = this.adaptor.append(svg[0], this.svg("g", def2));
          if (this.renderChild) {
            this.renderChild(this, block2);
          } else {
            this.childNodes[0].toSVG([block2]);
            this.childNodes[0].place(0, 0);
          }
          for (const name of Object.keys(this.notations)) {
            const notation = this.notations[name];
            if (!notation.renderChild) {
              notation.renderer(this, svg[0]);
            }
          }
        }
      }, _a2.kind = MmlMenclose.prototype.kind, _a2.notations = new Map([
        Border("top"),
        Border("right"),
        Border("bottom"),
        Border("left"),
        Border2("actuarial", "top", "right"),
        Border2("madruwb", "bottom", "right"),
        DiagonalStrike("up"),
        DiagonalStrike("down"),
        [
          "horizontalstrike",
          {
            renderer: RenderLine("horizontal", "Y"),
            bbox: (node) => [0, node.padding, 0, node.padding]
          }
        ],
        [
          "verticalstrike",
          {
            renderer: RenderLine("vertical", "X"),
            bbox: (node) => [node.padding, 0, node.padding, 0]
          }
        ],
        [
          "box",
          {
            renderer: (node, _child) => {
              const { w, h, d } = node.getBBox();
              node.adaptor.append(node.dom[0], node.box(w, h, d));
            },
            bbox: fullBBox,
            border: fullBorder,
            remove: "left right top bottom"
          }
        ],
        [
          "roundedbox",
          {
            renderer: (node, _child) => {
              const { w, h, d } = node.getBBox();
              const r = node.thickness + node.padding;
              node.adaptor.append(node.dom[0], node.box(w, h, d, r));
            },
            bbox: fullBBox
          }
        ],
        [
          "circle",
          {
            renderer: (node, _child) => {
              const { w, h, d } = node.getBBox();
              node.adaptor.append(node.dom[0], node.ellipse(w, h, d));
            },
            bbox: fullBBox
          }
        ],
        [
          "phasorangle",
          {
            renderer: (node, _child) => {
              const { w, h, d } = node.getBBox();
              const a = node.getArgMod(1.75 * node.padding, h + d)[0];
              const t = node.thickness / 2;
              const HD = h + d;
              const cos = Math.cos(a);
              node.adaptor.append(node.dom[0], node.path("mitre", "M", w, t - d, "L", t + cos * t, t - d, "L", cos * HD + t, HD - d - t));
            },
            bbox: (node) => {
              const p = node.padding / 2;
              const t = node.thickness;
              return [2 * p, p, p + t, 3 * p + t];
            },
            border: (node) => [0, 0, node.thickness, 0],
            remove: "bottom"
          }
        ],
        Arrow("up"),
        Arrow("down"),
        Arrow("left"),
        Arrow("right"),
        Arrow("updown"),
        Arrow("leftright"),
        DiagonalArrow("updiagonal"),
        DiagonalArrow("northeast"),
        DiagonalArrow("southeast"),
        DiagonalArrow("northwest"),
        DiagonalArrow("southwest"),
        DiagonalArrow("northeastsouthwest"),
        DiagonalArrow("northwestsoutheast"),
        [
          "longdiv",
          {
            renderer: (node, _child) => {
              const { w, h, d } = node.getBBox();
              const t = node.thickness / 2;
              const p = node.padding;
              node.adaptor.append(node.dom[0], node.path("round", "M", t, t - d, "a", p - t / 2, (h + d) / 2 - 4 * t, 0, "0,1", 0, h + d - 2 * t, "L", w - t, h - t));
            },
            bbox: (node) => {
              const p = node.padding;
              const t = node.thickness;
              return [p + t, p, p, 2 * p + t / 2];
            }
          }
        ],
        [
          "radical",
          {
            renderer: (node, child) => {
              node.msqrt.toSVG([child]);
              const left = node.sqrtTRBL()[3];
              node.place(-left, 0, child);
            },
            init: (node) => {
              node.msqrt = node.createMsqrt(node.childNodes[0]);
            },
            bbox: (node) => node.sqrtTRBL(),
            renderChild: true
          }
        ]
      ]), _a2;
    })();
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/semantics.js
function CommonSemanticsMixin(Base2) {
  return class CommonSemanticsMixin extends Base2 {
    computeBBox(bbox, _recompute = false) {
      if (this.childNodes.length) {
        const { w, h, d } = this.childNodes[0].getBBox();
        bbox.w = w;
        bbox.h = h;
        bbox.d = d;
      }
    }
    get breakCount() {
      return this.node.isEmbellished ? this.coreMO().embellishedBreakCount : this.childNodes[0].breakCount;
    }
  };
}
var init_semantics2 = __esm({
  "node_modules/@mathjax/src/mjs/output/common/Wrappers/semantics.js"() {
  }
});
// node_modules/@mathjax/src/mjs/output/common/Wrappers/XmlNode.js
function CommonXmlNodeMixin(Base2) {
  class CommonXmlNodeMixin2 extends Base2 {
    constructor(factory, node, parent = null) {
      super(factory, node, parent);
      this.rscale = this.getRScale();
    }
    computeBBox(bbox, _recompute = false) {
      const xml = this.node.getXML();
      const hdw = this.getHDW(xml, "use", "force");
      const { h, d, w } = hdw ? this.splitHDW(hdw) : this.measureXmlNode(xml);
      bbox.w = w;
      bbox.h = h;
      bbox.d = d;
    }
    getHTML() {
      const adaptor = this.adaptor;
      let html2 = adaptor.clone(this.node.getXML());
      const styles = this.getFontStyles();
      const hdw = this.getHDW(html2, "force");
      if (hdw || this.jax.options.scale !== 1) {
        html2 = this.addHDW(html2, styles);
      }
      return this.html("mjx-html", { variant: this.parent.variant, style: styles }, [html2]);
    }
    getHDW(xml, use2, force = use2) {
      const option = this.jax.options.htmlHDW;
      const hdw = this.adaptor.getAttribute(xml, "data-mjx-hdw");
      return hdw && (option === use2 || option === force) ? hdw : null;
    }
    splitHDW(hdw) {
      const scale2 = 1 / this.metrics.scale;
      const [h, d, w] = split(hdw).map((x2) => this.length2em(x2 || "0") * scale2);
      return { h, d, w };
    }
    getFontStyles() {
      var _a2;
      const adaptor = this.adaptor;
      const metrics = this.metrics;
      return {
        "font-family": ((_a2 = this.parent.styles) === null || _a2 === void 0 ? void 0 : _a2.get("font-family")) || metrics.family || adaptor.fontFamily(adaptor.parent(this.jax.math.start.node)) || "initial",
        "font-size": this.jax.fixed(metrics.em * this.rscale) + "px"
      };
    }
    measureXmlNode(xml) {
      const adaptor = this.adaptor;
      const content = this.html("mjx-xml-block", { style: { display: "inline-block" } }, [adaptor.clone(xml)]);
      const base = this.html("mjx-baseline", {
        style: { display: "inline-block", width: 0, height: 0 }
      });
      const style = this.getFontStyles();
      const node = this.html("mjx-measure-xml", { style }, [base, content]);
      const container = this.jax.container;
      adaptor.append(adaptor.parent(this.jax.math.start.node), container);
      adaptor.append(container, node);
      const metrics = this.metrics;
      const em2 = metrics.em * metrics.scale * this.rscale;
      const { left, right, bottom, top } = adaptor.nodeBBox(content);
      const w = (right - left) / em2;
      const h = (adaptor.nodeBBox(base).top - top) / em2;
      const d = (bottom - top) / em2 - h;
      adaptor.remove(container);
      adaptor.remove(node);
      return { w, h, d };
    }
    getStyles() {
    }
    getScale() {
    }
    getVariant() {
    }
  }
  CommonXmlNodeMixin2.autoStyle = false;
  CommonXmlNodeMixin2.styles = {
    "mjx-measure-xml": {
      position: "absolute",
      left: 0,
      top: 0,
      display: "inline-block",
      "line-height": "normal",
      "white-space": "normal"
    },
    "mjx-html": {
      display: "inline-block",
      "line-height": "normal",
      "text-align": "initial",
      "white-space": "initial"
    },
    "mjx-html-holder": {
      display: "block",
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      right: 0
    }
  };
  return CommonXmlNodeMixin2;
}
export{init_semantics2,CommonSemanticsMixin,CommonXmlNodeMixin,init_mtable3,init_mtr3,init_mtd3,init_maction3,init_menclose3,SvgMtable,SvgMtr,SvgMlabeledtr,SvgMtd,SvgMaction,SvgMenclose};
