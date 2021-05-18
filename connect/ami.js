"use strict";
const config = require(`../config/asterisk.config`),
    namiLib = require(`nami`),
    logger = require(`../logger/logger`);

const namiConfig = {
    host: config.ami.host,
    port: config.ami.port,
    username: config.ami.username,
    secret: config.ami.secret
};

let nami = new namiLib.Nami(namiConfig);

nami.on(`namiConnectionClose`, function(data) {
    logger.error.error(`Переподключение к AMI ...`);
    setTimeout(function() {
        nami.open();
    }, 5000);
});

nami.on(`namiInvalidPeer`, function(data) {
    logger.error.error(`Invalid AMI Salute. Not an AMI?`);
    process.exit();
});
nami.on(`namiLoginIncorrect`, function() {
    logger.error.error(`Некорректный логин или пароль от AMI`);
    process.exit();
});
nami.on('namiConnected', function(event) {
    logger.access.info(`Подключение к AMI успешно установлено`);
})

nami.logLevel = 0;
nami.open();

module.exports = nami;