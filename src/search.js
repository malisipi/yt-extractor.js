const utils = require("./utils")

var search = {
    search_data: async (query) => {
        return await utils.extract_json_data_from_page("https://www.youtube.com/results?search_query="+encodeURIComponent(query), "ytInitialData");
    },
    search: async (query) => {
        let data = await search.search_data(query);
        let video_datas = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        return video_datas.map(a=>a.videoRenderer).filter(a=>a!=undefined);
    }
}

module.exports = search;