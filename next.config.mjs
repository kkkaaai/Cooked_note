/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
  webpack: (config, { dev }) => {
    config.resolve.alias.canvas = false;
    // Workaround for pdfjs-dist: its pdf.mjs is a pre-built webpack bundle
    // whose internal __webpack_require__ breaks with eval-based devtools
    // (webpack/webpack#20095, fixed in webpack 5.103.0 but not in Next.js 14)
    if (dev) {
      config.devtool = false;
      config.plugins.push({
        apply(compiler) {
          compiler.options.devtool = false;
        },
      });
    }
    return config;
  },
};

export default nextConfig;
