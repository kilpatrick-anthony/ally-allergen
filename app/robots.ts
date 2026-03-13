import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/super-admin/', '/kiosk/'],
      },
    ],
    sitemap: 'https://allyjen.ie/sitemap.xml',
  }
}
