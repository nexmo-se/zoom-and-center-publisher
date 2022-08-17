const path = require('path')
const { defineConfig, loadEnv } = require('vite')
const env = loadEnv('../', process.cwd(), '')

module.exports = defineConfig(() => {

  let config = {
  root: path.join(__dirname, "./"),
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true
  }}
  if (env.ENV === "production") config["base"] =  "/zoom-and-center-publisher/"

  return config;
})
