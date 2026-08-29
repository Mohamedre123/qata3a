/**
 * كل الاتصالات تمرّ على سيرفرنا (/api) — الواجهة لا تعرف مفتاح صفقة إطلاقًا.
 * (منصة صفقة أصلًا لا تسمح باستدعاء الـ API من نطاق خارجي في المتصفح.)
 */
import { useCallback, useEffect, useState } from "react";

export type Pricing = {
  sell: number;
  compareAt: number;
  save: number;
  currency: string;
  maxQty: number;
};

export type ProductFaq = { _id?: string; question: string; answer: string };

export type Storefront = {
  connected: boolean;
  source: "safka" | "fallback" | "error";
  pricing: Pricing;
  message?: string;
  product: {
    id: string;
    name: string;
    barcode: string | null;
    description: string;
    images: string[];
    faqs: ProductFaq[];
    propertyId: string | null;
    propertyName: string | null;
    inStock: boolean;
  } | null;
};

export type City = { id: string; nameAr: string; nameEn: string };
export type Governorate = { id: string; nameAr: string; nameEn: string; price: number; cities: City[] };
export type ShippingResponse = { source: string; connected: boolean; error?: string; governorates: Governorate[] };

export type OrderInput = {
  name: string;
  phone1: string;
  phone2?: string;
  address: string;
  governorateId: string;
  cityId?: string;
  qty: number;
  note?: string;
};

export type OrderResult = {
  success: true;
  pendingSync: boolean;
  reference: string;
  orderId?: string | null;
  status?: string;
  summary: { qty: number; unitPrice: number; subtotal: number; shipping: number; total: number };
};

export class ApiError extends Error {
  errors: string[];
  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.errors = errors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      (body as { error?: string })?.error || "حدث خطأ غير متوقع. برجاء المحاولة مرة أخرى.",
      (body as { errors?: string[] })?.errors ?? [],
    );
  }
  return body as T;
}

export const getStorefront = () => request<Storefront>("/storefront");
export const getShipping = () => request<ShippingResponse>("/shipping");
export const submitOrder = (input: OrderInput) =>
  request<OrderResult>("/orders", { method: "POST", body: JSON.stringify(input) });

/** التسعير الافتراضي — يظهر فورًا قبل وصول رد السيرفر فلا ترتجّ الصفحة. */
export const DEFAULT_PRICING: Pricing = {
  sell: 590,
  compareAt: 700,
  save: 110,
  currency: "EGP",
  maxQty: 10,
};

type AsyncState<T> = { data: T | null; loading: boolean; error: string | null };

function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: true }));

    loader()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error: Error) => alive && setState({ data: null, loading: false, error: error.message }));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

export function useStorefront() {
  const state = useAsync(getStorefront);
  return { ...state, pricing: state.data?.pricing ?? DEFAULT_PRICING };
}

export function useShipping() {
  return useAsync(getShipping);
}

/** تنسيق السعر بأرقام لاتينية واضحة. */
export function egp(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} جنيه`;
}
