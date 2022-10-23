const PNG = require("png-js");

const ENABLE_STATUS_UNKNOWN = 0;
const ENABLE_STATUS_NORMAL = 1;
const ENABLE_STATUS_RAIN = 2;

class CreateCapture {
  viewHeight = 0;
  viewWidth = 0;
  clipWidth = 0;
  clipYOffset = 0;
  targetPlace = [];
  colorChart = [];

  /**
   * PNGファイルをデコードする
   */
  static async decodeFile(filename) {
    return new Promise((resolve) => {
      PNG.decode(filename, (pixel) => resolve(pixel));
    });
  }

  constructor(
    viewWidth,
    viewHeight,
    clipXOffset,
    clipYOffset,
    clipWidth = -1,
    clipHeight = -1
  ) {
    this.viewHeight = viewHeight;
    this.viewWidth = viewWidth;
    this.clipXOffset = clipXOffset;
    this.clipYOffset = clipYOffset;
    if (clipHeight == -1) {
      this.clipHeight = this.viewHeight - this.clipYOffset;
    } else {
      this.clipHeight = clipHeight;
    }
    if (clipWidth == -1) {
      this.clipWidth = this.viewWidth - this.clipXOffset;
    } else {
      this.clipWidth = clipWidth;
    }

    this.colorChart = [
      0xf5f5ff, 0xb8ddff, 0x58a9ff, 0x4070ff, 0xfff740, 0xffb240, 0xff5e40,
      0xc7408e,
    ];
    this.targetPlace = [
      {
        key: "tobita",
        x: 375,
        y: 262,
      },
      {
        key: "umeda",
        x: 372,
        y: 212,
      },
      {
        key: "kadoma",
        x: 236,
        y: 177,
      },
      {
        key: "sakai",
        x: 360,
        y: 325,
      },
      {
        key: "yao",
        x: 447,
        y: 278,
      },
      {
        key: "kanku",
        x: 180,
        y: 447,
      },
    ];
  }

  /**
   * PNG形式のバイナリデータをデコードする
   */
  async decodeBinary(binary) {
    return new Promise((resolve) => {
      binary.decode((pixel) => resolve(pixel));
    });
  }

  /**
   * 現在のスクリーンショットを取得する
   */
  async createCurrentScreenshot(page) {
    const buffer = await page.screenshot({
      clip: {
        x: this.clipXOffset,
        y: this.clipYOffset,
        width: this.clipWidth,
        height: this.clipHeight,
      },
    });
    // ---------------
    const png = await this.decodeBinary(new PNG(buffer));
    return png;
  }

  /**
   * XYの座標位置をピクセル位置に変換する
   */
  positionToIndex(x, y, bytesPerPixel = 4) {
    // XYをインデックスに変換する
    let idx = x * bytesPerPixel;
    idx += this.clipWidth * bytesPerPixel * y;
    return idx;
  }

  /**
   * チャートデータ中の雨状態を取得する
   */
  findChartIndex(chart, r, g, b) {
    if (r <= 60 && g <= 60 && b <= 60) {
      return {
        enabled: ENABLE_STATUS_UNKNOWN,
        weight: 0,
        index: "-1",
      };
    }
    const cdelta = Math.max(r, g, b) - Math.min(r, g, b);
    let index = -1;
    if (cdelta >= 8) {
      let lenMin = Number.MAX_VALUE;
      for (const idx in chart) {
        const c = chart[idx];
        const cr = (c >>> 16) & 0xff;
        const cg = (c >>> 8) & 0xff;
        const cb = c & 0xff;
        const len =
          Math.pow(r - cr, 2) + Math.pow(b - cb, 2) + Math.pow(g - cg, 2);
        if (lenMin > len) {
          lenMin = len;
          index = idx;
        }
      }
    }
    return {
      enabled: index != -1 ? ENABLE_STATUS_RAIN : ENABLE_STATUS_NORMAL,
      weight: index != -1 ? 1 : 0,
      index: `${index}`,
    };
  }

  /**
   * 複数枚の画像を重ねて合成する
   */
  pilingImage(
    png,
    overlayImage,
    bytesPerPixel = 4,
    overlayImageWidth = -1,
    overlayImageHeight = -1,
    toImageWidth = -1
  ) {
    let sourceWidth = overlayImageWidth;
    let sourceHeight = overlayImageHeight;
    let distWidth = toImageWidth;
    if (sourceWidth == -1) {
      sourceWidth = this.clipWidth;
    }
    if (sourceHeight == -1) {
      sourceHeight = this.clipHeight;
    }
    if (toImageWidth == -1) {
      distWidth = sourceWidth;
    }

    for (let x = 0; x < sourceWidth; x++) {
      for (let y = 0; y < sourceHeight; y++) {
        let srcIdx = x * bytesPerPixel;
        srcIdx += y * sourceWidth * bytesPerPixel;
        let distIdx = x * bytesPerPixel;
        distIdx += y * distWidth * bytesPerPixel;
        if (overlayImage[srcIdx + 3] > 10) {
          png[distIdx] = overlayImage[srcIdx];
          png[distIdx + 1] = overlayImage[srcIdx + 1];
          png[distIdx + 2] = overlayImage[srcIdx + 2];
        }
      }
    }
  }

  /**
   * 画像データを解析後JSONデータに変換する
   */
  parseData(png, left = 10, right = 10, top = 90, bottom = 35, clipSize = 8) {
    const fill = {
      minX: left,
      minY: top,
      maxX: this.clipWidth - right,
      maxY: this.viewHeight - this.clipYOffset - bottom,
    };
    const clip = {
      w: clipSize,
      h: clipSize,
    };
    const colorList = [];
    const indexList = {};
    const placeStatusList = {};
    for (const idx in this.colorChart) {
      indexList[`${idx}`] = 0;
    }
    // 評価座標の色を取得する
    for (let x = fill.minX; x < fill.maxX; x += clip.w) {
      for (let y = fill.minY; y < fill.maxY; y += clip.h) {
        // XYをインデックスに変換する
        const idx = this.positionToIndex(x + clip.w / 2, y + clip.h / 2);
        // 評価点の色を取得する
        const colorIndex = this.findChartIndex(
          this.colorChart,
          png[idx],
          png[idx + 1],
          png[idx + 2]
        );
        if (colorIndex.enabled != ENABLE_STATUS_UNKNOWN) {
          colorList.push(colorIndex.weight);
          if (colorIndex.enabled == ENABLE_STATUS_RAIN) {
            if (colorIndex.index in indexList) {
              indexList[colorIndex.index] += 1;
            }
          }
        }
      }
    }
    let density = new Number(0);
    if (colorList.length >= 1) {
      density = new Number(
        colorList.reduce((p, c) => p + c) / colorList.length
      );
    }
    // 評価地点の色を取得する
    for (const placeInfo of this.targetPlace) {
      // XYをインデックスに変換する
      const idx = this.positionToIndex(placeInfo.x, placeInfo.y);
      // 評価点の色を取得する
      const colorIndex = this.findChartIndex(
        this.colorChart,
        png[idx],
        png[idx + 1],
        png[idx + 2]
      );
      placeStatusList[placeInfo.key] = {
        basement: new Number(70.0 * colorIndex.weight + 30.0 * density).toFixed(
          2
        ),
        index: colorIndex.index,
      };
    }

    // -----------------
    return {
      density: new Number(density * 100).toFixed(2),
      histgram: indexList,
      place: placeStatusList,
    };
  }
}

exports.CreateCapture = CreateCapture;
