#!/bin/bash

# any future command that fails will exit the script
set -e

echo "Writing the public key of our aws instance"
eval $(ssh-agent -s)
echo "$PROD_PEM" | tr -d '\r' | ssh-add - > /dev/null


echo "Disable the host key checking."
chmod +x ./deploy/disableHostKeyChecking.sh
./deploy/disableHostKeyChecking.sh

DEPLOY_SERVER=$1
IMAGE=$2
TAG=$3
PASS=$4


IMAGE_VERSION="${IMAGE}:${TAG}"
echo "DEPLOY_SERVERS ${DEPLOY_SERVER}"
echo "deploying ${IMAGE_VERSION} to ${DEPLOY_SERVER}"
ssh ubuntu@${DEPLOY_SERVER} IMAGE=${IMAGE_VERSION} PASS=${PASS} 'bash -s' < ./deploy/changeImage.sh
