import { NextRequest, NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { query, queryOne, rowsToCamel, toCamel } from "@/lib/db";
import { cacheDel, CacheKey } from "@/lib/redis";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET() {
  const user = await verifySession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const cats = await query(
    `SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order, name ASC`,
    [store.id],
  );

  const rows = cats as Record<string, unknown>[];
  const topLevel = rows.filter((r) => !r.parent_id);
  const nested = topLevel.map((cat) => ({
    ...cat,
    subcategories: rows.filter((r) => r.parent_id === cat.id),
  }));

  return NextResponse.json({ data: rowsToCamel(nested) });
}

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ error: "No store" }, { status: 404 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 422 },
    );

  const { name, parentId, sortOrder } = parsed.data;
  const parentIdValue = parentId ?? null;
  let slug = slugify(name);

  const exists = await queryOne(
    "SELECT id FROM categories WHERE store_id = $1 AND slug = $2 AND parent_id IS NOT DISTINCT FROM $3",
    [store.id, slug, parentIdValue],
  );
  if (exists) slug = `${slug}-${Date.now()}`;

  const rows = await query(
    `
    INSERT INTO categories (store_id, parent_id, name, slug, sort_order)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `,
    [store.id, parentIdValue, name, slug, sortOrder],
  );

  await cacheDel(CacheKey.categories(store.id));
  return NextResponse.json(
    { data: toCamel(rows[0] as Record<string, unknown>) },
    { status: 201 },
  );
}
