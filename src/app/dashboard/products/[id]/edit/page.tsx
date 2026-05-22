import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { verifySession, getUserStore } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import type { Product } from "@/types";
import EditProductForm from "./EditProductForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Edit product · ${id}` };
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/onboarding");

  const product = await queryOne<Product>(
    "SELECT * FROM products WHERE id = $1 AND store_id = $2",
    [id, store.id]
  );
  if (!product) notFound();

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/dashboard/products"
          className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Edit product</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 truncate max-w-xs">
            {product.name}
          </p>
        </div>
      </div>

      <EditProductForm product={product} />
    </div>
  );
}
