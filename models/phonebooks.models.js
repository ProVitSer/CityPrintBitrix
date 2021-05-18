module.exports = (Schema) => {
    const phonebooksScheme = new Schema({
        _id: String,
        company: String,
        fio: String,
        extension: String
    }, { versionKey: false });
    return phonebooksScheme;
};