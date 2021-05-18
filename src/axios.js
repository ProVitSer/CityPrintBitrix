const axios = require('axios'),
    util = require('util');

class Axios {
    constructor() {
        this.config = {
            headers: {
                'User-Agent': 'voipnotes/0.0.1',
                'Content-Type': 'application/json',
            }
        }
    }

    async post(url, json) {
        try {
            const res = await axios.post(url, JSON.stringify(json), this.config);
            const result = await res;
            if (!result) {
                return [];
            }
            return result;
        } catch (e) {
            return e;
        }

    }

    async get(url) {
        try {
            const res = await axios.get(url, this.config);
            const result = await res;
            if (!result) {
                return [];
            }
            return result;
        } catch (e) {
            return e;
        }

    }

};

module.exports = Axios;