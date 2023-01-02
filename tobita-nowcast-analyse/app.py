from collections import namedtuple
import json
from math import atan2, cos, sin
from os import environ
import matplotlib.pyplot as plt
from pathlib import Path
from matplotlib import font_manager
import matplotlib
from numpy import place
import tweepy
import boto3
import io

# matplotlibに日本語フォントを読み込む
font_manager.fontManager.addfont(Path(__file__).parent / "NotoSansJP-Regular.otf")
# フォントを設定する
matplotlib.rc('font', family="Noto Sans JP")

"""
地点情報のラッパ（設定用）
    @property key:
        場所の物理名
    @property color:
        表示色（Integer形式）
    @property display:
        表示文字列
"""
PLACE_SET = namedtuple("PLACE_SET", ["key", "color", "display"])

class Parser:
    """
    地点情報のラッパ（読み出し）
    """

    def __init__(self, key, color, display, value) -> None:
        """
        コンストラクタ
        @property key:
            場所の物理名
        @property color:
            表示色（Integer形式）
        @property display:
            表示文字列
        @property value:
            Lambda実行時の入力データ
        """
        self._key = key
        self._color = color
        self._display = display
        if value is not None:
            # 入力データを与えられたのであれば分析する
            self._pops = self._pops_process(key, value)

    def _pops_process(self, key, value):
        """
        降水量を分析、場所にあったものを取得する
        """
        try:
            return [float(v["place"][key]["basement"]) for v in value]
        except:
            return [0]
            
    @property
    def pops(self):
        """
        降水量を配列で取得する
        """
        return self._pops
    
    @property
    def max(self):
        """
        降水量の期間最大値を取得する
        """
        return max(self._pops)

    @property
    def color(self):
        """
        整数型の色情報をmatplotlib向けのタプルに変換する
        """
        r = self._color >> 16 & 0xff
        g = self._color >> 8 & 0xff
        b = self._color & 0xff
        return (float(r) / 255, float(g) / 255, float(b) / 255)
    
    @property
    def display(self):
        """
        表示文字列を取得する
        """
        return self._display

def figure_place_rain(parameter):
    """
    地点の雨情報をグラフ化する
    @property parameter:
        Lambdaが実行時に受け取った入力
    """
    # 地点情報を一覧で定義する
    keysets = [ 
        # PLACE_SET("sakai", 0xA1887F, "堺市"), 
        # PLACE_SET("kadoma", 0x4DD0E1, "門真市"), 
        # PLACE_SET("yao", 0x9575CD, "八尾市"), 
        # PLACE_SET("kanku", 0x81C784, "関西国際空港"), 
        PLACE_SET("umeda", 0xE57373, "梅田駅"), 
        PLACE_SET("tobita", 0xFFD54F, "飛田新地"),
    ]
    # 地点情報を読み出しようラッパに詰め直す
    places = [Parser(k.key, k.color, k.display, parameter) for k in keysets]
    # Y軸の範囲を定義する
    plt.ylim(0.0, 100.0)
    # Y軸のラベルを設定する
    plt.ylabel("5分ごとの降水確率")
    # 折れ線グラフを出力する
    for p in places:
        plt.plot(p.pops, color= p.color, label=p.display + "の降水確率")
    # 凡例を出力する
    plt.legend(loc='lower center', bbox_to_anchor=(.5, 1.0), ncol=3)

def figure_area_rain(parameter):
    """
    画面上の雨雲の占有率をグラフ化する
    @property parameter:
        Lambdaが実行時に受け取った入力
    """
    # Y軸のタイトルを表示する
    plt.ylabel("雨雲の画面占有率")
    # 雨雲の占有率を取得する
    densities = [float(p["density"]) for p in parameter]
    # 凡例を表示する
    plt.plot(densities, "c-", label="雨雲の画面占有率")

def figure_histgram(parameter):
    """
    ヒストグラム情報を積み上げ棒グラフで表示する
    @property parameter:
        Lambdaが実行時に受け取った入力
    """
    # Y軸のタイトルを設定する
    plt.ylabel("降水強度の占める割合")
    # 棒グラフの色情報を設定する
    hist_points = [
        PLACE_SET("0", 0xf5f5ff, "0~1"),
        PLACE_SET("1", 0xb8ddff, "1~5"),
        PLACE_SET("2", 0x58a9ff, "5~10"),
        PLACE_SET("3", 0x4070ff, "10~20"),
        PLACE_SET("4", 0xfff740, "20~30"),
        PLACE_SET("5", 0xffb240, "30~50"),
        PLACE_SET("6", 0xff5e40, "50~80"),
        PLACE_SET("7", 0xc7408e, "80~"),
    ]
    # ヒストグラムの格納先変数を設定する
    # 積み上げ棒グラフはベースを上げた棒グラフを重ねて表現するため、
    # 描画済み領域を覚えさせておくようにする
    histgram = {}
    bottom = [0,0,0,0,0,0,0,0,0,0,0,0]
    # ヒストグラムを入力データから取得する
    for p in parameter:
        for hist in hist_points:
            if not (hist.key in histgram):
                histgram[hist.key] = []
            histgram[hist.key].append(p["histgram"][hist.key])
    # 設定した順番でグラフを積み上げていく
    for idx in [0, 1, 2, 3, 4, 5, 6, 7]:
        p = hist_points[idx]
        # 色情報を扱うため、読み取りクラスに渡す
        ps = Parser(p.key, p.color, p.display, None)
        # 棒グラフを描画する
        plt.bar(x=range(12), height=histgram[p.key], bottom=bottom, label=ps.display, color=[ps.color for _ in range(12)])
        # 描画の済んだ領域は上げ底する
        for k, v in enumerate(histgram[p.key]):
            bottom[k] += v
    # 凡例を描画する
    plt.legend(loc='lower center', bbox_to_anchor=(.5, 1.0), ncol=4)

