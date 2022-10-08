import os
from os import environ

def lambda_handler(event, context):
    print("START")
    print(environ.get("ENV_TWITTER_APP_KEY"))
    return {
        "statusCode": 200
    }
