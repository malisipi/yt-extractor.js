var auto = {
    video: require("./video.js"),
    search: require("./search.js")
};

auto.extract_stream_url = async (video_id) => {
    if(auto.video.__signature_cipher == null)
        await auto.video.extract_signature_cipher_algorithm();
    
    let video = await auto.video.get_video(video_id);
    let url = video.streamingData.formats.at(-1).url || auto.video.solve_signature_cipher_url(video.streamingData.formats.at(-1).signatureCipher);
    return url;
}

auto.search_and_extract_stream_url = async (query) => {
    let videos = await auto.search.search(query);
    return await auto.extract_stream_url(videos[0].videoId);
}

module.exports = auto;