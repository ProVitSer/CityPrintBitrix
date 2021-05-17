"use strict";
const net = require('net'),
    port = 3030,
    util = require('util'),
    moment = require('moment'),
    logger = require(`./logger/logger`),
    Bitrix = require('./src/bitrix'),
    searchInDB = require('./src/db3cx'),
    bitrixConfig = require(`./config/config`);

const bitrix = new Bitrix('192.168.10.184');
const LOCALCALLID = '1';

async function sendInfoToBitrix(localExtensionA, localExtensionB, startCall, billsec, isAnswered, recording) {
    try {
        const resultRegisterCall = await bitrix.externalCallRegister(bitrixConfig.bitrix.users[localExtensionA], localExtensionB, bitrixConfig.bitrix.outgoing, startCall);
        logger.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
        const resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, bitrixConfig.bitrix.users[localExtensionA], billsec, isAnswered, bitrixConfig.bitrix.outgoing, recording);
        logger.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);
    } catch (e) {
        logger.error(`Ошибка регистрации в Битрикс локального вызова  ${e}`);
    }

}

async function sendInfoByLocalCall(Id3CXCallCDR, startCall, duration, localExtensionA, localExtensionB) {
    try {
        const end3CXId = await searchInDB.searchEndIncomingId(Id3CXCallCDR);
        const incomingInfo = await searchInDB.searchIncomingInfoByLocalCall(end3CXId[0].info_id);
        const callInfo = await searchInDB.searchCallInfo(incomingInfo[0].call_id);
        const isAnswered = callInfo[0].is_answered ? '200' : '304'; //Проверка отвечен вызов или нет 
        sendInfoToBitrix(localExtensionA, localExtensionB, startCall, duration, isAnswered, incomingInfo[0].recording_url);
    } catch (e) {
        logger.error(`Ошибка поиска данных в БД по локальному вызову ${e}`);
    }

}

const server = net.createServer((connection) => {
    logger.info('Соединение');

    connection.on('data', (data) => {
        logger.info(`Получены CDR данные от АТС ${util.inspect(data.toString())}`);
        /* [ 'Call 52501',
            '2021/02/15 07:02:39',
            '00:00:15',
            '565',
            '101\r\n' ]*/

        const callCDR = data.toString().split(",");
        const localExtensionB = callCDR[4].match(/(\d*)\r\n/);
        if (callCDR[3].length == 3 && localExtensionB[1].length == 3) {
            const Id3CXcall = callCDR[0].match(/Call (\d*)/);
            const startCall = moment(new Date(callCDR[1])).add(3, 'hour').format('YYYY-MM-DD H:mm:ss');
            const duration = moment.duration(callCDR[2]).asSeconds();
            //52506 2021-02-15 10:27:33 0 565 104
            logger.info(Id3CXcall[1], startCall, duration, callCDR[3], localExtensionB[1])
            setTimeout(sendInfoByLocalCall, 18000, Id3CXcall[1], startCall, duration, callCDR[3], localExtensionB[1]);
        }
    });

    connection.on('close', () => {
        logger.info('client closed connection');
    });
}).listen(port);


server.on('error', (error) => {
    if (error.code == 'EADDRINUSE') {
        logger.warn('Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(port);
        }, 1000);
    } else {
        logger.error(error);
    }
});

server.on('listening', function() {
    logger.info(`Сервер слушается на порту ${port}`);
});