def execute_plot(parameter, filename, hour, api, plotting, xlabel=True):
    """
    グラフの描画処理を実行する
    @property parameter: dict
        Lambdaが入力として受け取ったパラメータ
    @property filename: str
        ファイルパス
    @property hour: str
        実行時に受け取る。Lambdaの実行時間
    @property api: Tweepy Client
        Twitterクライアント
    @property plotting: function
        プロット関数
    """
    plotting(parameter)
    if xlabel:
        # X軸を定義する
        plt.xticks(ticks=[1,3,5,7,9,11], labels=[hour + ":00", hour + ":10", hour + ":20", hour + ":30", hour + ":40", hour + ":50"])
        plt.xlabel("時間")
    # グラフをPNGとして保存する
    plt.savefig(filename)
    # 全てのフィギュアをクリアする
    plt.clf()
    if api is not None:
        # グラフ画像をTwitterにアップロードする
        return api.media_upload(filename=filename)
    else:
        return ""


def lambda_handler(event, context):
    """
    エントリポイント
    @property event: dict
        Invoker Lambdaで受け取ったパラメータ
    """
    print("START")
    print(event)
    try:
        # 変数を取得する
        variable =  event
        parameter = variable["data"]
        hour = variable["hour"]
        replyTo = variable["replyTo"]

        # Twitterクライアントを作成する
        auth = tweepy.OAuth1UserHandler(
        environ.get("ENV_TWITTER_APP_KEY"),
        environ.get("ENV_TWITTER_APP_SECRET"),
        environ.get("ENV_TWITTER_ACCESS_TOKEN"),
        environ.get("ENV_TWITTER_ACCESS_SECRET")
        )
        api = tweepy.API(auth)

        # グラフを作成、画像のアップロード先キーを取得する
        media_a = execute_plot(variable, "/tmp/place_rain.png", hour, api, figure_place_rain_circle, xlabel=False)
        media_b = execute_plot(parameter, "/tmp/area_rain.png", hour, api, figure_area_rain)
        media_c = execute_plot(parameter, "/tmp/area_histgram.png", hour, api, figure_histgram)

        # テキストデータを作成する
        # テキストに必要な情報（雲の占有割合、短期降水確率）を取得する
        densities = [float(p["density"]) for p in parameter]
        total_densities = sum(densities)
        tobita_max = 0.0
        tobita_clouds = []
        if total_densities == 0.0:
            # 降水がないのであれば、それを表示する
            tweet_text = "雨雲はありません。出典:気象庁（https://www.jma.go.jp/）のナウキャストデータを解析しています。"
            tobita_clouds = [
                0.0, 0.0, 0.0, 0.0, 0,0, 
                0.0, 0.0, 0.0, 0.0, 0.0,
                0.0, 0.0
            ]
        else:
            # 飛田新地上空の降水確率を取得、テキストとして出力する
            tobita_info = Parser("tobita", 0, "", parameter)
            tobita_max = tobita_info.max
            tobita_clouds = tobita_info.pops
            densities_max = max(densities)
            tweet_text = f"今後1時間で飛田に雨が降る確率は{tobita_max}%、雨雲は画面の{densities_max}%を占有しています。出典:気象庁（https://www.jma.go.jp/）のナウキャストデータを解析しています。"

        # ツイートする
        # ツイートはリプライとしてぶら下げる
        api.update_status(
            status=tweet_text, 
            in_reply_to_status_id=replyTo,
            media_ids=[
                media_a.media_id_string, 
                media_b.media_id_string, 
                media_c.media_id_string
            ]
        )

        # 分析データをアップロードする
        json_data = {
            "hour": hour,
            "tobita_max": tobita_max,
            "tobita_pops": tobita_clouds
        }

        # R2にデータを送信する
        r2_session = boto3.Session(
            region_name="auto",
            aws_access_key_id=environ.get("ENV_R2_ACCESS_KEY_ID", ""),
            aws_secret_access_key=environ.get("ENV_R2_SECRET_KEY", ""),
        )
        r2_client = r2_session.resource("s3", endpoint_url=environ.get("ENV_R2_ENDPOINT", ""))
        r2_bucket = r2_client.Bucket(environ.get("R2_BUCKET_NAME"))

        with io.BytesIO(json.dumps(json_data).encode("utf-8")) as fp:
            r2_bucket.upload_fileobj(fp, "analyse_weather.json")

        return {
            "statusCode": 200
        }
    except Exception as e:
        # 処理例外を受けた場合
        print(e)
        return {
            "statusCode": 500
        }


