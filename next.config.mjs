/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'c.saavncdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'aac.saavncdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
