import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['core/test/**/*.test.ts'],
    server: {
      deps: {
        // The built bundle (plugin/hooks/core.js and its chain of parts) is
        // loaded by Node itself, as the engine loads it: Vite's transform
        // would turn every name a part passes on with `export *` into a getter
        // per part it crosses, a cost no runtime of the mod has.
        external: [/\/plugin\/hooks\/core(\.js|-parts\/)/],
      },
    },
  },
})
