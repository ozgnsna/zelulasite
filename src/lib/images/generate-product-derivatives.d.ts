declare module "@/lib/images/generate-product-derivatives.mjs" {
  export const PRODUCT_IMAGE_BUCKET: string;

  export function buildDerivativeBuffers(
    bytes: Buffer | ArrayBuffer | Uint8Array,
  ): Promise<{ width: number; buffer: Buffer }[]>;

  export function uploadDerivativeBuffers(
    storage: { from: (bucket: string) => { upload: Function; remove: Function; getPublicUrl: Function } },
    objectPath: string,
    derivatives: { width: number; buffer: Buffer }[],
  ): Promise<number[]>;

  export function removeDerivativeSiblings(
    storage: { from: (bucket: string) => { remove: Function } },
    objectPathOrUrl: string,
  ): Promise<void>;

  export function mirrorRemoteProductImage(
    storage: { from: (bucket: string) => { upload: Function; getPublicUrl: Function } },
    productId: string,
    remoteUrl: string,
  ): Promise<{ publicUrl: string; derivativeWidths: number[] } | null>;
}
