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
    INCOMINGID = '2',
    OUTGOINGID = '1';


//Создание задачи в Bitrix по пропущенному вызову
async function createTaskOnMissedCall(bitrixUserId, incomingNumber, isAnswered) {
    try {
        if (isAnswered == '304') {
            let resultCreateTask = await bitrix.createTask(bitrixUserId, incomingNumber);
            logger.info(`Создана задача  ${util.inspect(resultCreateTask)}`);
            setTimeout(bitrix.taskStatus.bind(bitrix), 180000, resultCreateTask.task.id);
            return;
        } else {
            return;
        }
    } catch (e) {
        logger.error(`Ошибка создание задачи по пропущенному вызову ${util.inspect(e)}`);
    }
}

/*
Обработка информации по исходящему вызову
{ "exten": "749999999999", "unicueid": "1612529458.4626" , "extensionNumber" : "666" , "billsec" : "0", "disposition" : "BUSY", "recording": "1612529458.4626-2021-02-05-15_50.wav", "start" : "2021-02-05 1
5:50:58", "end" : "2021-02-05 15:51:04" }*/
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

/*
Обработка информации по входящему вызову
{ "unicueid": "1612529117.4620" , "incomingNumber" : "749999999999" , "billsec" : "0", "disposition" : "BUSY", "recording": "1612529117.4620-2021-02-05-15_45.wav", "start" : "2021-02-05 15:45:17", "end" :
 "2021-02-05 15:45:25" }*/
async function sendInfoByIncomingCall({ unicueid, incomingNumber, billsec, disposition, recording, start, end }) {
    try {
        let first3CXId = await searchInDB.searchFirstIncomingId(incomingNumber);
        let callId = await searchInDB.searchIncomingCallId(first3CXId[0].id);
        let end3CXId = await searchInDB.searchEndIncomingId(callId[0].call_id);
        let callInfo = await searchInDB.searchCallInfo(callId[0].call_id);
        let lastCallUser = await searchInDB.searchLastUserRing(end3CXId[0].info_id);
        let isAnswered = callInfo[0].is_answered ? '200' : '304'; //Проверка отвечен вызов или нет

        if (user[lastCallUser[0].dn] != undefined) {
            let resultRegisterCall = await bitrix.externalCallRegister(user[lastCallUser[0].dn], incomingNumber, INCOMINGID, start);
            logger.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
            let resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, user[lastCallUser[0].dn], billsec, isAnswered, INCOMINGID, recording);
            logger.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);
            createTaskOnMissedCall(user[lastCallUser[0].dn], incomingNumber, isAnswered);
        } else {
            let resultRegisterCall = await bitrix.externalCallRegister(BITRIXADMIN, incomingNumber, INCOMINGID, start);
            logger.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
            let resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, BITRIXADMIN, billsec, isAnswered, INCOMINGID, recording);
            logger.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);
            createTaskOnMissedCall(BITRIXADMIN, incomingNumber, isAnswered);
        }

    } catch (e) {
        logger.error(`Ошибка по входящему вызову ${e}`);
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
        logger.info(`Завершился исходящие вызов на Asterisk ${event.appdata}`);
        let phoneEvent = JSON.parse(event.appdata);
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
        logger.info(`Завершился входящий вызов на Asterisk ${event.appdata}`);
        let phoneEvent = JSON.parse(event.appdata);
        setTimeout(sendInfoByIncomingCall, 20000, phoneEvent);
    }
});