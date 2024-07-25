import path from 'path'
export default {
  base: "/archweb_maps/",
  build: {
    sourcemap: true,
  },
  server: {
      watch: {
        ignored: [path.resolve(__dirname, './gis')]
      },
  },
}
