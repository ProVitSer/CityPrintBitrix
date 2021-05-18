module.exports = (sequelize, DataTypes) => {
    const clCalls = sequelize.define("cl_calls", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        start_time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        end_time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        is_answered: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        ringing_dur: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        talking_dur: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        q_wait_dur: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'cl_calls',
        schema: "public",
        timestamps: false
    });

    return clCalls;
};