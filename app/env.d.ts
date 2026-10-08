/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.mjs' {
  export function parseAndWriteStories(): Array<{
    slug: string
    pageCount: number
    outFile: string
  }>
}

declare module 'virtual:media-manifest' {
  const hashes: Record<string, string>
  export default hashes
}
