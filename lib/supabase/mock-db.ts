import type {
  Company,
  Client,
  Project,
  BOQ,
  BOQLineItem,
  Quotation,
  Vendor,
  Material,
  InventoryItem,
  PurchaseOrder,
  POLineItem,
  SiteReport,
  Invoice,
  Expense,
  Payment,
  Document,
  AIConversation,
} from "@/lib/types";

export const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export const DEFAULT_USER = {
  id: DEFAULT_COMPANY_ID,
  email: "workspace@focuson-ai.local",
  role: "authenticated",
  user_metadata: {
    name: "Apex Interior Fit-Outs",
    company_name: "Apex Interior Fit-Outs Pvt Ltd",
  },
};

const STORAGE_KEY = "focuson_ai_workspace_db_v3";

export interface MockDatabaseSchema {
  companies: Company[];
  clients: Client[];
  projects: Project[];
  boqs: BOQ[];
  boq_line_items: BOQLineItem[];
  quotations: Quotation[];
  vendors: Vendor[];
  materials: Material[];
  inventory: InventoryItem[];
  purchase_orders: PurchaseOrder[];
  po_line_items: POLineItem[];
  site_reports: SiteReport[];
  invoices: Invoice[];
  expenses: Expense[];
  payments: Payment[];
  documents: Document[];
  ai_conversations: AIConversation[];
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function createDefaultData(): MockDatabaseSchema {
  const companyId = DEFAULT_COMPANY_ID;
  const today = getTodayString();
  const now = new Date().toISOString();

  const client1Id = "11111111-1111-1111-1111-111111111111";
  const client2Id = "11111111-1111-1111-1111-111111111112";
  const client3Id = "11111111-1111-1111-1111-111111111113";
  const client4Id = "11111111-1111-1111-1111-111111111114";

  const proj1Id = "22222222-2222-2222-2222-222222222221";
  const proj2Id = "22222222-2222-2222-2222-222222222222";
  const proj3Id = "22222222-2222-2222-2222-222222222223";
  const proj4Id = "22222222-2222-2222-2222-222222222224";

  const boq1Id = "33333333-3333-3333-3333-333333333331";
  const boq2Id = "33333333-3333-3333-3333-333333333332";

  const vendor1Id = "55555555-5555-5555-5555-555555555551";
  const vendor2Id = "55555555-5555-5555-5555-555555555552";
  const vendor3Id = "55555555-5555-5555-5555-555555555553";
  const vendor4Id = "55555555-5555-5555-5555-555555555554";
  const vendor5Id = "55555555-5555-5555-5555-555555555555";

  const mat1Id = "66666666-6666-6666-6666-666666666661";
  const mat2Id = "66666666-6666-6666-6666-666666666662";
  const mat3Id = "66666666-6666-6666-6666-666666666663";
  const mat4Id = "66666666-6666-6666-6666-666666666664";
  const mat5Id = "66666666-6666-6666-6666-666666666665";
  const mat6Id = "66666666-6666-6666-6666-666666666666";
  const mat7Id = "66666666-6666-6666-6666-666666666667";

  return {
    companies: [
      {
        id: companyId,
        name: "Apex Interior Fit-Outs Pvt Ltd",
        logo_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80",
        gst_number: "29AAXCA8976F1Z9",
        address: "Level 4, Prestige Tech Park, Outer Ring Road, Bangalore - 560103",
        phone: "+91 80 4567 8900",
        email: "projects@apexfitouts.in",
        website: "https://apexfitouts.in",
        terms_template:
          "1. 50% Advance along with work order.\n2. 40% against material delivery at site.\n3. 10% on completion and handover.\n4. All rates exclusive of applicable GST (18%).",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    clients: [
      {
        id: client1Id,
        company_id: companyId,
        name: "TechCorp India Pvt Ltd",
        contact_person: "Rajesh Sharma (VP Facilities)",
        email: "r.sharma@techcorp.in",
        phone: "+91 98450 12345",
        address: "Tower B, Bagmane Tech Park, Bangalore",
        gst_number: "29AAACT1234K1Z0",
        notes: "Key commercial client. Prefers Saint-Gobain partitions and Philips lighting.",
        status: "active",
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: client2Id,
        company_id: companyId,
        name: "FinServe Financial Group",
        contact_person: "Ananya Iyer (Project Director)",
        email: "ananya.iyer@finserve.com",
        phone: "+91 98860 98765",
        address: "BKC Commercial Hub, Mumbai",
        gst_number: "27AAACF5678M1Z2",
        notes: "High security requirements for server room and cabins.",
        status: "active",
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: client3Id,
        company_id: companyId,
        name: "Innovate Labs R&D",
        contact_person: "Dr. Vikram Kulkarni",
        email: "v.kulkarni@innovatelabs.org",
        phone: "+91 99001 44556",
        address: "Whitefield Industrial Area, Bangalore",
        gst_number: "29AAACI9988L1Z9",
        notes: "Requires acoustic ceiling and anti-static flooring.",
        status: "active",
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: client4Id,
        company_id: companyId,
        name: "Zenith Retail Solutions",
        contact_person: "Karan Mehta",
        email: "karan.mehta@zenithretail.in",
        phone: "+91 97400 33221",
        address: "Indiranagar 100ft Road, Bangalore",
        gst_number: "29AAACZ4455J1Z3",
        notes: "Fast turnaround required for flagship showroom.",
        status: "active",
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    projects: [
      {
        id: proj1Id,
        company_id: companyId,
        client_id: client1Id,
        name: "TechCorp HQ - 15,000 sqft Office Fit-Out",
        description: "Complete turnkey interior fit-out including false ceiling, modular workstations, electricals, HVAC ducts, and conference rooms.",
        location: "Bagmane Tech Park, Bangalore",
        area_sqft: 15000,
        status: "in_progress",
        start_date: "2026-07-01",
        end_date: "2026-09-30",
        budget: 7500000,
        created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: proj2Id,
        company_id: companyId,
        client_id: client2Id,
        name: "FinServe Mumbai Flagship Branch",
        description: "Executive branch interior fit-out with acoustic cabin partitions and premium reception lounge.",
        location: "Bandra Kurla Complex, Mumbai",
        area_sqft: 8500,
        status: "in_progress",
        start_date: "2026-07-15",
        end_date: "2026-10-15",
        budget: 4500000,
        created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: proj3Id,
        company_id: companyId,
        client_id: client3Id,
        name: "Innovate Labs R&D Center",
        description: "Specialized lab furniture, anti-static flooring, and clean-room false ceiling.",
        location: "Whitefield, Bangalore",
        area_sqft: 12000,
        status: "planning",
        start_date: "2026-08-15",
        end_date: "2026-11-30",
        budget: 6200000,
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: proj4Id,
        company_id: companyId,
        client_id: client4Id,
        name: "Zenith Retail Indiranagar Store",
        description: "High-end retail interior fit-out with track lighting, display shelves, and glass facade.",
        location: "Indiranagar, Bangalore",
        area_sqft: 4000,
        status: "completed",
        start_date: "2026-05-01",
        end_date: "2026-06-30",
        budget: 2800000,
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    boqs: [
      {
        id: boq1Id,
        company_id: companyId,
        project_id: proj1Id,
        title: "Complete Interior & Modular Workstation BOQ",
        version: 2,
        status: "approved",
        created_by: companyId,
        approved_by: companyId,
        notes: "Approved by client technical committee. Inclusive of electrical and modular furniture.",
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: boq2Id,
        company_id: companyId,
        project_id: proj2Id,
        title: "Executive Branch Interior BOQ",
        version: 1,
        status: "draft",
        created_by: companyId,
        approved_by: null,
        notes: "Preliminary BOQ submitted for review.",
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    boq_line_items: [
      {
        id: "77777777-7777-7777-7777-777777777771",
        boq_id: boq1Id,
        category: "Ceiling",
        description: "Gypsum False Ceiling with G.I. channel framing and cove light detail",
        unit: "sqft",
        quantity: 15000,
        rate: 110,
        labour_rate: 35,
        amount: 1650000,
        labour_amount: 525000,
        remarks: "Saint-Gobain Gyproc 12.5mm boards",
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: "77777777-7777-7777-7777-777777777772",
        boq_id: boq1Id,
        category: "Flooring",
        description: "Vitrified 800x800mm Commercial Grade Tiles in passages & reception",
        unit: "sqft",
        quantity: 5000,
        rate: 130,
        labour_rate: 45,
        amount: 650000,
        labour_amount: 225000,
        remarks: "Kajaria commercial heavy-traffic series",
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: "77777777-7777-7777-7777-777777777773",
        boq_id: boq1Id,
        category: "Modular Furniture",
        description: "60-Seater Linear Modular Workstation (1200x600mm) with fabric partition & raceway",
        unit: "nos",
        quantity: 60,
        rate: 14500,
        labour_rate: 1500,
        amount: 870000,
        labour_amount: 90000,
        remarks: "25mm pre-laminated E1 grade particle board",
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: "77777777-7777-7777-7777-777777777774",
        boq_id: boq1Id,
        category: "Electrical",
        description: "Primary distribution wiring, DB panel, switchboards and LED fixtures",
        unit: "sqft",
        quantity: 15000,
        rate: 85,
        labour_rate: 40,
        amount: 1275000,
        labour_amount: 600000,
        remarks: "Finolex FRLS wires, Legrand switches",
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: "77777777-7777-7777-7777-777777777775",
        boq_id: boq1Id,
        category: "Civil Work",
        description: "12mm Toughened Clear Glass Partition for conference & director cabins",
        unit: "sqft",
        quantity: 1200,
        rate: 650,
        labour_rate: 150,
        amount: 780000,
        labour_amount: 180000,
        remarks: "Dorma patch fittings & stainless steel handle",
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: "77777777-7777-7777-7777-777777777776",
        boq_id: boq2Id,
        category: "Ceiling",
        description: "Acoustic Mineral Fiber Grid Ceiling in Open Workstation Hall",
        unit: "sqft",
        quantity: 6000,
        rate: 125,
        labour_rate: 35,
        amount: 750000,
        labour_amount: 210000,
        remarks: "Armstrong fine-fissured tiles",
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: "77777777-7777-7777-7777-777777777777",
        boq_id: boq2Id,
        category: "Electrical",
        description: "Server Room UPS wiring & isolated ground sockets",
        unit: "lumpsum",
        quantity: 1,
        rate: 350000,
        labour_rate: 80000,
        amount: 350000,
        labour_amount: 80000,
        remarks: "Schneider Electric industrial breakers",
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ],
    quotations: [
      {
        id: "44444444-4444-4444-4444-444444444441",
        company_id: companyId,
        project_id: proj1Id,
        boq_id: boq1Id,
        quotation_number: "QT/2026/0001",
        revision: 1,
        status: "approved",
        subtotal: 6845000,
        discount_percent: 2,
        discount_amount: 145000,
        gst_percent: 18,
        gst_amount: 1206000,
        grand_total: 7906000,
        profit_margin_percent: 18,
        terms:
          "1. Validity of estimate: 30 Days.\n2. GST @ 18% applicable as shown.\n3. Completion schedule: 90 days from site handover.\n4. Defect liability period: 12 months.",
        valid_until: "2026-09-30",
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: "44444444-4444-4444-4444-444444444442",
        company_id: companyId,
        project_id: proj2Id,
        boq_id: boq2Id,
        quotation_number: "QT/2026/0002",
        revision: 1,
        status: "draft",
        subtotal: 1390000,
        discount_percent: 2,
        discount_amount: 40000,
        gst_percent: 18,
        gst_amount: 243000,
        grand_total: 1593000,
        profit_margin_percent: 20,
        terms:
          "1. Validity of estimate: 30 Days.\n2. GST @ 18% applicable.\n3. Payment terms as per agreement.",
        valid_until: "2026-10-15",
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    vendors: [
      {
        id: vendor1Id,
        company_id: companyId,
        name: "Saint-Gobain Gyproc India Distributor",
        category: "Ceiling Materials",
        contact_person: "Manoj Verma (Regional Sales)",
        phone: "+91 80 4123 5566",
        email: "sales@gyproc-distributor.in",
        address: "Koramangala Industrial Area, Bangalore",
        gst_number: "29AAACS1122D1Z8",
        rating: 5,
        status: "active",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: vendor2Id,
        company_id: companyId,
        name: "Anchor Panasonic Electricals Agency",
        category: "Electrical",
        contact_person: "Deepak Rao",
        phone: "+91 80 2234 8899",
        email: "orders@anchorelectricals.com",
        address: "S.P. Road Electrical Market, Bangalore",
        gst_number: "29AAACA3344E1Z6",
        rating: 5,
        status: "active",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: vendor3Id,
        company_id: companyId,
        name: "Century Ply & Greenlam Distributors",
        category: "Wood & Laminates",
        contact_person: "Suresh Kumar",
        phone: "+91 80 4455 6677",
        email: "info@centuryply-blr.in",
        address: "Mysore Road Timber Yard, Bangalore",
        gst_number: "29AAACC5566F1Z4",
        rating: 4,
        status: "active",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: vendor4Id,
        company_id: companyId,
        name: "Kajaria Ceramics Commercial Depot",
        category: "Flooring",
        contact_person: "Ramesh Nair",
        phone: "+91 80 8899 0011",
        email: "projects@kajariaceramics.com",
        address: "Bannerghatta Road, Bangalore",
        gst_number: "29AAACK7788G1Z2",
        rating: 5,
        status: "active",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: vendor5Id,
        company_id: companyId,
        name: "Daikin Airconditioning Systems India",
        category: "HVAC",
        contact_person: "Aniket Deshmukh",
        phone: "+91 80 6677 8899",
        email: "commercial@daikinindia.in",
        address: "Whitefield Main Road, Bangalore",
        gst_number: "29AAACD9900H1Z0",
        rating: 4,
        status: "active",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    materials: [
      {
        id: mat1Id,
        company_id: companyId,
        name: "Gypsum Board 12.5mm Standard (1200x2400mm)",
        category: "Ceiling",
        unit: "sheet",
        description: "Saint-Gobain standard commercial board",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: mat2Id,
        company_id: companyId,
        name: "GI Ceiling Section 0.55mm (3.6m length)",
        category: "Ceiling",
        unit: "nos",
        description: "0.55mm GI channel section",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: mat3Id,
        company_id: companyId,
        name: "18mm MR Grade Plywood (8x4 ft)",
        category: "Modular",
        unit: "sheet",
        description: "Century Ply commercial MR grade",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: mat4Id,
        company_id: companyId,
        name: "Vitrified Tile 800x800 Commercial",
        category: "Flooring",
        unit: "sqft",
        description: "Kajaria heavy-traffic vitrified tile",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: mat5Id,
        company_id: companyId,
        name: "Finolex FRLS 2.5 sq.mm Copper Wire",
        category: "Electrical",
        unit: "coil",
        description: "FRLS copper 90m coil",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: mat6Id,
        company_id: companyId,
        name: "Philips 2x2 36W LED Panel Light",
        category: "Electrical",
        unit: "nos",
        description: "600x600mm commercial recessed LED panel",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: mat7Id,
        company_id: companyId,
        name: "Dorma Patch Fitting Glass Door Set",
        category: "Civil Work",
        unit: "set",
        description: "Top & bottom patch fitting with floor spring",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    inventory: [
      {
        id: "88888888-8888-8888-8888-888888888881",
        company_id: companyId,
        project_id: proj1Id,
        material_id: mat1Id,
        quantity_received: 150,
        quantity_consumed: 65,
        quantity_available: 85,
        unit: "sheet",
        last_updated: new Date(Date.now() - 2 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: "88888888-8888-8888-8888-888888888882",
        company_id: companyId,
        project_id: proj1Id,
        material_id: mat2Id,
        quantity_received: 200,
        quantity_consumed: 195,
        quantity_available: 5, // LOW STOCK < 10
        unit: "nos",
        last_updated: new Date(Date.now() - 1 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: "88888888-8888-8888-8888-888888888883",
        company_id: companyId,
        project_id: proj1Id,
        material_id: mat3Id,
        quantity_received: 45,
        quantity_consumed: 15,
        quantity_available: 30,
        unit: "sheet",
        last_updated: new Date(Date.now() - 3 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: "88888888-8888-8888-8888-888888888884",
        company_id: companyId,
        project_id: proj1Id,
        material_id: mat5Id,
        quantity_received: 30,
        quantity_consumed: 26,
        quantity_available: 4, // LOW STOCK < 10
        unit: "coil",
        last_updated: now,
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: "88888888-8888-8888-8888-888888888885",
        company_id: companyId,
        project_id: proj1Id,
        material_id: mat6Id,
        quantity_received: 80,
        quantity_consumed: 30,
        quantity_available: 50,
        unit: "nos",
        last_updated: new Date(Date.now() - 4 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    purchase_orders: [
      {
        id: "99999999-9999-9999-9999-999999999991",
        company_id: companyId,
        project_id: proj1Id,
        vendor_id: vendor1Id,
        po_number: "PO/2026/0001",
        status: "approved",
        subtotal: 151500,
        gst_amount: 27270,
        grand_total: 178770,
        notes: "Gypsum boards and GI ceiling sections for TechCorp HQ Floor 4",
        approved_by: companyId,
        issued_date: "2026-07-25",
        expected_delivery: "2026-08-10",
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: "99999999-9999-9999-9999-999999999992",
        company_id: companyId,
        project_id: proj1Id,
        vendor_id: vendor2Id,
        po_number: "PO/2026/0002",
        status: "sent_for_approval",
        subtotal: 140000,
        gst_amount: 25200,
        grand_total: 165200,
        notes: "Primary electrical cables and LED lighting fixtures",
        approved_by: null,
        issued_date: today,
        expected_delivery: "2026-08-14",
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: now,
      },
    ],
    po_line_items: [
      {
        id: "aaaa0000-0000-0000-0000-000000000001",
        po_id: "99999999-9999-9999-9999-999999999991",
        material_id: mat1Id,
        description: "Gypsum Board 12.5mm Standard",
        quantity: 150,
        unit: "sheet",
        rate: 620,
        amount: 93000,
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
      {
        id: "aaaa0000-0000-0000-0000-000000000002",
        po_id: "99999999-9999-9999-9999-999999999991",
        material_id: mat2Id,
        description: "GI Ceiling Section 0.55mm",
        quantity: 300,
        unit: "nos",
        rate: 195,
        amount: 58500,
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
      {
        id: "aaaa0000-0000-0000-0000-000000000003",
        po_id: "99999999-9999-9999-9999-999999999992",
        material_id: mat6Id,
        description: "Philips 2x2 36W LED Panel Light",
        quantity: 80,
        unit: "nos",
        rate: 1750,
        amount: 140000,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ],
    site_reports: [
      {
        id: "bbbb0000-0000-0000-0000-000000000001",
        company_id: companyId,
        project_id: proj1Id,
        report_date: today,
        labour_count: 32,
        work_summary:
          "Completed 85% of false ceiling channel framing on 4th floor. Electrical conduit laying in conference room 100% completed. Workstation modular partitions unloading commenced.",
        issues: "Minor delay in freight elevator availability during morning hours.",
        delays: "None affecting milestone path.",
        photos: [
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
        ],
        weather: "Sunny - No site impact",
        created_by: companyId,
        created_at: now,
        updated_at: now,
      },
      {
        id: "bbbb0000-0000-0000-0000-000000000002",
        company_id: companyId,
        project_id: proj1Id,
        report_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        labour_count: 28,
        work_summary:
          "Gypsum false ceiling sheet boarding started in West wing. Electrical DB box fixing in progress.",
        issues: "None",
        delays: "None",
        photos: [],
        weather: "Clear",
        created_by: companyId,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: now,
      },
    ],
    invoices: [
      {
        id: "cccc0000-0000-0000-0000-000000000001",
        company_id: companyId,
        project_id: proj1Id,
        client_id: client1Id,
        invoice_number: "INV/2026/0001",
        subtotal: 3000000,
        gst_amount: 540000,
        grand_total: 3540000,
        amount_paid: 3540000,
        status: "paid",
        notes: "50% Mobilization Advance against confirmed Work Order #WO-887",
        due_date: "2026-07-15",
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 24 * 86400000).toISOString(),
      },
      {
        id: "cccc0000-0000-0000-0000-000000000002",
        company_id: companyId,
        project_id: proj1Id,
        client_id: client1Id,
        invoice_number: "INV/2026/0002",
        subtotal: 2500000,
        gst_amount: 450000,
        grand_total: 2950000,
        amount_paid: 1100000, // Outstanding = 18,50,000
        status: "partially_paid",
        notes: "Stage 2: Material delivery & ceiling framing completion invoice",
        due_date: "2026-08-15",
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    expenses: [
      {
        id: "dddd0000-0000-0000-0000-000000000001",
        company_id: companyId,
        project_id: proj1Id,
        category: "Labour",
        description: "Weekly wages for ceiling & electrical technicians",
        amount: 85000,
        expense_date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
        vendor_id: null,
        receipt_url: null,
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: "dddd0000-0000-0000-0000-000000000002",
        company_id: companyId,
        project_id: proj1Id,
        category: "Transport",
        description: "Material truck transport from timber yard to Bagmane Tech Park site",
        amount: 12500,
        expense_date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
        vendor_id: null,
        receipt_url: null,
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        updated_at: now,
      },
      {
        id: "dddd0000-0000-0000-0000-000000000003",
        company_id: companyId,
        project_id: proj1Id,
        category: "Materials",
        description: "Site hardware, fasteners, drill bits, and safety gear",
        amount: 32500,
        expense_date: today, // Today expense!
        vendor_id: vendor1Id,
        receipt_url: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "dddd0000-0000-0000-0000-000000000004",
        company_id: companyId,
        project_id: proj2Id,
        category: "Miscellaneous",
        description: "Site refreshment, water cans, and temporary lighting setup",
        amount: 12500,
        expense_date: today, // Today expense! Total today = 45,000
        vendor_id: null,
        receipt_url: null,
        created_at: now,
        updated_at: now,
      },
    ],
    payments: [
      {
        id: "eeee0000-0000-0000-0000-000000000001",
        company_id: companyId,
        invoice_id: "cccc0000-0000-0000-0000-000000000001",
        amount: 3540000,
        payment_mode: "bank_transfer",
        payment_date: new Date(Date.now() - 24 * 86400000).toISOString().split("T")[0],
        reference: "UTR-HDFC260714980123",
        notes: "Mobilization Advance payment received",
        created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
      },
      {
        id: "eeee0000-0000-0000-0000-000000000002",
        company_id: companyId,
        invoice_id: "cccc0000-0000-0000-0000-000000000002",
        amount: 1100000,
        payment_mode: "bank_transfer",
        payment_date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
        reference: "UTR-HDFC260802114567",
        notes: "Stage 2 partial payment received",
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    documents: [
      {
        id: "ffff0000-0000-0000-0000-000000000001",
        company_id: companyId,
        project_id: proj1Id,
        name: "TechCorp HQ - Architectural Floor Plan Rev 3",
        file_url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
        file_type: "PDF / Plan",
        file_size: 4500000,
        category: "Plans",
        extracted_text: null,
        uploaded_by: companyId,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: "ffff0000-0000-0000-0000-000000000002",
        company_id: companyId,
        project_id: proj1Id,
        name: "False Ceiling & Electrical Layout Drawing",
        file_url: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80",
        file_type: "CAD / Drawing",
        file_size: 6200000,
        category: "Drawings",
        extracted_text: null,
        uploaded_by: companyId,
        created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
      },
    ],
    ai_conversations: [
      {
        id: "aaaa1111-1111-1111-1111-111111111111",
        company_id: companyId,
        user_id: companyId,
        project_id: proj1Id,
        agent: "general",
        user_message: "Help me estimate a 15,000 sqft commercial office interior fit-out in Bangalore with modular workstations and false ceiling.",
        ai_response:
          "For a 15,000 sqft commercial office in Bangalore, standard turnkey fit-out rates range between ₹1,800 to ₹2,500 per sqft depending on finish level. I recommend Saint-Gobain 12.5mm gypsum false ceiling (₹110/sqft material + ₹35/sqft labour) and 60 linear workstations with 25mm pre-laminated tops and raceways.",
        structured_output: null,
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ],
  };
}

export class LocalWorkspaceDB {
  private data: MockDatabaseSchema;

  constructor() {
    this.data = this.loadFromStorage();
  }

  private loadFromStorage(): MockDatabaseSchema {
    if (typeof window === "undefined") {
      return createDefaultData();
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore localStorage errors
    }
    const def = createDefaultData();
    this.saveToStorage(def);
    return def;
  }

  private saveToStorage(data: MockDatabaseSchema) {
    this.data = data;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage full
    }
  }

  public resetData(): void {
    const def = createDefaultData();
    this.saveToStorage(def);
  }

  public getTable(tableName: keyof MockDatabaseSchema): Record<string, unknown>[] {
    const arr = this.data[tableName];
    if (!arr) return [];
    if (tableName === "inventory") {
      return (arr as InventoryItem[]).map((item) => ({
        ...item,
        quantity_available:
          (item.quantity_received || 0) - (item.quantity_consumed || 0),
      })) as unknown as Record<string, unknown>[];
    }
    return arr as unknown as Record<string, unknown>[];
  }

  private withDerivedFields(tableName: keyof MockDatabaseSchema, row: Record<string, unknown>): Record<string, unknown> {
    const next = { ...row };
    if (tableName === "boq_line_items" || tableName === "po_line_items") {
      const quantity = Number(next.quantity || 0);
      const rate = Number(next.rate || 0);
      next.amount = quantity * rate;
      if (tableName === "boq_line_items" && next.labour_amount == null && next.labour_rate != null) {
        next.labour_amount = quantity * Number(next.labour_rate || 0);
      }
    }
    if (tableName === "inventory") {
      next.quantity_available = Number(next.quantity_received || 0) - Number(next.quantity_consumed || 0);
      next.last_updated = next.last_updated || new Date().toISOString();
    }
    return next;
  }

  public insert(tableName: keyof MockDatabaseSchema, rows: Record<string, unknown>[]): Record<string, unknown>[] {
    const arr = (this.data[tableName] || []) as unknown as Record<string, unknown>[];
    const defaults: Partial<Record<keyof MockDatabaseSchema, Record<string, unknown>>> = {
      boqs: { version: 1, status: "draft" },
      quotations: { revision: 1, status: "draft", discount_percent: 0, discount_amount: 0, gst_percent: 18, gst_amount: 0, profit_margin_percent: 15 },
      purchase_orders: { status: "draft", subtotal: 0, gst_amount: 0, grand_total: 0 },
      invoices: { status: "draft", amount_paid: 0 },
      vendors: { status: "active", rating: 3 },
      clients: { status: "active" },
      site_reports: { photos: [] },
    };
    const newRows = rows.map((r) => this.withDerivedFields(tableName, {
      ...(defaults[tableName] || {}),
      id: r.id || crypto.randomUUID(),
      // Line items do not have a company_id column in PostgreSQL.
      ...(tableName === "boq_line_items" || tableName === "po_line_items" ? {} : { company_id: r.company_id || DEFAULT_COMPANY_ID }),
      created_at: r.created_at || new Date().toISOString(),
      updated_at: r.updated_at || new Date().toISOString(),
      ...r,
    }));
    this.data[tableName] = [...arr, ...newRows] as never;
    this.saveToStorage(this.data);
    return newRows;
  }

  public update(
    tableName: keyof MockDatabaseSchema,
    updates: Record<string, unknown>,
    filterFn: (row: Record<string, unknown>) => boolean
  ): Record<string, unknown>[] {
    const arr = (this.data[tableName] || []) as unknown as Record<string, unknown>[];
    const updatedRows: Record<string, unknown>[] = [];
    const newArr = arr.map((item) => {
      if (filterFn(item)) {
        const up = this.withDerivedFields(tableName, {
          ...item,
          ...updates,
          updated_at: new Date().toISOString(),
        });
        updatedRows.push(up);
        return up;
      }
      return item;
    });
    this.data[tableName] = newArr as never;
    this.saveToStorage(this.data);
    return updatedRows;
  }

  public delete(
    tableName: keyof MockDatabaseSchema,
    filterFn: (row: Record<string, unknown>) => boolean
  ): Record<string, unknown>[] {
    const arr = (this.data[tableName] || []) as unknown as Record<string, unknown>[];
    const deleted: Record<string, unknown>[] = [];
    const kept = arr.filter((item) => {
      if (filterFn(item)) {
        deleted.push(item);
        return false;
      }
      return true;
    });
    this.data[tableName] = kept as never;
    this.saveToStorage(this.data);
    return deleted;
  }
}

export const workspaceDb = new LocalWorkspaceDB();

export class MockQueryBuilder {
  private tableName: keyof MockDatabaseSchema;
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private orderField?: string;
  private orderAsc = true;
  private limitCount?: number;
  private isSingle = false;
  private countMode?: "exact" | null;
  private headMode = false;
  private pendingInsert?: Record<string, unknown>[];
  private pendingUpdate?: Record<string, unknown>;
  private pendingDelete = false;

  constructor(tableName: string) {
    this.tableName = tableName as keyof MockDatabaseSchema;
  }

  select(_cols?: string, options?: { count?: "exact"; head?: boolean }) {
    if (options?.count) {
      this.countMode = options.count;
    }
    if (options?.head) {
      this.headMode = options.head;
    }
    return this;
  }

  eq(field: string, val: unknown) {
    this.filters.push((row) => row[field] === val);
    return this;
  }

  neq(field: string, val: unknown) {
    this.filters.push((row) => row[field] !== val);
    return this;
  }

  in(field: string, vals: unknown[]) {
    this.filters.push((row) => Array.isArray(vals) && vals.includes(row[field]));
    return this;
  }

  lt(field: string, val: unknown) {
    this.filters.push((row) => Number(row[field] ?? 0) < Number(val ?? 0));
    return this;
  }

  gt(field: string, val: unknown) {
    this.filters.push((row) => Number(row[field] ?? 0) > Number(val ?? 0));
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field;
    if (opts && typeof opts.ascending === "boolean") {
      this.orderAsc = opts.ascending;
    }
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(payload: unknown) {
    const arr = Array.isArray(payload) ? payload : [payload];
    this.pendingInsert = arr as Record<string, unknown>[];
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.pendingUpdate = payload;
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  upsert(payload: unknown) {
    return this.insert(payload);
  }

  private runFilter(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  async execute() {
    if (this.pendingInsert) {
      const inserted = workspaceDb.insert(this.tableName, this.pendingInsert);
      if (this.isSingle) {
        return { data: inserted[0] || null, error: null, count: inserted.length };
      }
      return { data: inserted, error: null, count: inserted.length };
    }

    if (this.pendingUpdate) {
      const filterFn = (r: Record<string, unknown>) =>
        this.filters.every((f) => f(r));
      const updated = workspaceDb.update(this.tableName, this.pendingUpdate, filterFn);
      if (this.isSingle) {
        return { data: updated[0] || null, error: null, count: updated.length };
      }
      return { data: updated, error: null, count: updated.length };
    }

    if (this.pendingDelete) {
      const filterFn = (r: Record<string, unknown>) =>
        this.filters.every((f) => f(r));
      const deleted = workspaceDb.delete(this.tableName, filterFn);
      if (this.isSingle) {
        return { data: deleted[0] || null, error: null, count: deleted.length };
      }
      return { data: deleted, error: null, count: deleted.length };
    }

    // SELECT
    let rows = workspaceDb.getTable(this.tableName);
    rows = this.runFilter(rows);

    const totalCount = rows.length;

    if (this.orderField) {
      const field = this.orderField;
      const asc = this.orderAsc;
      rows.sort((a, b) => {
        const va = (a[field] ?? "") as string | number;
        const vb = (b[field] ?? "") as string | number;
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      });
    }

    if (typeof this.limitCount === "number") {
      rows = rows.slice(0, this.limitCount);
    }

    if (this.headMode) {
      return {
        data: null,
        count: totalCount,
        error: null,
      };
    }

    if (this.isSingle) {
      return {
        data: rows[0] || null,
        count: totalCount,
        error: null,
      };
    }

    return {
      data: rows,
      count: totalCount,
      error: null,
    };
  }

  // Thenable implementation so queries can be awaited directly
  then<TResult1 = { data: unknown; error: null; count?: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}
