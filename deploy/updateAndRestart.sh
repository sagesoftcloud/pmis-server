#!/bin/bash

# Any future command that fails will exit the script.
set -e

cd ~/pms-server
sudo git stash
sudo git pull
sudo npm install
sudo pm2 restart pms-server --update-env