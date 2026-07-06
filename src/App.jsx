import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "./lib/supabase";
import Auth from "./Auth";
import {
  Home, Users, FileText, Map, Brain, Settings, Wrench, Plus, ChevronRight, ChevronLeft,
  Code,
  TrendingUp, Mail, Phone, Globe, Eye, Target, BarChart3, ExternalLink,
  Copy, Check, DollarSign, Award, MapPin, Sparkles, Menu, X,
  Calendar, Clock, MessageSquare, RefreshCw, Search, Tag, Bell, Activity, Inbox,
  Layers, GripVertical, ArrowUpDown, ChevronDown, CalendarPlus, Trash2, CheckCircle2,
  CalendarDays, Building2, BedDouble, Bath, AlertCircle, CheckCheck, ChevronUp,
  Filter as FilterIcon, Bookmark, Lightbulb, LogOut, Loader2,
  Send, UserPlus, AtSign, Hash, Bot, Lock
} from "lucide-react";

// Luxury palette: cream/ivory canvas, deep charcoal text, muted gold signature.
// Brand colors deepened from their tech-pastel originals into sophisticated
// editorial hues. The original bright versions are kept as *Bright suffixes
// for use on dark surfaces (sidebar, hero overlays, the logo).
const C = {
  // Brand — deep luxury (used everywhere on light surfaces)
  teal: "#0d8b75",        tealDark: "#075d4e",      tealBright: "#5eead4",
  blue: "#3a4f7a",        blueDark: "#1f2e4a",      blueBright: "#818cf8",
  purple: "#6e4470",      purpleDark: "#4b2d4e",    purpleBright: "#a78bfa",

  // Signature accent
  gold:     "#9c7f43",
  goldSoft: "#c2a76e",

  // Status
  green: "#0d8b75",
  amber: "#b8924a",
  red:   "#b9404a",

  // Light surface system
  bg:        "#f9f6f0",   // cream page
  bgCard:    "#ffffff",   // white card
  bgHover:   "#f3eee2",   // subtle warm hover
  bgInset:   "#fafafd",   // very subtle inset

  // Dark surface system (sidebar + hero chrome)
  bgDark:    "#1a1a22",
  bgDark2:   "#26262e",

  // Borders
  border:      "#e8e2d4",
  borderLight: "#d4cdb9",

  // Text on light bg
  text:      "#1a1a22",
  textMuted: "#5a5a65",
  textDim:   "#9a9a95",

  // Text on dark bg
  textInv:      "#f5f1e6",
  textInvMuted: "#9c8f7a",
};

// Editorial serif used for major page titles and editorial numbers
const SERIF_FONT = `"Cormorant Garamond", "Cormorant", Georgia, "Hoefler Text", serif`;

// Icon registry for activity types
const ICONS = { Eye, FileText, Mail, Phone, MessageSquare, MapPin, Calendar, Activity, Tag };

// Format a timestamp as a relative "time ago" string (e.g., "2h ago")
function timeAgo(input) {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60)     return seconds + "s ago";
  if (seconds < 3600)   return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400)  return Math.floor(seconds / 3600) + "h ago";
  if (seconds < 604800) return Math.floor(seconds / 86400) + "d ago";
  if (seconds < 2592000)return Math.floor(seconds / 604800) + "w ago";
  return d.toLocaleDateString();
}

const TriskopeLogo = ({ size = 36, light = true }) => {
  // `light=true` means logo sits on a DARK surface (sidebar / dark hero) so it
  // uses the bright brand colors. light=false means it sits on a light surface
  // (printable doc footers, etc.) and uses the deep brand colors.
  const r = size * 0.22;
  const cx = size / 2, cy = size / 2;
  const t = light ? C.tealBright   : C.teal;
  const b = light ? C.blueBright   : C.blue;
  const p = light ? C.purpleBright : C.purple;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy - r * 0.7} r={r} fill="none" stroke={t} strokeWidth={1.5} opacity={0.95} />
      <circle cx={cx - r * 0.65} cy={cy + r * 0.45} r={r} fill="none" stroke={b} strokeWidth={1.5} opacity={0.95} />
      <circle cx={cx + r * 0.65} cy={cy + r * 0.45} r={r} fill="none" stroke={p} strokeWidth={1.5} opacity={0.95} />
    </svg>
  );
};

// ============================================================
// DATA
// ============================================================

const AGENTS = [
  { id: 1, name: "Sarah Mitchell",  plan: "Pro",        leads: 47, closings: 12, revenue: 284000, website: "sarahmitchell.triskope.io",  reports: 8,  communities: 5,
    email: "sarah@triskope.io",   phone: "(843) 555-0142", address: "1700 Ocean Blvd, Suite 200, Myrtle Beach, SC 29577",
    signupDate: "2025-08-14", license: "SC RE #94821",  brokerage: "Coastal Premier Real Estate",
    paymentMethod: { brand: "Visa",       last4: "4242", expMonth: 8, expYear: 28 },
    monthlyCost: 99, status: "active", nextBillingDays: 12,
  },
  { id: 2, name: "James Parker",    plan: "Enterprise", leads: 63, closings: 18, revenue: 412000, website: "jamesparker.triskope.io",    reports: 12, communities: 8,
    email: "james@triskope.io",   phone: "(843) 555-0287", address: "44 Beach Bridge Rd, North Myrtle Beach, SC 29582",
    signupDate: "2025-04-22", license: "SC RE #88102",  brokerage: "Parker & Associates Realty",
    paymentMethod: { brand: "Mastercard", last4: "8814", expMonth: 4, expYear: 27 },
    monthlyCost: 199, status: "active", nextBillingDays: 6,
  },
  { id: 3, name: "Lisa Chen",       plan: "Starter",    leads: 22, closings: 5,  revenue: 98000,  website: "lisachen.triskope.io",       reports: 3,  communities: 2,
    email: "lisa@triskope.io",    phone: "(843) 555-0319", address: "207 Boardwalk Drive, Market Common, Myrtle Beach, SC 29577",
    signupDate: "2025-11-03", license: "SC RE #99417",  brokerage: "Independent",
    paymentMethod: { brand: "Visa",       last4: "1183", expMonth: 11, expYear: 26 },
    monthlyCost: 49,  status: "active", nextBillingDays: 19,
  },
  { id: 4, name: "Marcus Johnson",  plan: "Pro",        leads: 38, closings: 9,  revenue: 195000, website: "marcusjohnson.triskope.io",  reports: 6,  communities: 4,
    email: "marcus@triskope.io",  phone: "(843) 555-0451", address: "415 Cypress Way, Carolina Forest, Myrtle Beach, SC 29579",
    signupDate: "2025-09-09", license: "SC RE #87623",  brokerage: "Grand Strand Properties",
    paymentMethod: { brand: "Amex",       last4: "1006", expMonth: 7,  expYear: 27 },
    monthlyCost: 99,  status: "active", nextBillingDays: 3,
  },
  { id: 5, name: "Amy Rodriguez",   plan: "Pro",        leads: 15, closings: 2,  revenue: 45000,  website: "amyrodriguez.triskope.io",   reports: 4,  communities: 3,
    email: "amy@triskope.io",     phone: "(843) 555-0598", address: "92 Plantation Dr, Murrells Inlet, SC 29576",
    signupDate: "2026-02-18", license: "SC RE #102558", brokerage: "Murrells Inlet Realty Group",
    paymentMethod: { brand: "Visa",       last4: "9020", expMonth: 2,  expYear: 28 },
    monthlyCost: 99,  status: "past_due", nextBillingDays: -4,
  },
];

// Leads are fetched from Supabase at runtime; see useEffect in App below.


const REPORTS = [
  { id: 1, title: "Myrtle Beach", slug: "myrtle-beach", agent: "Sarah Mitchell", views: 1247, leads: 18, avgPrice: "$345,000", priceChange: "+5.2%", inv: 342, dom: 45, status: "published" },
  { id: 2, title: "North Myrtle Beach", slug: "north-myrtle-beach", agent: "James Parker", views: 892, leads: 12, avgPrice: "$425,000", priceChange: "+3.8%", inv: 218, dom: 52, status: "published" },
  { id: 3, title: "Conway", slug: "conway", agent: "Marcus Johnson", views: 456, leads: 6, avgPrice: "$265,000", priceChange: "+7.1%", inv: 156, dom: 38, status: "published" },
  { id: 4, title: "Pawleys Island", slug: "pawleys-island", agent: "Sarah Mitchell", views: 634, leads: 9, avgPrice: "$485,000", priceChange: "+2.4%", inv: 98, dom: 61, status: "published" },
  { id: 5, title: "Surfside Beach", slug: "surfside-beach", agent: "Lisa Chen", views: 321, leads: 4, avgPrice: "$310,000", priceChange: "+4.6%", inv: 87, dom: 42, status: "draft" },
  { id: 6, title: "Murrells Inlet", slug: "murrells-inlet", agent: "James Parker", views: 567, leads: 7, avgPrice: "$375,000", priceChange: "+3.1%", inv: 124, dom: 48, status: "published" },
];

const COMMUNITIES = [
  { id: 1, name: "Barefoot Resort & Golf", slug: "barefoot-resort", type: "Golf", area: "North Myrtle Beach", listings: 24, avgPrice: "$485,000", views: 2134, leads: 22, agent: "James Parker", icon: "🏌️",
    tagline: "Four championship golf courses, oceanfront cabana, intracoastal views.",
    description: "Spanning 2,300 acres along the Intracoastal Waterway, Barefoot Resort is the Grand Strand's most-recognized golf destination — anchored by four signature courses (Dye, Love, Fazio, Norman) and a private members' beach club. Most homes sit on quarter-acre or larger lots, with the strongest appreciation in the Pelican Pointe and Bayshore enclaves.",
    highlights: ["4 championship golf courses", "Oceanfront beach cabana", "On-site marina + clubhouse", "Gated entry, 24-hour security"],
  },
  { id: 2, name: "Grande Dunes",            slug: "grande-dunes",     type: "Luxury", area: "Myrtle Beach",       listings: 18, avgPrice: "$725,000", views: 1876, leads: 15, agent: "Sarah Mitchell",  icon: "🏖️",
    tagline: "Members-only marina living with the highest median price on the Strand.",
    description: "Grande Dunes is the Grand Strand's most exclusive community — a mile of Intracoastal frontage, an Hugh Norman-designed golf course, an Ocean Club on the beach, and a 126-slip marina. Inventory rarely exceeds two dozen homes; median price is up materially year-over-year.",
    highlights: ["Private Ocean Club", "126-slip deep-water marina", "Hugh Norman golf course", "Mediterranean architectural standard"],
  },
  { id: 3, name: "Carolina Forest",         slug: "carolina-forest",  type: "Family", area: "Myrtle Beach",       listings: 45, avgPrice: "$340,000", views: 3210, leads: 34, agent: "Marcus Johnson", icon: "🌲",
    tagline: "Top-rated school district, mature trees, the family pick of the Strand.",
    description: "Set just west of Myrtle Beach, Carolina Forest is the fastest-growing master-planned community on the Grand Strand. Tree-lined streets, six neighborhoods under one HOA umbrella, and an A-rated school district have made it the default choice for relocating families.",
    highlights: ["A-rated school district", "Multiple community pools", "Trail and lake system", "Family-priced homes from $280K"],
  },
  { id: 4, name: "The Market Common",       slug: "market-common",    type: "Urban",  area: "Myrtle Beach",       listings: 12, avgPrice: "$395,000", views: 1456, leads: 11, agent: "Lisa Chen",       icon: "🏙️",
    tagline: "The Strand's only walkable urban village. Live where the locals live.",
    description: "Built on the former Air Force base land, The Market Common is the Grand Strand's only true walkable urban village. Boutique retail, a movie theater, weekly farmers' markets, and a 17-acre lake at the center. Homes and townhouses both available; condos sell in days.",
    highlights: ["Walkable urban village", "Weekly farmers' market", "Movie theater + retail core", "Bike trails to the beach"],
  },
  { id: 5, name: "Litchfield Beach",        slug: "litchfield-beach", type: "Beach",  area: "Pawleys Island",     listings: 15, avgPrice: "$520,000", views: 987,  leads: 8,  agent: "Sarah Mitchell",  icon: "🏝️",
    tagline: "Quiet, classic, the South Carolina coastline at its most refined.",
    description: "Pawleys Island's Litchfield Beach is what the South Carolina coast used to feel like — wide beaches, low-rise homes, mature live oaks, and zero high-rises. The Litchfield Country Club anchors the inland side; the beach itself sits at the end of every street.",
    highlights: ["Wide beaches, no high-rises", "Litchfield Country Club", "Bird sanctuary preserve", "Pawleys Island village minutes away"],
  },
  { id: 6, name: "Prince Creek",            slug: "prince-creek",     type: "Family", area: "Murrells Inlet",     listings: 28, avgPrice: "$310,000", views: 1654, leads: 14, agent: "Amy Rodriguez",   icon: "🏡",
    tagline: "Murrells Inlet's family-favorite, with TPC golf right outside the gate.",
    description: "Prince Creek is the largest master-planned community in Murrells Inlet — anchored by the TPC of Myrtle Beach and surrounded by some of the area's best dining (Marsh Walk is five minutes away). Eight separate sub-neighborhoods, all under one HOA, with strong inventory in the $280K-$400K range.",
    highlights: ["TPC of Myrtle Beach on-property", "Five minutes to Marsh Walk dining", "Eight sub-neighborhoods, one HOA", "Inland and waterway lots"],
  },
];

// Luxury listing photography — Unsplash CDN. 18 distinct images so that
// the 20-listing demo has near-unique photos across the grid. Each listing's
// stable photo is picked by id (see photoForListing).
const LISTING_PHOTOS = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80&auto=format&fit=crop", // modern coastal exterior
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80&auto=format&fit=crop", // luxury exterior, palms
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=900&q=80&auto=format&fit=crop", // contemporary home dusk
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&q=80&auto=format&fit=crop", // white modern villa
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80&auto=format&fit=crop", // poolside luxury
  "https://images.unsplash.com/photo-1613553474179-e1eda3ea5734?w=900&q=80&auto=format&fit=crop", // modern coastal
  "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=900&q=80&auto=format&fit=crop", // estate facade
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80&auto=format&fit=crop", // luxury exterior twilight
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80&auto=format&fit=crop", // designer kitchen
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80&auto=format&fit=crop", // modern coastal exterior
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=80&auto=format&fit=crop", // luxury patio
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80&auto=format&fit=crop", // luxury interior
  "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=900&q=80&auto=format&fit=crop", // coastal aerial
  "https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=900&q=80&auto=format&fit=crop", // bedroom suite
  "https://images.unsplash.com/photo-1600573472556-e636c2acda88?w=900&q=80&auto=format&fit=crop", // spa bath
  "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=900&q=80&auto=format&fit=crop", // coastal porch
  "https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?w=900&q=80&auto=format&fit=crop", // modern facade
  "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=900&q=80&auto=format&fit=crop", // poolside lounge
];

function photoForListing(id) {
  const idx = ((typeof id === "number" ? id : 0) - 1 + LISTING_PHOTOS.length) % LISTING_PHOTOS.length;
  return LISTING_PHOTOS[idx];
}

// Real photography per community, keyed by slug. Unsplash CDN.
const COMMUNITY_PHOTOS = {
  "barefoot-resort":  "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1600&q=80&auto=format&fit=crop",
  "grande-dunes":     "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80&auto=format&fit=crop",
  "carolina-forest":  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80&auto=format&fit=crop",
  "market-common":    "https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=1600&q=80&auto=format&fit=crop",
  "litchfield-beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80&auto=format&fit=crop",
  "prince-creek":     "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1600&q=80&auto=format&fit=crop",
};

const WEEKLY = [
  { day: "Mon", leads: 12 }, { day: "Tue", leads: 18 }, { day: "Wed", leads: 15 },
  { day: "Thu", leads: 22 }, { day: "Fri", leads: 28 }, { day: "Sat", leads: 35 }, { day: "Sun", leads: 20 },
];
const REVENUE = [
  { month: "Oct", revenue: 12400 }, { month: "Nov", revenue: 15800 }, { month: "Dec", revenue: 14200 },
  { month: "Jan", revenue: 18600 }, { month: "Feb", revenue: 22400 }, { month: "Mar", revenue: 26800 },
];

const PLANS = [
  { name: "Starter", price: 49, agents: 12, features: ["CRM + Lead Management", "3 Market Reports", "2 Community Pages", "Basic AI Scoring"] },
  { name: "Pro", price: 99, agents: 28, features: ["Everything in Starter", "Unlimited Market Reports", "10 Community Pages", "AI Content Generation", "Drip Campaigns"] },
  { name: "Enterprise", price: 199, agents: 8, features: ["Everything in Pro", "Unlimited Everything", "Predictive Analytics", "Custom Branding", "API Access"] },
];

// Pipeline stages — used by the Kanban view
// The Market Edge — 5-Stage Lead Incubation Funnel (+ Lost).
// Colors progress cool -> warm -> hot to mirror passive -> active -> ready.
const DEFAULT_STAGES = [
  { id: "captured",   label: "Captured",   color: "#818cf8", is_entry: true }, // 01 Targeted Prospect Capture — indigo
  { id: "scored",     label: "Scored",     color: "#a78bfa" }, // 02 Intent Scoring & Segmentation — purple
  { id: "nurturing",  label: "Nurturing",  color: "#5eead4" }, // 03 Multi-Channel Nurture Incubation — teal
  { id: "warm",       label: "Warm",       color: "#f59e0b" }, // 04 Warm Signal Detection & Escalation — amber
  { id: "delivered",  label: "Delivered",  color: "#10b981" }, // 05 Hot Lead Delivery — green
  { id: "lost",       label: "Lost",       color: "#55557a" }, // dropped out — dim
];

// Public subscriber-site renderer (triskope-sites on Vercel). Preview iframes
// point here with ?slug= until per-org DNS (slug.triskope.ai) is wired.
const SITES_BASE = import.meta.env.VITE_SITES_BASE || "https://triskope-sites.vercel.app";

// Role hierarchy for permission checks (owner ⊇ team_lead ⊇ agent).
const ROLE_RANK = { owner: 3, team_lead: 2, agent: 1 };
const ACTION_MIN_RANK = {
  manage_stages: 3, manage_billing: 3, invite_member: 3, // owner only
  assign_lead: 2, setup_round_robin: 2, delete_lead: 2,  // team_lead + owner
};

// Lead segments (Stage 02 — Intent Scoring & Segmentation).
const SEGMENTS = [
  { id: "buyer",      label: "Buyer",      color: "#3b82f6" }, // blue
  { id: "seller",     label: "Seller",     color: "#10b981" }, // green
  { id: "investor",   label: "Investor",   color: "#a855f7" }, // purple
  { id: "relocation", label: "Relocation", color: "#f59e0b" }, // amber
];
const segmentOf = (id) => SEGMENTS.find(s => s.id === id) || null;

// Initial stage assignment is now stored directly on each lead row in the
// database (leads.stage), so no static map is needed here.

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "hot", label: "Hot" },
  { id: "nurture", label: "Nurture" },
  { id: "new", label: "New" },
  { id: "cold", label: "Cold" },
];

const SORT_OPTIONS = [
  { id: "score",  label: "Score (high → low)" },
  { id: "recent", label: "Most recent" },
  { id: "name",   label: "Name (A → Z)" },
];

// Grand Strand listing data — coordinates roughly approximate (NMB north, Pawleys south)
const LISTINGS = [
  { id: 1,  address: "1247 Ocean Blvd #802",        community: "Oceanfront",       area: "Myrtle Beach",       price: 485000,  beds: 3, baths: 2,   sqft: 1456, type: "Condo",         status: "active",  days: 4,  agent: "Sarah Mitchell",  lat: 33.690, lng: -78.880, photo: "🌊" },
  { id: 2,  address: "142 Springs Ave",             community: "Litchfield Beach", area: "Pawleys Island",     price: 625000,  beds: 4, baths: 3,   sqft: 2890, type: "Single Family", status: "active",  days: 2,  agent: "Sarah Mitchell",  lat: 33.495, lng: -79.080, photo: "🏡" },
  { id: 3,  address: "88 Magnolia Lake Ct",         community: "Barefoot Resort",  area: "North Myrtle Beach", price: 545000,  beds: 4, baths: 3,   sqft: 2640, type: "Single Family", status: "active",  days: 9,  agent: "James Parker",    lat: 33.815, lng: -78.715, photo: "⛳" },
  { id: 4,  address: "415 Cypress Way",             community: "Carolina Forest",  area: "Myrtle Beach",       price: 358000,  beds: 4, baths: 2.5, sqft: 2180, type: "Single Family", status: "active",  days: 14, agent: "Marcus Johnson",  lat: 33.760, lng: -78.910, photo: "🌲" },
  { id: 5,  address: "9 Beach Bridge Rd",           community: "Litchfield Beach", area: "Pawleys Island",     price: 1250000, beds: 5, baths: 4.5, sqft: 4120, type: "Single Family", status: "active",  days: 1,  agent: "Sarah Mitchell",  lat: 33.485, lng: -79.085, photo: "🏖️" },
  { id: 6,  address: "2210 N Ocean Blvd #1402",     community: "Oceanfront",       area: "Myrtle Beach",       price: 339000,  beds: 2, baths: 2,   sqft: 1180, type: "Condo",         status: "pending", days: 18, agent: "Sarah Mitchell",  lat: 33.730, lng: -78.860, photo: "🌅" },
  { id: 7,  address: "147 Grande Dunes Pkwy",       community: "Grande Dunes",     area: "Myrtle Beach",       price: 1485000, beds: 5, baths: 4.5, sqft: 4680, type: "Single Family", status: "active",  days: 22, agent: "Sarah Mitchell",  lat: 33.755, lng: -78.835, photo: "🏛️" },
  { id: 8,  address: "3 Sandhill Crane Dr",         community: "Prince Creek",     area: "Murrells Inlet",     price: 298000,  beds: 3, baths: 2,   sqft: 1820, type: "Single Family", status: "active",  days: 5,  agent: "Amy Rodriguez",   lat: 33.595, lng: -79.005, photo: "🌾" },
  { id: 9,  address: "523 Howard Ave",              community: "Market Common",    area: "Myrtle Beach",       price: 425000,  beds: 3, baths: 2.5, sqft: 1980, type: "Townhouse",     status: "active",  days: 7,  agent: "Lisa Chen",       lat: 33.665, lng: -78.910, photo: "🏘️" },
  { id: 10, address: "118 Magnolia Trail",          community: "Carolina Forest",  area: "Myrtle Beach",       price: 312000,  beds: 3, baths: 2,   sqft: 1640, type: "Single Family", status: "active",  days: 11, agent: "Marcus Johnson",  lat: 33.745, lng: -78.945, photo: "🌳" },
  { id: 11, address: "44 Pelican Pointe Dr",        community: "Barefoot Resort",  area: "North Myrtle Beach", price: 729000,  beds: 4, baths: 4,   sqft: 3210, type: "Single Family", status: "active",  days: 3,  agent: "James Parker",    lat: 33.820, lng: -78.710, photo: "⛳" },
  { id: 12, address: "8 Inlet Cove Way",            community: "Murrells Inlet",   area: "Murrells Inlet",     price: 545000,  beds: 3, baths: 3,   sqft: 2240, type: "Single Family", status: "active",  days: 6,  agent: "James Parker",    lat: 33.555, lng: -79.030, photo: "⛵" },
  { id: 13, address: "1024 N Ocean Blvd #506",      community: "Oceanfront",       area: "North Myrtle Beach", price: 412000,  beds: 2, baths: 2,   sqft: 1320, type: "Condo",         status: "active",  days: 16, agent: "James Parker",    lat: 33.810, lng: -78.715, photo: "🌊" },
  { id: 14, address: "67 Litchfield Country Club",  community: "Litchfield Beach", area: "Pawleys Island",     price: 489000,  beds: 3, baths: 2.5, sqft: 2080, type: "Single Family", status: "active",  days: 8,  agent: "Sarah Mitchell",  lat: 33.490, lng: -79.090, photo: "⛳" },
  { id: 15, address: "31 Willow Bend Ct",           community: "Carolina Forest",  area: "Conway",             price: 268000,  beds: 3, baths: 2,   sqft: 1480, type: "Single Family", status: "active",  days: 19, agent: "Marcus Johnson",  lat: 33.835, lng: -79.045, photo: "🌳" },
  { id: 16, address: "207 Surfwood Dr",             community: "Surfside Beach",   area: "Surfside Beach",     price: 385000,  beds: 3, baths: 2,   sqft: 1720, type: "Single Family", status: "active",  days: 4,  agent: "Lisa Chen",       lat: 33.605, lng: -78.965, photo: "🏖️" },
  { id: 17, address: "92 Plantation Dr",            community: "Prince Creek",     area: "Murrells Inlet",     price: 358000,  beds: 4, baths: 2.5, sqft: 2350, type: "Single Family", status: "active",  days: 12, agent: "Amy Rodriguez",   lat: 33.585, lng: -79.015, photo: "🌾" },
  { id: 18, address: "780 Grande Dunes Way #305",   community: "Grande Dunes",     area: "Myrtle Beach",       price: 695000,  beds: 3, baths: 3,   sqft: 2120, type: "Condo",         status: "active",  days: 2,  agent: "Sarah Mitchell",  lat: 33.760, lng: -78.840, photo: "🏛️" },
  { id: 19, address: "55 Boardwalk Drive",          community: "Market Common",    area: "Myrtle Beach",       price: 612000,  beds: 4, baths: 3.5, sqft: 2840, type: "Single Family", status: "active",  days: 25, agent: "Lisa Chen",       lat: 33.670, lng: -78.915, photo: "🏙️" },
  { id: 20, address: "12 Heron Lake Way",           community: "Carolina Forest",  area: "Myrtle Beach",       price: 412000,  beds: 4, baths: 3,   sqft: 2470, type: "Single Family", status: "active",  days: 8,  agent: "Marcus Johnson",  lat: 33.770, lng: -78.925, photo: "🦩" },
];

const LISTING_TYPES = ["Single Family", "Condo", "Townhouse"];
const LISTING_COMMUNITIES = ["Oceanfront", "Barefoot Resort", "Grande Dunes", "Carolina Forest", "Market Common", "Litchfield Beach", "Prince Creek", "Murrells Inlet", "Surfside Beach"];

// Static notification feed (in-memory; users mark read interactively)
const NOTIFICATIONS = [
  { id: 1,  type: "new-lead",   title: "New lead — Anthony Russo",      text: "Submitted form via Market Common community page",       time: "12 min ago",  leadId: "33333333-3333-3333-3333-00000000000C", defaultRead: false, color: "#818cf8" },
  { id: 2,  type: "hot-alert",  title: "Karen Lee is back on the site", text: "Re-viewed 142 Springs Ave for the 3rd time today",      time: "47 min ago",  leadId: "33333333-3333-3333-3333-000000000005", defaultRead: false, color: "#ef4444" },
  { id: 3,  type: "task-due",   title: "Follow-up due today",            text: "Send shortlist to the Fosters (lease ends in 30d)",     time: "2h ago",      leadId: "33333333-3333-3333-3333-000000000009", defaultRead: false, color: "#f59e0b" },
  { id: 4,  type: "ai-suggest", title: "AI suggestion",                  text: "Tom Baker's engagement dropped — try a re-engagement email", time: "3h ago",  leadId: "33333333-3333-3333-3333-000000000008", defaultRead: false, color: "#a78bfa" },
  { id: 5,  type: "showing",    title: "Showing confirmed",              text: "James booked Saturday tour for the Fosters in NMB",     time: "yesterday",   leadId: "33333333-3333-3333-3333-000000000009", defaultRead: false, color: "#10b981" },
  { id: 6,  type: "new-lead",   title: "New lead — Steve Chen",          text: "Just signed up. Auto-qualifying based on session signals", time: "yesterday", leadId: "33333333-3333-3333-3333-000000000006", defaultRead: true,  color: "#818cf8" },
  { id: 7,  type: "ai-suggest", title: "AI suggestion",                  text: "Robert Williams is likely to write an offer in 30-60 days — move to Showing?", time: "yesterday", leadId: "33333333-3333-3333-3333-000000000001", defaultRead: true, color: "#a78bfa" },
  { id: 8,  type: "hot-alert",  title: "Pre-approval cleared",           text: "Marcus & Tonya Reed underwriting cleared — move to Qualified", time: "2 days ago", leadId: "33333333-3333-3333-3333-00000000000B", defaultRead: true, color: "#ef4444" },
  { id: 9,  type: "task-due",   title: "Open house this Saturday",       text: "1247 Ocean Blvd #802 — 12-3pm",                          time: "2 days ago",  leadId: null, defaultRead: true, color: "#f59e0b" },
  { id: 10, type: "ai-suggest", title: "Market insight",                 text: "Inventory in Pawleys Island dropped 8% this month — strong sellers' window", time: "3 days ago", leadId: null, defaultRead: true, color: "#a78bfa" },
];

const NOTIFICATION_ICONS = {
  "new-lead":   Users,
  "hot-alert":  AlertCircle,
  "task-due":   CalendarPlus,
  "ai-suggest": Lightbulb,
  "showing":    MapPin,
};

// ============================================================
// AI: thinking phases + content generators (context-aware)
// ============================================================

const THINKING_PHASES = {
  "market-report": ["Connecting to MLS feed", "Pulling 90 day sales data", "Calculating price + DOM trends", "Drafting narrative"],
  "listing-desc": ["Reading property details", "Analyzing comparable listings", "Choosing emotional hooks", "Polishing copy"],
  "email-campaign": ["Reading lead profile", "Selecting tone + cadence", "Drafting subject lines", "Composing sequence"],
  "lead-score": ["Pulling behavioral signals", "Weighting engagement events", "Cross-referencing intent model", "Generating recommendations"],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function genMarketReport(ctx) {
  const market = ctx?.title || pick(["Myrtle Beach", "North Myrtle Beach", "Pawleys Island", "Conway"]);
  const inv = ctx?.inv ?? Math.floor(120 + Math.random() * 240);
  const avgPriceStr = ctx?.avgPrice ?? "$" + (280 + Math.floor(Math.random() * 200)).toLocaleString() + ",000";
  const avgPriceNum = parseInt(String(avgPriceStr).replace(/[^0-9]/g, ""), 10) || 345000;
  const yoyChange = ctx?.priceChange ?? "+" + (2 + Math.random() * 6).toFixed(1) + "%";
  const dom = ctx?.dom ?? Math.floor(35 + Math.random() * 30);

  const opener = pick([
    `${market} continues to show resilient demand into Q2 2026, with steady price appreciation and tightening inventory.`,
    `The ${market} market is tilting in favor of well-priced sellers heading into spring. Buyers who hesitate are losing offers.`,
    `Buyer activity in ${market} is up sharply versus the same period last year, putting upward pressure on prices.`,
  ]);
  const inventoryNote = inv < 200 ? "Inventory remains tight — under 4 months of supply at current absorption." :
    inv < 280 ? "Inventory is balanced — roughly 4 to 5 months of supply, slightly favoring sellers." :
    "Inventory is climbing, giving buyers more leverage than they had last quarter.";
  const forecast = pick([
    `Expect continued appreciation of 3 to 5 percent through Q3, with single-family inventory likely to remain constrained.`,
    `Watch for a modest seasonal cooling in late summer before fall demand resumes. Use this window to negotiate.`,
    `Sellers who price within 2 percent of market are still seeing offers inside the first weekend. Buyers should arrive pre-approved.`,
  ]);

  // 6-month price trend ending at avgPriceNum
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const trendStart = avgPriceNum * 0.92;
  const priceTrend = months.map((m, i) => ({
    month: m,
    price: Math.round(trendStart + (avgPriceNum - trendStart) * (i / (months.length - 1)) + (Math.random() - 0.5) * avgPriceNum * 0.01),
  }));
  const inventoryTrend = months.map((m, i) => ({
    month: m,
    inv: Math.round(inv * (1.18 - i * 0.03) + (Math.random() - 0.5) * 20),
  }));

  const segments = pick([
    { name: "Oceanfront condos", reason: "low new construction and second-home demand" },
    { name: "Single-story patio homes", reason: "boomers driving an active relocation wave" },
    { name: "Golf community resales", reason: "limited inventory and aging-in-place buyers" },
  ]);

  return {
    kind: "market-report",
    market,
    date: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    agentName: ctx?.agent || "Sarah Mitchell",
    summary: opener + " " + inventoryNote,
    stats: {
      avgPrice: avgPriceStr,
      priceChange: yoyChange,
      inventory: inv,
      inventoryChange: inv < 240 ? "−12% YoY" : "+4% YoY",
      dom,
      domChange: dom < 45 ? "−7 days" : "+3 days",
      newListings: Math.max(8, Math.round(inv * 0.12)),
    },
    priceTrend,
    inventoryTrend,
    trends: [
      {
        heading: "Strongest segment: " + segments.name,
        text: `${segments.name} are seeing the fastest pace of sale — driven by ${segments.reason}. Listings priced at or below comp average are receiving multiple offers within the first weekend.`,
      },
      {
        heading: "Days on market shrinking",
        text: `Time on market dropped to ${dom} days, ${pick(["roughly 12% faster", "about a week shorter", "noticeably tighter"])} than the same period last year. The shift is most pronounced in the sub-$${avgPriceNum < 400000 ? "400K" : "500K"} segment.`,
      },
      {
        heading: "Buyer mix is shifting",
        text: pick([
          "Relocations from the Northeast are now the largest share of buyer activity, with cash offers up materially among that group.",
          "Second-home and investor demand continues to drive the upper price tiers, while local move-ups are driving the mid-range.",
          "Out-of-state buyers represent roughly 40% of contracts, a meaningful jump over last year.",
        ]),
      },
    ],
    forecast,
    sources: ["Coastal Carolinas MLS, May 2026 closed sales", "triskope analytics", "agent broker network"],
  };
}

function genListingDesc(ctx) {
  const area = ctx?.area || ctx?.community || pick(["Barefoot Resort", "Grande Dunes", "Pawleys Island", "Carolina Forest", "Market Common"]);
  const beds = ctx?.beds ?? pick([3, 4, 4, 5]);
  const baths = ctx?.baths ?? pick([2, 2.5, 3, 3.5]);
  const sqft = ctx?.sqft ?? Math.round(1800 + Math.random() * 1500);
  const priceNum = ctx?.price ?? 425000 + Math.round(Math.random() * 400000);
  const address = ctx?.address || pick(["1247 Ocean Blvd #802", "142 Springs Ave", "88 Magnolia Lake Ct", "44 Pelican Pointe Dr"]);
  const photo = ctx?.photo || pick(["🌊", "🏡", "🏖️", "⛳", "🌅"]);

  const headline = pick([
    "Coastal Living, Reimagined",
    "Your Low Country Retreat Awaits",
    "A Rare Offering in " + area,
    "Where Comfort Meets Craftsmanship",
  ]);

  return {
    kind: "listing-desc",
    headline,
    address,
    community: area,
    price: priceNum,
    beds, baths, sqft,
    photo,
    agentName: ctx?.agent || "Sarah Mitchell",
    paragraphs: [
      pick([
        `From the moment you turn onto the drive, this ${beds}BR / ${baths}BA tells you it's different. Soaring ceilings, an open-concept living area, and a chef's kitchen anchored by quartz counters, custom cabinetry, and high-end stainless appliances.`,
        `Welcome to your Low Country retreat. This thoughtfully designed ${beds}BR / ${baths}BA blends comfort and craftsmanship — wide-plank hardwoods, plantation shutters, and an open floor plan made for entertaining.`,
        `A rare ${beds}BR / ${baths}BA find — the kind of home buyers ask about every week. Floor-to-ceiling natural light, an oversized chef's kitchen with island seating for six, and a flow that feels effortless.`,
      ]),
      pick([
        "The primary suite is a true escape — a spa-style bath with dual vanities, a soaking tub, and a walk-in closet you'll actually find room in. Secondary bedrooms each have generous closet space and access to upgraded baths.",
        "The owner's retreat features an oversized walk-in shower, freestanding tub, and a walk-in closet that runs the depth of the suite. Three additional bedrooms provide flexibility for family, guests, or a home office.",
      ]),
      pick([
        `Out back, the screened porch and travertine patio overlook a beautifully landscaped yard with mature live oaks — the kind of outdoor living that defines coastal Carolina.`,
        `Step outside to a private courtyard with a custom paver patio, fire pit, and room for a future pool. The lot gives you outdoor space that's increasingly rare in ${area}.`,
        `Enjoy unobstructed views from the rear deck, engineered for morning coffee and sunset cocktails. Privacy, mature landscaping, and a layout designed around outdoor living.`,
      ]),
    ],
    highlights: [
      pick(["Chef's kitchen with quartz counters", "Whole-house generator", "Smart-home wiring throughout", "Tankless water heater"]),
      pick(["Screened porch with travertine floor", "Oversized walk-in pantry", "First-floor primary suite", "Custom plantation shutters"]),
      pick(["Three-car garage with epoxy floor", "Custom mudroom drop zone", "Hurricane-rated windows", "Tray ceilings in the main living areas"]),
      pick(["Walking distance to community amenities", "Two-minute drive to the beach", "Top-rated school zone", "Oceanfront cabana access"]),
    ],
    amenities: pick([
      "Championship golf, oceanfront cabana access, and resort-style pools.",
      area + " delivers walkable shopping, top-rated schools, and a tight-knit community feel just minutes from the beach.",
      "Steps from miles of beach access, restaurants, and the Intracoastal Waterway.",
    ]),
  };
}

function genEmailCampaign(ctx) {
  const name = ctx?.name?.split(" ")[0] || "[First Name]";
  const area = ctx?.area || "the Grand Strand";
  const agentName = ctx?.agent || "Sarah Mitchell";
  const agentFirst = agentName.split(" ")[0];
  return {
    kind: "email-campaign",
    from: { name: agentName, email: agentFirst.toLowerCase() + "@triskope.io" },
    to: { name: ctx?.name || "[Lead name]", email: ctx?.email || "lead@example.com" },
    subject: pick([
      "Three " + area + " homes I think you'll love",
      "Your weekly " + area + " market check-in",
      "Quick update — and a home worth seeing",
    ]),
    date: new Date(),
    greeting: `Hi ${name},`,
    paragraphs: [
      `Quick update on ${area} — I wanted to put a few things in front of you before the weekend.`,
      `The market shifted faster than expected this month. Median price is up year over year, days on market are tighter, and I'm seeing more buyer activity at the entry tier. Here's a snapshot you can scan in 30 seconds:`,
    ],
    stats: [
      { label: "Median price (YoY)", value: pick(["+5.2%", "+4.6%", "+3.8%"]) },
      { label: "Days on market",     value: pick(["42 days", "45 days", "48 days"]) },
      { label: "New listings",       value: "+" + pick(["8%", "11%", "6%"]) + " MoM" },
    ],
    listingsHeader: "Three homes that fit what you're looking for:",
    listings: [
      { address: "1247 Ocean Blvd #802", price: "$485,000", note: pick(["Price-improved $10K", "First weekend — no offers yet", "Motivated seller, willing to negotiate"]) },
      { address: "142 Springs Ave",       price: "$625,000", note: pick(["Just listed Friday", "Matches the layout you mentioned", "Creek-front, very rare"]) },
      { address: "88 Magnolia Lake Ct",   price: "$545,000", note: pick(["Strong comps in this range", "Below list for the neighborhood", "Freshly renovated"]) },
    ],
    closing: `If any of these are worth a closer look, just hit reply and I'll send the full listing packets. Happy to set up a same-day tour if it makes sense.`,
    cta: "Schedule a tour with " + agentFirst,
    signoff: { name: agentName, title: "Licensed agent · Grand Strand", phone: "(843) 555-0100", email: agentFirst.toLowerCase() + "@triskope.io" },
  };
}

function genLeadScore(lead) {
  if (!lead) {
    return {
      kind: "lead-score",
      empty: true,
      message: "Open a lead's profile and run AI Score Analysis from there — that way the model can use real behavioral signals from that contact.",
    };
  }
  const positive = [];
  const negative = [];
  if (lead.score >= 80) positive.push({ label: "High overall engagement", weight: 22 });
  if (lead.tags?.includes("pre-approved")) positive.push({ label: "Pre-approval letter on file", weight: 18 });
  if (lead.tags?.includes("ready-to-offer")) positive.push({ label: "Stated intent to write an offer this week", weight: 20 });
  if (lead.activity?.some(a => a.type === "showing")) positive.push({ label: "Attended an in-person showing", weight: 15 });
  if ((lead.activity?.filter(a => a.type === "view") || []).length >= 2) positive.push({ label: "Repeat site visits in the past week", weight: 12 });
  if (lead.activity?.some(a => a.type === "call")) positive.push({ label: "Direct phone conversation with assigned agent", weight: 14 });
  if (lead.tags?.includes("low-engagement")) negative.push({ label: "Engagement has dropped off in the last 3 weeks", weight: -16 });
  if (!lead.activity?.some(a => a.type === "call")) negative.push({ label: "No phone conversation yet", weight: -8 });
  if (lead.tags?.includes("needs-preapproval")) negative.push({ label: "Pre-approval still pending", weight: -10 });
  if (lead.status === "cold") negative.push({ label: "Status flagged cold — recent email bounces", weight: -18 });

  const recommendation = lead.status === "hot"
    ? pick([
        { title: "Call today to discuss specific listings and confirm timeline", subtitle: "Window is open; intent is high. Get specific while energy is fresh." },
        { title: "Book an in-person tour for this weekend", subtitle: "Hot leads who tour within 7 days close at 3x the rate of those who don't." },
        { title: "Send a tailored shortlist of 3 homes", subtitle: "Match their stated budget and area; include one stretch option." },
      ])
    : lead.status === "new"
    ? pick([
        { title: "Warm outreach call within 24 hours", subtitle: "Keep it casual — first-touch speed is the single biggest conversion lever." },
        { title: "Send the relevant community report + a personal welcome email", subtitle: "Establish value before asking anything in return." },
        { title: "Trigger the 'new buyer' drip sequence and tag for follow-up", subtitle: "Automate the cadence; you can personalize after the first reply." },
      ])
    : lead.status === "nurture"
    ? pick([
        { title: "Drop a low-friction check-in email", subtitle: "Share a fresh listing relevant to their area — no ask." },
        { title: "Invite to an upcoming open house in their target neighborhood", subtitle: "Low commitment, high signal." },
        { title: "Send a value-add piece (financing options, schools, local guide)", subtitle: "Stay top of mind without pushing for a decision." },
      ])
    : pick([
        { title: "Move to quarterly 'just in case' sequence", subtitle: "Skip immediate outreach; this lead is dormant." },
        { title: "Try a polite re-engagement email", subtitle: "If no open within 7 days, downgrade priority and reclaim the slot." },
      ]);

  const intent = Math.min(95, Math.max(15, Math.round(lead.score * 0.9 + (lead.activity?.length || 0) * 1.5)));
  const classification = lead.status === "hot" ? "Hot lead" :
                         lead.status === "nurture" ? "Warm lead" :
                         lead.status === "new" ? "Fresh lead" : "Cold lead";
  const classificationColor =
    lead.status === "hot" ? "#ef4444" :
    lead.status === "nurture" ? "#f59e0b" :
    lead.status === "new" ? "#818cf8" :
    "#55557a";

  return {
    kind: "lead-score",
    leadName: lead.name,
    score: lead.score,
    intent,
    classification,
    classificationColor,
    positive: positive.slice(0, 4),
    negative: negative.slice(0, 3),
    recommendation,
    quickFacts: [
      { label: "Email",    value: lead.email || "—" },
      { label: "Phone",    value: lead.phone || "—" },
      { label: "Score",    value: lead.score != null ? String(lead.score) : "—" },
      { label: "Activity", value: (lead.activity?.length || 0) + " events" },
    ],
  };
}

function generateAI(type, ctx) {
  switch (type) {
    case "market-report": return genMarketReport(ctx);
    case "listing-desc": return genListingDesc(ctx);
    case "email-campaign": return genEmailCampaign(ctx);
    case "lead-score": return genLeadScore(ctx);
    default: return genMarketReport(ctx);
  }
}

// ============================================================
// SMALL UI HELPERS
// ============================================================

const Badge = ({ children, color = C.teal }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: color + "18", color }}>{children}</span>
);

// Small colored pill showing a lead's segment. Renders nothing if unsegmented.
const SegmentTag = ({ segment, size = "sm" }) => {
  const s = SEGMENTS.find(x => x.id === segment);
  if (!s) return null;
  const pad = size === "sm" ? "1px 7px" : "2px 9px";
  const fs = size === "sm" ? 9.5 : 11;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: pad, borderRadius: 999,
      background: s.color + "22", color: s.color, fontSize: fs, fontWeight: 700,
      letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
};

const Avatar = ({ name, size = 36, color = C.teal }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
    {name.split(" ").map(n => n[0]).join("").slice(0, 2)}
  </div>
);

// Lightweight markdown renderer — renders **bold**, *italic*, # headings,
// - bullet lists, 1. numbered lists, and paragraphs. No external deps.
// Styled to match the app (clean sans, comfortable spacing).
const renderInline = (text) => {
  // Split on **bold** and *italic*, keep delimiters
  const parts = [];
  let remaining = text;
  let key = 0;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) parts.push(<code key={key++} style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.9em", background: C.bg, padding: "1px 5px", borderRadius: 4 }}>{tok.slice(1, -1)}</code>);
    else parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    lastIndex = m.index + tok.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
};

const MarkdownText = ({ text }) => {
  if (!text) return null;
  const lines = String(text).split("\n");
  const blocks = [];
  let listBuf = [];
  let listType = null;
  const flushList = (k) => {
    if (!listBuf.length) return;
    const items = listBuf.map((it, i) => <li key={i} style={{ marginBottom: 4 }}>{renderInline(it)}</li>);
    blocks.push(listType === "ol"
      ? <ol key={"l" + k} style={{ margin: "4px 0 12px", paddingLeft: 22, lineHeight: 1.6 }}>{items}</ol>
      : <ul key={"l" + k} style={{ margin: "4px 0 12px", paddingLeft: 22, lineHeight: 1.6 }}>{items}</ul>);
    listBuf = []; listType = null;
  };
  lines.forEach((raw, idx) => {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { flushList(idx); return; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const num = line.match(/^\d+\.\s+(.*)$/);
    if (h) {
      flushList(idx);
      const lvl = h[1].length;
      const size = lvl === 1 ? 20 : lvl === 2 ? 17 : 15;
      blocks.push(<div key={idx} style={{ fontSize: size, fontWeight: 700, color: C.text, margin: "14px 0 6px", fontFamily: SERIF_FONT }}>{renderInline(h[2])}</div>);
    } else if (bullet) {
      if (listType && listType !== "ul") flushList(idx);
      listType = "ul"; listBuf.push(bullet[1]);
    } else if (num) {
      if (listType && listType !== "ol") flushList(idx);
      listType = "ol"; listBuf.push(num[1]);
    } else {
      flushList(idx);
      blocks.push(<p key={idx} style={{ margin: "0 0 12px", lineHeight: 1.7, color: C.text, fontSize: 14 }}>{renderInline(line)}</p>);
    }
  });
  flushList("end");
  return <div>{blocks}</div>;
};

const StatCard = ({ icon: Icon, label, value, change, color = C.teal, subtitle, isMobile, sparkline }) => (
  <div style={{
    background: C.bgCard, borderRadius: 12, padding: isMobile ? 16 : 20,
    border: `1px solid ${C.border}`,
    flex: isMobile ? "1 1 100%" : 1, minWidth: isMobile ? "auto" : 200,
    transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
    position: "relative", overflow: "hidden",
  }}
       onMouseEnter={e => { e.currentTarget.style.borderColor = color + "55"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 24px ${color}12`; }}
       onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={20} color={color} /></div>
      {change && <span style={{ fontSize: 13, fontWeight: 600, color: C.green, display: "flex", alignItems: "center", gap: 2 }}><TrendingUp size={14} /> {change}</span>}
    </div>
    <div style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, lineHeight: 1, letterSpacing: "0.01em" }}>{value}</div>
    <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{label}</div>
    {subtitle && <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{subtitle}</div>}
    {sparkline && sparkline.length > 0 && (
      <div style={{ marginTop: 10, marginLeft: -4, marginRight: -4, marginBottom: -4 }}>
        <Sparkline data={sparkline} color={color} />
      </div>
    )}
  </div>
);

const Score = ({ score }) => {
  const color = score >= 80 ? C.teal : score >= 50 ? C.amber : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }} aria-label={`Lead score ${score} out of 100`}>
      <div style={{ width: 48, height: 6, borderRadius: 3, background: C.border }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{score}</span>
    </div>
  );
};

const StatusDot = ({ status }) => {
  const colors = { hot: C.red, nurture: C.amber, cold: C.textDim, new: C.blue, published: C.teal, draft: C.textDim };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || C.textDim }} />
      <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: "capitalize" }}>{status}</span>
    </div>
  );
};

const EmptyState = ({ icon: Icon = Inbox, title, message, action }) => (
  <div style={{ padding: "48px 20px", textAlign: "center", color: C.textMuted }}>
    <div style={{ width: 56, height: 56, borderRadius: 14, background: C.bg, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
      <Icon size={24} color={C.textDim} />
    </div>
    <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{title}</div>
    {message && <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 320, margin: "0 auto" }}>{message}</div>}
    {action}
  </div>
);

const Toast = ({ message, kind = "success", onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2400);
    return () => clearTimeout(t);
  }, [onDismiss]);
  const color = kind === "error" ? C.red : kind === "info" ? C.blue : C.teal;
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 600,
      background: C.bgCard, border: `1px solid ${color}55`, borderLeft: `3px solid ${color}`,
      borderRadius: 8, padding: "10px 16px", color: C.text, fontSize: 13, fontWeight: 500,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 8,
      animation: "tk-toast 0.2s ease",
    }}>
      <Check size={14} color={color} /> {message}
    </div>
  );
};

const ActivityRow = ({ event }) => {
  const Icon = ICONS[event.icon] || Activity;
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color={C.teal} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.35 }}>{event.text}</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{event.time}</div>
      </div>
    </div>
  );
};

// Pulsing skeleton placeholder while data loads
const Skeleton = ({ width = "100%", height = 16, style = {} }) => (
  <div style={{
    width, height,
    background: `linear-gradient(90deg, ${C.bgHover} 0%, ${C.borderLight} 50%, ${C.bgHover} 100%)`,
    backgroundSize: "200% 100%",
    borderRadius: 6,
    animation: "tk-shimmer 1.4s linear infinite",
    ...style,
  }} />
);

// Tiny inline trend chart used inside StatCard
const Sparkline = ({ data, color = C.teal, height = 28 }) => {
  const id = `spark-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#${id})`} strokeWidth={1.6} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Branded tooltip for the dashboard charts
const ChartTooltip = ({ active, payload, label, valueFormatter, labelFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.borderLight}`,
      borderRadius: 8, padding: "8px 12px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
      pointerEvents: "none",
    }}>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      <div style={{ fontSize: 15, color: C.text, fontWeight: 700 }}>
        {valueFormatter ? valueFormatter(payload[0].value) : payload[0].value}
      </div>
    </div>
  );
};

// ============================================================
// AI Assistant — simulated reply generator
// ============================================================

function pickReplyVariant(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function summarizeReply(ctx) {
  const hot = ctx.leads.filter(l => l.status === "hot");
  const fresh = ctx.leads.filter(l => l.status === "new");
  const overdue = ctx.taskBuckets?.overdue?.length || 0;
  const dueToday = ctx.taskBuckets?.today?.length || 0;
  return [
    `Here's the rundown across your book this week:`,
    ``,
    `• ${hot.length} hot leads — top priorities: ${hot.slice(0, 2).map(l => l.name).join(" and ") || "none right now"}.`,
    `• ${fresh.length} fresh leads sitting in 'new' status, waiting on first outreach.`,
    `• ${overdue} overdue follow-ups, ${dueToday} due today.`,
    ``,
    pickReplyVariant([
      `Where do you want to start? I can draft a touch-base email for ${hot[0]?.name?.split(" ")[0] || "your top lead"}, or surface the new leads with a suggested first message.`,
      `Want me to draft outreach for the new leads, or focus on closing one of the hot ones?`,
      `Let me know which lead to dig into and I'll pull up everything I know.`,
    ]),
  ].join("\n");
}

function draftReply(prompt, ctx) {
  const target = ctx.selectedLead
    || ctx.leads.find(l => prompt.toLowerCase().includes(l.name.toLowerCase()))
    || ctx.leads.find(l => l.status === "hot")
    || ctx.leads[0];
  if (!target) return "Open a lead's profile first — that way I can write something specific instead of generic.";
  const first = target.name.split(" ")[0];
  const body = pickReplyVariant([
    `Hi ${first},\n\nWanted to circle back on ${target.area || "your search"}. I just pulled three places in your range that I think are worth a look — one of them is freshly listed and priced to move. Want me to send the full listing packets, or set up a same-day tour?\n\n— ${ctx.profile?.display_name?.split(" ")[0] || "Sarah"}`,
    `Hi ${first},\n\nQuick update — the ${target.area || "Grand Strand"} market shifted this week. ${target.budget ? "Two listings just hit in the " + target.budget + " range" : "A couple of fresh listings hit in your range"}. Worth a 10-minute call this week? I can shortlist three for you to consider.\n\n— ${ctx.profile?.display_name?.split(" ")[0] || "Sarah"}`,
    `Hi ${first},\n\nThinking about you. I know we talked about ${target.interest || "your move"} — wanted to check in and see if anything has shifted on your side. ${target.tags?.includes("pre-approved") ? "You're still in great position with pre-approval, " : ""}happy to send fresh comps anytime.\n\n— ${ctx.profile?.display_name?.split(" ")[0] || "Sarah"}`,
  ]);
  return [
    `Draft for ${target.name}:`,
    ``,
    body,
    ``,
    `Want me to refine the tone, make it shorter, or send it now?`,
  ].join("\n");
}

function hotLeadsReply(ctx) {
  const hot = ctx.leads.filter(l => l.status === "hot").sort((a, b) => b.score - a.score);
  if (hot.length === 0) return "You don't have anyone hot right now. Your warmest leads are " + ctx.leads.filter(l => l.status === "nurture").slice(0, 2).map(l => l.name).join(" and ") + ".";
  const lines = [`Three people I'd put first today:`, ``];
  hot.slice(0, 3).forEach((l, i) => {
    lines.push(`${i + 1}. ${l.name} — score ${l.score}, ${l.area}. ${l.aiNotes?.split(".")[0] || ""}.`);
  });
  lines.push("");
  lines.push("Want me to draft outreach for any of them?");
  return lines.join("\n");
}

function marketReply(ctx, prompt) {
  const area = ctx.leads.find(l => prompt.toLowerCase().includes((l.area || "").toLowerCase()))?.area
            || ctx.selectedLead?.area
            || pickReplyVariant(["Myrtle Beach", "Pawleys Island", "North Myrtle Beach"]);
  return [
    `${area} market in one paragraph:`,
    ``,
    `Median price is up ${pickReplyVariant(["5.2%", "4.6%", "3.8%"])} year-over-year. Inventory is ${pickReplyVariant(["tight at under 4 months of supply", "balanced — about 4-5 months", "climbing modestly"])}. Days on market is ${pickReplyVariant(["dropping fast", "down 12% vs. last quarter", "the tightest it's been since fall"])}, especially in the sub-$500K segment.`,
    ``,
    `Buyer behavior to know:`,
    `• Out-of-state relocations are now the biggest buyer pool, with cash offers up materially.`,
    `• Sellers pricing within 2% of market are still getting weekend offers.`,
    `• Want a full one-pager I can send to a client? Run AI Tools → Market Report Generator.`,
  ].join("\n");
}

function taskReply(prompt, ctx) {
  const target = ctx.selectedLead || ctx.leads.find(l => l.status === "hot") || ctx.leads[0];
  const when = /tomorrow/i.test(prompt) ? "tomorrow"
            : /friday/i.test(prompt)    ? "Friday"
            : /weekend/i.test(prompt)   ? "Saturday"
            : "tomorrow";
  return [
    `Got it. I can stage a follow-up for ${target?.name || "this lead"} for ${when}.`,
    ``,
    `Suggested task:`,
    `• "Call ${target?.name?.split(" ")[0] || "lead"} to confirm tour timing + answer financing questions"`,
    `• Due ${when}`,
    `• Priority: ${target?.status === "hot" ? "high" : "normal"}`,
    ``,
    `Tap the lead's detail page → Follow-ups to schedule, or tell me to do it and I'll add it directly.`,
  ].join("\n");
}

function scoreReply(prompt, ctx) {
  const target = ctx.selectedLead || ctx.leads.find(l => l.status === "hot") || ctx.leads[0];
  if (!target) return "I don't have a lead picked. Open one and ask again — I'll score them with real signals.";
  return [
    `Quick read on ${target.name}:`,
    ``,
    `• Engagement score ${target.score}/100 — ${target.score >= 80 ? "very strong" : target.score >= 60 ? "warm" : target.score >= 40 ? "needs nurturing" : "cold"}.`,
    `• ${target.tags?.includes("pre-approved") ? "Pre-approval is on file." : "Pre-approval not yet confirmed — financing is the next conversation."}`,
    `• ${(target.activity?.filter(a => a.type === "view") || []).length} recent listing views.`,
    ``,
    `Want the full structured analysis with the recommendation card? Run AI Tools → Lead Score Analysis from their detail page.`,
  ].join("\n");
}

function defaultReply(prompt, ctx) {
  return pickReplyVariant([
    `I can help with summarizing your leads, drafting outreach, pulling up hot leads, market questions, or scheduling follow-ups. What's the priority right now?`,
    `I'm best at four things today: a daily summary, drafting messages to a specific lead, telling you which leads to call next, and market snapshots. Want one of those?`,
    `Tell me what you're trying to do — close a deal, write a message, find a lead, understand the market — and I'll get you there.`,
  ]);
}

function generateAssistantReply(prompt, ctx) {
  const p = prompt.toLowerCase();
  if (/summar|recap|what.?happened|rundown|today|this week/.test(p)) return summarizeReply(ctx);
  if (/which lead|hot lead|top lead|priority|who should/.test(p))  return hotLeadsReply(ctx);
  if (/draft|write|message|email|follow.?up|reply/.test(p))         return draftReply(prompt, ctx);
  if (/market|trend|inventory|price|days on market|appreciat/.test(p)) return marketReply(ctx, prompt);
  if (/schedul|task|remind|call .* (tomorrow|friday|weekend)/.test(p)) return taskReply(prompt, ctx);
  if (/score|analy|how is|read on/.test(p))                          return scoreReply(prompt, ctx);
  return defaultReply(prompt, ctx);
}

// ============================================================
// AI document components — render structured AI output as
// professional, print-ready documents
// ============================================================

const docFont = `"Calibri", "Helvetica Neue", -apple-system, system-ui, sans-serif`;

const formatMoney = (n) => "$" + Math.round(n).toLocaleString();

function DocHeader({ kind, title, subtitle, agentName, date }) {
  const initials = (agentName || "").split(" ").map(s => s[0]).join("");
  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0a14 0%, #1e1e32 100%)",
      color: "#ffffff", padding: "20px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: C.teal, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
          {kind}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#fff", lineHeight: 1.15 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: "#a0a0c0", marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "#8888a8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Prepared</div>
          <div style={{ fontSize: 12, color: "#fff", marginTop: 2 }}>{date}</div>
          {agentName && <div style={{ fontSize: 12, color: C.teal, marginTop: 2, fontWeight: 700 }}>by {agentName}</div>}
        </div>
        {agentName && (
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0a0a14", fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>{initials}</div>
        )}
      </div>
    </div>
  );
}

function DocFooter({ agentName, sources }) {
  return (
    <div style={{
      borderTop: "1px solid #e2e3ec",
      padding: "16px 28px",
      background: "#fafafd",
      fontSize: 10, color: "#55557a",
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
    }}>
      <div>
        {sources && sources.length > 0 && <>Sources: {sources.join(" · ")}<br /></>}
        Prepared by {agentName || "your triskope agent"}.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span>Powered by</span>
        <span style={{ color: "#0d8b75", fontWeight: 800, letterSpacing: "0.05em" }}>triskope</span>
      </div>
    </div>
  );
}

function MarketReportDoc({ data }) {
  const yoyPos = (data.stats.priceChange || "").startsWith("+");
  return (
    <div className="tk-print" style={{ background: "#ffffff", color: "#1a1a2e", borderRadius: 10, overflow: "hidden", fontFamily: docFont, boxShadow: "0 12px 36px rgba(0,0,0,0.45)" }}>
      <DocHeader
        kind="Market Report"
        title={data.market}
        subtitle={data.date + " · Grand Strand"}
        agentName={data.agentName}
        date={data.date}
      />

      <div style={{ padding: "24px 28px" }}>
        {/* Summary */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0d8b75", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
          Executive Summary
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#1a1a2e", margin: "0 0 20px" }}>{data.summary}</p>

        {/* Stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Median price",  value: data.stats.avgPrice,         delta: data.stats.priceChange,    pos: yoyPos },
            { label: "Active listings", value: data.stats.inventory,      delta: data.stats.inventoryChange, pos: !data.stats.inventoryChange.startsWith("+") },
            { label: "Days on market",  value: data.stats.dom + "d",      delta: data.stats.domChange,       pos: data.stats.domChange.startsWith("−") || data.stats.domChange.startsWith("-") },
            { label: "New listings",    value: data.stats.newListings,    delta: "this month",               pos: true },
          ].map(s => (
            <div key={s.label} style={{ padding: 14, borderRadius: 10, background: "#f6f7fb", border: "1px solid #e2e3ec" }}>
              <div style={{ fontSize: 10, color: "#55557a", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "#1a1a2e" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.pos ? "#0d8b75" : "#c83a3a", fontWeight: 600, marginTop: 2 }}>
                {s.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Price trend chart */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0d8b75", letterSpacing: "0.08em", textTransform: "uppercase" }}>6-Month Price Trend</span>
            <span style={{ fontSize: 10, color: "#55557a" }}>Median sale price by month</span>
          </div>
          <div style={{ height: 180, background: "#fafafd", borderRadius: 10, border: "1px solid #e2e3ec", padding: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.priceTrend} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="doc-price-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e3ec" strokeDasharray="2 6" vertical={false} />
                <XAxis dataKey="month" stroke="#55557a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#55557a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => "$" + Math.round(v/1000) + "K"} width={48} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e2e3ec", borderRadius: 8, fontSize: 12 }}
                  formatter={v => formatMoney(v)}
                />
                <Area type="monotone" dataKey="price" stroke="#0d8b75" fill="url(#doc-price-grad)" strokeWidth={2.5} activeDot={{ r: 4, fill: "#0d8b75" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend bullets */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0d8b75", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            What's Moving the Market
          </div>
          {data.trends.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < data.trends.length - 1 ? "1px solid #e2e3ec" : "none" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #5eead4, #818cf8)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 2 }}>{t.heading}</div>
                <div style={{ fontSize: 13, color: "#3a3a52", lineHeight: 1.55 }}>{t.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Forecast callout */}
        <div style={{
          background: "linear-gradient(135deg, #ecf6f5 0%, #eef0fd 100%)",
          padding: "16px 18px", borderRadius: 10,
          border: "1px solid #c8e8e0",
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0d8b75", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Forecast & Recommendation
          </div>
          <div style={{ fontSize: 14, color: "#1a1a2e", lineHeight: 1.6 }}>{data.forecast}</div>
        </div>
      </div>

      <DocFooter agentName={data.agentName} sources={data.sources} />
    </div>
  );
}

function ListingFlyerDoc({ data }) {
  return (
    <div className="tk-print" style={{ background: "#ffffff", color: "#1a1a2e", borderRadius: 10, overflow: "hidden", fontFamily: docFont, boxShadow: "0 12px 36px rgba(0,0,0,0.45)" }}>
      {/* Hero image area */}
      <div style={{
        height: 220,
        background: `linear-gradient(135deg, #5eead430 0%, #818cf830 50%, #a78bfa30 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 92,
        position: "relative",
      }}>
        {data.photo}
        <div style={{
          position: "absolute", top: 14, left: 14,
          background: "linear-gradient(135deg, #0a0a14, #1e1e32)", color: "#fff",
          padding: "6px 12px", borderRadius: 6, fontSize: 10,
          letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
        }}>Featured Listing</div>
        <div style={{
          position: "absolute", bottom: 14, right: 14,
          background: "rgba(255,255,255,0.95)", color: "#0d8b75",
          padding: "6px 12px", borderRadius: 6, fontSize: 14, fontWeight: 800,
        }}>{formatMoney(data.price)}</div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0d8b75", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
          {data.community}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", color: "#1a1a2e", lineHeight: 1.15 }}>{data.headline}</h1>
        <div style={{ fontSize: 15, color: "#3a3a52", marginBottom: 18 }}>{data.address}</div>

        {/* Beds / baths / sqft icons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Bedrooms", value: data.beds, icon: BedDouble },
            { label: "Bathrooms", value: data.baths, icon: Bath },
            { label: "Square feet", value: data.sqft.toLocaleString(), icon: Building2 },
          ].map((s) => (
            <div key={s.label} style={{ padding: 14, borderRadius: 10, background: "#f6f7fb", border: "1px solid #e2e3ec", textAlign: "center" }}>
              <s.icon size={18} color="#0d8b75" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#55557a", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Narrative */}
        {data.paragraphs.map((p, i) => (
          <p key={i} style={{ fontSize: 14, lineHeight: 1.65, color: "#1a1a2e", margin: "0 0 12px" }}>{p}</p>
        ))}

        {/* Highlights */}
        <div style={{ marginTop: 18, padding: 16, borderRadius: 10, background: "#fafafd", border: "1px solid #e2e3ec" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0d8b75", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            What you'll love
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {data.highlights.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#1a1a2e" }}>
                <Check size={14} color="#0d8b75" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#3a3a52", lineHeight: 1.6, marginTop: 16 }}>
          <strong>Community:</strong> {data.amenities}
        </div>
      </div>

      <DocFooter agentName={data.agentName} />
    </div>
  );
}

function EmailPreviewDoc({ data }) {
  const dateStr = data.date instanceof Date
    ? data.date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : data.date;
  return (
    <div className="tk-print" style={{ background: "#ffffff", color: "#1a1a2e", borderRadius: 10, overflow: "hidden", fontFamily: docFont, boxShadow: "0 12px 36px rgba(0,0,0,0.45)" }}>
      {/* Mail client header */}
      <div style={{ padding: "16px 24px", background: "#fafafd", borderBottom: "1px solid #e2e3ec" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#1a1a2e" }}>{data.subject}</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #5eead4, #818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0a0a14", fontSize: 13, fontWeight: 800,
          }}>{(data.from.name || "?").split(" ").map(s => s[0]).join("")}</div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: "#1a1a2e" }}>
            <div><strong>{data.from.name}</strong> <span style={{ color: "#55557a" }}>&lt;{data.from.email}&gt;</span></div>
            <div style={{ color: "#55557a" }}>to {data.to.name}{data.to.email ? ` <${data.to.email}>` : ""}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#55557a" }}>{dateStr}</div>
        </div>
      </div>

      <div style={{ padding: "24px" }}>
        <p style={{ fontSize: 14, color: "#1a1a2e", margin: "0 0 14px" }}>{data.greeting}</p>
        {data.paragraphs.map((p, i) => (
          <p key={i} style={{ fontSize: 14, lineHeight: 1.6, color: "#1a1a2e", margin: "0 0 14px" }}>{p}</p>
        ))}

        {/* Stats card */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: 16, borderRadius: 10, background: "#f6f7fb", border: "1px solid #e2e3ec", marginBottom: 16 }}>
          {data.stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 10, color: "#55557a", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0d8b75", marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 14, color: "#1a1a2e", margin: "0 0 8px", fontWeight: 700 }}>{data.listingsHeader}</p>
        <div style={{ marginBottom: 16 }}>
          {data.listings.map((L, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", borderRadius: 8,
              background: "#fafafd", border: "1px solid #e2e3ec", marginBottom: 6,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{L.address}</div>
                <div style={{ fontSize: 11, color: "#55557a", marginTop: 2 }}>{L.note}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0d8b75" }}>{L.price}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#1a1a2e", margin: "0 0 16px" }}>{data.closing}</p>

        <div style={{ marginBottom: 18 }}>
          <button style={{
            padding: "12px 20px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #2dd4bf, #6366f1)",
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}>{data.cta}</button>
        </div>

        <div style={{ paddingTop: 16, borderTop: "1px solid #e2e3ec", fontSize: 12, lineHeight: 1.55, color: "#55557a" }}>
          <div style={{ fontWeight: 800, color: "#1a1a2e" }}>{data.signoff.name}</div>
          <div>{data.signoff.title}</div>
          <div style={{ marginTop: 4 }}>
            {data.signoff.phone} · <a href={`mailto:${data.signoff.email}`} style={{ color: "#0d8b75" }}>{data.signoff.email}</a>
          </div>
        </div>
      </div>

      <DocFooter agentName={data.from.name} />
    </div>
  );
}

function LeadScoreDoc({ data }) {
  if (data.empty) {
    return (
      <div className="tk-print" style={{ background: "#ffffff", color: "#1a1a2e", borderRadius: 10, fontFamily: docFont, padding: 28, fontSize: 14, lineHeight: 1.55 }}>
        {data.message}
      </div>
    );
  }

  // Score circle (SVG ring)
  const radius = 36;
  const stroke = 8;
  const C2pi = 2 * Math.PI * radius;
  const offset = C2pi * (1 - data.score / 100);

  return (
    <div className="tk-print" style={{ background: "#ffffff", color: "#1a1a2e", borderRadius: 10, overflow: "hidden", fontFamily: docFont, boxShadow: "0 12px 36px rgba(0,0,0,0.45)" }}>
      <DocHeader
        kind="Lead Analysis"
        title={data.leadName}
        subtitle={data.classification + " · Predicted intent " + data.intent + "%"}
        agentName={null}
        date={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      />

      <div style={{ padding: "24px 28px" }}>
        {/* Score + intent + classification block */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 100, height: 100 }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e3ec" strokeWidth={stroke} />
              <circle cx="50" cy="50" r={radius} fill="none"
                      stroke={data.classificationColor} strokeWidth={stroke}
                      strokeDasharray={C2pi} strokeDashoffset={offset}
                      strokeLinecap="round" transform="rotate(-90 50 50)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{data.score}</div>
              <div style={{ fontSize: 9, color: "#55557a", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginTop: 2 }}>SCORE</div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={{
              display: "inline-block", padding: "3px 10px", borderRadius: 9999,
              background: data.classificationColor + "20", color: data.classificationColor,
              fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
            }}>{data.classification}</span>
            <div style={{ fontSize: 12, color: "#55557a", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Predicted intent to act within 90 days</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 10, borderRadius: 5, background: "#e2e3ec", overflow: "hidden" }}>
                <div style={{ width: data.intent + "%", height: "100%", background: "linear-gradient(90deg, #2dd4bf, #6366f1)" }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>{data.intent}%</div>
            </div>
          </div>
        </div>

        {/* Quick facts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
          {data.quickFacts.map(f => (
            <div key={f.label} style={{ padding: 10, borderRadius: 8, background: "#f6f7fb", border: "1px solid #e2e3ec" }}>
              <div style={{ fontSize: 9, color: "#55557a", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{f.label}</div>
              <div style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 700, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* Signals */}
        {data.positive.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#0d8b75", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              What's working ({data.positive.length})
            </div>
            {data.positive.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1, fontSize: 13, color: "#1a1a2e" }}>{p.label}</div>
                <div style={{ width: 120, height: 6, borderRadius: 3, background: "#e2e3ec", overflow: "hidden" }}>
                  <div style={{ width: ((p.weight / 25) * 100) + "%", height: "100%", background: "#0d8b75" }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0d8b75", minWidth: 32, textAlign: "right" }}>+{p.weight}</div>
              </div>
            ))}
          </div>
        )}

        {data.negative.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#c83a3a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Friction ({data.negative.length})
            </div>
            {data.negative.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1, fontSize: 13, color: "#1a1a2e" }}>{p.label}</div>
                <div style={{ width: 120, height: 6, borderRadius: 3, background: "#e2e3ec", overflow: "hidden" }}>
                  <div style={{ width: ((Math.abs(p.weight) / 25) * 100) + "%", height: "100%", background: "#c83a3a" }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c83a3a", minWidth: 32, textAlign: "right" }}>{p.weight}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendation */}
        <div style={{
          background: "linear-gradient(135deg, #ecf6f5 0%, #eef0fd 100%)",
          padding: 18, borderRadius: 10,
          border: "1px solid #c8e8e0",
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#0d8b75", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Recommended Next Action
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", marginBottom: 4 }}>{data.recommendation.title}</div>
          <div style={{ fontSize: 13, color: "#3a3a52", lineHeight: 1.55 }}>{data.recommendation.subtitle}</div>
        </div>
      </div>

      <DocFooter />
    </div>
  );
}

function DocRenderer({ data }) {
  if (!data || typeof data !== "object" || !data.kind) return null;
  switch (data.kind) {
    case "market-report":  return <MarketReportDoc data={data} />;
    case "listing-desc":   return <ListingFlyerDoc data={data} />;
    case "email-campaign": return <EmailPreviewDoc data={data} />;
    case "lead-score":     return <LeadScoreDoc data={data} />;
    default: return null;
  }
}

// Flatten a structured AI output into plain text (used by the Copy button)
function docToPlainText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  switch (data.kind) {
    case "market-report":
      return [
        `${data.market} Market Report — ${data.date}`,
        ``,
        data.summary,
        ``,
        `Key numbers:`,
        `  · Median price: ${data.stats.avgPrice} (${data.stats.priceChange})`,
        `  · Active inventory: ${data.stats.inventory} (${data.stats.inventoryChange})`,
        `  · Days on market: ${data.stats.dom} (${data.stats.domChange})`,
        `  · New listings: ${data.stats.newListings}`,
        ``,
        `What's moving the market:`,
        ...data.trends.map(t => `  · ${t.heading}\n    ${t.text}`),
        ``,
        `Forecast: ${data.forecast}`,
        ``,
        `Prepared by ${data.agentName} · triskope`,
      ].join("\n");
    case "listing-desc":
      return [
        data.headline,
        `${data.address} · ${data.community}`,
        `${formatMoney(data.price)} · ${data.beds}BR / ${data.baths}BA · ${data.sqft.toLocaleString()} sqft`,
        ``,
        ...data.paragraphs,
        ``,
        `What you'll love:`,
        ...data.highlights.map(h => `  · ${h}`),
        ``,
        `Community: ${data.amenities}`,
      ].join("\n");
    case "email-campaign":
      return [
        `Subject: ${data.subject}`,
        `From: ${data.from.name} <${data.from.email}>`,
        `To:   ${data.to.name}`,
        ``,
        data.greeting,
        ``,
        ...data.paragraphs,
        ``,
        ...data.stats.map(s => `  · ${s.label}: ${s.value}`),
        ``,
        data.listingsHeader,
        ...data.listings.map(L => `  · ${L.address} — ${L.price} (${L.note})`),
        ``,
        data.closing,
        ``,
        `— ${data.signoff.name}`,
        `${data.signoff.title}`,
        `${data.signoff.phone} · ${data.signoff.email}`,
      ].join("\n");
    case "lead-score":
      if (data.empty) return data.message;
      return [
        `AI Lead Analysis — ${data.leadName}`,
        `${data.classification} · Score ${data.score}/100 · Intent ${data.intent}%`,
        ``,
        `What's working:`,
        ...data.positive.map(p => `  + ${p.label} (+${p.weight})`),
        ``,
        `Friction:`,
        ...data.negative.map(p => `  - ${p.label} (${p.weight})`),
        ``,
        `Recommended next action: ${data.recommendation.title}`,
        `${data.recommendation.subtitle}`,
      ].join("\n");
    default:
      return JSON.stringify(data, null, 2);
  }
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  // Auth
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false); // invited user must set a password
  const [org, setOrg] = useState(null); // { id, name, slug } for the signed-in user
  const [orgs, setOrgs] = useState([]); // every workspace the user belongs to (for the switcher)
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    // An invite/recovery link can arrive in several formats depending on Supabase's
    // flow: (a) hash fragment "#access_token=...&type=invite" (older), (b) query
    // "?token_hash=...&type=invite", or (c) PKCE "?code=...". Detect all of them.
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const isInviteHash = hash.includes("type=invite") || hash.includes("type=recovery");
    const isInviteQuery = /type=(invite|recovery)/.test(search) || /[?&]code=/.test(search);
    if (isInviteHash || isInviteQuery) {
      setNeedsPassword(true);
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      // Supabase fires these when an invite/recovery link is opened. Both mean
      // "this person arrived via a link and needs to set a password."
      if (event === "PASSWORD_RECOVERY") setNeedsPassword(true);
      if (event === "SIGNED_IN" && (isInviteHash || isInviteQuery)) setNeedsPassword(true);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    let cancelled = false;
    supabase.from("profiles").select("id, email, display_name, role").eq("id", session.user.id).maybeSingle()
      .then(({ data, error }) => { if (!cancelled && !error) setProfile(data); });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const signOut = async () => { await supabase.auth.signOut(); };

  // Switch the active workspace. Remembered across reloads; the per-org pipeline
  // (loadStages effect keyed on org?.id) reloads automatically when org changes.
  const switchOrg = (orgId) => {
    const next = orgs.find(o => o.id === orgId);
    if (!next || next.id === org?.id) return;
    setOrg(next);
    setSelectedLead(null);
    try { localStorage.setItem("activeOrgId", orgId); } catch { /* ignore */ }
  };

  // Permission check keyed on the active org's role (owner ⊇ team_lead ⊇ agent).
  const can = (action) => (ROLE_RANK[org?.role] ?? 0) >= (ACTION_MIN_RANK[action] ?? 0);

  const VALID_VIEWS = new Set(["dashboard","inbox","leads","pipeline","tasks","listings","sitetools","idx","connect","website","siteadmin","emailbrand","addagent","reports","communities","preview","agents","team","assistant","ai","billing"]);
  const [view, setView] = useState(() => {
    const h = (typeof window !== "undefined" ? window.location.hash : "").replace("#", "");
    return VALID_VIEWS.has(h) ? h : "dashboard";
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Triskope staff flag (platform_admins table, RLS lets users read own row).
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const [toast, setToast] = useState(null);

  // Browser history sync: each view change becomes a history entry (#hash),
  // so Back/Forward move between screens instead of leaving the app.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === `#${view}`) return;
    if (!window.location.hash && view === "dashboard") {
      window.history.replaceState({ view }, "", "#dashboard");
    } else {
      window.history.pushState({ view }, "", `#${view}`);
    }
  }, [view]);
  useEffect(() => {
    const onPop = () => {
      const h = window.location.hash.replace("#", "");
      setView(VALID_VIEWS.has(h) ? h : "dashboard");
      setSelectedLead(null);
      setSidebarOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiType, setAiType] = useState(null);
  const [aiCtx, setAiCtx] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPhase, setAiPhase] = useState(0);
  const [aiOut, setAiOut] = useState("");
  const [aiStreamed, setAiStreamed] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const phaseTimer = useRef(null);
  const streamTimer = useRef(null);

  // Phase 2: lead filtering, pipeline, notes, tasks
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [sortOpen, setSortOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]); // members of the active org (for lead assignment)
  const [idxListings, setIdxListings] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadNotes, setLeadNotes] = useState({});   // { leadId: [{ id, text, createdAt }] }
  const [leadTasks, setLeadTasks] = useState({});   // { leadId: [{ id, text, due, done }] }
  const [noteDraft, setNoteDraft] = useState("");
  const [taskDraft, setTaskDraft] = useState("");
  const taskTextRef = useRef(null);
  const taskDueRef = useRef(null);
  const qaTaskTextRef = useRef(null);   // Tasks-view quick-add
  const qaTaskDueRef = useRef(null);
  const qaTaskLeadRef = useRef(null);
  const [taskDueDraft, setTaskDueDraft] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [stageMenuFor, setStageMenuFor] = useState(null); // leadId whose stage menu is open
  // Pipeline stages, loaded per-org from the pipeline_stages table.
  // stagesAll = every stage for the current org (including hidden). STAGES = the
  // visible, position-ordered list the board and dropdowns render. Seeded from
  // DEFAULT_STAGES so the board is never blank before the org's rows load.
  const [stagesAll, setStagesAll] = useState(() =>
    DEFAULT_STAGES.map((s, i) => ({
      ...s,
      position: i + 1,
      hidden: false,
      system: s.id === "captured" || s.id === "warm" || s.id === "delivered",
    }))
  );
  const STAGES = [...stagesAll].filter(s => !s.hidden).sort((a, b) => a.position - b.position);
  const [mobileStageId, setMobileStageId] = useState(STAGES[0]?.id ?? "captured"); // which stage shown on mobile pipeline
  const [manageStagesOpen, setManageStagesOpen] = useState(false); // stage manager modal (owner-only)
  const [stageBusy, setStageBusy] = useState(null); // id of the stage currently being written
  const [distributing, setDistributing] = useState(false); // round-robin in progress
  const [distributeCount, setDistributeCount] = useState(null); // null=idle; number=confirm pending
  const [newStageLabel, setNewStageLabel] = useState(""); // create-stage form: label
  const [newStageColor, setNewStageColor] = useState("#818cf8"); // create-stage form: color
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // stage id in "click again to confirm" state
  const [editingStageId, setEditingStageId] = useState(null); // stage id whose label is being renamed
  const [editLabelDraft, setEditLabelDraft] = useState(""); // in-progress renamed label
  const [siteToolsTab, setSiteToolsTab] = useState("preview"); // active tab in Site Tools
  const [pipeSegment, setPipeSegment] = useState("all"); // pipeline segment filter

  // Phase 3: Listings, Tasks, Inbox
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingSearch, setListingSearch] = useState("");
  const [listingCommunity, setListingCommunity] = useState("all");
  const [listingType, setListingType] = useState("all");
  const [listingBeds, setListingBeds] = useState(0);
  const [listingMinPrice, setListingMinPrice] = useState("");
  const [listingMaxPrice, setListingMaxPrice] = useState("");
  const [hoveredListing, setHoveredListing] = useState(null);
  // Notification read state — app-level so badges work everywhere, persisted
  // across sessions. Ids derive from lead/task uuids (globally unique).
  const [notifReadIds, setNotifReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("tme-notif-reads") || "[]")); }
    catch { return new Set(); }
  });
  // Dismissed notifications — hidden from the feed entirely. Same persistence
  // pattern as reads. Dismissing never deletes the underlying lead or task.
  const [notifDismissedIds, setNotifDismissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("tme-notif-dismissed") || "[]")); }
    catch { return new Set(); }
  });

  // Messages
  const [messages, setMessages] = useState([]);       // messages for currently selected lead
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [msgBody, setMsgBody] = useState("");
  const msgBodyRef = useRef(null);
  const msgSubjectRef = useRef(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgChannel, setMsgChannel] = useState("email");

  // Add lead modal
  const [showAddLead, setShowAddLead] = useState(false);
  const blankLeadDraft = {
    name: "", email: "", phone: "", source: "Manual entry",
    status: "new", stage: "captured", score: 50,
    area: "", budget: "", interest: "Buying",
    aiNotes: "",
  };
  const [leadDraft, setLeadDraft] = useState(blankLeadDraft);
  const leadFormRef = useRef({});
  const [addingLead, setAddingLead] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null); // lead object or null

  // Public site preview
  const [previewAgentId, setPreviewAgentId] = useState(AGENTS[0].id);
  const [previewCommunityId, setPreviewCommunityId] = useState(COMMUNITIES[0].id);
  const [previewForm, setPreviewForm] = useState({ name: "", email: "", phone: "", message: "" });

  // Communities detail
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  // Agent detail
  const [selectedAgent, setSelectedAgent] = useState(null);

  // AI Assistant
  const [demoPlan, setDemoPlan] = useState("pro"); // starter | pro | enterprise (demo toggle until real billing is wired)
  const [assistantMessages, setAssistantMessages] = useState([]); // { id, role: "user"|"assistant", text, ts }
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantStreamingId, setAssistantStreamingId] = useState(null);
  const [assistantStreamTarget, setAssistantStreamTarget] = useState("");
  const assistantStreamTimer = useRef(null);
  const assistantScrollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch leads from Supabase whenever the session changes
  useEffect(() => {
    if (!session) { setLeads([]); return; }
    let cancelled = false;
    // Resolve the signed-in user's organization (id, name, slug) for the Connect-site screen
    (async () => {
      const { data: mems } = await supabase.from("org_members").select("org_id, role");
      if (!mems || mems.length === 0) return;
      // Platform admin detection (self-row read; empty for everyone else)
      supabase.from("platform_admins").select("user_id").maybeSingle()
        .then(({ data }) => setIsPlatformAdmin(!!data));
      const roleByOrg = Object.fromEntries(mems.map(m => [m.org_id, m.role]));
      const { data: orgRows } = await supabase
        .from("organizations")
        .select("id, name, slug, site_config, features, custom_domain, plan, billing_status")
        .in("id", mems.map(m => m.org_id));
      if (!orgRows || orgRows.length === 0) return;
      const list = orgRows
        .map(o => ({ ...o, role: roleByOrg[o.id] }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setOrgs(list);
      let savedId = null;
      try { savedId = localStorage.getItem("activeOrgId"); } catch { /* ignore */ }
      const active = list.find(o => o.id === savedId) || list[0];
      setOrg(active);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Org-partitioned data: tasks + IDX listings follow the ACTIVE workspace,
  // mirroring the leads effect. Re-runs on workspace switch.
  useEffect(() => {
    if (!org?.id) { setLeadTasks({}); setIdxListings([]); return; }
    let cancelled = false;
    loadTasks(org.id);
    // Load real IDX listings (if any feed has synced)
    supabase.from("idx_listings")
      .select("id, listing_key, mls_number, status, list_price, address, city, state, zip, beds, baths, sqft, property_type, photo_url, detail_url")
      .eq("org_id", org.id)
      .order("synced_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error("idx_listings load failed:", error.message); setIdxListings([]); return; }
        const mapped = (data || []).map((r, i) => ({
          id: r.id, listing_key: r.listing_key,
          address: r.address || r.mls_number || "Listing",
          community: r.city || "—", area: r.city || "—",
          price: Number(r.list_price) || 0,
          beds: r.beds || 0, baths: Number(r.baths) || 0, sqft: r.sqft || 0,
          type: r.property_type || "—",
          status: (r.status || "active").toLowerCase().includes("active") ? "active" : (r.status || "").toLowerCase(),
          days: 0, agent: null, lat: null, lng: null,
          photo: r.photo_url || "🏠", photoUrl: r.photo_url || null,
          detailUrl: r.detail_url || null, real: true,
        }));
        setIdxListings(mapped);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id]);

  // Load THIS org's leads (org-partitioned). Re-runs when the active org changes,
  // so switching workspaces shows only that org's leads — not a merged set.
  useEffect(() => {
    if (!org?.id) { setLeads([]); return; }
    let cancelled = false;
    setLeadsLoading(true);
    supabase
      .from("leads")
      .select(`
        id, name, email, phone, source, stage, score, score_rationale, assigned_agent,
        consent_email, consent_sms, community_id, created_at,
        activity:lead_activities(type, body, channel, created_at)
      `)
      .eq("org_id", org.id)
      .order("score", { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLeadsLoading(false);
        if (error) { setToast({ message: "Couldn't load leads: " + error.message, kind: "error" }); return; }
        const shaped = (data || []).map(l => {
          const rat = l.score_rationale || {};
          // Derive the prototype's "status" tier from the real score/rationale
          const tier = rat.tier || (l.score == null ? "new" : l.score >= 70 ? "hot" : l.score >= 40 ? "nurture" : "cold");
          const daysSince = l.created_at ? Math.floor((Date.now() - new Date(l.created_at)) / 86400000) : 0;
          return {
            id: l.id,
            name: l.name,
            email: l.email,
            phone: l.phone,
            source: l.source,
            status: tier,
            stage: l.stage,
            score: l.score,
            area: null,
            budget: null,
            interest: null,
            aiNotes: Array.isArray(rat.rationale) ? rat.rationale.join(" ") : (rat.recommended_next_action || null),
            aiRationale: Array.isArray(rat.rationale) ? rat.rationale : [],
            aiNextAction: rat.recommended_next_action || null,
            aiTier: rat.tier || null,
            consentEmail: l.consent_email,
            consentSms: l.consent_sms,
            addedDays: daysSince,
            createdAt: l.created_at,
            lastContact: "—",
            agent: null,
            assignedAgent: l.assigned_agent,
            tags: [],
            activity: (l.activity || [])
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map(a => ({
                type: a.type,
                text: a.body,
                icon: a.channel === "email" ? "Mail" : a.channel === "sms" ? "MessageSquare" : "Activity",
                time: timeAgo(a.created_at),
              })),
          };
        });
        setLeads(shaped);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id]);

  // Load this org's pipeline stages (per-org, RLS-scoped by membership).
  // The explicit org_id filter is required: RLS lets an owner of multiple orgs
  // read all of them, so without it the board would merge stages across orgs.
  // If the org has no rows yet, we keep the DEFAULT_STAGES fallback (never blank).
  const loadStages = async (orgId) => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("pipeline_stages")
      .select("id, label, color, position, hidden, system, is_entry, is_terminal, pauses_nurture")
      .eq("org_id", orgId)
      .order("position", { ascending: true });
    if (error) { console.error("pipeline_stages load failed:", error.message); return; }
    if (data && data.length) setStagesAll(data);
  };

  useEffect(() => {
    if (!org?.id) return;
    loadStages(org.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id]);

  // Load the active org's members (for the lead-assignment picker).
  useEffect(() => {
    if (!org?.id) { setOrgMembers([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.functions.invoke("team-members", { body: { org_id: org.id } });
      if (!cancelled && data?.members) setOrgMembers(data.members);
    })();
    return () => { cancelled = true; };
  }, [org?.id]);

  // Team lead / owner: assign a lead to a member (or unassign with null).
  const assignLead = async (leadId, userId) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assignedAgent: userId } : l));
    setSelectedLead(prev => (prev && prev.id === leadId) ? { ...prev, assignedAgent: userId } : prev);
    const { error } = await supabase.from("leads").update({ assigned_agent: userId }).eq("id", leadId);
    if (error) setToast({ message: "Couldn't assign: " + error.message, kind: "error" });
  };

  // Round-robin (team_lead / owner): step 1 counts unassigned leads in the active
  // org and arms the confirm; step 2 distributes them evenly across all members.
  const prepDistribute = async () => {
    if (!org?.id) return;
    const { count, error } = await supabase.from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id).is("assigned_agent", null);
    if (error) { setToast({ message: "Couldn't check leads: " + error.message, kind: "error" }); return; }
    if (!count) { setToast({ message: "No unassigned leads to distribute.", kind: "info" }); return; }
    if (!orgMembers.length) { setToast({ message: "No team members to assign to.", kind: "error" }); return; }
    setDistributeCount(count);
    setToast({ message: `${count} unassigned lead${count === 1 ? "" : "s"} — click the button again to confirm.`, kind: "info" });
    // Auto-disarm if not confirmed within 8s
    setTimeout(() => setDistributeCount(prev => (prev === count ? null : prev)), 8000);
  };

  const runDistribute = async () => {
    if (!org?.id || !orgMembers.length) { setDistributeCount(null); return; }
    setDistributing(true);
    const { data: unassigned, error } = await supabase.from("leads")
      .select("id").eq("org_id", org.id).is("assigned_agent", null);
    if (error) { setDistributing(false); setDistributeCount(null); setToast({ message: "Distribute failed: " + error.message, kind: "error" }); return; }
    const members = orgMembers;
    const buckets = new Map(); // user_id -> [leadId]
    (unassigned || []).forEach((row, i) => {
      const uid = members[i % members.length].user_id;
      if (!buckets.has(uid)) buckets.set(uid, []);
      buckets.get(uid).push(row.id);
    });
    let failed = 0;
    for (const [uid, ids] of buckets) {
      for (let i = 0; i < ids.length; i += 100) {
        const part = ids.slice(i, i + 100);
        const { error: uErr } = await supabase.from("leads").update({ assigned_agent: uid }).in("id", part);
        if (uErr) failed += part.length;
      }
    }
    const idToUid = {};
    buckets.forEach((ids, uid) => ids.forEach(id => { idToUid[id] = uid; }));
    setLeads(prev => prev.map(l => idToUid[l.id] ? { ...l, assignedAgent: idToUid[l.id] } : l));
    setSelectedLead(prev => (prev && idToUid[prev.id]) ? { ...prev, assignedAgent: idToUid[prev.id] } : prev);
    setDistributing(false);
    setDistributeCount(null);
    const total = (unassigned || []).length;
    setToast({
      message: failed
        ? `Assigned ${total - failed}/${total}; ${failed} failed.`
        : `Distributed ${total} lead${total === 1 ? "" : "s"} across ${buckets.size} member${buckets.size === 1 ? "" : "s"}.`,
      kind: failed ? "error" : "success",
    });
  };

  // Owner-only: hide/show a stage column. View-only — nothing is deleted, and
  // the DB write is gated by RLS to owners of this org. Captured can't be hidden
  // (it's the lead-capture target where new + existing leads land).
  const toggleStageHidden = async (stage) => {
    if (!org?.id || stage.id === "captured") return;
    setStageBusy(stage.id);
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ hidden: !stage.hidden })
      .eq("org_id", org.id)
      .eq("id", stage.id);
    setStageBusy(null);
    if (error) { setToast({ message: "Couldn't update stage: " + error.message, kind: "error" }); return; }
    await loadStages(org.id);
    setToast({ message: `${stage.label} ${stage.hidden ? "shown" : "hidden"}`, kind: "success" });
  };

  // Owner-only: change a stage's display color (persist on blur).
  const updateStageColor = async (stage, color) => {
    if (!org?.id || !color || color === stage.color) return;
    const { error } = await supabase
      .from("pipeline_stages").update({ color })
      .eq("org_id", org.id).eq("id", stage.id);
    if (error) { setToast({ message: "Couldn't recolor: " + error.message, kind: "error" }); return; }
    await loadStages(org.id);
  };

  // Owner-only: reorder by swapping position with the adjacent stage.
  const moveStagePosition = async (stage, dir) => {
    if (!org?.id) return;
    const ordered = [...stagesAll].sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex(s => s.id === stage.id);
    const swapWith = ordered[idx + dir];
    if (!swapWith) return;
    setStageBusy(stage.id);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("pipeline_stages").update({ position: swapWith.position }).eq("org_id", org.id).eq("id", stage.id),
      supabase.from("pipeline_stages").update({ position: stage.position }).eq("org_id", org.id).eq("id", swapWith.id),
    ]);
    setStageBusy(null);
    if (e1 || e2) { setToast({ message: "Couldn't reorder: " + (e1 || e2).message, kind: "error" }); }
    await loadStages(org.id);
  };

  // Owner-only: create a custom stage at the end of the board.
  const createStage = async () => {
    const label = newStageLabel.trim();
    if (!org?.id || !label) return;
    const base = (label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24)) || "stage";
    const id = `${base}_${Math.random().toString(36).slice(2, 7)}`;
    const maxPos = stagesAll.reduce((m, s) => Math.max(m, s.position), 0);
    setStageBusy("__new__");
    const { error } = await supabase.from("pipeline_stages").insert({
      org_id: org.id, id, label, color: newStageColor || "#818cf8",
      position: maxPos + 1, hidden: false, system: false,
    });
    setStageBusy(null);
    if (error) { setToast({ message: "Couldn't create stage: " + error.message, kind: "error" }); return; }
    setNewStageLabel(""); setNewStageColor("#818cf8");
    await loadStages(org.id);
    setToast({ message: `Added "${label}"`, kind: "success" });
  };

  // Owner-only: delete a custom stage. Blocked for system stages, and for any
  // stage that still holds leads (checked here for a friendly message; the FK's
  // on-delete-restrict is the hard backstop at the DB).
  const deleteStage = async (stage) => {
    if (!org?.id || stage.system) return;
    setStageBusy(stage.id);
    const { count, error: cErr } = await supabase
      .from("leads").select("id", { count: "exact", head: true })
      .eq("org_id", org.id).eq("stage", stage.id);
    if (cErr) { setStageBusy(null); setConfirmDeleteId(null); setToast({ message: "Couldn't check leads: " + cErr.message, kind: "error" }); return; }
    if (count && count > 0) {
      setStageBusy(null); setConfirmDeleteId(null);
      setToast({ message: `Move the ${count} lead${count === 1 ? "" : "s"} out of "${stage.label}" first`, kind: "error" });
      return;
    }
    const { error } = await supabase.from("pipeline_stages").delete().eq("org_id", org.id).eq("id", stage.id);
    setStageBusy(null); setConfirmDeleteId(null);
    if (error) { setToast({ message: "Couldn't delete: " + error.message, kind: "error" }); return; }
    await loadStages(org.id);
    setToast({ message: `Deleted "${stage.label}"`, kind: "success" });
  };

  // Owner-only: rename a stage's label (allowed for every stage, including system).
  const renameStage = async (stage, label) => {
    const next = (label || "").trim();
    setEditingStageId(null);
    if (!org?.id || !next || next === stage.label) return;
    const { error } = await supabase
      .from("pipeline_stages").update({ label: next })
      .eq("org_id", org.id).eq("id", stage.id);
    if (error) { setToast({ message: "Couldn't rename: " + error.message, kind: "error" }); return; }
    await loadStages(org.id);
    setToast({ message: `Renamed to "${next}"`, kind: "success" });
  };

  // Fetch messages for the currently selected lead
  useEffect(() => {
    if (!selectedLead?.id) { setMessages([]); return; }
    let cancelled = false;
    setMessagesLoading(true);
    supabase
      .from("messages")
      .select("id, lead_id, direction, channel, body, sent_at, created_at")
      .eq("lead_id", selectedLead.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        setMessagesLoading(false);
        if (error) { setToast({ message: "Couldn't load messages", kind: "error" }); return; }
        setMessages(data || []);
      });
    return () => { cancelled = true; };
  }, [selectedLead?.id]);

  useEffect(() => {
    if (selectedLead?.id) loadNurture(selectedLead.id);
  }, [selectedLead?.id]);

  // Assemble REAL data to feed the AI for each insight type.
  const buildInsightContext = (type, ctx) => {
    switch (type) {
      case "lead-score":
      case "lead-insights": {
        const l = ctx || selectedLead || null;
        if (!l) return { note: "No specific lead selected." };
        return {
          name: l.name, status: l.status, score: l.score, stage: l.stage,
          area: l.area, source: l.source, email: l.email, phone: l.phone,
          created: l.created_at, last_activity: l.last_activity,
        };
      }
      case "listing-desc": {
        const li = ctx || null;
        return li || { note: "No listing selected — describe a typical property generically." };
      }
      case "email-campaign": {
        const l = ctx || selectedLead || null;
        return {
          lead: l ? { name: l.name, status: l.status, area: l.area, stage: l.stage } : null,
          agent: org ? { name: org.name, slug: org.slug } : null,
        };
      }
      case "market-report":
      default: {
        // Real data we have today: the agent's lead distribution + any context.
        const byStage = {};
        (leads || []).forEach(l => { byStage[l.stage] = (byStage[l.stage] || 0) + 1; });
        const areas = [...new Set((leads || []).map(l => l.area).filter(Boolean))].slice(0, 12);
        return {
          agent: org ? { name: org.name, area: org.site_config?.city, region: org.site_config?.region } : null,
          total_leads: (leads || []).length,
          leads_by_stage: byStage,
          areas_of_interest: areas,
          report_context: ctx?.title || ctx || null,
          note: "No live MLS/IDX feed connected — specific market stats are not available; write qualitatively.",
        };
      }
    }
  };

  // Phased "thinking", then start streaming the result
  useEffect(() => {
    if (!aiBusy || !aiType) return;
    const phases = THINKING_PHASES[aiType] || THINKING_PHASES["market-report"];
    setAiPhase(0);
    let p = 0;
    phaseTimer.current = setInterval(() => {
      p++;
      if (p >= phases.length) {
        clearInterval(phaseTimer.current);
        // Real Claude call. Build real context for the insight type.
        (async () => {
          const realCtx = buildInsightContext(aiType, aiCtx);
          const { data, error } = await supabase.functions.invoke("ai-insights", {
            body: { type: aiType, context: realCtx },
          });
          let text;
          if (error || data?.error) {
            let detail = data?.error || error?.message || "Couldn't reach AI.";
            try {
              if (error?.context && typeof error.context.json === "function") {
                const b = await error.context.json();
                if (b?.error) detail = b.error;
              }
            } catch { /* keep detail */ }
            text = "AI is unavailable right now: " + detail;
          } else {
            text = data.text || "No response generated.";
          }
          setAiOut(text);
          setAiBusy(false);
          setAiStreamed("");
          setAiStreaming(true);
        })();
      } else {
        setAiPhase(p);
      }
    }, 380 + Math.random() * 250);
    return () => clearInterval(phaseTimer.current);
  }, [aiBusy, aiType, aiCtx]);

  // Stream characters (only for legacy string outputs — structured docs
  // are rendered all at once as a polished document)
  useEffect(() => {
    if (!aiStreaming || !aiOut) return;
    if (typeof aiOut !== "string") {
      setAiStreaming(false);
      return;
    }
    let i = 0;
    streamTimer.current = setInterval(() => {
      i += 3;
      if (i >= aiOut.length) {
        setAiStreamed(aiOut);
        setAiStreaming(false);
        clearInterval(streamTimer.current);
      } else {
        setAiStreamed(aiOut.slice(0, i));
      }
    }, 12);
    return () => clearInterval(streamTimer.current);
  }, [aiStreaming, aiOut]);

  const runAI = (type, ctx = null) => {
    setAiOpen(true);
    setAiType(type);
    setAiCtx(ctx);
    setAiOut("");
    setAiStreamed("");
    setAiStreaming(false);
    setAiBusy(true);
  };

  const regenerateAI = () => {
    if (!aiType) return;
    runAI(aiType, aiCtx);
  };

  const copyAI = () => {
    const text = typeof aiOut === "object" ? docToPlainText(aiOut) : (aiOut || aiStreamed);
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setToast({ message: "Copied to clipboard", kind: "success" });
    } catch {
      setToast({ message: "Copy failed — your browser blocked it", kind: "error" });
    }
  };

  const printAI = () => {
    // Adds the document to the DOM under a special print container,
    // triggers window.print(), then restores. Done by simply triggering
    // print — the @media print stylesheet hides everything except .tk-print.
    window.print();
  };

  // ----- AI Assistant helpers -----
  const planLimits = { starter: 0, pro: 25, enterprise: Infinity };
  const queriesUsed = assistantMessages.filter(m => m.role === "user").length;
  const queryCap = planLimits[demoPlan] ?? 0;
  const queriesLeft = queryCap === Infinity ? Infinity : Math.max(0, queryCap - queriesUsed);
  const hasAssistantAccess = true; // free pilot — no billing gate

  const sendToAssistant = async (text) => {
    const prompt = (text || "").trim();
    if (!prompt) return;

    const userMsg = { id: "u-" + Date.now(), role: "user", text: prompt, ts: new Date().toISOString() };
    const assistantId = "a-" + Date.now();
    const assistantMsg = { id: assistantId, role: "assistant", text: "Thinking…", ts: new Date().toISOString() };
    setAssistantMessages(prev => [...prev, userMsg, assistantMsg]);
    setAssistantDraft("");

    const { data, error } = await supabase.functions.invoke("ai-assistant", {
      body: { mode: "chat", prompt, lead_id: selectedLead?.id || null },
    });
    const replyText = (error || data?.error)
      ? `Sorry — I couldn't get a response. ${data?.error || error.message || ""}`
      : (data?.text || "No response.");
    setAssistantMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: replyText } : m));
  };

  const sendToAssistantOLD = (text) => {
    const prompt = (text || "").trim();
    if (!prompt) return;
    if (!hasAssistantAccess) return;
    if (queriesLeft === 0) { setToast({ message: "You've hit your daily Assistant cap. Upgrade to Enterprise for unlimited.", kind: "info" }); return; }

    const userMsg = { id: "u-" + Date.now(), role: "user", text: prompt, ts: new Date().toISOString() };
    const ctx = { leads, selectedLead, taskBuckets, profile };
    const reply = generateAssistantReply(prompt, ctx);
    const assistantId = "a-" + Date.now();
    const assistantMsg = { id: assistantId, role: "assistant", text: "", ts: new Date().toISOString() };

    setAssistantMessages(prev => [...prev, userMsg, assistantMsg]);
    setAssistantDraft("");
    setAssistantStreamingId(assistantId);
    setAssistantStreamTarget(reply);
  };

  // Stream characters into the latest assistant message
  useEffect(() => {
    if (!assistantStreamingId || !assistantStreamTarget) return;
    let i = 0;
    assistantStreamTimer.current = setInterval(() => {
      i += 3;
      if (i >= assistantStreamTarget.length) {
        setAssistantMessages(prev => prev.map(m => m.id === assistantStreamingId ? { ...m, text: assistantStreamTarget } : m));
        setAssistantStreamingId(null);
        setAssistantStreamTarget("");
        clearInterval(assistantStreamTimer.current);
      } else {
        const chunk = assistantStreamTarget.slice(0, i);
        setAssistantMessages(prev => prev.map(m => m.id === assistantStreamingId ? { ...m, text: chunk } : m));
      }
    }, 12);
    return () => clearInterval(assistantStreamTimer.current);
  }, [assistantStreamingId, assistantStreamTarget]);

  // Auto-scroll the assistant thread to the bottom on new messages
  useEffect(() => {
    if (assistantScrollRef.current) {
      assistantScrollRef.current.scrollTop = assistantScrollRef.current.scrollHeight;
    }
  }, [assistantMessages.length, assistantStreamTarget]);

  const skipStreaming = () => {
    if (aiStreaming && aiOut && typeof aiOut === "string") {
      setAiStreamed(aiOut);
      setAiStreaming(false);
    }
  };

  // ----- Phase 2 helpers -----
  const [justMovedId, setJustMovedId] = useState(null);
  const moveLeadToStage = (leadId, stageId) => {
    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: stageId } : l));
    // Flag the card so it animates into its new column, then clear the flag.
    setJustMovedId(leadId);
    setTimeout(() => setJustMovedId(prev => prev === leadId ? null : prev), 450);
    const lead = leads.find(l => l.id === leadId);
    const stage = STAGES.find(s => s.id === stageId);
    if (lead && stage) setToast({ message: `${lead.name.split(" ")[0]} moved to ${stage.label}`, kind: "success" });
    // Persist to Supabase
    supabase.from("leads").update({ stage: stageId }).eq("id", leadId).then(({ error }) => {
      if (error) setToast({ message: "Couldn't save stage: " + error.message, kind: "error" });
    });
  };

  const [nurtureByLead, setNurtureByLead] = useState({}); // leadId -> enrollment row

  const loadNurture = async (leadId) => {
    const { data } = await supabase.from("nurture_enrollments")
      .select("id, sequence_id, next_step, status, last_sent_at, enrolled_at")
      .eq("lead_id", leadId).maybeSingle();
    setNurtureByLead(prev => ({ ...prev, [leadId]: data || null }));
  };

  const enrollNurture = async (leadId) => {
    // Use the global Starter Nurture sequence.
    const { data: seq } = await supabase.from("nurture_sequences")
      .select("id").eq("name", "Starter Nurture").is("org_id", null).maybeSingle();
    if (!seq) { setToast({ message: "No nurture sequence found. Run the migration first.", kind: "error" }); return; }
    const lead = leads.find(l => l.id === leadId);

    // If an enrollment already exists (e.g. previously stopped/completed), reactivate
    // and reset it to step 1 instead of inserting a duplicate.
    const { data: existing } = await supabase.from("nurture_enrollments")
      .select("id, status").eq("lead_id", leadId).eq("sequence_id", seq.id).maybeSingle();

    if (existing) {
      const { error } = await supabase.from("nurture_enrollments")
        .update({ status: "active", next_step: 1, enrolled_at: new Date().toISOString(), last_sent_at: null })
        .eq("id", existing.id);
      if (error) { setToast({ message: "Re-enroll failed: " + error.message, kind: "error" }); }
      else { setToast({ message: existing.status === "active" ? "Already active in nurture." : "Re-enrolled in nurture sequence", kind: "success" }); }
      loadNurture(leadId);
      return;
    }

    const { error } = await supabase.from("nurture_enrollments").insert({
      lead_id: leadId, sequence_id: seq.id, org_id: lead?.org_id || null, next_step: 1, status: "active",
    });
    if (error) {
      setToast({ message: "Enroll failed: " + error.message, kind: "error" });
    } else {
      setToast({ message: "Enrolled in nurture sequence", kind: "success" });
    }
    loadNurture(leadId);
  };

  const stopNurture = async (enrollmentId, leadId) => {
    await supabase.from("nurture_enrollments").update({ status: "stopped" }).eq("id", enrollmentId);
    setToast({ message: "Nurture stopped", kind: "success" });
    loadNurture(leadId);
  };

  const setLeadSegment = (leadId, segId) => {
    const next = segId || null;
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, segment: next } : l));
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, segment: next } : prev);
    supabase.from("leads").update({ segment: next }).eq("id", leadId).then(({ error }) => {
      if (error) setToast({ message: "Couldn't save segment: " + error.message, kind: "error" });
    });
  };

  const addNote = (leadId, text) => {
    if (!text.trim()) return;
    const note = { id: Date.now(), text: text.trim(), createdAt: "just now" };
    setLeadNotes(prev => ({ ...prev, [leadId]: [note, ...(prev[leadId] || [])] }));
    setNoteDraft("");
    setToast({ message: "Note added", kind: "success" });
  };

  const loadTasks = async (orgId) => {
    if (!orgId) { setLeadTasks({}); return; }
    const { data } = await supabase
      .from("tasks")
      .select("id, lead_id, title, due_at, completed_at")
      .eq("org_id", orgId)
      .order("due_at", { ascending: true, nullsFirst: false });
    // Shape into { leadId: [{ id, text, due, done }] } for the UI
    const grouped = {};
    for (const t of data || []) {
      const key = t.lead_id || "_none";
      (grouped[key] = grouped[key] || []).push({
        id: t.id,
        text: t.title,
        due: t.due_at ? t.due_at.slice(0, 10) : "no due date",
        done: !!t.completed_at,
      });
    }
    setLeadTasks(grouped);
  };

  const addTask = async (leadId, text, due) => {
    if (!text.trim()) return;
    if (!org?.id) { setToast({ message: "No workspace found.", kind: "error" }); return; }
    const { data, error } = await supabase.from("tasks").insert({
      org_id: org.id,
      lead_id: leadId === "_none" ? null : leadId,
      title: text.trim(),
      due_at: due ? new Date(due).toISOString() : null,
    }).select("id, lead_id, title, due_at, completed_at").single();
    if (error) { setToast({ message: "Couldn't add task: " + error.message, kind: "error" }); return; }
    const shaped = { id: data.id, text: data.title, due: data.due_at ? data.due_at.slice(0, 10) : "no due date", done: false };
    setLeadTasks(prev => ({ ...prev, [leadId]: [shaped, ...(prev[leadId] || [])] }));
    setTaskDraft(""); setTaskDueDraft("");
    setToast({ message: "Follow-up scheduled", kind: "success" });
  };

  const toggleTask = async (leadId, taskId) => {
    const current = (leadTasks[leadId] || []).find(t => t.id === taskId);
    const nowDone = !current?.done;
    // optimistic
    setLeadTasks(prev => ({
      ...prev,
      [leadId]: (prev[leadId] || []).map(t => t.id === taskId ? { ...t, done: nowDone } : t),
    }));
    const { error } = await supabase.from("tasks")
      .update({ completed_at: nowDone ? new Date().toISOString() : null })
      .eq("id", taskId);
    if (error) { // revert
      setLeadTasks(prev => ({
        ...prev,
        [leadId]: (prev[leadId] || []).map(t => t.id === taskId ? { ...t, done: !nowDone } : t),
      }));
      setToast({ message: "Couldn't update task", kind: "error" });
    }
  };

  const deleteTask = async (leadId, taskId) => {
    setLeadTasks(prev => ({
      ...prev,
      [leadId]: (prev[leadId] || []).filter(t => t.id !== taskId),
    }));
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { setToast({ message: "Couldn't delete task", kind: "error" }); loadTasks(org?.id); }
  };

  // ----- Messaging -----
  const sendMessage = async (leadId, body, channel, subject) => {
    if (!body.trim()) return;
    const lead = leads.find(l => l.id === leadId);
    const orgId = org?.id;

    const optimistic = {
      id: "temp-" + Date.now(),
      lead_id: leadId, direction: "outbound", channel,
      body: body.trim(), created_at: new Date().toISOString(), sent_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    if (msgBodyRef.current) msgBodyRef.current.value = "";
    if (msgSubjectRef.current) msgSubjectRef.current.value = "";

    // EMAIL → real delivery via the send-lead-email Edge Function (Resend + consent gate)
    if (channel === "email") {
      if (!lead?.email) { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setToast({ message: "This lead has no email address.", kind: "error" }); return; }
      if (!lead?.consentEmail) { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setToast({ message: "No email consent on file for this lead.", kind: "error" }); return; }
      const { data, error } = await supabase.functions.invoke("send-lead-email", {
        body: { lead_id: leadId, subject: subject || "A note from your agent", body: body.trim() },
      });
      if (error || data?.error) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setToast({ message: "Email failed: " + (data?.error || error.message), kind: "error" });
        return;
      }
      // The function logs the message to the messages table; reload to get the real row
      const { data: rows } = await supabase.from("messages")
        .select("id, lead_id, direction, channel, body, sent_at, created_at")
        .eq("lead_id", leadId).order("created_at", { ascending: true });
      setMessages(rows || []);
      setToast({ message: "Email sent", kind: "success" });
      return;
    }

    // NOTE → lead_activities (internal timeline); SMS → messages row (delivery pending A2P)
    if (channel === "note") {
      const { error } = await supabase.from("lead_activities")
        .insert({ org_id: orgId, lead_id: leadId, type: "note", body: body.trim(), internal: true });
      if (error) { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setToast({ message: "Couldn't save note: " + error.message, kind: "error" }); return; }
      setToast({ message: "Note saved", kind: "success" });
    } else {
      const { data, error } = await supabase.from("messages")
        .insert({ org_id: orgId, lead_id: leadId, direction: "outbound", channel, body: body.trim(), status: "queued" })
        .select("id, lead_id, direction, channel, body, sent_at, created_at").single();
      if (error) { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setToast({ message: "Couldn't send: " + error.message, kind: "error" }); return; }
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
      setToast({ message: "SMS queued (sending enabled once A2P is approved)", kind: "info" });
    }
  };

  const simulateInboundReply = async (leadId, channel) => {
    const lead = leads.find(l => l.id === leadId);
    const first = (lead?.name || "they").split(" ")[0];
    const samples = [
      "Thanks for sending — yes, I'd love to see it in person this weekend if you have anything open.",
      "Hi, just got out of a meeting. Can we chat tomorrow morning?",
      "We're really interested. What's the offer process look like from here?",
      "Sounds great. We're free Saturday after 2pm.",
      "I shared with my husband — he had a few questions about the HOA. Can you send the docs?",
    ];
    const body = samples[Math.floor(Math.random() * samples.length)];
    const { data, error } = await supabase.from("messages")
      .insert({ org_id: org?.id, lead_id: leadId, direction: "inbound", channel, body })
      .select()
      .single();
    if (error) { setToast({ message: "Couldn't simulate inbound: " + error.message, kind: "error" }); return; }
    setMessages(prev => [...prev, data]);
    setToast({ message: `${first} replied`, kind: "info" });
  };

  // ----- Add lead -----
  const submitNewLead = async () => {
    const f = leadFormRef.current;
    const name = (f.name?.value || "").trim();
    if (!name) { setToast({ message: "Name is required", kind: "error" }); return; }
    setAddingLead(true);
    // New leads always land in the ACTIVE workspace
    if (!org?.id) {
      setAddingLead(false);
      setToast({ message: "No workspace found for your account.", kind: "error" });
      return;
    }
    const payload = {
      org_id: org.id,
      name,
      email: (f.email?.value || "").trim() || null,
      phone: (f.phone?.value || "").trim() || null,
      source: (f.source?.value || "").trim() || "manual_entry",
      // Guard: only send a stage this org actually has (FK on org_id+stage),
      // falling back to the org's flagged entry stage, then first visible.
      stage: STAGES.some(s => s.id === f.stage?.value) ? f.stage.value
        : (stagesAll.find(s => s.is_entry)?.id || STAGES[0]?.id || "captured"),
      score: Number(f.score?.value) || null,
      consent_email: false,
      consent_sms: false,
    };
    const { data, error } = await supabase.from("leads").insert(payload).select(`
      id, name, email, phone, source, stage, score, score_rationale,
      consent_email, consent_sms, community_id, created_at
    `).single();
    setAddingLead(false);
    if (error) { setToast({ message: "Couldn't add lead: " + error.message, kind: "error" }); return; }
    // Log an initial activity event to the real lead_activities table.
    // Non-fatal: never let a logging failure block the success path.
    try {
      await supabase.from("lead_activities").insert({
        org_id: org.id, lead_id: data.id, type: "note",
        body: "Lead created manually", internal: true,
      });
    } catch (e) { console.error("activity log failed:", e); }
    const shaped = {
      id: data.id, name: data.name, email: data.email, phone: data.phone,
      source: data.source, status: "new", stage: data.stage, score: data.score,
      area: null, budget: null, interest: null,
      aiNotes: null, consentEmail: data.consent_email, consentSms: data.consent_sms,
      addedDays: 0, lastContact: "just now", agent: null, tags: [],
      activity: [{ type: "note", text: "Lead created manually", icon: "Activity", time: "just now" }],
    };
    setLeads(prev => [shaped, ...prev]);
    setShowAddLead(false);
    setLeadDraft(blankLeadDraft);
    setToast({ message: `Added ${shaped.name}`, kind: "success" });
  };

  // ----- Delete lead -----
  const performDeleteLead = async () => {
    if (!confirmDelete) return;
    const lead = confirmDelete;
    setConfirmDelete(null);
    // Optimistic remove
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    setSelectedLead(null);
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) { setToast({ message: "Couldn't delete: " + error.message, kind: "error" }); return; }
    setToast({ message: `Deleted ${lead.name}`, kind: "success" });
  };

  const filteredLeads = leads
    .filter(l => statusFilter === "all" || l.status === statusFilter)
    .filter(l => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) ||
             (l.email || "").toLowerCase().includes(q) ||
             (l.area || "").toLowerCase().includes(q) ||
             (l.source || "").toLowerCase().includes(q) ||
             (l.tags || []).some(t => t.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === "score")  return b.score - a.score;
      if (sortBy === "recent") return a.addedDays - b.addedDays;
      if (sortBy === "name")   return a.name.localeCompare(b.name);
      return 0;
    });

  const statusCounts = leads.reduce((acc, l) => {
    acc.all = (acc.all || 0) + 1;
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  // Phase 3: aggregations
  const allTasks = Object.entries(leadTasks).flatMap(([lid, tasks]) =>
    tasks.map(t => ({ ...t, leadId: lid, lead: leads.find(l => l.id === lid) }))
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  // Tasks with no due date are shaped as the literal string "no due date",
  // which lexically sorts after real YYYY-MM-DD dates — test the format instead.
  const taskHasDue = (t) => t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due);
  const taskBuckets = {
    overdue:   allTasks.filter(t => !t.done && taskHasDue(t) && t.due < todayStr),
    today:     allTasks.filter(t => !t.done && t.due === todayStr),
    upcoming:  allTasks.filter(t => !t.done && taskHasDue(t) && t.due > todayStr),
    nodue:     allTasks.filter(t => !t.done && !taskHasDue(t)),
    completed: allTasks.filter(t => t.done).slice(0, 12),
  };

  const listingsSource = idxListings.length > 0 ? idxListings : LISTINGS;

  // Real inbox: new leads + due/overdue tasks (no fabricated events)
  const rawNotifItems = (() => {
    const items = [];
    const cutoff = Date.now() - 14 * 86400000;
    for (const l of leads) {
      if (l.createdAt && new Date(l.createdAt).getTime() >= cutoff) {
        items.push({
          id: "lead-" + l.id, type: "new-lead",
          title: `New lead — ${l.name}`,
          text: l.source ? `Source: ${l.source}` : "New lead added to your pipeline",
          ts: new Date(l.createdAt).getTime(),
          leadId: l.id, color: "#818cf8",
        });
      }
    }
    const today = new Date().toISOString().slice(0, 10);
    Object.entries(leadTasks).forEach(([lid, tasks]) => {
      const lead = leads.find(l => l.id === lid);
      for (const t of tasks) {
        if (t.done) continue;
        if (t.due && t.due !== "no due date" && t.due <= today) {
          const overdue = t.due < today;
          items.push({
            id: "task-" + t.id, type: "task-due",
            title: overdue ? "Follow-up overdue" : "Follow-up due today",
            text: lead ? `${t.text} — ${lead.name}` : t.text,
            ts: new Date(t.due).getTime(),
            leadId: lid === "_none" ? null : lid, color: "#f59e0b",
          });
        }
      }
    });
    return items.sort((a, b) => b.ts - a.ts).slice(0, 40);
  })();
  // The visible feed = raw items minus dismissed ones.
  const inboxItems = rawNotifItems.filter(n => !notifDismissedIds.has(n.id));

  const filteredListings = listingsSource.filter(L => {
    if (listingCommunity !== "all" && L.community !== listingCommunity) return false;
    if (listingType !== "all" && L.type !== listingType) return false;
    if (listingBeds && L.beds < listingBeds) return false;
    if (listingMinPrice && L.price < Number(listingMinPrice)) return false;
    if (listingMaxPrice && L.price > Number(listingMaxPrice)) return false;
    if (listingSearch.trim()) {
      const q = listingSearch.toLowerCase();
      if (!L.address.toLowerCase().includes(q) &&
          !L.community.toLowerCase().includes(q) &&
          !L.area.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const unreadNotifs = inboxItems.filter(n => !notifReadIds.has(n.id)).length;

  // Persist read/dismissed ids, trimmed to ids still derivable (items age out
  // at 14 days) so localStorage can't grow unbounded. Trim against the RAW
  // list — trimming against the visible list would resurrect dismissed items.
  const persistNotifSet = (key, set) => {
    const live = new Set(rawNotifItems.map(n => n.id));
    try { localStorage.setItem(key, JSON.stringify([...set].filter(id => live.has(id)))); } catch { /* ignore */ }
  };
  const markNotifRead = (id) => setNotifReadIds(prev => {
    const next = new Set(prev); next.add(id); persistNotifSet("tme-notif-reads", next); return next;
  });
  const markAllNotifsRead = () => {
    const next = new Set(inboxItems.map(n => n.id));
    setNotifReadIds(next); persistNotifSet("tme-notif-reads", next);
    setToast({ message: "All caught up", kind: "success" });
  };
  const dismissNotif = (id) => setNotifDismissedIds(prev => {
    const next = new Set(prev); next.add(id); persistNotifSet("tme-notif-dismissed", next); return next;
  });
  const clearAllNotifs = () => {
    const next = new Set([...notifDismissedIds, ...inboxItems.map(n => n.id)]);
    setNotifDismissedIds(next); persistNotifSet("tme-notif-dismissed", next);
    setToast({ message: "Notifications cleared", kind: "success" });
  };
  const jumpToLead = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      setView("leads");
      if (isMobile) setSidebarOpen(false);
    }
  };
  const formatPrice = (p) => "$" + (p / 1000).toFixed(0) + "K";
  const formatDate = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(d + "T00:00:00");
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: dt.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
    } catch { return d; }
  };

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "inbox", label: "Notifications", icon: Bell },
    { id: "leads", label: "Leads", icon: Users },
    { id: "pipeline", label: "Pipeline", icon: Layers },
    { id: "tasks", label: "Tasks", icon: CalendarDays },
    { id: "listings", label: "Listings", icon: Building2 },
    { id: "sitetools", label: "CRM Tools", icon: Wrench, ownerOnly: true },
    { id: "website", label: "My Website", icon: Globe },
    { id: "reports", label: "Market Reports", icon: FileText, feature: "market_reports" },
    { id: "communities", label: "Communities", icon: Map, feature: "communities" },
    { id: "agents", label: "Agents", icon: Award, ownerOnly: true },
    { id: "team", label: "Team", icon: UserPlus, ownerOnly: true },
    { id: "siteadmin", label: "Site Admin", icon: Wrench, platformOnly: true },
    { id: "assistant", label: "AI Assistant", icon: Bot, feature: "ai_assistant" },
  ];

  // Paid-feature gating: locked features stay VISIBLE but show an upgrade
  // screen. Platform admins are never locked.
  const FEATURE_PLANS = { communities: "Pro", market_reports: "Pro", ai_assistant: "Enterprise" };
  const featureLocked = (f) => !!f && !isPlatformAdmin && !(org?.features?.[f]);

  const Card = ({ children, style = {}, hover = false, onClick }) => (
    <div
      onClick={onClick}
      style={{
        background: C.bgCard, borderRadius: 12, padding: isMobile ? 16 : 20,
        border: `1px solid ${C.border}`, transition: "border-color 0.2s ease, transform 0.2s ease",
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
      onMouseEnter={hover || onClick ? (e) => { e.currentTarget.style.borderColor = C.borderLight; } : undefined}
      onMouseLeave={hover || onClick ? (e) => { e.currentTarget.style.borderColor = C.border; } : undefined}
    >
      {children}
    </div>
  );

  // ----- DASHBOARD -----
  const Dashboard = () => {
    const hotLeads = leads.filter(l => l.status === "hot");
    const newLeads = leads.filter(l => l.status === "new");
    const dueToday = taskBuckets.today;
    const overdue = taskBuckets.overdue;
    const recentEvents = leads
      .flatMap(l => (l.activity || []).slice(0, 2).map(a => ({ ...a, leadName: l.name, leadId: l.id })))
      .slice(0, 4);

    // ----- Real metrics computed from live leads -----
    const totalLeads = leads.length;
    const hotCount = hotLeads.length;
    const scoredLeads = leads.filter(l => l.score != null);
    const deliveredLeads = leads.filter(l => l.stage === "delivered");
    const closeRate = totalLeads ? Math.round((deliveredLeads.length / totalLeads) * 100) : 0;

    // Weekly Lead Flow: count leads created in each of the last 7 days (real)
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const count = leads.filter(l => {
        if (!l.createdAt && l.addedDays == null) return false;
        const created = l.createdAt ? new Date(l.createdAt) : new Date(Date.now() - l.addedDays * 86400000);
        return created >= d && created < next;
      }).length;
      return { day: dayLabels[d.getDay()], leads: count };
    });

    // Score-tier mix for a small real trend in the leads sparkline
    const realSparkLeads = weekly.map(w => ({ v: w.leads }));
    const cumulative = []; let run = 0;
    for (const w of weekly) { run += w.leads; cumulative.push({ v: run }); }

    // Sparkline series (last 7 days, mock for now — will become a DB rollup later)
    const sparkAgents  = [42, 43, 43, 44, 46, 47, 48].map(v => ({ v }));
    const sparkLeads   = [1100, 1140, 1158, 1180, 1205, 1230, 1247].map(v => ({ v }));
    const sparkReports = [27, 28, 30, 31, 32, 33, 33].map(v => ({ v }));
    const sparkMRR     = [22400, 22800, 23400, 24600, 25400, 26200, 26800].map(v => ({ v }));

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: 20, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}
            </h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Here's what's moving today across triskope.</p>
          </div>
          <button onClick={() => setView("inbox")} aria-label="Notifications" style={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            width: 44, height: 44, borderRadius: 10,
            background: C.bgCard, border: `1px solid ${C.border}`,
            color: C.text, cursor: "pointer", flexShrink: 0,
          }}>
            <Bell size={18} />
            {unreadNotifs > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -6,
                padding: "1px 6px", minWidth: 18, borderRadius: 9999,
                background: C.gold, color: C.bgDark, textAlign: "center",
                fontSize: 10, fontWeight: 700, border: `2px solid ${C.bg}`,
              }}>{unreadNotifs > 99 ? "99+" : unreadNotifs}</span>
            )}
          </button>
        </div>

        {/* Today's focus widget */}
        <Card style={{
          marginBottom: 20,
          background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bgCard} 55%, ${C.teal}08 100%)`,
          borderColor: C.teal + "33",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Sparkles size={14} color={C.teal} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.12em", textTransform: "uppercase" }}>Today's focus</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? 16 : 20 }}>
            {/* Hot leads */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: C.red }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Hot leads need attention</span>
                <span style={{ fontSize: 10, color: C.textDim, marginLeft: "auto" }}>{hotLeads.length}</span>
              </div>
              {leadsLoading ? (
                <>
                  <Skeleton height={36} style={{ marginBottom: 8 }} />
                  <Skeleton height={36} style={{ marginBottom: 8 }} />
                  <Skeleton height={36} />
                </>
              ) : hotLeads.length === 0 ? (
                <div style={{ fontSize: 12, color: C.textDim, fontStyle: "italic", padding: "12px 0" }}>No hot leads right now — quiet day.</div>
              ) : hotLeads.slice(0, 3).map(lead => (
                <div key={lead.id}
                  onClick={() => { setSelectedLead(lead); setView("leads"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 8px", borderRadius: 8,
                    cursor: "pointer", marginBottom: 4,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Avatar name={lead.name} size={28} color={C.red} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                    <div style={{ fontSize: 10, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email || lead.phone || "—"}</div>
                  </div>
                  <Score score={lead.score} />
                </div>
              ))}
            </div>

            {/* Tasks today / overdue */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: C.amber }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Follow-ups</span>
                <span style={{ fontSize: 10, color: C.textDim, marginLeft: "auto" }}>
                  {overdue.length > 0 && <span style={{ color: C.red, fontWeight: 700, marginRight: 6 }}>{overdue.length} overdue</span>}
                  {dueToday.length} today
                </span>
              </div>
              {(overdue.length === 0 && dueToday.length === 0) ? (
                <div style={{ fontSize: 12, color: C.textDim, fontStyle: "italic", padding: "12px 0" }}>
                  Inbox zero. Add a follow-up from any lead's detail page.
                </div>
              ) : (
                [...overdue, ...dueToday].slice(0, 3).map(t => (
                  <div key={t.id} onClick={() => jumpToLead(t.leadId)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 8px", borderRadius: 8,
                    cursor: "pointer", marginBottom: 4,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: (overdue.includes(t) ? C.red : C.amber) + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <CalendarPlus size={12} color={overdue.includes(t) ? C.red : C.amber} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>
                        {t.lead?.name || "—"}{overdue.includes(t) ? " · overdue" : " · due today"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent activity */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: C.teal }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Latest activity</span>
              </div>
              {leadsLoading ? (
                <>
                  <Skeleton height={36} style={{ marginBottom: 8 }} />
                  <Skeleton height={36} style={{ marginBottom: 8 }} />
                  <Skeleton height={36} />
                </>
              ) : recentEvents.length === 0 ? (
                <div style={{ fontSize: 12, color: C.textDim, fontStyle: "italic", padding: "12px 0" }}>No activity yet — once leads come in, you'll see it here.</div>
              ) : recentEvents.slice(0, 3).map((ev, i) => {
                const Icon = ICONS[ev.icon] || Activity;
                return (
                  <div key={i} onClick={() => jumpToLead(ev.leadId)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 8px", borderRadius: 8,
                    cursor: "pointer", marginBottom: 4,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: C.teal + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={12} color={C.teal} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: C.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{ev.text}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>{ev.leadName} · {ev.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="tk-stagger" style={{ display: "flex", gap: isMobile ? 12 : 16, marginBottom: 24, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
          <StatCard icon={Target}     label="Total Leads"    value={totalLeads.toLocaleString()} change={null} color={C.blue}   subtitle="In your pipeline"        isMobile={isMobile} sparkline={cumulative} />
          <StatCard icon={Activity}   label="Hot Leads"      value={hotCount}                    change={null} color={C.red}    subtitle="Score 70+"               isMobile={isMobile} sparkline={realSparkLeads} />
          <StatCard icon={Sparkles}   label="Scored"         value={scoredLeads.length}          change={null} color={C.purple} subtitle="AI-scored leads"         isMobile={isMobile} sparkline={realSparkLeads} />
          <StatCard icon={TrendingUp} label="Delivery Rate"     value={closeRate + "%"}             change={null} color={C.green}  subtitle={`${deliveredLeads.length} delivered`} isMobile={isMobile} sparkline={cumulative} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <Card>
            <h3 style={cardTitle()}>Weekly Lead Flow</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weekly} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="weekly-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.teal} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="2 6" horizontal vertical={false} />
                <XAxis dataKey="day" stroke={C.textDim} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={C.textDim} fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip cursor={{ stroke: C.teal + "55", strokeWidth: 1 }}
                         content={<ChartTooltip valueFormatter={v => `${v} leads`} />} />
                <Area type="monotone" dataKey="leads" stroke={C.teal} fill="url(#weekly-gradient)" strokeWidth={2.5} activeDot={{ r: 5, fill: C.teal, stroke: C.bg, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 style={cardTitle()}>Leads by Stage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={STAGES.map(s => ({ stage: s.label, count: leads.filter(l => l.stage === s.id).length, fill: s.color }))} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="2 6" horizontal vertical={false} />
                <XAxis dataKey="stage" stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke={C.textDim} fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip cursor={{ fill: C.bgHover, opacity: 0.6 }}
                         content={<ChartTooltip valueFormatter={v => `${v} leads`} />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {STAGES.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ ...cardTitle(), margin: 0 }}>Recent Hot Leads</h3>
            <span style={{ fontSize: 11, color: C.textDim }}>{hotLeads.length} active</span>
          </div>
          {leadsLoading ? (
            <>
              <Skeleton height={52} style={{ marginBottom: 8 }} />
              <Skeleton height={52} style={{ marginBottom: 8 }} />
              <Skeleton height={52} />
            </>
          ) : hotLeads.length === 0 ? (
            <EmptyState icon={Target} title="No hot leads yet" message="When a lead's engagement crosses 80, they'll appear here." />
          ) : hotLeads.map(lead => (
            <div key={lead.id} onClick={() => { setSelectedLead(lead); setView("leads"); if (isMobile) setSidebarOpen(false); }}
                 style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 8px", marginLeft: -8, marginRight: -8, borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.15s ease", borderRadius: 6 }}
                 onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                 onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Avatar name={lead.name} size={36} color={C.red} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                <div style={{ fontSize: 12, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lead.source} • {lead.agent || "Unassigned"} • {lead.lastContact}
                </div>
              </div>
              <Score score={lead.score} />
            </div>
          ))}
        </Card>
      </div>
    );
  };

  // ----- LEADS -----
  const LeadsToolbar = () => (
    <Card style={{ marginBottom: 16, padding: isMobile ? 12 : 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexDirection: isMobile ? "column" : "row" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, width: "100%" }}>
          <Search size={14} color={C.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, area, source, or tag…"
            style={{
              width: "100%", padding: "10px 12px 10px 36px",
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, fontSize: 13, outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={e => e.currentTarget.style.borderColor = C.teal + "88"}
            onBlur={e => e.currentTarget.style.borderColor = C.border}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: C.textDim, cursor: "pointer",
              padding: 6, display: "flex", alignItems: "center",
            }} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div style={{ position: "relative", width: isMobile ? "100%" : "auto" }}>
          <button onClick={() => setSortOpen(o => !o)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.text, fontSize: 13, fontWeight: 500, cursor: "pointer",
            minHeight: 44, whiteSpace: "nowrap", width: isMobile ? "100%" : "auto", justifyContent: "space-between",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ArrowUpDown size={14} /> {SORT_OPTIONS.find(s => s.id === sortBy)?.label}</span>
            <ChevronDown size={14} />
          </button>
          {sortOpen && (
            <>
              <div onClick={() => setSortOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100 }} />
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: 4,
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 101, minWidth: 200,
                padding: 4,
              }}>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => { setSortBy(opt.id); setSortOpen(false); }} style={{
                    display: "flex", width: "100%", padding: "10px 12px",
                    background: sortBy === opt.id ? C.bgHover : "transparent", border: "none",
                    color: sortBy === opt.id ? C.teal : C.text,
                    fontSize: 13, cursor: "pointer", textAlign: "left", borderRadius: 6,
                    alignItems: "center", gap: 8,
                  }}>
                    {sortBy === opt.id && <Check size={12} />}{sortBy !== opt.id && <span style={{ width: 12 }} />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map(f => {
          const active = statusFilter === f.id;
          const count = statusCounts[f.id] || 0;
          return (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
              padding: "6px 12px", borderRadius: 9999,
              background: active ? `linear-gradient(135deg, ${C.teal}25, ${C.blue}20)` : C.bg,
              color: active ? C.teal : C.textMuted,
              border: `1px solid ${active ? C.teal + "55" : C.border}`,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              transition: "all 0.15s ease", minHeight: 32,
            }}>
              {f.label}
              <span style={{
                fontSize: 11, padding: "1px 6px", borderRadius: 9999,
                background: active ? C.teal + "30" : C.border,
                color: active ? C.teal : C.textDim,
              }}>{count}</span>
            </button>
          );
        })}
        {(search || statusFilter !== "all") && (
          <button onClick={() => { setSearch(""); setStatusFilter("all"); }} style={{
            padding: "6px 10px", borderRadius: 9999, background: "transparent",
            color: C.textMuted, border: `1px solid transparent`,
            fontSize: 12, fontWeight: 500, cursor: "pointer", minHeight: 32,
          }}>
            Clear filters
          </button>
        )}
      </div>
    </Card>
  );

  const LeadsView = () => (
    <div>
      <div style={pageHeader(isMobile)}>
        <div>
          <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Lead Management</h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>AI-powered lead scoring and qualification</p>
        </div>
        {!selectedLead && (
          <button onClick={() => setShowAddLead(true)} style={btnPrimary()}>
            <UserPlus size={14} /> New lead
          </button>
        )}
      </div>

      {!selectedLead && <LeadsToolbar />}

      {selectedLead ? (
        <LeadDetail lead={selectedLead} />
      ) : filteredLeads.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="No leads match your filters"
            message="Try clearing the search or selecting a different status."
            action={
              <button onClick={() => { setSearch(""); setStatusFilter("all"); }} style={{ ...btnPrimary(), marginTop: 16 }}>
                Clear filters
              </button>
            }
          />
        </Card>
      ) : isMobile ? (
        <LeadCards items={filteredLeads} />
      ) : (
        <LeadTable items={filteredLeads} />
      )}
    </div>
  );

  const LeadDetail = ({ lead }) => {
    const notes = leadNotes[lead.id] || [];
    const tasks = leadTasks[lead.id] || [];
    const stage = lead.stage;
    const stageInfo = STAGES.find(s => s.id === stage);

    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => setSelectedLead(null)} style={{ background: "none", border: "none", color: C.teal, fontSize: 14, cursor: "pointer", padding: "4px 0", minHeight: 44, display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={16} /> Back to all leads
          </button>
          {can("delete_lead") && (
            <button onClick={() => setConfirmDelete(lead)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", borderRadius: 8,
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.textMuted, fontSize: 12, fontWeight: 500, cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red + "55"; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}>
              <Trash2 size={12} /> Delete lead
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 16, margin: "12px 0 20px", flexDirection: isMobile ? "column" : "row" }}>
          <Avatar name={lead.name} size={56} color={lead.status === "hot" ? C.red : lead.status === "new" ? C.blue : lead.status === "nurture" ? C.amber : C.textDim} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.text, margin: 0 }}>{lead.name}</h2>
            <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              <StatusDot status={lead.status} />
              <Score score={lead.score} />
              {stageInfo && <Badge color={stageInfo.color}>Pipeline: {stageInfo.label}</Badge>}
            </div>
            {/* Segment selector */}
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.textDim, marginRight: 2 }}>Segment:</span>
              {SEGMENTS.map(seg => {
                const active = lead.segment === seg.id;
                return (
                  <button key={seg.id} onClick={() => setLeadSegment(lead.id, active ? null : seg.id)} style={{
                    padding: "3px 10px", borderRadius: 999, cursor: "pointer", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.03em",
                    border: `1px solid ${active ? seg.color : C.border}`,
                    background: active ? seg.color + "22" : "transparent",
                    color: active ? seg.color : C.textMuted,
                  }}>{seg.label}</button>
                );
              })}
            </div>
            {/* Assignment — team lead / owner can change; agents see it read-only */}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.textDim, marginRight: 2 }}>Assigned to:</span>
              {can("assign_lead") ? (
                <select value={lead.assignedAgent ?? ""} onChange={(e) => assignLead(lead.id, e.target.value || null)}
                  style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <option value="">Unassigned</option>
                  {orgMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                  {orgMembers.find(m => m.user_id === lead.assignedAgent)?.email ?? "Unassigned"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick action bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <a href={`tel:${(lead.phone || "").replace(/[^0-9]/g, "")}`} style={quickAction(C.green)}><Phone size={14} /> Call</a>
          <button onClick={() => {
            setMsgChannel("email");
            const el = document.getElementById("tk-messages");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }} style={quickAction(C.blue)}><Mail size={14} /> Email</button>
          <button onClick={() => runAI("lead-score", lead)} style={quickAction(C.teal)}><Brain size={14} /> AI score</button>
        </div>

        {/* Nurture enrollment */}
        {(() => {
          const en = nurtureByLead[lead.id];
          const statusColor = en?.status === "active" ? C.green : en?.status === "paused" ? C.amber : C.textDim;
          return (
            <div style={{ padding: 14, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Send size={16} color={C.teal} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Nurture sequence</div>
                  <div style={{ fontSize: 12, color: C.textDim }}>
                    {en
                      ? <>Status: <span style={{ color: statusColor, fontWeight: 600, textTransform: "capitalize" }}>{en.status}</span>{en.status === "active" ? ` · on touch ${en.next_step}` : ""}</>
                      : "Not enrolled — automated email touches over ~14 days."}
                  </div>
                </div>
              </div>
              {(!en || en.status === "stopped" || en.status === "completed")
                ? <button onClick={() => enrollNurture(lead.id)} style={quickAction(C.teal)}><Send size={14} /> Enroll in nurture</button>
                : <button onClick={() => stopNurture(en.id, lead.id)} style={{ ...quickAction(C.textMuted), borderColor: C.border }}>Stop nurture</button>}
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[["Email", lead.email], ["Phone", lead.phone], ["Source", lead.source], ["Score", lead.score != null ? String(lead.score) : "—"]].map(([k, v]) => (
            <div key={k} style={{ padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textDim }}>{k}</div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
            </div>
          ))}
        </div>

        {lead.tags?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {lead.tags.map(t => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 11, color: C.textMuted, background: C.bg, border: `1px solid ${C.border}` }}>
                <Tag size={10} /> {t}
              </span>
            ))}
          </div>
        )}

        <div style={{ background: `linear-gradient(135deg, ${C.teal}10, ${C.blue}10)`, borderRadius: 10, padding: 16, border: `1px solid ${C.teal}25`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Brain size={16} color={C.teal} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.teal }}>AI Analysis</span>
            {lead.score != null && <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted }}>Score {lead.score}{lead.aiTier ? ` · ${lead.aiTier}` : ""}</span>}
          </div>
          {lead.aiRationale?.length > 0 ? (
            <ul style={{ margin: "0 0 0 2px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {lead.aiRationale.map((r, i) => (
                <li key={i} style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, display: "flex", gap: 8 }}>
                  <span style={{ color: C.teal, flexShrink: 0 }}>•</span><span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
              {lead.aiNotes || "Not yet scored. Scoring runs automatically when a lead arrives, or trigger it from the pipeline."}
            </p>
          )}
          {lead.aiNextAction && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.teal}22` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textDim, marginBottom: 4 }}>Recommended next action</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{lead.aiNextAction}</div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div id="tk-messages" style={{ marginBottom: 16, padding: 14, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <Send size={14} color={C.blue} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Messages</span>
            <span style={{ fontSize: 11, color: C.textDim }}>{messages.length}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: C.bgCard, borderRadius: 6, padding: 2, border: `1px solid ${C.border}` }}>
              {[
                { id: "email", label: "Email", icon: Mail },
                { id: "sms",   label: "SMS",   icon: Phone },
                { id: "note",  label: "Note",  icon: MessageSquare },
              ].map(c => (
                <button key={c.id} onClick={() => setMsgChannel(c.id)} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 8px", borderRadius: 4, border: "none",
                  background: msgChannel === c.id ? `linear-gradient(135deg, ${C.teal}25, ${C.blue}18)` : "transparent",
                  color: msgChannel === c.id ? C.teal : C.textMuted,
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}><c.icon size={11} /> {c.label}</button>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div style={{ maxHeight: 320, overflowY: "auto", padding: "4px 2px", marginBottom: 12 }}>
            {messagesLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ padding: "20px 8px", fontSize: 12, color: C.textDim, textAlign: "center", fontStyle: "italic" }}>
                No messages yet. Send the first one below.
              </div>
            ) : messages.map(m => {
              const isOut = m.direction === "outbound";
              const ChannelIcon = m.channel === "email" ? Mail : m.channel === "sms" ? Phone : MessageSquare;
              const senderName = isOut
                ? (profile?.display_name || (session?.user?.email || "").split("@")[0] || "You")
                : lead.name;
              const senderColor = isOut ? C.teal : (lead.status === "hot" ? C.red : lead.status === "new" ? C.blue : lead.status === "nurture" ? C.amber : C.textDim);
              return (
                <div key={m.id} style={{
                  display: "flex", marginBottom: 12, gap: 8,
                  flexDirection: isOut ? "row-reverse" : "row",
                  alignItems: "flex-end",
                }}>
                  <Avatar name={senderName} size={26} color={senderColor} />
                  <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isOut ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: 10, color: C.textDim, padding: "0 6px 3px", display: "flex", gap: 6 }}>
                      <span style={{ fontWeight: 600, color: isOut ? C.teal : C.text }}>
                        {isOut ? `${senderName.split(" ")[0]} (you)` : senderName.split(" ")[0]}
                      </span>
                      <span>·</span>
                      <span>{timeAgo(m.sent_at)}</span>
                    </div>
                    <div style={{
                      background: isOut ? `linear-gradient(135deg, ${C.teal}, ${C.blue})` : C.bgCard,
                      color: isOut ? "#0a0a14" : C.text,
                      border: isOut ? "none" : `1px solid ${C.border}`,
                      borderRadius: isOut ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                      padding: "8px 12px",
                      fontSize: 13, lineHeight: 1.45,
                    }}>
                      {m.subject && (
                        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12, opacity: 0.85 }}>{m.subject}</div>
                      )}
                      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 10, marginTop: 4,
                        color: isOut ? "rgba(10,10,20,0.65)" : C.textDim,
                      }}>
                        <ChannelIcon size={10} />
                        {m.channel}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compose */}
          {msgChannel === "email" && (
            <input
              type="text" ref={msgSubjectRef} defaultValue=""
              placeholder="Subject (optional)"
              style={{
                width: "100%", padding: "10px 12px", marginBottom: 8,
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 13, outline: "none",
              }}
            />
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={msgBodyRef} defaultValue=""
              placeholder={
                msgChannel === "email" ? "Type an email to " + lead.name.split(" ")[0] + "..." :
                msgChannel === "sms"   ? "Type an SMS (160 chars)..." :
                "Type a private note..."
              }
              rows={3}
              maxLength={msgChannel === "sms" ? 160 : undefined}
              style={{
                flex: 1, padding: "10px 12px",
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 13, outline: "none", resize: "vertical",
                fontFamily: "inherit", minHeight: 60,
              }}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  sendMessage(lead.id, msgBodyRef.current?.value || "", msgChannel, msgSubjectRef.current?.value || "");
                }
              }}
            />
            <button
              onClick={() => sendMessage(lead.id, msgBodyRef.current?.value || "", msgChannel, msgSubjectRef.current?.value || "")}
              style={{
                ...btnPrimary(),
              }}>
              <Send size={14} /> Send
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <div style={{ fontSize: 10, color: C.textDim }}>
              {msgChannel === "email" ? `Will be sent to ${lead.email || "no email on file"}` :
               msgChannel === "sms"   ? `Will be texted to ${lead.phone || "no phone on file"}` :
               "Internal note, not sent to the lead"}
              {" "} · Cmd/Ctrl+Enter to send
            </div>
            {false && msgChannel !== "note" && (
              <button onClick={() => simulateInboundReply(lead.id, msgChannel)} style={{
                background: "none", border: "none", color: C.textDim,
                fontSize: 10, cursor: "pointer", padding: 0,
                textDecoration: "underline", textDecorationStyle: "dotted",
              }}>
                Demo: simulate {lead.name.split(" ")[0]}'s reply
              </button>
            )}
          </div>
        </div>

        {/* Tasks (follow-ups) */}
        <div style={{ marginBottom: 16, padding: 14, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <CalendarPlus size={14} color={C.amber} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Follow-ups</span>
            <span style={{ fontSize: 11, color: C.textDim }}>{tasks.filter(t => !t.done).length} open</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: tasks.length ? 12 : 0, flexDirection: isMobile ? "column" : "row" }}>
            <input
              type="text" ref={taskTextRef} defaultValue=""
              placeholder="What needs to happen next?"
              onKeyDown={e => { if (e.key === "Enter") { addTask(lead.id, taskTextRef.current?.value || "", taskDueRef.current?.value || ""); if (taskTextRef.current) taskTextRef.current.value = ""; if (taskDueRef.current) taskDueRef.current.value = ""; } }}
              style={{
                flex: 1, padding: "10px 12px", background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
              }}
            />
            <input
              type="date" ref={taskDueRef} defaultValue=""
              style={{
                padding: "10px 12px", background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
                colorScheme: "dark", width: isMobile ? "100%" : 160,
              }}
            />
            <button onClick={() => { addTask(lead.id, taskTextRef.current?.value || "", taskDueRef.current?.value || ""); if (taskTextRef.current) taskTextRef.current.value = ""; if (taskDueRef.current) taskDueRef.current.value = ""; }}
                    style={{ ...btnPrimary() }}>
              <Plus size={14} /> Add
            </button>
          </div>

          {tasks.map(t => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", marginTop: 6, background: C.bgCard,
              borderRadius: 8, border: `1px solid ${C.border}`,
            }}>
              <button onClick={() => toggleTask(lead.id, t.id)} style={{
                background: "none", border: "none", padding: 4, cursor: "pointer",
                display: "flex", alignItems: "center", color: t.done ? C.teal : C.textDim,
              }}>
                {t.done ? <CheckCircle2 size={18} /> : <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${C.textDim}` }} />}
              </button>
              <div style={{ flex: 1, fontSize: 13, color: t.done ? C.textDim : C.text, textDecoration: t.done ? "line-through" : "none" }}>
                {t.text}
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>Due {t.due}</div>
              </div>
              <button onClick={() => deleteTask(lead.id, t.id)} style={{
                background: "none", border: "none", padding: 6, cursor: "pointer",
                color: C.textDim, display: "flex", alignItems: "center",
              }} aria-label="Delete task">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Notes + Activity merged timeline */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Activity size={14} color={C.textMuted} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Activity & notes</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="text" value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder="Log a quick note for this lead…"
              onKeyDown={e => { if (e.key === "Enter") addNote(lead.id, noteDraft); }}
              style={{
                flex: 1, padding: "10px 12px", background: C.bg,
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 13, outline: "none",
              }}
            />
            <button onClick={() => addNote(lead.id, noteDraft)}
                    disabled={!noteDraft.trim()}
                    style={{
                      ...quickAction(C.purple),
                      opacity: noteDraft.trim() ? 1 : 0.5,
                      cursor: noteDraft.trim() ? "pointer" : "not-allowed",
                    }}>
              <MessageSquare size={14} /> Log
            </button>
          </div>

          {notes.map(n => (
            <ActivityRow key={n.id} event={{ text: n.text, time: n.createdAt, icon: "MessageSquare" }} />
          ))}
          {lead.activity?.map((ev, i) => <ActivityRow key={`a${i}`} event={ev} />)}
        </div>
      </Card>
    );
  };

  const LeadCards = ({ items }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: C.textMuted, padding: "0 4px" }}>
        Showing {items.length} of {leads.length} leads
      </div>
      {items.map(lead => (
        <Card key={lead.id} onClick={() => setSelectedLead(lead)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <Avatar name={lead.name} size={40} color={lead.status === "hot" ? C.red : lead.status === "new" ? C.blue : lead.status === "nurture" ? C.amber : C.textDim} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{lead.name}</div>
              <div style={{ fontSize: 12, color: C.textDim }}>{lead.email || lead.phone || "—"}</div>
            </div>
            <StatusDot status={lead.status} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Score score={lead.score} />
            <span style={{ fontSize: 12, color: C.textMuted }}>{lead.budget}</span>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>{lead.source} • {lead.agent || "Unassigned"}</div>
        </Card>
      ))}
    </div>
  );

  const LeadTable = ({ items }) => (
    <>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, padding: "0 4px" }}>
        Showing {items.length} of {leads.length} leads
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {["Lead", "Status", "Score", "Source", "Budget", "Last contact", "Agent"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(lead => (
              <tr key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  style={{ cursor: "pointer", borderBottom: `1px solid ${C.border}`, transition: "background 0.15s ease" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={lead.name} size={32} color={lead.status === "hot" ? C.red : lead.status === "new" ? C.blue : lead.status === "nurture" ? C.amber : C.textDim} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>{lead.email || lead.phone || "—"}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}><StatusDot status={lead.status} /></td>
                <td style={{ padding: "12px 16px" }}><Score score={lead.score} /></td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMuted }}>{lead.source}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMuted }}>{lead.budget}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMuted }}>{lead.lastContact}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMuted }}>{lead.agent || "Unassigned"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );

  // ----- PIPELINE (Kanban) -----
  const PipelineView = () => {
    const stageLeads = (stageId) => leads.filter(l =>
      l.stage === stageId && (pipeSegment === "all" || l.segment === pipeSegment)
    );

    // ---------- MOBILE: single-stage view with pills + arrows ----------
    if (isMobile) {
      const curIdx = STAGES.findIndex(s => s.id === mobileStageId);
      const stage = STAGES[curIdx] || STAGES[0];
      const list = stageLeads(stage.id);
      const prevStage = STAGES[curIdx - 1];
      const nextStage = STAGES[curIdx + 1];

      return (
        <div>
          <div style={pageHeader(isMobile)}>
            <div>
              <h1 style={{ fontFamily: SERIF_FONT, fontSize: 28, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Pipeline</h1>
              <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Pick a stage. Use the arrows or Move to advance a lead.</p>
            </div>
          </div>

          {/* Stage pills — horizontal scroll of stages, tap to select */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
            {STAGES.map(s => {
              const count = stageLeads(s.id).length;
              const active = s.id === mobileStageId;
              return (
                <button key={s.id} onClick={() => setMobileStageId(s.id)} style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "8px 14px", borderRadius: 999,
                  border: `1px solid ${active ? s.color : C.border}`,
                  background: active ? s.color + "1a" : "transparent",
                  color: active ? s.color : C.textMuted,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                  {s.label}
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "0 6px", borderRadius: 999, background: active ? s.color + "22" : C.bgHover, color: active ? s.color : C.textDim }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Selected stage header with prev/next */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0", padding: "10px 14px", background: C.bgCard, borderRadius: 12, borderTop: `3px solid ${stage.color}`, border: `1px solid ${C.border}` }}>
            <button onClick={() => prevStage && setMobileStageId(prevStage.id)} disabled={!prevStage} style={{ background: "none", border: "none", color: prevStage ? C.text : C.textDim, cursor: prevStage ? "pointer" : "default", padding: 4, display: "flex", alignItems: "center" }} aria-label="Previous stage">
              <ChevronLeft size={20} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{stage.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{list.length} lead{list.length === 1 ? "" : "s"}</div>
            </div>
            <button onClick={() => nextStage && setMobileStageId(nextStage.id)} disabled={!nextStage} style={{ background: "none", border: "none", color: nextStage ? C.text : C.textDim, cursor: nextStage ? "pointer" : "default", padding: 4, display: "flex", alignItems: "center" }} aria-label="Next stage">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Vertical list of leads in this stage */}
          {list.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: C.textDim, fontSize: 13, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
              No leads in {stage.label}.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map(lead => (
                <div key={lead.id} onClick={() => { setSelectedLead(lead); setView("leads"); setSidebarOpen(false); }} style={{
                  background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Avatar name={lead.name} size={36} color={lead.status === "hot" ? C.red : lead.status === "new" ? C.blue : lead.status === "nurture" ? C.amber : C.textDim} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                      <div style={{ fontSize: 12, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email || lead.phone || "—"}</div>
                    </div>
                    <Score score={lead.score} />
                  </div>
                  {/* Move controls: ‹ prev | Move menu | next › */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => prevStage && moveLeadToStage(lead.id, prevStage.id)} disabled={!prevStage} style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      padding: "9px 8px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: prevStage ? C.text : C.textDim,
                      fontSize: 12, fontWeight: 600, cursor: prevStage ? "pointer" : "default",
                    }} aria-label="Move to previous stage">
                      <ChevronLeft size={15} /> {prevStage ? prevStage.label : "—"}
                    </button>
                    <div style={{ position: "relative" }}>
                      <button onClick={() => setStageMenuFor(stageMenuFor === lead.id ? null : lead.id)} style={{
                        padding: "9px 12px", borderRadius: 8, border: "none",
                        background: stage.color + "22", color: stage.color,
                        fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3,
                      }} aria-label="Choose stage">
                        Move <ChevronDown size={12} />
                      </button>
                      {stageMenuFor === lead.id && (
                        <>
                          <div onClick={() => setStageMenuFor(null)} style={{ position: "fixed", inset: 0, zIndex: 150 }} />
                          <div style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: 6, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 151, padding: 4, minWidth: 170 }}>
                            {STAGES.map(s => (
                              <button key={s.id} onClick={() => { moveLeadToStage(lead.id, s.id); setStageMenuFor(null); }} style={{
                                display: "flex", width: "100%", padding: "10px 10px",
                                background: s.id === stage.id ? C.bgHover : "transparent",
                                border: "none", color: s.id === stage.id ? C.teal : C.text,
                                fontSize: 13, cursor: "pointer", textAlign: "left", borderRadius: 6, alignItems: "center", gap: 8,
                              }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <button onClick={() => nextStage && moveLeadToStage(lead.id, nextStage.id)} disabled={!nextStage} style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      padding: "9px 8px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: nextStage ? C.text : C.textDim,
                      fontSize: 12, fontWeight: 600, cursor: nextStage ? "pointer" : "default",
                    }} aria-label="Move to next stage">
                      {nextStage ? nextStage.label : "—"} <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    // ---------- DESKTOP: drag-and-drop board (unchanged) ----------

    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Pipeline</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>
              {isMobile ? "Tap the stage badge on a card to move it." : "Drag leads across stages, or tap the stage badge to pick a destination."}
            </p>
          </div>
        </div>

        {/* Segment filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[{ id: "all", label: "All", color: C.textMuted }, ...SEGMENTS].map(seg => {
            const active = pipeSegment === seg.id;
            return (
              <button key={seg.id} onClick={() => setPipeSegment(seg.id)} style={{
                padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 600,
                border: `1px solid ${active ? seg.color : C.border}`,
                background: active ? seg.color + "22" : "transparent",
                color: active ? (seg.id === "all" ? C.text : seg.color) : C.textMuted,
              }}>{seg.label}</button>
            );
          })}
          {can("setup_round_robin") && (
            <button
              onClick={() => (distributeCount == null ? prepDistribute() : runDistribute())}
              disabled={distributing}
              title="Round-robin all unassigned leads across the whole team"
              style={{
                marginLeft: "auto", padding: "6px 14px", borderRadius: 999,
                cursor: distributing ? "default" : "pointer", fontSize: 12, fontWeight: 600,
                border: `1px solid ${distributeCount != null ? C.teal : C.border}`,
                background: distributeCount != null ? C.teal + "18" : "transparent",
                color: distributeCount != null ? C.teal : C.textMuted,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <ArrowUpDown size={13} /> {distributing ? "Assigning…" : distributeCount != null ? `Click again to assign ${distributeCount}` : "Distribute unassigned"}
            </button>
          )}
          {org?.role === "owner" && (
            <button
              onClick={() => setManageStagesOpen(true)}
              title="Show or hide pipeline stages"
              style={{
                marginLeft: "auto", padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                fontSize: 12, fontWeight: 600, border: `1px solid ${C.border}`,
                background: "transparent", color: C.textMuted,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <Layers size={13} /> Manage stages
            </button>
          )}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? `repeat(${STAGES.length}, 260px)` : `repeat(${STAGES.length}, 240px)`,
          gap: 12,
          overflowX: "auto",
          paddingBottom: isMobile ? 16 : 12,
          marginLeft: isMobile ? -16 : 0,
          marginRight: isMobile ? -16 : 0,
          paddingLeft: isMobile ? 16 : 0,
          paddingRight: isMobile ? 16 : 0,
        }}>
          {STAGES.map(stage => {
            const leads = stageLeads(stage.id);
            const isHover = dragOverStage === stage.id;
            const isDragSourceStage = draggingId && leads.some(l => l.id === draggingId);
            return (
              <div
                key={stage.id}
                onDragOver={e => { e.preventDefault(); if (!isHover) setDragOverStage(stage.id); }}
                onDragLeave={() => setDragOverStage(prev => prev === stage.id ? null : prev)}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("leadId");
                  if (id) moveLeadToStage(id, stage.id);
                  setDraggingId(null); setDragOverStage(null);
                }}
                style={{
                  background: isHover ? stage.color + "10" : C.bgCard,
                  borderRadius: 12,
                  border: `1px ${isHover ? "dashed" : "solid"} ${isHover ? stage.color + "88" : C.border}`,
                  padding: 12, minHeight: 200,
                  borderTop: `3px solid ${stage.color}`,
                  transition: "background 0.18s ease, border-color 0.18s ease, transform 0.18s ease",
                  transform: isHover ? "scale(1.01)" : "scale(1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{stage.label}</span>
                  <span style={{
                    fontSize: 11, marginLeft: "auto",
                    padding: "1px 6px", borderRadius: 9999,
                    background: stage.color + "1a", color: stage.color, fontWeight: 700,
                  }}>{leads.length}</span>
                </div>

                {leads.length === 0 ? (
                  <div style={{
                    fontSize: 11, color: isHover ? stage.color : C.textDim,
                    padding: "20px 8px", textAlign: "center",
                    border: `1px dashed ${isHover ? stage.color + "55" : "transparent"}`,
                    borderRadius: 8, transition: "all 0.15s ease",
                    opacity: isHover ? 1 : 0.5,
                  }}>
                    {isHover ? `Drop into ${stage.label}` : "—"}
                  </div>
                ) : (
                  leads.map(lead => {
                    const isThisDragging = draggingId === lead.id;
                    const isJustMoved = justMovedId === lead.id;
                    return (
                      <div
                        key={lead.id}
                        draggable={!isMobile}
                        onDragStart={e => { e.dataTransfer.setData("leadId", String(lead.id)); e.dataTransfer.effectAllowed = "move"; setDraggingId(lead.id); }}
                        onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                        onClick={() => { setSelectedLead(lead); setView("leads"); if (isMobile) setSidebarOpen(false); }}
                        style={{
                          background: C.bgCard, borderRadius: 10, border: `1px solid ${isJustMoved ? stage.color + "88" : C.border}`,
                          padding: "12px 12px", marginBottom: 8,
                          cursor: isMobile ? "pointer" : (isThisDragging ? "grabbing" : "grab"),
                          opacity: isThisDragging ? 0.35 : 1,
                          transform: isThisDragging ? "scale(0.98)" : "scale(1)",
                          boxShadow: isThisDragging ? "0 0 0 1px " + stage.color + "55" : (isJustMoved ? "0 4px 16px " + stage.color + "33" : "none"),
                          transition: "opacity 0.18s ease, transform 0.18s ease, border-color 0.35s ease, box-shadow 0.35s ease",
                          animation: isJustMoved ? "cardLand 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
                        }}
                        onMouseEnter={e => { if (!isThisDragging) e.currentTarget.style.borderColor = stage.color + "55"; }}
                        onMouseLeave={e => { if (!isThisDragging) e.currentTarget.style.borderColor = C.border; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={lead.name} size={30} color={lead.status === "hot" ? C.red : lead.status === "new" ? C.blue : lead.status === "nurture" ? C.amber : C.textDim} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{lead.name}</div>
                            <div style={{ fontSize: 11, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email || lead.phone || "—"}</div>
                          </div>
                          {typeof lead.score === "number" && (
                            <div style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: lead.score >= 80 ? C.red : lead.score >= 50 ? C.amber : C.textDim }}>
                              {lead.score}
                            </div>
                          )}
                        </div>
                        {lead.segment && (
                          <div style={{ marginTop: 8, paddingLeft: 40 }}>
                            <SegmentTag segment={lead.segment} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        {manageStagesOpen && (
          <div
            onClick={() => { setManageStagesOpen(false); setConfirmDeleteId(null); setEditingStageId(null); }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 520, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Manage pipeline stages</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    Editing <strong style={{ color: C.text }}>{org?.name ?? "your pipeline"}</strong> · changes apply only to this org.
                  </div>
                </div>
                <button onClick={() => { setManageStagesOpen(false); setConfirmDeleteId(null); setEditingStageId(null); }} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: 10, maxHeight: 420, overflowY: "auto" }}>
                {(() => {
                  const ordered = [...stagesAll].sort((a, b) => a.position - b.position);
                  return ordered.map((s, i) => {
                    const lockedFromHide = s.id === "captured";
                    const busy = stageBusy === s.id;
                    const confirming = confirmDeleteId === s.id;
                    return (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderRadius: 10, opacity: s.hidden ? 0.55 : 1 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <button onClick={() => moveStagePosition(s, -1)} disabled={i === 0 || busy} title="Move up"
                            style={{ background: "none", border: "none", padding: 0, lineHeight: 0, cursor: (i === 0 || busy) ? "default" : "pointer", color: C.textMuted, opacity: i === 0 ? 0.35 : 1 }}>
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={() => moveStagePosition(s, 1)} disabled={i === ordered.length - 1 || busy} title="Move down"
                            style={{ background: "none", border: "none", padding: 0, lineHeight: 0, cursor: (i === ordered.length - 1 || busy) ? "default" : "pointer", color: C.textMuted, opacity: i === ordered.length - 1 ? 0.35 : 1 }}>
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <input type="color" defaultValue={s.color} onBlur={(e) => updateStageColor(s, e.target.value)} title="Change color"
                          style={{ width: 22, height: 22, padding: 0, border: `1px solid ${C.border}`, borderRadius: 6, background: "none", cursor: "pointer", flexShrink: 0 }} />
                        {editingStageId === s.id ? (
                          <input
                            autoFocus
                            value={editLabelDraft}
                            onChange={(e) => setEditLabelDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") renameStage(s, editLabelDraft); if (e.key === "Escape") setEditingStageId(null); }}
                            onBlur={() => renameStage(s, editLabelDraft)}
                            style={{ fontSize: 14, fontWeight: 600, color: C.text, background: C.bgHover, border: `1px solid ${C.teal}`, borderRadius: 6, padding: "3px 8px", width: 150, minWidth: 0 }}
                          />
                        ) : (
                          <span onClick={() => { setEditingStageId(s.id); setEditLabelDraft(s.label); setConfirmDeleteId(null); }} title="Click to rename"
                            style={{ fontSize: 14, fontWeight: 600, color: C.text, cursor: "text" }}>{s.label}</span>
                        )}
                        {s.system && (
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: C.textDim, border: `1px solid ${C.border}`, borderRadius: 6, padding: "1px 6px" }}>System</span>
                        )}
                        {s.hidden && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>Hidden</span>
                        )}
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => { if (!lockedFromHide && !busy) toggleStageHidden(s); }}
                            disabled={lockedFromHide || busy}
                            title={lockedFromHide ? "Captured is the lead-capture target and can't be hidden" : (s.hidden ? "Show this column" : "Hide this column")}
                            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${C.border}`, background: "transparent", color: lockedFromHide ? C.textDim : C.text, cursor: (lockedFromHide || busy) ? "default" : "pointer", opacity: lockedFromHide ? 0.5 : 1 }}>
                            {busy ? "…" : lockedFromHide ? "Locked" : s.hidden ? "Show" : "Hide"}
                          </button>
                          <button
                            onClick={() => { if (s.system || busy) return; confirming ? deleteStage(s) : setConfirmDeleteId(s.id); }}
                            disabled={s.system || busy}
                            title={s.system ? "System stages can't be deleted — rename or hide instead" : "Delete this stage"}
                            style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${confirming ? C.red : C.border}`, background: confirming ? C.red + "18" : "transparent", color: s.system ? C.textDim : confirming ? C.red : C.textMuted, cursor: (s.system || busy) ? "default" : "pointer", opacity: s.system ? 0.4 : 1, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {confirming ? "Confirm?" : <Trash2 size={13} />}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}

                <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="color" value={newStageColor} onChange={(e) => setNewStageColor(e.target.value)} title="New stage color"
                    style={{ width: 22, height: 22, padding: 0, border: `1px solid ${C.border}`, borderRadius: 6, background: "none", cursor: "pointer", flexShrink: 0 }} />
                  <input
                    value={newStageLabel}
                    onChange={(e) => setNewStageLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createStage(); }}
                    placeholder="New stage name…"
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgHover, color: C.text, fontSize: 13 }}
                  />
                  <button
                    onClick={createStage}
                    disabled={!newStageLabel.trim() || stageBusy === "__new__"}
                    style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", background: newStageLabel.trim() ? C.teal : C.border, color: newStageLabel.trim() ? "#fff" : C.textDim, cursor: newStageLabel.trim() ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ----- REPORTS -----
  const ReportsView = () => {
    const [areaInput, setAreaInput] = useState("");
    const areaRef = useRef(null);
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [statsError, setStatsError] = useState("");

    const fmtMoney = (n) => n == null ? "—" : "$" + Math.round(n).toLocaleString();

    const runStats = async () => {
      const area = (areaRef.current?.value || "").trim();
      setLoadingStats(true); setStatsError(""); setStats(null);
      const { data, error } = await supabase.functions.invoke("idx-market-stats", {
        body: { area, with_narrative: true },
      });
      setLoadingStats(false);
      if (error || data?.error) { setStatsError(data?.error || error.message); return; }
      setStats(data);
    };

    const Stat = ({ label, value, sub }) => (
      <div style={{ background: C.bg, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: SERIF_FONT }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
    );

    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Market Reports</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Real market stats computed from your IDX MLS listings — by area or community.</p>
          </div>
        </div>

        {/* Area / community picker */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Area or community</div>
              <input ref={areaRef} defaultValue="" placeholder="e.g. Myrtle Beach, Carolina Forest, Pawleys Island"
                onKeyDown={e => { if (e.key === "Enter") runStats(); }}
                style={{ width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none" }} />
            </div>
            <button onClick={runStats} disabled={loadingStats} style={{ ...btnPrimary(), opacity: loadingStats ? 0.6 : 1 }}>
              {loadingStats ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Brain size={14} />}
              {loadingStats ? "Computing…" : "Compute market stats"}
            </button>
          </div>
          {statsError && <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{statsError}</div>}
        </Card>

        {/* Results */}
        {stats?.empty && (
          <Card style={{ background: C.gold + "0c", border: `1px solid ${C.gold}33` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={16} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>{stats.message}</div>
            </div>
          </Card>
        )}

        {stats && !stats.empty && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontFamily: SERIF_FONT, fontSize: 24, fontWeight: 500, color: C.text, margin: 0 }}>{stats.area_label}</h2>
              <span style={{ fontSize: 12, color: C.textMuted }}>{stats.total_listings} listings · from your MLS feed</span>
            </div>

            {stats.narrative && (
              <div style={{ background: `linear-gradient(135deg, ${C.teal}0c, ${C.blue}0c)`, border: `1px solid ${C.teal}25`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Brain size={15} color={C.teal} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: "0.04em" }}>AI SUMMARY</span>
                  <span style={{ fontSize: 10.5, color: C.textDim, marginLeft: "auto" }}>Generated from your MLS figures</span>
                </div>
                {stats.narrative.split("\n").filter(p => p.trim()).map((para, i) => (
                  <p key={i} style={{ fontSize: 14, color: C.text, lineHeight: 1.65, margin: i ? "10px 0 0" : 0 }}>{para}</p>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textDim, margin: "4px 0 8px" }}>Active inventory</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
              <Stat label="Active listings" value={stats.active.count} />
              <Stat label="Median list price" value={fmtMoney(stats.active.median_price)} />
              <Stat label="Avg list price" value={fmtMoney(stats.active.avg_price)} />
              <Stat label="Median $/sqft" value={stats.active.median_ppsqft ? "$" + stats.active.median_ppsqft : "—"} />
              <Stat label="Median days on market" value={stats.active.median_dom ?? "—"} />
              <Stat label="Price range" value={`${fmtMoney(stats.active.min_price)} – ${fmtMoney(stats.active.max_price)}`} />
            </div>

            {stats.sold ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textDim, margin: "4px 0 8px" }}>Sold / closed</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
                  <Stat label="Closed listings" value={stats.sold.count} />
                  <Stat label="Median sold price" value={fmtMoney(stats.sold.median_price)} />
                  <Stat label="Median $/sqft" value={stats.sold.median_ppsqft ? "$" + stats.sold.median_ppsqft : "—"} />
                  <Stat label="Median days on market" value={stats.sold.median_dom ?? "—"} />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 18, fontStyle: "italic" }}>
                Sold/closed data isn't included in this IDX feed, so these stats are based on active inventory. (Some feeds restrict closed-sale data.)
              </div>
            )}

            <div style={{ fontSize: 11, color: C.textDim }}>
              Computed {new Date(stats.generated_at).toLocaleString()} from your synced MLS listings. Property types: {stats.property_types.join(", ") || "—"}.
            </div>
          </div>
        )}

        {!stats && !loadingStats && (
          <Card><div style={{ color: C.textMuted, fontSize: 14, textAlign: "center", padding: 24 }}>
            Enter an area or community above and compute real market stats from your synced MLS listings.
          </div></Card>
        )}
      </div>
    );
  };

  // ----- COMMUNITIES -----
  const CommunityCard = ({ c }) => {
    const photo = COMMUNITY_PHOTOS[c.slug];
    const typeColor =
      c.type === "Golf"   ? C.teal :
      c.type === "Luxury" ? C.purple :
      c.type === "Beach"  ? C.blue :
      c.type === "Urban"  ? C.amber :
      C.green;
    return (
      <div
        onClick={() => setSelectedCommunity(c)}
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          overflow: "hidden",
          cursor: "pointer",
          transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
          display: "flex", flexDirection: "column",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.borderColor = typeColor + "66";
          e.currentTarget.style.boxShadow = `0 16px 40px ${typeColor}18`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Hero image */}
        <div style={{
          height: 180,
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(10,10,20,0.85) 100%), url(${photo})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          display: "flex", alignItems: "flex-end", padding: 16,
        }}>
          <div style={{
            position: "absolute", top: 14, left: 14,
            padding: "4px 10px", borderRadius: 9999,
            background: typeColor + "e0", color: "#0a0a14",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
            backdropFilter: "blur(8px)",
          }}>{c.icon} {c.type}</div>
          <div style={{
            position: "absolute", top: 14, right: 14,
            padding: "4px 10px", borderRadius: 9999,
            background: "rgba(10,10,20,0.7)", color: "#fff",
            fontSize: 11, fontWeight: 700,
          }}>{c.listings} active</div>
          <div style={{ position: "relative", color: "#fff" }}>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15, marginBottom: 2 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: "0.05em" }}>{c.area}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5, minHeight: 36 }}>
            {c.tagline}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Median</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 2 }}>{c.avgPrice}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Views</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 2 }}>{c.views.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Leads</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, marginTop: 2 }}>{c.leads}</div>
            </div>
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 10, borderTop: `1px solid ${C.border}`,
            fontSize: 11, color: C.textMuted,
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Globe size={11} />
              /community/{c.slug}
            </span>
            <span style={{ color: typeColor, fontWeight: 700, letterSpacing: "0.08em", fontSize: 10, textTransform: "uppercase" }}>
              View →
            </span>
          </div>
        </div>
      </div>
    );
  };

  const CommunityDetail = ({ community }) => {
    const photo = COMMUNITY_PHOTOS[community.slug];
    const matchedReport = REPORTS.find(r => r.title.toLowerCase().includes(community.area.toLowerCase().split(" ")[0])) || REPORTS[0];
    const inCommunityListings = LISTINGS.filter(L => L.community === community.name);
    const assignedAgent = AGENTS.find(a => a.name === community.agent);
    const conversionRate = community.views > 0 ? ((community.leads / community.views) * 100).toFixed(1) : "0.0";
    const typeColor =
      community.type === "Golf"   ? C.teal :
      community.type === "Luxury" ? C.purple :
      community.type === "Beach"  ? C.blue :
      community.type === "Urban"  ? C.amber :
      C.green;

    const openPublicPreview = () => {
      setPreviewCommunityId(community.id);
      if (assignedAgent) setPreviewAgentId(assignedAgent.id);
      setSelectedCommunity(null);
      setView("preview");
    };

    return (
      <div>
        {/* Back bar */}
        <button onClick={() => setSelectedCommunity(null)} style={{
          background: "none", border: "none", color: C.teal,
          fontSize: 13, cursor: "pointer", padding: "4px 0",
          minHeight: 44, display: "flex", alignItems: "center", gap: 4,
        }}>
          <ChevronLeft size={16} /> Back to all communities
        </button>

        {/* Hero */}
        <div style={{
          marginTop: 12,
          height: isMobile ? 220 : 340,
          borderRadius: 14, overflow: "hidden", position: "relative",
          backgroundImage: `linear-gradient(180deg, rgba(10,10,20,0.25) 0%, rgba(10,10,20,0.85) 100%), url(${photo})`,
          backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "flex-end", padding: isMobile ? 20 : 32,
        }}>
          <div style={{ color: "#fff" }}>
            <div style={{
              display: "inline-block", marginBottom: 12,
              padding: "4px 12px", borderRadius: 9999,
              background: typeColor + "e0", color: "#0a0a14",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
            }}>{community.icon} {community.type} community</div>
            <h1 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 700, color: "#fff", margin: "0 0 4px", lineHeight: 1.1 }}>
              {community.name}
            </h1>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", letterSpacing: "0.05em" }}>
              {community.area} · /community/{community.slug}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <StatCard icon={Building2}   label="Active listings"  value={community.listings}                color={typeColor} isMobile={isMobile} />
          <StatCard icon={DollarSign}  label="Median price"     value={community.avgPrice}                color={C.green}   isMobile={isMobile} />
          <StatCard icon={Eye}         label="30-day views"     value={community.views.toLocaleString()} color={C.blue}    isMobile={isMobile} subtitle={`${conversionRate}% conversion`} />
          <StatCard icon={Target}      label="Leads generated"  value={community.leads}                   color={C.teal}    isMobile={isMobile} />
        </div>

        {/* Description + highlights + CTA */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 16, marginTop: 20 }}>
          <Card>
            <h3 style={{ ...cardTitle(), marginBottom: 12 }}>About this community</h3>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: "0 0 16px" }}>
              {community.description}
            </p>
            <div style={{ fontSize: 11, fontWeight: 700, color: typeColor, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>
              What residents have
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
              {community.highlights.map(h => (
                <div key={h} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: C.text }}>
                  <Check size={14} color={typeColor} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 style={{ ...cardTitle(), marginBottom: 12 }}>Lead funnel</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Page views",       value: community.views.toLocaleString(), pct: 100, color: C.blue },
                { label: "Form submissions", value: community.leads,                  pct: parseFloat(conversionRate) * 5, color: C.teal },
                { label: "Qualified leads",  value: Math.max(1, Math.floor(community.leads * 0.55)), pct: parseFloat(conversionRate) * 3, color: C.amber },
                { label: "Closings YTD",     value: Math.max(0, Math.floor(community.leads * 0.12)), pct: parseFloat(conversionRate),     color: C.green },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{row.value}</span>
                  </div>
                  <div style={{ height: 4, background: C.bg, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: Math.min(100, Math.max(8, row.pct)) + "%", height: "100%", background: row.color, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              padding: 12, background: C.bg, borderRadius: 8,
              border: `1px solid ${C.border}`,
              fontSize: 11, color: C.textMuted, lineHeight: 1.55,
            }}>
              <strong style={{ color: C.text }}>{conversionRate}% conversion rate</strong> from page visit to lead — that's
              {parseFloat(conversionRate) > 1.0 ? " above " : " below "}
              the {community.type.toLowerCase()} community average across the Grand Strand.
            </div>
          </Card>
        </div>

        {/* Listings in this community */}
        <Card style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <h3 style={{ ...cardTitle(), margin: 0 }}>Listings in {community.name}</h3>
            <span style={{ fontSize: 12, color: C.textDim }}>{inCommunityListings.length} active</span>
          </div>
          {inCommunityListings.length === 0 ? (
            <EmptyState icon={Building2} title="No listings yet" message="Once MLS sync picks up properties in this community, they'll appear here." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {inCommunityListings.slice(0, 6).map(L => (
                <div key={L.id} onClick={() => setSelectedListing(L)} style={{
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: 12, cursor: "pointer",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = typeColor + "55"}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{formatPrice(L.price)}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L.address}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {L.beds} BD · {L.baths} BA · {L.sqft.toLocaleString()} SQFT
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Agent + public site CTA */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginTop: 16 }}>
          {assignedAgent && (
            <Card>
              <h3 style={{ ...cardTitle(), marginBottom: 12 }}>Assigned agent</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <Avatar name={assignedAgent.name} size={48} color={assignedAgent.plan === "Enterprise" ? C.purple : assignedAgent.plan === "Pro" ? C.blue : C.teal} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{assignedAgent.name}</div>
                  <Badge color={assignedAgent.plan === "Enterprise" ? C.purple : assignedAgent.plan === "Pro" ? C.blue : C.teal}>{assignedAgent.plan}</Badge>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12 }}>
                <div>
                  <div style={{ color: C.textDim, fontSize: 10 }}>Closings</div>
                  <div style={{ color: C.text, fontWeight: 700 }}>{assignedAgent.closings}</div>
                </div>
                <div>
                  <div style={{ color: C.textDim, fontSize: 10 }}>YTD revenue</div>
                  <div style={{ color: C.teal, fontWeight: 700 }}>${(assignedAgent.revenue / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div style={{ color: C.textDim, fontSize: 10 }}>Subdomain</div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 11, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{assignedAgent.website}</div>
                </div>
              </div>
            </Card>
          )}

          <Card style={{
            background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bgCard} 50%, ${typeColor}18 100%)`,
            borderColor: typeColor + "55",
          }}>
            <h3 style={{ ...cardTitle(), marginBottom: 8 }}>Preview the public page</h3>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.55, margin: "0 0 14px" }}>
              See what visitors experience when they land on <strong style={{ color: C.text }}>{assignedAgent?.website || "the agent subdomain"}/community/{community.slug}</strong>.
              Edit content, swap hero imagery, or duplicate this page for another community.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={openPublicPreview} style={btnPrimary()}>
                <Globe size={14} /> Open public preview
              </button>
              <button onClick={() => runAI("market-report", { title: community.area, ...matchedReport })} style={quickAction(typeColor)}>
                <Sparkles size={14} /> Generate market report
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const CommunitiesView = () => {
    if (selectedCommunity) {
      return <CommunityDetail community={selectedCommunity} />;
    }
    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Community Pages</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Each community generates its own landing page with live MLS data.</p>
          </div>
          <button onClick={() => setToast({ message: "New community wizard — coming in Phase 2", kind: "info" })} style={btnPrimary()}><Plus size={14} /> New Community</button>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 18,
        }}>
          {COMMUNITIES.map(c => <CommunityCard key={c.id} c={c} />)}
        </div>
      </div>
    );
  };

  // ----- AGENTS -----
  // Helpers used by both agent grid + detail
  const planColor = (plan) => plan === "Enterprise" ? C.purple : plan === "Pro" ? C.blue : C.teal;
  const accessStatusMeta = (s) => {
    switch (s) {
      case "active":    return { label: "Active",         color: C.green };
      case "past_due":  return { label: "Past due",       color: C.amber };
      case "suspended": return { label: "Suspended",      color: C.red };
      case "canceled":  return { label: "Canceled",       color: C.textDim };
      default:          return { label: s || "Unknown",   color: C.textDim };
    }
  };

  const AgentCard = ({ a }) => {
    const status = accessStatusMeta(a.status);
    const color = planColor(a.plan);
    return (
      <div
        onClick={() => setSelectedAgent(a)}
        style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 18, cursor: "pointer",
          transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = color + "55"; e.currentTarget.style.boxShadow = `0 12px 28px ${color}15`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <Avatar name={a.name} size={56} color={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.2 }}>{a.name}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <Badge color={color}>{a.plan}</Badge>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 11, color: status.color, fontWeight: 600,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: status.color }} />
                {status.label}
              </span>
            </div>
          </div>
        </div>
        <div style={urlBadge()}><Globe size={12} /> {a.website}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 12 }}>
          <div><div style={{ color: C.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Leads</div><div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginTop: 2 }}>{a.leads}</div></div>
          <div><div style={{ color: C.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Closings</div><div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginTop: 2 }}>{a.closings}</div></div>
          <div><div style={{ color: C.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Reports</div><div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginTop: 2 }}>{a.reports}</div></div>
          <div><div style={{ color: C.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Revenue</div><div style={{ color: C.gold, fontWeight: 700, fontSize: 15, marginTop: 2 }}>${(a.revenue / 1000).toFixed(0)}K</div></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, marginTop: 12, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>
            ${a.monthlyCost}/mo · since {new Date(a.signupDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
          <span style={{ fontSize: 11, color: color, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>View →</span>
        </div>
      </div>
    );
  };

  const AgentDetail = ({ agent }) => {
    const status = accessStatusMeta(agent.status);
    const color = planColor(agent.plan);
    const agentLeads = leads.filter(l => l.agent === agent.name);
    const agentListings = LISTINGS.filter(L => L.listing_agent === agent.id);
    const agentCommunities = COMMUNITIES.filter(c => c.agent === agent.name);
    const avgDealSize = agent.closings > 0 ? Math.round(agent.revenue / agent.closings) : 0;
    const conversion = agent.leads > 0 ? ((agent.closings / agent.leads) * 100).toFixed(1) : "0.0";
    const memberMonths = Math.max(1, Math.round((Date.now() - new Date(agent.signupDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const ltv = memberMonths * agent.monthlyCost;
    const nextBillingDate = new Date(Date.now() + agent.nextBillingDays * 24 * 60 * 60 * 1000);

    // Mock recent invoices — deterministic from signup date
    const invoices = [];
    const signupDate = new Date(agent.signupDate);
    for (let i = 0; i < Math.min(memberMonths, 6); i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(signupDate.getDate());
      invoices.push({
        id: "INV-" + (Date.now() - i * 1e9).toString().slice(-6),
        date: d,
        amount: agent.monthlyCost,
        status: (i === 0 && agent.status === "past_due") ? "failed" : "paid",
      });
    }

    // Mock 6-month revenue trend
    const revenueTrend = Array.from({ length: 6 }, (_, i) => ({
      month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short" }),
      revenue: Math.round((agent.revenue / 6) * (0.7 + Math.random() * 0.6)),
    }));

    const recentActivity = [
      { icon: "User",        text: "Logged into the CRM",                  time: "2 hours ago" },
      { icon: "MessageSquare", text: `Sent a message to ${agentLeads[0]?.name || "a lead"}`, time: "4 hours ago" },
      { icon: "FileText",    text: `Generated a market report for ${agentCommunities[0]?.area || "the Grand Strand"}`, time: "yesterday" },
      { icon: "Users",       text: `Added a new lead: ${agentLeads[1]?.name || "John Doe"}`, time: "2 days ago" },
      { icon: "Mail",        text: "Opened welcome email sequence #4",     time: "3 days ago" },
    ];

    const KV = ({ label, value, mono = false }) => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, color: C.text, fontWeight: 600, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", textAlign: "right", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
      </div>
    );

    const adminAction = (label, msg, kind = "info") => () => setToast({ message: msg, kind });

    return (
      <div>
        <button onClick={() => setSelectedAgent(null)} style={{
          background: "none", border: "none", color: C.gold,
          fontSize: 13, cursor: "pointer", padding: "4px 0", marginBottom: 12,
          minHeight: 44, display: "flex", alignItems: "center", gap: 4, fontWeight: 600,
        }}>
          <ChevronLeft size={16} /> Back to all agents
        </button>

        {/* Hero — dark luxury */}
        <div style={{
          background: `linear-gradient(135deg, ${C.bgDark} 0%, ${C.bgDark2} 100%)`,
          borderRadius: 14, padding: isMobile ? 24 : 32,
          color: C.textInv, marginBottom: 16,
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative gradient */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: 220, height: "100%",
            background: `radial-gradient(circle at top right, ${color}40 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", position: "relative" }}>
            <Avatar name={agent.name} size={isMobile ? 72 : 88} color={color} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 30 : 42, fontWeight: 500, color: C.textInv, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>
                {agent.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                <Badge color={color}>{agent.plan} Plan</Badge>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: status.color, fontWeight: 600 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: status.color }} />
                  {status.label}
                </span>
                <span style={{ fontSize: 12, color: C.goldSoft }}>· {agent.brokerage}</span>
              </div>
              <div style={{ marginTop: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, color: C.goldSoft, letterSpacing: "0.04em" }}>
                {agent.website}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={`mailto:${agent.email}`} style={{
                padding: "10px 16px", borderRadius: 6,
                background: "rgba(255,255,255,0.08)", border: `1px solid rgba(255,255,255,0.18)`,
                color: C.textInv, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
                cursor: "pointer", textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44,
              }}><Mail size={13} /> Email</a>
              <a href={`tel:${agent.phone.replace(/[^0-9]/g, "")}`} style={{
                padding: "10px 16px", borderRadius: 6,
                background: C.gold, border: "none",
                color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                cursor: "pointer", textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44,
              }}><Phone size={13} /> Call</a>
            </div>
          </div>
        </div>

        {/* Stat row */}
        <div className="tk-stagger" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <StatCard icon={Target}      label="Total Leads"     value={agent.leads}                       color={color}    isMobile={isMobile} />
          <StatCard icon={Award}       label="Closings YTD"    value={agent.closings}                    color={C.gold}   isMobile={isMobile} />
          <StatCard icon={DollarSign}  label="Revenue YTD"     value={"$" + (agent.revenue / 1000).toFixed(0) + "K"} color={C.green} isMobile={isMobile} subtitle={"Avg deal $" + (avgDealSize / 1000).toFixed(0) + "K"} />
          <StatCard icon={TrendingUp}  label="Conversion"      value={conversion + "%"}                  color={C.blue}   isMobile={isMobile} subtitle={memberMonths + " month" + (memberMonths > 1 ? "s" : "") + " on platform"} />
        </div>

        {/* Contact + Billing side by side */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card>
            <h3 style={{ ...cardTitle(), marginBottom: 4 }}>Contact</h3>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 12px" }}>Primary contact information on file.</p>
            <KV label="Email"      value={<a href={`mailto:${agent.email}`} style={{ color: C.text, textDecoration: "none" }}>{agent.email}</a>} />
            <KV label="Phone"      value={<a href={`tel:${agent.phone.replace(/[^0-9]/g, "")}`} style={{ color: C.text, textDecoration: "none" }}>{agent.phone}</a>} />
            <KV label="Address"    value={agent.address} />
            <KV label="Brokerage"  value={agent.brokerage} />
            <KV label="License"    value={agent.license} mono />
            <KV label="Subdomain"  value={agent.website} mono />
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={adminAction("imp", "Now impersonating " + agent.name.split(" ")[0] + ". Audit log entry created.", "info")} style={quickAction(C.blue)}>
                <Eye size={13} /> Impersonate
              </button>
              <button onClick={adminAction("pw", "Password reset email sent to " + agent.email, "success")} style={quickAction(C.purple)}>
                <RefreshCw size={13} /> Send reset link
              </button>
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h3 style={{ ...cardTitle(), marginBottom: 4 }}>Billing</h3>
              <Badge color={status.color}>{status.label}</Badge>
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 12px" }}>Subscription, payment method, and admin actions.</p>
            <KV label="Plan"            value={agent.plan + " · $" + agent.monthlyCost + "/mo"} />
            <KV label="Subscriber since" value={new Date(agent.signupDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
            <KV label="Next renewal"    value={nextBillingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + (agent.nextBillingDays < 0 ? " · OVERDUE" : ` · in ${agent.nextBillingDays}d`)} />
            <KV label="Payment method"  value={`${agent.paymentMethod.brand} · ending ${agent.paymentMethod.last4}`} />
            <KV label="Card expires"    value={String(agent.paymentMethod.expMonth).padStart(2, "0") + "/" + agent.paymentMethod.expYear} />
            <KV label="Lifetime value"  value={"$" + ltv.toLocaleString() + "  · " + memberMonths + " mo"} />

            <div style={{ marginTop: 14, padding: 12, background: C.bgInset, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                Admin actions
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={adminAction("plan", "Stripe checkout opened to change " + agent.name.split(" ")[0] + "'s plan", "info")} style={quickAction(C.blue)}>
                  <ArrowUpDown size={13} /> Change plan
                </button>
                <button onClick={adminAction("comp", "Free month comped on " + agent.name.split(" ")[0] + "'s account", "success")} style={quickAction(C.gold)}>
                  <Sparkles size={13} /> Comp a month
                </button>
                <button onClick={adminAction("refund", "$" + agent.monthlyCost + " refunded to " + agent.paymentMethod.brand + " ending " + agent.paymentMethod.last4, "success")} style={quickAction(C.purple)}>
                  <RefreshCw size={13} /> Refund last payment
                </button>
                {agent.status === "active" ? (
                  <button onClick={adminAction("susp", agent.name + " has been suspended. Their subdomain will return 503 within 60 seconds.", "info")} style={quickAction(C.red)}>
                    <Lock size={13} /> Suspend access
                  </button>
                ) : (
                  <button onClick={adminAction("resume", agent.name + " reactivated. Subdomain back online.", "success")} style={quickAction(C.green)}>
                    <CheckCircle2 size={13} /> Reactivate
                  </button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Performance trend + invoices */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card>
            <h3 style={cardTitle()}>Revenue trend · last 6 months</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id={`agent-rev-${agent.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.gold} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="2 6" horizontal vertical={false} />
                <XAxis dataKey="month" stroke={C.textDim} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={C.textDim} fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "K"} width={42} />
                <Tooltip cursor={{ stroke: C.gold + "55", strokeWidth: 1 }}
                         content={<ChartTooltip valueFormatter={v => "$" + v.toLocaleString()} />} />
                <Area type="monotone" dataKey="revenue" stroke={C.gold} fill={`url(#agent-rev-${agent.id})`} strokeWidth={2.5} activeDot={{ r: 5, fill: C.gold }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 style={cardTitle()}>Billing history</h3>
            {invoices.length === 0 ? (
              <EmptyState icon={FileText} title="No invoices yet" message="First invoice will generate on next billing date." />
            ) : (
              <div>
                {invoices.map(inv => (
                  <div key={inv.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0", borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>${inv.amount.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: C.textDim, fontFamily: "ui-monospace, monospace" }}>{inv.id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{inv.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                        color: inv.status === "paid" ? C.green : C.red,
                      }}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Pipeline + Communities */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <h3 style={{ ...cardTitle(), margin: 0 }}>Active leads</h3>
              <span style={{ fontSize: 11, color: C.textDim }}>{agentLeads.length} assigned</span>
            </div>
            {agentLeads.length === 0 ? (
              <EmptyState icon={Users} title="No leads yet" message="When leads come in for this agent, they'll show here." />
            ) : (
              <div>
                {agentLeads.slice(0, 5).map(lead => (
                  <div key={lead.id}
                       onClick={() => { setSelectedAgent(null); setSelectedLead(lead); setView("leads"); }}
                       style={{
                         display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                         borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                       }}>
                    <Avatar name={lead.name} size={32} color={lead.status === "hot" ? C.red : lead.status === "new" ? C.blue : lead.status === "nurture" ? C.amber : C.textDim} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.source}</div>
                    </div>
                    <Score score={lead.score} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <h3 style={{ ...cardTitle(), margin: 0 }}>Community pages</h3>
              <span style={{ fontSize: 11, color: C.textDim }}>{agentCommunities.length} subscribed</span>
            </div>
            {agentCommunities.length === 0 ? (
              <EmptyState icon={Map} title="No community pages yet" message="Agent hasn't activated any community pages." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {agentCommunities.map(c => (
                  <div key={c.id}
                       onClick={() => { setSelectedAgent(null); setSelectedCommunity(c); setView("communities"); }}
                       style={{
                         display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                         background: C.bgInset, border: `1px solid ${C.border}`, borderRadius: 8,
                         cursor: "pointer", transition: "border-color 0.15s ease",
                       }}
                       onMouseEnter={e => e.currentTarget.style.borderColor = C.gold + "55"}
                       onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <div style={{ fontSize: 18 }}>{c.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>{c.area} · {c.listings} active</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{c.leads}</div>
                      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Leads</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <h3 style={cardTitle()}>Recent activity</h3>
          {recentActivity.map((ev, i) => (
            <ActivityRow key={i} event={ev} />
          ))}
        </Card>
      </div>
    );
  };

  const AgentsView = () => {
    const [rows, setRows] = useState(null);
    useEffect(() => {
      (async () => {
        // Real agents = organizations, with their member count and feature state.
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name, slug, site_config, features, created_at")
          .order("created_at", { ascending: false });
        if (!orgs) { setRows([]); return; }
        // membership counts per org
        const { data: mems } = await supabase.from("org_members").select("org_id, role");
        const counts = {};
        (mems || []).forEach(m => { counts[m.org_id] = (counts[m.org_id] || 0) + 1; });
        setRows(orgs.map(o => ({
          ...o,
          members: counts[o.id] || 0,
          siteReady: !!o.site_config?.agent_name,
        })));
      })();
    }, []);

    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>
              Agents
            </h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>
              {rows === null ? "Loading…" : `${rows.length} agent workspace${rows.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {isPlatformAdmin && (
            <button onClick={() => setView("addagent")} style={btnPrimary()}>
              <UserPlus size={14} /> Add agent
            </button>
          )}
        </div>

        {rows === null ? (
          <Card><div style={{ color: C.textMuted, fontSize: 14 }}>Loading agents…</div></Card>
        ) : rows.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>No agents yet</div>
              <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 18 }}>No agents yet.</div>
              {isPlatformAdmin && <button onClick={() => setView("addagent")} style={btnPrimary()}><Plus size={14} /> Add agent</button>}
            </div>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {rows.map(a => (
              <Card key={a.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace" }}>{a.slug}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 8px", borderRadius: 6, background: a.members > 0 ? C.green + "18" : C.gold + "18", color: a.members > 0 ? C.green : C.gold }}>
                    {a.members > 0 ? "Active" : "Invited"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: C.textMuted }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Website</span>
                    <span style={{ color: a.siteReady ? C.text : C.textDim }}>{a.siteReady ? "Set up" : "Not set up"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Communities</span>
                    <span style={{ color: a.features?.communities ? C.green : C.textDim }}>{a.features?.communities ? "Enabled" : "Off"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Members</span>
                    <span style={{ color: C.text }}>{a.members}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 12, color: C.textDim, fontStyle: "italic" }}>
          Billing and revenue will appear here once subscriptions are connected.
        </div>
      </div>
    );
  };

  // ----- AI TOOLS -----
  const AIView = () => (
    <div>
      <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>AI Tools</h1>
      <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 24px" }}>Generate reports, descriptions, emails, and lead analysis</p>
      <div style={gridCols(isMobile, 280)}>
        {[
          { id: "market-report", icon: BarChart3, title: "Market Report Generator", desc: "AI writes neighborhood analysis from live MLS data", color: C.teal },
          { id: "listing-desc", icon: FileText, title: "Listing Description Writer", desc: "Compelling property copy from photos and details", color: C.blue },
          { id: "email-campaign", icon: Mail, title: "Email Campaign Builder", desc: "Personalized drip sequences from lead profile", color: C.purple },
          { id: "lead-score", icon: Brain, title: "Lead Score Analysis", desc: "Behavioral signals + intent prediction", color: C.red },
        ].map(tool => (
          <Card key={tool.id} hover>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: tool.color + "15", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <tool.icon size={22} color={tool.color} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>{tool.title}</h3>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 12px", lineHeight: 1.5 }}>{tool.desc}</p>
            <button onClick={() => runAI(tool.id, tool.id === "lead-score" ? (selectedLead || leads[0]) : null)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 6, border: "none",
              background: `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)`,
              color: tool.color === C.teal || tool.color === C.blue ? "#0a0a14" : "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44, transition: "transform 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              <Sparkles size={12} /> Generate
            </button>
          </Card>
        ))}
      </div>
    </div>
  );

  // ----- PLANS -----
  const PlansView = () => (
    <div>
      <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Subscription Plans</h1>
      <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 24px" }}>Tiered pricing for real estate agents</p>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
        {PLANS.map(p => (
          <Card key={p.name} style={{ borderColor: p.name === "Pro" ? C.blue : C.border, borderWidth: p.name === "Pro" ? 2 : 1, position: "relative" }}>
            {p.name === "Pro" && <Badge color={C.blue}>Most Popular</Badge>}
            <h3 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: "8px 0 4px" }}>{p.name}</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.text }}>${p.price}<span style={{ fontSize: 14, color: C.textDim, fontWeight: 400 }}>/mo</span></div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{p.agents} agents on this plan</div>
            {p.features.map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: C.text }}>
                <Check size={14} color={C.teal} /> {f}
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );

  // ----- INBOX -----
  const InboxView = () => {
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const unread = unreadNotifs;
    const shown = inboxItems.filter(n => !showUnreadOnly || !notifReadIds.has(n.id));
    const markRead = markNotifRead;
    const markAll = markAllNotifsRead;
    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Notifications</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>
              {inboxItems.length === 0 ? "Nothing needs your attention right now." : unread > 0 ? `${unread} unread • ${inboxItems.length} total` : "All caught up"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowUnreadOnly(o => !o)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
              background: showUnreadOnly ? C.teal + "20" : C.bg,
              border: `1px solid ${showUnreadOnly ? C.teal + "55" : C.border}`,
              borderRadius: 8, color: showUnreadOnly ? C.teal : C.text,
              fontSize: 13, fontWeight: 500, cursor: "pointer", minHeight: 44,
            }}>
              <FilterIcon size={14} /> {showUnreadOnly ? "Unread only" : "All"}
            </button>
            <button onClick={markAll} disabled={unread === 0} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 500,
              cursor: unread ? "pointer" : "not-allowed", opacity: unread ? 1 : 0.5, minHeight: 44,
            }}>
              <CheckCheck size={14} /> Mark all read
            </button>
            <button onClick={clearAllNotifs} disabled={inboxItems.length === 0} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 500,
              cursor: inboxItems.length ? "pointer" : "not-allowed", opacity: inboxItems.length ? 1 : 0.5, minHeight: 44,
            }}>
              <X size={14} /> Clear all
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <Card><EmptyState icon={Inbox} title={inboxItems.length === 0 ? "All clear" : "All read"} message={inboxItems.length === 0 ? "New leads and follow-ups due will show up here as they happen." : "Everything has been read."} /></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map(n => {
              const NIcon = NOTIFICATION_ICONS[n.type] || Bell;
              const isUnread = !notifReadIds.has(n.id);
              const handleClick = () => {
                if (n.leadId) jumpToLead(n.leadId);
                if (isUnread) markRead(n.id);
              };
              return (
                <Card key={n.id} onClick={handleClick} style={{
                  padding: 14,
                  borderLeft: `3px solid ${isUnread ? n.color : C.border}`,
                  background: isUnread ? C.bgCard : C.bg,
                  cursor: "pointer", position: "relative",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: n.color + "20", display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <NIcon size={18} color={n.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{n.title}</span>
                        {isUnread && <span style={{ width: 6, height: 6, borderRadius: 3, background: n.color }} />}
                      </div>
                      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>{n.text}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: C.textDim }}>{timeAgo(new Date(n.ts).toISOString())}</span>
                        {n.leadId && <span style={{ fontSize: 12, color: C.teal, fontWeight: 600 }}>View lead →</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissNotif(n.id); }}
                      aria-label="Dismiss notification"
                      title="Dismiss"
                      style={{
                        background: "none", border: "none", color: C.textDim,
                        cursor: "pointer", padding: 8, flexShrink: 0,
                        minWidth: 32, minHeight: 32, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textDim; }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ----- TASKS / CALENDAR -----
  const TasksView = () => {
    const sections = [
      { id: "overdue",   title: "Overdue",          tasks: taskBuckets.overdue,   color: C.red,     icon: AlertCircle },
      { id: "today",     title: "Due today",        tasks: taskBuckets.today,     color: C.amber,   icon: CalendarDays },
      { id: "upcoming",  title: "Upcoming",         tasks: taskBuckets.upcoming,  color: C.blue,    icon: Calendar },
      { id: "nodue",     title: "No due date",      tasks: taskBuckets.nodue,     color: C.purple,  icon: Bookmark },
      { id: "completed", title: "Recently completed", tasks: taskBuckets.completed, color: C.teal,  icon: CheckCheck },
    ];
    const totalOpen = taskBuckets.overdue.length + taskBuckets.today.length + taskBuckets.upcoming.length + taskBuckets.nodue.length;

    const submitQuickTask = () => {
      const text = qaTaskTextRef.current?.value || "";
      if (!text.trim()) return;
      addTask(qaTaskLeadRef.current?.value || "_none", text, qaTaskDueRef.current?.value || "");
      if (qaTaskTextRef.current) qaTaskTextRef.current.value = "";
      if (qaTaskDueRef.current) qaTaskDueRef.current.value = "";
      if (qaTaskLeadRef.current) qaTaskLeadRef.current.value = "_none";
    };
    const leadsByName = [...leads].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return (
      <div>
        <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Tasks & follow-ups</h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 16px" }}>
          {totalOpen === 0 ? "No open follow-ups yet — add one below, with or without a lead" : `${totalOpen} open across all leads`}
        </p>

        <div style={{ display: "flex", gap: isMobile ? 8 : 12, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard icon={AlertCircle} label="Overdue"   value={taskBuckets.overdue.length}  color={C.red}    isMobile={isMobile} />
          <StatCard icon={CalendarDays} label="Today"     value={taskBuckets.today.length}    color={C.amber}  isMobile={isMobile} />
          <StatCard icon={Calendar} label="Upcoming"  value={taskBuckets.upcoming.length} color={C.blue}   isMobile={isMobile} />
          <StatCard icon={CheckCircle2} label="Completed" value={allTasks.filter(t => t.done).length} color={C.teal} isMobile={isMobile} />
        </div>

        {/* Quick-add: create a task from here, optionally tied to a lead */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
            <input
              type="text" ref={qaTaskTextRef} defaultValue=""
              placeholder="What needs to happen next?"
              onKeyDown={e => { if (e.key === "Enter") submitQuickTask(); }}
              style={{
                flex: 1, padding: "10px 12px", background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
              }}
            />
            <select
              ref={qaTaskLeadRef} defaultValue="_none"
              style={{
                padding: "10px 12px", background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
                colorScheme: "dark", width: isMobile ? "100%" : 180,
              }}
            >
              <option value="_none">No lead</option>
              {leadsByName.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input
              type="date" ref={qaTaskDueRef} defaultValue=""
              style={{
                padding: "10px 12px", background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
                colorScheme: "dark", width: isMobile ? "100%" : 160,
              }}
            />
            <button onClick={submitQuickTask} style={{ ...btnPrimary() }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </Card>

        {totalOpen === 0 && taskBuckets.completed.length === 0 ? (
          <Card>
            <EmptyState
              icon={CalendarPlus}
              title="No follow-ups scheduled yet"
              message="Add one above — with or without a lead — or from any lead's Follow-ups section. Tasks show up here grouped by due date."
              action={
                <button onClick={() => setView("leads")} style={{ ...btnPrimary(), marginTop: 16 }}>
                  Go to leads
                </button>
              }
            />
          </Card>
        ) : (
          sections.map(s => (
            s.tasks.length === 0 ? null : (
              <Card key={s.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <s.icon size={16} color={s.color} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.title}</span>
                  <span style={{ fontSize: 11, color: C.textDim, marginLeft: "auto" }}>{s.tasks.length}</span>
                </div>
                {s.tasks.map(t => (
                  <div key={`${t.leadId}-${t.id}`} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0", borderBottom: `1px solid ${C.border}`,
                  }}>
                    <button onClick={() => toggleTask(t.leadId, t.id)} style={{
                      background: "none", border: "none", padding: 4, cursor: "pointer",
                      display: "flex", alignItems: "center", color: t.done ? C.teal : C.textDim,
                    }}>
                      {t.done ? <CheckCircle2 size={18} /> : <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${C.textDim}` }} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        color: t.done ? C.textDim : C.text,
                        textDecoration: t.done ? "line-through" : "none",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{t.text}</div>
                      <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {t.lead && (
                          <button onClick={() => jumpToLead(t.leadId)} style={{
                            background: "none", border: "none", color: C.teal,
                            fontSize: 11, cursor: "pointer", padding: 0,
                          }}>{t.lead.name}</button>
                        )}
                        <span>{t.due === todayStr ? "Due today" : taskHasDue(t) ? `Due ${formatDate(t.due)}` : "No due date"}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteTask(t.leadId, t.id)} style={{
                      background: "none", border: "none", padding: 6, cursor: "pointer",
                      color: C.textDim, display: "flex", alignItems: "center",
                    }} aria-label="Delete task"><Trash2 size={14} /></button>
                  </div>
                ))}
              </Card>
            )
          ))
        )}
      </div>
    );
  };

  // ----- LISTINGS -----
  const latLngToSvg = (lat, lng) => {
    const y = 480 - ((lat - 33.485) / 0.335) * 440;
    const x = ((lng - (-79.09)) / 0.38) * 240 + 80;
    return { x: Math.max(20, Math.min(360, x)), y: Math.max(20, Math.min(580, y)) };
  };

  const ListingMap = ({ items }) => (
    <svg viewBox="0 0 400 600" style={{ width: "100%", height: "100%", display: "block", borderRadius: 10, background: C.bg }}>
      <defs>
        <linearGradient id="oceanGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.bg} />
          <stop offset="40%" stopColor="#0e1838" />
          <stop offset="100%" stopColor="#13234b" />
        </linearGradient>
        <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f1a2a" />
          <stop offset="100%" stopColor="#13202f" />
        </linearGradient>
      </defs>
      {/* Land */}
      <rect x="0" y="0" width="270" height="600" fill="url(#landGrad)" />
      {/* Coast curve (rough) */}
      <path d="M 270 0 Q 280 60 270 130 Q 260 220 280 320 Q 300 420 280 510 Q 270 580 280 600 L 400 600 L 400 0 Z" fill="url(#oceanGrad)" />
      {/* Coast line */}
      <path d="M 270 0 Q 280 60 270 130 Q 260 220 280 320 Q 300 420 280 510 Q 270 580 280 600"
            fill="none" stroke={C.teal + "33"} strokeWidth="1" />
      {/* Area labels */}
      <text x="200" y="50"  fill={C.textDim} fontSize="11" textAnchor="middle">N. Myrtle Beach</text>
      <text x="200" y="225" fill={C.textDim} fontSize="11" textAnchor="middle">Myrtle Beach</text>
      <text x="180" y="380" fill={C.textDim} fontSize="11" textAnchor="middle">Murrells Inlet</text>
      <text x="180" y="510" fill={C.textDim} fontSize="11" textAnchor="middle">Pawleys Island</text>
      <text x="345" y="320" fill={C.teal + "77"} fontSize="11" fontStyle="italic" textAnchor="middle">Atlantic</text>
      {/* Markers */}
      {items.map(L => {
        const { x, y } = latLngToSvg(L.lat, L.lng);
        const isActive = hoveredListing === L.id || selectedListing?.id === L.id;
        return (
          <g key={L.id}
             onMouseEnter={() => setHoveredListing(L.id)}
             onMouseLeave={() => setHoveredListing(null)}
             onClick={() => setSelectedListing(L)}
             style={{ cursor: "pointer" }}>
            <circle cx={x} cy={y} r={isActive ? 9 : 6} fill={C.teal} opacity={isActive ? 0.4 : 0.2} />
            <circle cx={x} cy={y} r={isActive ? 5 : 4} fill={C.teal} stroke={C.bg} strokeWidth="1.5" />
            {isActive && (
              <g>
                <rect x={x + 10} y={y - 16} width={110} height={28} rx={6} fill={C.bgCard} stroke={C.teal + "55"} />
                <text x={x + 16} y={y - 3} fill={C.text} fontSize="10" fontWeight="600">{formatPrice(L.price)}</text>
                <text x={x + 16} y={y + 8} fill={C.textMuted} fontSize="9">{L.beds}BR · {L.baths}BA</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );

  const ListingCard = ({ L }) => {
    const photo = photoForListing(L.id);
    const agent = AGENTS.find(a => a.id === L.listing_agent);
    const isHovered = hoveredListing === L.id;
    return (
      <div
        onClick={() => setSelectedListing(L)}
        onMouseEnter={() => setHoveredListing(L.id)}
        onMouseLeave={() => setHoveredListing(null)}
        style={{
          background: C.bgCard,
          border: `1px solid ${isHovered ? C.gold + "55" : C.border}`,
          borderRadius: 12, overflow: "hidden", cursor: "pointer",
          transition: "transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease",
          transform: isHovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: isHovered ? "0 18px 38px rgba(26,26,34,0.10)" : "none",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Hero image */}
        <div style={{
          position: "relative",
          height: 220,
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%), url(${photo})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-position 0.6s ease",
        }}>
          {/* Top-left: status pill */}
          {L.days <= 5 && (
            <span style={{
              position: "absolute", top: 14, left: 14,
              padding: "4px 10px", borderRadius: 3,
              background: C.gold, color: "#fff",
              fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase",
            }}>Just Listed</span>
          )}
          {/* Top-right: pending/sold */}
          {L.status === "pending" && (
            <span style={{
              position: "absolute", top: 14, right: 14,
              padding: "4px 10px", borderRadius: 3,
              background: "rgba(26,26,34,0.85)", color: "#fff",
              fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase",
            }}>Under Contract</span>
          )}
          {L.status === "sold" && (
            <span style={{
              position: "absolute", top: 14, right: 14,
              padding: "4px 10px", borderRadius: 3,
              background: "rgba(26,26,34,0.85)", color: "#fff",
              fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase",
            }}>Sold</span>
          )}
          {/* Bottom-left price overlay */}
          <div style={{
            position: "absolute", left: 16, bottom: 14, right: 16,
            display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: "#fff",
          }}>
            <div>
              <div style={{
                fontFamily: SERIF_FONT, fontSize: 28, fontWeight: 500,
                lineHeight: 1, letterSpacing: "0.01em",
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}>{formatPrice(L.price)}</div>
            </div>
            <div style={{
              fontSize: 9, color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600,
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}>
              {L.days}d on market
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          <div>
            <div style={{ fontSize: 9, color: C.gold, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
              {L.community}
            </div>
            <div style={{ fontSize: 15, color: C.text, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
              {L.address}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{L.area}</div>
          </div>

          <div style={{
            display: "flex", gap: 0,
            paddingTop: 12, borderTop: `1px solid ${C.border}`,
            justifyContent: "space-between",
          }}>
            <div style={{ textAlign: "center", flex: 1, borderRight: `1px solid ${C.border}`, padding: "0 4px" }}>
              <div style={{ fontFamily: SERIF_FONT, fontSize: 18, fontWeight: 500, color: C.text, lineHeight: 1 }}>{L.beds}</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginTop: 4 }}>Bed</div>
            </div>
            <div style={{ textAlign: "center", flex: 1, borderRight: `1px solid ${C.border}`, padding: "0 4px" }}>
              <div style={{ fontFamily: SERIF_FONT, fontSize: 18, fontWeight: 500, color: C.text, lineHeight: 1 }}>{L.baths}</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginTop: 4 }}>Bath</div>
            </div>
            <div style={{ textAlign: "center", flex: 1.4, padding: "0 4px" }}>
              <div style={{ fontFamily: SERIF_FONT, fontSize: 18, fontWeight: 500, color: C.text, lineHeight: 1 }}>{L.sqft.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginTop: 4 }}>Sqft</div>
            </div>
          </div>

          {agent && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              paddingTop: 12, borderTop: `1px solid ${C.border}`,
              fontSize: 11, color: C.textMuted,
            }}>
              <Avatar name={agent.name} size={20} color={planColor(agent.plan)} />
              <span>Listed by <span style={{ color: C.text, fontWeight: 600 }}>{agent.name}</span></span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ListingsView = () => (
    <div>
      <div style={pageHeader(isMobile)}>
        <div>
          <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Listings</h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Active Grand Strand inventory · MLS auto-sync</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <Card style={{ marginBottom: 16, padding: isMobile ? 12 : 16 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr 1fr" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} color={C.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text" value={listingSearch}
              onChange={e => setListingSearch(e.target.value)}
              placeholder="Search address, community, area…"
              style={{ width: "100%", padding: "10px 12px 10px 36px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none", minHeight: 44 }}
            />
          </div>
          <select value={listingCommunity} onChange={e => setListingCommunity(e.target.value)} style={selectStyle()}>
            <option value="all">All communities</option>
            {LISTING_COMMUNITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={listingType} onChange={e => setListingType(e.target.value)} style={selectStyle()}>
            <option value="all">Any type</option>
            {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={listingBeds} onChange={e => setListingBeds(Number(e.target.value))} style={selectStyle()}>
            <option value="0">Any beds</option>
            <option value="2">2+ beds</option>
            <option value="3">3+ beds</option>
            <option value="4">4+ beds</option>
            <option value="5">5+ beds</option>
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="number" value={listingMinPrice} onChange={e => setListingMinPrice(e.target.value)} placeholder="Min $" style={priceInputStyle()} />
            <input type="number" value={listingMaxPrice} onChange={e => setListingMaxPrice(e.target.value)} placeholder="Max $" style={priceInputStyle()} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>
          Showing {filteredListings.length} of {listingsSource.length} listings
          {(listingSearch || listingCommunity !== "all" || listingType !== "all" || listingBeds || listingMinPrice || listingMaxPrice) && (
            <button onClick={() => {
              setListingSearch(""); setListingCommunity("all"); setListingType("all");
              setListingBeds(0); setListingMinPrice(""); setListingMaxPrice("");
            }} style={{
              marginLeft: 12, background: "none", border: "none", color: C.teal,
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>Clear filters</button>
          )}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: 16 }}>
        {/* Listings grid */}
        <div>
          {filteredListings.length === 0 ? (
            <Card><EmptyState icon={Search} title="No listings match" message="Adjust filters to broaden the search." /></Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {filteredListings.map(L => <ListingCard key={L.id} L={L} />)}
            </div>
          )}
        </div>

        {/* Map */}
        <Card style={{ padding: 12, position: isMobile ? "static" : "sticky", top: 16, height: isMobile ? 360 : 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <MapPin size={14} color={C.teal} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Map view</span>
            <span style={{ fontSize: 11, color: C.textDim, marginLeft: "auto" }}>{filteredListings.length} markers</span>
          </div>
          <div style={{ height: "calc(100% - 28px)" }}>
            <ListingMap items={filteredListings} />
          </div>
        </Card>
      </div>
    </div>
  );

  // ----- Add Lead Modal -----
  const AddLeadModal = () => {
    if (!showAddLead) return null;
    const fieldStyle = {
      width: "100%", padding: "10px 12px",
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
      color: C.text, fontSize: 13, outline: "none",
    };
    const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };
    return (
      <div onClick={() => !addingLead && setShowAddLead(false)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 450, padding: isMobile ? 0 : 20,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: C.bgCard, borderRadius: isMobile ? 0 : 14,
          width: isMobile ? "100%" : 560, maxWidth: "100%",
          maxHeight: isMobile ? "100%" : "90vh", overflow: "auto",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.teal + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={18} color={C.teal} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Add a new lead</h2>
              <p style={{ fontSize: 12, color: C.textDim, margin: "2px 0 0" }}>They'll go straight into your CRM.</p>
            </div>
            <button onClick={() => setShowAddLead(false)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", padding: 8 }}><X size={18} /></button>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Name *</label>
              <input autoFocus type="text" ref={el => leadFormRef.current.name = el} defaultValue="" style={fieldStyle} placeholder="e.g., Robert Williams" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" ref={el => leadFormRef.current.email = el} defaultValue="" style={fieldStyle} placeholder="name@example.com" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" ref={el => leadFormRef.current.phone = el} defaultValue="" style={fieldStyle} placeholder="(843) 555-0100" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select ref={el => leadFormRef.current.status = el} defaultValue="new" style={selectStyle()}>
                  <option value="new">New</option>
                  <option value="nurture">Nurture</option>
                  <option value="hot">Hot</option>
                  <option value="cold">Cold</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Stage</label>
                <select ref={el => leadFormRef.current.stage = el}
                  defaultValue={stagesAll.find(s => s.is_entry)?.id || STAGES[0]?.id || "captured"}
                  style={selectStyle()}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Score</label>
                <input type="number" min={0} max={100} ref={el => leadFormRef.current.score = el} defaultValue="" style={fieldStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Area</label>
                <input type="text" ref={el => leadFormRef.current.area = el} defaultValue="" style={fieldStyle} placeholder="e.g., Pawleys Island" />
              </div>
              <div>
                <label style={labelStyle}>Budget</label>
                <input type="text" ref={el => leadFormRef.current.budget = el} defaultValue="" style={fieldStyle} placeholder="$350K-$450K" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Interest</label>
                <select ref={el => leadFormRef.current.interest = el} defaultValue="Buying" style={selectStyle()}>
                  <option value="Buying">Buying</option>
                  <option value="Selling">Selling</option>
                  <option value="Investing">Investing</option>
                  <option value="Renting">Renting</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Source</label>
                <input type="text" ref={el => leadFormRef.current.source = el} defaultValue="" style={fieldStyle} placeholder="Manual entry" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Notes</label>
              <textarea ref={el => leadFormRef.current.aiNotes = el} defaultValue="" rows={3} style={{ ...fieldStyle, resize: "vertical", minHeight: 70, fontFamily: "inherit" }} placeholder="What do you know about this lead so far?" />
            </div>
          </div>
          <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAddLead(false)} disabled={addingLead} style={{
              padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: "transparent", color: C.text, fontSize: 13, fontWeight: 500,
              cursor: addingLead ? "not-allowed" : "pointer", minHeight: 44,
            }}>Cancel</button>
            <button onClick={submitNewLead} disabled={addingLead} style={{
              ...btnPrimary(),
              opacity: addingLead ? 0.5 : 1,
              cursor: addingLead ? "not-allowed" : "pointer",
            }}>
              {addingLead ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={14} />}
              {addingLead ? "Adding..." : "Add lead"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ----- Delete Confirmation -----
  const DeleteConfirmModal = () => {
    if (!confirmDelete) return null;
    const lead = confirmDelete;
    return (
      <div onClick={() => setConfirmDelete(null)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 460, padding: 20,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: C.bgCard, borderRadius: 14, width: "100%", maxWidth: 440,
          border: `1px solid ${C.red}33`, overflow: "hidden",
        }}>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.red + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertCircle size={20} color={C.red} />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>Delete {lead.name}?</h2>
            </div>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.55, margin: 0 }}>
              This will permanently remove the lead along with their tags, activity, notes, follow-ups, and any messages. This can't be undone.
            </p>
          </div>
          <div style={{ padding: 16, background: C.bg, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setConfirmDelete(null)} style={{
              padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: "transparent", color: C.text, fontSize: 13, fontWeight: 500,
              cursor: "pointer", minHeight: 44,
            }}>Cancel</button>
            <button onClick={performDeleteLead} style={{
              padding: "10px 14px", borderRadius: 8, border: "none",
              background: C.red, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", gap: 6,
            }}><Trash2 size={14} /> Delete</button>
          </div>
        </div>
      </div>
    );
  };

  const ListingDetailModal = () => {
    if (!selectedListing) return null;
    const L = selectedListing;
    return (
      <div onClick={() => setSelectedListing(null)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 450, padding: isMobile ? 0 : 20,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: C.bgCard, borderRadius: isMobile ? 0 : 14,
          width: isMobile ? "100%" : "100%", maxWidth: 560,
          maxHeight: isMobile ? "100%" : "92vh", overflow: "auto",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{
            height: 280,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%), url(${photoForListing(L.id)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}>
            <button onClick={() => setSelectedListing(null)} style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(26,26,34,0.7)", border: "none",
              color: "#fff", fontSize: 18, cursor: "pointer",
              width: 38, height: 38, borderRadius: 19,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}>×</button>
            {L.days <= 5 && (
              <span style={{
                position: "absolute", top: 14, left: 14,
                padding: "5px 12px", borderRadius: 3,
                background: C.gold, color: "#fff",
                fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
              }}>Just Listed</span>
            )}
            {L.status === "pending" && (
              <span style={{
                position: "absolute", top: 14, left: 14,
                padding: "5px 12px", borderRadius: 3,
                background: "rgba(26,26,34,0.85)", color: "#fff",
                fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
              }}>Under Contract</span>
            )}
            <div style={{ position: "absolute", left: 24, bottom: 20, color: "#fff" }}>
              <div style={{ fontSize: 9, color: C.goldSoft, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                {L.community}
              </div>
              <div style={{ fontFamily: SERIF_FONT, fontSize: 36, fontWeight: 500, lineHeight: 1, letterSpacing: "0.01em", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
                {formatPrice(L.price)}
              </div>
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 16, color: C.text, fontWeight: 600, marginBottom: 2 }}>{L.address}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={12} /> {L.area}
              <span style={{ color: C.textDim }}>·</span>
              <Badge color={L.status === "pending" ? C.amber : C.green}>{L.status}</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Beds", value: L.beds, icon: BedDouble },
                { label: "Baths", value: L.baths, icon: Bath },
                { label: "Sqft", value: L.sqft.toLocaleString(), icon: Building2 },
                { label: "DOM", value: L.days, icon: Clock },
              ].map(s => (
                <div key={s.label} style={{ padding: 10, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, textAlign: "center" }}>
                  <s.icon size={14} color={C.textDim} style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Listing agent</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={L.agent} size={36} color={C.teal} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{L.agent}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>{L.type}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setToast({ message: "Showing request sent", kind: "success" })} style={btnPrimary()}>
                <Calendar size={14} /> Schedule showing
              </button>
              <button onClick={() => runAI("listing-desc", L)} style={quickAction(C.purple)}>
                <Sparkles size={14} /> Generate copy
              </button>
              <button onClick={() => setToast({ message: "Saved to favorites", kind: "success" })} style={quickAction(C.teal)}>
                <Bookmark size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ----- CRM TOOLS (owner toolset: site, IDX, email, AI) -----
  const SiteToolsView = () => {
    const tabs = [
      { id: "preview", label: "Site Preview" },
      { id: "connect", label: "Connect Site" },
      { id: "idx", label: "IDX Feeds" },
      { id: "emailbrand", label: "Email Branding" },
      { id: "ai", label: "AI Tools" },
    ];
    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>CRM Tools</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Manage your sites, IDX feeds, email branding, and AI tools.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 24, overflowX: "auto" }}>
          {tabs.map(t => {
            const active = siteToolsTab === t.id;
            return (
              <button key={t.id} onClick={() => setSiteToolsTab(t.id)} style={{
                flexShrink: 0, padding: "10px 16px", border: "none", background: "transparent",
                color: active ? C.text : C.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer",
                borderBottom: active ? `2px solid ${C.teal}` : "2px solid transparent", marginBottom: -1,
              }}>{t.label}</button>
            );
          })}
        </div>
        {siteToolsTab === "preview" && <SitePreviewView />}
        {siteToolsTab === "connect" && <ConnectSiteView />}
        {siteToolsTab === "idx" && <IdxFeedsView />}
        {siteToolsTab === "emailbrand" && <EmailBrandingView />}
        {siteToolsTab === "ai" && <AIView />}
      </div>
    );
  };

  const SitePreviewView = () => {
    // LIVE preview: if this org has authored site content, show their real
    // rendered site (fresh=1 skips caches so saves appear immediately).
    const hasSite = !!(org?.site_config && Object.keys(org.site_config).length > 0 && org?.slug);
    const [previewKey, setPreviewKey] = useState(0);
    if (hasSite) {
      const liveUrl = `${SITES_BASE}/?slug=${encodeURIComponent(org.slug)}&fresh=1`;
      return (
        <div>
          <div style={pageHeader(isMobile)}>
            <div>
              <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Site preview</h1>
              <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>
                Your live site, rendered from what you saved in My Website.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPreviewKey(k => k + 1)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 13, fontWeight: 500, cursor: "pointer", minHeight: 44,
              }}><RefreshCw size={14} /> Refresh</button>
              <a href={liveUrl} target="_blank" rel="noreferrer" style={{ ...btnPrimary(), textDecoration: "none" }}>
                <Globe size={14} /> Open site
              </a>
            </div>
          </div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
            <iframe
              key={previewKey}
              src={liveUrl}
              title="Live site preview"
              style={{ width: "100%", height: "72vh", border: "none", display: "block" }}
            />
          </div>
        </div>
      );
    }
    // DEMO preview (no site authored yet)
    const agent = AGENTS.find(a => a.id === previewAgentId) || AGENTS[0];
    const community = COMMUNITIES.find(c => c.id === previewCommunityId) || COMMUNITIES[0];
    const matchedReport = REPORTS.find(r => r.title.toLowerCase().includes(community.area.toLowerCase().split(" ")[0])) || REPORTS[0];
    const featured = LISTINGS.filter(L => L.community === community.name).slice(0, 6);
    const subdomain = agent.website || `${agent.name.toLowerCase().replace(/[^a-z]+/g, "")}.triskope.io`;
    const initials = agent.name.split(" ").map(n => n[0]).join("");
    const lastName = agent.name.split(" ").slice(-1)[0];

    // Luxury palette
    const LUX = {
      cream:     "#f9f6f0",
      paper:     "#ffffff",
      ink:       "#1a1a22",
      ink2:      "#3a3a45",
      mute:      "#7a7a85",
      gold:      "#9c7f43",
      goldSoft:  "#c2a76e",
      hairline:  "#e8e2d4",
      dark:      "#1a1a22",
    };

    // Hero imagery per community type — Unsplash CDN
    const heroByType = {
      Golf:    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1600&q=80&auto=format&fit=crop",
      Luxury:  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80&auto=format&fit=crop",
      Family:  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80&auto=format&fit=crop",
      Urban:   "https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=1600&q=80&auto=format&fit=crop",
      Beach:   "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80&auto=format&fit=crop",
    };
    const heroPhoto = heroByType[community.type] || heroByType.Beach;

    // Rotating listing photos
    const listingPhotos = [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1613553474179-e1eda3ea5734?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&q=80&auto=format&fit=crop",
    ];

    const heroEyebrow = {
      Golf:   "Championship golf community",
      Luxury: "Luxury coastal estates",
      Family: "Coastal family living",
      Urban:  "Walkable district",
      Beach:  "Beachfront retreat",
    }[community.type] || "Curated coastal living";

    const heroTagline = pick([
      "Where every morning begins with the sound of the Atlantic.",
      "Live the way you've always pictured it. Quietly. Beautifully.",
      "A short drive to the beach. A lifetime feeling at home.",
      "Designed for the rare buyer who knows exactly what they want.",
    ]);

    const communityStory = pick([
      `${community.name} is one of the few neighborhoods on the Grand Strand where you can still find the balance of privacy, light, and elevation — without giving up the proximity to ${community.area}. Most residences sit on generous lots with mature live oak coverage, and the architectural standard has stayed remarkably consistent since the early 2000s.`,
      `Set just minutes from the ocean, ${community.name} has quietly become the address of choice for buyers who want resort-style amenities without the resort-style noise. The community is anchored by a private clubhouse, a small lake system, and a 24-hour staffed gatehouse.`,
    ]);

    const lifestyle = [
      { title: "Beach access", text: "Three minutes by golf cart to the public beach access at " + community.area + ". Cabana service for residents." },
      { title: "Dining",       text: pick(["A short drive to Marsh Walk for fresh oysters", "Members-only clubhouse dining nightly", "Walkable to seasonal seafood restaurants"]) + "." },
      { title: "Schools",      text: "Zoned for one of the Grand Strand's highest-rated school districts. Private options nearby." },
      { title: "Outdoors",     text: pick(["Two championship golf courses on-property", "Six miles of nature trails", "Tennis, pickleball, and a junior Olympic pool"]) + "." },
    ];

    const testimonialQuote = pick([
      `"${agent.name.split(" ")[0]} knew this market block by block. We saw three homes the first morning, and one of them turned out to be perfect. Closed in 22 days."`,
      `"What separated working with ${agent.name.split(" ")[0]} from every other agent we'd talked to was honesty. We were told no to two homes we loved — and thanked her later."`,
      `"We bought sight-unseen from Connecticut. ${agent.name.split(" ")[0]} did a one-hour video walk-through of every property we asked about. Felt like she lived next door."`,
    ]);

    const submitPreviewForm = (e) => {
      e.preventDefault();
      if (!previewForm.name || !previewForm.email) {
        setToast({ message: "Name and email are required on the public form", kind: "error" });
        return;
      }
      setToast({ message: `Demo capture: a real lead for ${agent.name.split(" ")[0]} just came in.`, kind: "success" });
      setPreviewForm({ name: "", email: "", phone: "", message: "" });
    };

    const inputStyle = {
      width: "100%", padding: "12px 0",
      background: "transparent",
      border: "none", borderBottom: `1px solid ${LUX.hairline}`,
      borderRadius: 0,
      color: LUX.ink, fontSize: 14, outline: "none",
      fontFamily: "inherit",
      transition: "border-color 0.2s ease",
    };
    const labelStyle = {
      display: "block", fontSize: 10, fontWeight: 600, color: LUX.mute,
      marginBottom: 4, letterSpacing: "0.18em", textTransform: "uppercase",
    };
    const serif = `"Cormorant Garamond", "Cormorant", Georgia, "Hoefler Text", serif`;
    const sans  = `"Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, sans-serif`;

    return (
      <div>
        {/* Admin toolbar */}
        <Card style={{ marginBottom: 16, background: C.bgCard }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <Globe size={16} color={C.teal} />
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>Public page preview</div>
            <span style={{ fontSize: 11, color: C.textDim }}>
              What a visitor sees on the agent's branded subdomain.
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={previewAgentId} onChange={e => setPreviewAgentId(Number(e.target.value))} style={{ ...selectStyle(), minHeight: 36, fontSize: 12 }}>
                {AGENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={previewCommunityId} onChange={e => setPreviewCommunityId(Number(e.target.value))} style={{ ...selectStyle(), minHeight: 36, fontSize: 12 }}>
                {COMMUNITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {/* Luxury public page */}
        <div style={{
          background: LUX.cream, borderRadius: 14, overflow: "hidden",
          border: `1px solid ${C.border}`,
          fontFamily: sans, color: LUX.ink,
        }}>
          {/* Browser chrome */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", background: "#e9eaf2",
            borderBottom: "1px solid #d9dbe6",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: "#fa615c" }} />
              <div style={{ width: 10, height: 10, borderRadius: 5, background: "#fdbe40" }} />
              <div style={{ width: 10, height: 10, borderRadius: 5, background: "#34c84a" }} />
            </div>
            <div style={{
              flex: 1, marginLeft: 12, padding: "6px 12px",
              background: "#ffffff", borderRadius: 6,
              fontSize: 12, color: "#55557a",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              border: "1px solid #d9dbe6",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              https://{subdomain}/community/{community.slug}
            </div>
          </div>

          {/* Site header */}
          <header style={{
            background: LUX.paper, borderBottom: `1px solid ${LUX.hairline}`,
            padding: isMobile ? "16px 20px" : "20px 48px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: isMobile ? 18 : 22, fontWeight: 500, color: LUX.ink, letterSpacing: "0.04em" }}>
                {agent.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 9, color: LUX.mute, letterSpacing: "0.24em", textTransform: "uppercase", marginTop: 2 }}>
                {community.area} · Real Estate
              </div>
            </div>
            <nav style={{ display: isMobile ? "none" : "flex", gap: 28, fontSize: 12, color: LUX.ink2, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500 }}>
              <span>Communities</span>
              <span>Listings</span>
              <span>Journal</span>
              <span>About</span>
            </nav>
            <button style={{
              padding: "10px 18px",
              background: "transparent",
              border: `1px solid ${LUX.ink}`,
              color: LUX.ink, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
            }}>Contact</button>
          </header>

          {/* HERO — full-bleed photo with overlay */}
          <div style={{
            position: "relative",
            minHeight: isMobile ? 360 : 560,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55) 100%), url(${heroPhoto})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: isMobile ? "60px 24px" : "100px 48px",
            textAlign: "center",
          }}>
            <div style={{ maxWidth: 740 }}>
              <div style={{
                display: "inline-block",
                padding: "4px 14px",
                border: `1px solid rgba(255,255,255,0.5)`,
                color: "rgba(255,255,255,0.92)",
                fontSize: 10, fontWeight: 600,
                letterSpacing: "0.28em", textTransform: "uppercase",
                marginBottom: 28,
              }}>{heroEyebrow}</div>
              <h1 style={{
                fontFamily: serif,
                fontSize: isMobile ? 44 : 76,
                fontWeight: 400,
                margin: "0 0 18px",
                letterSpacing: "0.01em",
                lineHeight: 1.05,
                color: "#fff",
              }}>{community.name}</h1>
              <p style={{
                fontFamily: serif, fontStyle: "italic",
                fontSize: isMobile ? 17 : 22, lineHeight: 1.5,
                margin: "0 auto 36px", maxWidth: 540,
                color: "rgba(255,255,255,0.9)", fontWeight: 400,
              }}>{heroTagline}</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button style={{
                  padding: "14px 28px",
                  background: LUX.gold, color: "#fff",
                  border: "none", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "inherit",
                }}>Request the report</button>
                <button style={{
                  padding: "14px 28px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.7)",
                  color: "#fff", fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "inherit",
                }}>View listings</button>
              </div>
            </div>
          </div>

          {/* Stats — minimal, with vertical dividers */}
          <section style={{
            background: LUX.paper, padding: isMobile ? "32px 20px" : "44px 48px",
            borderBottom: `1px solid ${LUX.hairline}`,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 0 }}>
              {[
                { label: "Active Listings", value: community.listings },
                { label: "Median Price",    value: community.avgPrice },
                { label: "Days On Market",  value: matchedReport.dom },
                { label: "30-Day Visitors", value: community.views.toLocaleString() },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  textAlign: "center",
                  padding: isMobile ? "12px 8px" : "8px 16px",
                  borderRight: (!isMobile && i < arr.length - 1) ? `1px solid ${LUX.hairline}` : "none",
                  borderBottom: (isMobile && i < arr.length - 2) ? `1px solid ${LUX.hairline}` : "none",
                }}>
                  <div style={{ fontSize: 9, color: LUX.mute, letterSpacing: "0.24em", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: serif, fontSize: isMobile ? 30 : 40, fontWeight: 400, color: LUX.ink, lineHeight: 1 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Featured properties */}
          <section style={{ background: LUX.cream, padding: isMobile ? "48px 20px" : "72px 48px" }}>
            <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
              <div style={{ fontSize: 10, color: LUX.gold, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
                The Collection
              </div>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 30 : 42, fontWeight: 400, color: LUX.ink, margin: 0, letterSpacing: "0.01em" }}>
                Currently for sale
              </h2>
              <div style={{ width: 40, height: 1, background: LUX.gold, margin: "20px auto 0" }} />
            </div>
            {featured.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: LUX.mute, fontFamily: serif, fontSize: 17, fontStyle: "italic" }}>
                Select another community above to preview featured listings.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 24 : 32 }}>
                {featured.map((L, i) => (
                  <div key={L.id} style={{
                    background: LUX.paper,
                    border: `1px solid ${LUX.hairline}`,
                    overflow: "hidden",
                    transition: "transform 0.4s ease, box-shadow 0.4s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 32px rgba(26,26,34,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{
                      height: 240,
                      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%), url(${listingPhotos[i % listingPhotos.length]})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      position: "relative",
                    }}>
                      {L.days <= 5 && (
                        <span style={{
                          position: "absolute", top: 16, left: 16,
                          padding: "5px 12px",
                          background: LUX.gold, color: "#fff",
                          fontSize: 9, fontWeight: 700,
                          letterSpacing: "0.2em", textTransform: "uppercase",
                        }}>New</span>
                      )}
                    </div>
                    <div style={{ padding: isMobile ? 20 : 28 }}>
                      <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 400, color: LUX.ink, marginBottom: 6, letterSpacing: "0.01em" }}>
                        {formatPrice(L.price)}
                      </div>
                      <div style={{ fontSize: 13, color: LUX.ink, marginBottom: 14 }}>{L.address}</div>
                      <div style={{ display: "flex", gap: 16, fontSize: 11, color: LUX.mute, letterSpacing: "0.12em", textTransform: "uppercase", paddingTop: 14, borderTop: `1px solid ${LUX.hairline}` }}>
                        <span>{L.beds} BED</span>
                        <span>{L.baths} BATH</span>
                        <span>{L.sqft.toLocaleString()} SQFT</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* About the community — editorial 2-col with pull quote */}
          <section style={{ background: LUX.paper, padding: isMobile ? "48px 20px" : "80px 48px", borderTop: `1px solid ${LUX.hairline}` }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: isMobile ? 32 : 64, alignItems: "center", maxWidth: 1080, margin: "0 auto" }}>
              <div>
                <div style={{ fontSize: 10, color: LUX.gold, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
                  The Community
                </div>
                <h2 style={{ fontFamily: serif, fontSize: isMobile ? 30 : 40, fontWeight: 400, color: LUX.ink, margin: "0 0 22px", letterSpacing: "0.01em", lineHeight: 1.1 }}>
                  An address that quietly outpaces the rest of the Grand Strand.
                </h2>
                <p style={{ fontSize: 15, color: LUX.ink2, lineHeight: 1.75, margin: "0 0 18px" }}>
                  {communityStory}
                </p>
                <p style={{ fontSize: 15, color: LUX.ink2, lineHeight: 1.75, margin: "0 0 22px" }}>
                  Inventory rarely exceeds two dozen homes at a time and the median price has appreciated {matchedReport.priceChange.replace("+", "")} year over year. Buyers in this range tend to be relocations from the Northeast and Midwest, often cash, increasingly drawn by the lifestyle as much as the property itself.
                </p>
                <a href="#" style={{ fontSize: 11, color: LUX.gold, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, textDecoration: "none", borderBottom: `1px solid ${LUX.gold}`, paddingBottom: 3 }}>
                  Read the latest market report →
                </a>
              </div>
              <div style={{
                padding: isMobile ? "28px" : "44px 36px",
                borderLeft: isMobile ? "none" : `2px solid ${LUX.gold}`,
                borderTop: isMobile ? `2px solid ${LUX.gold}` : "none",
              }}>
                <div style={{ fontFamily: serif, fontSize: isMobile ? 22 : 28, fontStyle: "italic", color: LUX.ink, lineHeight: 1.45, letterSpacing: "0.005em" }}>
                  {testimonialQuote}
                </div>
                <div style={{ marginTop: 24, fontSize: 11, color: LUX.mute, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
                  — A recent buyer · {community.area}
                </div>
              </div>
            </div>
          </section>

          {/* Lifestyle — what's nearby */}
          <section style={{ background: LUX.cream, padding: isMobile ? "48px 20px" : "72px 48px", borderTop: `1px solid ${LUX.hairline}` }}>
            <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
              <div style={{ fontSize: 10, color: LUX.gold, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>
                Lifestyle
              </div>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 28 : 38, fontWeight: 400, color: LUX.ink, margin: 0, letterSpacing: "0.01em" }}>
                What's within reach
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 20 : 32, maxWidth: 1080, margin: "0 auto" }}>
              {lifestyle.map((item, i) => (
                <div key={item.title} style={{ textAlign: "center", padding: "0 8px" }}>
                  <div style={{ width: 56, height: 1, background: LUX.gold, margin: "0 auto 18px" }} />
                  <div style={{ fontFamily: serif, fontSize: isMobile ? 18 : 22, fontWeight: 500, color: LUX.ink, marginBottom: 12, letterSpacing: "0.01em" }}>
                    {item.title}
                  </div>
                  <p style={{ fontSize: 13, color: LUX.ink2, lineHeight: 1.7, margin: 0 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Meet your agent */}
          <section style={{ background: LUX.paper, padding: isMobile ? "48px 20px" : "80px 48px", borderTop: `1px solid ${LUX.hairline}` }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.5fr", gap: isMobile ? 28 : 64, alignItems: "center", maxWidth: 980, margin: "0 auto" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: isMobile ? 180 : 240, height: isMobile ? 180 : 240,
                  margin: "0 auto", borderRadius: "50%",
                  background: `linear-gradient(135deg, #1a1a22 0%, #3a3a45 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: LUX.goldSoft,
                  fontFamily: serif, fontSize: isMobile ? 56 : 84, fontWeight: 400,
                  letterSpacing: "0.05em",
                  border: `1px solid ${LUX.gold}`,
                  boxShadow: "0 12px 32px rgba(26,26,34,0.12)",
                }}>{initials}</div>
                <div style={{ marginTop: 20, fontSize: 10, color: LUX.gold, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700 }}>
                  Your Agent
                </div>
              </div>
              <div>
                <h2 style={{ fontFamily: serif, fontSize: isMobile ? 30 : 40, fontWeight: 400, color: LUX.ink, margin: "0 0 6px", letterSpacing: "0.01em" }}>
                  {agent.name}
                </h2>
                <div style={{ fontSize: 11, color: LUX.gold, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 22 }}>
                  {community.area} Specialist · {agent.plan} Producer
                </div>
                <p style={{ fontSize: 15, color: LUX.ink2, lineHeight: 1.75, margin: "0 0 14px" }}>
                  {lastName.charAt(0)}{lastName.slice(1).toLowerCase()} has spent the last decade walking nearly every block of the Grand Strand. Her clients are buyers and sellers who don't have time for the runaround — they want a clear picture of the market, an honest read on each home, and an agent who will tell them when to walk away.
                </p>
                <p style={{ fontSize: 15, color: LUX.ink2, lineHeight: 1.75, margin: "0 0 22px" }}>
                  Closed {agent.closings} homes last year, with a median time to offer of 11 days. References available on request.
                </p>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: LUX.ink, fontWeight: 600 }}>
                  <a href="#" style={{ color: LUX.ink, textDecoration: "none", borderBottom: `1px solid ${LUX.gold}`, paddingBottom: 3 }}>Schedule a call</a>
                  <a href="#" style={{ color: LUX.ink, textDecoration: "none", borderBottom: `1px solid ${LUX.gold}`, paddingBottom: 3 }}>Email {agent.name.split(" ")[0]}</a>
                </div>
              </div>
            </div>
          </section>

          {/* Lead capture form */}
          <section style={{ background: LUX.dark, color: "#fff", padding: isMobile ? "48px 20px" : "80px 48px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1fr", gap: isMobile ? 32 : 80, maxWidth: 1080, margin: "0 auto", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: LUX.goldSoft, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>
                  Stay in front of the market
                </div>
                <h2 style={{ fontFamily: serif, fontSize: isMobile ? 32 : 44, fontWeight: 400, color: "#fff", margin: "0 0 22px", letterSpacing: "0.01em", lineHeight: 1.15 }}>
                  Receive the {community.name} report.
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.75, margin: 0, maxWidth: 480 }}>
                  Once a month — pricing trends, recent comps, what's moving fast,
                  what's sitting, and a small handful of off-market homes worth knowing about.
                  Written by {agent.name.split(" ")[0]} personally. Unsubscribe at any time.
                </p>
              </div>
              <form onSubmit={submitPreviewForm} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>Name</label>
                  <input style={{ ...inputStyle, color: "#fff", borderBottomColor: "rgba(255,255,255,0.3)" }}
                    value={previewForm.name}
                    onChange={e => setPreviewForm({ ...previewForm, name: e.target.value })}
                    placeholder="Jane Smith" />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>Email</label>
                  <input style={{ ...inputStyle, color: "#fff", borderBottomColor: "rgba(255,255,255,0.3)" }}
                    type="email"
                    value={previewForm.email}
                    onChange={e => setPreviewForm({ ...previewForm, email: e.target.value })}
                    placeholder="jane@example.com" />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>Phone (optional)</label>
                  <input style={{ ...inputStyle, color: "#fff", borderBottomColor: "rgba(255,255,255,0.3)" }}
                    value={previewForm.phone}
                    onChange={e => setPreviewForm({ ...previewForm, phone: e.target.value })}
                    placeholder="(843) 555-0100" />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: "rgba(255,255,255,0.6)" }}>What are you looking for?</label>
                  <textarea style={{ ...inputStyle, color: "#fff", borderBottomColor: "rgba(255,255,255,0.3)", minHeight: 60, resize: "vertical", paddingTop: 12 }}
                    value={previewForm.message}
                    onChange={e => setPreviewForm({ ...previewForm, message: e.target.value })}
                    placeholder="A 3-bedroom in a golf community under $500K..." />
                </div>
                <button type="submit" style={{
                  marginTop: 8,
                  padding: "16px 28px",
                  background: LUX.gold, color: "#fff",
                  border: "none",
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  cursor: "pointer", fontFamily: "inherit",
                }}>Request the report →</button>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
                  By submitting, you agree to be contacted by {agent.name.split(" ")[0]}.
                </div>
              </form>
            </div>
          </section>

          {/* Footer */}
          <footer style={{
            background: "#0e0e15", color: "rgba(255,255,255,0.5)",
            padding: isMobile ? "32px 20px" : "40px 48px",
            display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr 1fr 1fr",
            gap: isMobile ? 24 : 48,
          }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 18, color: "#fff", letterSpacing: "0.04em", marginBottom: 12 }}>
                {agent.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                Coastal Carolina luxury real estate.<br />
                Licensed in South Carolina.<br />
                {community.area}, SC.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: LUX.goldSoft, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Discover</div>
              <div style={{ fontSize: 12, lineHeight: 1.9 }}>Communities<br />Listings<br />Market Reports<br />Press</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: LUX.goldSoft, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Connect</div>
              <div style={{ fontSize: 12, lineHeight: 1.9 }}>Contact<br />Schedule a Call<br />Instagram<br />LinkedIn</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: LUX.goldSoft, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Compliance</div>
              <div style={{ fontSize: 12, lineHeight: 1.9 }}>Privacy<br />Terms<br />Equal Housing Opportunity</div>
            </div>
            <div style={{
              gridColumn: isMobile ? "1" : "1 / -1",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 20, marginTop: 8,
              fontSize: 10, color: "rgba(255,255,255,0.35)",
              display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
              letterSpacing: "0.08em",
            }}>
              <div>© {new Date().getFullYear()} {agent.name}. All rights reserved.</div>
              <div>Powered by <span style={{ color: LUX.goldSoft, letterSpacing: "0.16em" }}>TRISKOPE</span></div>
            </div>
          </footer>
        </div>
      </div>
    );
  };

  // ----- AI ASSISTANT VIEW -----
  const AssistantView = () => {
    if (!hasAssistantAccess) {
      return <AssistantLocked />;
    }

    const suggestions = [
      "Summarize what's happened with my leads this week",
      "Which leads should I call today?",
      "Draft a follow-up to my hottest lead",
      "What should I focus on today?",
      "Which leads are at risk of going cold?",
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - " + (isMobile ? 96 : 64) + "px)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0a0a14",
          }}>
            <Bot size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text, margin: 0 }}>AI Assistant</h1>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              Knows your CRM. Drafts messages. Surfaces priorities. Never sleeps.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge color={C.teal}>AI Assistant</Badge>
          </div>
        </div>

        {/* Chat surface */}
        <div ref={assistantScrollRef} style={{
          flex: 1, overflowY: "auto",
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: isMobile ? 12 : 16, minHeight: 0,
        }}>
          {assistantMessages.length === 0 ? (
            <div style={{ padding: isMobile ? 12 : 24, textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18, margin: "8px auto 16px",
                background: `linear-gradient(135deg, ${C.teal}22, ${C.blue}22, ${C.purple}22)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot size={32} color={C.teal} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                How can I help today{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}?
              </div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20, maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.5 }}>
                I know your leads, listings, and market. Ask me anything, or pick a starter prompt.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => sendToAssistant(s)} style={{
                    padding: "10px 14px", borderRadius: 9999,
                    background: C.bg, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 12, cursor: "pointer", fontWeight: 500,
                    transition: "background 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.bgHover; e.currentTarget.style.borderColor = C.teal + "55"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {assistantMessages.map((m) => {
                const isUser = m.role === "user";
                const stillStreaming = assistantStreamingId === m.id;
                return (
                  <div key={m.id} style={{
                    display: "flex", gap: 10,
                    flexDirection: isUser ? "row-reverse" : "row",
                    alignItems: "flex-start",
                  }}>
                    {isUser ? (
                      <Avatar name={profile?.display_name || session?.user?.email || "You"} size={28} color={C.teal} />
                    ) : (
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#0a0a14", flexShrink: 0,
                      }}>
                        <Bot size={14} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: isMobile ? "85%" : "75%",
                      background: isUser ? `linear-gradient(135deg, ${C.teal}, ${C.blue})` : C.bg,
                      color: isUser ? "#0a0a14" : C.text,
                      border: isUser ? "none" : `1px solid ${C.border}`,
                      borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      padding: "10px 14px",
                      fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
                    }}>
                      {m.text || (stillStreaming && <span style={{ color: C.textDim }}>thinking…</span>)}
                      {stillStreaming && m.text && <span className="tk-cursor" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compose */}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <input
            type="text"
            value={assistantDraft}
            onChange={e => setAssistantDraft(e.target.value)}
            placeholder={
              hasAssistantAccess
                ? (selectedLead ? `Ask anything about ${selectedLead.name} or your pipeline…` : "Ask anything about your CRM…")
                : "Upgrade to Pro to chat with the Assistant"
            }
            disabled={!hasAssistantAccess || assistantStreamingId}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) sendToAssistant(assistantDraft); }}
            style={{
              flex: 1, padding: "12px 16px",
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
              color: C.text, fontSize: 14, outline: "none",
              minHeight: 48,
              opacity: hasAssistantAccess ? 1 : 0.5,
            }}
          />
          <button
            onClick={() => sendToAssistant(assistantDraft)}
            disabled={!hasAssistantAccess || !assistantDraft.trim() || assistantStreamingId}
            style={{
              padding: "0 18px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
              color: "#0a0a14", fontWeight: 700, fontSize: 14,
              cursor: (assistantDraft.trim() && hasAssistantAccess && !assistantStreamingId) ? "pointer" : "not-allowed",
              opacity: (assistantDraft.trim() && hasAssistantAccess && !assistantStreamingId) ? 1 : 0.5,
              display: "flex", alignItems: "center", gap: 6, minHeight: 48,
            }}
          >
            <Send size={14} /> Send
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 8, textAlign: "center" }}>
          The Assistant answers from your real pipeline data. It won't have info it can't see (e.g. live listing prices).
        </div>
      </div>
    );
  };

  const AssistantLocked = () => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: C.bg, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.textDim,
        }}>
          <Lock size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text, margin: 0 }}>AI Assistant</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "2px 0 0" }}>Available on the Pro and Enterprise plans.</p>
        </div>
        <select value={demoPlan} onChange={e => setDemoPlan(e.target.value)} style={{
          ...selectStyle(), minHeight: 32, fontSize: 11, padding: "6px 28px 6px 10px",
        }} title="Demo: switch plan">
          <option value="starter">Starter (demo)</option>
          <option value="pro">Pro (demo)</option>
          <option value="enterprise">Enterprise (demo)</option>
        </select>
      </div>

      <Card style={{
        padding: isMobile ? 20 : 32,
        background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bgCard} 60%, ${C.purple}12 100%)`,
        borderColor: C.borderLight,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: isMobile ? 20 : 32, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: C.purple + "20", color: C.purple, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
              <Sparkles size={12} /> Pro feature
            </div>
            <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: C.text, margin: "0 0 10px", lineHeight: 1.2 }}>
              An AI that actually knows your business.
            </h2>
            <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: "0 0 18px" }}>
              Ask the Assistant anything: who to call today, how to respond to a tough buyer email,
              what the Pawleys Island market is doing this week. It reads your leads, listings,
              activity, and tasks — and writes in your voice.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[
                "Daily priority briefings — who needs you, why",
                "One-click drafts for follow-ups, replies, and re-engagement",
                "Market answers grounded in live MLS data",
                "Auto-summarized lead activity timelines",
                "Schedule, classify, and triage tasks by voice or text",
              ].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: C.text }}>
                  <Check size={14} color={C.teal} style={{ marginTop: 3, flexShrink: 0 }} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setView("billing")} style={btnPrimary()}>
                <Sparkles size={14} /> See Pro pricing
              </button>
              <button onClick={() => setDemoPlan("pro")} style={{
                ...aiActionBtn(false), background: C.bg,
              }}>
                <Bot size={14} /> Demo it now
              </button>
            </div>
          </div>
          <div style={{
            background: C.bg, borderRadius: 14, padding: 16,
            border: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", gap: 10,
            position: "relative",
            opacity: 0.92,
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Avatar name="You" size={24} color={C.teal} />
              <div style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, color: "#0a0a14", padding: "8px 12px", borderRadius: "10px 10px 4px 10px", fontSize: 12, fontWeight: 500 }}>
                Which leads should I call today?
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#0a0a14", flexShrink: 0 }}>
                <Bot size={12} />
              </div>
              <div style={{ background: C.bgCard, color: C.text, padding: "8px 12px", borderRadius: "10px 10px 10px 4px", fontSize: 12, lineHeight: 1.5, border: `1px solid ${C.border}` }}>
                Three people I'd put first: <strong>Karen Lee</strong> (toured 142 Springs Saturday, ready to offer),
                <strong> Robert Williams</strong> (4 visits to your market report this week, pre-approved),
                and <strong>the Fosters</strong> (Austin tech couple, 30-day timeline). Want me to draft outreach for any of them?
              </div>
            </div>
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(180deg, transparent 30%, ${C.bgCard} 100%)`,
              pointerEvents: "none", borderRadius: 14,
            }} />
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center",
              fontSize: 11, color: C.textDim,
            }}>
              Sample exchange. Upgrade to unlock.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  // ----- IDX FEEDS (attach an agent's IDX/MLS feed) -----
  const AddAgentView = () => {
    const F = useRef({});
    const setF = (k) => (el) => { if (el) F.current[k] = el; };
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const [err, setErr] = useState("");
    const [agents, setAgents] = useState(null);

    const loadAgents = async () => {
      // Show orgs the owner can see (their own + any they created). Read-only list.
      const { data } = await supabase.from("organizations").select("id, name, slug, site_config, features, custom_domain").order("name");
      setAgents(data || []);
    };
    useEffect(() => { loadAgents(); }, []);

    const toggleFeature = async (orgId, feature, enabled) => {
      // optimistic
      setAgents(prev => prev.map(a => a.id === orgId ? { ...a, features: { ...(a.features || {}), [feature]: enabled } } : a));
      const { data, error } = await supabase.functions.invoke("set-org-features", {
        body: { org_id: orgId, feature, enabled },
      });
      if (error || data?.error) {
        setToast({ message: "Couldn't update: " + (data?.error || error.message), kind: "error" });
        loadAgents(); // revert to truth
      } else {
        setToast({ message: `Communities ${enabled ? "enabled" : "disabled"} for this agent.`, kind: "success" });
      }
    };

    const slugStyle = { width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };
    const lbl = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, marginBottom: 6 };
    const Row = ({ k, label, ph, half }) => (
      <div style={{ marginBottom: 14, flex: half ? 1 : "none" }}>
        <label style={lbl}>{label}</label>
        <input ref={setF(k)} defaultValue="" placeholder={ph} style={slugStyle} />
      </div>
    );

    const submit = async () => {
      setErr(""); setResult(null);
      const agent_name = F.current.agent_name?.value?.trim() || "";
      const email = F.current.email?.value?.trim() || "";
      if (!agent_name || !email) { setErr("Agent name and email are required."); return; }
      setBusy(true);
      const { data, error } = await supabase.functions.invoke("create-agent-org", {
        body: {
          agent_name, email,
          slug: F.current.slug?.value?.trim() || "",
          brokerage: F.current.brokerage?.value?.trim() || "",
          phone: F.current.phone?.value?.trim() || "",
          city: F.current.city?.value?.trim() || "",
          region: F.current.region?.value?.trim() || "",
        },
      });
      setBusy(false);
      // When the function returns non-2xx, supabase puts the Response in error.context.
      // Read the real JSON body so the actual error (e.g. "Invite threw: ...") shows.
      if (error || data?.error) {
        let detail = data?.error || error?.message || "Something went wrong.";
        try {
          if (error?.context && typeof error.context.json === "function") {
            const body = await error.context.json();
            if (body?.error) detail = body.error;
          }
        } catch { /* keep detail */ }
        setErr(detail);
        return;
      }
      setResult(data);
      setToast({ message: data.mode === "added_existing_user" ? "Agent added to a new workspace." : "Agent invited — they'll get an email to set up.", kind: "success" });
      // clear form
      Object.values(F.current).forEach(el => { if (el) el.value = ""; });
      loadAgents();
    };

    return (
      <div>
        <button onClick={() => setView("agents")} style={{ background: "none", border: "none", color: C.teal, fontSize: 14, cursor: "pointer", padding: "4px 0", marginBottom: 8, display: "flex", alignItems: "center", gap: 4, minHeight: 44 }}>
          <ChevronLeft size={16} /> Back to agents
        </button>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Add Agent</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Onboard a new agent — creates their workspace and sends them an invite to log in.</p>
          </div>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 16px" }}>New agent details</h3>
          <Row k="agent_name" label="Agent full name" ph="e.g. Jane Smith" />
          <Row k="email" label="Agent email (their login + invite)" ph="agent@email.com" />
          <Row k="slug" label="Workspace slug (optional — auto from name)" ph="jane-smith" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Row k="brokerage" label="Brokerage" ph="Your brokerage" half />
            <Row k="phone" label="Phone" ph="(555) 555-0100" half />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Row k="city" label="City" ph="Your city" half />
            <Row k="region" label="State" ph="ST" half />
          </div>
          {err && <div style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={submit} disabled={busy} style={{ ...btnPrimary(), opacity: busy ? 0.6 : 1 }}>
              {busy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
              {busy ? "Creating…" : "Create agent workspace + invite"}
            </button>
            <button onClick={() => setView("agents")} disabled={busy} style={{ padding: "11px 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}>
              Cancel
            </button>
          </div>
          {result && (
            <div style={{ marginTop: 14, padding: 14, background: C.green + "10", border: `1px solid ${C.green}33`, borderRadius: 10, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
              <strong>Done.</strong> Workspace <code style={{ fontFamily: "monospace" }}>{result.slug}</code> created.{" "}
              {result.mode === "invited_new_user"
                ? "An invite email was sent — once they accept and set a password, they're in."
                : "They already had an account and were added as owner of the new workspace."}
              <div style={{ marginTop: 8, color: C.textMuted }}>Their website slug is <code style={{ fontFamily: "monospace" }}>{result.slug}</code> — use it to generate/publish their site.</div>
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Workspaces</h3>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 14px" }}>Agent workspaces you can see.</p>
          {agents === null ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>Loading…</div>
          ) : agents.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>No agent workspaces yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {agents.map(a => (
                <div key={a.slug} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace" }}>{a.slug}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, color: C.textDim }}>
                      {a.site_config?.agent_name ? "Site set" : "No site yet"}
                    </div>
                    <button
                      onClick={() => toggleFeature(a.id, "communities", !(a.features?.communities))}
                      style={{
                        display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 999,
                        border: `1px solid ${a.features?.communities ? C.green + "55" : C.border}`,
                        background: a.features?.communities ? C.green + "18" : "transparent",
                        color: a.features?.communities ? C.green : C.textMuted,
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: a.features?.communities ? C.green : C.textDim }} />
                      Communities {a.features?.communities ? "on" : "off"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const EmailBrandingView = () => {
    const [brand, setBrand] = useState(null);
    const [saving, setSaving] = useState(false);
    const fields = ["logo_url","brand_color","accent_color","font","sig_name","sig_title","sig_brokerage","sig_phone","sig_email","sig_photo_url"];
    const refs = useRef({});

    useEffect(() => {
      (async () => {
        if (!org?.id) { setBrand({}); return; }
        const { data: orgRow } = await supabase.from("organizations").select("email_branding").eq("id", org.id).maybeSingle();
        setBrand(orgRow?.email_branding || {});
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [org?.id]);

    const [preview, setPreview] = useState({});
    useEffect(() => { if (brand) setPreview(brand); }, [brand]);

    const onField = (k) => () => {
      const next = { ...preview };
      fields.forEach(f => { if (refs.current[f]) next[f] = refs.current[f].value; });
      setPreview(next);
    };

    const save = async () => {
      setSaving(true);
      const payload = {};
      fields.forEach(f => { payload[f] = refs.current[f]?.value || ""; });
      if (!org?.id) { setSaving(false); setToast({ message: "No workspace found.", kind: "error" }); return; }
      const { error } = await supabase.from("organizations").update({ email_branding: payload }).eq("id", org.id);
      setSaving(false);
      setToast({ message: error ? ("Save failed: " + error.message) : "Email branding saved", kind: error ? "error" : "success" });
      if (!error) setBrand(payload);
    };

    if (!brand) return <div style={{ padding: 24 }}><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /></div>;

    const fld = (k, label, placeholder) => (
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.textDim, marginBottom: 4 }}>{label}</label>
        <input ref={el => refs.current[k] = el} defaultValue={brand[k] || ""} placeholder={placeholder} onChange={onField(k)}
          style={{ width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none" }} />
      </div>
    );

    const p = preview;
    const brandColor = p.brand_color || "#1A2238";
    const accent = p.accent_color || "#9C7A3C";
    const font = p.font || "Georgia, serif";

    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0 }}>Email Branding</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>How your nurture emails look. Updates apply to all outgoing emails.</p>
          </div>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Save branding"}</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,360px) 1fr", gap: 24, alignItems: "start" }}>
          {/* Editor */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, marginBottom: 10 }}>Brand</div>
            {fld("logo_url", "Logo URL", "https://…/logo.png")}
            {fld("brand_color", "Brand color", "#1A2238")}
            {fld("accent_color", "Accent color", "#9C7A3C")}
            {fld("font", "Font", "Georgia, serif")}
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, margin: "18px 0 10px" }}>Signature</div>
            {fld("sig_name", "Name", "Jane Smith")}
            {fld("sig_title", "Title", "Realtor")}
            {fld("sig_brokerage", "Brokerage", "Acme Realty")}
            {fld("sig_phone", "Phone", "843-555-0100")}
            {fld("sig_email", "Email", "jane@acme.com")}
            {fld("sig_photo_url", "Headshot URL", "https://…/headshot.jpg")}
          </div>

          {/* Live preview */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, marginBottom: 10 }}>Preview</div>
            <div style={{ background: "#f4f2ee", padding: 20, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ maxWidth: 560, margin: "0 auto", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e7e2d8" }}>
                <div style={{ padding: "20px 28px", borderBottom: `3px solid ${accent}` }}>
                  {p.logo_url
                    ? <img src={p.logo_url} alt="" style={{ maxHeight: 44, maxWidth: 180 }} />
                    : <div style={{ fontFamily: font, fontSize: 19, fontWeight: "bold", color: brandColor }}>{p.sig_brokerage || p.sig_name || "Your brand"}</div>}
                </div>
                <div style={{ padding: 28, fontFamily: font, fontSize: 15, lineHeight: 1.7, color: "#2a2a2a" }}>
                  Hi Jordan,<br /><br />Thanks for your interest — I'm here whenever you're ready. No pressure, just here as a resource.<br /><br />Best,<br />{p.sig_name || "Your name"}
                </div>
                {(p.sig_name || p.sig_phone || p.sig_photo_url) && (
                  <div style={{ padding: "20px 28px", borderTop: "1px solid #eee", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {p.sig_photo_url && <img src={p.sig_photo_url} alt="" width={52} height={52} style={{ borderRadius: "50%", objectFit: "cover" }} />}
                    <div style={{ fontFamily: "sans-serif" }}>
                      {p.sig_name && <div style={{ fontSize: 14, fontWeight: "bold", color: brandColor }}>{p.sig_name}</div>}
                      {(p.sig_title || p.sig_brokerage) && <div style={{ fontSize: 12, color: "#666" }}>{[p.sig_title, p.sig_brokerage].filter(Boolean).join(" · ")}</div>}
                      {p.sig_phone && <div style={{ fontSize: 12, color: accent, marginTop: 3 }}>{p.sig_phone}</div>}
                      {p.sig_email && <div style={{ fontSize: 12, color: "#888" }}>{p.sig_email}</div>}
                    </div>
                  </div>
                )}
                <div style={{ padding: "14px 28px", background: "#faf9f7", fontSize: 11, color: "#999", textAlign: "center", fontFamily: "sans-serif" }}>
                  You're receiving this because you expressed interest. Unsubscribe.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ----- Site Admin (Triskope platform admins only) -----
  // Manage brand colors, SEO, and domains across ALL subscriber sites.
  const SiteAdminView = () => {
    const [sites, setSites] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [selId, setSelId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const A = useRef({});
    const setA = (k) => (el) => { if (el) A.current[k] = el; };

    const load = async () => {
      const { data, error } = await supabase.functions.invoke("admin-list-sites", { body: {} });
      if (error || data?.error) { setErr(data?.error || error.message); return; }
      setSites(data.sites || []);
      setMetrics(data.metrics || null);
    };
    useEffect(() => { load(); }, []);

    const sel = (sites || []).find(s => s.id === selId) || null;

    // Account overview (members, health, features) for the selected org
    const [ov, setOv] = useState(null);
    const loadOverview = async (orgId) => {
      setOv(null);
      const { data } = await supabase.functions.invoke("admin-manage-org", { body: { action: "overview", org_id: orgId } });
      if (data && !data.error) setOv(data);
    };
    useEffect(() => { if (selId) loadOverview(selId); }, [selId]);

    const act = async (action, extra = {}) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-org", { body: { action, org_id: selId, ...extra } });
      if (error || data?.error) {
        let msg = data?.error || error?.message || "Request failed";
        // Surface the fn's real error body instead of the generic non-2xx text.
        if (error?.context && typeof error.context.json === "function") {
          try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
        }
        setToast({ message: msg, kind: "error" });
        return null;
      }
      loadOverview(selId); load();
      return data;
    };

    const saveSite = async () => {
      if (!sel) return;
      setSaving(true); setErr("");
      const body = {
        org_id: sel.id,
        site_config: {
          colors: {
            accent: A.current.accent?.value || "#1d6b63",
            accent_deep: A.current.accent_deep?.value || "#0f4a44",
            ink: A.current.ink?.value || "#10261f",
            ink_soft: A.current.ink_soft?.value || "#3a4f47",
            gold: A.current.gold?.value || "#b8893f",
          },
          seo_title: A.current.seo_title?.value || "",
          seo_description: A.current.seo_description?.value || "",
          og_image: A.current.og_image?.value || "",
          city: A.current.city?.value || "",
          region: A.current.region?.value || "",
          areas_served: (A.current.areas_served?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        },
        custom_domain: (A.current.custom_domain?.value || "").trim(),
      };
      const { data, error } = await supabase.functions.invoke("save-site-config", { body });
      setSaving(false);
      if (error || data?.error) { setErr(data?.error || error.message); return; }
      setToast({ message: `${sel.name} updated`, kind: "success" });
      load();
    };

    const inS = { width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };
    const lbl = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, marginBottom: 6 };

    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Site Admin</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Brand, SEO, and domains for every subscriber site. Content stays with the subscriber.</p>
          </div>
        </div>
        {err && <Card style={{ marginBottom: 16, borderColor: C.red }}><p style={{ color: C.red, fontSize: 14, margin: 0 }}>{err}</p></Card>}
        {metrics && (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 20 }}>
            {[
              { label: "MRR", value: `$${metrics.mrr.toLocaleString()}`, color: C.teal },
              { label: "Past due", value: `$${metrics.past_due_total.toLocaleString()}`, color: metrics.past_due_total > 0 ? C.red : C.textDim, sub: `${metrics.billing.past_due || 0} account${(metrics.billing.past_due || 0) === 1 ? "" : "s"}` },
              { label: "Subscribers", value: metrics.billing.active || 0, sub: `${metrics.subscribers} total · ${metrics.billing.suspended || 0} suspended` },
              { label: "Active users", value: metrics.users_active_30d, sub: `of ${metrics.users_total} · last 30 days` },
              { label: "Leads (30d)", value: metrics.leads_30d.toLocaleString(), sub: `${metrics.leads_total.toLocaleString()} all-time` },
              { label: "Tiers", value: `${metrics.tiers.starter || 0} · ${metrics.tiers.pro || 0} · ${metrics.tiers.enterprise || 0}`, sub: "starter · pro · enterprise" },
            ].map((t, i) => (
              <Card key={i} style={{ padding: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textDim, marginBottom: 6 }}>{t.label}</div>
                <div style={{ fontFamily: SERIF_FONT, fontSize: 26, fontWeight: 600, lineHeight: 1.1, color: t.color || C.text }}>{t.value}</div>
                {t.sub && <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 4 }}>{t.sub}</div>}
              </Card>
            ))}
          </div>
        )}
        {!sites ? <Card><p style={{ color: C.textMuted, margin: 0 }}>Loading sites…</p></Card> : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", alignItems: "start" }}>
            <Card>
              {sites.map(s => (
                <button key={s.id} onClick={() => setSelId(s.id)} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "12px 14px",
                  background: selId === s.id ? C.bg : "transparent", border: "none",
                  borderRadius: 8, cursor: "pointer", marginBottom: 2,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: s.has_site ? C.teal : C.textDim }}>
                    {s.has_site ? (s.custom_domain || `${s.slug}.triskope.ai`) : "No site yet"}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2, textTransform: "capitalize" }}>
                    <span style={{ color: C.textDim }}>{s.plan}</span>
                    <span style={{ marginLeft: 8, fontWeight: 700, color: s.billing_status === "active" ? C.teal : s.billing_status === "past_due" ? C.gold : C.red }}>
                      {(s.billing_status || "active").replace("_", " ")}
                    </span>
                  </div>
                </button>
              ))}
            </Card>
            {sel ? (
              <div key={sel.id}>
                <Card style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 12px" }}>Account</h3>
                  <label style={lbl}>Plan</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {["starter", "pro", "enterprise"].map(p => (
                      <button key={p} onClick={() => act("set_plan", { plan: p })} style={{
                        padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        textTransform: "capitalize", cursor: "pointer",
                        border: `1px solid ${sel.plan === p ? C.teal : C.border}`,
                        background: sel.plan === p ? C.teal + "18" : "transparent",
                        color: sel.plan === p ? C.teal : C.text,
                      }}>{p}</button>
                    ))}
                  </div>
                  <label style={lbl}>Billing status</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {[["active", C.teal], ["past_due", C.gold], ["suspended", C.red]].map(([st, col]) => (
                      <button key={st} onClick={() => {
                        if (st === "suspended" && !window.confirm(`Suspend ${sel.name}? Their CRM locks, their site goes offline, and lead capture stops. Data is kept.`)) return;
                        act("set_billing", { billing_status: st });
                      }} style={{
                        padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${sel.billing_status === st ? col : C.border}`,
                        background: sel.billing_status === st ? col + "18" : "transparent",
                        color: sel.billing_status === st ? col : C.text,
                      }}>{st.replace("_", " ")}</button>
                    ))}
                  </div>
                  <label style={lbl}>Features</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {["communities", "market_reports", "ai_assistant", "auto_assign"].map(f => {
                      const on = !!ov?.org?.features?.[f];
                      return (
                        <button key={f} onClick={() => act("set_feature", { feature: f, enabled: !on })} style={{
                          padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${on ? C.teal : C.border}`,
                          background: on ? C.teal + "18" : "transparent",
                          color: on ? C.teal : C.textDim,
                        }}>{f.replace("_", " ")} {on ? "on" : "off"}</button>
                      );
                    })}
                  </div>
                  {ov ? (
                    <>
                      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
                        {ov.health.leads} leads · {ov.health.tasks} tasks · last lead {ov.health.last_lead_at ? new Date(ov.health.last_lead_at).toLocaleDateString() : "never"}
                      </div>
                      <label style={lbl}>Members</label>
                      {ov.members.map(m => (
                        <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontSize: 13.5, color: C.text }}>{m.email}</div>
                            <div style={{ fontSize: 11.5, color: C.textDim }}>{m.role} · last sign-in {m.last_sign_in_at ? new Date(m.last_sign_in_at).toLocaleDateString() : "never"}</div>
                          </div>
                          <button onClick={async () => {
                            const r = await act("reset_password", { email: m.email });
                            if (r?.ok) setToast({ message: `Reset email sent to ${m.email}`, kind: "success" });
                          }} style={{ fontSize: 12, fontWeight: 600, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Send reset</button>
                          <button onClick={async () => {
                            const r = await act("login_link", { email: m.email });
                            if (r?.link) {
                              try { await navigator.clipboard.writeText(r.link); setToast({ message: "Support login link copied — open it in a PRIVATE window. It signs you in as them.", kind: "info" }); }
                              catch { window.prompt("Support login link (open in a private window):", r.link); }
                            }
                          }} style={{ fontSize: 12, fontWeight: 600, color: C.gold, background: C.gold + "14", border: `1px solid ${C.gold}44`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Login link</button>
                        </div>
                      ))}
                      <div style={{ marginTop: 16 }}>
                        <label style={lbl}>Internal notes (never shown to subscriber)</label>
                        <textarea ref={setA("notes")} defaultValue={ov.org.admin_notes || ""} rows={3} style={{ ...inS, resize: "vertical" }} />
                        <button onClick={async () => {
                          const r = await act("set_notes", { notes: A.current.notes?.value || "" });
                          if (r?.ok) setToast({ message: "Notes saved", kind: "success" });
                        }} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", cursor: "pointer" }}>Save notes</button>
                      </div>
                    </>
                  ) : <div style={{ fontSize: 13, color: C.textDim }}>Loading account details…</div>}
                </Card>
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: 0 }}>{sel.name}</h3>
                    <a href={`${SITES_BASE}/?slug=${encodeURIComponent(sel.slug)}&fresh=1`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: C.teal, fontWeight: 600, textDecoration: "none" }}>Open site →</a>
                  </div>
                  <label style={lbl}>Custom domain</label>
                  <input ref={setA("custom_domain")} defaultValue={sel.custom_domain || ""} placeholder="clientdomain.com" style={{ ...inS, marginBottom: 10 }} />
                  <p style={{ fontSize: 12.5, color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
                    After saving: add the domain to the triskope-sites Vercel project, then have the client set
                    A @ → 76.76.21.21 and CNAME www → cname.vercel-dns.com.
                  </p>
                </Card>
                <Card style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 12px" }}>Brand colors</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
                    <div><label style={lbl}>Accent</label><input ref={setA("accent")} defaultValue={sel.colors.accent || "#1d6b63"} style={inS} /></div>
                    <div><label style={lbl}>Accent deep</label><input ref={setA("accent_deep")} defaultValue={sel.colors.accent_deep || "#0f4a44"} style={inS} /></div>
                    <div><label style={lbl}>Ink</label><input ref={setA("ink")} defaultValue={sel.colors.ink || "#10261f"} style={inS} /></div>
                    <div><label style={lbl}>Ink soft</label><input ref={setA("ink_soft")} defaultValue={sel.colors.ink_soft || "#3a4f47"} style={inS} /></div>
                    <div><label style={lbl}>Gold</label><input ref={setA("gold")} defaultValue={sel.colors.gold || "#b8893f"} style={inS} /></div>
                  </div>
                </Card>
                <Card style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 12px" }}>SEO</h3>
                  <label style={lbl}>Page title</label>
                  <input ref={setA("seo_title")} defaultValue={sel.seo_title} style={{ ...inS, marginBottom: 12 }} />
                  <label style={lbl}>Meta description</label>
                  <input ref={setA("seo_description")} defaultValue={sel.seo_description} style={{ ...inS, marginBottom: 12 }} />
                  <label style={lbl}>Social share image URL</label>
                  <input ref={setA("og_image")} defaultValue={sel.og_image} style={{ ...inS, marginBottom: 12 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div><label style={lbl}>City</label><input ref={setA("city")} defaultValue={sel.city} style={inS} /></div>
                    <div><label style={lbl}>State</label><input ref={setA("region")} defaultValue={sel.region} style={inS} /></div>
                  </div>
                  <label style={lbl}>Areas served (comma-separated)</label>
                  <input ref={setA("areas_served")} defaultValue={Array.isArray(sel.areas_served) ? sel.areas_served.join(", ") : (sel.areas_served || "")} style={inS} />
                </Card>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={saveSite} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving…" : `Save ${sel.name}`}
                  </button>
                </div>
              </div>
            ) : (
              <Card><p style={{ color: C.textMuted, margin: 0 }}>Select a subscriber to manage their site.</p></Card>
            )}
          </div>
        )}
      </div>
    );
  };

  const MyWebsiteView = () => {
    const cfg = org?.site_config || {};
    // Uncontrolled refs for all scalar text fields (avoids focus loss on the big form)
    const R = useRef({});
    const setR = (key) => (el) => { if (el) R.current[key] = el; };
    // List structures kept in local state (add/remove rows)
    const [listings, setListings] = useState(() => cfg.curated_listings || []);
    const [hoods, setHoods] = useState(() => cfg.neighborhoods || []);
    const [stats, setStats] = useState(() => cfg.stats || []);
    const [testimonials, setTestimonials] = useState(() => cfg.testimonials || []);
    const [solds, setSolds] = useState(() => cfg.sold_portfolio || []);
    const [about, setAbout] = useState(() => (cfg.about || []).join("\n\n"));
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(cfg._saved_at || null);
    const [err, setErr] = useState("");

    const colors = cfg.colors || {};

    const val = (k, fallback = "") => cfg[k] ?? fallback;

    const lblStyle = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, marginBottom: 6 };
    const inStyle = { width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };
    const Group = ({ children, title, sub }) => (
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>{title}</h3>
        {sub && <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 16px" }}>{sub}</p>}
        {children}
      </Card>
    );
    const Text = ({ k, label, placeholder, ph }) => (
      <div style={{ marginBottom: 14 }}>
        <label style={lblStyle}>{label}</label>
        <input ref={setR(k)} defaultValue={val(k)} placeholder={placeholder || ph || ""} style={inStyle} />
      </div>
    );

    // ----- Image upload (Supabase Storage bucket: site-assets) -----
    // Status is shown by mutating the button via refs, NOT React state:
    // any state change here remounts the form and wipes unsaved inputs.
    // Downscale big photos in the browser before upload (max 2400px, JPEG 85%).
    // Phone/DSLR photos are routinely 6-12MB; sites shouldn't serve that anyway.
    // GIFs pass through untouched to preserve animation.
    const compressImage = async (file) => {
      if (file.type === "image/gif") return file;
      try {
        const bmp = await createImageBitmap(file);
        const MAX = 2400;
        const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.size < 600 * 1024) return file; // already small
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.85));
        if (!blob) return file;
        return new File([blob], (file.name.replace(/\.[^.]+$/, "") || "image") + ".jpg", { type: "image/jpeg" });
      } catch { return file; }
    };

    const uploadSiteImage = async (file, onStatus) => {
      if (!file) return null;
      if (!/^image\//.test(file.type)) { onStatus?.("Images only"); return null; }
      onStatus?.("Preparing…");
      file = await compressImage(file);
      if (file.size > 5 * 1024 * 1024) { onStatus?.("Max 5MB"); return null; }
      onStatus?.("Uploading…");
      const ext = ((file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")) || "jpg";
      const path = `${org.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) { onStatus?.("Upload failed"); console.error("site image upload:", error); return null; }
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      return data?.publicUrl || null;
    };

    const UploadBtn = ({ onUrl }) => {
      const btnRef = useRef(null);
      const fileInRef = useRef(null);
      const handle = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const btn = btnRef.current;
        if (btn) { btn.disabled = true; btn.textContent = "Uploading…"; }
        const url = await uploadSiteImage(file, (msg) => { if (btn) btn.textContent = msg; });
        if (url) {
          onUrl(url);
          if (btn) btn.textContent = "Uploaded ✓";
        }
        setTimeout(() => { if (btn) { btn.textContent = "Upload"; btn.disabled = false; } }, url ? 1600 : 2500);
      };
      return (
        <>
          <input ref={fileInRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }} onChange={handle} />
          <button ref={btnRef} type="button" onClick={() => fileInRef.current?.click()} style={{
            padding: "10px 14px", background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, fontSize: 12.5, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}>Upload</button>
        </>
      );
    };

    // Image field: paste a URL or upload a file (fills the URL for you).
    const ImgText = ({ k, label, ph }) => (
      <div style={{ marginBottom: 14 }}>
        <label style={lblStyle}>{label}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={setR(k)} defaultValue={val(k)} placeholder={ph || ""} style={{ ...inStyle, flex: 1 }} />
          <UploadBtn onUrl={(url) => { if (R.current[k]) R.current[k].value = url; }} />
        </div>
      </div>
    );

    const save = async () => {
      setSaving(true); setErr("");
      const site_config = {
        agent_name: R.current.agent_name?.value || "",
        agent_first: R.current.agent_first?.value || "",
        brokerage: R.current.brokerage?.value || "",
        phone: R.current.phone?.value || "",
        email: R.current.email?.value || "",
        site_url: R.current.site_url?.value || "",
        seo_title: R.current.seo_title?.value || "",
        seo_description: R.current.seo_description?.value || "",
        og_image: R.current.og_image?.value || "",
        city: R.current.city?.value || "",
        region: R.current.region?.value || "",
        areas_served: (R.current.areas_served?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        hero_image: R.current.hero_image?.value || "",
        hero_alt: R.current.hero_alt?.value || "",
        hero_eyebrow: R.current.hero_eyebrow?.value || "",
        hero_headline: R.current.hero_headline?.value || "",
        hero_subtext: R.current.hero_subtext?.value || "",
        headshot: R.current.headshot?.value || "",
        footer_tagline: R.current.footer_tagline?.value || "",
        about: about.split("\n\n").map(s => s.trim()).filter(Boolean),
        colors: {
          ink: R.current.col_ink?.value || colors.ink || "#10261f",
          ink_soft: R.current.col_ink_soft?.value || colors.ink_soft || "#3a4f47",
          accent: R.current.col_accent?.value || colors.accent || "#1d6b63",
          accent_deep: R.current.col_accent_deep?.value || colors.accent_deep || "#0f4a44",
          gold: R.current.col_gold?.value || colors.gold || "#b8893f",
        },
        curated_listings: listings,
        neighborhoods: hoods,
        stats: stats.filter(s => s.value || s.label),
        testimonials: testimonials.filter(t => t.quote),
        sold_portfolio: solds.filter(s => s.address || s.image || s.price),
        _saved_at: new Date().toISOString(),
      };
      const body = { org_id: org.id, site_config };
      // Domain changes are platform-admin only; only send when edited.
      if (isPlatformAdmin) {
        const dom = (R.current.custom_domain?.value || "").trim();
        if (dom !== (org.custom_domain || "")) body.custom_domain = dom;
      }
      const { data, error } = await supabase.functions.invoke("save-site-config", { body });
      setSaving(false);
      if (error || data?.error) { setErr(data?.error || error.message); return; }
      setSavedAt(site_config._saved_at);
      setOrg(o => ({ ...o, site_config, ...(body.custom_domain !== undefined ? { custom_domain: body.custom_domain || null } : {}) }));
      setToast({ message: "Website saved — your live site updates immediately.", kind: "success" });
    };

    const updRow = (setter, list, i, key, value) => {
      const next = list.map((row, idx) => idx === i ? { ...row, [key]: value } : row);
      setter(next);
    };

    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>My Website</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Edit your site content here. Saves go live on your site right away.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {savedAt && org?.slug && (
              <a href={`${SITES_BASE}/?slug=${encodeURIComponent(org.slug)}&fresh=1`} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, fontSize: 13, fontWeight: 500, textDecoration: "none", minHeight: 44,
              }}><Globe size={14} /> View site</a>
            )}
            <button onClick={save} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        {savedAt && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Last saved {new Date(savedAt).toLocaleString()} · your live site updates immediately.</div>}
        {err && <Card style={{ marginBottom: 16, background: C.red + "0c", border: `1px solid ${C.red}33` }}><div style={{ fontSize: 13, color: C.red }}>{err}</div></Card>}

        <Group title="Basics" sub="Your name and how clients reach you.">
          <Text k="agent_name" label="Full name" ph="e.g. Jane Smith" />
          <Text k="agent_first" label="First name (used in headings)" ph="Jane" />
          <Text k="brokerage" label="Brokerage" ph="Your brokerage" />
          <Text k="phone" label="Phone" ph="(555) 555-0100" />
          <Text k="email" label="Email" ph="you@email.com" />
          <Text k="site_url" label="Website address" ph="https://yoursite.com/" />
        </Group>

        <Group title="Hero (top of your site)" sub="The first thing visitors see.">
          <Text k="hero_eyebrow" label="Small label above headline" ph="e.g. Your specialty · Your City, ST" />
          <Text k="hero_headline" label="Headline" ph="e.g. Find your dream home" />
          <Text k="hero_subtext" label="Subtext" ph="One or two sentences about what you do." />
          <ImgText k="hero_image" label="Hero background image" ph="https://… or upload" />
          <Text k="hero_alt" label="Hero image description (for accessibility/SEO)" ph="Describe your hero image" />
        </Group>

        <Group title="About you" sub="Your bio. Separate paragraphs with a blank line.">
          <textarea defaultValue={about} onChange={e => setAbout(e.target.value)} rows={6} style={{ ...inStyle, resize: "vertical", minHeight: 120 }} placeholder="Tell clients who you are…" />
          <div style={{ marginTop: 14 }}><ImgText k="headshot" label="Your photo" ph="https://… or upload" /></div>
          <Text k="footer_tagline" label="Footer tagline" ph="Real estate in your area." />
        </Group>

        <Group title="Featured listings" sub="Shown when no live MLS feed is synced. Once your IDX feed is connected, real active listings replace these automatically.">
          {listings.map((L, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 8, marginBottom: 8 }}>
                <input defaultValue={L.price} onChange={e => updRow(setListings, listings, i, "price", e.target.value)} placeholder="$849,000" style={inStyle} />
                <input defaultValue={L.beds} onChange={e => updRow(setListings, listings, i, "beds", e.target.value)} placeholder="Beds" style={inStyle} />
                <input defaultValue={L.baths} onChange={e => updRow(setListings, listings, i, "baths", e.target.value)} placeholder="Baths" style={inStyle} />
                <input defaultValue={L.sqft} onChange={e => updRow(setListings, listings, i, "sqft", e.target.value)} placeholder="Sqft" style={inStyle} />
              </div>
              <input defaultValue={L.address} onChange={e => updRow(setListings, listings, i, "address", e.target.value)} placeholder="Address or community" style={{ ...inStyle, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input defaultValue={L.image} onChange={e => updRow(setListings, listings, i, "image", e.target.value)} placeholder="Photo URL or upload" style={{ ...inStyle, flex: 1 }} />
                <UploadBtn onUrl={(url) => setListings(prev => prev.map((row, idx) => idx === i ? { ...row, image: url } : row))} />
              </div>
              <button onClick={() => setListings(listings.filter((_, idx) => idx !== i))} style={{ marginTop: 8, background: "none", border: "none", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
          ))}
          <button onClick={() => setListings([...listings, { price: "", address: "", beds: "", baths: "", sqft: "", image: "" }])} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 16px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.text, fontSize:12, fontWeight:700, letterSpacing:"0.04em", cursor:"pointer", marginTop:4 }}><Plus size={13} /> Add listing</button>
        </Group>

        <Group title="Communities you serve" sub="The neighborhood cards on your site.">
          {hoods.map((h, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <input defaultValue={h.name} onChange={e => updRow(setHoods, hoods, i, "name", e.target.value)} placeholder="Community name" style={{ ...inStyle, marginBottom: 8 }} />
              <input defaultValue={h.blurb} onChange={e => updRow(setHoods, hoods, i, "blurb", e.target.value)} placeholder="One-line description" style={{ ...inStyle, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input defaultValue={h.image} onChange={e => updRow(setHoods, hoods, i, "image", e.target.value)} placeholder="Photo URL or upload" style={{ ...inStyle, flex: 1 }} />
                <UploadBtn onUrl={(url) => setHoods(prev => prev.map((row, idx) => idx === i ? { ...row, image: url } : row))} />
              </div>
              <button onClick={() => setHoods(hoods.filter((_, idx) => idx !== i))} style={{ marginTop: 8, background: "none", border: "none", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
          ))}
          <button onClick={() => setHoods([...hoods, { name: "", blurb: "", image: "" }])} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 16px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.text, fontSize:12, fontWeight:700, letterSpacing:"0.04em", cursor:"pointer", marginTop:4 }}><Plus size={13} /> Add community</button>
        </Group>

        <Group title="Production stats" sub="The numbers that prove your track record — shown as a stats band on your site. E.g. $48M / Sold in 2025, 120+ / Homes sold, 15 / Years experience.">
          {stats.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input defaultValue={s.value} onChange={e => updRow(setStats, stats, i, "value", e.target.value)} placeholder="$48M" style={{ ...inStyle, maxWidth: 140 }} />
              <input defaultValue={s.label} onChange={e => updRow(setStats, stats, i, "label", e.target.value)} placeholder="Sold in 2025" style={{ ...inStyle, flex: 1 }} />
              <button onClick={() => setStats(stats.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Remove</button>
            </div>
          ))}
          {stats.length < 4 && (
            <button onClick={() => setStats([...stats, { value: "", label: "" }])} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 16px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.text, fontSize:12, fontWeight:700, letterSpacing:"0.04em", cursor:"pointer", marginTop:4 }}><Plus size={13} /> Add stat</button>
          )}
        </Group>

        <Group title="Testimonials" sub="Client quotes. Two or three strong ones beat ten weak ones.">
          {testimonials.map((t, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <textarea defaultValue={t.quote} onChange={e => updRow(setTestimonials, testimonials, i, "quote", e.target.value)} rows={3} placeholder="What the client said…" style={{ ...inStyle, resize: "vertical", marginBottom: 8 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input defaultValue={t.name} onChange={e => updRow(setTestimonials, testimonials, i, "name", e.target.value)} placeholder="Client name" style={inStyle} />
                <input defaultValue={t.detail} onChange={e => updRow(setTestimonials, testimonials, i, "detail", e.target.value)} placeholder="Sold in Carolina Forest" style={inStyle} />
              </div>
              <button onClick={() => setTestimonials(testimonials.filter((_, idx) => idx !== i))} style={{ marginTop: 8, background: "none", border: "none", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
          ))}
          <button onClick={() => setTestimonials([...testimonials, { quote: "", name: "", detail: "" }])} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 16px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.text, fontSize:12, fontWeight:700, letterSpacing:"0.04em", cursor:"pointer", marginTop:4 }}><Plus size={13} /> Add testimonial</button>
        </Group>

        <Group title="Sold portfolio" sub="Recent sales that show your range. Price + photo is enough.">
          {solds.map((L, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
                <input defaultValue={L.price} onChange={e => updRow(setSolds, solds, i, "price", e.target.value)} placeholder="$1,150,000" style={inStyle} />
                <input defaultValue={L.address} onChange={e => updRow(setSolds, solds, i, "address", e.target.value)} placeholder="Address or community" style={inStyle} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input defaultValue={L.image} onChange={e => updRow(setSolds, solds, i, "image", e.target.value)} placeholder="Photo URL or upload" style={{ ...inStyle, flex: 1 }} />
                <UploadBtn onUrl={(url) => setSolds(prev => prev.map((row, idx) => idx === i ? { ...row, image: url } : row))} />
              </div>
              <button onClick={() => setSolds(solds.filter((_, idx) => idx !== i))} style={{ marginTop: 8, background: "none", border: "none", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>Remove</button>
            </div>
          ))}
          <button onClick={() => setSolds([...solds, { price: "", address: "", image: "" }])} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 16px", borderRadius:6, border:`1px solid ${C.border}`, background:"transparent", color:C.text, fontSize:12, fontWeight:700, letterSpacing:"0.04em", cursor:"pointer", marginTop:4 }}><Plus size={13} /> Add sold property</button>
        </Group>

        {isPlatformAdmin ? (
        <>
        <Group title="Brand colors" sub="Hex values, e.g. #1d6b63. Leave defaults if unsure.">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
            <div><label style={lblStyle}>Accent (buttons, links)</label><input ref={setR("col_accent")} defaultValue={colors.accent || "#1d6b63"} style={inStyle} /></div>
            <div><label style={lblStyle}>Accent (darker, hover)</label><input ref={setR("col_accent_deep")} defaultValue={colors.accent_deep || "#0f4a44"} style={inStyle} /></div>
            <div><label style={lblStyle}>Ink (main text)</label><input ref={setR("col_ink")} defaultValue={colors.ink || "#10261f"} style={inStyle} /></div>
            <div><label style={lblStyle}>Ink (soft text)</label><input ref={setR("col_ink_soft")} defaultValue={colors.ink_soft || "#3a4f47"} style={inStyle} /></div>
            <div><label style={lblStyle}>Gold (footer accent)</label><input ref={setR("col_gold")} defaultValue={colors.gold || "#b8893f"} style={inStyle} /></div>
          </div>
        </Group>

        <Group title="SEO" sub="How your site appears in Google and when shared.">
          <Text k="seo_title" label="Page title" ph="Your Name | Area Real Estate" />
          <Text k="seo_description" label="Meta description" ph="One sentence describing your service and area." />
          <ImgText k="og_image" label="Social share image" ph="https://… or upload" />
          <Text k="city" label="City" ph="Your city" />
          <Text k="region" label="State" ph="ST" />
          <Text k="areas_served" label="Areas served (comma-separated)" ph="Your areas, comma-separated" />
        </Group>

        <Group title="Custom domain" sub="The client's own domain. After saving, add it to the triskope-sites Vercel project and have the client point DNS.">
          <div style={{ marginBottom: 14 }}>
            <label style={lblStyle}>Your domain</label>
            <input ref={setR("custom_domain")} defaultValue={org?.custom_domain || ""} placeholder="yourname.com" style={inStyle} />
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>
            At your domain registrar, add these DNS records:
            <div style={{ fontFamily: "monospace", fontSize: 12.5, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", margin: "8px 0" }}>
              A&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;@&nbsp;&nbsp;&nbsp;&nbsp;76.76.21.21<br />
              CNAME&nbsp;&nbsp;www&nbsp;&nbsp;cname.vercel-dns.com
            </div>
            Your site stays available at {org?.slug ? `${org.slug}.triskope.ai` : "your triskope.ai address"} either way.
          </div>
        </Group>
        </>
        ) : (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Brand, SEO &amp; domain</h3>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0, lineHeight: 1.7 }}>
            Your brand colors, search-engine settings, and domain are managed by Triskope
            so your site stays polished and ranks well. Want something changed? Reach out
            and we'll handle it.
          </p>
        </Card>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    );
  };

  const ConnectSiteView = () => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ddsqyvcaissqavivyhlv.supabase.co";
    const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
    const slug = org?.slug || "your-org-slug";
    const endpoint = `${SUPABASE_URL}/functions/v1/lead-capture`;
    const [copied, setCopied] = useState("");

    const snippet = `<!-- Triskope lead form — paste into the agent's site -->
<form onsubmit="return triskopeSubmit(event)">
  <input type="text" name="website" style="position:absolute;left:-9999px" tabindex="-1" autocomplete="off" />
  <input type="text"  name="name"    placeholder="Your name"     required />
  <input type="email" name="email"   placeholder="you@email.com"  required />
  <input type="tel"   name="phone"   placeholder="(843) 555-0100" />
  <textarea name="message" placeholder="What are you looking for?"></textarea>
  <label><input type="checkbox" name="consent_email" checked /> It's OK to email me. I can unsubscribe anytime.</label>
  <button type="submit">Get started</button>
  <p class="triskope-msg" style="display:none"></p>
</form>

<script>
async function triskopeSubmit(e){
  e.preventDefault();
  var f = e.target, d = new FormData(f);
  var msg = f.querySelector('.triskope-msg');
  if ((d.get('website')||'').trim() !== '') { f.reset(); return false; } // honeypot
  var payload = {
    org_slug: "${slug}",
    name: (d.get('name')||'').trim(),
    email: (d.get('email')||'').trim(),
    phone: (d.get('phone')||'').trim(),
    message: (d.get('message')||'').trim(),
    consent_email: d.get('consent_email') === 'on',
    consent_sms: false,
    source: "website",
    page_url: location.href,
    website: ""
  };
  try{
    var res = await fetch("${endpoint}", {
      method:"POST",
      headers:{ "content-type":"application/json", "apikey":"${ANON}", "authorization":"Bearer ${ANON}" },
      body: JSON.stringify(payload)
    });
    var out = await res.json();
    msg.style.display='block';
    msg.textContent = (res.ok && out.ok !== false) ? "Thanks! I'll be in touch shortly." : (out.error || "Something went wrong.");
    if (res.ok && out.ok !== false) f.reset();
  }catch(err){ msg.style.display='block'; msg.textContent="Network issue — please try again."; }
  return false;
}
</script>`;

    const copy = (text, which) => {
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(which); setTimeout(() => setCopied(""), 1800);
      });
    };

    const CopyBtn = ({ text, which, label }) => (
      <button onClick={() => copy(text, which)} style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
        background: copied === which ? C.green + "22" : C.gold, color: copied === which ? C.green : "#fff",
        border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer",
      }}>
        {copied === which ? <><Check size={13} /> Copied</> : <><Copy size={13} /> {label || "Copy"}</>}
      </button>
    );

    const Field = ({ label, value, which }) => (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textDim, marginBottom: 6 }}>{label}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <code style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontSize: 13, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, overflow: "auto", whiteSpace: "nowrap" }}>{value}</code>
          <CopyBtn text={value} which={which} />
        </div>
      </div>
    );

    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Connect your site</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Capture leads from your website straight into this CRM — scored and ready to work.</p>
          </div>
        </div>

        {!org && (
          <Card style={{ marginBottom: 16, background: C.gold + "0c", border: `1px solid ${C.gold}33` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={16} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>Loading your workspace details… if this persists, your account may not be linked to an organization yet.</div>
            </div>
          </Card>
        )}

        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Your connection details</h3>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 18px" }}>These identify your workspace. The form snippet below already includes them.</p>
          <Field label="Your workspace" value={org?.name || "—"} which="name" />
          <Field label="Org slug (links leads to you)" value={slug} which="slug" />
          <Field label="Lead capture endpoint" value={endpoint} which="endpoint" />
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Paste-ready form snippet</h3>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Drop this into any web page. It's pre-filled with your details — no editing needed.</p>
            </div>
            <CopyBtn text={snippet} which="snippet" label="Copy snippet" />
          </div>
          <pre style={{ background: "#0f1419", color: "#c8d3de", borderRadius: 10, padding: 16, overflow: "auto", fontSize: 12, lineHeight: 1.5, maxHeight: 320, margin: 0, fontFamily: "monospace" }}>{snippet}</pre>
        </Card>

        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 14px" }}>How to connect</h3>
          {[
            "Copy the form snippet above.",
            "Paste it into your website where you want the contact form — your homepage, a landing page, or a 'Contact' section.",
            "Save and publish your site. That's it — the form is now live.",
            "Test it: submit the form with your own email. Within a moment, the lead appears here in Leads, automatically scored.",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: C.gold, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, paddingTop: 2 }}>{step}</div>
            </div>
          ))}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
            Want a full branded website instead of just a form? We can build you one with this capture already wired in — ask your Triskope contact.
          </div>
        </Card>
      </div>
    );
  };

  const IdxFeedsView = () => {
    const [conns, setConns] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const blank = { vendor: "ihomefinder", format: "reso_web_api", label: "", feed_url: "", login_id: "", secret_ref: "", markets: "" };
    const [draft, setDraft] = useState(blank);
    const idxRef = useRef({});

    const loadConns = async () => {
      if (!org?.id) { setConns([]); return; }
      const { data } = await supabase
        .from("idx_connections")
        .select("id, vendor, format, label, feed_url, login_id, markets, status, last_sync_at, last_error, listings_count, created_at")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false });
      setConns(data || []);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { loadConns(); }, [org?.id]);

    const saveConn = async () => {
      setSaving(true);
      if (!org?.id) { setSaving(false); setToast({ message: "No workspace found.", kind: "error" }); return; }
      const payload = {
        org_id: org.id,
        vendor: draft.vendor,
        format: draft.format,
        label: (idxRef.current.label?.value || "").trim() || `${draft.vendor} feed`,
        feed_url: (idxRef.current.feed_url?.value || "").trim() || null,
        login_id: (idxRef.current.login_id?.value || "").trim() || null,
        secret_ref: (idxRef.current.secret_ref?.value || "").trim() || null,
        markets: (idxRef.current.markets?.value || "").trim() ? idxRef.current.markets.value.split(",").map(x => x.trim()).filter(Boolean) : null,
        status: "pending",
      };
      const { error } = await supabase.from("idx_connections").insert(payload);
      setSaving(false);
      if (error) { setToast({ message: "Couldn't save: " + error.message, kind: "error" }); return; }
      setShowAdd(false); setDraft(blank); loadConns();
      setToast({ message: "IDX connection saved", kind: "success" });
    };

    const removeConn = async (id) => {
      await supabase.from("idx_connections").delete().eq("id", id);
      loadConns();
      setToast({ message: "Connection removed", kind: "success" });
    };

    const [syncing, setSyncing] = useState(false);
    const syncNow = async () => {
      setSyncing(true);
      if (!org?.id) { setSyncing(false); setToast({ message: "No workspace found.", kind: "error" }); return; }
      const { data, error } = await supabase.functions.invoke("idx-sync", { body: { org_id: org.id } });
      setSyncing(false);
      let detail = data?.error || error?.message;
      if (error?.context && typeof error.context.json === "function") {
        try { const b = await error.context.json(); if (b?.error) detail = b.error; } catch { /* keep */ }
      }
      if (error || data?.error) { setToast({ message: detail || "Sync failed.", kind: "error" }); return; }
      setToast({ message: `Synced ${data.count ?? 0} listings.`, kind: "success" });
    };

    const statusColor = (s) => s === "connected" ? C.green : s === "error" ? C.red : s === "disabled" ? C.textDim : C.amber;
    const fld = { width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none", marginTop: 4 };
    const lbl = { fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: "0.04em" };

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, lineHeight: 1.1 }}>IDX Feeds</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Attach an agent's IDX/MLS feed. Listings sync into the app once a feed is connected.</p>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={syncNow} disabled={syncing} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 18px", borderRadius: 6,
                border: `1px solid ${C.border}`, background: C.bgCard, color: C.text,
                fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer",
                minHeight: 44, opacity: syncing ? 0.6 : 1,
              }}>
                {syncing ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={15} />}
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <button onClick={() => setShowAdd(true)} style={btnPrimary()}><Plus size={16} /> Attach a feed</button>
            </div>
          )}
        </div>

        <Card style={{ marginBottom: 16, background: C.gold + "0c", border: `1px solid ${C.gold}33` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertCircle size={16} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
              For security, the feed's password or API key is <strong style={{ color: C.text }}>not</strong> entered here. Save the connection, then store the secret on the server under the name you put in "Secret reference." The sync runs server-side and reads it by that name.
            </div>
          </div>
        </Card>

        {conns === null ? (
          <Card><div style={{ color: C.textMuted, fontSize: 13 }}>Loading feeds…</div></Card>
        ) : conns.length === 0 ? (
          <Card><div style={{ color: C.textMuted, fontSize: 14, textAlign: "center", padding: 24 }}>
            No IDX feeds attached yet. Click "Attach a feed" to connect an agent's IDX.
          </div></Card>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {conns.map(c => (
              <Card key={c.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{c.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: statusColor(c.status), background: statusColor(c.status) + "1a", padding: "2px 8px", borderRadius: 5 }}>{c.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                      {c.vendor} · {c.format}{c.markets?.length ? ` · ${c.markets.join(", ")}` : ""}
                    </div>
                    {c.feed_url && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.feed_url}</div>}
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                      {c.listings_count || 0} listings · {c.last_sync_at ? `synced ${timeAgo(c.last_sync_at)}` : "never synced"}
                    </div>
                    {c.last_error && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Last error: {c.last_error}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={async () => {
                      setToast({ message: "Syncing…", kind: "info" });
                      const { data, error } = await supabase.functions.invoke("idx-sync", { body: { connection_id: c.id, limit: 100 } });
                      if (error || data?.error) { setToast({ message: data?.error || error.message, kind: "error" }); }
                      else { setToast({ message: `Synced ${data.upserted} listings`, kind: "success" }); }
                      loadConns();
                    }} style={{ background: C.gold, border: "none", color: "#fff", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Sync now</button>
                    <button onClick={() => removeConn(c.id)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>Remove</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {showAdd && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowAdd(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontFamily: SERIF_FONT, fontSize: 24, fontWeight: 500, color: C.text, margin: "0 0 16px" }}>Attach an IDX feed</h3>

              <div style={{ marginBottom: 12 }}>
                <div style={lbl}>Vendor</div>
                <select value={draft.vendor} onChange={e => setDraft({ ...draft, vendor: e.target.value })} style={fld}>
                  <option value="ihomefinder">iHomefinder</option>
                  <option value="idx_broker">IDX Broker</option>
                  <option value="realtyna">Realtyna</option>
                  <option value="reso_web_api">RESO Web API (direct)</option>
                  <option value="rets">RETS</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={lbl}>Feed format</div>
                <select value={draft.format} onChange={e => setDraft({ ...draft, format: e.target.value })} style={fld}>
                  <option value="reso_web_api">RESO Web API (JSON)</option>
                  <option value="rets">RETS</option>
                  <option value="widget">Display widget / embed only</option>
                  <option value="unknown">Not sure yet</option>
                </select>
                {draft.format === "widget" && (
                  <div style={{ fontSize: 11, color: C.amber, marginTop: 6, lineHeight: 1.5 }}>
                    Widget/embed feeds display listings on the agent's own site and often don't allow pulling raw data into another app. We may only be able to embed it, not sync listings. Worth confirming with the vendor.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={lbl}>Label</div>
                <input ref={el => idxRef.current.label = el} defaultValue="" placeholder="e.g. My MLS feed — CCAR IDX" style={fld} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={lbl}>Feed URL {draft.format === "widget" ? "(embed URL)" : "(API / RETS base URL)"}</div>
                <input ref={el => idxRef.current.feed_url = el} defaultValue="" placeholder="https://…" style={fld} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={lbl}>Login / Client ID (not the secret)</div>
                <input ref={el => idxRef.current.login_id = el} defaultValue="" placeholder="API client id or RETS username" style={fld} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={lbl}>Secret reference (name only)</div>
                <input ref={el => idxRef.current.secret_ref = el} defaultValue="" placeholder="e.g. IDX_FEED_KEY" style={fld} />
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>The actual key is stored server-side under this name, never here.</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={lbl}>Markets (comma-separated)</div>
                <input ref={el => idxRef.current.markets = el} defaultValue="" placeholder="Myrtle Beach, Carolina Forest" style={fld} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "11px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={saveConn} disabled={saving} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: C.gold, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save connection"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ----- TEAM (owner-only: invite teammates as Agent / Team Lead) -----
  const TeamView = () => {
    const [members, setMembers] = useState(null);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("agent");
    const [inviting, setInviting] = useState(false);

    const loadMembers = async () => {
      if (!org?.id) { setMembers([]); return; }
      const { data, error } = await supabase.functions.invoke("team-members", { body: { org_id: org.id } });
      if (error || data?.error) { setToast({ message: "Couldn't load team: " + (data?.error || error?.message), kind: "error" }); setMembers([]); return; }
      setMembers(data.members || []);
    };
    useEffect(() => { loadMembers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [org?.id]);

    const submitInvite = async () => {
      const email = inviteEmail.trim().toLowerCase();
      if (!email || !org?.id) return;
      setInviting(true);
      const { data, error } = await supabase.functions.invoke("team-invite", { body: { org_id: org.id, email, role: inviteRole } });
      setInviting(false);
      if (error || data?.error) {
        let detail = data?.error || error?.message || "Something went wrong.";
        try { if (error?.context && typeof error.context.json === "function") { const b = await error.context.json(); if (b?.error) detail = b.error; } } catch { /* keep detail */ }
        setToast({ message: "Invite failed: " + detail, kind: "error" });
        return;
      }
      setInviteEmail(""); setInviteRole("agent");
      setToast({ message: data.mode === "added_existing_user" ? "Added to the team." : "Invite sent — they'll get an email to set up.", kind: "success" });
      loadMembers();
    };

    const roleLabel = (r) => r === "owner" ? "Owner" : r === "team_lead" ? "Team Lead" : "Agent";
    const roleColor = (r) => r === "owner" ? C.gold : r === "team_lead" ? C.teal : C.textMuted;
    const inputStyle = { width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };
    const lbl = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, marginBottom: 6 };

    return (
      <div>
        <div style={pageHeader(isMobile)}>
          <div>
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: isMobile ? 28 : 36, fontWeight: 500, color: C.text, margin: 0, letterSpacing: "0.01em", lineHeight: 1.1 }}>Team</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "4px 0 0" }}>Invite teammates to {org?.name ?? "this workspace"} and set their access.</p>
          </div>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 16px" }}>Invite a teammate</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 240px" }}>
              <label style={lbl}>Email</label>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitInvite(); }} placeholder="teammate@email.com" style={inputStyle} />
            </div>
            <div style={{ flex: "0 1 180px" }}>
              <label style={lbl}>Access</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={inputStyle}>
                <option value="agent">Agent</option>
                <option value="team_lead">Team Lead</option>
              </select>
            </div>
            <button onClick={submitInvite} disabled={!inviteEmail.trim() || inviting} style={{ ...btnPrimary(), opacity: (!inviteEmail.trim() || inviting) ? 0.6 : 1 }}>
              {inviting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={14} />}
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: C.textMuted, margin: "12px 0 0", lineHeight: 1.6 }}>
            <strong style={{ color: C.text }}>Agent</strong> works their own leads. <strong style={{ color: C.text }}>Team Lead</strong> can also assign leads to agents, run the round-robin, and delete leads. Only owners can invite.
          </p>
        </Card>

        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Members</h3>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 14px" }}>Everyone in {org?.name ?? "this workspace"}.</p>
          {members === null ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>Loading…</div>
          ) : members.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>No members yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m) => (
                <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  <Avatar name={m.email} size={34} color={roleColor(m.role)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: roleColor(m.role), border: `1px solid ${roleColor(m.role)}44`, background: roleColor(m.role) + "14", borderRadius: 6, padding: "3px 8px" }}>{roleLabel(m.role)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // Upgrade screen shown in place of a locked paid feature.
  const UpgradeGate = ({ title, feature, blurb }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Card style={{ maxWidth: 480, textAlign: "center", padding: 36 }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 12, background: C.gold + "1a", color: C.gold, marginBottom: 16 }}>
          <Lock size={22} />
        </div>
        <h2 style={{ fontFamily: SERIF_FONT, fontSize: 28, fontWeight: 500, color: C.text, margin: "0 0 8px" }}>{title}</h2>
        <p style={{ fontSize: 14.5, color: C.textMuted, lineHeight: 1.7, margin: "0 0 8px" }}>{blurb}</p>
        <p style={{ fontSize: 14.5, color: C.text, fontWeight: 600, margin: "0 0 20px" }}>
          Included in the {FEATURE_PLANS[feature] || "Growth"} plan.
        </p>
        <a href={`mailto:team@triskope.ai?subject=Upgrade my Triskope plan (${org?.name || ""})`} style={{ ...btnPrimary(), textDecoration: "none", display: "inline-flex" }}>
          Upgrade my plan
        </a>
        <p style={{ fontSize: 12.5, color: C.textDim, marginTop: 14 }}>
          Or reply to your Triskope contact and we'll switch it on for you.
        </p>
      </Card>
    </div>
  );

  const renderView = () => {
    // Suspended workspace: hard lock for subscribers (platform admins pass    // through so they can still service the account). Server-side, the org's
    // public site and lead capture are already dark.
    if (org?.billing_status === "suspended" && !isPlatformAdmin) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <Card style={{ maxWidth: 460, textAlign: "center", padding: 36 }}>
            <h2 style={{ fontFamily: SERIF_FONT, fontSize: 28, fontWeight: 500, color: C.text, margin: "0 0 10px" }}>Account paused</h2>
            <p style={{ fontSize: 14.5, color: C.textMuted, lineHeight: 1.7, margin: 0 }}>
              This workspace is temporarily paused. Your leads and website content are
              safe and nothing has been deleted. Please contact Triskope at
              team@triskope.ai to restore access.
            </p>
          </Card>
        </div>
      );
    }
    switch (view) {
      case "inbox": return <InboxView />;
      case "leads": return <LeadsView />;
      case "pipeline": return <PipelineView />;
      case "tasks": return <TasksView />;
      case "listings": return <ListingsView />;
      case "sitetools": return <SiteToolsView />;
      case "idx": return <IdxFeedsView />;
      case "connect": return <ConnectSiteView />;
      case "website": return <MyWebsiteView />;
      case "siteadmin": return isPlatformAdmin ? <SiteAdminView /> : <Dashboard />;
      case "emailbrand": return <EmailBrandingView />;
      case "addagent": return isPlatformAdmin ? <AddAgentView /> : <Dashboard />;
      case "reports": return featureLocked("market_reports")
        ? <UpgradeGate title="Market Reports" feature="market_reports" blurb="Branded community market reports your leads actually open — a proven listing-appointment driver." />
        : <ReportsView />;
      case "communities": return featureLocked("communities")
        ? <UpgradeGate title="Community Pages" feature="communities" blurb="Dedicated neighborhood pages with buyer guides that capture and route local leads to you." />
        : <CommunitiesView />;
      case "preview": return <SitePreviewView />;
      case "agents": return <AgentsView />;
      case "team": return <TeamView />;
      case "assistant": return featureLocked("ai_assistant")
        ? <UpgradeGate title="AI Assistant" feature="ai_assistant" blurb="Lead scoring, drafted follow-ups, and pipeline insights powered by AI — like a full-time assistant on your team." />
        : <AssistantView />;
      case "ai": return featureLocked("ai_assistant")
        ? <UpgradeGate title="AI Tools" feature="ai_assistant" blurb="AI-powered lead scoring and content tools." />
        : <AIView />;
      case "billing": return <PlansView />;
      default: return <Dashboard />;
    }
  };

  // Inline style helpers (closures over C/isMobile)
  function btnPrimary() {
    return {
      display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 6,
      border: "none", background: C.gold,
      color: "#ffffff", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
      cursor: "pointer",
      minHeight: 44, transition: "background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
      boxShadow: "0 2px 0 rgba(0,0,0,0.05)",
    };
  }
  function cardTitle() {
    return { fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 16px" };
  }
  function pageHeader(mob) {
    return {
      display: "flex", justifyContent: "space-between",
      alignItems: mob ? "flex-start" : "center",
      marginBottom: 24, flexDirection: mob ? "column" : "row",
      gap: mob ? 12 : 0,
    };
  }
  function gridCols(mob, minW) {
    return { display: "grid", gridTemplateColumns: mob ? "1fr" : `repeat(auto-fill, minmax(${minW}px, 1fr))`, gap: 16 };
  }
  function urlBadge() {
    return {
      display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
      background: C.bg, borderRadius: 6, marginBottom: 12, fontSize: 11,
      color: C.teal, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    };
  }
  function quickAction(color) {
    return {
      display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px",
      borderRadius: 8, border: `1px solid ${color}40`,
      background: color + "12", color, fontSize: 13, fontWeight: 600,
      textDecoration: "none", cursor: "pointer", minHeight: 44,
      transition: "background 0.15s ease",
    };
  }
  function selectStyle() {
    return {
      padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
      minHeight: 44, cursor: "pointer", appearance: "none",
      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 10px center",
      paddingRight: 32,
    };
  }
  function priceInputStyle() {
    return {
      width: "100%", padding: "10px 10px", background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 8, color: C.text, fontSize: 12, outline: "none", minHeight: 44,
    };
  }

  const currentPhases = aiType ? (THINKING_PHASES[aiType] || THINKING_PHASES["market-report"]) : [];

  // -------- AUTH GATE --------
  const SetPasswordScreen = ({ onDone }) => {
    const pwRef = useRef(null);
    const pw2Ref = useRef(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [exchanging, setExchanging] = useState(true);

    // On mount, make sure we have a session from the invite link. Supabase links
    // come in a few formats; exchange whichever is present for a session so that
    // updateUser({password}) below will succeed.
    useEffect(() => {
      (async () => {
        try {
          // Already have a session? (older hash links auto-establish one)
          const { data: s0 } = await supabase.auth.getSession();
          if (s0?.session) { setExchanging(false); return; }

          const search = window.location.search || "";
          const hash = window.location.hash || "";
          const qp = new URLSearchParams(search);
          const hp = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

          // PKCE: ?code=...
          const code = qp.get("code");
          if (code) { await supabase.auth.exchangeCodeForSession(code); setExchanging(false); return; }

          // OTP/verify: ?token_hash=...&type=invite (or recovery)
          const token_hash = qp.get("token_hash") || hp.get("token_hash");
          const type = qp.get("type") || hp.get("type");
          if (token_hash && type) { await supabase.auth.verifyOtp({ token_hash, type }); setExchanging(false); return; }

          // Hash tokens: #access_token=...&refresh_token=...
          const access_token = hp.get("access_token");
          const refresh_token = hp.get("refresh_token");
          if (access_token && refresh_token) { await supabase.auth.setSession({ access_token, refresh_token }); setExchanging(false); return; }
        } catch (e) {
          setErr("This invite link may have expired. Ask for a fresh invite if setting a password fails.");
        }
        setExchanging(false);
      })();
    }, []);

    const submit = async () => {
      setErr("");
      const pw = pwRef.current?.value || "";
      const pw2 = pw2Ref.current?.value || "";
      if (pw.length < 8) { setErr("Use at least 8 characters."); return; }
      if (pw !== pw2) { setErr("Passwords don't match."); return; }
      setBusy(true);
      const { error } = await supabase.auth.updateUser({ password: pw });
      setBusy(false);
      if (error) { setErr(error.message.includes("session") ? "This invite link has expired. Please ask for a fresh invite." : error.message); return; }
      onDone();
    };

    const fld = { width: "100%", padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 15, outline: "none", fontFamily: "inherit", marginBottom: 12 };

    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "-apple-system, system-ui, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 420, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
            <TriskopeLogo size={44} />
            <h1 style={{ fontFamily: SERIF_FONT, fontSize: 26, fontWeight: 500, color: C.text, margin: "16px 0 4px" }}>Welcome to Triskope</h1>
            <p style={{ fontSize: 14, color: C.textMuted, textAlign: "center", margin: 0 }}>Set a password to finish setting up your account. You'll use it to sign in from now on.</p>
          </div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, marginBottom: 6 }}>New password</label>
          <input ref={pwRef} type="password" placeholder="At least 8 characters" style={fld} />
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textDim, marginBottom: 6 }}>Confirm password</label>
          <input ref={pw2Ref} type="password" placeholder="Re-enter password" style={fld} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          {err && <div style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{err}</div>}
          <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {busy && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            {busy ? "Saving…" : "Set password & continue"}
          </button>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, color: C.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12,
        fontFamily: "-apple-system, system-ui, sans-serif",
      }}>
        <TriskopeLogo size={48} />
        <Loader2 size={20} color={C.teal} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (needsPassword) return <SetPasswordScreen onDone={() => { setNeedsPassword(false); window.location.hash = ""; window.history.replaceState(null, "", window.location.pathname); }} />;
  if (!session) return <Auth />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system, system-ui, sans-serif" }}>
      <style>{`
        @keyframes tk-toast { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes tk-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes tk-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes tk-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardLand { 0% { opacity: 0; transform: translateY(-8px) scale(0.96); } 60% { transform: translateY(2px) scale(1.01); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .tk-cursor { display: inline-block; width: 8px; height: 14px; background: ${C.teal}; vertical-align: middle; margin-left: 2px; animation: tk-pulse 0.9s ease-in-out infinite; }
        .tk-view { animation: tk-fade 0.25s ease; }
        .tk-rise { animation: tk-rise 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        .tk-stagger > * { animation: tk-rise 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        .tk-stagger > *:nth-child(1) { animation-delay: 0ms; }
        .tk-stagger > *:nth-child(2) { animation-delay: 60ms; }
        .tk-stagger > *:nth-child(3) { animation-delay: 120ms; }
        .tk-stagger > *:nth-child(4) { animation-delay: 180ms; }
        .tk-stagger > *:nth-child(5) { animation-delay: 240ms; }
        .tk-stagger > *:nth-child(6) { animation-delay: 300ms; }
        button:focus-visible, a:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 2px; }

        /* Print: only the AI document prints. Everything else is hidden. */
        @media print {
          @page { margin: 0.4in; }
          html, body { background: #ffffff !important; }
          body * { visibility: hidden !important; }
          .tk-print, .tk-print * { visibility: visible !important; }
          .tk-print {
            position: absolute !important;
            left: 0; top: 0;
            width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .tk-ai-backdrop {
            background: transparent !important;
            position: static !important;
          }
          .tk-ai-panel {
            background: #ffffff !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Mobile header */}
      {isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 56, background: C.bgDark,
          borderBottom: `1px solid ${C.bgDark2}`, display: "flex", alignItems: "center",
          justifyContent: "flex-start", gap: 8, padding: "0 16px", zIndex: 200,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: "none", border: "none", color: C.textInv, cursor: "pointer",
            padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
          }} aria-label="Toggle menu">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TriskopeLogo size={28} light />
            <span style={{ fontFamily: SERIF_FONT, fontSize: 19, fontWeight: 500, color: C.textInv, letterSpacing: "0.06em" }}>triskope</span>
          </div>
          <button onClick={() => { setView("inbox"); setSidebarOpen(false); }} aria-label="Notifications" style={{
            marginLeft: "auto", position: "relative", background: "none", border: "none",
            color: C.textInv, cursor: "pointer", padding: 8,
            minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Bell size={20} />
            {unreadNotifs > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 2,
                padding: "0 5px", minWidth: 16, borderRadius: 9999,
                background: C.gold, color: C.bgDark, textAlign: "center",
                fontSize: 9.5, fontWeight: 700, lineHeight: "16px",
              }}>{unreadNotifs > 99 ? "99+" : unreadNotifs}</span>
            )}
          </button>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 250,
        }} />
      )}

      {/* Sidebar — dark luxury chrome */}
      <aside style={{
        width: 240, background: C.bgDark, borderRight: `1px solid ${C.bgDark2}`,
        padding: 20, flexShrink: 0, display: "flex", flexDirection: "column",
        ...(isMobile ? {
          position: "fixed", top: 0, left: sidebarOpen ? 0 : -260, bottom: 0,
          zIndex: 300, transition: "left 0.25s ease", overflowY: "auto", paddingTop: 20,
        } : {}),
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <TriskopeLogo size={38} light />
          <div>
            <div style={{ fontFamily: SERIF_FONT, fontSize: 22, fontWeight: 500, color: C.textInv, letterSpacing: "0.04em", lineHeight: 1 }}>triskope</div>
            <div style={{ fontSize: 8, color: C.goldSoft, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 4 }}>see everything together</div>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {nav.filter(item => {
            const isOwner = org?.role === "owner";
            if (item.platformOnly && !isPlatformAdmin) return false;
            if (item.ownerOnly && !isOwner) return false;
            return true;
          }).map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            const locked = featureLocked(item.feature);
            return (
              <button key={item.id}
                onClick={() => { setView(item.id); setSelectedLead(null); setSelectedCommunity(null); setSelectedAgent(null); if (isMobile) setSidebarOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: isMobile ? "12px 12px" : "10px 12px", marginBottom: 2, borderRadius: 6, border: "none",
                  background: active ? "rgba(156,127,67,0.16)" : "transparent",
                  borderLeft: active ? `2px solid ${C.gold}` : "2px solid transparent",
                  paddingLeft: active ? (isMobile ? 10 : 10) : (isMobile ? 12 : 12),
                  color: active ? C.goldSoft : C.textInvMuted,
                  fontSize: isMobile ? 14 : 12.5,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: "0.04em",
                  cursor: "pointer", textAlign: "left",
                  minHeight: isMobile ? 48 : 40, transition: "background 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.bgDark2; e.currentTarget.style.color = C.textInv; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textInvMuted; } }}
              >
                <Icon size={isMobile ? 18 : 16} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {locked && (
                  <span title="Upgrade to unlock" style={{ display: "flex", alignItems: "center", color: C.goldSoft, opacity: 0.85 }}>
                    <Lock size={12} />
                  </span>
                )}
                {item.id === "inbox" && unreadNotifs > 0 && (
                  <span style={{
                    padding: "1px 7px", borderRadius: 9999, minWidth: 18,
                    background: C.gold, color: C.bgDark, textAlign: "center",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                  }}>{unreadNotifs > 99 ? "99+" : unreadNotifs}</span>
                )}
                {item.preview && (
                  <span style={{
                    padding: "1px 6px", borderRadius: 9999,
                    background: "rgba(194,167,110,0.16)", color: C.goldSoft,
                    fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>Preview</span>
                )}
                {item.pro && !hasAssistantAccess && !item.preview && (
                  <span style={{
                    padding: "1px 7px", borderRadius: 9999,
                    background: "rgba(194,167,110,0.16)", color: C.goldSoft,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}>Pro</span>
                )}
                {item.pro && hasAssistantAccess && demoPlan === "enterprise" && (
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: C.goldSoft }} />
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ paddingTop: 16, borderTop: `1px solid ${C.bgDark2}`, marginTop: 16 }}>
          {/* Workspace switcher */}
          {orgs.length > 1 ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.textInvMuted, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 600, marginBottom: 6 }}>Workspace</div>
              <select
                value={org?.id ?? ""}
                onChange={(e) => switchOrg(e.target.value)}
                style={{
                  width: "100%", padding: "9px 10px", borderRadius: 8,
                  background: C.bgDark2, color: C.textInv, border: `1px solid ${C.bgDark2}`,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {orgs.map(o => (
                  <option key={o.id} value={o.id} style={{ color: "#111" }}>{o.name}</option>
                ))}
              </select>
            </div>
          ) : org ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.textInvMuted, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 600, marginBottom: 4 }}>Workspace</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textInv, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</div>
            </div>
          ) : null}
          {/* User block */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 8px", borderRadius: 8,
            background: C.bgDark2, border: `1px solid ${C.bgDark2}`, marginBottom: 12,
          }}>
            <Avatar name={profile?.display_name || session?.user?.email || "user"} size={32} color={C.gold} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textInv, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.display_name || (session?.user?.email || "").split("@")[0]}
              </div>
              <div style={{ fontSize: 9, color: C.goldSoft, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 600 }}>
                {org?.role || profile?.role || "agent"}
              </div>
            </div>
            <button onClick={signOut} title="Sign out" style={{
              background: "none", border: "none", padding: 6, cursor: "pointer",
              color: C.textInvMuted, display: "flex", alignItems: "center", borderRadius: 6,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(185,64,74,0.18)"; e.currentTarget.style.color = "#f0a4a8"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textInvMuted; }}>
              <LogOut size={14} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9, color: C.goldSoft, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            <TriskopeLogo size={18} light />
            <span>est. 2026 · grand strand</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: isMobile ? "72px 16px 24px" : 32, overflow: "auto", minWidth: 0 }}>
        <div key={view + (selectedLead?.id || "")} className="tk-view">
          {(nav.find(n => n.id === view)?.preview || (view === "listings" && idxListings.length === 0)) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(194,167,110,0.10)", border: `1px solid ${C.gold}33`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            }}>
              <Sparkles size={15} color={C.gold} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
                {view === "listings"
                  ? <><strong style={{ color: C.text }}>Sample listings</strong> — attach an IDX feed (IDX Feeds in the sidebar) to show your real MLS listings here.</>
                  : <><strong style={{ color: C.text }}>Preview</strong> — this screen shows sample data to illustrate the feature. It isn't connected to your live data yet.</>}
              </span>
            </div>
          )}
          {renderView()}
        </div>
      </main>

      {/* AI Panel */}
      {aiOpen && (
        <div onClick={() => setAiOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "flex-end", zIndex: 400 }} className="tk-ai-backdrop">
          <div onClick={e => e.stopPropagation()} style={{
            width: isMobile ? "100%" : (typeof aiOut === "object" ? 760 : 520), maxWidth: "100%",
            background: C.bgCard, borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
            padding: isMobile ? 16 : 24, overflow: "auto",
            display: "flex", flexDirection: "column",
          }} className="tk-ai-panel">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Brain size={20} color={C.teal} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>
                  {aiType === "market-report" && "Market Report Generator"}
                  {aiType === "listing-desc" && "Listing Description Writer"}
                  {aiType === "email-campaign" && "Email Campaign Builder"}
                  {aiType === "lead-score" && "Lead Score Analysis"}
                </h2>
                <div style={{ fontSize: 11, color: C.textDim }}>
                  {aiType === "lead-score" && aiCtx?.name ? `Context: ${aiCtx.name}` :
                   aiCtx?.title ? `Context: ${aiCtx.title}` : "Demo output"}
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 20, padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Close panel">×</button>
            </div>

            {aiBusy ? (
              <div style={{ padding: "20px 0", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, color: C.teal }}>
                  <Sparkles size={18} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Thinking...</span>
                </div>
                {currentPhases.map((p, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    fontSize: 13, color: i < aiPhase ? C.text : i === aiPhase ? C.teal : C.textDim,
                    transition: "color 0.2s ease",
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: i < aiPhase ? C.teal : "transparent",
                      border: `1.5px solid ${i <= aiPhase ? C.teal : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {i < aiPhase && <Check size={10} color="#0a0a14" />}
                      {i === aiPhase && <div style={{ width: 6, height: 6, borderRadius: 3, background: C.teal, animation: "tk-pulse 0.8s ease-in-out infinite" }} />}
                    </div>
                    {p}
                  </div>
                ))}
              </div>
            ) : typeof aiOut === "object" && aiOut?.kind ? (
              <>
                <div className="tk-rise" style={{ flex: 1 }}>
                  <DocRenderer data={aiOut} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button onClick={printAI} style={{ ...aiActionBtn(false), background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, border: "none", color: "#0a0a14", fontWeight: 700 }}>
                    <FileText size={14} /> Print / Save PDF
                  </button>
                  <button onClick={copyAI} style={aiActionBtn(false)}>
                    <Copy size={14} /> Copy text
                  </button>
                  <button onClick={regenerateAI} style={aiActionBtn(false)}>
                    <RefreshCw size={14} /> Regenerate
                  </button>
                  <button onClick={() => { setToast({ message: "Saved to drafts", kind: "success" }); }} style={aiActionBtn(false)}>
                    <Check size={14} /> Save
                  </button>
                </div>
              </>
            ) : (
              <>
                <div onClick={skipStreaming}
                     style={{
                       background: C.bgCard, padding: 20, borderRadius: 12,
                       border: `1px solid ${C.border}`, flex: 1, minHeight: 200,
                       cursor: aiStreaming ? "pointer" : "default",
                       fontFamily: "inherit",
                     }}>
                  <MarkdownText text={aiStreamed || aiOut} />
                  {aiStreaming && <span className="tk-cursor" />}
                </div>
                {aiStreaming && (
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 6, textAlign: "right" }}>
                    Click output to skip streaming
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button onClick={copyAI} disabled={aiStreaming} style={aiActionBtn(aiStreaming)}>
                    <Copy size={14} /> Copy
                  </button>
                  <button onClick={regenerateAI} style={aiActionBtn(false)}>
                    <RefreshCw size={14} /> Regenerate
                  </button>
                  <button onClick={() => { setToast({ message: "Saved to drafts", kind: "success" }); }} disabled={aiStreaming} style={aiActionBtn(aiStreaming)}>
                    <Check size={14} /> Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ListingDetailModal />
      <AddLeadModal />
      <DeleteConfirmModal />

      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function aiActionBtn(disabled) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "10px 14px", borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
    fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1, minHeight: 44,
    transition: "background 0.15s ease, border-color 0.15s ease",
  };
}
