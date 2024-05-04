import React from "react";

const YoutubeVideoEmbed = ({ videoLink }) => {
  const videoId = videoLink?.slice(32, 43);
  console.log(videoId);
  return (
    <iframe
      width="100%"
      height="400"
      src={`https://www.youtube.com/embed/${videoId}`}
      title="YouTube video player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>
  );
};

export default YoutubeVideoEmbed;
