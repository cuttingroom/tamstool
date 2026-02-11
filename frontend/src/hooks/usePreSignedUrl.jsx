import useSWR from "swr";
import { getLambdaSignedUrl } from "@/utils/getLambdaSignedUrl";
import { AWS_HLS_FUNCTION_URL } from "@/constants";

const fetcher = ({ path, expiry }) =>
  getLambdaSignedUrl(AWS_HLS_FUNCTION_URL, path, expiry);

export const usePresignedUrl = (type, id) => {
  const credentials = useAwsCredentials();
  const { data, error, isLoading } = useSWR(
    type && id
      ? {
          path: `/${type}/${id}/manifest.m3u8`,
          expiry: 3600,
          credentials,
        }
      : null,
    fetcher
  );

  return {
    url: data,
    isLoading,
    error,
  };
};
