import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from './ui/Card';
import type { Product } from '@/types';

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const lowStock = product.stockQuantity <= 5;

  return (
    <Card onPress={onPress} padding={14}>
      <View style={styles.row}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Package size={20} color={Colors.surface[400]} />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          {product.categoryName && (
            <Text style={styles.category}>{product.categoryName}</Text>
          )}
          <View style={styles.footer}>
            <Text style={styles.price}>{fmt(product.price)}</Text>
            <View style={[styles.stockBadge, lowStock && styles.stockBadgeLow]}>
              <Text style={[styles.stockText, lowStock && styles.stockTextLow]}>
                {product.stockQuantity} in stock
              </Text>
            </View>
          </View>
        </View>

        {!product.isActive && (
          <View style={styles.hiddenBadge}>
            <Text style={styles.hiddenText}>HIDDEN</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.surface[100],
  },
  imagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.surface[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface[900],
  },
  category: {
    fontSize: 11,
    color: Colors.surface[400],
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.surface[900],
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
  },
  stockBadgeLow: {
    backgroundColor: '#fee2e2',
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  stockTextLow: {
    color: '#991b1b',
  },
  hiddenBadge: {
    backgroundColor: Colors.surface[100],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hiddenText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.surface[500],
  },
});
