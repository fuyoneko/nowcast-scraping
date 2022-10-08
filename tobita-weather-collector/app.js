import { WeatherControll } from "./weather-service/weather-control.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: "ap-northeast-1" });

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
