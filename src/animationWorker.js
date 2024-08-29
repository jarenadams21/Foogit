/* eslint-disable no-restricted-globals */

self.onmessage = function (e) {
    const { imageData, frameIndex } = e.data;
  
    // Perform heavy processing here, like generating frames
    const processedData = imageData; // This would be your processed frame data
  
    // Post the processed frame data back to the main thread
    self.postMessage({ frameIndex, processedData });
  };
  