def figure_place_rain_circle(inputs):
    """
    地点の雨情報をグラフ化する
    @property parameter:
        Lambdaが実行時に受け取った入力
    """
    parameter = inputs["data"]
    hour = inputs["hour"]
    # 地点情報を一覧で定義する
    keysets = [ 
        PLACE_SET("tobita", 0xFFD54F, "飛田新地"),
        PLACE_SET("umeda", 0xE57373, "梅田駅"),
        # PLACE_SET("kanku", 0x81C784, "関西国際空港"),  
        PLACE_SET("sakai", 0xA1887F, "堺市"), 
        PLACE_SET("kadoma", 0x4DD0E1, "門真市"), 
        PLACE_SET("yao", 0x9575CD, "八尾市"), 
    ]
    # 地点情報を読み出しようラッパに詰め直す
    places = [Parser(k.key, k.color, k.display, parameter) for k in keysets]
    rain = Parser("k", 0x03A9F4, "雨", None)
    caution = Parser("k", 0xB3E5FC, "雨注意", None)
    sunny = Parser("k", 0xFFF8E1, "降雨なし", None)
    unknown = Parser("k", 0xccccc, "不明", None)
    # 複数のグラフを描画するため、figを作成する
    fig = plt.figure()
    # 地点ごとの円グラフを描画する
    for k, v in enumerate(places):
        # 地点向けの円グラフを作成
        ax = fig.add_subplot(2, 3, k + 1)
        info = {
            "value": [],
            "color": [],
            "label": []
        }
        DRAWING = [
            {
                "label": "00",
                "index": 1
            },
            {
                "label": "",
                "index": 2
            },
            {
                "label": "",
                "index": 3
            },
            {
                "label": "15",
                "index": 4
            },
            {
                "label": "",
                "index": 5
            },
            {
                "label": "",
                "index": 6
            },
            {
                "label": "30",
                "index": 7
            },
            {
                "label": "",
                "index": 8
            },
            {
                "label": "",
                "index": 9
            },
            {
                "label": "45",
                "index": 10
            },
            {
                "label": "",
                "index": 11
            },
            {
                "label": "",
                "index": 11
            }
        ]
        for di in DRAWING:
            p = -1
            if di["index"] < len(v.pops):
                p = v.pops[di["index"]]
            info["value"].append(1)
            info["label"].append(di["label"])
            if p >= 50.0:
                info["color"].append(rain.color)
            elif p >= 10.0:
                info["color"].append(caution.color)
            elif p == -1:
                info["color"].append(unknown.color)
            else:
                info["color"].append(sunny.color)
        _, text = ax.pie(
            info["value"], 
            colors=info["color"], 
            labels=info["label"], 
            startangle=-270, 
            counterclock=False,
            shadow=True,
            wedgeprops={"edgecolor":"k",'linewidth': 1, 'antialiased': True}
        )
        for place, t in enumerate(text):
            distance = 1.0
            x, y = t.get_position()
            angle = atan2(y, x)
            if place == 0 or place == 6:
                angle += (22.5 / 180) * 3.1415
                distance = 1.15
            else:
                angle += (15.0 / 180) * 3.1415
                distance = 1.0
            t.set_position((cos(angle) * distance, sin(angle) * distance - 0.03))
        ax.set_title(v.display)
    # タイトルを出力する
    fig.text(0.05, 0.95, f"{hour}時から1時間の大阪府各地の降水予定時刻", fontdict= {
        'family' : 'Noto Sans JP',
        'size'   : 'x-large'
    })
    # 凡例を出力する
    fig.text(0.05, 0.10, "青色", fontdict= {
        'family' : 'Noto Sans JP'
    }).set_color(rain.color)
    fig.text(0.05, 0.06, "薄青色", fontdict= {
        'family' : 'Noto Sans JP'
    }).set_color(caution.color)
    fig.text(0.05, 0.02, "橙色", fontdict= {
        'family' : 'Noto Sans JP'
    }).set_color(sunny.color)
    fig.text(0.15, 0.10, f"雨（上空に雨雲があります）")
    fig.text(0.15, 0.06, f"雨注意（上空に雨雲はありませんが、大阪府の3分の1を雨雲が覆っています）")
    fig.text(0.15, 0.02, f"降雨なし（上空に雨雲はありません）")
