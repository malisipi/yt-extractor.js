const utils = require("./utils");

var trends = {
    get_trends: async () => {
        let page = await utils.get_text(`https://www.youtube.com/`);
        let data = utils.extract_json_data_from_page(page, "ytInitialData");
        let videos = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents.map(a=>a.richItemRenderer?.content?.videoRenderer).filter(a=>a!=undefined);
        return {
            videos: videos.map(video => ({
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
            })),
            nextPage: data.contents
        };
    }
};

module.exports = trends;