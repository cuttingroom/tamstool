const paginationFetcher = async (path, maxResults, api) => {
  const { get, endpoint } = api;
  let response = await get(path);
  let records = response.data;

  if (!Array.isArray(records)) {
    throw new Error("Unexpected response from TAMS store");
  }

  while (response.nextLink && (!maxResults || records.length < maxResults)) {
    const nextPath = response.nextLink.slice(endpoint.length);
    response = await get(nextPath);
    if (Array.isArray(response.data)) {
      records = records.concat(response.data);
    }
  }

  if (maxResults) {
    records = records.slice(0, maxResults);
  }

  // Remove segments_updated field from record if present. This is required to avoid excessive re-renders for the flows view.
  return records.map(({ segments_updated, ...remainder }) => remainder);
};

export default paginationFetcher;
