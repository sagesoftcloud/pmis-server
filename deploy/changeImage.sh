#!/bin/bash

# any future command that fails will exit the script
set -e

sudo docker login repo.maroonstudios.com:5050 -u imagepull -p $PASS
sudo docker stop pms-server
sudo docker rm pms-server
sudo docker pull $IMAGE
sudo docker run --restart unless-stopped --env-file ./pms-env --network="host" -v /media/efs:/root --name pms-server -d $IMAGE


