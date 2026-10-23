// jpeg-js's decoder alone: its index.js also pulls in the encoder, which kittex doesn't need.
declare module 'jpeg-js/lib/decoder.js' {
  interface DecodeOptions {
    useTArray?: boolean
    formatAsRGBA?: boolean
    tolerantDecoding?: boolean
    maxResolutionInMP?: number
    maxMemoryUsageInMB?: number
    colorTransform?: boolean
  }
  interface Decoded {
    width: number
    height: number
    data: Uint8Array
  }
  function decode(data: Uint8Array, options?: DecodeOptions): Decoded
  export default decode
}
