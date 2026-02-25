#!/bin/bash

# any future command that fails will exit the script
set -e

echo "Writing the public key of our aws instance"
eval $(ssh-agent -s)
echo "$PMS_DEMO_PEM" | tr -d '\r' | ssh-add - > /dev/null


echo "Disable the host key checking."
chmod +x ./deploy/disableHostKeyChecking.sh
./deploy/disableHostKeyChecking.sh

DEPLOY_SERVER=$1
IMAGE=$2
TAG=$3
PASS=$4

if [ -z "$5" ]
    then
        echo "No argument supplied for DEMO flag. Deploying to production."
        IMAGE_VERSION="${IMAGE}:${TAG}"
else
    echo "Argument supplied for DEMO flag. Deploying to demo instance."
    IMAGE_VERSION="${IMAGE}:demo-${TAG}"
fi

echo "DEPLOY_SERVERS ${DEPLOY_SERVER}"
echo "deploying ${IMAGE_VERSION} to ${DEPLOY_SERVER}"
ssh ubuntu@${DEPLOY_SERVER} IMAGE=${IMAGE_VERSION} PASS=${PASS} 'bash -s' < ./deploy/changeImage.sh
