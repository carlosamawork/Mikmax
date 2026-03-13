const path = require('path');
/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
      SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
      SHOPIFY_STOREFRONT_ACCESSTOKEN: process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN,
    },
    images: {
      minimumCacheTTL: 2592000,
      remotePatterns: [
        {
          protocol: "https",
          hostname: "cdn.sanity.io",
        },
        {
          protocol: "https",
          hostname: "cdn.shopify.com",
        },
      ],
    },
    sassOptions: {
      includePaths: [path.join(__dirname, 'styles')],
    },
    reactStrictMode: false,
    trailingSlash: true,
    
  };

module.exports = nextConfig
