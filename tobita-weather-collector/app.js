import { WeatherControll } from "./weather-service/weather-control.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";

/** R2にデータを登録する */
async function putRecordsToR2(response) {
  const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.ENV_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.ENV_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.ENV_R2_SECRET_KEY,
    },
  });
  const params = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: "current-forecast.json",
    Body: JSON.stringify(response),
  };
  return await r2Client.send(new PutObjectCommand(params));
}

/** CloudWatchにデータを投入する */
async function putRecordToCloudWatchMetrics(dataList) {
  try {
    const client = new CloudWatchClient();
    return await client.send(
      new PutMetricDataCommand({
        MetricData: dataList.map((item) => {
          return {
            Timestamp: item.timestamp,
            MetricName: item.metric,
            Dimensions: [],
            Unit: "None",
            Value: item.value,
          };
        }),
        Namespace: "Weather/Osaka",
      })
    );
  } catch (err) {
    console.error(err);
  }
}

let result;
export const lambdaHandler = async (event) => {
  try {
    console.log("START METHOD");
    const response = await WeatherControll.waitForForecast();
    console.log(JSON.stringify(response));

    /** R2にデータを登録する */
    console.log(await putRecordsToR2(response));
    console.log("END METHOD");

    /** CloudWatchにデータを登録する */
    const timestamp = new Date(response.raw.date);
    await putRecordToCloudWatchMetrics([
      {
        timestamp: timestamp,
        metric: "temperature",
        value: response.raw.temp,
      },
      {
        timestamp: timestamp,
        metric: "pressure",
        value: response.raw.pressure,
      },
      {
        timestamp: timestamp,
        metric: "precipitation",
        value: response.raw.precipitation.hour,
      },
    ]);

    result = {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error(err);
    return err;
  }

  return result;
};
