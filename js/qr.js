let stream = null;
let scanning = false;

async function startScan(videoEl, canvasEl, onResult, onError) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
  } catch (err) {
    onError(err);
    return;
  }

  videoEl.srcObject = stream;
  await videoEl.play();

  scanning = true;
  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });

  const tick = () => {
    if (!scanning) return;
    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      const code = window.jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        onResult(code.data);
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function stopScan() {
  scanning = false;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

export { startScan, stopScan };
