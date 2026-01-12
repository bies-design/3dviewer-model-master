self.onmessage = async (e) => {
  const { file, origin } = e.data;
  if (!file || !origin) return;

  const chunkSize = 5 * 1024 * 1024; // 5MB
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadId;
  let fileName = file.name;

  try {
    // 1. Start multipart upload
    const startResponse = await fetch(`${origin}/api/models/r2-upload/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });
    const startData = await startResponse.json();
    if (!startResponse.ok) throw new Error(startData.error || 'Failed to start upload');
    uploadId = startData.uploadId;

    // 2. Upload parts in batches
    const batchSize = 8;
    let uploadedParts = [];
    for (let i = 0; i < totalChunks; i += batchSize) {
      const batch = [];
      for (let j = i; j < i + batchSize && j < totalChunks; j++) {
        const start = j * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const promise = (async () => {
          const partResponse = await fetch(`${origin}/api/models/r2-upload/part`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, uploadId, partNumber: j + 1 }),
          });
          const partData = await partResponse.json();
          if (!partResponse.ok) throw new Error(partData.error || 'Failed to get signed URL');
          const { signedUrl } = partData;

          const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: chunk,
          });

          const etag = uploadResponse.headers.get('ETag')?.replace(/"/g, "");
          self.postMessage({ type: 'progress', progress: ((j + 1) / totalChunks) * 100 });
          return { ETag: etag, PartNumber: j + 1 };
        })();
        batch.push(promise);
      }
      const batchResult = await Promise.all(batch);
      uploadedParts = uploadedParts.concat(batchResult);
    }

    // 3. Complete multipart upload
    const completeResponse = await fetch(`${origin}/api/models/r2-upload/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileName, 
        uploadId, 
        parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber) 
      }),
    });
    if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.error || 'Failed to complete upload');
    }

    self.postMessage({ type: 'complete', fileName: fileName });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
    if (uploadId) {
      await fetch(`${origin}/api/models/r2-upload/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, uploadId }),
      });
    }
  }
};
