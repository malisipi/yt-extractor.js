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
            length: Number(video.lengthSeconds),
            owner: {
                name: video.shortBylineText.runs[0].text,
                verified: (video.ownerBadges?.filter(a=>a.metadataBadgeRenderer?.style?.includes("VERIFIED")).length ?? 0) > 0,
                channelId: video.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url.replace("/channel/","")
            },
        }));
    }
}

module.exports = search;