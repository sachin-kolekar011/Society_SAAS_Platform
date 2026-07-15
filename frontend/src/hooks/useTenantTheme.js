import { useEffect } from 'react';

// Phase 8 §1: tenant accent color is applied at runtime via CSS custom
// properties, never a hardcoded hex baked into a component. Every
// tenant-branded element in the app references var(--tenant-accent) --
// this hook is the one place that writes it.
export function useTenantTheme(tenant) {
  useEffect(() => {
    if (!tenant) return;
    document.documentElement.style.setProperty('--tenant-accent', tenant.primaryColor);
    document.documentElement.style.setProperty('--tenant-accent-secondary', tenant.secondaryColor);
  }, [tenant]);
}
