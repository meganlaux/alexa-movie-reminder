#!/bin/bash
rm -rf Archive.zip
zip -r Archive.zip index.js package.json node_modules
aws lambda update-function-code --function-name movieReminder --zip-file fileb://Archive.zip --profile megan
