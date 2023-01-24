# tobita-weather-sam-application

# アプリの目的

対象地点の気象情報を取得して、5 分ごとの精度で天気を予測します

## データ源

- 気象庁の高解像度ナウキャスト
- 気象庁アメダス
- Open Meteo

## アプリが出力するデータ

- ナウキャストの元データを gif に変換して、1 時間周期で Twitter に投稿します
- アメダスの元データを JSON 形式で出力して、5 分周期で R2 に保存します
- 解析結果を JSON 形式で出力して、1 時間周期で R2 に保存します

## アプリに必要な依存関係について

本アプリは以下のサービスを利用しています

- AWS Lambda
- Cloudflare R2
- Twitter API

実行環境として、以下のツールを利用しています

- Node.js 14.x
- Python 3.8
- pupetter
- AWS CLI
- SAM

必要なアカウントを用意、環境を準備したうえで、デプロイしてください

# 設定ファイルについて

samconfig.toml の parameter_override に、以下の項目を設定します

```json
"ParameterKey=TwitterAppKey,ParameterValue=\"${TwitterのAPIキー}\"",
"ParameterKey=TwitterAppSecret,ParameterValue=\"${Twitterのシークレットキー}\"",
"ParameterKey=TwitterAccessToken,ParameterValue=\"${Twitterのアクセストークン}\"",
"ParameterKey=TwitterAccessSecret,ParameterValue=\"${Twitterのアクセスシークレット}\"",
"ParameterKey=JmaZoom,ParameterValue=\"10\"",
"ParameterKey=JmaLat,ParameterValue=\"34.628688\"",
"ParameterKey=JmaLon,ParameterValue=\"135.471725\"",
"ParameterKey=JmaColorDepth,ParameterValue=\"deep\"",
"ParameterKey=JmaElements,ParameterValue=\"hrpns\"",
"ParameterKey=R2BucketTargetName,ParameterValue=\"${R2のバケット名}\"",
"ParameterKey=R2Endpoint,ParameterValue=\"${R2のエンドポイント}\"",
"ParameterKey=R2AccessKeyId,ParameterValue=\"${R2のアクセスキーID}\"",
"ParameterKey=R2SecretKey,ParameterValue=\"${R2のシークレットキー}\""
```

# 任意のポイントの天気情報を作成するには

- JmaLat、JmaLon の緯度経度を、目的の地点に変更する
- `tobita-nowcast-notice/overlay.png`を変更する
- `tobita-nowcast-notice/create-capture.js`を変更、画像中の観測点（x, y）と地点名が大阪になっているため、目的の場所に変更する
- `tobita-nowcast-analyse/app.py`に地名があるため、任意の場所に変更する
- Twitter に投稿する文言を設定している部分を訂正する

上記の作業をすることで、任意の場所の気象情報を定期投稿できるようになります

AWS の無料枠で十分に収まるため、月のランニングコストはかかりません

## TODO

ハードコードが多いため、任意の場所に変更しやすくする

## 注意

AWS SAM は仕様上、古いデータを S3 にため込むようになっています。繰り返しデプロイをしているとストレージ料金が発生するため、バージョニング対象のデータを削除するようにライフサイクルルールを設定して、都度都度古いデータを削除しながら運用してください

# ライセンスについて

このソースコードのライセンスは MIT です  
※git に含まれているサードパーティ製のファイル（NotoSansJP-Regular.otf、chrome_aws_lambda.zip）のライセンスは配布元のライセンスに従います

ソースコードについては、商用、非商用を問わず、自由に改変して利用することができます。利用によって生じた問題について、その責任を負いません
