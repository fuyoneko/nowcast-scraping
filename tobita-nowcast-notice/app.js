const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const fetch = require("node-fetch");
const Chromium = require("chrome-aws-lambda");
const GIFEncoder = require("gifencoder");
const PNG = require("png-js");
const fs = require("fs");
const { TwitterApi } = require("twitter-api-v2");

const s3Client = new S3Client({ region: "ap-northeast-1" });

class NowcastControl {
  /**
   * サービスのフォントをWebフォントに変更する
   */
  async appendEvaluate() {
    const linkInfo = [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300&amp;display=swap",
      },
    ];
    for (const info of linkInfo) {
      var link = document.createElement("link");
      link.href = info.href;
      link.rel = info.rel;
      if (info.crossorigin !== undefined) {
        link.crossOrigin = info.crossorigin;
      }
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    var style = document.createElement("style");
    style.innerHTML = `
    *:not(.material-icons) {
      font-family: 'Noto Sans JP', sans-serif !important;
    }`;
    document.getElementsByTagName("head")[0].appendChild(style);

    document.querySelector(".leaflet-top.leaflet-left").style.display = "none";
    document.querySelector(".jmatile-map-legend").style.display = "none";
  }

  async decodeFile(filename) {
    return new Promise((resolve) => {
      PNG.decode(filename, (pixel) => resolve(pixel));
    });
  }

  async decodeBinary(binary) {
    return new Promise((resolve) => {
      binary.decode((pixel) => resolve(pixel));
    });
  }

  /**
   * 処理を実施する
   */
  async main(template) {
    console.log("START");
    console.log(template);

    const viewWidth = 1024;
    const viewHeight = 768;
    const clipWidth = 700;
    const clipYOffset = 214;
    const uploadMediaPath = "/tmp/exportdata.gif";

    const browser = await Chromium.puppeteer.launch({
      args: Chromium.args,
      defaultViewport: Chromium.defaultViewport,
      executablePath: await Chromium.executablePath,
      headless: Chromium.headless,
    });

    /** パペッティアを準備する */
    try {
      const overlayImage = await this.decodeFile("./overlay.png");

      const page = await browser.newPage();
      page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36"
      );
      await page.setViewport({
        width: viewWidth,
        height: viewHeight,
        deviceScaleFactor: 1,
      });
      console.log("SET VIEW PORT DONE");

      // record gif
      var encoder = new GIFEncoder(clipWidth, viewHeight - clipYOffset);
      encoder.createWriteStream().pipe(fs.createWriteStream(uploadMediaPath));

      // setting gif encoder
      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(500);
      encoder.setQuality(10); // default

      console.log("SETUP ENCODER DONE");

      const param = {
        zoom: process.env.ENV_JMA_ZOOM ?? "10",
        lat: process.env.ENV_JMA_LAT ?? "34.628688",
        lon: process.env.ENV_JMA_LON ?? "135.471725",
        colordepth: process.env.ENV_JMA_COLORDEPTH ?? "normal",
        elements: process.env.ENV_JMA_ELEMENTS ?? "hrpns",
      };
      const url = [
        "https://www.jma.go.jp/bosai/nowc",
        `#zoom:${param.zoom}`,
        `lat:${param.lat}`,
        `lon:${param.lon}`,
        `colordepth:${param.colordepth}`,
        `elements:${param.elements}`,
      ].join("/");
      console.log(`REQUEST -> ${url}`);
      await page.goto(url);

      // コンテンツの読み込みが完了したタイミングでWebフォントの読み込みを行う
      await page.waitForNavigation({ waitUntil: ["domcontentloaded"] });
      await page.evaluate(this.appendEvaluate);
      await page.waitForNavigation({ waitUntil: ["load", "networkidle2"] });

      // 読み込みが完了したら処理をする
      console.log("LOAD DONE");
      for (let i = 0; i < 12; i++) {
        const buffer = await page.screenshot({
          clip: {
            x: 0,
            y: clipYOffset,
            width: clipWidth,
            height: viewHeight - clipYOffset,
          },
        });
        console.log(`GET BUFFER ${i}`);
        // ---------------
        const png = await this.decodeBinary(new PNG(buffer));
        const clipHeight = viewWidth - clipYOffset;
        for (let x = 0; x < clipWidth; x++) {
          for (let y = 0; y < clipHeight; y++) {
            let idx = x * 4;
            idx += y * clipWidth * 4;
            if (overlayImage[idx + 3] > 10) {
              png[idx] = overlayImage[idx];
              png[idx + 1] = overlayImage[idx + 1];
              png[idx + 2] = overlayImage[idx + 2];
            }
          }
        }
        encoder.addFrame(png);
        // --------------
        await page.keyboard.down("Shift");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.up("Shift");
        await page.waitForTimeout(500);
      }
      encoder.finish();

      // Instantiate with desired auth type (here's Bearer v2 auth)
      const twitterClient = new TwitterApi({
        appKey: process.env.ENV_TWITTER_APP_KEY ?? "",
        appSecret: process.env.ENV_TWITTER_APP_SECRET ?? "",
        accessToken: process.env.ENV_TWITTER_ACCESS_TOKEN ?? "",
        accessSecret: process.env.ENV_TWITTER_ACCESS_SECRET ?? "",
      });

      // You can upload media easily!
      const mediaId = await twitterClient.v1.uploadMedia(uploadMediaPath);
      // Play with the built in methods
      await twitterClient.v1.tweet(template, { media_ids: [mediaId] });
      // Done
      console.log("DONE");
    } catch (err) {
      // エラーが起きた際の処理
      console.error(err);
    } finally {
      await browser.close();
    }
  }
}

exports.lambdaHandler = async function (event, context) {
  let bucketName = process.env.BUCKET_NAME;
  if (!bucketName) {
    bucketName = "prod-tobitamap-weather-info-resource";
  }
  const params = {
    Bucket: bucketName,
    Key: "current-forecast.json",
  };

  try {
    let template = "";
    const data = await s3Client.send(new GetObjectCommand(params));
    if (data.Body) {
      const response = new fetch.Response(data.Body);
      const json = await response.json();
      const t = json.current.temp;
      const p = json.current.pops;
      const pre = json.current.pressure;
      const h = json.current.humidity;
      const w = json.current.wind;
      const r = json.current.precipitation.hour;
      template = `大阪（飛田）の現在の天気は、${t}、${p}、${pre}、${h}、${w}、${r}。ナウキャストで見た今後1時間の雨雲の動きは次の通りです。`;
    } else {
      template = "今後1時間の雨雲の予想です。";
    }

    const control = new NowcastControl();
    await control.main(template);
  } catch (e) {
    console.error(e);
  }
};
