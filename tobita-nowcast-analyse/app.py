from cProfile import label
from collections import namedtuple
from os import environ
import matplotlib.pyplot as plt
from pathlib import Path
import json
from matplotlib import font_manager
import matplotlib
import tweepy

font_manager.fontManager.addfont(Path(__file__).parent / "NotoSansJP-Regular.otf")
matplotlib.rc('font', family="Noto Sans JP")

INPUT_VARIABLE = '{"hour":"14","replyTo":"","data":[{"density":"93.59","histgram":{"0":476,"1":3619,"2":3,"3":172,"4":1,"5":0,"6":0,"7":25},"place":{"tobita":{"basement":"98.08","index":"1"},"umeda":{"basement":"98.08","index":"1"},"kadoma":{"basement":"98.08","index":"1"},"sakai":{"basement":"98.08","index":"3"},"yao":{"basement":"98.08","index":"1"},"kanku":{"basement":"28.08","index":"-1"}}},{"density":"93.57","histgram":{"0":481,"1":3607,"2":4,"3":169,"4":7,"5":2,"6":0,"7":25},"place":{"tobita":{"basement":"98.07","index":"3"},"umeda":{"basement":"98.07","index":"1"},"kadoma":{"basement":"98.07","index":"1"},"sakai":{"basement":"98.07","index":"3"},"yao":{"basement":"98.07","index":"1"},"kanku":{"basement":"28.07","index":"-1"}}},{"density":"93.44","histgram":{"0":475,"1":3633,"2":1,"3":151,"4":4,"5":1,"6":0,"7":24},"place":{"tobita":{"basement":"98.03","index":"3"},"umeda":{"basement":"98.03","index":"1"},"kadoma":{"basement":"98.03","index":"1"},"sakai":{"basement":"98.03","index":"3"},"yao":{"basement":"98.03","index":"1"},"kanku":{"basement":"28.03","index":"-1"}}},{"density":"93.49","histgram":{"0":488,"1":3628,"2":0,"3":149,"4":2,"5":0,"6":0,"7":24},"place":{"tobita":{"basement":"98.05","index":"3"},"umeda":{"basement":"98.05","index":"1"},"kadoma":{"basement":"98.05","index":"3"},"sakai":{"basement":"98.05","index":"3"},"yao":{"basement":"98.05","index":"1"},"kanku":{"basement":"28.05","index":"-1"}}},{"density":"93.51","histgram":{"0":491,"1":3631,"2":1,"3":143,"4":2,"5":0,"6":0,"7":24},"place":{"tobita":{"basement":"98.05","index":"1"},"umeda":{"basement":"98.05","index":"1"},"kadoma":{"basement":"98.05","index":"1"},"sakai":{"basement":"98.05","index":"1"},"yao":{"basement":"98.05","index":"1"},"kanku":{"basement":"28.05","index":"-1"}}},{"density":"93.49","histgram":{"0":481,"1":3642,"2":0,"3":143,"4":0,"5":0,"6":0,"7":25},"place":{"tobita":{"basement":"98.05","index":"1"},"umeda":{"basement":"98.05","index":"1"},"kadoma":{"basement":"98.05","index":"1"},"sakai":{"basement":"98.05","index":"1"},"yao":{"basement":"98.05","index":"1"},"kanku":{"basement":"28.05","index":"-1"}}},{"density":"93.44","histgram":{"0":487,"1":3660,"2":0,"3":118,"4":0,"5":0,"6":0,"7":24},"place":{"tobita":{"basement":"98.03","index":"1"},"umeda":{"basement":"98.03","index":"1"},"kadoma":{"basement":"98.03","index":"1"},"sakai":{"basement":"98.03","index":"3"},"yao":{"basement":"98.03","index":"1"},"kanku":{"basement":"28.03","index":"-1"}}},{"density":"93.49","histgram":{"0":491,"1":3641,"2":2,"3":133,"4":0,"5":0,"6":0,"7":24},"place":{"tobita":{"basement":"98.05","index":"1"},"umeda":{"basement":"98.05","index":"1"},"kadoma":{"basement":"98.05","index":"3"},"sakai":{"basement":"98.05","index":"1"},"yao":{"basement":"98.05","index":"1"},"kanku":{"basement":"28.05","index":"-1"}}},{"density":"93.44","histgram":{"0":483,"1":3601,"2":3,"3":178,"4":0,"5":0,"6":0,"7":24},"place":{"tobita":{"basement":"98.03","index":"1"},"umeda":{"basement":"98.03","index":"1"},"kadoma":{"basement":"98.03","index":"1"},"sakai":{"basement":"98.03","index":"1"},"yao":{"basement":"98.03","index":"1"},"kanku":{"basement":"28.03","index":"-1"}}},{"density":"93.46","histgram":{"0":491,"1":3541,"2":4,"3":229,"4":0,"5":0,"6":0,"7":25},"place":{"tobita":{"basement":"98.04","index":"1"},"umeda":{"basement":"98.04","index":"1"},"kadoma":{"basement":"98.04","index":"1"},"sakai":{"basement":"98.04","index":"1"},"yao":{"basement":"98.04","index":"3"},"kanku":{"basement":"28.04","index":"-1"}}},{"density":"93.46","histgram":{"0":496,"1":3516,"2":4,"3":250,"4":0,"5":0,"6":0,"7":24},"place":{"tobita":{"basement":"98.04","index":"1"},"umeda":{"basement":"98.04","index":"1"},"kadoma":{"basement":"98.04","index":"1"},"sakai":{"basement":"98.04","index":"1"},"yao":{"basement":"98.04","index":"3"},"kanku":{"basement":"28.04","index":"-1"}}},{"density":"93.46","histgram":{"0":502,"1":3484,"2":3,"3":277,"4":0,"5":0,"6":0,"7":24},"place":{"tobita":{"basement":"98.04","index":"1"},"umeda":{"basement":"98.04","index":"1"},"kadoma":{"basement":"98.04","index":"1"},"sakai":{"basement":"98.04","index":"1"},"yao":{"basement":"98.04","index":"3"},"kanku":{"basement":"28.04","index":"-1"}}}]}'

