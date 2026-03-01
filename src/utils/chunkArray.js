const chunkArray = (fullArray, chunkCount) => {
    const chunkSize = Math.ceil(fullArray.length / chunkCount);

    const chunks = fullArray.reduce((chunkedArray, item, index) => {
        const chunkIndex = Math.floor(index / chunkSize);
        if (!chunkedArray[chunkIndex]) {
            chunkedArray[chunkIndex] = [];
        }
        chunkedArray[chunkIndex].push(item);
        return chunkedArray;
    }, []);
    return chunks
}

export default chunkArray;
