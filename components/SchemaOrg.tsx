'use client';

import { useEffect } from 'react';

interface SchemaOrgProps {
  type: 'Organization' | 'WebSite' | 'Product';
  data: Record<string, unknown>;
}

export function SchemaOrg({ type, data }: SchemaOrgProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': type,
      ...data,
    });
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [type, data]);

  return null;
}
