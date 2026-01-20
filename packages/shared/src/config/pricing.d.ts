/**
 * Credit package pricing configuration
 * Hardcoded for simplicity - change here and redeploy to update pricing
 */
export declare const CREDIT_PACKAGES: readonly [
  {
    readonly id: "starter";
    readonly name: "Starter Pack";
    readonly description: "Perfect for trying out the platform";
    readonly credits: 100;
    readonly price: 999;
    readonly currency: "usd";
    readonly popular: false;
  },
  {
    readonly id: "professional";
    readonly name: "Professional Pack";
    readonly description: "Best value for regular users";
    readonly credits: 500;
    readonly price: 3999;
    readonly currency: "usd";
    readonly popular: true;
  },
  {
    readonly id: "enterprise";
    readonly name: "Enterprise Pack";
    readonly description: "For power users and teams";
    readonly credits: 1500;
    readonly price: 9999;
    readonly currency: "usd";
    readonly popular: false;
  },
];
export type CreditPackage = (typeof CREDIT_PACKAGES)[number];
/**
 * Helper to find package by ID
 */
export declare function getCreditPackage(packageId: string): CreditPackage | undefined;
/**
 * Helper to format price for display
 */
export declare function formatPrice(cents: number, currency: string): string;
//# sourceMappingURL=pricing.d.ts.map
