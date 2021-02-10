"use strict";
const Bitrix = require('./src/bitrix'),
    searchInDB = require('./src/db3cx'),
    util = require('util'),
    nami = require(`./models/ami`),
    logger = require(`./logger/logger`),
    status = require(`./config/status`),
    user = require(`./config/user`);


const bitrix = new Bitrix();
const BITRIXADMIN = '11',
    INCOMINGID = '1',
    OUTGOINGID = '2';


async function getUserList() {
    try {
        let result = await bitrix.userGet();
        for (const item of result) {
            logger.info(`"${item.UF_PHONE_INNER}" : "${item.ID}",`)
        }
    } catch (e) {
        logger.error(e);
    }
}
//getUserList();

//{ "exten": "89104061420", "unicueid": "1612529458.4626" , "extensionNumber" : "666" , "billsec" : "0", "disposition" : "BUSY", "recording": "1612529458.4626-2021-02-05-15_50.wav", "start" : "2021-02-05 15:50:58", "end" : "2021-02-05 15:51:04" }
async function sendInfoByOutgoingCall({ exten, unicueid, extensionNumber, billsec, disposition, recording, start, end }) {
    try {
        let resultRegisterCall = await bitrix.externalCallRegister(user[extensionNumber], exten, OUTGOINGID, start);
        logger.info(`Получен результат регистрации исходящего вызова ${util.inspect(resultRegisterCall)}`);
        let resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, user[extensionNumber], billsec, status[disposition], OUTGOINGID, recording);
        logger.info(`Получен результат завершения исходящего вызова ${util.inspect(resultFinishCall)}`);
        return;
    } catch (e) {
        logger.error(`Ошибка по исходящему вызову ${e}`);
    }
};


//{ "unicueid": "1612529117.4620" , "incomingNumber" : "79104061420" , "billsec" : "0", "disposition" : "BUSY", "recording": "1612529117.4620-2021-02-05-15_45.wav", "start" : "2021-02-05 15:45:17", "end" : "2021-02-05 15:45:25" }
async function sendInfoByIncomingCall({ unicueid, incomingNumber, billsec, disposition, recording, start, end }) {
    try {
        let first3CXId = await searchInDB.searchFirstIncomingId(incomingNumber);
        let callId = await searchInDB.searchIncomingCallId(first3CXId);
        let end3CXId = await searchInDB.searchEndIncomingId(callId);
        let callInfo = await searchInDB.searchCallInfo(callId);
        let lastCallUser = await searchInDB.searchEndIncosearchLastUserRingmingId(end3CXId);
        let isAnswered = callInfo[0].is_answered ? '200' : '304';
        if (user[lastCallUser] != undefined) {
            let resultRegisterCall = await bitrix.externalCallRegister(user[lastCallUser], incomingNumber, INCOMINGID, start);
            logger.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
            let resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, user[lastCallUser], billsec, isAnswered, INCOMINGID, recording);
            logger.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);

            if (isAnswered == '304') {
                let resultCreateTask = await bitrix.createTask(user[lastCallUser], incomingNumber);
                logger.info(`Создана задача  ${util.inspect(resultCreateTask)}`);
                setTimeout(bitrix.taskStatus.bind(bitrix), 180000, resultCreateTask.task.id);
                return;
            } else {
                return;
            }
        } else {
            let resultRegisterCall = await bitrix.externalCallRegister(BITRIXADMIN, incomingNumber, INCOMINGID, start);
            logger.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
            let resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, BITRIXADMIN, billsec, isAnswered, INCOMINGID, recording);
            logger.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);
            if (isAnswered == '304') {
                let resultCreateTask = await bitrix.createTask(BITRIXADMIN, incomingNumber);
                logger.info(`Создана задача  ${util.inspect(resultCreateTask)}`);
                setTimeout(bitrix.taskStatus.bind(bitrix), 180000, resultCreateTask.task.id);

                return;
            } else {
                return;
            }
        }

    } catch (e) {
        logger.error(`Ошибка по исходящему вызову ${e}`);
    }
};
//sendInfoByIncomingCall('666', '79104061420', '2021-02-05 22:01:17', '0', '304', '1612529117.4620-2021-02-05-15_45.wav');



nami.on(`namiEventNewexten`, (event) => {
    if (event.context == 'outbound-hangup-handler' &&
        event.application == 'NoOp'
    ) {
        logger.info(`Завершился исходящие вызов на Asterisk ${event.appdata}`);
        let phoneEvent = JSON.parse(event.appdata);
        sendInfoByOutgoingCall(phoneEvent);
    }
});

nami.on(`namiEventNewexten`, (event) => {
    if (event.context == 'incoming-hangup-handler' &&
        event.application == 'NoOp'
    ) {
        logger.error(`Завершился входящий вызов на Asterisk ${event.appdata}`);
        let phoneEvent = JSON.parse(event.appdata);
        sendInfoByIncomingCall(phoneEvent);
    }
});