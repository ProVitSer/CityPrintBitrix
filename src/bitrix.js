'use strict';
const axios = require('axios'),
    util = require('util'),
    moment = require('moment'),
    logger = require(`../logger/logger`),
    config = require(`../config/connect`);

class Bitrix {
    constructor(domain = config.bitrix.domain, hash = config.bitrix.hash) {
        this.domain = domain;
        this.hash = hash;
        this.config = {
            headers: {
                'User-Agent': 'voipnotes/0.0.1',
                'Content-Type': 'application/json',

            }
        }
    }

    async userGet() {
        try {
            const res = await axios.get(`https://${this.domain}/rest/41/${this.hash}/user.get`, this.config)
            const result = await res;

            if (!result) {
                return [];
            }
            return result.data.result
        } catch (e) {
            return e;
        }

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
            const res = await axios.post(`https://${this.domain}/rest/41/${this.hash}/telephony.externalcall.register.json`, JSON.stringify(json), this.config)
            const result = await res;

            if (!result) {
                return [];
            }
            return result.data.result
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
            //"RECORD_URL": `http://certsys.onvoip.ru/${recordTime}/${params[5]}`
        };


        try {
            const res = await axios.post(`https://${this.domain}/rest/41/${this.hash}/telephony.externalcall.finish`, JSON.stringify(json), this.config)
            const result = await res;

            if (!result) {
                return [];
            }
            return result.data.result
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
            const res = await axios.post(`https://${this.domain}/rest/41/${this.hash}/tasks.task.add`, JSON.stringify(json), this.config)
            const result = await res;

            if (!result) {
                return [];
            }
            return result.data.result
        } catch (e) {
            return e;
        }
    };

    async taskStatus(...params) {
        let json = {
            "taskId": params[0]
        }

        try {
            const res = await axios.post(`https://${this.domain}/rest/41/${this.hash}/tasks.task.get`, JSON.stringify(json), this.config)
            const result = await res;

            if (result.data.result.task.status == '2') {
                logger.info(`Задача просрочена ${params[0]}`);
                this.updateTaskResponsibleId(params[0]);
            }
            return;

        } catch (e) {
            logger.error(e);
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
            const res = await axios.post(`https://${this.domain}/rest/41/${this.hash}/tasks.task.update`, JSON.stringify(json), this.config)
            const result = await res;
            logger.info(`Изменение ответственного по задаче ${util.inspect(result)}`);

        } catch (e) {
            logger.error(e);
        }
    };



};

module.exports = Bitrix;