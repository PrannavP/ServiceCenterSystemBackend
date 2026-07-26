
export interface KnowledgeEntry {
    id: string;
    keywords: string[];
    question: string;
    answer: string;
    path?: string;
    pathLabel?: string;
}

export const PRODUCT_NAME = "ServiceCenter Suite";
export const ASSISTANT_NAME = "Aria";

export const SYSTEM_OVERVIEW = `
${PRODUCT_NAME} is a management platform for vehicle service centers / auto workshops.
Core modules:
- Job Cards: record a customer's vehicle, reported problems, odometer/fuel readings and the parts/labour lines for a repair.
- Billing: generate a tax-inclusive bill from a completed job card.
- Parts (Inventory): the catalogue of spare parts (name + part number).
- Receipts: stock-in receipts that add available quantity for parts.
- Users: staff accounts with roles "admin" (full access) and "front_office" (dashboard, billing, job cards).
Navigation paths: Dashboard /dashboard, Job Cards /app/jobcard (create at /app/jobcard/manage), Billing /app/billing, Parts /inv/part (create at /inv/part/manage), Receipts /inv/receipt (create at /inv/receipt/manage).
`.trim();

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
    {
        id: "create-jobcard",
        keywords: ["create", "new", "add", "make", "job card", "jobcard", "job-card", "repair", "service"],
        question: "How do I create a job card?",
        answer:
            "Open **Job Cards** and click **New Job Card**. Fill in the customer name, contact, vehicle registration, odometer & fuel readings, and the reported problems. Add parts/labour lines in the details table, then save.",
        path: "/app/jobcard/manage",
        pathLabel: "New Job Card",
    },
    {
        id: "billing",
        keywords: ["bill", "billing", "invoice", "charge", "payment", "tax"],
        question: "How does billing work?",
        answer:
            "A bill is generated from an existing job card. The system pulls the job card's part/labour lines, applies the configured tax, and produces a tax-inclusive invoice. Manage everything from the **Billing** page.",
        path: "/app/billing",
        pathLabel: "Open Billing",
    },
    {
        id: "parts",
        keywords: ["part", "parts", "inventory", "spare", "catalogue", "catalog", "item"],
        question: "How do I manage parts?",
        answer:
            "The **Parts** page is your spare-parts catalogue. Add a part with its name and part number. Available quantity is driven by stock-in **Receipts**, not entered directly on the part.",
        path: "/inv/part",
        pathLabel: "Open Parts",
    },
    {
        id: "receipts",
        keywords: ["receipt", "receipts", "stock", "stock-in", "restock", "quantity", "purchase"],
        question: "How do I add stock?",
        answer:
            "Use **Receipts** to record stock-in. Each receipt increases the available quantity of the parts it contains, which then become selectable on job cards.",
        path: "/inv/receipt/manage",
        pathLabel: "New Receipt",
    },
    {
        id: "roles",
        keywords: ["role", "roles", "permission", "access", "admin", "front office", "front_office", "user", "staff"],
        question: "What can each role do?",
        answer:
            "**Admin** users have full access including Parts and Receipts. **Front office** users get the Dashboard, Billing and Job Cards. Your visible menu is filtered automatically by your role.",
    },
    {
        id: "dashboard",
        keywords: ["dashboard", "overview", "stats", "home", "summary", "report"],
        question: "What's on the dashboard?",
        answer:
            "The **Dashboard** gives you an at-a-glance overview of activity and revenue trends. You can also ask me directly for live counts and low-stock alerts.",
        path: "/dashboard",
        pathLabel: "Open Dashboard",
    },
    {
        id: "ocr",
        keywords: ["ocr", "scan", "photo", "image", "upload", "extract", "handwritten", "camera"],
        question: "Can I scan a paper job card?",
        answer:
            "Yes — the OCR service reads a photographed job-card sheet and extracts the fields for you, so a paper form can be turned into a digital job card without retyping everything.",
    },
];
