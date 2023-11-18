const utils = require("./utils");
const xml_parser = require("fast-xml-parser");
const parser = new xml_parser.XMLParser({
    ignoreAttributes : false
})

var channel = {
    get_channel: async channel_id => {
        return await utils.extract_json_data_from_page("https://www.youtube.com/channel/" + encodeURIComponent(channel_id), "ytInitialData")
    },
    get_channel_videos: async channel_id => {
        let rss = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel_id)}`)).text()
        let feed = parser.parse(rss).feed;

        return ({
            "author": feed.author,
            "entry": feed.entry.map(video => ({
                id: video["yt:videoId"],
                channel_id: video["yt:channelId"],
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

module.exports = channel;