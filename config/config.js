const config = {};
config.bitrix = {};


config.bitrix.incoming = '2';
config.bitrix.outgoing = '1';
config.bitrix.adminId = '11';
config.bitrix.daedlineMin = '5';
config.bitrix.userTaskId = '11';
config.bitrix.createTask = 'false';
config.bitrix.status = {
    "NO ANSWER": "480",
    "ANSWERED": "200",
    "BUSY": "486"
};

config.bitrix.users = {
    "101": "3",
    "102": "4",
    "103": "5",
    "104": "6",
    "120": "7",
    "110": "8",
    "116": "9",
    "117": "10",
    "111": "11",
    "100": "12",
    "001": "13",
    "125": "14",
    "021": "18",
    "041": "19",
    "043": "20",
    "022": "21",
    "061": "22",
    "012": "23",
    "015": "24",
    "016": "25",
    "062": "27",
    "053": "28",
    "023": "29",
    "051": "30",
    "042": "32",
    "117": "34",
    "011": "35",
    "017": "36",
    "555": "37",
    "018": "39",
    "024": "40",
    "666": "41",
    "019": "42",
};

module.exports = config;