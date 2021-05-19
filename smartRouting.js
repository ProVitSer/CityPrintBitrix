"use strict";
const client = require('ari-client'),
    logger = require('./logger/logger'),
    config = require('./config/asterisk.config'),
    mongo = require('./connect/mongo'),
    util = require('util');

async function searchPhoneNumber(number) {
    number = number.trim();
    try {
        const client = await mongo.Phonebooks.findById(`${number}`);
        logger.access.info(`Со стороны базы вернулся результат ${util.inspect(client)}`);
        return client;
    } catch (e) {
        logger.error.error(`Ошибка поиска в Mongo ${e}`);
    }
}

async function continueDialplan(ari, channelId, dialplanContext, dialExtension) {
    try {
        logger.access.info(`Перенаправляем вызов в по нужному маршруту ${channelId}  ${dialplanContext}  ${dialExtension}`);
        await ari.channels.continueInDialplan({ channelId: channelId, context: dialplanContext, extension: dialExtension });
    } catch (e) {
        logger.error.error(`Ошибка отправки вызова через ari ${e}`);
    }
}

async function startApp() {
    try {
        const ari = await client.connect(config.ari.host, config.ari.username, config.ari.secret);
        ari.start('app');
        ari.on('StasisStart', (event) => {
            logger.access.info((`Вызов попал в Stasis ${util.inspect(event)}`));
            const resultSearchClient = await searchPhoneNumber('7' + event.channel.caller.number);
            if (resultSearchClient == null) {
                logger.access.info(`Привязка не найдена ${resultSearchClient} вызов пошел по маршруту ${config.context.default}`);
                await continueDialplan(ari, event.channel.id, config.context.default, '00018');
            } else if (resultSearchClient['extension'] == '') {
                logger.access.info(`Отсутствует добавочный номер ${resultSearchClient['extension']}  вызов пошел по маршруту ${config.context.default}`);
                await continueDialplan(ari, event.channel.id, config.context.default, '00018');
            } else {
                logger.access.info(`Была найден привязанный внутренний номер ${resultSearchClient['_id']}  ${resultSearchClient['company']}  ${resultSearchClient['fio']}  ${resultSearchClient['extension']}  вызов пошел по маршруту ${config.context.local}`);
                await continueDialplan(ari, event.channel.id, config.context.local, resultSearchClient['extension']);
            }
        })
    } catch (e) {
        logger.error.error(`На запрос внутреннего номера вернулась ошибка ${e}`);
        logger.error.error(`Ошибка, вызов идет по ${config.context.default}`);
    }
}
startApp()