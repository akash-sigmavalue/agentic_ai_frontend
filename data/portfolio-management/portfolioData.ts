export const sourceSections = [
  {
    "name": "1. Dashboard",
    "masterName": "Portfolio Dashboard",
    "fields": [
      ["Dashboard ID", "system"],
      ["Asset ID", "system"],
      ["Property Name", "derived"],
      ["Micromarket", "derived"],
      ["City", "derived"],
      ["Acquisition Cost (₹)", "raw"],
      ["Current Market Value (₹)", "raw"],
      ["Book Value (₹)", "derived"],
      ["Valuation Date", "derived"],
      ["Valuation Method", "derived"],
      ["Appreciation / Depreciation", "derived"],
      ["Rental Income (₹/yr)", "derived"],
      ["Occupancy Income (₹/yr)", "derived"],
      ["Other Income (₹/yr)", "raw"],
      ["Escalation Clause", "derived"],
      ["Collection Efficiency (%)", "derived"],
      ["Maintenance Cost (₹/yr)", "derived"],
      ["Property Tax (₹/yr)", "derived"],
      ["Insurance (₹/yr)", "derived"],
      ["Utilities (₹/yr)", "derived"],
      ["Repairs (₹/yr)", "derived"],
      ["Capex (₹)", "derived"],
      ["Opex (₹/yr)", "derived"],
      ["EMI (₹/month)", "derived"]
    ]
  },

  {
    "name": "2. Asset Identity",
    "masterName": "Asset Identity Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Property Name",
        "raw"
      ],
      [
        "Asset Type",
        "raw"
      ],
      [
        "Ownership Type",
        "raw"
      ],
      [
        "Address",
        "raw"
      ],
      [
        "City",
        "raw"
      ],
      [
        "Micromarket",
        "raw"
      ],
      [
        "Latitude",
        "raw"
      ],
      [
        "Longitude",
        "raw"
      ]
    ]
  },
  {
    "name": "3. Ownership & Legal",
    "masterName": "Ownership & Legal Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Owner Name",
        "raw"
      ],
      [
        "SPV/Entity",
        "raw"
      ],
      [
        "Title Status",
        "raw"
      ],
      [
        "Encumbrance Status",
        "raw"
      ],
      [
        "Legal Disputes",
        "raw"
      ],
      [
        "Approvals",
        "raw"
      ],
      [
        "Lease/Ownership Documents",
        "raw"
      ]
    ]
  },
  {
    "name": "4. Physical Details",
    "masterName": "Physical Details Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Land Area (sq ft)",
        "raw"
      ],
      [
        "Built-up Area (sq ft)",
        "raw"
      ],
      [
        "Carpet Area (sq ft)",
        "raw"
      ],
      [
        "Leasable Area (sq ft)",
        "raw"
      ],
      [
        "No. of Floors",
        "raw"
      ],
      [
        "No. of Units",
        "raw"
      ],
      [
        "Age of Property (yrs)",
        "raw"
      ],
      [
        "Condition Score",
        "raw"
      ]
    ]
  },
  {
    "name": "5. ESG Data",
    "masterName": "ESG Data Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Energy Consumption (kWh/yr)",
        "raw"
      ],
      [
        "Water Consumption (KL/yr)",
        "raw"
      ],
      [
        "Emissions (tCO2e/yr)",
        "derived"
      ],
      [
        "Waste Generated (kg/yr)",
        "raw"
      ],
      [
        "Green Certification",
        "raw"
      ],
      [
        "Climate Risk",
        "raw"
      ],
      [
        "Compliance Status",
        "derived"
      ],
      [
        "Tenant Health/Safety Score",
        "raw"
      ],
      [
        "ESG Risk Score",
        "derived"
      ]
    ]
  },
  {
    "name": "6. Financial Value",
    "masterName": "Financial Value Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Acquisition Cost (₹)",
        "raw"
      ],
      [
        "Current Market Value (₹)",
        "raw"
      ],
      [
        "Book Value (₹)",
        "raw"
      ],
      [
        "Valuation Date",
        "raw"
      ],
      [
        "Valuation Method",
        "raw"
      ],
      [
        "Appreciation/Depreciation (%)",
        "derived"
      ]
    ]
  },
  {
    "name": "7. Revenue & Income",
    "masterName": "Revenue & Income Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Rental Income (₹/yr)",
        "raw"
      ],
      [
        "Occupancy Income (₹/yr)",
        "derived"
      ],
      [
        "Other Income (₹/yr)",
        "raw"
      ],
      [
        "Total Income (₹/yr)",
        "derived"
      ],
      [
        "Escalation Clause (%)",
        "raw"
      ],
      [
        "Collection Efficiency (%)",
        "raw"
      ]
    ]
  },
  {
    "name": "8. Expenses",
    "masterName": "Expenses Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Maintenance Cost (₹/yr)",
        "raw"
      ],
      [
        "Property Tax (₹/yr)",
        "raw"
      ],
      [
        "Insurance (₹/yr)",
        "raw"
      ],
      [
        "Utilities (₹/yr)",
        "raw"
      ],
      [
        "Repairs (₹/yr)",
        "raw"
      ],
      [
        "Capex (₹/yr)",
        "raw"
      ],
      [
        "Opex (₹/yr)",
        "derived"
      ]
    ]
  },
  {
    "name": "9. Occupancy / Leasing",
    "masterName": "Occupancy / Leasing Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Occupancy (%)",
        "raw"
      ],
      [
        "Vacant Area (sq ft)",
        "derived"
      ],
      [
        "Tenant Name",
        "raw"
      ],
      [
        "Lease Start Date",
        "raw"
      ],
      [
        "Lease End Date",
        "raw"
      ],
      [
        "Lock-in Period (months)",
        "raw"
      ],
      [
        "Renewal Status",
        "raw"
      ]
    ]
  },
  {
    "name": "10. Loan / Debt",
    "masterName": "Loan / Debt Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Loan Amount (₹)",
        "raw"
      ],
      [
        "Lender",
        "raw"
      ],
      [
        "Interest Rate (%)",
        "raw"
      ],
      [
        "Loan Tenure (months)",
        "raw"
      ],
      [
        "EMI (₹/month)",
        "derived"
      ],
      [
        "Outstanding Principal (₹)",
        "raw"
      ],
      [
        "LTV (%)",
        "derived"
      ],
      [
        "DSCR",
        "derived"
      ],
      [
        "Repayment Schedule",
        "raw"
      ]
    ]
  },
  {
    "name": "11. Risk Fields",
    "masterName": "Risk Fields Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Legal Risk",
        "raw"
      ],
      [
        "Market Risk",
        "raw"
      ],
      [
        "Tenant Risk",
        "raw"
      ],
      [
        "Valuation Risk",
        "raw"
      ],
      [
        "Liquidity Risk",
        "raw"
      ],
      [
        "Regulatory Risk",
        "raw"
      ],
      [
        "Red Flag Score",
        "derived"
      ]
    ]
  },
  {
    "name": "12. Performance Metrics",
    "masterName": "Performance Metrics Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "NOI (₹/yr)",
        "derived"
      ],
      [
        "EBITDA (₹/yr)",
        "derived"
      ],
      [
        "Cap Rate (%)",
        "derived"
      ],
      [
        "IRR (%)",
        "raw"
      ],
      [
        "ROI (%)",
        "derived"
      ],
      [
        "Yield (%)",
        "derived"
      ],
      [
        "Payback Period (yrs)",
        "derived"
      ],
      [
        "Cash-on-Cash Return (%)",
        "derived"
      ]
    ]
  },
  {
    "name": "13. Cash Flow Analysis",
    "masterName": "Cash Flow Analysis Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Cash Flow Period",
        "raw"
      ],
      [
        "Opening Value (₹)",
        "raw"
      ],
      [
        "Gross Rental Income (₹/yr)",
        "derived"
      ],
      [
        "Other Income (₹/yr)",
        "raw"
      ],
      [
        "Total Gross Income (₹/yr)",
        "derived"
      ],
      [
        "Operating Expenses (₹/yr)",
        "derived"
      ],
      [
        "NOI (₹/yr)",
        "derived"
      ],
      [
        "Annual Debt Service (₹/yr)",
        "derived"
      ],
      [
        "Net Cash Flow After Debt (₹/yr)",
        "derived"
      ],
      [
        "Capex Reserve (₹/yr)",
        "raw"
      ],
      [
        "Free Cash Flow (₹/yr)",
        "derived"
      ],
      [
        "DSCR",
        "derived"
      ],
      [
        "Cash Yield (%)",
        "derived"
      ],
      [
        "Remarks",
        "raw"
      ]
    ]
  },
  {
    "name": "14. Market Benchmarking",
    "masterName": "Market Benchmarking Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Market Rent (₹/sq ft/month)",
        "raw"
      ],
      [
        "Market Rate (₹/sq ft)",
        "raw"
      ],
      [
        "Comparable Sales",
        "raw"
      ],
      [
        "Vacancy Rate (%)",
        "raw"
      ],
      [
        "Absorption (units/month)",
        "raw"
      ],
      [
        "Competitor Supply (units)",
        "raw"
      ]
    ]
  },
  {
    "name": "14. Documents",
    "masterName": "Documents Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Title Deed",
        "raw"
      ],
      [
        "Valuation Report",
        "raw"
      ],
      [
        "Lease Agreement",
        "raw"
      ],
      [
        "Tax Receipt",
        "raw"
      ],
      [
        "Insurance Policy",
        "raw"
      ],
      [
        "Approval Documents",
        "raw"
      ]
    ]
  },
  {
    "name": "15. Workflow / Actions",
    "masterName": "Workflow / Actions Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Assigned User",
        "raw"
      ],
      [
        "Task Status",
        "raw"
      ],
      [
        "Next Review Date",
        "raw"
      ],
      [
        "Approval Status",
        "raw"
      ],
      [
        "Remarks",
        "raw"
      ],
      [
        "Alerts",
        "derived"
      ],
      [
        "Audit Trail",
        "raw"
      ]
    ]
  },
  {
    "name": "16. Exit / Strategy",
    "masterName": "Exit / Strategy Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Acquisition Date",
        "raw"
      ],
      [
        "Acquisition Cost (₹)",
        "raw"
      ],
      [
        "Hold/Sell/Redevelop Decision",
        "raw"
      ],
      [
        "Target Exit Value (₹)",
        "raw"
      ],
      [
        "Expected Sale Date",
        "raw"
      ],
      [
        "Exit IRR (%)",
        "derived"
      ],
      [
        "Buyer Interest",
        "raw"
      ]
    ]
  },
  {
    "name": "16. Operations & Maintenance",
    "masterName": "Operations & Maintenance Master",
    "fields": [
      [
        "Asset ID",
        "system"
      ],
      [
        "Repairs Status",
        "raw"
      ],
      [
        "AMC Status",
        "raw"
      ],
      [
        "Inspection Status",
        "raw"
      ],
      [
        "Complaints Open",
        "raw"
      ],
      [
        "Utilities Status",
        "raw"
      ],
      [
        "Vendor Name",
        "raw"
      ]
    ]
  }
];


