const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    config = require(`../config/mongo.config`),
    logger = require(`../logger/logger`);

const mongoDB = `mongodb://${config.mongo.localDB}:${config.mongo.localPort}/${config.mongo.localDB}`;


mongoose.connect(mongoDB, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
});
mongoose.set('useUnifiedTopology', true);
const connection = mongoose.connection;

connection.once("open", () => {
    logger.access.info("MongoDB database connection established successfully");
});

connection.on('error', (error) => {
    logger.error.error(`Ошибка подключение к Mongo ${error}`)
});


const mongo = {};
const phonebooksScheme = require("../models/phonebooks.models")(Schema);
mongo.Phonebooks = mongoose.model("phonebooks", phonebooksScheme);
module.exports = mongo;