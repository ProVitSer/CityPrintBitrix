"use strict";
const Bitrix = require('./src/bitrix'),
    searchInDB = require('./src/db3cx'),
    util = require('util'),
    nami = require(`./connect/ami`),
    logger = require(`./logger/logger`),
    bitrixConfig = require(`./config/bitrix.config`);


const bitrix = new Bitrix();

//Создание задачи в Bitrix по пропущенному вызову
async function createTaskOnMissedCall(bitrixUserId, incomingNumber, isAnswered) {
    try {
        if (isAnswered == '304') {
            const resultCreateTask = await bitrix.createTask(bitrixUserId, incomingNumber);
            logger.access.info(`Создана задача  ${util.inspect(resultCreateTask)}`);
            setTimeout(bitrix.taskStatus.bind(bitrix), 180000, resultCreateTask.task.id);
            return;
        } else {
            return;
        }
    } catch (e) {
        logger.error.error(`Ошибка создание задачи по пропущенному вызову ${util.inspect(e)}`);
    }
}

/*
Обработка информации по исходящему вызову
{ "exten": "749999999999", "unicueid": "1612529458.4626" , "extensionNumber" : "666" , "billsec" : "0", "disposition" : "BUSY", "recording": "1612529458.4626-2021-02-05-15_50.wav", "start" : "2021-02-05 1
5:50:58", "end" : "2021-02-05 15:51:04" }*/
async function sendInfoByOutgoingCall({ exten, unicueid, extensionNumber, billsec, disposition, recording, start, end }) {
    try {
        const resultRegisterCall = await bitrix.externalCallRegister(bitrixConfig.bitrix.users[extensionNumber], exten, bitrixConfig.bitrix.outgoing, start);
        logger.access.info(`Получен результат регистрации исходящего вызова ${util.inspect(resultRegisterCall)}`);
        const resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, bitrixConfig.bitrix.users[extensionNumber], billsec, bitrixConfig.bitrix.status[disposition], bitrixConfig.bitrix.outgoing, recording);
        logger.access.info(`Получен результат завершения исходящего вызова ${util.inspect(resultFinishCall)}`);
        return;
    } catch (e) {
        logger.error.error(`Ошибка по исходящему вызову ${e}`);
    }
};

/*
Обработка информации по входящему вызову
{ "unicueid": "1612529117.4620" , "incomingNumber" : "749999999999" , "billsec" : "0", "disposition" : "BUSY", "recording": "1612529117.4620-2021-02-05-15_45.wav", "start" : "2021-02-05 15:45:17", "end" :
 "2021-02-05 15:45:25" }*/
async function sendInfoByIncomingCall({ unicueid, incomingNumber, billsec, disposition, recording, start, end }) {
    try {
        const first3CXId = await searchInDB.searchFirstIncomingId(incomingNumber);
        const callId = await searchInDB.searchIncomingCallId(first3CXId[0].id);
        const end3CXId = await searchInDB.searchEndIncomingId(callId[0].call_id);
        const callInfo = await searchInDB.searchCallInfo(callId[0].call_id);
        const lastCallUser = await searchInDB.searchLastUserRing(end3CXId[0].info_id);
        const isAnswered = callInfo[0].is_answered ? '200' : '304'; //Проверка отвечен вызов или нет

        if (config.bitrix.users[lastCallUser[0].dn] != undefined) {
            const resultRegisterCall = await bitrix.externalCallRegister(bitrixConfig.bitrix.users[lastCallUser[0].dn], incomingNumber, bitrixConfig.bitrix.incoming, start);
            logger.access.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
            const resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, bitrixConfig.bitrix.users[lastCallUser[0].dn], billsec, isAnswered, bitrixConfig.bitrix.incoming, recording);
            logger.access.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);
            if (config.bitrix.createTask == 'true') {
                createTaskOnMissedCall(bitrixConfig.bitrix.users[lastCallUser[0].dn], incomingNumber, isAnswered);
            }
            return '';
        } else {
            const resultRegisterCall = await bitrix.externalCallRegister(bitrixConfig.bitrix.adminId, incomingNumber, bitrixConfig.bitrix.incoming, start);
            logger.access.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
            const resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, bitrixConfig.bitrix.adminId, billsec, isAnswered, bitrixConfig.bitrix.incoming, recording);
            logger.access.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);
            if (config.bitrix.createTask == 'true') {
                createTaskOnMissedCall(bitrixConfig.bitrix.adminId, incomingNumber, isAnswered);
            }
            return '';
        }

    } catch (e) {
        logger.error.error(`Ошибка по входящему вызову ${e}`);
    }
};

/*
EOL: '\r\n',
  variables: {},
  event: 'Newexten',
  privilege: 'dialplan,all',
  channel: 'PJSIP/00018-000006dd',
  channelstate: '7',
  channelstatedesc: 'Busy',
  calleridnum: '00018',
  calleridname: '666',
  connectedlinenum: '<unknown>',
  connectedlinename: '<unknown>',
  language: 'en',
  accountcode: '',
  context: 'outbound-hangup-handler',
  exten: 's',
  priority: '1',
  uniqueid: '1612526997.4596',
  linkedid: '1612526997.4596',
  extension: 's',
  application: 'NoOp',
  appdata: '{ "exten": "749999999999", "unicueid": "1612529458.4626" , "extensionNumber" : "666" , "billsec" : "0", "disposition" : "BUSY", "recording": "1612529458.4626-2021-02-05-15_50.wav", "start" : "2021-02-05 15:50:58", "end" : "2021-02-05 15:51:04" }'
 */
nami.on(`namiEventNewexten`, (event) => {
    if (event.context == 'outbound-hangup-handler' &&
        event.application == 'NoOp'
    ) {
        logger.access.info(`Завершился исходящие вызов на Asterisk ${event.appdata}`);
        const phoneEvent = JSON.parse(event.appdata);
        sendInfoByOutgoingCall(phoneEvent);
    }
});

/*
EOL: '\r\n',
  variables: {},
  event: 'Newexten',
  privilege: 'dialplan,all',
  channel: 'PJSIP/00018-000006dd',
  channelstate: '7',
  channelstatedesc: 'Busy',
  calleridnum: '00018',
  calleridname: '666',
  connectedlinenum: '<unknown>',
  connectedlinename: '<unknown>',
  language: 'en',
  accountcode: '',
  context: 'incoming-hangup-handler',
  exten: 's',
  priority: '1',
  uniqueid: '1612526997.4596',
  linkedid: '1612526997.4596',
  extension: 's',
  application: 'NoOp',
  appdata: '{ "unicueid": "1612529117.4620" , "incomingNumber" : "749999999999" , "billsec" : "0", "disposition" : "BUSY", "recording": "1612529117.4620-2021-02-05-15_45.wav", "start" : "2021-02-05 15:45:17", "end" : "2021-02-05 15:45:25" }'
 */
nami.on(`namiEventNewexten`, (event) => {
    if (event.context == 'incoming-hangup-handler' &&
        event.application == 'NoOp'
    ) {
        logger.access.info(`Завершился входящий вызов на Asterisk ${event.appdata}`);
        const phoneEvent = JSON.parse(event.appdata);
        setTimeout(sendInfoByIncomingCall, 20000, phoneEvent);
    }
});