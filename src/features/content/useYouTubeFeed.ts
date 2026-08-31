import { useQuery } from '@tanstack/react-query';

import { fetchChannelVideos, YOUTUBE_CHANNELS, type YouTubeVideo } from '@/services/youtube';

/**
 * Every recent upload across the station's channels, merged newest-first.
 *
 * `staleTime: 0` with `refetchOnMount: 'always'` is a deliberate override of
 * the five-minute default in `queryClient`: this screen is expected to be
 * current whenever the app is relaunched or the listener pulls to refresh. The
 * persisted cache still paints the previous result on the first frame, so the
 * refetch happens behind content rather than behind a spinner.
 *
 * `allSettled` rather than `all`: one channel being unreachable, renamed or
 * deleted must not blank out the other two. Only a total failure — every
 * channel down, which in practice means the device is offline — surfaces as an
 * error the user can retry.
 */
export function useYouTubeFeed() {
  return useQuery({
    queryKey: ['youtube', 'feed'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async (): Promise<YouTubeVideo[]> => {
      const results = await Promise.allSettled(
        YOUTUBE_CHANNELS.map((channel) => fetchChannelVideos(channel))
      );

      const reached = results.filter(
        (result): result is PromiseFulfilledResult<YouTubeVideo[]> => result.status === 'fulfilled'
      );

      if (!reached.length) {
        const reasons = results
          .map((result) => (result.status === 'rejected' ? String(result.reason) : ''))
          .filter(Boolean)
          .join('; ');
        throw new Error(`No channel could be reached. ${reasons}`);
      }

      return reached
        .flatMap((result) => result.value)
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    },
  });
}
