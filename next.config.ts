import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimmg.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['twitter-api-v2'],
  },
  webpack: (config) => {
    // Ayuda a resolver problemas de módulos externos
    config.externals = [...(config.externals || []), {
      'twitter-api-v2': 'twitter-api-v2',
    }];
    return config;
  },
};

export default nextConfig;
