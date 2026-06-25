export type ProductCategory =
  | 'training-treats'
  | 'daily-food'
  | 'supplements'
  | 'dental'
  | 'toys';

export type DemoProduct = {
  id: string;
  name: string;
  description: string;
  imagePath: string;   // path relative to /public, e.g. "/demo/products/pedigree-bites.jpg"
  amazonUrl: string;
  category: ProductCategory;
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'pedigree-training-bites',
    name: 'Pedigree Training Bites',
    description: 'Chicken · 125g · Low calorie',
    imagePath: '/demo/products/pedigree-training-bites.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=pedigree+training+bites',
    category: 'training-treats',
  },
  {
    id: 'royal-canin-mini-treats',
    name: 'Royal Canin Mini Treats',
    description: 'Liver flavour · 90g · Vet recommended',
    imagePath: '/demo/products/royal-canin-mini-treats.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=royal+canin+mini+treats',
    category: 'training-treats',
  },
  {
    id: 'hills-science-plan-puppy',
    name: "Hill's Science Plan Puppy",
    description: 'Chicken · 3kg · Complete nutrition',
    imagePath: '/demo/products/hills-science-plan-puppy.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=hills+science+plan+puppy',
    category: 'daily-food',
  },
  {
    id: 'yumove-joint-supplement',
    name: 'YuMOVE Joint Supplement',
    description: 'Tablets · 60 count · With glucosamine',
    imagePath: '/demo/products/yumove-joint-supplement.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=yumove+joint+supplement+dog',
    category: 'supplements',
  },
  {
    id: 'pedigree-dentastix',
    name: 'Pedigree Dentastix',
    description: 'Daily dental chews · 28 sticks · Medium/Large',
    imagePath: '/demo/products/pedigree-dentastix.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=pedigree+dentastix',
    category: 'dental',
  },
  {
    id: 'kong-classic',
    name: 'KONG Classic',
    description: 'Natural rubber · Stuffable · Size L',
    imagePath: '/demo/products/kong-classic.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=kong+classic+dog+toy+large',
    category: 'toys',
  },
];

export const PRODUCTS_BY_CATEGORY: Record<ProductCategory, DemoProduct[]> = {
  'training-treats': DEMO_PRODUCTS.filter(p => p.category === 'training-treats'),
  'daily-food':      DEMO_PRODUCTS.filter(p => p.category === 'daily-food'),
  'supplements':     DEMO_PRODUCTS.filter(p => p.category === 'supplements'),
  'dental':          DEMO_PRODUCTS.filter(p => p.category === 'dental'),
  'toys':            DEMO_PRODUCTS.filter(p => p.category === 'toys'),
};
