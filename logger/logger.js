"use strict";
const log4js = require(`log4js`);

log4js.configure({
    appenders: {
        access: {
            type: `file`,
            filename: `logs/access.log`,
            maxLogSize: 10485760,
            backups: 3,
            compress: true
        },
        error: {
            type: `file`,
            filename: `logs/error.log`,
            maxLogSize: 10485760,
            backups: 3,
            compress: true
        }
    },
    categories: {
        default: { appenders: ['access'], level: 'info' },
        access: {
            appenders: [`access`],
            level: `info`
        },
        error: {
            appenders: [`error`],
            level: `error`
        }
    }
});

const access = log4js.getLogger('access');
const error = log4js.getLogger('error');

module.exports = {
    access,
    error
};