export const starterRecords = [
  [
    {
      "Asset ID": "PMS-001",
      "Property Name": "Sigma Tower",
      "Asset Type": "Commercial Office",
      "Ownership Type": "Freehold",
      "Address": "Baner Road, Pune",
      "City": "Pune",
      "Micromarket": "Baner",
      "Latitude": 18.559,
      "Longitude": 73.7868
    },
    {
      "Asset ID": "PMS-002",
      "Property Name": "Metro Retail Plaza",
      "Asset Type": "Retail",
      "Ownership Type": "Leasehold",
      "Address": "FC Road, Pune",
      "City": "Pune",
      "Micromarket": "Shivajinagar",
      "Latitude": 18.5222,
      "Longitude": 73.8411
    },
    {
      "Asset ID": "PMS-003",
      "Property Name": "Lakeview Residences",
      "Asset Type": "Residential Rental",
      "Ownership Type": "Freehold",
      "Address": "Hinjewadi Phase 1, Pune",
      "City": "Pune",
      "Micromarket": "Hinjewadi",
      "Latitude": 18.5913,
      "Longitude": 73.7389
    },
    {
      "Asset ID": "PMS-004",
      "Property Name": "Industrial Logistics Park",
      "Asset Type": "Industrial / Warehouse",
      "Ownership Type": "Freehold",
      "Address": "Talegaon MIDC, Pune",
      "City": "Pune",
      "Micromarket": "Talegaon",
      "Latitude": 18.735,
      "Longitude": 73.671
    },
    {
      "Asset ID": "PMS-005",
      "Property Name": "Downtown Co-living Asset",
      "Asset Type": "Co-living",
      "Ownership Type": "Leasehold",
      "Address": "Kharadi, Pune",
      "City": "Pune",
      "Micromarket": "Kharadi",
      "Latitude": 18.5515,
      "Longitude": 73.9341
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Owner Name": "Sigma Tower Owner",
      "SPV/Entity": "Sigma Tower SPV Pvt Ltd",
      "Title Status": "Clear",
      "Encumbrance Status": "No",
      "Legal Disputes": "No",
      "Approvals": "Approved",
      "Lease/Ownership Documents": "Available"
    },
    {
      "Asset ID": "PMS-002",
      "Owner Name": "Metro Retail Plaza Owner",
      "SPV/Entity": "Metro Retail Plaza SPV Pvt Ltd",
      "Title Status": "Clear",
      "Encumbrance Status": "Yes - Minor",
      "Legal Disputes": "No",
      "Approvals": "Approved",
      "Lease/Ownership Documents": "Available"
    },
    {
      "Asset ID": "PMS-003",
      "Owner Name": "Lakeview Residences Owner",
      "SPV/Entity": "Lakeview Residences SPV Pvt Ltd",
      "Title Status": "Clear",
      "Encumbrance Status": "No",
      "Legal Disputes": "No",
      "Approvals": "Approved",
      "Lease/Ownership Documents": "Available"
    },
    {
      "Asset ID": "PMS-004",
      "Owner Name": "Industrial Logistics Park Owner",
      "SPV/Entity": "Industrial Logistics Park SPV Pvt Ltd",
      "Title Status": "Clear",
      "Encumbrance Status": "No",
      "Legal Disputes": "No",
      "Approvals": "Partly Approved",
      "Lease/Ownership Documents": "Available"
    },
    {
      "Asset ID": "PMS-005",
      "Owner Name": "Downtown Co-living Asset Owner",
      "SPV/Entity": "Downtown Co-living Asset SPV Pvt Ltd",
      "Title Status": "Under Review",
      "Encumbrance Status": "Yes - Loan Charge",
      "Legal Disputes": "Yes",
      "Approvals": "Under Review",
      "Lease/Ownership Documents": "Partial"
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Land Area (sq ft)": 43000,
      "Built-up Area (sq ft)": 98000,
      "Carpet Area (sq ft)": 76000,
      "Leasable Area (sq ft)": 85000,
      "No. of Floors": 12,
      "No. of Units": 96,
      "Age of Property (yrs)": 5,
      "Condition Score": 82
    },
    {
      "Asset ID": "PMS-002",
      "Land Area (sq ft)": 28000,
      "Built-up Area (sq ft)": 76000,
      "Carpet Area (sq ft)": 59000,
      "Leasable Area (sq ft)": 62000,
      "No. of Floors": 6,
      "No. of Units": 54,
      "Age of Property (yrs)": 9,
      "Condition Score": 74
    },
    {
      "Asset ID": "PMS-003",
      "Land Area (sq ft)": 55000,
      "Built-up Area (sq ft)": 135000,
      "Carpet Area (sq ft)": 98000,
      "Leasable Area (sq ft)": 110000,
      "No. of Floors": 18,
      "No. of Units": 180,
      "Age of Property (yrs)": 3,
      "Condition Score": 88
    },
    {
      "Asset ID": "PMS-004",
      "Land Area (sq ft)": 185000,
      "Built-up Area (sq ft)": 260000,
      "Carpet Area (sq ft)": 225000,
      "Leasable Area (sq ft)": 240000,
      "No. of Floors": 2,
      "No. of Units": 24,
      "Age of Property (yrs)": 7,
      "Condition Score": 79
    },
    {
      "Asset ID": "PMS-005",
      "Land Area (sq ft)": 18000,
      "Built-up Area (sq ft)": 62000,
      "Carpet Area (sq ft)": 47000,
      "Leasable Area (sq ft)": 52000,
      "No. of Floors": 14,
      "No. of Units": 140,
      "Age of Property (yrs)": 2,
      "Condition Score": 69
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Energy Consumption (kWh/yr)": 260000,
      "Water Consumption (KL/yr)": 9200,
      "Emissions (tCO2e/yr)": "",
      "Waste Generated (kg/yr)": 14500,
      "Green Certification": "LEED Gold",
      "Climate Risk": "Medium",
      "Compliance Status": "",
      "Tenant Health/Safety Score": 86,
      "ESG Risk Score": ""
    },
    {
      "Asset ID": "PMS-002",
      "Energy Consumption (kWh/yr)": 310000,
      "Water Consumption (KL/yr)": 11500,
      "Emissions (tCO2e/yr)": "",
      "Waste Generated (kg/yr)": 21000,
      "Green Certification": "IGBC Silver",
      "Climate Risk": "High",
      "Compliance Status": "",
      "Tenant Health/Safety Score": 78,
      "ESG Risk Score": ""
    },
    {
      "Asset ID": "PMS-003",
      "Energy Consumption (kWh/yr)": 210000,
      "Water Consumption (KL/yr)": 18000,
      "Emissions (tCO2e/yr)": "",
      "Waste Generated (kg/yr)": 17000,
      "Green Certification": "GRIHA 4 Star",
      "Climate Risk": "Low",
      "Compliance Status": "",
      "Tenant Health/Safety Score": 91,
      "ESG Risk Score": ""
    },
    {
      "Asset ID": "PMS-004",
      "Energy Consumption (kWh/yr)": 480000,
      "Water Consumption (KL/yr)": 28000,
      "Emissions (tCO2e/yr)": "",
      "Waste Generated (kg/yr)": 32000,
      "Green Certification": "None",
      "Climate Risk": "Medium",
      "Compliance Status": "",
      "Tenant Health/Safety Score": 80,
      "ESG Risk Score": ""
    },
    {
      "Asset ID": "PMS-005",
      "Energy Consumption (kWh/yr)": 190000,
      "Water Consumption (KL/yr)": 10500,
      "Emissions (tCO2e/yr)": "",
      "Waste Generated (kg/yr)": 26000,
      "Green Certification": "None",
      "Climate Risk": "High",
      "Compliance Status": "",
      "Tenant Health/Safety Score": 72,
      "ESG Risk Score": ""
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Acquisition Cost (₹)": 850000000,
      "Current Market Value (₹)": 70000000,
      "Book Value (₹)": 760000000,
      "Valuation Date": "2026-04-30",
      "Valuation Method": "Income Approach",
      "Appreciation/Depreciation (%)": ""
    },
    {
      "Asset ID": "PMS-002",
      "Acquisition Cost (₹)": 620000000,
      "Current Market Value (₹)": 70000000,
      "Book Value (₹)": 515000000,
      "Valuation Date": "2026-04-30",
      "Valuation Method": "Market Approach",
      "Appreciation/Depreciation (%)": ""
    },
    {
      "Asset ID": "PMS-003",
      "Acquisition Cost (₹)": 1100000000,
      "Current Market Value (₹)": 70000000,
      "Book Value (₹)": 980000000,
      "Valuation Date": "2026-04-30",
      "Valuation Method": "DCF",
      "Appreciation/Depreciation (%)": ""
    },
    {
      "Asset ID": "PMS-004",
      "Acquisition Cost (₹)": 980000000,
      "Current Market Value (₹)": 70000000,
      "Book Value (₹)": 840000000,
      "Valuation Date": "2026-04-30",
      "Valuation Method": "Cost + Market",
      "Appreciation/Depreciation (%)": ""
    },
    {
      "Asset ID": "PMS-005",
      "Acquisition Cost (₹)": 540000000,
      "Current Market Value (₹)": 70000000,
      "Book Value (₹)": 500000000,
      "Valuation Date": "2026-04-30",
      "Valuation Method": "Income Approach",
      "Appreciation/Depreciation (%)": ""
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Rental Income (₹/yr)": 72000000,
      "Occupancy Income (₹/yr)": "",
      "Other Income (₹/yr)": 6500000,
      "Escalation Clause (%)": 5,
      "Collection Efficiency (%)": 94
    },
    {
      "Asset ID": "PMS-002",
      "Rental Income (₹/yr)": 84000000,
      "Occupancy Income (₹/yr)": "",
      "Other Income (₹/yr)": 9000000,
      "Escalation Clause (%)": 4,
      "Collection Efficiency (%)": 88
    },
    {
      "Asset ID": "PMS-003",
      "Rental Income (₹/yr)": 66000000,
      "Occupancy Income (₹/yr)": "",
      "Other Income (₹/yr)": 3500000,
      "Escalation Clause (%)": 5,
      "Collection Efficiency (%)": 96
    },
    {
      "Asset ID": "PMS-004",
      "Rental Income (₹/yr)": 96000000,
      "Occupancy Income (₹/yr)": "",
      "Other Income (₹/yr)": 7500000,
      "Escalation Clause (%)": 6,
      "Collection Efficiency (%)": 91
    },
    {
      "Asset ID": "PMS-005",
      "Rental Income (₹/yr)": 78000000,
      "Occupancy Income (₹/yr)": "",
      "Other Income (₹/yr)": 4200000,
      "Escalation Clause (%)": 8,
      "Collection Efficiency (%)": 82
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Maintenance Cost (₹/yr)": 3800000,
      "Property Tax (₹/yr)": 1200000,
      "Insurance (₹/yr)": 1900000,
      "Utilities (₹/yr)": 2100000,
      "Repairs (₹/yr)": 2500000,
      "Capex (₹/yr)": 7600000,
      "Opex (₹/yr)": ""
    },
    {
      "Asset ID": "PMS-002",
      "Maintenance Cost (₹/yr)": 5200000,
      "Property Tax (₹/yr)": 1400000,
      "Insurance (₹/yr)": 1600000,
      "Utilities (₹/yr)": 2600000,
      "Repairs (₹/yr)": 4100000,
      "Capex (₹/yr)": 9400000,
      "Opex (₹/yr)": ""
    },
    {
      "Asset ID": "PMS-003",
      "Maintenance Cost (₹/yr)": 6100000,
      "Property Tax (₹/yr)": 1800000,
      "Insurance (₹/yr)": 2400000,
      "Utilities (₹/yr)": 2800000,
      "Repairs (₹/yr)": 1700000,
      "Capex (₹/yr)": 8800000,
      "Opex (₹/yr)": ""
    },
    {
      "Asset ID": "PMS-004",
      "Maintenance Cost (₹/yr)": 7800000,
      "Property Tax (₹/yr)": 2600000,
      "Insurance (₹/yr)": 3100000,
      "Utilities (₹/yr)": 3600000,
      "Repairs (₹/yr)": 6800000,
      "Capex (₹/yr)": 14500000,
      "Opex (₹/yr)": ""
    },
    {
      "Asset ID": "PMS-005",
      "Maintenance Cost (₹/yr)": 4800000,
      "Property Tax (₹/yr)": 1050000,
      "Insurance (₹/yr)": 1350000,
      "Utilities (₹/yr)": 2200000,
      "Repairs (₹/yr)": 5200000,
      "Capex (₹/yr)": 6800000,
      "Opex (₹/yr)": ""
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Occupancy (%)": 92,
      "Vacant Area (sq ft)": "",
      "Tenant Name": "Multiple Tenants",
      "Lease Start Date": "2024-04-01",
      "Lease End Date": "2029-03-31",
      "Lock-in Period (months)": 36,
      "Renewal Status": "Likely Renewal"
    },
    {
      "Asset ID": "PMS-002",
      "Occupancy (%)": 87,
      "Vacant Area (sq ft)": "",
      "Tenant Name": "Anchor + Retail Tenants",
      "Lease Start Date": "2023-07-01",
      "Lease End Date": "2028-06-30",
      "Lock-in Period (months)": 30,
      "Renewal Status": "Under Discussion"
    },
    {
      "Asset ID": "PMS-003",
      "Occupancy (%)": 95,
      "Vacant Area (sq ft)": "",
      "Tenant Name": "Residential Tenants",
      "Lease Start Date": "2025-01-01",
      "Lease End Date": "2028-12-31",
      "Lock-in Period (months)": 24,
      "Renewal Status": "Likely Renewal"
    },
    {
      "Asset ID": "PMS-004",
      "Occupancy (%)": 89,
      "Vacant Area (sq ft)": "",
      "Tenant Name": "3PL Tenant",
      "Lease Start Date": "2024-10-01",
      "Lease End Date": "2034-09-30",
      "Lock-in Period (months)": 60,
      "Renewal Status": "Likely Renewal"
    },
    {
      "Asset ID": "PMS-005",
      "Occupancy (%)": 81,
      "Vacant Area (sq ft)": "",
      "Tenant Name": "Co-living Operator",
      "Lease Start Date": "2025-06-01",
      "Lease End Date": "2030-05-31",
      "Lock-in Period (months)": 24,
      "Renewal Status": "Risk of Non-renewal"
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Loan Amount (₹)": 420000000,
      "Lender": "HDFC Bank",
      "Interest Rate (%)": 9.25,
      "EMI (₹/month)": "",
      "Outstanding Principal (₹)": 365000000,
      "LTV (%)": "",
      "DSCR": "",
      "Repayment Schedule": "Monthly"
    },
    {
      "Asset ID": "PMS-002",
      "Loan Amount (₹)": 330000000,
      "Lender": "ICICI Bank",
      "Interest Rate (%)": 9.75,
      "EMI (₹/month)": "",
      "Outstanding Principal (₹)": 290000000,
      "LTV (%)": "",
      "DSCR": "",
      "Repayment Schedule": "Monthly"
    },
    {
      "Asset ID": "PMS-003",
      "Loan Amount (₹)": 480000000,
      "Lender": "SBI",
      "Interest Rate (%)": 8.95,
      "EMI (₹/month)": "",
      "Outstanding Principal (₹)": 430000000,
      "LTV (%)": "",
      "DSCR": "",
      "Repayment Schedule": "Monthly"
    },
    {
      "Asset ID": "PMS-004",
      "Loan Amount (₹)": 560000000,
      "Lender": "Axis Bank",
      "Interest Rate (%)": 9.6,
      "EMI (₹/month)": "",
      "Outstanding Principal (₹)": 510000000,
      "LTV (%)": "",
      "DSCR": "",
      "Repayment Schedule": "Quarterly"
    },
    {
      "Asset ID": "PMS-005",
      "Loan Amount (₹)": 380000000,
      "Lender": "Kotak Bank",
      "Interest Rate (%)": 10.25,
      "EMI (₹/month)": "",
      "Outstanding Principal (₹)": 350000000,
      "LTV (%)": "",
      "DSCR": "",
      "Repayment Schedule": "Monthly"
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Legal Risk": "Low",
      "Market Risk": "Medium",
      "Tenant Risk": "Low",
      "Valuation Risk": "Medium",
      "Liquidity Risk": "Medium",
      "Regulatory Risk": "Low",
      "Red Flag Score": ""
    },
    {
      "Asset ID": "PMS-002",
      "Legal Risk": "Medium",
      "Market Risk": "High",
      "Tenant Risk": "Medium",
      "Valuation Risk": "Medium",
      "Liquidity Risk": "High",
      "Regulatory Risk": "Medium",
      "Red Flag Score": ""
    },
    {
      "Asset ID": "PMS-003",
      "Legal Risk": "Low",
      "Market Risk": "Low",
      "Tenant Risk": "Low",
      "Valuation Risk": "Low",
      "Liquidity Risk": "Low",
      "Regulatory Risk": "Low",
      "Red Flag Score": ""
    },
    {
      "Asset ID": "PMS-004",
      "Legal Risk": "Low",
      "Market Risk": "Medium",
      "Tenant Risk": "Low",
      "Valuation Risk": "Medium",
      "Liquidity Risk": "Medium",
      "Regulatory Risk": "Medium",
      "Red Flag Score": ""
    },
    {
      "Asset ID": "PMS-005",
      "Legal Risk": "High",
      "Market Risk": "High",
      "Tenant Risk": "High",
      "Valuation Risk": "High",
      "Liquidity Risk": "High",
      "Regulatory Risk": "High",
      "Red Flag Score": ""
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "NOI (₹/yr)": "",
      "EBITDA (₹/yr)": "",
      "Cap Rate (%)": "",
      "IRR (%)": 14,
      "ROI (%)": "",
      "Yield (%)": "",
      "Payback Period (yrs)": "",
      "Cash-on-Cash Return (%)": ""
    },
    {
      "Asset ID": "PMS-002",
      "NOI (₹/yr)": "",
      "EBITDA (₹/yr)": "",
      "Cap Rate (%)": "",
      "IRR (%)": 15.5,
      "ROI (%)": "",
      "Yield (%)": "",
      "Payback Period (yrs)": "",
      "Cash-on-Cash Return (%)": ""
    },
    {
      "Asset ID": "PMS-003",
      "NOI (₹/yr)": "",
      "EBITDA (₹/yr)": "",
      "Cap Rate (%)": "",
      "IRR (%)": 13,
      "ROI (%)": "",
      "Yield (%)": "",
      "Payback Period (yrs)": "",
      "Cash-on-Cash Return (%)": ""
    },
    {
      "Asset ID": "PMS-004",
      "NOI (₹/yr)": "",
      "EBITDA (₹/yr)": "",
      "Cap Rate (%)": "",
      "IRR (%)": 12,
      "ROI (%)": "",
      "Yield (%)": "",
      "Payback Period (yrs)": "",
      "Cash-on-Cash Return (%)": ""
    },
    {
      "Asset ID": "PMS-005",
      "NOI (₹/yr)": "",
      "EBITDA (₹/yr)": "",
      "Cap Rate (%)": "",
      "IRR (%)": 16,
      "ROI (%)": "",
      "Yield (%)": "",
      "Payback Period (yrs)": "",
      "Cash-on-Cash Return (%)": ""
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Market Rent (₹/sq ft/month)": 72,
      "Market Rate (₹/sq ft)": "",
      "Comparable Sales": "5 nearby office comps",
      "Vacancy Rate (%)": 8,
      "Absorption (units/month)": 18,
      "Competitor Supply (units)": 420
    },
    {
      "Asset ID": "PMS-002",
      "Market Rent (₹/sq ft/month)": 118,
      "Market Rate (₹/sq ft)": "",
      "Comparable Sales": "6 retail comps",
      "Vacancy Rate (%)": 11,
      "Absorption (units/month)": 12,
      "Competitor Supply (units)": 300
    },
    {
      "Asset ID": "PMS-003",
      "Market Rent (₹/sq ft/month)": 42,
      "Market Rate (₹/sq ft)": "",
      "Comparable Sales": "7 apartment comps",
      "Vacancy Rate (%)": 5,
      "Absorption (units/month)": 28,
      "Competitor Supply (units)": 650
    },
    {
      "Asset ID": "PMS-004",
      "Market Rent (₹/sq ft/month)": 31,
      "Market Rate (₹/sq ft)": "",
      "Comparable Sales": "4 warehouse comps",
      "Vacancy Rate (%)": 6,
      "Absorption (units/month)": 9,
      "Competitor Supply (units)": 180
    },
    {
      "Asset ID": "PMS-005",
      "Market Rent (₹/sq ft/month)": 96,
      "Market Rate (₹/sq ft)": "",
      "Comparable Sales": "5 co-living comps",
      "Vacancy Rate (%)": 13,
      "Absorption (units/month)": 16,
      "Competitor Supply (units)": 520
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Title Deed": "Available",
      "Valuation Report": "Available",
      "Lease Agreement": "Available",
      "Tax Receipt": "Available",
      "Insurance Policy": "Available",
      "Approval Documents": "Available"
    },
    {
      "Asset ID": "PMS-002",
      "Title Deed": "Available",
      "Valuation Report": "Available",
      "Lease Agreement": "Available",
      "Tax Receipt": "Available",
      "Insurance Policy": "Available",
      "Approval Documents": "Available"
    },
    {
      "Asset ID": "PMS-003",
      "Title Deed": "Available",
      "Valuation Report": "Available",
      "Lease Agreement": "Available",
      "Tax Receipt": "Available",
      "Insurance Policy": "Available",
      "Approval Documents": "Available"
    },
    {
      "Asset ID": "PMS-004",
      "Title Deed": "Available",
      "Valuation Report": "Available",
      "Lease Agreement": "Available",
      "Tax Receipt": "Available",
      "Insurance Policy": "Available",
      "Approval Documents": "Partial"
    },
    {
      "Asset ID": "PMS-005",
      "Title Deed": "Partial",
      "Valuation Report": "Available",
      "Lease Agreement": "Available",
      "Tax Receipt": "Pending",
      "Insurance Policy": "Available",
      "Approval Documents": "Partial"
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Assigned User": "Priya Sharma",
      "Task Status": "In Progress",
      "Next Review Date": "2026-06-15",
      "Approval Status": "Pending",
      "Remarks": "Review rent escalation",
      "Alerts": "",
      "Audit Trail": "Created by dummy import; rule checked by Solution Agent"
    },
    {
      "Asset ID": "PMS-002",
      "Assigned User": "Amit Mehta",
      "Task Status": "Review",
      "Next Review Date": "2026-05-30",
      "Approval Status": "Pending",
      "Remarks": "Check encumbrance note",
      "Alerts": "",
      "Audit Trail": "Created by dummy import; rule checked by Solution Agent"
    },
    {
      "Asset ID": "PMS-003",
      "Assigned User": "Neha Kulkarni",
      "Task Status": "Completed",
      "Next Review Date": "2026-07-01",
      "Approval Status": "Approved",
      "Remarks": "Stable asset",
      "Alerts": "",
      "Audit Trail": "Created by dummy import; rule checked by Solution Agent"
    },
    {
      "Asset ID": "PMS-004",
      "Assigned User": "Rahul Patil",
      "Task Status": "In Progress",
      "Next Review Date": "2026-06-30",
      "Approval Status": "Pending",
      "Remarks": "Monitor approvals",
      "Alerts": "",
      "Audit Trail": "Created by dummy import; rule checked by Solution Agent"
    },
    {
      "Asset ID": "PMS-005",
      "Assigned User": "Sonal Desai",
      "Task Status": "Blocked",
      "Next Review Date": "2026-05-15",
      "Approval Status": "Rejected",
      "Remarks": "Legal dispute and compliance review",
      "Alerts": "",
      "Audit Trail": "Created by dummy import; rule checked by Solution Agent"
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Hold/Sell/Redevelop Decision": "Hold",
      "Target Exit Value (₹)": 75000000,
      "Expected Sale Date": "2031-03-31",
      "Exit IRR (%)": "",
      "Buyer Interest": "Medium"
    },
    {
      "Asset ID": "PMS-002",
      "Hold/Sell/Redevelop Decision": "Hold",
      "Target Exit Value (₹)": 75000000,
      "Expected Sale Date": "2030-06-30",
      "Exit IRR (%)": "",
      "Buyer Interest": "Low"
    },
    {
      "Asset ID": "PMS-003",
      "Hold/Sell/Redevelop Decision": "Hold",
      "Target Exit Value (₹)": 75000000,
      "Expected Sale Date": "2032-12-31",
      "Exit IRR (%)": "",
      "Buyer Interest": "High"
    },
    {
      "Asset ID": "PMS-004",
      "Hold/Sell/Redevelop Decision": "Hold",
      "Target Exit Value (₹)": 75000000,
      "Expected Sale Date": "2034-09-30",
      "Exit IRR (%)": "",
      "Buyer Interest": "Medium"
    },
    {
      "Asset ID": "PMS-005",
      "Hold/Sell/Redevelop Decision": "Sell",
      "Target Exit Value (₹)": 75000000,
      "Expected Sale Date": "2028-05-31",
      "Exit IRR (%)": "",
      "Buyer Interest": "Medium"
    }
  ],
  [
    {
      "Asset ID": "PMS-001",
      "Repairs Status": "Open: 3",
      "AMC Status": "Active",
      "Inspection Status": "Done: Apr 2026",
      "Complaints Open": 4,
      "Utilities Status": "Normal",
      "Vendor Name": "ABC Facilities"
    },
    {
      "Asset ID": "PMS-002",
      "Repairs Status": "Open: 7",
      "AMC Status": "Active",
      "Inspection Status": "Pending",
      "Complaints Open": 12,
      "Utilities Status": "High",
      "Vendor Name": "XYZ Services"
    },
    {
      "Asset ID": "PMS-003",
      "Repairs Status": "Open: 1",
      "AMC Status": "Active",
      "Inspection Status": "Done: Apr 2026",
      "Complaints Open": 1,
      "Utilities Status": "Normal",
      "Vendor Name": "Prime Facility Mgmt"
    },
    {
      "Asset ID": "PMS-004",
      "Repairs Status": "Open: 5",
      "AMC Status": "Active",
      "Inspection Status": "Pending",
      "Complaints Open": 5,
      "Utilities Status": "Normal",
      "Vendor Name": "WareServ India"
    },
    {
      "Asset ID": "PMS-005",
      "Repairs Status": "Open: 14",
      "AMC Status": "Expiring Soon",
      "Inspection Status": "Pending",
      "Complaints Open": 18,
      "Utilities Status": "High",
      "Vendor Name": "QuickFix Vendors"
    }
  ]
];

export const sampleValues = {};

