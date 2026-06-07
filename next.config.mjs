/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three / drei ship modern ESM that Next handles natively. If a CI build ever
  // trips on `three/examples/jsm/*`, uncomment the line below.
  // transpilePackages: ["three"],
};

export default nextConfig;
