"use strict";
const nodemailer = require("nodemailer"),
    logger = require('../logger/logger'),
    config = require(`../config/mail.config`),
    util = require('util');

async function senEmail(body) {
    const transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: false
    });

    const result = await transporter.sendMail({
        from: config.mail.fromEmail,
        to: config.mail.email,
        subject: "Информация по синхронизации 1С с адресной книгой",
        text: body,
    });

    logger.access.info(`Message sent: %s ${util.inspect(result)}`);
    return '';
}

module.exports = { senEmail };