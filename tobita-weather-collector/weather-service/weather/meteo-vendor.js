import { WeatherVendor } from "./weather-vendor.js";
import { DateWrapper } from "./date-wrapper.js";

export class OpenMeteoVendor extends WeatherVendor {
  get url() {
    return "https://api.open-meteo.com/v1/forecast?latitude=34.644&longitude=135.5065&hourly=temperature_2m&timezone=Asia%2FTokyo";
  }
  parse(data, map) {
    for (let index in data.hourly.time) {
      const time = DateWrapper.fromTimeString(
        data.hourly.time[index]
      ).toString();
      const temp = data.hourly.temperature_2m[index];
      if (time in map) {
        map[time]["temps"] = {
          value: temp,
        };
      }
    }
  }
}
