"use strict";
const pg = require('../connect/pg'),
    logger = require('../logger/logger'),
    util = require('util');

async function searchFirstIncomingId(incomingNumber) {
    try {
        const first3CXId = await pg.clPartyInfo.findAll({
            raw: true,
            attributes: ["id"],
            where: { caller_number: incomingNumber },
            order: [
                ['id', 'DESC'],
            ],
            limit: 1
        });
        logger.access.info(`searchFirstIncomingId ${util.inspect(first3CXId)}`);
        return first3CXId;
    } catch (e) {
        logger.error.error(e);
        return e;
    }
}

async function searchIncomingCallId(first3CXId) {
    try {
        const callInfo = await pg.clParticipants.findAll({ raw: true, attributes: ["call_id", "recording_url"], where: { info_id: first3CXId } });
        logger.access.info(`searchIncomingCallId ${util.inspect(callInfo)}`);
        return callInfo;
    } catch (e) {
        logger.error.error(e);
        return e;
    }
}

async function searchIncomingInfoByLocalCall(end3CXId) {
    try {
        const incomingInfo = await pg.clParticipants.findAll({ raw: true, attributes: ["call_id", "recording_url"], where: { info_id: end3CXId } });
        logger.access.info(`searchIncomingInfoByLocalCall ${util.inspect(incomingInfo)}`);
        return incomingInfo;
    } catch (e) {
        logger.error.error(e);
        return e;
    }
}

async function searchEndIncomingId(callId) {
    try {
        const end3CXId = await pg.clParticipants.findAll({
            raw: true,
            attributes: ["info_id"],
            where: { call_id: callId },
            order: [
                ['info_id', 'DESC'],
            ],
            limit: 1
        });
        logger.access.info(`searchEndIncomingId ${util.inspect(end3CXId)}`);
        return end3CXId;
    } catch (e) {
        logger.error.error(e);
        return e;
    }
}

async function searchCallInfo(callId) {
    try {
        const callInfo = await pg.clCalls.findAll({ raw: true, attributes: ["start_time", "talking_dur", "is_answered"], where: { id: callId } });
        logger.access.info(`searchCallInfo ${util.inspect(callInfo)}`);
        return callInfo;
    } catch (e) {
        logger.error.error(e);
        return e;
    }
}

async function searchLastUserRing(end3CXId) {
    try {
        const lastCallUser = await pg.clPartyInfo.findAll({ raw: true, attributes: ["dn"], where: { id: end3CXId } });
        logger.access.info(`searchLastUserRing ${util.inspect(lastCallUser)}`);
        return lastCallUser;
    } catch (e) {
        logger.error.error(e);
        return e;
    }
}


module.exports = { searchFirstIncomingId, searchIncomingCallId, searchEndIncomingId, searchCallInfo, searchLastUserRing, searchIncomingInfoByLocalCall };