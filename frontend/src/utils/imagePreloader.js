// Simple image preloader with concurrency and timeout to avoid memory spikes
export async function preloadImages(urls = [], { concurrency = 3, timeoutMs = 3000 } = {}) {
  const queue = [...urls];
  let active = 0;

  return new Promise((resolve) => {
    const results = [];

    function next() {
      if (queue.length === 0 && active === 0) {
        resolve(results);
        return;
      }

      while (active < concurrency && queue.length > 0) {
        const url = queue.shift();
        active++;

        const img = new Image();
        let finished = false;

        const onFinish = (ok) => {
          if (finished) return;
          finished = true;
          active--;
          results.push({ url, ok });
          next();
        };

        const t = setTimeout(() => onFinish(false), timeoutMs);
        img.onload = () => { clearTimeout(t); onFinish(true); };
        img.onerror = () => { clearTimeout(t); onFinish(false); };
        img.src = url;
      }
    }

    next();
  });
}

export default preloadImages;
