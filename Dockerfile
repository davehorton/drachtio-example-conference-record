FROM drachtio/nodejs

WORKDIR /app
COPY package.json /app/
COPY entrypoint.sh /
RUN npm install
ADD . /app

ENTRYPOINT ["/entrypoint.sh"]
