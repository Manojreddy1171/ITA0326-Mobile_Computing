import { Link } from 'react-router-dom';
import { Tag, Users, Package } from 'lucide-react';
import { formatINR } from '../lib/utils';

interface Product {
  id: number;
  uuid: string;
  name: string;
  brand?: string;
  unit: string;
  list_price: number;
  moq: number;
  is_negotiable: boolean;
  is_group_buy_enabled: boolean;
  cover_image?: string;
  category_name?: string;
  seller_name?: string;
  seller_city?: string;
  stock_quantity: number;
}

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const imgSrc = product.cover_image
    ? product.cover_image.startsWith('http')
      ? product.cover_image
      : product.cover_image
    : `https://picsum.photos/seed/${product.id + 100}/400/300`;

  return (
    <Link to={`/products/${product.id}`} className="product-card group block">
      {/* Image */}
      <div className="relative aspect-[4/3] img-zoom">
        <img
          src={imgSrc}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.id + 100}/400/300`;
          }}
        />
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_negotiable && (
            <span className="badge badge-orange text-[10px] shadow-lg">
              <Tag className="w-2.5 h-2.5" /> Negotiable
            </span>
          )}
          {product.is_group_buy_enabled && (
            <span className="badge badge-blue text-[10px] shadow-lg">
              <Users className="w-2.5 h-2.5" /> Group Deal
            </span>
          )}
        </div>
        {/* Stock badge */}
        {product.stock_quantity < 100 && (
          <div className="absolute bottom-2 right-2">
            <span className="badge badge-red text-[10px]">Low Stock</span>
          </div>
        )}
        {/* Category */}
        {product.category_name && (
          <div className="absolute bottom-2 left-2">
            <span className="badge badge-navy text-[10px] bg-black/50 border-transparent">
              {product.category_name}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-navy-400 font-medium mb-0.5 uppercase tracking-wide">
            {product.brand}
          </p>
        )}

        {/* Name */}
        <h3 className="text-sm font-semibold text-white leading-snug mb-2 line-clamp-2 group-hover:text-orange-300 transition-colors">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-lg font-display font-bold text-orange-400">
            {formatINR(product.list_price)}
          </span>
          <span className="text-xs text-navy-400">/{product.unit}</span>
        </div>

        {/* MOQ and seller */}
        <div className="flex items-center justify-between text-xs text-navy-400">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>MOQ: {product.moq}</span>
          </div>
          {product.seller_city && (
            <span className="text-navy-500 truncate max-w-[80px]">
              📍 {product.seller_city}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
