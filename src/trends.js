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
                length: utils.extract_time_from_text(video?.lengthText?.simpleText) ?? null,
                owner: {
                    name: video.shortBylineText.runs[0].text,
                    verified: (video.ownerBadges?.filter(a=>a.metadataBadgeRenderer?.style?.includes("VERIFIED")).length ?? 0) > 0,
                    id: videos?.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ?? null
                },
            })),
            nextPage: data.contents
        };
    }
};

module.exports = trends;
