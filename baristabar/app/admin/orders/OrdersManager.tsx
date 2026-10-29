"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

interface OrderItem {
  id: string;
  type: "product" | "beanbox";
  name: string;
  slug: string;
  boxSlug: string | null;
  configurationLabel: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

interface AdminOrder {
  id: string;
  createdAt: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingGovernorate: string | null;
  shippingCity: string;
  shippingPostalCode: string | null;
  shippingNotes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  currency: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  items: OrderItem[];
}

interface OrdersResponse {
  success: boolean;
  data?: AdminOrder[];
  message?: string;
}

interface StatusUpdateResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: string;
    status: OrderStatus;
  };
}

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function isOrderStatus(value: string): value is OrderStatus {
  return Object.prototype.hasOwnProperty.call(
    ORDER_STATUS_LABELS,
    value,
  );
}

function formatMoney(value: number | string): string {
  const amount = Number(value);

  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClass(status: string): string {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-800";

    case "cancelled":
      return "bg-red-100 text-red-800";

    case "shipped":
      return "bg-blue-100 text-blue-800";

    case "processing":
      return "bg-purple-100 text-purple-800";

    case "confirmed":
      return "bg-sky-100 text-sky-800";

    default:
      return "bg-amber-100 text-amber-800";
  }
}

function paymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    unpaid: "Non payée",
    paid: "Payée",
    failed: "Échec",
    refunded: "Remboursée",
  };

  return labels[status] ?? status;
}

