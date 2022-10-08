import fetch from "node-fetch";
import { DateWrapper } from "./weather/date-wrapper.js";
import { WeatherVendorKishoChoForecast } from "./weather/kishocho-weather-vendor.js";
import { AmedasDateVendor } from "./weather/amedas-date-vendor.js";
import { AmedasVendor } from "./weather/amedas-vendor.js";
import { OpenMeteoVendor } from "./weather/meteo-vendor.js";

export class WeatherControll {
  _responseMap = {};
  _urlMap = {};
  constructor(amedasInfo) {
    // 変数の初期化
    this._responseMap = {};
    this._urlMap = {};

    // 返却する値の格納先を作成する
    const date = DateWrapper.now().timeTruncate();
    for (let i = 0; i < 48; i++) {
      this._responseMap[date.toString()] = {};
      date.incrementHour();
    }

    // 解析クラス
    const kishoChoForecast = new WeatherVendorKishoChoForecast();
    const openWeather = new OpenMeteoVendor();
    const amedas = new AmedasVendor(amedasInfo.amedas, amedasInfo.amedasHour);
    // リクエストデータの作成
    this._urlMap = {
      // 気象庁天気予報
      kishoCho: {
        url: kishoChoForecast.url,
        process: (data, map) => {
          // 気象庁天気予報のパース処理
          kishoChoForecast.parse(data, map);
        },
      },
      // アメダス気象実績値
      amedas: {
        url: amedas.url,
        process: (data, map) => {
          // アメダスのパース処理
          amedas.parse(data, map);
        },
      },
      openWeather: {
        url: openWeather.url,
        process: (data, map) => {
          // OpenMeteoのパース処理
          openWeather.parse(data, map);
        },
      },
    };
  }

  /**
   * 結果の取得
   */
  get response() {
    return this._responseMap;
  }

  /**
   * 予報の実施
   */
  forecast() {
    // 自身のオブジェクト
    const that = this;
    const urlMap = this._urlMap;
    const keyList = Object.keys(urlMap);
    return new Promise((resolve) => {
      // リクエスト
      Promise.all(keyList.map((key) => fetch(urlMap[key].url)))
        .then((responses) => {
          // ステータスコードがokでなければ例外を返す
          if (responses.some((r) => !r.ok)) {
            throw new Error("status code failed");
          }
          return responses;
        })
        .then((responses) => {
          // Jsonにパースする
          return Promise.all(responses.map((r) => r.json()));
        })
        .then((dataList) => {
          // 受け取ったデータをそれぞれ処理する
          keyList.forEach((key, index) => {
            urlMap[key].process(dataList[index], that._responseMap);
          });
          resolve(that._responseMap);
        })
        .catch((e) => {
          console.log("catch");
          console.log(e);
        });
    });
  }

  static async amedasDate() {
    const amedasDate = new AmedasDateVendor();
    const response = await fetch(amedasDate.url);
    if (!response.ok) {
      return "";
    }
    const text = await response.text();
    return amedasDate.parse(text, null);
  }

  /**
   * 受信データを表示データに変換する
   * @param {受信データ} response
   */
  parseToDisplayInfo(response, now) {
    const result = {
      summary: {},
      current: {},
      future: [],
    };
    const keys = Object.keys(response);
    const targetKeys = keys
      .sort((a, b) => a.localeCompare(b, "en"))
      .filter((key) => {
        const keyDate = DateWrapper.fromTimeString(key)._date;
        if (keyDate < now) {
          // 過去のデータは表示しない
          return false;
        }
        return true;
      });
    if (targetKeys.length >= 1) {
      const currentData = response[targetKeys[0]];
      result["summary"] = {
        code: WeatherVendorKishoChoForecast.weatherCodeToWeatherIcon(
          currentData.weatherCodes.value
        ),
        date: `${currentData.amedas.time}`,
        pops: `${currentData.pops.value}％`,
        temp: `${currentData.amedas.temp}℃`,
      };
      result["current"] = {
        code: WeatherVendorKishoChoForecast.weatherCodeToWeatherIcon(
          currentData.weatherCodes.value
        ),
        date: `${currentData.amedas.time}の天気`,
        weathers: currentData.weathers.value,
        pops: `降水確率 ${currentData.pops.value}％`,
        temp: `気温 ${currentData.amedas.temp}℃`,
        pressure: `気圧 ${currentData.amedas.pressure}hpa`,
        humidity: `湿度 ${currentData.amedas.humidity}％`,
        wind: `風速 ${currentData.amedas.wind}m/s`,
        precipitation: {
          day: `日間降水量 ${currentData.amedas.precipitation.day}mm`,
          hour: `時間降水量 ${currentData.amedas.precipitation.hour}mm`,
        },
      };
    }
    for (let i = 3; i <= 12; i += 3) {
      if (targetKeys.length >= i + 1) {
        const targetData = response[targetKeys[i]];
        result["future"].push({
          date: DateWrapper.fromTimeString(targetKeys[i], "").toShortFormat(),
          temp: `予想気温 ${targetData.temps.value}℃`,
          pops: `降水確率 ${targetData.pops.value}％`,
        });
      }
    }
    return result;
  }

  /**
   * 実行関数
   */
  static waitForForecast() {
    console.log("start");
    return new Promise(async (resolve) => {
      const amedasInfo = await WeatherControll.amedasDate();
      const control = new WeatherControll(amedasInfo);
      control.forecast().then((response) => {
        resolve(control.parseToDisplayInfo(response, new Date()));
      });
    });
  }
}
