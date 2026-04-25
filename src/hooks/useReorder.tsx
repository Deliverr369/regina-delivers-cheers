import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";

interface OrderItemRow {
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
}

interface OrderRow {
  id: string;
  store_id: string | null;
  stores?: { name?: string | null } | null;
  order_items?: OrderItemRow[];
}

/**
 * Re-add the items from a past order to the cart and navigate to /cart.
 * Skips items whose product no longer exists / is hidden.
 */
export const useReorder = () => {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const reorder = async (order: OrderRow) => {
    if (!order.order_items || order.order_items.length === 0) {
      toast.error("This order has no items to re-add.");
      return;
    }

    const productIds = order.order_items
      .map((i) => i.product_id)
      .filter((id): id is string => !!id);

    // Look up current products to get fresh price + image, and confirm availability.
    const { data: liveProducts } = await supabase
      .from("products")
      .select("id, name, price, image_url, store_id, in_stock, is_hidden")
      .in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);

    const liveMap = new Map((liveProducts ?? []).map((p) => [p.id, p]));

    let added = 0;
    let unavailable = 0;
    const storeName = order.stores?.name ?? "Store";

    for (const item of order.order_items) {
      const live = item.product_id ? liveMap.get(item.product_id) : null;
      if (!live || live.is_hidden || live.in_stock === false) {
        unavailable++;
        continue;
      }
      // Add the desired quantity (addToCart adds 1 at a time)
      for (let i = 0; i < item.quantity; i++) {
        addToCart({
          id: live.id,
          name: live.name,
          price: Number(live.price),
          image: live.image_url ?? "",
          storeId: live.store_id,
          storeName,
        });
      }
      added++;
    }

    if (added === 0) {
      toast.error("None of these items are available right now.");
      return;
    }

    haptics.success();
    if (unavailable > 0) {
      toast.success(`Re-added ${added} item${added === 1 ? "" : "s"}.`, {
        description: `${unavailable} item${unavailable === 1 ? "" : "s"} no longer available were skipped.`,
      });
    } else {
      toast.success(`Re-added ${added} item${added === 1 ? "" : "s"} to your cart.`);
    }
    navigate("/cart");
  };

  return { reorder };
};
