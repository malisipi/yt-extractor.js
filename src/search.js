var search = {
    search_data: async (query) => {
        search_page = await (await fetch("https://www.youtube.com/results?search_query="+encodeURIComponent(query))).text();
        data = search_page.split(/\<[\/]*script[^\>]*\>/g).filter(a=>a.startsWith("var ytInitialData"))[0];
        data = data.replace(/var[\ ]*ytInitialData[\ ]*\=[\ ]*/g,"").replace("\\\\\"","\\\"").replaceAll(";","");
        data = JSON.parse(data);
        return data;
    },
    search: async (query) => {
        let data = await search.search_data(query);
        let video_datas = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        return video_datas.map(a=>a.videoRenderer).filter(a=>a!=undefined);
    }
}

module.exports = search;