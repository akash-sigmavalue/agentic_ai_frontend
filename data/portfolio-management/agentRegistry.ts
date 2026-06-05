export const agentRegistry = {
  'Valuation Agent': {
    purpose: 'Checks asset value using current market value, book value, acquisition cost, valuation date, valuation method and market-rate evidence.',
    prompt: 'Validate current market value, appreciation/depreciation and valuation risk for the selected asset.',
    output: {
      summary: 'Reviews whether the asset value appears reasonable against cost, book value and market indicators.',
      calculations: 'Uses Current Market Value, Acquisition Cost, Book Value, Market Rate and Appreciation/Depreciation.',
      redFlags: 'Flags stale valuation date, abnormal value jump, low valuation confidence, or mismatch between book value and market value.',
      recommendations: 'Revalidate with comparable transactions, update valuation date and review LTV impact before final reporting.',
      reportNote: 'Valuation review completed for portfolio monitoring and credit/asset decision support.'
    }
  },
  'Feasibility Agent': {
    purpose: 'Tests project feasibility using revenue, cost, cash flow, capex, debt service, DSCR, yield and exit assumptions.',
    prompt: 'Run feasibility check using income, expenses, debt service and cash flow for the selected asset.',
    output: {
      summary: 'Assesses whether the asset/project can generate sufficient cash flow and return under current assumptions.',
      calculations: 'Uses Total Income, Opex, NOI, Annual Debt Service, Free Cash Flow, DSCR, Cash Yield and Target Exit Value.',
      redFlags: 'Flags low DSCR, negative free cash flow, high capex burden, weak yield or unrealistic exit value.',
      recommendations: 'Run base, optimistic and stress scenarios before approving investment or lending decision.',
      reportNote: 'Feasibility output can be used for investment committee, lender review or internal project evaluation.'
    }
  },
  'Land/GIS Agent': {
    purpose: 'Analyzes asset location using city, micromarket, latitude, longitude, land area, zoning, access and spatial context.',
    prompt: 'Analyze location, micromarket and spatial risk for the selected asset.',
    output: {
      summary: 'Reviews asset location quality, micromarket positioning and spatial attributes.',
      calculations: 'Uses City, Micromarket, Latitude, Longitude, Land Area, Built-up Area and location-linked indicators.',
      redFlags: 'Flags weak access, poor location fit, zoning mismatch, infrastructure dependency or concentration risk.',
      recommendations: 'Validate site boundary, road access, zoning and surrounding market demand before decision.',
      reportNote: 'GIS/location review supports collateral risk, site feasibility and micromarket decision-making.'
    }
  },
  'Transaction Data Agent': {
    purpose: 'Reads and compares transaction-linked data such as market rate, sale evidence, registered transaction trends and comparable rates.',
    prompt: 'Check transaction evidence and comparable market data for the selected asset.',
    output: {
      summary: 'Validates asset assumptions using transaction and market benchmark evidence.',
      calculations: 'Uses Market Rate, Current Market Value, Comparable Rate, transaction trends and asset-wise values.',
      redFlags: 'Flags insufficient comparable evidence, outlier transaction rates, outdated data or mismatch with micromarket trend.',
      recommendations: 'Use verified sale transactions and recent comparable evidence before final valuation or underwriting.',
      reportNote: 'Transaction data review improves evidence quality for valuation, lending and investment decisions.'
    }
  },
  'Market Research Agent': {
    purpose: 'Studies micromarket performance using rental income, occupancy, collection efficiency, expenses, demand and market benchmarks.',
    prompt: 'Run market research analysis for the selected micromarket and asset.',
    output: {
      summary: 'Explains how the asset performs in its city and micromarket context.',
      calculations: 'Uses Rental Income, Occupancy Income, Collection Efficiency, Opex, Yield, Market Rate and Micromarket.',
      redFlags: 'Flags weak collection efficiency, poor occupancy income, high opex, low rental yield or weak market positioning.',
      recommendations: 'Compare against micromarket peers and track demand, rental trend and absorption before strategy decisions.',
      reportNote: 'Market research output supports pricing, leasing, asset strategy and portfolio monitoring.'
    }
  }
};


