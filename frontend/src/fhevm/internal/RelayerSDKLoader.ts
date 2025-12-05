type TraceType = (message?: unknown, ...optionalParams: unknown[]) => void;

declare global {
  interface Window {
    relayerSDK?: any;
  }
}

export class RelayerSDKLoader {
  private _trace?: TraceType;
  private _url: string;
  constructor(options: { trace?: TraceType; url: string }) {
    this._trace = options.trace;
    this._url = options.url;
  }
  isLoaded() {
    return typeof window !== "undefined" && typeof window.relayerSDK === "object";
  }
  load(): Promise<void> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("RelayerSDKLoader: only in browser"));
    }
    if (this.isLoaded()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = this._url;
      script.async = true;
      script.onload = () => {
        if (!this.isLoaded()) {
          reject(new Error("RelayerSDKLoader: relayerSDK missing after load"));
          return;
        }
        resolve();
      };
      script.onerror = () => reject(new Error(`RelayerSDKLoader: failed ${this._url}`));
      document.head.appendChild(script);
    });
  }
}


