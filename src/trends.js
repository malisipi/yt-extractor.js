const utils = require("./utils");

var trends = {
    get_trends: async () => {
        let page = await utils.get_text(`https://www.youtube.com/feed/trending?bp=6gQJRkVleHBsb3Jl`);
        let data = utils.extract_json_data_from_page(page, "ytInitialData");
        let videos = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents.map(a=>a.itemSectionRenderer.contents[0].shelfRenderer.content.expandedShelfContentsRenderer.items).reduce((a,b)=>{return [...a, ...b]},[]).map(a=>a.videoRenderer);;
        return {
            videos: videos.map(video => {
                return {
                    id: video?.videoId,
                    title: video?.title?.runs[0]?.text,
                    thumbnails: video?.thumbnail?.thumbnails,
                    views: Number(video.shortViewCountText.accessibility?.accessibilityData?.label?.replace(" million", "M")?.match(/[0-9a-zA-Z\.]+/g)?.[0]?.replace("K"," 1000")?.replace("M", " 1000000")?.split(" ")?.reduce((total, current) => {return total*Number(current)},1) ?? 0),
                    length: utils?.extract_time_from_text(video?.lengthText?.simpleText) ?? null,
                    owner: {
                        name: video?.shortBylineText?.runs[0]?.text,
                        verified: (video.ownerBadges?.filter(a=>a.metadataBadgeRenderer?.style?.includes("VERIFIED")).length ?? 0) > 0,
                        id: videos?.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ?? null
                    },
                }}),
            //nextPage: null
        };
    }
};

module.exports = trends;
