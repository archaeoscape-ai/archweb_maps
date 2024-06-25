import path from 'path'
export default {
  build: {
    sourcemap: true,
  },
  server: {
      watch: {
        ignored: [path.resolve(__dirname, './gis')]
      },
  },
}
