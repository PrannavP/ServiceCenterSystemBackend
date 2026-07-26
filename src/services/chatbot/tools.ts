
import { db } from "../../config/database.js";
import type { ChatCard, ChatAction, ToolResult } from "../../interfaces/app/chatbot/chatbot.interface.js";

const money = (n: number): string =>
    "Rs. " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function jobcardStats(): Promise<ToolResult> {
    const totalsQ = `
        SELECT
            COUNT(*)                                       AS total,
            COUNT(*) FILTER (WHERE is_active = TRUE)       AS active,
            COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS today
        FROM app.tbl_jobcard
        WHERE is_deleted = FALSE;
    `;
    const recentQ = `
        SELECT id, customer_name, vehicle_registration_number, created_at
        FROM app.tbl_jobcard
        WHERE is_deleted = FALSE
        ORDER BY created_at DESC
        LIMIT 5;
    `;

    const [totals, recent] = await Promise.all([db.query(totalsQ), db.query(recentQ)]);
    const t = totals.rows[0] ?? { total: 0, active: 0, today: 0 };

    const cards: ChatCard[] = [
        {
            type: "stat",
            title: "Job Cards",
            stats: [
                { label: "Total", value: Number(t.total) },
                { label: "Active", value: Number(t.active) },
                { label: "Created today", value: Number(t.today) },
            ],
        },
    ];

    if (recent.rows.length > 0) {
        cards.push({
            type: "list",
            title: "Latest job cards",
            rows: recent.rows.map((r: any) => ({
                "#": r.id,
                Customer: r.customer_name ?? "—",
                Vehicle: r.vehicle_registration_number ?? "—",
            })),
        });
    }

    const actions: ChatAction[] = [
        { label: "View job cards", path: "/app/jobcard" },
        { label: "New job card", path: "/app/jobcard/manage" },
    ];

    return {
        summary: `There are ${Number(t.total)} job cards in total — ${Number(t.active)} active, and ${Number(
            t.today
        )} created today.`,
        cards,
        actions,
        suggestions: ["Create a job card", "Show low stock parts", "Revenue this month"],
        facts: { totalJobcards: Number(t.total), activeJobcards: Number(t.active), createdToday: Number(t.today) },
    };
}

interface StockRow {
    part_id: number;
    part_name: string;
    rate: string | number;
    available_qty: string | number;
}

async function fetchStock(): Promise<StockRow[]> {
    const q = `SELECT part_id, part_name, rate, available_qty FROM inv.fn_get_part_available_stock();`;
    const res = await db.query<StockRow>(q);
    return res.rows;
}

export async function partsOverview(): Promise<ToolResult> {
    const stock = await fetchStock();
    const inStock = stock.filter((s) => Number(s.available_qty) > 0);
    const out = stock.filter((s) => Number(s.available_qty) <= 0);

    const cards: ChatCard[] = [
        {
            type: "stat",
            title: "Inventory",
            stats: [
                { label: "Parts", value: stock.length },
                { label: "In stock", value: inStock.length },
                { label: "Out of stock", value: out.length },
            ],
        },
    ];

    return {
        summary: `You have ${stock.length} parts in the catalogue — ${inStock.length} in stock and ${out.length} out of stock.`,
        cards,
        actions: [{ label: "Open parts", path: "/inv/part" }],
        suggestions: ["Show low stock parts", "Add a receipt", "Do we have brake pads?"],
        facts: { totalParts: stock.length, inStock: inStock.length, outOfStock: out.length },
    };
}

export async function lowStock(threshold = 5): Promise<ToolResult> {
    const stock = await fetchStock();
    const low = stock
        .filter((s) => Number(s.available_qty) <= threshold)
        .sort((a, b) => Number(a.available_qty) - Number(b.available_qty))
        .slice(0, 8);

    if (low.length === 0) {
        return {
            summary: `Good news — every part is above the low-stock threshold of ${threshold} units.`,
            cards: [],
            actions: [{ label: "Open parts", path: "/inv/part" }],
            suggestions: ["Parts overview", "Add a receipt"],
            facts: { threshold, lowStockCount: 0 },
        };
    }

    const cards: ChatCard[] = [
        {
            type: "part",
            title: `Low stock (≤ ${threshold})`,
            rows: low.map((s) => ({ Part: s.part_name, Available: Number(s.available_qty), Rate: money(Number(s.rate)) })),
        },
    ];

    return {
        summary: `${low.length} part(s) are at or below ${threshold} units and may need restocking soon.`,
        cards,
        actions: [{ label: "New receipt", path: "/inv/receipt/manage" }],
        suggestions: ["Add a receipt", "Parts overview"],
        facts: { threshold, lowStockCount: low.length, items: low.map((s) => ({ name: s.part_name, qty: Number(s.available_qty) })) },
    };
}

