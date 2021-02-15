'use strict';
const axios = require('axios'),
    util = require('util'),
    moment = require('moment'),
    logger = require(`../logger/logger`),
    config = require(`../config/connect`);

class Bitrix {
    constructor(recordIp = '192.168.10.185', domain = config.bitrix.domain, hash = config.bitrix.hash) {
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
        let json = {
            "USER_ID": params[0],
            "PHONE_NUMBER": params[1],
            "TYPE": params[2],
            "CALL_START_DATE": params[3],
            "CRM_CREATE": false,
            "SHOW": false
        };

        try {
            let result = await this.sendAxios('telephony.externalcall.register.json', json)
            return result;
        } catch (e) {
            return e;
        }
    };


    async externalCallFinish(...params) {
        let json = {
            "CALL_ID": params[0],
            "USER_ID": params[1],
            "DURATION": params[2],
            "STATUS_CODE": params[3],
            "TYPE": params[4],
            "RECORD_URL": `http://${this.recordIp}/monitor/${params[5]}`
        };


        try {
            let result = await this.sendAxios('telephony.externalcall.finish', json)
            return result;
        } catch (e) {
            return e;
        }
    };

    async createTask(...params) {
        let daedline = moment(new Date).add(2, 'minutes').format('YYYY-MM-DD H:mm:ss');
        let json = {
            "fields": {
                "TITLE": "Пропущенный вызов",
                "RESPONSIBLE_ID": "11",
                "CREATED_BY": params[0],
                "DESCRIPTION": `Пропущенный вызов от абонента ${params[1]}`,
                "PRIORITY": "2",
                "DEADLINE": daedline
            }
        }

        try {
            let result = await this.sendAxios('tasks.task.add', json)
            return result;
        } catch (e) {
            return e;
        }
    };

    async taskStatus(...params) {
        let json = {
            "taskId": params[0]
        }

        try {
            let result = await this.sendAxios('tasks.task.get', json)
            if (result.task.status == '2') {
                logger.info(`Задача просрочена ${params[0]}`);
                this.updateTaskResponsibleId(params[0]);
            }
            return;

        } catch (e) {
            return e;
        }
    };

    async updateTaskResponsibleId(...params) {
        let json = {
            "taskId": params[0],
            "fields": {
                "RESPONSIBLE_ID": "11"
            }
        }

        try {
            let result = await this.sendAxios('tasks.task.update', json)
            logger.info(`Изменение ответственного по задаче ${util.inspect(result)}`);

        } catch (e) {
            logger.error(e);
        }
    };



};

module.exports = Bitrix;