PLACE_SET = namedtuple("PLACE_SET", ["key", "color", "display"])

class Parser:

    def __init__(self, key, color, display, value) -> None:
        self._key = key
        self._color = color
        self._display = display
        if value is not None:
            self._pops = self._pops_process(key, value)

    def _pops_process(self, key, value):
        try:
            return [float(v["place"][key]["basement"]) for v in value]
        except:
            return [0]
            
    @property
    def pops(self):
        return self._pops
    
    @property
    def max(self):
        return max(self._pops)

    @property
    def color(self):
        r = self._color >> 16 & 0xff
        g = self._color >> 8 & 0xff
        b = self._color & 0xff
        return (float(r) / 255, float(g) / 255, float(b) / 255)
    
    @property
    def display(self):
        return self._display

def figure_place_rain(parameter):
    keysets = [ 
        # PLACE_SET("sakai", 0xA1887F, "堺市"), 
        # PLACE_SET("kadoma", 0x4DD0E1, "門真市"), 
        # PLACE_SET("yao", 0x9575CD, "八尾市"), 
        # PLACE_SET("kanku", 0x81C784, "関西国際空港"), 
        PLACE_SET("umeda", 0xE57373, "梅田駅"), 
        PLACE_SET("tobita", 0xFFD54F, "飛田新地"),
    ]
    places = [Parser(k.key, k.color, k.display, parameter) for k in keysets]
    plt.ylim(0.0, 100.0)
    plt.ylabel("5分ごとの降水確率")
    for p in places:
        plt.plot(p.pops, color= p.color, label=p.display + "の降水確率")
    plt.legend(loc='lower center', bbox_to_anchor=(.5, 1.0), ncol=3)

def figure_area_rain(parameter):
    plt.ylabel("雨雲の画面占有率")
    densities = [float(p["density"]) for p in parameter]
    plt.plot(densities, "c-", label="雨雲の画面占有率")

def figure_histgram(parameter):
    plt.ylabel("降水強度の占める割合")
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
    histgram = {}
    bottom = [0,0,0,0,0,0,0,0,0,0,0,0]
    for p in parameter:
        for hist in hist_points:
            if not (hist.key in histgram):
                histgram[hist.key] = []
            histgram[hist.key].append(p["histgram"][hist.key])
    for idx in [0, 1, 2, 3, 4, 5, 6, 7]:
        p = hist_points[idx]
        ps = Parser(p.key, p.color, p.display, None)
        plt.bar(x=range(12), height=histgram[p.key], bottom=bottom, label=ps.display, color=[ps.color for _ in range(12)])
        for k, v in enumerate(histgram[p.key]):
            bottom[k] += v
    plt.legend(loc='lower center', bbox_to_anchor=(.5, 1.0), ncol=4)

def execute_plot(parameter, filename, hour, api, plotting):
    plotting(parameter)
    plt.xticks(ticks=[1,3,5,7,9,11], labels=[hour + ":00", hour + ":10", hour + ":20", hour + ":30", hour + ":40", hour + ":50"])
    plt.xlabel("時間")
    plt.savefig(filename)
    # 全てのフィギュアをクリアする
    plt.clf()
    return api.media_upload(filename=filename)


def lambda_handler(event, context):
    print("START")
    print(event)
    variable =  json.loads(event)
    parameter = variable["data"]
    hour = variable["hour"]

    auth = tweepy.OAuth1UserHandler(
       environ.get("ENV_TWITTER_APP_KEY"),
       environ.get("ENV_TWITTER_APP_SECRET"),
       environ.get("ENV_TWITTER_ACCESS_TOKEN"),
       environ.get("ENV_TWITTER_ACCESS_SECRET")
    )
    api = tweepy.API(auth)

    media_a = execute_plot(parameter, "/tmp/place_rain.png", hour, api, figure_place_rain)
    media_b = execute_plot(parameter, "/tmp/area_rain.png", hour, figure_area_rain)
    media_c = execute_plot(parameter, "/tmp/area_histgram.png", hour, figure_histgram)

    
    total_densities = sum([float(p["density"]) for p in parameter])
    if total_densities == 0.0:
        tweet_text = "ナウキャストに雨雲はありません。"
    else:
        tobita_max = Parser("tobita", 0, "", parameter).max
        tweet_text = f"ナウキャストから推測される今後1時間の降水確率は{tobita_max}%です。"

    tweet = api.update_status(
        status=tweet_text, 
        media_ids=[
            media_a.media_id_string, 
            media_b.media_id_string, 
            media_c.media_id_string
        ]
    )
    print("TWEET: ", tweet)

    return {
        "statusCode": 200
    }
