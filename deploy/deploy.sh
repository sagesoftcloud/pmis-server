#!/bin/bash

# Any future command that fails will exit the script.
set -e

echo "Writing the public key of our aws instance"
eval $(ssh-agent -s)
echo "$DEV_PEM" | tr -d '\r' | ssh-add - > /dev/null


echo "Disable the host key checking."
chmod +x ./deploy/disableHostKeyChecking.sh
./deploy/disableHostKeyChecking.sh

if [[ $1 = "dev" ]]
then
  echo "Deploy at dev instance."
  DEPLOY_SERVERS=$DEPLOY_SERVER_PMS_DEV
else
  echo "No environment provided."
  exit -1
fi

ALL_SERVERS=(${DEPLOY_SERVERS//,/ })
echo "ALL_SERVERS ${ALL_SERVERS}"

# Lets iterate over this array and ssh into each EC2 instance.
# Once inside the server, run updateAndRestart.sh
for server in "${ALL_SERVERS[@]}"
do
  echo "deploying to ${server}"
  ssh ubuntu@${server} 'bash -s' < ./deploy/updateAndRestart.sh
done

