export class DateWrapper {
  _date = null;
  constructor(date) {
    this._date = date;
  }

  toObject() {
    const date = this._date;
    const fy = new String(date.getFullYear()).padStart(4, "0");
    const m = new String(date.getMonth() + 1).padStart(2, "0");
    const d = new String(date.getDate()).padStart(2, "0");
    const h = new String(date.getHours()).padStart(2, "0");
    const mm = new String(date.getMinutes()).padStart(2, "0");
    const s = new String(date.getSeconds()).padStart(2, "0");
    return {
      fy,
      m,
      d,
      h,
      mm,
      s,
    };
  }

  /**
   * YYYY-MM-DD'T'HH:MM:SSに変換する
   */
  toString() {
    const d = this.toObject();
    return `${d.fy}-${d.m}-${d.d}T${d.h}:${d.mm}:${d.s}`;
  }

  /**
   * HH:MM形式に変換する
   */
  toShortFormat() {
    const d = this.toObject();
    return `${d.h}:${d.mm}`;
  }

  /**
   * YYYYMMDD表記（アメダス表記）に変換する
   */
  toAmedasString() {
    const d = this.toObject();
    return `${d.fy}${d.m}${d.d}`;
  }

  /**
   * 時間を取得する
   */
  get hour() {
    return this._date.getHours();
  }

  static fromTimeString(date, timezone = "+09:00") {
    return new DateWrapper(new Date(date + timezone));
  }

  static now() {
    return new DateWrapper(new Date());
  }

  /**
   * 日時文字列の列を解析、列の公差を取得する
   * @param {*} series
   * @param {*} timezone
   * @returns
   */
  static seriesSpan(series, timezone = "") {
    if (series.length < 2) {
      return 0;
    }
    return Math.max(
      ...series.map((_, index, s) => {
        if (index == 0) {
          return 0;
        }
        const a = DateWrapper.fromTimeString(s[index - 1], timezone);
        const b = DateWrapper.fromTimeString(s[index], timezone);
        return Math.abs(a._date - b._date) / (60 * 60 * 1000);
      })
    );
  }

  /**
   * スパースな日時文字列の列を解析、1時間周期に変換する
   * @param {*} series
   * @param {*} timezone
   * @returns
   */
  static seriesIterator(series, timezone = "") {
    const normalized = series.map((item) => {
      return DateWrapper.fromTimeString(item, timezone).toString();
    });
    const itr = DateWrapper.fromTimeString(series[0], timezone);
    const span = DateWrapper.seriesSpan(normalized);
    let index = 0;
    let processed = 0;
    const seriesMap = [];
    seriesMap.push({ date: itr.toString(), index: 0, span: span });
    while (index < series.length && processed < 48) {
      itr.incrementHour();
      const dateString = itr.toString();
      if (normalized.includes(dateString)) {
        index++;
      }
      seriesMap.push({ date: dateString, index: index, span: span });
      processed++;
    }
    return seriesMap;
  }

  timeTruncate() {
    this._date.setHours(0);
    this._date.setMinutes(0);
    this._date.setSeconds(0);
    return this;
  }

  incrementHour() {
    this._date.setHours(this._date.getHours() + 1);
  }
}
