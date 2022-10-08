import { WeatherVendor } from "./weather-vendor.js";
import { DateWrapper } from "./date-wrapper.js";

export class WeatherVendorKishoChoForecast extends WeatherVendor {
  FORECAST_API_URL =
    "https://www.jma.go.jp/bosai/forecast/data/forecast/{weatherCode}.json";
  OSAKA_WEATHER_CODE = "270000";

  get url() {
    return this.FORECAST_API_URL.replace(
      "{weatherCode}",
      this.OSAKA_WEATHER_CODE
    );
  }

  /**
   * 気象庁の予測データを分析、処理する
   * @param {*} map
   * @param {*} area
   * @param {*} date
   * @param {*} index
   * @returns
   */
  parseForecastProcess(map, area, date, index, span) {
    // 出力対象日であれば出力する
    if (!(date in map)) {
      return;
    }
    const targets = [
      "weathers", // 天気（日本語）
      "pops", // 降水確率
      "weatherCodes", // 天気コード
      "wind", // 風
    ];
    for (const target of targets) {
      if (target in map[date] && "span" in map[date][target]) {
        if (map[date][target]["span"] < span) {
          continue;
        }
      }
      if (target in area) {
        map[date][target] = {
          span: span,
          value: area[target][index],
        };
      }
    }
  }

  /**
   * 気象庁の予測データを検証、分析する
   * @param {*} data
   * @param {*} map
   */
  parse(data, map) {
    const that = this;
    // 対象データを検索、解析する
    data.forEach((info) => {
      for (const series of info.timeSeries) {
        const timeSeries = DateWrapper.seriesIterator(series.timeDefines);
        for (const tuple of timeSeries) {
          for (const area of series.areas) {
            that.parseForecastProcess(
              map,
              area,
              tuple.date,
              tuple.index,
              tuple.span
            );
          }
        }
      }
    });
  }

  /**
   * WeatherCodeをおおまかな天気アイコン名に変換する
   * @param {天気コード} weatherCode
   */
  static weatherCodeToWeatherIcon(weatherCode) {
    const svgmap = [
      ["100", "100.svg"],
      ["101", "101.svg"],
      ["102", "102.svg"],
      ["103", "102.svg"],
      ["104", "104.svg"],
      ["105", "104.svg"],
      ["106", "102.svg"],
      ["107", "102.svg"],
      ["108", "102.svg"],
      ["110", "110.svg"],
      ["111", "110.svg"],
      ["112", "112.svg"],
      ["113", "112.svg"],
      ["114", "112.svg"],
      ["115", "115.svg"],
      ["116", "115.svg"],
      ["117", "115.svg"],
      ["118", "112.svg"],
      ["119", "112.svg"],
      ["120", "102.svg"],
      ["121", "102.svg"],
      ["122", "112.svg"],
      ["123", "100.svg"],
      ["124", "100.svg"],
      ["125", "112.svg"],
      ["126", "112.svg"],
      ["127", "112.svg"],
      ["128", "112.svg"],
      ["130", "100.svg"],
      ["131", "100.svg"],
      ["132", "101.svg"],
      ["140", "102.svg"],
      ["160", "104.svg"],
      ["170", "104.svg"],
      ["181", "115.svg"],
      ["200", "200.svg"],
      ["201", "201.svg"],
      ["202", "202.svg"],
      ["203", "202.svg"],
      ["204", "204.svg"],
      ["205", "204.svg"],
      ["206", "202.svg"],
      ["207", "202.svg"],
      ["208", "202.svg"],
      ["209", "200.svg"],
      ["210", "210.svg"],
      ["211", "210.svg"],
      ["212", "212.svg"],
      ["213", "212.svg"],
      ["214", "212.svg"],
      ["215", "215.svg"],
      ["216", "215.svg"],
      ["217", "215.svg"],
      ["218", "212.svg"],
      ["219", "212.svg"],
      ["220", "202.svg"],
      ["221", "202.svg"],
      ["222", "212.svg"],
      ["223", "201.svg"],
      ["224", "212.svg"],
      ["225", "212.svg"],
      ["226", "212.svg"],
      ["228", "215.svg"],
      ["229", "215.svg"],
      ["230", "215.svg"],
      ["231", "200.svg"],
      ["240", "202.svg"],
      ["250", "204.svg"],
      ["260", "204.svg"],
      ["270", "204.svg"],
      ["281", "215.svg"],
      ["300", "300.svg"],
      ["301", "301.svg"],
      ["302", "302.svg"],
      ["303", "303.svg"],
      ["304", "300.svg"],
      ["306", "300.svg"],
      ["308", "308.svg"],
      ["309", "303.svg"],
      ["311", "311.svg"],
      ["313", "313.svg"],
      ["314", "314.svg"],
      ["315", "314.svg"],
      ["316", "311.svg"],
      ["317", "313.svg"],
      ["320", "311.svg"],
      ["321", "313.svg"],
      ["322", "303.svg"],
      ["323", "311.svg"],
      ["324", "311.svg"],
      ["325", "311.svg"],
      ["326", "314.svg"],
      ["327", "314.svg"],
      ["328", "300.svg"],
      ["329", "300.svg"],
      ["340", "400.svg"],
      ["350", "300.svg"],
      ["361", "411.svg"],
      ["371", "413.svg"],
      ["400", "400.svg"],
      ["401", "401.svg"],
      ["402", "402.svg"],
      ["403", "403.svg"],
      ["405", "400.svg"],
      ["406", "406.svg"],
      ["407", "406.svg"],
      ["409", "403.svg"],
      ["411", "411.svg"],
      ["413", "413.svg"],
      ["414", "414.svg"],
      ["420", "411.svg"],
      ["421", "413.svg"],
      ["422", "414.svg"],
      ["423", "414.svg"],
      ["425", "400.svg"],
      ["426", "400.svg"],
      ["427", "400.svg"],
      ["450", "400.svg"],
    ];
    const tuple = svgmap.filter((item) => weatherCode == item[0]);
    if (tuple.length == 0) {
      return "";
    }
    return tuple[0][1];
  }
}