export async function searchPart(term: string): Promise<ToolResult> {
    const stock = await fetchStock();
    const needle = term.trim().toLowerCase();
    const matches = stock
        .filter((s) => (s.part_name ?? "").toLowerCase().includes(needle))
        .slice(0, 6);

    if (matches.length === 0) {
        return {
            summary: `I couldn't find a part matching "${term}" in the catalogue.`,
            cards: [],
            actions: [{ label: "Open parts", path: "/inv/part" }],
            suggestions: ["Parts overview", "Show low stock parts"],
            facts: { query: term, found: 0 },
        };
    }

    const cards: ChatCard[] = [
        {
            type: "part",
            title: `Matches for "${term}"`,
            rows: matches.map((s) => ({ Part: s.part_name, Available: Number(s.available_qty), Rate: money(Number(s.rate)) })),
        },
    ];

    const top = matches[0]!;
    return {
        summary:
            matches.length === 1
                ? `${top.part_name}: ${Number(top.available_qty)} in stock at ${money(Number(top.rate))} each.`
                : `Found ${matches.length} parts matching "${term}".`,
        cards,
        actions: [{ label: "Open parts", path: "/inv/part" }],
        suggestions: ["Show low stock parts", "Add a receipt"],
        facts: { query: term, found: matches.length, items: matches.map((s) => ({ name: s.part_name, qty: Number(s.available_qty), rate: Number(s.rate) })) },
    };
}

export async function billingSummary(): Promise<ToolResult> {
    const revenueQ = `
        SELECT
            COUNT(DISTINCT b.id)                                   AS bill_count,
            COALESCE(SUM(d.total), 0)                              AS subtotal,
            COALESCE(SUM(d.tax_amount), 0)                         AS tax,
            COALESCE(SUM(d.total) FILTER (
                WHERE b.created_at >= date_trunc('month', CURRENT_DATE)
            ), 0)                                                  AS month_subtotal
        FROM app.tbl_bill b
        LEFT JOIN app.tbl_bill_detail d
            ON d.bill_id = b.id AND d.is_deleted = FALSE
        WHERE b.is_deleted = FALSE;
    `;
    const recentQ = `
        SELECT b.id, b.customer_name, b.vehicle_number,
               COALESCE(SUM(d.total + d.tax_amount), 0) AS grand_total
        FROM app.tbl_bill b
        LEFT JOIN app.tbl_bill_detail d
            ON d.bill_id = b.id AND d.is_deleted = FALSE
        WHERE b.is_deleted = FALSE
        GROUP BY b.id, b.customer_name, b.vehicle_number
        ORDER BY b.id DESC
        LIMIT 5;
    `;

    const [rev, recent] = await Promise.all([db.query(revenueQ), db.query(recentQ)]);
    const r = rev.rows[0] ?? { bill_count: 0, subtotal: 0, tax: 0, month_subtotal: 0 };
    const grand = Number(r.subtotal) + Number(r.tax);

    const cards: ChatCard[] = [
        {
            type: "stat",
            title: "Billing",
            stats: [
                { label: "Bills", value: Number(r.bill_count) },
                { label: "Revenue (incl. tax)", value: money(grand) },
                { label: "This month", value: money(Number(r.month_subtotal)) },
            ],
        },
    ];

    if (recent.rows.length > 0) {
        cards.push({
            type: "bill",
            title: "Recent bills",
            rows: recent.rows.map((b: any) => ({
                "#": b.id,
                Customer: b.customer_name ?? "—",
                Vehicle: b.vehicle_number ?? "—",
                Total: money(Number(b.grand_total)),
            })),
        });
    }

    return {
        summary: `Across ${Number(r.bill_count)} bills you've invoiced ${money(grand)} in total (including ${money(
            Number(r.tax)
        )} tax). This month's billed amount is ${money(Number(r.month_subtotal))}.`,
        cards,
        actions: [{ label: "Open billing", path: "/app/billing" }],
        suggestions: ["How many job cards?", "Show low stock parts"],
        facts: {
            billCount: Number(r.bill_count),
            revenueInclTax: grand,
            tax: Number(r.tax),
            monthSubtotal: Number(r.month_subtotal),
        },
    };
}
