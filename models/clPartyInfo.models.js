module.exports = (sequelize, DataTypes) => {
    const clPartyInfo = sequelize.define("cl_party_info", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        dn_type: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        dn: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        caller_number: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        display_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        dn_class: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        firstlastname: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        did_number: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: "NULL"
        }
    }, {
        tableName: 'cl_party_info',
        schema: "public",
        timestamps: false
    });

    return clPartyInfo;
};