// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';

describe('organization logo on documents', () => {
  it('shows the organization initial, never the vendor logo, when no logo is uploaded', () => {
    const html = renderToStaticMarkup(<QuadCoreLogo size="md" src={null} alt="Atlas Conseil" brandName="Atlas Conseil" />);
    expect(html).toContain('>A<');
    expect(html).not.toMatch(/quadcore/i);
    // Couleur neutre par défaut (plus de violet d'un autre éditeur).
    expect(html).toContain('background:#23201d');
  });

  it('uses the organization color for the initial when set', () => {
    const html = renderToStaticMarkup(<QuadCoreLogo src={null} brandName="Nova" primaryColor="#1d4ed8" />);
    expect(html).toContain('background:#1d4ed8');
  });

  it('renders only the organization logo URL, with no vendor fallback in the chain', () => {
    const html = renderToStaticMarkup(<QuadCoreLogo src="https://cdn.example/logo.png" alt="Atlas" brandName="Atlas" />);
    expect(html).toContain('src="https://cdn.example/logo.png"');
    expect(html).not.toMatch(/quadcore/i);
  });
});
