const utils = require("./utils")

var search = {
    search_data: async (query) => {
        let page = await utils.get_text(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
        return utils.extract_json_data_from_page(page, "ytInitialData");
    },
    search: async (query) => {
        let data = await search.search_data(query);
        let video_datas = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        return video_datas.map(a=>a.videoRenderer).filter(a=>a!=undefined).map(video => ({
            id: video.videoId,
            title: video.title.runs[0].text,
            thumbnails: video.thumbnail.thumbnails,
            views: Number(video.title.accessibility.accessibilityData.label.match(/[0-9\.\,\ ]+view/g)[0].replace(/[A-Za-z\ \.\,]+/g, "")),
            length: utils.extract_time_from_text(video?.lengthText?.simpleText) ?? null,
            owner: {
                name: video.shortBylineText.runs[0].text,
                verified: (video.ownerBadges?.filter(a=>a.metadataBadgeRenderer?.style?.includes("VERIFIED")).length ?? 0) > 0,
                id: video.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url.replace("/channel/","")
            },
        }));
    },
    get_suggestions: async (query) => {
        let response = await yt_extractor.utils.get_text(`https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`);
        return JSON.parse(response.match(/\(.*\)/g)[0].slice(1,-1))[1].map(a => a[0]);
    }
}

module.exports = search;
