export function summarizeVideos(videos) {
  const count = typeof videos === 'number' ? videos : videos.length;
  return count === 0 ? 'No videos found' : `${count} video${count === 1 ? '' : 's'} found`;
}
