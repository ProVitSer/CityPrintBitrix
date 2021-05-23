"use strict";
const Bitrix = require('./src/bitrix'),
    searchInDB = require('./src/db3cx'),
    util = require('util'),
    nami = require(`./connect/ami`),
    logger = require(`./logger/logger`),
    mongo = require('./connect/mongo'),
    bitrixConfig = require(`./config/bitrix.config`);


const bitrix = new Bitrix();

//Создание задачи в Bitrix по пропущенному вызову
async function createTaskOnMissedCall(extension, incomingNumber) {
    try {
        const searchTaskInDB = await mongo.Tasks.findById(`${incomingNumber}`);

        //В базе отсутствует связка пропущенный номер и id задачи, значит новый вызов создаем новуюзадачу
        if (searchTaskInDB == null) {
            const resultCreateTask = await bitrix.createTask(bitrixConfig.bitrix.users[extension], incomingNumber);
            logger.access.info(`Создана задача  ${util.inspect(resultCreateTask)}`);
            setTimeout(bitrix.checkTaskStatus.bind(bitrix), bitrixConfig.bitrix.timeouteUpdateTask, resultCreateTask.task.id);
            await insertInDBTasksMissedCall(resultCreateTask.task.id, incomingNumber, bitrixConfig.bitrix.users[extension], extension);
            return;
        }

        const searchTaskInBitrix = await bitrix.getTaskStatus(searchTaskInDB.taskId);
        logger.access.info(`Результат поиска задачи по ID ${util.inspect(searchTaskInBitrix)}`);
        if (searchTaskInBitrix != false) {
            //Проверка один и тот же пользователь не ответил по данному вызову 
            if (searchTaskInBitrix.status == '2' && searchTaskInBitrix.responsibleId == bitrixConfig.bitrix.users[extension]) {
                return;
                //Другой пользователь не ответил на вызов, меняем ответственного
            } else if (searchTaskInBitrix.status == bitrixConfig.bitrix.taskIdStart) {
                const resultUpdateBitrix = await bitrix.updateResponsibleIdTask(searchTaskInDB.taskId, bitrixConfig.bitrix.users[extension]);
                const resultUpdateDB = await mongo.Tasks.updateOne({ "_id": incomingNumber }, {
                    $set: { "bitrixUserId": bitrixConfig.bitrix.users[extension], "extension": extension }
                });
                logger.access.info(`Результат изменение ответственного в Битрикс ${util.inspect(resultUpdateBitrix)}`);
                logger.access.info(`Результат изменение ответственного в базе ${util.inspect(resultUpdate)}`);
            }
        }
    } catch (e) {
        logger.error.error(`Ошибка добавление создание задачи по пропущенному вызову  ${util.inspect(e)}`);
    }
}

async function checkCompletionTask(incomingNumber) {
    try {
        const searchTaskInDB = await mongo.Tasks.findById(`${incomingNumber}`);
        logger.access.info(`Результат поиска информации по внешнему номеру в базе ${util.inspect(searchTaskInDB)}`);
        if (searchTaskInDB != null) {
            const resultDeleteInBitrix = await bitrix.closeTask(searchTaskInDB.taskId);
            const resultDeleteInDB = await mongo.Tasks.deleteOne({ "_id": incomingNumber });
            logger.access.info(`Результат завершения задачи в Битрикс ${util.inspect(resultDeleteInBitrix)}`);
            logger.access.info(`Результат удаления из базы ${util.inspect(resultDeleteInDB)}`);
            return;
        }
    } catch (e) {
        logger.error.error(`Ошибка проверки созданной задачи  ${util.inspect(e)}`);
    }
}

async function insertInDBTasksMissedCall(taskId, incomingNumber, bitrixId, extension) {
    try {
        logger.access.info(`Информация по задаче на добавление в базу ${taskId}, ${incomingNumber}, ${bitrixId}, ${extension}`);
        const task = new mongo.Tasks({ _id: incomingNumber, taskId: taskId, bitrixUserId: bitrixId, extension: extension });
        const resultSaveTaskInfo = await task.save();
        logger.access.info(`Результат добавление в БД информации по созданию задачи по пропущенному вызову ${util.inspect(resultSaveTaskInfo)}`);
        return;
    } catch (e) {
        logger.error.error(`Ошибка добавление в БД информации по созданию задачи по пропущенному вызову  ${util.inspect(e)}`);
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
        await checkCompletionTask(exten);
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
        const answer = '200'; //Статус отвеченного вызова
        const notAnswer = '304'; //Статус неотвеченного вызова 
        const first3CXId = await searchInDB.searchFirstIncomingId(incomingNumber); //Поиск первый ID вызова в базе 3сх
        const callId = await searchInDB.searchIncomingCallId(first3CXId[0].id); //Поиск уникальный ID вызова в базе 3сх
        const end3CXId = await searchInDB.searchEndIncomingId(callId[0].call_id); //Поиск последнего ID вызова в базе 3сх
        const callInfo = await searchInDB.searchCallInfo(callId[0].call_id); //Поиска информации по вызову на стороне 3сх
        const lastCallUser = await searchInDB.searchLastUserRing(end3CXId[0].info_id); //Последнийответивший согласно 3сх
        const isAnswered = callInfo[0].is_answered ? answer : notAnswer; //Проверка отвечен вызов или нет

        if (bitrixConfig.bitrix.users[lastCallUser[0].dn] != undefined) {
            const resultRegisterCall = await bitrix.externalCallRegister(bitrixConfig.bitrix.users[lastCallUser[0].dn], incomingNumber, bitrixConfig.bitrix.incoming, start);
            logger.access.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
            const resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, bitrixConfig.bitrix.users[lastCallUser[0].dn], billsec, isAnswered, bitrixConfig.bitrix.incoming, recording);
            logger.access.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);
            if (bitrixConfig.bitrix.createTask == 'true' && isAnswered == '304') {
                createTaskOnMissedCall(lastCallUser[0].dn, incomingNumber);
                return;
            }
            await checkCompletionTask(incomingNumber);
            return '';
        } else {
            const resultRegisterCall = await bitrix.externalCallRegister(bitrixConfig.bitrix.adminId, incomingNumber, bitrixConfig.bitrix.incoming, start);
            logger.access.info(`Получен результат регистрации входящего вызова ${util.inspect(resultRegisterCall)}`);
            const resultFinishCall = await bitrix.externalCallFinish(resultRegisterCall, bitrixConfig.bitrix.adminId, billsec, isAnswered, bitrixConfig.bitrix.incoming, recording);
            logger.access.info(`Получен результат завершения входящего вызова ${util.inspect(resultFinishCall)}`);
            if (bitrixConfig.bitrix.createTask == 'true' && isAnswered == '304') {
                createTaskOnMissedCall(bitrixConfig.bitrix.adminExtension, incomingNumber);
                return;
            }
            await checkCompletionTask(incomingNumber);
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