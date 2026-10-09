export const steps = ["Basic information", "Business & capability", "Investment capability", "Sales potential", "Your partnership"];
export const questions = [
  ["registeredBusiness", "Are you currently operating a registered business?", 1],
  ["technologySales", "Are you currently involved in IT / electronics / technology sales?", 1],
  ["laptopsTablets", "Do you currently sell laptops or tablets?", 1],
  ["refurbishedTechnology", "Do you currently sell refurbished / used technology?", 1],
  ["customerBase", "Do you have an existing customer base for technology products?", 1],
  ["storage", "Do you have a warehouse / suitable storage facility?", 1],
  ["retailLocation", "Do you have a physical retail/store location?", 1],
  ["localFulfilment", "Can you fulfil online orders locally (pick, pack & dispatch)?", 1],
  ["returnsSupport", "Can you handle customer returns and first-level support?", 1],
  ["onlineChannel", "Do you have an existing e-commerce website or online sales channel?", 1],
  ["team", "Do you have a team that can manage the Buyology business?", 1],
  ["deployInvestment", "Can you deploy the investment within 30–60 days if approved?", 2],
  ["replenishment", "Can you fund ongoing inventory replenishment?", 2],
  ["holdInventory", "Are you comfortable holding Buyology inventory locally?", 2],
  ["initialSales", "Can you sell at least 50 laptops/tablets per month initially?", 3],
  ["growthSales", "Can you target 100+ units per month as the business grows?", 3],
  ["activeMarketing", "Would you actively market Buyology through your existing channels?", 3],
  ["longTerm", "Would you be interested in becoming a long-term Buyology Stockist Partner?", 3],
  ["finalDiscussion", "If your profile meets Buyology’s requirements, are you available for a detailed business discussion followed by a final meeting and MOU discussion?", 4],
] as const;
export const investments = ["USD 25,000–50,000", "USD 50,000–75,000", "USD 75,000–100,000", "Above USD 100,000", "Investment available subject to final business plan"];
export const partnerships = [
  { value: "STOCKIST", title: "Stockist", description: "Hold inventory & fulfil Buyology online orders", number: "01" },
  { value: "STOCKIST_RETAILER", title: "Stockist + Retailer", description: "Hold inventory and sell through your retail location", number: "02" },
  { value: "STOCKIST_DISTRIBUTOR", title: "Stockist + B2B Distributor", description: "Hold inventory and supply business customers", number: "03" },
  { value: "FUTURE_TERRITORY", title: "Larger territory responsibility", description: "Interested in larger territory responsibility in the future", number: "04" },
];
export type Application = {
  name: string; company: string; cityCountry: string; phone: string; email: string; website: string;
  answers: Record<string, boolean>; investment: string; partnerships: string[];
};
export const initialApplication: Application = { name: "", company: "", cityCountry: "", phone: "", email: "", website: "", answers: {}, investment: "", partnerships: [] };
