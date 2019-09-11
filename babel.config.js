module.exports = {
  comments: false,
  presets: ["@babel/preset-env", "minify"],
  plugins: [["@babel/plugin-transform-runtime", { regenerator: true }]]
};
