const utils = require("./utils");

var trends = {
    get_trends: async () => {
        let page = await utils.get_text(`https://www.youtube.com/`);
        return utils.extract_json_data_from_page(page, "ytInitialData");
    }
};

module.exports = trends;