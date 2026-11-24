import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Las claves de Pusher son públicas por diseño: la clave y el clúster viajan
  // al navegador, el secreto se queda en el servidor. Se reexponen con el
  // prefijo NEXT_PUBLIC_ para que el cliente conecte el canal de presencia;
  // sin ellas el cliente cae a Socket.io, que solo existe en local.
  env: {
    NEXT_PUBLIC_PUSHER_KEY: process.env.PUSHER_KEY ?? '',
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.PUSHER_CLUSTER ?? 'eu',
  },
}

export default nextConfig
