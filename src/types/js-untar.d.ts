declare module 'js-untar' {
  export interface TarFile {
    name: string
    mode: string
    uid: number
    gid: number
    size: number
    mtime: string
    checksum: number
    type: string
    linkname: string
    ustarFormat: string
    version: string
    uname: string
    gname: string
    devmajor: number
    devminor: number
    namePrefix: string
    buffer: ArrayBuffer
    blob: Blob
    readAsString(): string
    readAsJson(): unknown
  }

  declare function untar(arrayBuffer: ArrayBuffer): Promise<TarFile[]>

  export default untar
}
