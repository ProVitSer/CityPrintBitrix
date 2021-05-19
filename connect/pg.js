const { Sequelize, DataTypes, Op } = require("sequelize"),
    config = require(`../config/pg.config`);

const sequelize = new Sequelize(config.pg.database, config.pg.user, config.pg.password, {
    dialect: "postgres",
    host: config.pg.host,
    port: config.pg.port,
    define: {
        timestamps: false
    },
    logging: false
});

const pg = {};
pg.Op = Op;
pg.clCalls = require("../models/clCalls.models")(sequelize, DataTypes);
pg.clParticipants = require("../models/clParticipants.models")(sequelize, DataTypes);
pg.clPartyInfo = require("../models/clPartyInfo.models")(sequelize, DataTypes);

module.exports = pg;