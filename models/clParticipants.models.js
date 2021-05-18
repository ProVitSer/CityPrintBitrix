module.exports = (sequelize, DataTypes) => {
    const clParticipants = sequelize.define("cl_participants", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        call_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        info_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        role: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        is_inbound: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        end_status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        forward_reason: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        failure_reason: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        start_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        answer_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        end_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        billing_code: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        billing_ratename: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        billing_rate: {
            type: DataTypes.DECIMAL,
            allowNull: true
        },
        billing_cost: {
            type: DataTypes.DECIMAL,
            allowNull: true
        },
        billing_duration: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        recording_url: {
            type: DataTypes.STRING(511),
            allowNull: true
        },
        billing_group: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'cl_participants',
        schema: "public",
        timestamps: false
    });

    return clParticipants;
};