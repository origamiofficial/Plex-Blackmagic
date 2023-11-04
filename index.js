addEventListener("fetch", (event) => {
  event.passThroughOnException();
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  let request = event.request;

  // Parse request URL to get access to query string
  let url = new URL(request.url);

  // Allow modifications of params
  let params = new URLSearchParams(url.searchParams);

  // If we have a video resolution of 1080... lets delete it
  let video_resolution = params.get("videoResolution");
  if (video_resolution && video_resolution.includes("1080"))
    params.delete("videoResolution");

  // Grab the video stream bitrates
  let video_bitrate = parseInt(params.get("videoBitrate")) || 0;
  let mvideo_bitrate = parseInt(params.get("maxVideoBitrate")) || 0;

  // If we are transcoding to less than 12mbps, lets update to our desired bitrate
  if (video_bitrate > 0 && video_bitrate <= 12000)
    params.set("videoBitrate", PLEX_DESIRED_BITRATE);
  if (mvideo_bitrate > 0 && mvideo_bitrate <= 12000)
    params.set("maxVideoBitrate", PLEX_DESIRED_BITRATE);

  // If we actually modified the bitrates to our desired bitrates
  const modified_bitrates =
    params.get("videoBitrate") === PLEX_DESIRED_BITRATE ||
    params.get("maxVideoBitrate") === PLEX_DESIRED_BITRATE;

  // Client extras can still have a bitrate... lets modify that too
  let client_extras = params.get("X-Plex-Client-Profile-Extra");
  if (client_extras && modified_bitrates) {
    client_extras = client_extras.replace(
      /name=video.bitrate&value=[^&]+/gi,
      `name=video.bitrate&value=${PLEX_DESIRED_BITRATE}`
    );
    params.set("X-Plex-Client-Profile-Extra", client_extras);
  }

  // Set back our new modified search params
  url.search = params;

  // Create the new request and pipe it!
  request = new Request(url, request);
  return fetch(request);
}
