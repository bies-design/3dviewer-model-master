/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-1fe9b74c6c1d42e8bcfccb80345f6f29.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // This is to solve the "Module not found: Can't resolve 'canvas'" error for react-pdf and pdfjs-dist
    // We can either alias it to false or add it to externals. Externals is a cleaner way.
    config.externals.push("canvas");
    
    // In case you're using Next.js 14+, you might need this to handle pdf.worker.js
    config.module.rules.push({
      test: /pdf\.worker\.min\.js$/,
      type: "asset/resource",
      generator: {
        filename: "static/chunks/[name].[hash][ext]",
      },
    });

    return config;
  },
};

module.exports = nextConfig;
