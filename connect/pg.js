const { Sequelize, DataTypes } = require("sequelize"),
    config = require(`../config/pg.config`);

const sequelize = new Sequelize(config.pg.database, config.pg.user, config.pg.password, {
    dialect: "postgres",
    host: config.pg.host,
    define: {
        timestamps: false
    },
    logging: false
});

const pg = {};

pg.clCalls = require("../models/clCalls.models")(sequelize, DataTypes);
pg.clParticipants = require("../models/clParticipants.models")(sequelize, DataTypes);
pg.clPartyInfo = require("../models/clPartyInfo.models")(sequelize, DataTypes);

module.exports = pg;