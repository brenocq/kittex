import{__commonJS,__esm}from'./p11.js';export*from'./p11.js';
// node_modules/jpeg-js/lib/decoder.js
var require_decoder = __commonJS({
  "node_modules/jpeg-js/lib/decoder.js"(exports2, module) {
    var JpegImage = (function jpegImage() {
      "use strict";
      var dctZigZag = new Int32Array(JSON.parse(`[0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63]`));
      var dctCos1 = 4017;
      var dctSin1 = 799;
      var dctCos3 = 3406;
      var dctSin3 = 2276;
      var dctCos6 = 1567;
      var dctSin6 = 3784;
      var dctSqrt2 = 5793;
      var dctSqrt1d2 = 2896;
      function constructor() {
      }
      function buildHuffmanTable(codeLengths, values) {
        var k = 0, code = [], i2, j, length4 = 16;
        while (length4 > 0 && !codeLengths[length4 - 1])
          length4--;
        code.push({ children: [], index: 0 });
        var p = code[0], q;
        for (i2 = 0; i2 < length4; i2++) {
          for (j = 0; j < codeLengths[i2]; j++) {
            p = code.pop();
            p.children[p.index] = values[k];
            while (p.index > 0) {
              if (code.length === 0)
                throw new Error("Could not recreate Huffman Table");
              p = code.pop();
            }
            p.index++;
            code.push(p);
            while (code.length <= i2) {
              code.push(q = { children: [], index: 0 });
              p.children[p.index] = q.children;
              p = q;
            }
            k++;
          }
          if (i2 + 1 < length4) {
            code.push(q = { children: [], index: 0 });
            p.children[p.index] = q.children;
            p = q;
          }
        }
        return code[0].children;
      }
      function decodeScan(data, offset, frame2, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive, opts) {
        var precision = frame2.precision;
        var samplesPerLine = frame2.samplesPerLine;
        var scanLines = frame2.scanLines;
        var mcusPerLine = frame2.mcusPerLine;
        var progressive = frame2.progressive;
        var maxH = frame2.maxH, maxV = frame2.maxV;
        var startOffset = offset, bitsData = 0, bitsCount = 0;
        function readBit() {
          if (bitsCount > 0) {
            bitsCount--;
            return bitsData >> bitsCount & 1;
          }
          bitsData = data[offset++];
          if (bitsData == 255) {
            var nextByte = data[offset++];
            if (nextByte) {
              throw new Error("unexpected marker: " + (bitsData << 8 | nextByte).toString(16));
            }
          }
          bitsCount = 7;
          return bitsData >>> 7;
        }
        function decodeHuffman(tree) {
          var node = tree, bit;
          while ((bit = readBit()) !== null) {
            node = node[bit];
            if (typeof node === "number")
              return node;
            if (typeof node !== "object")
              throw new Error("invalid huffman sequence");
          }
          return null;
        }
        function receive(length4) {
          var n2 = 0;
          while (length4 > 0) {
            var bit = readBit();
            if (bit === null) return;
            n2 = n2 << 1 | bit;
            length4--;
          }
          return n2;
        }
        function receiveAndExtend(length4) {
          var n2 = receive(length4);
          if (n2 >= 1 << length4 - 1)
            return n2;
          return n2 + (-1 << length4) + 1;
        }
        function decodeBaseline(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t);
          zz[0] = component2.pred += diff;
          var k2 = 1;
          while (k2 < 64) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15)
                break;
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s);
            k2++;
          }
        }
        function decodeDCFirst(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
          zz[0] = component2.pred += diff;
        }
        function decodeDCSuccessive(component2, zz) {
          zz[0] |= readBit() << successive;
        }
        var eobrun = 0;
        function decodeACFirst(component2, zz) {
          if (eobrun > 0) {
            eobrun--;
            return;
          }
          var k2 = spectralStart, e = spectralEnd;
          while (k2 <= e) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15) {
                eobrun = receive(r) + (1 << r) - 1;
                break;
              }
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s) * (1 << successive);
            k2++;
          }
        }
        var successiveACState = 0, successiveACNextValue;
        function decodeACSuccessive(component2, zz) {
          var k2 = spectralStart, e = spectralEnd, r = 0;
          while (k2 <= e) {
            var z = dctZigZag[k2];
            var direction = zz[z] < 0 ? -1 : 1;
            switch (successiveACState) {
              case 0:
                var rs = decodeHuffman(component2.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                  if (r < 15) {
                    eobrun = receive(r) + (1 << r);
                    successiveACState = 4;
                  } else {
                    r = 16;
                    successiveACState = 1;
                  }
                } else {
                  if (s !== 1)
                    throw new Error("invalid ACn encoding");
                  successiveACNextValue = receiveAndExtend(s);
                  successiveACState = r ? 2 : 3;
                }
                continue;
              case 1:
              // skipping r zero items
              case 2:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  r--;
                  if (r === 0)
                    successiveACState = successiveACState == 2 ? 3 : 0;
                }
                break;
              case 3:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  zz[z] = successiveACNextValue << successive;
                  successiveACState = 0;
                }
                break;
              case 4:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                break;
            }
            k2++;
          }
          if (successiveACState === 4) {
            eobrun--;
            if (eobrun === 0)
              successiveACState = 0;
          }
        }
        function decodeMcu(component2, decode4, mcu2, row, col) {
          var mcuRow = mcu2 / mcusPerLine | 0;
          var mcuCol = mcu2 % mcusPerLine;
          var blockRow = mcuRow * component2.v + row;
          var blockCol = mcuCol * component2.h + col;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode4(component2, component2.blocks[blockRow][blockCol]);
        }
        function decodeBlock(component2, decode4, mcu2) {
          var blockRow = mcu2 / component2.blocksPerLine | 0;
          var blockCol = mcu2 % component2.blocksPerLine;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode4(component2, component2.blocks[blockRow][blockCol]);
        }
        var componentsLength = components.length;
        var component, i2, j, k, n;
        var decodeFn;
        if (progressive) {
          if (spectralStart === 0)
            decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
          else
            decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
        } else {
          decodeFn = decodeBaseline;
        }
        var mcu = 0, marker;
        var mcuExpected;
        if (componentsLength == 1) {
          mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
        } else {
          mcuExpected = mcusPerLine * frame2.mcusPerColumn;
        }
        if (!resetInterval) resetInterval = mcuExpected;
        var h, v;
        while (mcu < mcuExpected) {
          for (i2 = 0; i2 < componentsLength; i2++)
            components[i2].pred = 0;
          eobrun = 0;
          if (componentsLength == 1) {
            component = components[0];
            for (n = 0; n < resetInterval; n++) {
              decodeBlock(component, decodeFn, mcu);
              mcu++;
            }
          } else {
            for (n = 0; n < resetInterval; n++) {
              for (i2 = 0; i2 < componentsLength; i2++) {
                component = components[i2];
                h = component.h;
                v = component.v;
                for (j = 0; j < v; j++) {
                  for (k = 0; k < h; k++) {
                    decodeMcu(component, decodeFn, mcu, j, k);
                  }
                }
              }
              mcu++;
              if (mcu === mcuExpected) break;
            }
          }
          if (mcu === mcuExpected) {
            do {
              if (data[offset] === 255) {
                if (data[offset + 1] !== 0) {
                  break;
                }
              }
              offset += 1;
            } while (offset < data.length - 2);
          }
          bitsCount = 0;
          marker = data[offset] << 8 | data[offset + 1];
          if (marker < 65280) {
            throw new Error("marker was not found");
          }
          if (marker >= 65488 && marker <= 65495) {
            offset += 2;
          } else
            break;
        }
        return offset - startOffset;
      }
      function buildComponentData(frame2, component) {
        var lines2 = [];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;
        var R = new Int32Array(64), r = new Uint8Array(64);
        function quantizeAndInverse(zz, dataOut, dataIn) {
          var qt = component.quantizationTable;
          var v0, v1, v2, v3, v4, v5, v6, v7, t;
          var p = dataIn;
          var i3;
          for (i3 = 0; i3 < 64; i3++)
            p[i3] = zz[i3] * qt[i3];
          for (i3 = 0; i3 < 8; ++i3) {
            var row = 8 * i3;
            if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
              t = dctSqrt2 * p[0 + row] + 512 >> 10;
              p[0 + row] = t;
              p[1 + row] = t;
              p[2 + row] = t;
              p[3 + row] = t;
              p[4 + row] = t;
              p[5 + row] = t;
              p[6 + row] = t;
              p[7 + row] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
            v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
            v2 = p[2 + row];
            v3 = p[6 + row];
            v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
            v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
            v5 = p[3 + row] << 4;
            v6 = p[5 + row] << 4;
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 + row] = v0 + v7;
            p[7 + row] = v0 - v7;
            p[1 + row] = v1 + v6;
            p[6 + row] = v1 - v6;
            p[2 + row] = v2 + v5;
            p[5 + row] = v2 - v5;
            p[3 + row] = v3 + v4;
            p[4 + row] = v3 - v4;
          }
          for (i3 = 0; i3 < 8; ++i3) {
            var col = i3;
            if (p[1 * 8 + col] == 0 && p[2 * 8 + col] == 0 && p[3 * 8 + col] == 0 && p[4 * 8 + col] == 0 && p[5 * 8 + col] == 0 && p[6 * 8 + col] == 0 && p[7 * 8 + col] == 0) {
              t = dctSqrt2 * dataIn[i3 + 0] + 8192 >> 14;
              p[0 * 8 + col] = t;
              p[1 * 8 + col] = t;
              p[2 * 8 + col] = t;
              p[3 * 8 + col] = t;
              p[4 * 8 + col] = t;
              p[5 * 8 + col] = t;
              p[6 * 8 + col] = t;
              p[7 * 8 + col] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
            v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
            v2 = p[2 * 8 + col];
            v3 = p[6 * 8 + col];
            v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
            v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
            v5 = p[3 * 8 + col];
            v6 = p[5 * 8 + col];
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 * 8 + col] = v0 + v7;
            p[7 * 8 + col] = v0 - v7;
            p[1 * 8 + col] = v1 + v6;
            p[6 * 8 + col] = v1 - v6;
            p[2 * 8 + col] = v2 + v5;
            p[5 * 8 + col] = v2 - v5;
            p[3 * 8 + col] = v3 + v4;
            p[4 * 8 + col] = v3 - v4;
          }
          for (i3 = 0; i3 < 64; ++i3) {
            var sample2 = 128 + (p[i3] + 8 >> 4);
            dataOut[i3] = sample2 < 0 ? 0 : sample2 > 255 ? 255 : sample2;
          }
        }
        requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
        var i2, j;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
          var scanLine = blockRow << 3;
          for (i2 = 0; i2 < 8; i2++)
            lines2.push(new Uint8Array(samplesPerLine));
          for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
            quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
            var offset = 0, sample = blockCol << 3;
            for (j = 0; j < 8; j++) {
              var line = lines2[scanLine + j];
              for (i2 = 0; i2 < 8; i2++)
                line[sample + i2] = r[offset++];
            }
          }
        }
        return lines2;
      }
      function clampTo8bit(a) {
        return a < 0 ? 0 : a > 255 ? 255 : a;
      }
      constructor.prototype = {
        load: function load(path) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", path, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = (function() {
            var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
            this.parse(data);
            if (this.onload)
              this.onload();
          }).bind(this);
          xhr.send(null);
        },
        parse: function parse(data) {
          var maxResolutionInPixels = this.opts.maxResolutionInMP * 1e3 * 1e3;
          var offset = 0, length4 = data.length;
          function readUint16() {
            var value = data[offset] << 8 | data[offset + 1];
            offset += 2;
            return value;
          }
          function readDataBlock() {
            var length5 = readUint16();
            var array = data.subarray(offset, offset + length5 - 2);
            offset += array.length;
            return array;
          }
          function prepareComponents(frame3) {
            var maxH2 = 1, maxV2 = 1;
            var component2, componentId2;
            for (componentId2 in frame3.components) {
              if (frame3.components.hasOwnProperty(componentId2)) {
                component2 = frame3.components[componentId2];
                if (maxH2 < component2.h) maxH2 = component2.h;
                if (maxV2 < component2.v) maxV2 = component2.v;
              }
            }
            var mcusPerLine = Math.ceil(frame3.samplesPerLine / 8 / maxH2);
            var mcusPerColumn = Math.ceil(frame3.scanLines / 8 / maxV2);
            for (componentId2 in frame3.components) {
              if (frame3.components.hasOwnProperty(componentId2)) {
                component2 = frame3.components[componentId2];
                var blocksPerLine = Math.ceil(Math.ceil(frame3.samplesPerLine / 8) * component2.h / maxH2);
                var blocksPerColumn = Math.ceil(Math.ceil(frame3.scanLines / 8) * component2.v / maxV2);
                var blocksPerLineForMcu = mcusPerLine * component2.h;
                var blocksPerColumnForMcu = mcusPerColumn * component2.v;
                var blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
                var blocks = [];
                requestMemoryAllocation(blocksToAllocate * 256);
                for (var i3 = 0; i3 < blocksPerColumnForMcu; i3++) {
                  var row = [];
                  for (var j2 = 0; j2 < blocksPerLineForMcu; j2++)
                    row.push(new Int32Array(64));
                  blocks.push(row);
                }
                component2.blocksPerLine = blocksPerLine;
                component2.blocksPerColumn = blocksPerColumn;
                component2.blocks = blocks;
              }
            }
            frame3.maxH = maxH2;
            frame3.maxV = maxV2;
            frame3.mcusPerLine = mcusPerLine;
            frame3.mcusPerColumn = mcusPerColumn;
          }
          var jfif = null;
          var adobe = null;
          var pixels = null;
          var frame2, resetInterval;
          var quantizationTables = [], frames = [];
          var huffmanTablesAC = [], huffmanTablesDC = [];
          var fileMarker = readUint16();
          var malformedDataOffset = -1;
          this.comments = [];
          if (fileMarker != 65496) {
            throw new Error("SOI not found");
          }
          fileMarker = readUint16();
          while (fileMarker != 65497) {
            var i2, j, l;
            switch (fileMarker) {
              case 65280:
                break;
              case 65504:
              // APP0 (Application Specific)
              case 65505:
              // APP1
              case 65506:
              // APP2
              case 65507:
              // APP3
              case 65508:
              // APP4
              case 65509:
              // APP5
              case 65510:
              // APP6
              case 65511:
              // APP7
              case 65512:
              // APP8
              case 65513:
              // APP9
              case 65514:
              // APP10
              case 65515:
              // APP11
              case 65516:
              // APP12
              case 65517:
              // APP13
              case 65518:
              // APP14
              case 65519:
              // APP15
              case 65534:
                var appData = readDataBlock();
                if (fileMarker === 65534) {
                  var comment = String.fromCharCode.apply(null, appData);
                  this.comments.push(comment);
                }
                if (fileMarker === 65504) {
                  if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                    jfif = {
                      version: { major: appData[5], minor: appData[6] },
                      densityUnits: appData[7],
                      xDensity: appData[8] << 8 | appData[9],
                      yDensity: appData[10] << 8 | appData[11],
                      thumbWidth: appData[12],
                      thumbHeight: appData[13],
                      thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                    };
                  }
                }
                if (fileMarker === 65505) {
                  if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) {
                    this.exifBuffer = appData.subarray(5, appData.length);
                  }
                }
                if (fileMarker === 65518) {
                  if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                    adobe = {
                      version: appData[6],
                      flags0: appData[7] << 8 | appData[8],
                      flags1: appData[9] << 8 | appData[10],
                      transformCode: appData[11]
                    };
                  }
                }
                break;
              case 65499:
                var quantizationTablesLength = readUint16();
                var quantizationTablesEnd = quantizationTablesLength + offset - 2;
                while (offset < quantizationTablesEnd) {
                  var quantizationTableSpec = data[offset++];
                  requestMemoryAllocation(64 * 4);
                  var tableData = new Int32Array(64);
                  if (quantizationTableSpec >> 4 === 0) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = data[offset++];
                    }
                  } else if (quantizationTableSpec >> 4 === 1) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = readUint16();
                    }
                  } else
                    throw new Error("DQT: invalid table spec");
                  quantizationTables[quantizationTableSpec & 15] = tableData;
                }
                break;
              case 65472:
              // SOF0 (Start of Frame, Baseline DCT)
              case 65473:
              // SOF1 (Start of Frame, Extended DCT)
              case 65474:
                readUint16();
                frame2 = {};
                frame2.extended = fileMarker === 65473;
                frame2.progressive = fileMarker === 65474;
                frame2.precision = data[offset++];
                frame2.scanLines = readUint16();
                frame2.samplesPerLine = readUint16();
                frame2.components = {};
                frame2.componentsOrder = [];
                var pixelsInFrame = frame2.scanLines * frame2.samplesPerLine;
                if (pixelsInFrame > maxResolutionInPixels) {
                  var exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
                  throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
                }
                var componentsCount = data[offset++], componentId;
                var maxH = 0, maxV = 0;
                for (i2 = 0; i2 < componentsCount; i2++) {
                  componentId = data[offset];
                  var h = data[offset + 1] >> 4;
                  var v = data[offset + 1] & 15;
                  var qId = data[offset + 2];
                  if (h <= 0 || v <= 0) {
                    throw new Error("Invalid sampling factor, expected values above 0");
                  }
                  frame2.componentsOrder.push(componentId);
                  frame2.components[componentId] = {
                    h,
                    v,
                    quantizationIdx: qId
                  };
                  offset += 3;
                }
                prepareComponents(frame2);
                frames.push(frame2);
                break;
              case 65476:
                var huffmanLength = readUint16();
                for (i2 = 2; i2 < huffmanLength; ) {
                  var huffmanTableSpec = data[offset++];
                  var codeLengths = new Uint8Array(16);
                  var codeLengthSum = 0;
                  for (j = 0; j < 16; j++, offset++) {
                    codeLengthSum += codeLengths[j] = data[offset];
                  }
                  requestMemoryAllocation(16 + codeLengthSum);
                  var huffmanValues = new Uint8Array(codeLengthSum);
                  for (j = 0; j < codeLengthSum; j++, offset++)
                    huffmanValues[j] = data[offset];
                  i2 += 17 + codeLengthSum;
                  (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
                }
                break;
              case 65501:
                readUint16();
                resetInterval = readUint16();
                break;
              case 65500:
                readUint16();
                readUint16();
                break;
              case 65498:
                var scanLength = readUint16();
                var selectorsCount = data[offset++];
                var components = [], component;
                for (i2 = 0; i2 < selectorsCount; i2++) {
                  component = frame2.components[data[offset++]];
                  var tableSpec = data[offset++];
                  component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
                  component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
                  components.push(component);
                }
                var spectralStart = data[offset++];
                var spectralEnd = data[offset++];
                var successiveApproximation = data[offset++];
                var processed = decodeScan(
                  data,
                  offset,
                  frame2,
                  components,
                  resetInterval,
                  spectralStart,
                  spectralEnd,
                  successiveApproximation >> 4,
                  successiveApproximation & 15,
                  this.opts
                );
                offset += processed;
                break;
              case 65535:
                if (data[offset] !== 255) {
                  offset--;
                }
                break;
              default:
                if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
                  offset -= 3;
                  break;
                } else if (fileMarker === 224 || fileMarker == 225) {
                  if (malformedDataOffset !== -1) {
                    throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
                  }
                  malformedDataOffset = offset - 1;
                  const nextOffset = readUint16();
                  if (data[offset + nextOffset - 2] === 255) {
                    offset += nextOffset - 2;
                    break;
                  }
                }
                throw new Error("unknown JPEG marker " + fileMarker.toString(16));
            }
            fileMarker = readUint16();
          }
          if (frames.length != 1)
            throw new Error("only single frame JPEGs supported");
          for (var i2 = 0; i2 < frames.length; i2++) {
            var cp = frames[i2].components;
            for (var j in cp) {
              cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
              delete cp[j].quantizationIdx;
            }
          }
          this.width = frame2.samplesPerLine;
          this.height = frame2.scanLines;
          this.jfif = jfif;
          this.adobe = adobe;
          this.components = [];
          for (var i2 = 0; i2 < frame2.componentsOrder.length; i2++) {
            var component = frame2.components[frame2.componentsOrder[i2]];
            this.components.push({
              lines: buildComponentData(frame2, component),
              scaleX: component.h / frame2.maxH,
              scaleY: component.v / frame2.maxV
            });
          }
        },
        getData: function getData(width, height2) {
          var scaleX = this.width / width, scaleY = this.height / height2;
          var component1, component2, component3, component4;
          var component1Line, component2Line, component3Line, component4Line;
          var x2, y;
          var offset = 0;
          var Y, Cb, Cr, K, C, M, Ye, R, G, B;
          var colorTransform;
          var dataLength = width * height2 * this.components.length;
          requestMemoryAllocation(dataLength);
          var data = new Uint8Array(dataLength);
          switch (this.components.length) {
            case 1:
              component1 = this.components[0];
              for (y = 0; y < height2; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                for (x2 = 0; x2 < width; x2++) {
                  Y = component1Line[0 | x2 * component1.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 2:
              component1 = this.components[0];
              component2 = this.components[1];
              for (y = 0; y < height2; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                for (x2 = 0; x2 < width; x2++) {
                  Y = component1Line[0 | x2 * component1.scaleX * scaleX];
                  data[offset++] = Y;
                  Y = component2Line[0 | x2 * component2.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 3:
              colorTransform = true;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              for (y = 0; y < height2; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                for (x2 = 0; x2 < width; x2++) {
                  if (!colorTransform) {
                    R = component1Line[0 | x2 * component1.scaleX * scaleX];
                    G = component2Line[0 | x2 * component2.scaleX * scaleX];
                    B = component3Line[0 | x2 * component3.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x2 * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x2 * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x2 * component3.scaleX * scaleX];
                    R = clampTo8bit(Y + 1.402 * (Cr - 128));
                    G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    B = clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = R;
                  data[offset++] = G;
                  data[offset++] = B;
                }
              }
              break;
            case 4:
              if (!this.adobe)
                throw new Error("Unsupported color mode (4 components)");
              colorTransform = false;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              component4 = this.components[3];
              for (y = 0; y < height2; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                component4Line = component4.lines[0 | y * component4.scaleY * scaleY];
                for (x2 = 0; x2 < width; x2++) {
                  if (!colorTransform) {
                    C = component1Line[0 | x2 * component1.scaleX * scaleX];
                    M = component2Line[0 | x2 * component2.scaleX * scaleX];
                    Ye = component3Line[0 | x2 * component3.scaleX * scaleX];
                    K = component4Line[0 | x2 * component4.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x2 * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x2 * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x2 * component3.scaleX * scaleX];
                    K = component4Line[0 | x2 * component4.scaleX * scaleX];
                    C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                    M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = 255 - C;
                  data[offset++] = 255 - M;
                  data[offset++] = 255 - Ye;
                  data[offset++] = 255 - K;
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
          return data;
        },
        copyToImageData: function copyToImageData(imageData, formatAsRGBA) {
          var width = imageData.width, height2 = imageData.height;
          var imageDataArray = imageData.data;
          var data = this.getData(width, height2);
          var i2 = 0, j = 0, x2, y;
          var Y, K, C, M, R, G, B;
          switch (this.components.length) {
            case 1:
              for (y = 0; y < height2; y++) {
                for (x2 = 0; x2 < width; x2++) {
                  Y = data[i2++];
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 3:
              for (y = 0; y < height2; y++) {
                for (x2 = 0; x2 < width; x2++) {
                  R = data[i2++];
                  G = data[i2++];
                  B = data[i2++];
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 4:
              for (y = 0; y < height2; y++) {
                for (x2 = 0; x2 < width; x2++) {
                  C = data[i2++];
                  M = data[i2++];
                  Y = data[i2++];
                  K = data[i2++];
                  R = 255 - clampTo8bit(C * (1 - K / 255) + K);
                  G = 255 - clampTo8bit(M * (1 - K / 255) + K);
                  B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
        }
      };
      var totalBytesAllocated = 0;
      var maxMemoryUsageBytes = 0;
      function requestMemoryAllocation(increaseAmount = 0) {
        var totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
        if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
          var exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
          throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
        }
        totalBytesAllocated = totalMemoryImpactBytes;
      }
      constructor.resetMaxMemoryUsage = function(maxMemoryUsageBytes_) {
        totalBytesAllocated = 0;
        maxMemoryUsageBytes = maxMemoryUsageBytes_;
      };
      constructor.getBytesAllocated = function() {
        return totalBytesAllocated;
      };
      constructor.requestMemoryAllocation = requestMemoryAllocation;
      return constructor;
    })();
    if (typeof module !== "undefined") {
      module.exports = decode3;
    } else if (false) {
      (void 0)["jpeg-js"] = (void 0)["jpeg-js"] || {};
      (void 0)["jpeg-js"].decode = decode3;
    }
    function decode3(jpegData, userOpts = {}) {
      var defaultOpts = {
        // "undefined" means "Choose whether to transform colors based on the image’s color model."
        colorTransform: void 0,
        useTArray: false,
        formatAsRGBA: true,
        tolerantDecoding: true,
        maxResolutionInMP: 100,
        // Don't decode more than 100 megapixels
        maxMemoryUsageInMB: 512
        // Don't decode if memory footprint is more than 512MB
      };
      var opts = { ...defaultOpts, ...userOpts };
      var arr = new Uint8Array(jpegData);
      var decoder = new JpegImage();
      decoder.opts = opts;
      JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
      decoder.parse(arr);
      var channels = opts.formatAsRGBA ? 4 : 3;
      var bytesNeeded = decoder.width * decoder.height * channels;
      try {
        JpegImage.requestMemoryAllocation(bytesNeeded);
        var image = {
          width: decoder.width,
          height: decoder.height,
          exifBuffer: decoder.exifBuffer,
          data: opts.useTArray ? new Uint8Array(bytesNeeded) : Buffer.alloc(bytesNeeded)
        };
        if (decoder.comments.length > 0) {
          image["comments"] = decoder.comments;
        }
      } catch (err2) {
        if (err2 instanceof RangeError) {
          throw new Error("Could not allocate enough memory for the image. Required: " + bytesNeeded);
        }
        if (err2 instanceof ReferenceError) {
          if (err2.message === "Buffer is not defined") {
            throw new Error("Buffer is not globally defined in this environment. Consider setting useTArray to true");
          }
        }
        throw err2;
      }
      decoder.copyToImageData(image, opts.formatAsRGBA);
      return image;
    }
  }
});
// core/src/typeset/errors.ts
var TexError;
var GlyphError;
var init_errors = __esm({
  "core/src/typeset/errors.ts"() {
    "use strict";
    TexError = class extends Error {
      name = "TexError";
    };
    GlyphError = class extends TexError {
      name = "GlyphError";
    };
  }
});
// node_modules/@mathjax/src/mjs/core/DOMAdaptor.js
var AbstractDOMAdaptor;
var init_DOMAdaptor = __esm({
  "node_modules/@mathjax/src/mjs/core/DOMAdaptor.js"() {
    AbstractDOMAdaptor = class {
      constructor(document = null) {
        this.canMeasureNodes = true;
        this.document = document;
      }
      node(kind, def2 = {}, children = [], ns) {
        const node = this.create(kind, ns);
        this.setAttributes(node, def2);
        for (const child of children) {
          this.append(node, child);
        }
        return node;
      }
      setProperty(node, name, value) {
        node[name] = value;
      }
      getProperty(node, name) {
        return node[name];
      }
      setAttributes(node, def2) {
        if (def2.style && typeof def2.style !== "string") {
          for (const key of Object.keys(def2.style)) {
            this.setStyle(node, key.replace(/-([a-z])/g, (_m, c) => c.toUpperCase()), def2.style[key]);
          }
        }
        if (def2.properties) {
          for (const key of Object.keys(def2.properties)) {
            node[key] = def2.properties[key];
          }
        }
        for (const key of Object.keys(def2)) {
          if ((key !== "style" || typeof def2.style === "string") && key !== "properties") {
            this.setAttribute(node, key, def2[key]);
          }
        }
      }
      replace(nnode, onode) {
        this.insert(nnode, onode);
        this.remove(onode);
        return onode;
      }
      childNode(node, i2) {
        return this.childNodes(node)[i2];
      }
      allClasses(node) {
        const classes = this.getAttribute(node, "class");
        return !classes ? [] : classes.replace(/  +/g, " ").replace(/^ /, "").replace(/ $/, "").split(/ /);
      }
      cssText(node) {
        return this.kind(node) === "style" ? this.textContent(node) : "";
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/Options.js
function isObject(obj) {
  return typeof obj === "object" && obj !== null && (obj.constructor === OBJECT || obj.constructor === Expandable);
}
function expandable(def2) {
  return Object.assign(Object.create(Expandable.prototype), def2);
}
function makeArray(x2) {
  return Array.isArray(x2) ? x2 : [x2];
}
function keys(def2) {
  if (!def2) {
    return [];
  }
  return Object.keys(def2).concat(Object.getOwnPropertySymbols(def2));
}
function copy(def2) {
  const props = {};
  for (const key of keys(def2)) {
    const prop = Object.getOwnPropertyDescriptor(def2, key);
    const value = prop.value;
    if (Array.isArray(value)) {
      prop.value = insert([], value, false);
    } else if (isObject(value)) {
      prop.value = copy(value);
    }
    if (prop.enumerable) {
      props[key] = prop;
    }
  }
  return Object.defineProperties(def2.constructor === Expandable ? expandable({}) : {}, props);
}
function insert(dst, src, warn = true) {
  for (let key of keys(src)) {
    if (warn && dst[key] === void 0 && dst.constructor !== Expandable) {
      if (typeof key === "symbol") {
        key = key.toString();
      }
      OPTIONS.optionError(`Invalid option "${key}" (no default value).`, key);
      continue;
    }
    const sval = src[key];
    let dval = dst[key];
    if (isObject(sval) && dval !== null && (typeof dval === "object" || typeof dval === "function")) {
      const ids = keys(sval);
      if (Array.isArray(dval) && (ids.length === 1 && (ids[0] === APPEND || ids[0] === REMOVE) && Array.isArray(sval[ids[0]]) || ids.length === 2 && ids.sort().join(",") === APPEND + "," + REMOVE && Array.isArray(sval[APPEND]) && Array.isArray(sval[REMOVE]))) {
        if (sval[REMOVE]) {
          dval = dst[key] = dval.filter((x2) => sval[REMOVE].indexOf(x2) < 0);
        }
        if (sval[APPEND]) {
          dst[key] = [...dval, ...sval[APPEND]];
        }
      } else {
        insert(dval, sval, warn);
      }
    } else if (Array.isArray(sval)) {
      dst[key] = [];
      insert(dst[key], sval, false);
    } else if (isObject(sval)) {
      dst[key] = copy(sval);
    } else {
      dst[key] = sval;
    }
  }
  return dst;
}
function defaultOptions(options3, ...defs) {
  defs.forEach((def2) => insert(options3, def2, false));
  return options3;
}
function userOptions(options3, ...defs) {
  defs.forEach((def2) => insert(options3, def2, true));
  return options3;
}
function separateOptions(options3, ...objects) {
  const results = [];
  for (const object of objects) {
    const exists = {}, missing = {};
    for (const key of Object.keys(options3 || {})) {
      (object[key] === void 0 ? missing : exists)[key] = options3[key];
    }
    results.push(exists);
    options3 = missing;
  }
  results.unshift(options3);
  return results;
}
function lookup(name, lookup2, def2 = null) {
  return Object.hasOwn(lookup2, name) ? lookup2[name] : def2;
}
var OBJECT;
var APPEND;
var REMOVE;
var OPTIONS;
var Expandable;
var init_Options = __esm({
  "node_modules/@mathjax/src/mjs/util/Options.js"() {
    OBJECT = {}.constructor;
    APPEND = "[+]";
    REMOVE = "[-]";
    OPTIONS = {
      invalidOption: "warn",
      optionError: (message, _key) => {
        if (OPTIONS.invalidOption === "fatal") {
          throw new Error(message);
        }
        console.warn("MathJax: " + message);
      }
    };
    Expandable = class {
    };
  }
});
// node_modules/@mathjax/src/mjs/components/version.js
var VERSION;
var init_version = __esm({
  "node_modules/@mathjax/src/mjs/components/version.js"() {
    VERSION = "4.1.3";
  }
});
// node_modules/@mathjax/src/mjs/util/PrioritizedList.js
var PrioritizedList;
var init_PrioritizedList = __esm({
  "node_modules/@mathjax/src/mjs/util/PrioritizedList.js"() {
    PrioritizedList = class _PrioritizedList {
      constructor() {
        this.items = [];
        this.items = [];
      }
      [Symbol.iterator]() {
        let i2 = 0;
        const items = this.items;
        return {
          next() {
            return { value: items[i2++], done: i2 > items.length };
          }
        };
      }
      add(item, priority = _PrioritizedList.DEFAULTPRIORITY) {
        let i2 = this.items.length;
        do {
          i2--;
        } while (i2 >= 0 && priority < this.items[i2].priority);
        this.items.splice(i2 + 1, 0, { item, priority });
        return item;
      }
      remove(item) {
        let i2 = this.items.length;
        do {
          i2--;
        } while (i2 >= 0 && this.items[i2].item !== item);
        if (i2 >= 0) {
          this.items.splice(i2, 1);
        }
        return this;
      }
    };
    PrioritizedList.DEFAULTPRIORITY = 5;
  }
});
// node_modules/@mathjax/src/mjs/core/HandlerList.js
var HandlerList;
var init_HandlerList = __esm({
  "node_modules/@mathjax/src/mjs/core/HandlerList.js"() {
    init_PrioritizedList();
    HandlerList = class extends PrioritizedList {
      register(handler) {
        return this.add(handler, handler.priority);
      }
      unregister(handler) {
        this.remove(handler);
      }
      handlesDocument(document) {
        for (const item of this) {
          const handler = item.item;
          if (handler.handlesDocument(document)) {
            return handler;
          }
        }
        throw new Error(`Can't find handler for document`);
      }
      document(document, options3 = null) {
        return this.handlesDocument(document).create(document, options3);
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/Retries.js
function handleRetriesFor(code) {
  return new Promise(function run2(ok, fail2) {
    const handleRetry = (err2) => {
      var _a2;
      if (err2.retry instanceof Promise) {
        err2.retry.then(() => run2(ok, fail2)).catch((e) => fail2(e));
      } else if ((_a2 = err2.restart) === null || _a2 === void 0 ? void 0 : _a2.isCallback) {
        MathJax.Callback.After(() => run2(ok, fail2), err2.restart);
      } else {
        fail2(err2);
      }
    };
    try {
      const result = code();
      if (result instanceof Promise) {
        result.then((value) => ok(value)).catch((err2) => handleRetry(err2));
      } else {
        ok(result);
      }
    } catch (err2) {
      handleRetry(err2);
    }
  });
}
function retryAfter(promise) {
  const err2 = new Error("MathJax retry -- an asynchronous action is required; try using one of the promise-based functions and await its resolution.");
  err2.retry = promise;
  throw err2;
}
var init_Retries = __esm({
  "node_modules/@mathjax/src/mjs/util/Retries.js"() {
  }
});
// node_modules/@mathjax/src/mjs/util/context.js
var hasWindow;
var isCJS;
var context;
var init_context = __esm({
  "node_modules/@mathjax/src/mjs/util/context.js"() {
    hasWindow = false;
    isCJS = false;
    context = {
      window: hasWindow ? void 0 : null,
      document: hasWindow ? (void 0).document : null,
      os: (() => {
        if (hasWindow && (void 0).navigator) {
          const app = (void 0).navigator.appVersion;
          const osNames = [
            ["Win", "Windows"],
            ["Mac", "MacOS"],
            ["X11", "Unix"],
            ["Linux", "Unix"]
          ];
          for (const [key, os] of osNames) {
            if (app.includes(key)) {
              return os;
            }
          }
          if ((void 0).navigator.userAgent.includes("Android")) {
            return "Unix";
          }
        } else if (false) {
          return {
            linux: "Unix",
            android: "Unix",
            aix: "Unix",
            freebsd: "Unix",
            netbsd: "Unix",
            openbsd: "Unix",
            sunos: "Unix",
            darwin: "MacOS",
            win32: "Windows",
            cygwin: "Windows"
          }[(void 0).platform] || (void 0).platform;
        }
        return "unknown";
      })(),
      path: (file) => file
    };
    if (context.os === "Windows") {
      context.path = (file) => file.match(/^[/\\]?[a-zA-Z]:[/\\]/) ? (isCJS ? "" : "file://") + file.replace(/\\/g, "/").replace(/^\//, "") : file.replace(/^\//, "file:///");
    }
  }
});
// node_modules/@mathjax/src/mjs/mathjax.js
var mathjax;
var init_mathjax = __esm({
  "node_modules/@mathjax/src/mjs/mathjax.js"() {
    init_version();
    init_HandlerList();
    init_Retries();
    init_context();
    mathjax = {
      version: VERSION,
      context,
      handlers: new HandlerList(),
      document: function(document, options3) {
        return mathjax.handlers.document(document, options3);
      },
      handleRetriesFor,
      retryAfter,
      asyncLoad: null,
      asyncIsSynchronous: false
    };
  }
});
// node_modules/@mathjax/src/mjs/util/AsyncLoad.js
function asyncLoad(name) {
  if (!mathjax.asyncLoad) {
    return Promise.reject(`Can't load '${name}': No mathjax.asyncLoad method specified`);
  }
  return new Promise((ok, fail2) => {
    const result = mathjax.asyncLoad(name);
    if (result instanceof Promise) {
      result.then((value) => ok(value)).catch((err2) => fail2(err2));
    } else {
      ok(result);
    }
  });
}
var init_AsyncLoad = __esm({
  "node_modules/@mathjax/src/mjs/util/AsyncLoad.js"() {
    init_mathjax();
  }
});
// node_modules/@mathjax/src/mjs/adaptors/NodeMixin.js
function NodeMixin(Base2, options3 = {}) {
  var _a2;
  options3 = userOptions(defaultOptions({}, NodeMixinOptions), options3);
  return _a2 = class NodeAdaptor extends Base2 {
    constructor(...args) {
      super(args[0]);
      this.canMeasureNodes = false;
      const CLASS = this.constructor;
      this.options = userOptions(defaultOptions({}, CLASS.OPTIONS), args[1]);
    }
    fontSize(node) {
      return options3.badCSS ? this.options.fontSize : super.fontSize(node);
    }
    fontFamily(node) {
      return options3.badCSS ? this.options.fontFamily : super.fontFamily(node);
    }
    nodeSize(node, em2 = 1, local = null) {
      if (!options3.badSizes) {
        return super.nodeSize(node, em2, local);
      }
      const text = this.textContent(node);
      const non = Array.from(text.replace(_a2.cjkPattern, "")).length;
      const CJK = Array.from(text).length - non;
      return [
        CJK * this.options.cjkCharWidth + non * this.options.unknownCharWidth,
        this.options.unknownCharHeight
      ];
    }
    nodeBBox(node) {
      return options3.badSizes ? { left: 0, right: 0, top: 0, bottom: 0 } : super.nodeBBox(node);
    }
    createWorker(listener, options4) {
      return __awaiter(this, void 0, void 0, function* () {
        const { Worker: Worker2 } = yield asyncLoad("node:worker_threads");
        class LiteWorker {
          constructor(url2, options5 = {}) {
            this.worker = new Worker2(url2, options5);
          }
          addEventListener(kind, listener2) {
            this.worker.on(kind, listener2);
          }
          postMessage(msg) {
            this.worker.postMessage({ data: msg });
          }
          terminate() {
            this.worker.terminate();
          }
        }
        const { path, maps: maps3 } = options4;
        const url = `${path}/${options4.worker}`;
        const worker = new LiteWorker(url, {
          type: "module",
          workerData: { maps: maps3 }
        });
        worker.addEventListener("message", listener);
        return worker;
      });
    }
  }, _a2.OPTIONS = Object.assign(Object.assign({}, options3.badCSS ? {
    fontSize: 16,
    fontFamily: "Times"
  } : {}), options3.badSizes ? {
    cjkCharWidth: 1,
    unknownCharWidth: 0.6,
    unknownCharHeight: 0.8
  } : {}), _a2.cjkPattern = new RegExp([
    "[",
    "ᄀ-\u115F",
    "〈〉",
    "⺀-〾",
    "\u3040-㉇",
    "㉐-䶿",
    "一-꓆",
    "ꥠ-ꥼ",
    "가-힣",
    "豈-\uFAFF",
    "︐-︙",
    "︰-﹫",
    "！-｠￠-￦",
    "𛀀-𛀁",
    "🈀-🉑",
    "𠀀-\uD8BF\uDFFD",
    "]"
  ].join(""), "gu"), _a2;
}
var __awaiter;
var NodeMixinOptions;
var init_NodeMixin = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/NodeMixin.js"() {
    init_Options();
    init_AsyncLoad();
    __awaiter = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    NodeMixinOptions = {
      badCSS: true,
      badSizes: true
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/Element.js
var LiteElement;
var init_Element = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Element.js"() {
    LiteElement = class {
      constructor(kind, attributes = {}, children = []) {
        this.kind = kind;
        this.attributes = Object.assign({}, attributes);
        this.children = [...children];
        for (const child of this.children) {
          child.parent = this;
        }
        this.styles = null;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/Document.js
var LiteDocument;
var init_Document = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Document.js"() {
    init_Element();
    LiteDocument = class {
      get kind() {
        return "#document";
      }
      constructor(window2 = null) {
        this.defaultView = null;
        this.root = new LiteElement("html", {}, [
          this.head = new LiteElement("head"),
          this.body = new LiteElement("body")
        ]);
        this.type = "";
        this.defaultView = window2;
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/Text.js
var LiteText;
var LiteComment;
var init_Text = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Text.js"() {
    LiteText = class {
      get kind() {
        return "#text";
      }
      constructor(text = "") {
        this.value = text;
      }
    };
    LiteComment = class extends LiteText {
      get kind() {
        return "#comment";
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/List.js
var LiteList;
var init_List = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/List.js"() {
    LiteList = class {
      constructor(children) {
        this.nodes = [];
        this.nodes = [...children];
      }
      append(node) {
        this.nodes.push(node);
      }
      [Symbol.iterator]() {
        let i2 = 0;
        return {
          next() {
            return i2 === this.nodes.length ? { value: null, done: true } : { value: this.nodes[i2++], done: false };
          }
        };
      }
    };
  }
});
// node_modules/@mathjax/src/mjs/util/Entities.js
function translate(text) {
  return text.replace(/&([a-z][a-z0-9]*|#(?:[0-9]+|x[0-9a-f]+));/gi, replace);
}
function replace(match, entity) {
  if (entity.charAt(0) === "#") {
    return numeric(entity.slice(1));
  }
  if (entities[entity]) {
    return entities[entity];
  }
  if (options2["loadMissingEntities"]) {
    const file = entity.match(/^[a-zA-Z](fr|scr|opf)$/) ? RegExp.$1 : entity.charAt(0).toLowerCase();
    if (!loaded[file]) {
      loaded[file] = true;
      retryAfter(asyncLoad("./util/entities/" + file + ".js"));
    }
  }
  return match;
}
function numeric(entity) {
  const n = entity.charAt(0) === "x" ? parseInt(entity.slice(1), 16) : parseInt(entity);
  return String.fromCodePoint(n);
}
var options2;
var entities;
var loaded;
var init_Entities = __esm({
  "node_modules/@mathjax/src/mjs/util/Entities.js"() {
    init_Retries();
    init_AsyncLoad();
    options2 = {
      loadMissingEntities: true
    };
    entities = JSON.parse(`{
 "ApplyFunction":"\u2061","Backslash":"∖","Because":"∵","Breve":"˘","Cap":"⋒","CenterDot":"·","CircleDot":"⊙","CircleMinus":"⊖","CirclePlus":"⊕","CircleTimes":"⊗","Congruent":"≡","ContourIntegral":"∮",
 "Coproduct":"∐","Cross":"⨯","Cup":"⋓","CupCap":"≍","Dagger":"‡","Del":"∇","Delta":"Δ","Diamond":"⋄","DifferentialD":"ⅆ","DotEqual":"≐","DoubleDot":"¨","DoubleRightTee":"⊨","DoubleVerticalBar":"∥",
 "DownArrow":"↓","DownLeftVector":"↽","DownRightVector":"⇁","DownTee":"⊤","Downarrow":"⇓","Element":"∈","EqualTilde":"≂","Equilibrium":"⇌","Exists":"∃","ExponentialE":"ⅇ","FilledVerySmallSquare":"▪",
 "ForAll":"∀","Gamma":"Γ","Gg":"⋙","GreaterEqual":"≥","GreaterEqualLess":"⋛","GreaterFullEqual":"≧","GreaterLess":"≷","GreaterSlantEqual":"⩾","GreaterTilde":"≳","Hacek":"ˇ","Hat":"^","HumpDownHump":"≎",
 "HumpEqual":"≏","Im":"ℑ","ImaginaryI":"ⅈ","Integral":"∫","Intersection":"⋂","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","Lambda":"Λ","Larr":"↞","LeftAngleBracket":"⟨","LeftArrow":"←",
 "LeftArrowRightArrow":"⇆","LeftCeiling":"⌈","LeftDownVector":"⇃","LeftFloor":"⌊","LeftRightArrow":"↔","LeftTee":"⊣","LeftTriangle":"⊲","LeftTriangleEqual":"⊴","LeftUpVector":"↿","LeftVector":"↼",
 "Leftarrow":"⇐","Leftrightarrow":"⇔","LessEqualGreater":"⋚","LessFullEqual":"≦","LessGreater":"≶","LessSlantEqual":"⩽","LessTilde":"≲","Ll":"⋘","Lleftarrow":"⇚","LongLeftArrow":"⟵",
 "LongLeftRightArrow":"⟷","LongRightArrow":"⟶","Longleftarrow":"⟸","Longleftrightarrow":"⟺","Longrightarrow":"⟹","Lsh":"↰","MinusPlus":"∓","NestedGreaterGreater":"≫","NestedLessLess":"≪",
 "NotDoubleVerticalBar":"∦","NotElement":"∉","NotEqual":"≠","NotExists":"∄","NotGreater":"≯","NotGreaterEqual":"≱","NotLeftTriangle":"⋪","NotLeftTriangleEqual":"⋬","NotLess":"≮","NotLessEqual":"≰",
 "NotPrecedes":"⊀","NotPrecedesSlantEqual":"⋠","NotRightTriangle":"⋫","NotRightTriangleEqual":"⋭","NotSubsetEqual":"⊈","NotSucceeds":"⊁","NotSucceedsSlantEqual":"⋡","NotSupersetEqual":"⊉",
 "NotTilde":"≁","NotVerticalBar":"∤","Omega":"Ω","OverBar":"‾","OverBrace":"⏞","PartialD":"∂","Phi":"Φ","Pi":"Π","PlusMinus":"±","Precedes":"≺","PrecedesEqual":"⪯","PrecedesSlantEqual":"≼",
 "PrecedesTilde":"≾","Product":"∏","Proportional":"∝","Psi":"Ψ","Rarr":"↠","Re":"ℜ","ReverseEquilibrium":"⇋","RightAngleBracket":"⟩","RightArrow":"→","RightArrowLeftArrow":"⇄","RightCeiling":"⌉",
 "RightDownVector":"⇂","RightFloor":"⌋","RightTee":"⊢","RightTeeArrow":"↦","RightTriangle":"⊳","RightTriangleEqual":"⊵","RightUpVector":"↾","RightVector":"⇀","Rightarrow":"⇒","Rrightarrow":"⇛",
 "Rsh":"↱","Sigma":"Σ","SmallCircle":"∘","Sqrt":"√","Square":"□","SquareIntersection":"⊓","SquareSubset":"⊏","SquareSubsetEqual":"⊑","SquareSuperset":"⊐","SquareSupersetEqual":"⊒","SquareUnion":"⊔",
 "Star":"⋆","Subset":"⋐","SubsetEqual":"⊆","Succeeds":"≻","SucceedsEqual":"⪰","SucceedsSlantEqual":"≽","SucceedsTilde":"≿","SuchThat":"∋","Sum":"∑","Superset":"⊃","SupersetEqual":"⊇","Supset":"⋑",
 "Therefore":"∴","Theta":"Θ","Tilde":"∼","TildeEqual":"≃","TildeFullEqual":"≅","TildeTilde":"≈","UnderBar":"_","UnderBrace":"⏟","Union":"⋃","UnionPlus":"⊎","UpArrow":"↑","UpDownArrow":"↕","UpTee":"⊥",
 "Uparrow":"⇑","Updownarrow":"⇕","Upsilon":"Υ","Vdash":"⊩","Vee":"⋁","VerticalBar":"∣","VerticalTilde":"≀","Vvdash":"⊪","Wedge":"⋀","Xi":"Ξ","amp":"&","acute":"´","aleph":"ℵ","alpha":"α","amalg":"⨿",
 "and":"∧","ang":"∠","angmsd":"∡","angsph":"∢","ape":"≊","backprime":"‵","backsim":"∽","backsimeq":"⋍","beta":"β","beth":"ℶ","between":"≬","bigcirc":"◯","bigodot":"⨀","bigoplus":"⨁","bigotimes":"⨂",
 "bigsqcup":"⨆","bigstar":"★","bigtriangledown":"▽","bigtriangleup":"△","biguplus":"⨄","blacklozenge":"⧫","blacktriangle":"▴","blacktriangledown":"▾","blacktriangleleft":"◂","bowtie":"⋈","boxdl":"┐",
 "boxdr":"┌","boxminus":"⊟","boxplus":"⊞","boxtimes":"⊠","boxul":"┘","boxur":"└","bsol":"\\\\","bull":"•","cap":"∩","check":"✓","chi":"χ","circ":"ˆ","circeq":"≗","circlearrowleft":"↺",
 "circlearrowright":"↻","circledR":"®","circledS":"Ⓢ","circledast":"⊛","circledcirc":"⊚","circleddash":"⊝","clubs":"♣","colon":":","comp":"∁","ctdot":"⋯","cuepr":"⋞","cuesc":"⋟","cularr":"↶","cup":"∪",
 "curarr":"↷","curlyvee":"⋎","curlywedge":"⋏","dagger":"†","daleth":"ℸ","ddarr":"⇊","deg":"°","delta":"δ","digamma":"ϝ","div":"÷","divideontimes":"⋇","dot":"˙","doteqdot":"≑","dotplus":"∔",
 "dotsquare":"⊡","dtdot":"⋱","ecir":"≖","efDot":"≒","egs":"⪖","ell":"ℓ","els":"⪕","empty":"∅","epsi":"ε","epsiv":"ϵ","erDot":"≓","eta":"η","eth":"ð","flat":"♭","fork":"⋔","frown":"⌢","gEl":"⪌",
 "gamma":"γ","gap":"⪆","gimel":"ℷ","gnE":"≩","gnap":"⪊","gne":"⪈","gnsim":"⋧","gt":">","gtdot":"⋗","harrw":"↭","hbar":"ℏ","hellip":"…","hookleftarrow":"↩","hookrightarrow":"↪","imath":"ı","infin":"∞",
 "intcal":"⊺","iota":"ι","jmath":"ȷ","kappa":"κ","kappav":"ϰ","lEg":"⪋","lambda":"λ","lap":"⪅","larrlp":"↫","larrtl":"↢","lbrace":"{","lbrack":"[","le":"≤","leftleftarrows":"⇇","leftthreetimes":"⋋",
 "lessdot":"⋖","lmoust":"⎰","lnE":"≨","lnap":"⪉","lne":"⪇","lnsim":"⋦","longmapsto":"⟼","looparrowright":"↬","lowast":"∗","loz":"◊","lt":"<","ltimes":"⋉","ltri":"◃","macr":"¯","malt":"✠","mho":"℧",
 "mu":"μ","multimap":"⊸","nLeftarrow":"⇍","nLeftrightarrow":"⇎","nRightarrow":"⇏","nVDash":"⊯","nVdash":"⊮","natur":"♮","nearr":"↗","nharr":"↮","nlarr":"↚","not":"¬","nrarr":"↛","nu":"ν","nvDash":"⊭",
 "nvdash":"⊬","nwarr":"↖","omega":"ω","omicron":"ο","or":"∨","osol":"⊘","period":".","phi":"φ","phiv":"ϕ","pi":"π","piv":"ϖ","prap":"⪷","precnapprox":"⪹","precneqq":"⪵","precnsim":"⋨","prime":"′",
 "psi":"ψ","quot":"\\"","rarrtl":"↣","rbrace":"}","rbrack":"]","rho":"ρ","rhov":"ϱ","rightrightarrows":"⇉","rightthreetimes":"⋌","ring":"˚","rmoust":"⎱","rtimes":"⋊","rtri":"▹","scap":"⪸","scnE":"⪶",
 "scnap":"⪺","scnsim":"⋩","sdot":"⋅","searr":"↘","sect":"§","sharp":"♯","sigma":"σ","sigmav":"ς","simne":"≆","smile":"⌣","spades":"♠","sub":"⊂","subE":"⫅","subnE":"⫋","subne":"⊊","supE":"⫆","supnE":"⫌",
 "supne":"⊋","swarr":"↙","tau":"τ","theta":"θ","thetav":"ϑ","tilde":"˜","times":"×","triangle":"▵","triangleq":"≜","upsi":"υ","upuparrows":"⇈","veebar":"⊻","vellip":"⋮","weierp":"℘","xi":"ξ","yen":"¥",
 "zeta":"ζ","zigrarr":"⇝","nbsp":"\u00A0","rsquo":"’","lsquo":"‘"
}`);
    loaded = {};
  }
});
// node_modules/@mathjax/src/mjs/adaptors/lite/Parser.js
var SPACE2;
var OPTIONALSPACE;
var TAGNAME;
var ATTNAME;
var VALUE;
var VALUESPLIT;
var ATTRIBUTE;
var ATTRIBUTESPLIT;
var TAG;
var PATTERNS;
var LiteParser;
var init_Parser = __esm({
  "node_modules/@mathjax/src/mjs/adaptors/lite/Parser.js"() {
    init_Entities();
    init_Element();
    init_Text();
    SPACE2 = "[ \\n]+";
    OPTIONALSPACE = "[ \\n]*";
    TAGNAME = `[A-Za-z][^\0-\u001F "'>/=\u007F-\u009F]*`;
    ATTNAME = `[^\0-\u001F "'>/=\u007F-\u009F]+`;
    VALUE = `(?:'[^']*'|"[^"]*"|${SPACE2})`;
    VALUESPLIT = `(?:'([^']*)'|"([^"]*)"|(${SPACE2}))`;
    ATTRIBUTE = `${ATTNAME}(?:${OPTIONALSPACE}=${OPTIONALSPACE}${VALUE})?`;
    ATTRIBUTESPLIT = `(${ATTNAME})(?:${OPTIONALSPACE}=${OPTIONALSPACE}${VALUESPLIT})?`;
    TAG = `(<(?:${TAGNAME}(?:${SPACE2}${ATTRIBUTE})*${OPTIONALSPACE}/?|/${TAGNAME}|!--[^]*?--|![^]*?)(?:>|$))`;
    PATTERNS = {
      tag: new RegExp(TAG, "u"),
      attr: new RegExp(ATTRIBUTE, "u"),
      attrsplit: new RegExp(ATTRIBUTESPLIT, "u")
    };
    LiteParser = class {
      parseFromString(text, _format = "text/html", adaptor = null) {
        const root2 = adaptor.createDocument();
        let node = adaptor.body(root2);
        const parts = text.replace(/<\?.*?\?>/g, "").split(PATTERNS.tag);
        while (parts.length) {
          const text2 = parts.shift();
          const tag3 = parts.shift();
          if (text2) {
            this.addText(adaptor, node, text2);
          }
          if (tag3 && tag3.charAt(tag3.length - 1) === ">") {
            if (tag3.charAt(1) === "!") {
              this.addComment(adaptor, node, tag3);
            } else if (tag3.charAt(1) === "/") {
              node = this.closeTag(adaptor, node, tag3);
            } else {
              node = this.openTag(adaptor, node, tag3, parts);
            }
          }
        }
        this.checkDocument(adaptor, root2);
        return root2;
      }
      addText(adaptor, node, text) {
        text = translate(text);
        return adaptor.append(node, adaptor.text(text));
      }
      addComment(adaptor, node, comment) {
        return adaptor.append(node, new LiteComment(comment));
      }
      closeTag(adaptor, node, tag3) {
        const kind = tag3.slice(2, tag3.length - 1).toLowerCase();
        while (adaptor.parent(node) && adaptor.kind(node) !== kind) {
          node = adaptor.parent(node);
        }
        return adaptor.parent(node);
      }
      openTag(adaptor, node, tag3, parts) {
        const PCDATA = this.constructor.PCDATA;
        const SELF_CLOSING = this.constructor.SELF_CLOSING;
        const kind = tag3.match(/<(.*?)[\s\n>/]/)[1].toLowerCase();
        const child = adaptor.node(kind);
        const attributes = tag3.replace(/^<.*?[\s\n>]/, "").split(PATTERNS.attrsplit);
        if (attributes.pop().match(/>$/) || attributes.length < 5) {
          this.addAttributes(adaptor, child, attributes);
          adaptor.append(node, child);
          if (!SELF_CLOSING[kind] && !tag3.match(/\/>$/)) {
            if (PCDATA[kind]) {
              this.handlePCDATA(adaptor, child, kind, parts);
            } else {
              node = child;
            }
          }
        }
        return node;
      }
      addAttributes(adaptor, node, attributes) {
        while (attributes.length) {
          const [, name, v1, v2, v3] = attributes.splice(0, 5);
          const value = translate(v1 || v2 || v3 || "");
          adaptor.setAttribute(node, name, value);
        }
      }
      handlePCDATA(adaptor, node, kind, parts) {
        const pcdata = [];
        const etag = "</" + kind + ">";
        let ptag = "";
        while (parts.length && ptag !== etag) {
          pcdata.push(ptag);
          pcdata.push(parts.shift());
          ptag = parts.shift();
        }
        adaptor.append(node, adaptor.text(pcdata.join("")));
      }
      checkDocument(adaptor, root2) {
        const node = this.getOnlyChild(adaptor, adaptor.body(root2));
        if (!node)
          return;
        for (const child of adaptor.childNodes(adaptor.body(root2))) {
          if (child === node) {
            break;
          }
          if (child instanceof LiteComment && child.value.match(/^<!DOCTYPE/)) {
            root2.type = child.value;
          }
        }
        switch (adaptor.kind(node)) {
          case "html":
            for (const child of node.children) {
              switch (adaptor.kind(child)) {
                case "head":
                  root2.head = child;
                  break;
                case "body":
                  root2.body = child;
                  break;
              }
            }
            root2.root = node;
            adaptor.remove(node);
            if (adaptor.parent(root2.body) !== node) {
              adaptor.append(node, root2.body);
            }
            if (adaptor.parent(root2.head) !== node) {
              adaptor.insert(root2.head, root2.body);
            }
            break;
          case "head":
            root2.head = adaptor.replace(node, root2.head);
            break;
          case "body":
            root2.body = adaptor.replace(node, root2.body);
            break;
        }
      }
      getOnlyChild(adaptor, body) {
        let node = null;
        for (const child of adaptor.childNodes(body)) {
          if (child instanceof LiteElement) {
            if (node)
              return null;
            node = child;
          }
        }
        return node;
      }
      serialize(adaptor, node, xml = false) {
        const SELF_CLOSING = this.constructor.SELF_CLOSING;
        const tag3 = adaptor.kind(node);
        const attributes = this.allAttributes(adaptor, node, xml).map((x2) => x2.name + '="' + this.protectAttribute(x2.value, xml) + '"').join(" ");
        const content = this.serializeInner(adaptor, node, xml);
        const html2 = `<${tag3}` + (attributes ? " " + attributes : "") + ((!xml || content) && !SELF_CLOSING[tag3] ? `>${content}</${tag3}>` : xml ? "/>" : ">");
        return html2;
      }
      serializeInner(adaptor, node, xml = false) {
        const PCDATA = this.constructor.PCDATA;
        if (Object.hasOwn(PCDATA, node.kind)) {
          return adaptor.childNodes(node).map((x2) => adaptor.value(x2)).join("");
        }
        return adaptor.childNodes(node).map((x2) => {
          const kind = adaptor.kind(x2);
          return kind === "#text" ? this.protectHTML(adaptor.value(x2)) : kind === "#comment" ? x2.value : this.serialize(adaptor, x2, xml);
        }).join("");
      }
      allAttributes(adaptor, node, xml) {
        const attributes = adaptor.allAttributes(node);
        if (!xml) {
          return attributes;
        }
        const kind = adaptor.kind(node);
        const xmlns = this.constructor.XMLNS;
        if (!Object.hasOwn(xmlns, kind)) {
          return attributes;
        }
        for (const { name } of attributes) {
          if (name === "xmlns") {
            return attributes;
          }
        }
        attributes.push({ name: "xmlns", value: xmlns[kind] });
        return attributes;
      }
      protectAttribute(text, xml) {
        if (typeof text !== "string") {
          text = String(text);
        }
        text = text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        if (xml) {
          text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        return text;
      }
      protectHTML(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
    };
    LiteParser.SELF_CLOSING = {
      area: true,
      base: true,
      br: true,
      col: true,
      command: true,
      embed: true,
      hr: true,
      img: true,
      input: true,
      keygen: true,
      link: true,
      menuitem: true,
      meta: true,
      param: true,
      source: true,
      track: true,
      wbr: true
    };
    LiteParser.PCDATA = {
      option: true,
      textarea: true,
      fieldset: true,
      title: true,
      style: true,
      script: true
    };
    LiteParser.XMLNS = {
      svg: "http://www.w3.org/2000/svg",
      math: "http://www.w3.org/1998/Math/MathML",
      html: "http://www.w3.org/1999/xhtml"
    };
  }
});
export{init_Element,init_Document,init_List,init_Parser,LiteParser,LiteList,LiteElement,LiteDocument,init_DOMAdaptor,init_NodeMixin,init_Text,AbstractDOMAdaptor,LiteText,LiteComment,NodeMixin,init_Options,lookup,init_PrioritizedList,PrioritizedList,userOptions,defaultOptions,init_Retries,handleRetriesFor,expandable,makeArray,separateOptions,mathjax,init_mathjax,init_Entities,entities,init_context,context,init_AsyncLoad,asyncLoad,retryAfter,numeric,TexError,GlyphError,init_errors,require_decoder};
