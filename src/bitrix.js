'use strict';
const axios = require('axios'),
    util = require('util'),
    moment = require('moment'),
    logger = require(`../logger/logger`),
    bitrixConfig = require(`../config/bitrix.config`);

class Bitrix {
    constructor(recordIp = '192.168.10.185', domain = bitrixConfig.bitrix.domain, hash = bitrixConfig.bitrix.hash) {
        this.recordIp = recordIp;
        this.domain = domain;
        this.hash = hash;
        this.config = {
            headers: {
                'User-Agent': 'voipnotes/0.0.1',
                'Content-Type': 'application/json',

            }
        }
    }

    async sendAxios(url, json) {
        const res = await axios.post(`https://${this.domain}/rest/41/${this.hash}/${url}`, JSON.stringify(json), this.config)
        const result = await res;

        if (!result) {
            return [];
        }
        return result.data.result
    }

    async externalCallRegister(...params) {
        const json = {
            "USER_ID": params[0],
            "PHONE_NUMBER": params[1],
            "TYPE": params[2],
            "CALL_START_DATE": params[3],
            "CRM_CREATE": false,
            "SHOW": false
        };

        try {
            const result = await this.sendAxios('telephony.externalcall.register.json', json)
            return result;
        } catch (e) {
            return e;
        }
    };


    async externalCallFinish(...params) {
        const json = {
            "CALL_ID": params[0],
            "USER_ID": params[1],
            "DURATION": params[2],
            "STATUS_CODE": params[3],
            "TYPE": params[4],
            "RECORD_URL": `http://${this.recordIp}/monitor/${params[5]}`
        };


        try {
            const result = await this.sendAxios('telephony.externalcall.finish', json)
            return result;
        } catch (e) {
            return e;
        }
    };

    async createTask(...params) {
        const daedline = moment(new Date).add(bitrixConfig.bitrix.daedlineMin, 'minutes').format('YYYY-MM-DD H:mm:ss');
        const json = {
            "fields": {
                "TITLE": "Пропущенный вызов",
                "RESPONSIBLE_ID": params[0],
                "CREATED_BY": bitrixConfig.bitrix.userTaskId,
                "DESCRIPTION": `Пропущенный вызов от абонента ${params[1]}`,
                "PRIORITY": "2",
                "DEADLINE": daedline
            }
        }

        try {
            const result = await this.sendAxios('tasks.task.add', json)
            return result;
        } catch (e) {
            return e;
        }
    };

    async taskStatus(...params) {
        const json = {
            "taskId": params[0]
        }

        try {
            const result = await this.sendAxios('tasks.task.get', json)
            if (result.task.status == '2') {
                logger.access.info(`Задача просрочена ${params[0]}`);
                this.updateTaskResponsibleId(params[0]);
            }
            return;

        } catch (e) {
            return e;
        }
    };

    async updateTaskResponsibleId(...params) {
        const json = {
            "taskId": params[0],
            "fields": {
                "auditors": [bitrixConfig.bitrix.adminId]
            }
        }

        try {
            const result = await this.sendAxios('tasks.task.update', json)
            logger.access.info(`Добавление наблюдателя по задаче ${util.inspect(result)}`);

        } catch (e) {
            logger.error.error(e);
        }
    };



};

module.exports = Bitrix;