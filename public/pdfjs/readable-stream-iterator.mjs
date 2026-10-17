// Safari can't loop over a ReadableStream with `for await` (Chrome/Firefox can). pdf.js 6 does exactly that,
// which made PDF uploads fail on Safari / iPhone / iPad with "undefined is not a function (near '...t of e...')".
// This adds the missing piece; browsers that already have it are left alone.
if (typeof ReadableStream !== "undefined" && !(Symbol.asyncIterator in ReadableStream.prototype)) {
  ReadableStream.prototype[Symbol.asyncIterator] = async function* () {
    const reader = this.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}
