const YoutubeVideoEmbed = ({ videoLink }) => {
  const videoId = videoLink?.slice(32, 43);
  if (!videoId) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default YoutubeVideoEmbed;
