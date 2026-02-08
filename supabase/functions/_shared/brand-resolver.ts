import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ResolvedBrand {
  brand_id: string;
  name: string;
  is_new: boolean;
  confidence: number;
}

/**
 * Wrapper around the `resolve_brand()` Postgres function.
 *
 * Attempts to match an existing brand by name, domain, or social handle.
 * If no match is found the RPC creates a new brand row and returns it
 * with `is_new = true`.
 *
 * @param supabase  - A Supabase client (typically service-role).
 * @param brandName - The brand / company name (required).
 * @param brandDomain - Optional website domain for matching.
 * @param brandHandle - Optional social media handle for matching.
 *
 * @returns The resolved brand record, or throws on RPC failure.
 */
export async function resolveBrand(
  supabase: SupabaseClient,
  brandName: string,
  brandDomain?: string,
  brandHandle?: string,
): Promise<ResolvedBrand> {
  const { data, error } = await supabase.rpc("resolve_brand", {
    p_brand_name: brandName,
    p_brand_domain: brandDomain ?? null,
    p_brand_handle: brandHandle ?? null,
  });

  if (error) {
    throw new Error(`resolve_brand RPC failed: ${error.message}`);
  }

  // The RPC returns a single composite row
  const row = Array.isArray(data) ? data[0] : data;

  return {
    brand_id: row.brand_id,
    name: row.name,
    is_new: row.is_new,
    confidence: row.confidence,
  };
}
