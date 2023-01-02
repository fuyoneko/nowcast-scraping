import { WeatherControll } from "./weather-service/weather-control.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "ap-northeast-1" });

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

let result;
export const lambdaHandler = async (event) => {
  try {
    console.log("START METHOD");
    const response = await WeatherControll.waitForForecast();
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: "current-forecast.json",
      Body: JSON.stringify(response),
    };
    console.log(params);

    const data = await s3Client.send(new PutObjectCommand(params));
    console.log(data);
    console.log("END METHOD");

    await putRecordsToR2(response);

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
