module.exports = (Schema) => {
    const tasksScheme = new Schema({
        _id: String,
        taskId: String,
        bitrixUserId: String,
        extension: String
    }, { versionKey: false });
    return tasksScheme;
};