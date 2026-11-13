/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache Components (server-side caching) is turned off: this app keeps all data in the
  // browser's localStorage, so it has nothing to cache on the server, and Ant Design's
  // style registry is not compatible with Cache Components pre-rendering.
};

export default nextConfig;
