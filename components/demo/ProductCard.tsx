'use client';

import type { DemoProduct } from '@/lib/demo/products';

interface Props {
  products: DemoProduct[];
  puppyName: string;
}

export default function ProductCard({ products, puppyName }: Props) {
  if (products.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="h-px bg-[#F0EDF8] mb-3" />
      <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-accent mb-2">
        Recommended for {puppyName}
      </p>
      <div className="flex flex-col gap-2">
        {products.slice(0, 3).map((product) => (
          <a
            key={product.id}
            href={product.amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#F8F6FF] rounded-[12px] p-3 no-underline"
          >
            <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-lavender flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imagePath}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-text-primary truncate">{product.name}</p>
              <p className="text-[11px] text-text-secondary mt-0.5">{product.description}</p>
              <p className="text-[11px] font-semibold text-accent mt-1">Shop on Amazon →</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
