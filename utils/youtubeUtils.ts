
export const extractVideoId = (url: string): string | null => {
  if (!url) return null;

  // Standard YouTube URLs:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://m.youtube.com/watch?v=VIDEO_ID
  // https://www.youtube.com/v/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  // Shortened YouTube URLs:
  // https://youtu.be/VIDEO_ID
  // YouTube Shorts URLs:
  // https://www.youtube.com/shorts/VIDEO_ID
  // YouTube Live URLs:
  // https://www.youtube.com/live/VIDEO_ID?si=XXXX
  // Music URLs:
  // https://music.youtube.com/watch?v=VIDEO_ID

  const regexes = [
    /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=))([a-zA-Z0-9_-]{11})/, // General YouTube links
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/, // youtu.be links
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/, // Shorts links
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/ // Live links
  ];

  for (const regex of regexes) {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If URL itself is just an ID
  if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return null;
};
