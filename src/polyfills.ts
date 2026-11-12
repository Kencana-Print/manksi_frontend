if (!(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function () {
    let resolve!: (v?: unknown) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (!(Object as any).hasOwn) {
  (Object as any).hasOwn = (o: object, k: PropertyKey) =>
    Object.prototype.hasOwnProperty.call(o, k);
}

if (!(Array.prototype as any).at) {
  Object.defineProperty(Array.prototype, "at", {
    value(this: unknown[], n: number) {
      const i = Math.trunc(n) || 0;
      return this[i < 0 ? this.length + i : i];
    },
    writable: true,
    configurable: true,
  });
}
