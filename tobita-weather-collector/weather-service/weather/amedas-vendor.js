import { WeatherVendor } from "./weather-vendor.js";
import { DateWrapper } from "./date-wrapper.js";

const OSAKA_AMEDAS_PLACE_ID = "62078";
const AMEDAS_URL =
  "https://www.jma.go.jp/bosai/amedas/data/point/{stnid}/{yyyymmdd}_{h3}.json";

export class AmedasVendor extends WeatherVendor {
  _amedasDate = "";
  _amedasHour = "";
  _placeId = "";
  constructor(amedasDate, amedasHour) {
    super();
    this._amedasDate = amedasDate;
    this._amedasHour = amedasHour;
    this._placeId = OSAKA_AMEDAS_PLACE_ID;
  }
  get url() {
    let url = AMEDAS_URL;
    url = url.replace("{stnid}", this._placeId);
    url = url.replace("{yyyymmdd}", this._amedasDate);
    url = url.replace("{h3}", this._amedasHour);
    console.log(url);
    return url;
  }
  indexKeyToTimeFormat(indexKey) {
    // YYYYMMDDHHMMSS形式であることが前提になる
    //
    if (indexKey.length != 14) {
      return "-";
    }
    const year = indexKey.substring(0, 4);
    const month = indexKey.substring(4, 6);
    const day = indexKey.substring(6, 8);
    const hour = indexKey.substring(8, 10);
    const minutes = indexKey.substring(10, 12);
    const seconds = indexKey.substring(12, 14);
    return {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minutes: minutes,
      seconds: seconds,
      time: `${hour}:${minutes}`,
      iso: `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`,
    };
  }
  parse(data, map) {
    // 最新の計測値だけを取得する
    const latestIndex = Object.keys(data).sort((a, b) =>
      b.localeCompare(a, "en")
    )[0];
    const latestData = data[latestIndex];
    const timeFormatString = this.indexKeyToTimeFormat(latestIndex);
    for (const key of Object.keys(map)) {
      map[key]["amedas"] = {
        // ISO計測日時
        date: timeFormatString.iso,
        // 計測時間
        time: timeFormatString.time,
        // 気温
        temp: latestData.temp[0],
        // 気圧
        pressure: latestData.pressure[0],
        // 湿度
        humidity: latestData.humidity[0],
        // 降水量
        precipitation: {
          // 日間
          day: latestData.precipitation24h[0],
          // 1時間
          hour: latestData.precipitation1h[0],
        },
        // 風速
        wind: latestData.wind[0],
      };
    }
  }
}
