import { WeatherVendor } from "./weather-vendor.js";
import { DateWrapper } from "./date-wrapper.js";

export class AmedasDateVendor extends WeatherVendor {
  get url() {
    return "https://www.jma.go.jp/bosai/amedas/data/latest_time.txt";
  }
  parse(data, _) {
    const dateWrapper = DateWrapper.fromTimeString(data, "");
    const hour = dateWrapper.hour;
    const amedasHour = hour - (hour % 3);
    return {
      // Amedasの最終データ受信日時
      lastDataReserved: dateWrapper.toString(),
      // アメダス形式の日付
      amedas: dateWrapper.toAmedasString(),
      // アメダス形式のログローテート時間（3時間ごとにログローテートされるので、直近のものを取る）
      amedasHour: `${amedasHour}`.padStart(2, "0"),
    };
  }
}
