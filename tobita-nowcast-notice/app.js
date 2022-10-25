const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { LambdaClient, InvokeAsyncCommand } = require("@aws-sdk/client-lambda");
const fetch = require("node-fetch");
const Chromium = require("chrome-aws-lambda");
const GIFEncoder = require("gifencoder");
const fs = require("fs");
const { TwitterApi } = require("twitter-api-v2");
const { CreateCapture } = require("./create-capture.js");

const s3Client = new S3Client({ region: "ap-northeast-1" });
const lambdaClient = new LambdaClient({ region: "ap-northeast-1" });

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
    document.querySelector(".jmatile-map-legend-button").style.display = "none";
  }

  async keyBoardController(page, command, optionalKey = undefined) {
    // オプショナルキー（同時押しキーを押下する）
    if (optionalKey !== undefined) {
      await page.keyboard.down(optionalKey);
    }
    // キーを押下する
    await page.keyboard.press(command);
    // オプショナルキーを離す
    if (optionalKey !== undefined) {
      await page.keyboard.up(optionalKey);
    }
    // 動作完了まで待機する
    await page.waitForTimeout(500);
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
    const resultsData = [];
    const frameList = [];
    let replyToId = "";

    const browser = await Chromium.puppeteer.launch({
      args: Chromium.args,
      defaultViewport: Chromium.defaultViewport,
      executablePath: await Chromium.executablePath,
      headless: Chromium.headless,
    });

    /** パペッティアを準備する */
    try {
      const capture = new CreateCapture(
        viewWidth,
        viewHeight,
        0,
        clipYOffset,
        clipWidth,
        viewHeight - clipYOffset
      );
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
        // 1時間分のキャプチャを取得する
        const pngCaptureImage = await capture.createCurrentScreenshot(page);
        // フレーム一覧に登録する
        frameList.push(pngCaptureImage);
        // キャプチャの画像解析結果を取得する
        resultsData.push(capture.parseData(pngCaptureImage));
        // 画面遷移：次の5分を取得する
        await this.keyBoardController(page, "ArrowRight", "Shift");
      }
      // 画面遷移：次の5分を取得する
      await this.keyBoardController(page, "Enter", "Shift");

      // マウスを移動する
      page.mouse.move(200, 400);
      // 動作完了まで待機する
      await page.waitForTimeout(100);

      // 画面遷移：ズームアウトする
      for (let i = 0; i < 4; i++) {
        const hash = await page.evaluate(() => location.hash);
        await this.keyBoardController(page, "NumpadSubtract");
        await page.waitForFunction(`location.hash != "${hash}"`);
      }
      // 動作完了まで待機する
      await page.waitForTimeout(100);

      const thumbnail = new CreateCapture(
        viewWidth,
        viewHeight,
        240,
        400,
        200,
        180
      );
      // サムネイルを取得、画像の左上隅にかぶせる
      for (let i = 0; i < 12; i++) {
        // サムネイルを取得する
        const pngCaptureImage = await thumbnail.createCurrentScreenshot(page);
        // 画像をかぶせる
        capture.pilingImage(
          frameList[i],
          pngCaptureImage,
          4,
          thumbnail.clipWidth,
          thumbnail.clipHeight,
          capture.clipWidth
        );
        // 画面遷移：次の5分を取得する
        await this.keyBoardController(page, "ArrowRight", "Shift");
      }

      if (frameList && frameList.length >= 1) {
        console.log("ADD LEGEND START");
        // 凡例画像を取得する
        const overlayImage = await CreateCapture.decodeFile("./overlay.png");
        // record gif
        const encoder = new GIFEncoder(clipWidth, viewHeight - clipYOffset);
        const writeBuffer = fs.createWriteStream(uploadMediaPath);
        encoder.createWriteStream().pipe(writeBuffer);

        // 書き込み処理タイムアウト
        // 監視対象パスのファイルサイズが変わったのであれば次に進む
        // 1200ミリ秒が経過した場合も次に進む
        let fileSizeStatus = 0;
        const waitingForWrite = async (targetFilePath, requiredSize) => {
          for (let i = 0; i < 20; i++) {
            await page.waitForTimeout(60);
            const currentFileSize = fs.statSync(targetFilePath).size;
            if (currentFileSize != requiredSize) {
              // ファイルの更新を検知できたのであれば、待機処理を中断する
              return currentFileSize;
            }
          }
          return requiredSize;
        };
        // ファイルの読み込み可否の確認
        const tryToRead = (targetFilePath) => {
          try {
            fs.accessSync(targetFilePath, fs.constants.R_OK);
            return true;
          } catch {
            return false;
          }
        };
        // 読み込み可能待機処理
        // 読み込みできる状態になれば続行する
        const waitingForReadable = async (targetFilePath) => {
          for (let i = 0; i < 50; i++) {
            await page.waitForTimeout(100);
            if (tryToRead(targetFilePath)) {
              return;
            }
          }
        };

        // setting gif encoder
        encoder.start();
        encoder.setRepeat(0);
        encoder.setDelay(500);
        encoder.setQuality(10); // default

        for (const frame of frameList) {
          // 画像の上に凡例画像を重ねる
          capture.pilingImage(frame, overlayImage);
          // GIFのフレームに追加する
          encoder.addFrame(frame);
          // 書き込み処理の完了を待機する
          fileSizeStatus = await waitingForWrite(
            uploadMediaPath,
            fileSizeStatus
          );
        }
        encoder.finish();
        // 書き込み処理の完了を待機する
        fileSizeStatus = await waitingForWrite(uploadMediaPath, fileSizeStatus);
        // ファイルサイズを出力する
        console.log(`FILE SIZE -> ${fileSizeStatus}`);

        // 動作完了まで待機する
        await waitingForReadable(uploadMediaPath);
      }

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
      const result = await twitterClient.v1.tweet(template, {
        media_ids: [mediaId],
      });
      // Send
      console.log(result.id_str);
      replyToId = result.id_str;
      // Done
      console.log("DONE");
    } catch (err) {
      // エラーが起きた際の処理
      console.error(err);
    } finally {
      await browser.close();
    }

    return {
      replyTo: replyToId,
      data: resultsData,
    };
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
    const resultData = await control.main(template);

    const command = new InvokeAsyncCommand({
      FunctionName: process.env.ANALYSE_FUNCTION_NAME,
      InvokeArgs: JSON.stringify({
        hour: `${new Date().getHours()}`.padStart(2, "0"),
        replyTo: resultData.replyTo,
        data: resultData.data,
      }),
    });
    await lambdaClient.send(command);
  } catch (e) {
    console.error(e);
  }
};