export function OrdersManager() {
  const router = useRouter();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null,
  );
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    null,
  );
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(
    null,
  );

  const handleAuthorizationFailure = useCallback(
    (status: 401 | 403) => {
      router.replace(
        status === 401 ? "/admin/login" : "/admin/unauthorized",
      );
      router.refresh();
    },
    [router],
  );

  const getAccessToken = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      handleAuthorizationFailure(401);
      return null;
    }

    return session.access_token;
  }, [handleAuthorizationFailure]);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) return;

      const response = await fetch("/api/admin/orders", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthorizationFailure(response.status);
        return;
      }

      const result = (await response.json().catch(() => null)) as
        | OrdersResponse
        | null;

      if (
        !response.ok ||
        result?.success !== true ||
        !Array.isArray(result.data)
      ) {
        setErrorMessage(
          result?.message ??
            "Impossible de charger les commandes. Réessaie.",
        );
        return;
      }

      setOrders(result.data);
    } catch (error) {
      console.error("Failed to load admin orders:", error);

      setErrorMessage(
        "Impossible de contacter le serveur. Vérifie ta connexion.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, handleAuthorizationFailure]);

  const updateOrderStatus = useCallback(
    async (order: AdminOrder, newStatus: OrderStatus) => {
      if (updatingOrderId !== null) return;

      if (order.status === newStatus) return;

      const allowedStatuses = isOrderStatus(order.status)
        ? NEXT_STATUSES[order.status]
        : [];

      if (!allowedStatuses.includes(newStatus)) {
        setErrorMessage(
          "Cette transition de statut n'est pas autorisée.",
        );
        return;
      }

      if (newStatus === "cancelled") {
        const confirmed = window.confirm(
          "Confirmer l'annulation de cette commande ? Le stock des produits et des composants BeanBox sera restauré.",
        );

        if (!confirmed) return;
      }

      setUpdatingOrderId(order.id);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const accessToken = await getAccessToken();

        if (!accessToken) return;

        const response = await fetch(
          `/api/admin/orders/${encodeURIComponent(order.id)}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: newStatus,
            }),
            cache: "no-store",
          },
        );

        if (response.status === 401 || response.status === 403) {
          handleAuthorizationFailure(response.status);
          return;
        }

        const result = (await response.json().catch(() => null)) as
          | StatusUpdateResponse
          | null;

        if (
          !response.ok ||
          result?.success !== true ||
          !result.data ||
          result.data.id !== order.id ||
          !isOrderStatus(result.data.status)
        ) {
          setErrorMessage(
            result?.message ??
              "Impossible de modifier le statut de la commande.",
          );
          return;
        }

        setOrders((currentOrders) =>
          currentOrders.map((currentOrder) =>
            currentOrder.id === order.id
              ? {
                  ...currentOrder,
                  status: result.data!.status,
                }
              : currentOrder,
          ),
        );

        setSuccessMessage(
          result.data.status === "cancelled"
            ? "Commande annulée. Le stock a été restauré par le serveur."
            : `Statut de la commande mis à jour : ${
                ORDER_STATUS_LABELS[result.data.status]
              }.`,
        );
      } catch (error) {
        console.error("Failed to update order status:", error);

        setErrorMessage(
          "Impossible de contacter le serveur pour modifier le statut.",
        );
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [
      getAccessToken,
      handleAuthorizationFailure,
      updatingOrderId,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Commandes</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Consulte les commandes enregistrées et leurs informations
            de livraison.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={isLoading || updatingOrderId !== null}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Chargement..." : "Actualiser"}
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">
          Chargement des commandes...
        </div>
      ) : !errorMessage && orders.length === 0 ? (
        <div className="rounded-xl border bg-background p-8 text-center">
          <h3 className="font-semibold">
            Aucune commande enregistrée
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Les simulations du checkout ne créent pas de commandes
            réelles. Les commandes apparaîtront ici après leur
            enregistrement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;

            const nextStatuses: OrderStatus[] = isOrderStatus(
              order.status,
            )
              ? NEXT_STATUSES[order.status]
              : [];

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-xl border bg-background"
              >
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold">
                      Commande #{order.id}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>

                    <p className="mt-2 font-medium">
                      {order.customerName}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {order.customerEmail}
                    </p>

                    <p className="mt-1 text-sm">
                      {order.customerPhone}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                        order.status,
                      )}`}
                    >
                      {isOrderStatus(order.status)
                        ? ORDER_STATUS_LABELS[order.status]
                        : order.status}
                    </span>

                    <div className="sm:text-right">
                      <p className="text-lg font-semibold">
                        {formatMoney(order.total)}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {paymentStatusLabel(order.paymentStatus)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrderId(
                          isExpanded ? null : order.id,
                        )
                      }
                      aria-expanded={isExpanded}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
                      {isExpanded
                        ? "Masquer les détails"
                        : "Voir les détails"}
                    </button>

                    <label className="block min-w-45">
                      <span className="sr-only">
                        Modifier le statut de la commande {order.id}
                      </span>

                      <select
                        key={order.status}
                        defaultValue=""
                        disabled={
                          updatingOrderId !== null ||
                          nextStatuses.length === 0
                        }
                        onChange={(event) => {
                          const selectedStatus = event.target.value;

                          // Réinitialiser le select après chaque choix.
                          event.target.value = "";

                          if (
                            isOrderStatus(selectedStatus) &&
                            nextStatuses.includes(selectedStatus)
                          ) {
                            void updateOrderStatus(
                              order,
                              selectedStatus,
                            );
                          }
                        }}
                        className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">
                          {updatingOrderId === order.id
                            ? "Mise à jour..."
                            : nextStatuses.length > 0
                              ? "Modifier le statut..."
                              : "Aucune action disponible"}
                        </option>

                        {nextStatuses.map((status) => (
                          <option key={status} value={status}>
                            {ORDER_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-6 border-t bg-muted/20 p-5">
                    <section>
                      <h3 className="font-semibold">
                        Informations de livraison
                      </h3>

                      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-muted-foreground">
                            Gouvernorat
                          </dt>

                          <dd className="mt-1">
                            {order.shippingGovernorate ||
                              "Non renseigné"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-muted-foreground">
                            Ville / délégation
                          </dt>

                          <dd className="mt-1">
                            {order.shippingCity}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-muted-foreground">
                            Adresse
                          </dt>

                          <dd className="mt-1">
                            {order.shippingAddress}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-muted-foreground">
                            Code postal
                          </dt>

                          <dd className="mt-1">
                            {order.shippingPostalCode ||
                              "Non renseigné"}
                          </dd>
                        </div>

                        {order.shippingNotes && (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground">
                              Instructions de livraison
                            </dt>

                            <dd className="mt-1 whitespace-pre-wrap">
                              {order.shippingNotes}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </section>

                    <section>
                      <h3 className="font-semibold">
                        Articles commandés
                      </h3>

                      {order.items.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Aucun article n&apos;est associé à cette
                          commande.
                        </p>
                      ) : (
                        <div className="mt-3 overflow-x-auto rounded-lg border bg-background">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3 font-medium">
                                  Article
                                </th>

                                <th className="px-4 py-3 font-medium">
                                  Quantité
                                </th>

                                <th className="px-4 py-3 font-medium">
                                  Prix unitaire
                                </th>

                                <th className="px-4 py-3 font-medium">
                                  Total
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y">
                              {order.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-3">
                                    <p className="font-medium">
                                      {item.name}
                                    </p>

                                    {item.type === "beanbox" &&
                                      item.configurationLabel && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {item.configurationLabel}
                                        </p>
                                      )}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3">
                                    {item.quantity}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3">
                                    {formatMoney(item.unitPrice)}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                                    {formatMoney(item.lineTotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    <section className="rounded-lg border bg-background p-4">
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Sous-total
                        </span>

                        <span>{formatMoney(order.subtotal)}</span>
                      </div>

                      <div className="mt-2 flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Livraison
                        </span>

                        <span>{formatMoney(order.deliveryFee)}</span>
                      </div>

                      <div className="mt-3 flex justify-between gap-4 border-t pt-3 font-semibold">
                        <span>Total</span>
                        <span>{formatMoney(order.total)}</span>
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        Mode de paiement :{" "}
                        {order.paymentMethod === "cash_on_delivery"
                          ? "Paiement à la livraison"
                          : order.paymentMethod}
                      </p>
                    </section>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}