"use strict";
const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    Axios = require('../src/axios'),
    logger = require('../logger/logger'),
    sync = require('../config/sync.config'),
    mongoConfig = require('../config/mongo.config'),
    mail = require('../src/mail'),
    util = require('util');

const endpoint = new Axios();
const selenium = new Axios();
const localMongoDB = `mongodb://${mongoConfig.mongo.localHost}:${config.mongo.localPort}/${config.mongo.localDB}`;
const externalMongoDB = `mongodb://${mongoConfig.mongo.externalDB}:${mongoConfig.mongo.externalPort}/${mongoConfig.mongo.externalDB}`;
let Phonebooks;

//Завершение работы скрипта в случае некорректной загрузки или ответа сервера
const extiProcess = () => {
    setTimeout((function() {
        return process.exit(1);
    }), 10000);
};

//Удаление коллекции перед записью новых данных
async function dropCollectionInMongo(mongoConnection) {
    try {
        mongoConnection.dropCollection("phonebooks", (e, result) => {
            if (e) {
                logger.error(`Ошибка удаление коллекции в Mongo,коллекция пустая ${util.inspect(e)}`);
                //sendEmail.main(`Ошибка удаление коллекции в БД Mongo ${util.inspect(e)}`)
                return '';
            } else {
                logger.info(`Удаление коллекции прошло успешно`);
                return '';
            }
        });
    } catch (e) {
        logger.error.error(`Ошибка удаление коллекции в БД Mongo ${util.unspect(e)}`);
    }

};

async function getMongo(mongo) {
    try {
        const phonebooksScheme = require("../models/phonebooks.models")(Schema);
        const connection = await mongoose.connect(mongo, { useUnifiedTopology: true, useNewUrlParser: true });
        Phonebooks = mongoose.model("phonebooks", phonebooksScheme);
        return connection;
    } catch (e) {
        logger.error.error(`Ошибка подключения к Mongo ${util.inspect(e)}`);
        await mail.senEmail(`Ошибка подключения к БД Mongo ${util.inspect(e)}`);
    }
}

async function validateNumber(json) {
    for (const item of json) {
        if (item.ClientPhone.length == 10) {
            item.ClientPhone = `7${item.ClientPhone}`;
            await insertInMongo(item);
        } else {
            item.ClientPhone = item.ClientPhone.replace(/\)/g, '').replace(/\(/g, '');
            if (item.ClientPhone.length == 11) {
                item.ClientPhone = `7${item.ClientPhone.slice(1,11)}`;
                await insertInMongo(item);
            } else if (item.ClientPhone.length == 10) {
                item.ClientPhone = `7${item.ClientPhone}`;
                await insertInMongo(item);
            } else {
                logger.access.info(`Не прошедшие валидацию ${util.inspect(item)}`);
            }
        }

    }
    return '';
}



//Добавляем данных в Mongo

async function insertInMongo(item) {
    try {
        const client = new Phonebooks({ _id: item.ClientPhone, company: item.ClientName, fio: item.ContactName, extension: item.ManagerLocPhone });
        await client.save();
        return '';
    } catch (e) {
        logger.error(`Ошибка сохранение клиента ${util.unspect(e)}`);
    }

}

async function init() {
    try {
        const resultGetInfoFrom1C = await endpoint.get(`${sync.server1C.url}`);
        if (resultGetInfoFrom1C.length == 0) {
            logger.access.info(`Со стороны 1С не вернулись данные или вернула пустота`);
            await mail.senEmail('Со стороны 1С не вернулись данные или вернула пустота');
            extiProcess();
        } else {
            const localConnection = await getMongo(localMongoDB);
            await dropCollectionInMongo(localConnection);
            await validateNumber(resultGetInfoFrom1C);
            await localConnection.close();

            const externalConnection = await getMongo(externalMongoDB);
            await dropCollectionInMongo(externalConnection);
            await validateNumber(resultGetInfoFrom1C);
            selenium.get(`${sync.externalServer}`);
            await externalConnection.close();
            extiProcess();
        }
    } catch (e) {
        logger.error.error(`Скрипта Init ${util.unspect(e)}`);
    }
}

init();