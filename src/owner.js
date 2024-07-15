const utils = require("./utils");
const xml_parser = require("fast-xml-parser");
const parser = new xml_parser.XMLParser({
    ignoreAttributes : false
})

var owner = {
    get_owner: async channel_id => {
        let page = await utils.get_text(`https://www.youtube.com/channel/${encodeURIComponent(channel_id)}`);
        let data = utils.extract_json_data_from_page(page, "ytInitialData");
        return ({
            name: data?.metadata?.channelMetadataRenderer?.title,
            id: data?.microformat?.microformatDataRenderer?.urlCanonical?.split("/channel/")?.[1] ?? channel_id,
            description: data?.metadata?.channelMetadataRenderer?.description,
            backgrounds: data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources ?? [],
            thumbnails: data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources ?? data?.metadata?.channelMetadataRenderer?.avatar?.thumbnails ?? [],
            videosCount: Number(JSON.stringify(data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows)?.match(/[0-9\.]+ video/g)?.[0]?.match(/[0-9]+/g)?.[0] ?? 0),
            videos: (await owner.get_owner_videos(channel_id)).entry,
            followers: JSON.stringify(data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows)?.match(/[0-9\.KM]+ subscribers/g)?.[0]?.split(" ")?.[0]?.replace("K"," 1000")?.replace("M", " 1000000")?.split(" ")?.reduce((total, current) => {return total*Number(current)},1) ?? 0,
            verified: !!data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.title?.dynamicTextViewModel?.text?.attachmentRuns?.[0]?.element?.type?.imageType?.image?.sources?.[0]?.clientResource?.imageName
        });
    },
    get_owner_videos: async channel_id => {
        let rss = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel_id)}`)).text()
        let feed = parser.parse(rss).feed;

        return ({
            "owner": {
                name: feed.author.name,
                id: feed.author.uri.split("/").at(-1)
            },
            "entry": feed.entry.map(video => ({
                id: video["yt:videoId"],
                owner: {
                    name: feed.author.name,
                    id: video["yt:channelId"]
                },
                title: video.title,
                thumbnail: {
                    url: video["media:group"]["media:thumbnail"]["@_url"],
                    width: Number(video["media:group"]["media:thumbnail"]["@_width"]),
                    height: Number(video["media:group"]["media:thumbnail"]["@_height"])
                },
                description: video["media:group"]["media:description"],
                views: Number(video["media:group"]["media:community"]["media:statistics"]["@_views"]),
                updated: video.updated,
                published: video.published,
            }))
        });
    }
};

module.exports = owner;
