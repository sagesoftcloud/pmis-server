FROM node:14-bullseye as build-stage
RUN apt update && apt install tzdata -y
ENV TZ=Asia/Manila
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
WORKDIR /app
COPY package*.json ./
RUN rm -rf node_modules
RUN git config --global http.sslVerify false
RUN npm install
RUN git config --global http.sslVerify true
COPY ./ .
EXPOSE 3001
CMD [ "node", "start.js" ]