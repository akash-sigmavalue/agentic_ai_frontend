const faqData = [
  {
    category: "Valuation",
    faqs: [
      {
        q: "How accurate are automated valuations compared to physical inspections?",
        a: "SigmaValue’s AVM Sigma is designed to deliver valuations with a high degree of reliability by combining authentic government transaction data, micromarket trends, and advanced AI models. In most standardized property cases, our valuations align closely with physical inspections. While physical inspections capture unique property attributes like condition and finishing, AVM Sigma excels in speed, consistency, and data-backed benchmarking. For complex or atypical assets, we recommend complementing the automated result with our certified valuer expertise to ensure full accuracy.",
      },
      {
        q: "Do you provide both land and building valuations?",
        a: "Yes. We provide valuations across land parcels, residential, commercial, and industrial buildings. Our model also factors in development potential for land valuations, while our traditional team (IBBI registered valuers) handles specialized cases.",
      },
      {
        q: "Can I get a quick online valuation for my property?",
        a: "Absolutely. SigmaValue’s AVM Sigma uses artificial intelligence and predictive algorithms to instantly analyze government transaction records, micromarket benchmarks, and property attributes. Within minutes, you receive a credible online valuation that gives you a clear market-backed estimate, making it ideal for quick decision-making, loan applications, or initial deal negotiations.",
      },
      {
        q: "What data sources power your valuation engine?",
        a: "SigmaValue’s AVM Sigma draws from authentic and diverse datasets to ensure accuracy:\r\n\r\nGovernment-registered property transactions to provide a verified market baseline.\r\n\r\nReal-time micromarket insights covering demand, absorption rates, and buyer demographics.\r\n\r\nProject-level pricing and competition benchmarks to reflect what’s happening on the ground.\r\n\r\nAI-enhanced historical data models that learn from past valuation outcomes.\r\n\r\nBy combining these layers, our valuations capture both the current market reality and the future trend potential, making them highly reliable for decision-making.",
      },
      {
        q: "Can your valuation handle distressed assets or auctions?",
        a: "Yes. SigmaValue’s AVM Sigma is designed to address even complex scenarios like distressed or auctioned properties. Our model applies forced-sale value benchmarks, legal and regulatory overlays, and risk-adjusted discounting factors to capture the true realizable value. This helps banks, investors, and asset managers make informed decisions on liquidation, recovery, or acquisition strategies.",
      },
      {
        q: "Do you include FSI, zoning, and development potential in your valuation?",
        a: "Yes. SigmaValue valuations incorporate FSI, zoning norms, and development regulations to estimate the land’s current and potential development value. This helps developers and investors evaluate feasibility before acquisition.\r\n\r\nHowever, while our model captures regulatory parameters and development capacity, it does not replace detailed project-specific approvals, site inspections, or architectural feasibility studies. For highly specialized or irregular plots, we recommend combining our AVM insights with expert on-ground assessment.",
      },
      {
        q: "Do you provide compliance-ready valuation reports (IBBI/Companies Act)?",
        a: "Yes. As an empanelled valuation firm with multiple banks and financial institutions, SigmaValue delivers reports compliant with IBBI, Companies Act, Ind-AS, and RBI guidelines.",
      },
      {
        q: "Can developers use your valuation before acquiring land?",
        a: "Yes. Many developers rely on SigmaValue’s valuations to validate acquisition prices, assess feasibility, and benchmark against micromarket sales data before committing to a deal. Our AVM Sigma provides a fast, data-backed view of whether the asking price aligns with market realities.\r\n\r\nThat said, while our model highlights pricing accuracy and market positioning, it should be complemented with legal due diligence, site-specific studies, and regulatory approvals before final acquisition. We see our valuation as a decision-enabling tool, not a substitute for complete project due diligence.",
      },
      {
        q: "Do you provide customized valuation models for banks?",
        a: "Yes. For banks and NBFCs, we offer customized models that integrate credit risk parameters, collateral security value, and stress-testing features.",
      },
      {
        q: "Do you provide cross-city or pan-India valuation coverage?",
        a: "Yes. SigmaValue’s valuation coverage is active in 10+ cities across India, including major real estate hubs like Mumbai, Pune, Bangalore, Delhi NCR, and Hyderabad. In addition, through our valuer network and institutional partnerships, we provide pan-India valuation services, with ongoing expansion into more Tier 2 and Tier 3 cities.",
      },
      {
        q: "How do you handle black-money components in transactions?",
        a: "SigmaValue’s model is built on registered and verifiable transaction data. While black-money components are not formally captured, our proprietary algorithm adjusts for anomalies and sub-market discrepancies to estimate the true market value. In cases of under-reporting or suspected cash involvement, the system flags the gap and provides insightful commentary on realistic transaction values, helping clients make clearer, data-backed decisions.",
      },
      {
        q: "Can PropTech firms integrate your AVM valuation API?",
        a: "Yes. SigmaValue offers a plug-and-play AVM API that PropTechs, banks, and fintechs can embed directly into their platforms. The API is designed for real-time calls, supports JSON-based responses, and is built with scalable architecture and secure authentication protocols—ensuring seamless integration with existing digital ecosystems.",
      },
      {
        q: "What are your fees and turnaround times for valuation reports?",
        a: "Automated Valuations (AVM Sigma): Delivered instantly online at affordable subscription-based pricing, ideal for quick decision-making and portfolio monitoring.\r\n\r\nCertified Valuation Reports (IBBI / regulatory compliant): Typically completed within 3–5 business days for standard assets, and up to 7 days for complex or specialized properties.\r\n\r\nPricing: Fees depend on property type, size, and scope of work. For banks, NBFCs, and enterprises requiring bulk or recurring reports, customized enterprise pricing plans are available.",
      },
    ],
  },
  {
    category: "Market Lens",
    faqs: [
      {
        q: "What is micromarket analysis and why is it important?",
        a: "Micromarket analysis breaks down real estate markets into small, localized zones rather than broad city-level data. With SigmaValue’s Market Lens, you can see precise buyer demand, sales velocity, and pricing trends within specific neighborhoods. This helps developers, investors, and banks make location-specific decisions instead of relying on averages that hide the real picture.",
      },
      {
        q: "How granular is your data – down to project or just micromarket level?",
        a: "Market Lens delivers insights at multiple levels of granularity. You can analyze trends at the micromarket level to see overall demand, or zoom into the project level to track absorption, pricing, and velocity of specific developments.",
      },
      {
        q: "Can I track absorption and sales velocity for my project?",
        a: "Yes. Market Lens offers a Sales Velocity Tracker that lets you monitor how fast inventory is moving in your project compared to competitors in the same micromarket. This gives you a clear view of demand strength and pricing alignment.",
      },
      {
        q: "How frequently is Market Lens updated?",
        a: "Market Lens is updated on a continuous cycle, with new data ingested as soon as it becomes available from government transaction records, project registrations, and developer disclosures. Our system processes this data through automated cleaning, validation, and AI-driven anomaly detection before publishing it to the dashboard. This ensures that users are not only seeing the latest recorded transactions, but also reliable, verified insights that reflect the evolving micromarket in near real time.",
      },
      {
        q: "Can I compare multiple micromarkets side by side?",
        a: "\r\nYes. Market Lens allows you to select and compare two or more micromarkets across parameters such as pricing, absorption, buyer demographics, and sales trends, enabling benchmarking and location strategy decisions.",
      },
      {
        q: "Can I forecast demand for my upcoming project?",
        a: "Yes. Market Lens uses AI-driven forecasting based on past transactions, absorption trends, buyer profiles, and competing supply. It projects demand, pricing, and inventory levels, helping developers and investors plan the right mix, pricing, and launch timing.\r\nHowever, forecasts are data-model based and should be combined with on-ground intelligence and regulatory due diligence for final decision-making.",
      },
      {
        q: "Can I filter data by BHK type or budget range?",
        a: "Yes. Users can filter insights by property type, BHK configuration, and budget brackets. This enables a granular understanding of which product segments are driving demand.",
      },
      {
        q: "Does Market Lens include resale transactions or just primary sales?",
        a: "Market Lens captures both primary sales (new project registrations) and secondary/resale transactions recorded in government registries.",
      },
      {
        q: "Can I identify hotspots linked to infrastructure projects (like metro lines)?",
        a: "Yes. Market Lens overlays infrastructure projects with sales velocity data, helping you spot micromarkets where demand is driven by new infrastructure such as metro corridors, highways, or IT hubs.",
      },
      {
        q: "Do you provide inventory overhang analysis?",
        a: "Yes. Market Lens calculates inventory overhang by mapping unsold supply against current absorption rates in each micromarket.",
      },
      {
        q: "Can I export Market Lens insights into Excel/PPT for board meetings?",
        a: "Yes. Market Lens lets you export insights into Excel, CSV, and PPT. This supports board presentations, lender reports, MIS reviews, and sales/marketing decks, making data easy to apply across strategy, compliance, and client communication.",
      },
      {
        q: "Is Market Lens relevant for investors or only developers?",
        a: "Market Lens serves the entire real estate ecosystem:\r\n\r\nDevelopers: Refine pricing, benchmark absorption, and track competition.\r\n\r\nInvestors / Funds: Spot high-yield corridors and forecast ROI with AI models.\r\n\r\nBanks / NBFCs: Use via API for collateral checks and risk scoring.\r\n\r\nBrokers: Build trust with real-time dashboards in client pitches.\r\n\r\nAdvisors: Export datasets for MIS, portfolio reviews, and simulations.\r\n\r\nWith authentic data, predictive analytics, and API integration, Market Lens delivers actionable insights for every stakeholder.",
      },
      {
        q: "How do you ensure authenticity of the data?",
        a: "SigmaValue’s data foundation comes from government-registered transactions, official project registrations, and curated market surveys. This blended approach captures both recorded sales evidence and ground-level market sentiment. Each dataset is processed through multi-stage cleaning, anomaly detection, and AI validation models to filter duplicates and outliers. The result is a database that is authentic, reliable, and decision-ready for developers, investors, and lenders.",
      },
      {
        q: "Can brokers use Market Lens for customer pitches?",
        a: "Yes. Market Lens equips brokers and channel partners with real-time market dashboards, pricing intelligence, and demand trends that can be showcased directly to clients. By using verified data and visual insights, brokers gain greater credibility, build trust faster, and differentiate their pitches from competitors who rely only on generic listings",
      },
      {
        q: "Does Market Lens provide an API for integration?",
        a: "Yes. We offer a secure API that PropTech platforms, banks, and enterprises can integrate into their systems to access real-time micromarket insights programmatically.",
      },
      {
        q: "Can Market Lens generate automated dashboards for multiple projects at once?",
        a: "Yes. Enterprises can create portfolio-level dashboards covering multiple projects and micromarkets in one view. This is especially useful for developers with multiple launches and banks monitoring exposure across different geographies.",
      },
      {
        q: "Can Market Lens be customized for enterprise needs?",
        a: "Yes. We offer custom filters, branded dashboards, API integrations, and specialized reports to suit the requirements of developers, lenders, and institutional investors.",
      },
    ],
  },
  {
    category: "Simulator",
    faqs: [
      {
        q: "What is the SigmaValue Simulator?",
        a: "The Simulator is an AI-driven feasibility and risk analysis platform that models real estate project outcomes before execution, using real data and predictive algorithms.",
      },
      {
        q: "What kind of data does the Simulator use?",
        a: "It integrates registered transactions, project launches, market lens analytics, cost benchmarks, and buyer demographics, along with developer inputs on costs, timelines, and configurations",
      },
      {
        q: "Can the Simulator calculate IRR, ROI, and NPV for projects?",
        a: "Yes. It automatically computes financial metrics such as IRR, ROI, NPV, breakeven points, and payback periods, while adjusting for market fluctuations and cost escalations.",
      },
      {
        q: "How does the Simulator help in risk management?",
        a: "The Simulator identifies financial, regulatory, and demand-side risks, quantifies their potential impact, and allows decision-makers to stress-test scenarios before committing capital.",
      },
      {
        q: "Can developers use it before land acquisition?",
        a: "Yes. The Simulator enables developers to evaluate financial, regulatory, and market feasibility before acquisition using AI-powered scenario modeling. It analyzes FSI utilization, absorption potential, and projected ROI through real-time market and transaction data. Developers can compare land parcels, simulate JV or revenue-sharing structures, and forecast infra-led value growth. The AI engine continuously learns from market behavior, helping decision-makers identify the most viable parcel and timing for acquisition with data-backed confidence.",
      },
      {
        q: "Is the Simulator useful for banks and NBFCs?",
        a: "Yes. Lenders use the Simulator to evaluate project funding viability, credit risk, and repayment potential using objective data rather than only static TEV reports.",
      },
      {
        q: "Does the Simulator support multiple scenario analysis?",
        a: "Yes. The Simulator lets users build optimistic, base, and pessimistic scenarios by adjusting inputs like pricing, sales velocity, cost, and funding mix. Its AI engine simulates each case, calculating IRR, ROI, and cashflows, then visualizes results in a comparative dashboard with risk indicators. Users can modify assumptions and re-run simulations instantly.\r\nThis helps decision-makers test sensitivity, evaluate risks, and select the most profitable and resilient strategy before execution.",
      },
      {
        q: "Can I simulate cashflows and phasing across project lifecycle?",
        a: "Yes. The Simulator constructs a dynamic, phase-wise cashflow model built on real-world dependencies between cost, sales, and funding events.\r\n\r\n1. Define Inputs: Users begin by entering land cost, construction schedule, sales plan, and funding structure.\r\n\r\n2. Phasing Logic: The AI engine links each phase to its construction milestone, expected inflows, and outflows, automatically adjusting for dependencies such as approvals, launch timing, or cost escalations.\r\n\r\n3. Simulation Engine: Multiple timelines are generated to project cash inflow, expenditure, and balance positions under varying assumptions of sales velocity and funding mix.\r\n\r\n4. Optimization Layer: The system identifies the ideal phasing strategy that minimizes idle capital, maximizes IRR, and ensures liquidity alignment across the project lifecycle.\r\n\r\n5. Continuous Feedback: As real data (sales or cost updates) flows in, the Simulator recalibrates projections, giving teams a living financial model rather than a static feasibility sheet.\r\n\r\nThis process helps developers, CFOs, and lenders anticipate funding gaps, manage working capital, and plan project releases with greater precision and confidence.",
      },
      {
        q: "Can the Simulator handle both residential and commercial projects?",
        a: "Yes. It supports residential, commercial, mixed-use, and plotted developments, with customizable input parameters for each asset class.",
      },
      {
        q: "Does it factor in external market events like interest rate changes or policy shifts?",
        a: "Not at present. The current version of the Simulator focuses on project-specific and market-driven parameters such as pricing, cost, and absorption. However, as the model evolves, it will integrate macroeconomic variables like interest rates, inflation, and policy shifts to project their influence on profitability, demand, and funding dynamics.\r\n\r\nThis limitation is practical, as external variables often behave with high volatility and low predictability. By isolating these factors within a sandbox environment, SigmaValue can test their real impact safely, without affecting the precision of core project simulations — ensuring that future integrations are both scientifically validated and decision-reliable.",
      },
      {
        q: "Can multiple users or departments collaborate on one project simulation?",
        a: "Collaboration within the Simulator ensures that every department operates from one dynamic source of truth, turning fragmented project data into unified intelligence.\r\n\r\nKey Benefits:\r\n\r\n1. Real-time alignment: Finance, design, and sales teams make decisions based on synchronized inputs, eliminating version conflicts.\r\n\r\n2. Faster decision-making: AI-driven dashboards update automatically as assumptions change, reducing dependency on manual reporting cycles.\r\n\r\n3. Cross-functional transparency: Every stakeholder sees how one decision (e.g., pricing or delay) impacts IRR, funding, or construction progress.\r\n\r\n4. Reduced rework and risk: Early collaboration prevents cost overruns, delayed launches, and conflicting assumptions between teams.\r\n\r\n5. Strategic learning loop: Post-project data feeds back into the system, improving future simulations and benchmarks.\r\n\r\nRelation to Strategic ERP:\r\nWhile ERP systems record what happened, the Simulator predicts what will happen. It complements ERP by integrating financial, market, and operational foresight—essentially acting as the strategic intelligence layer on top of ERP",
      },
      {
        q: "Can the Simulator be used for investor presentations or fund-raising?",
        a: "Absolutely. The Simulator transforms complex project data into clear, investor-ready dashboards and reports that communicate feasibility, returns, and risk with precision. It converts financial models, market insights, and sales forecasts into visually intuitive charts, making it easier for investors to grasp project potential at a glance.\r\n\r\nBy integrating market-backed data, IRR/ROI forecasts, and sensitivity analyses, it builds credibility and eliminates the need for multiple spreadsheets or fragmented presentations. During fund-raising or JV discussions, the Simulator allows teams to run live “what-if” scenarios—instantly adjusting assumptions on pricing, sales velocity, or funding structure—so investors see transparency, agility, and data confidence in real time.\r\n\r\nThis not only shortens the negotiation cycle but also enhances trust, as every claim is backed by verifiable, simulation-based evidence",
      },
      {
        q: "What kind of decisions can I make using the Simulator?",
        a: "With the Simulator, you can:\r\n\r\nChoose the right land parcel and pricing strategy,\r\n\r\nPlan launch timing and unit mix,\r\n\r\nOptimize cashflows and returns,\r\n\r\nAnticipate risks and sensitivities,\r\nturning real estate planning from guesswork into data-backed precision forecasting.",
      },
      {
        q: "Does the Simulator help in project phasing and release strategy?",
        a: "Yes. It optimizes phase-wise launches, unit mix, and pricing strategy by simulating demand response, absorption velocity, and construction cost flow.",
      },
      {
        q: "Does the Simulator benefit government or urban planning agencies?",
        a: "Yes. The Simulator can be strategically customized for public institutions, city planners, and urban development authorities to evaluate and simulate the real-world impact of policy and infrastructure decisions before implementation.\r\n\r\nIt enables agencies to:\r\n\r\nModel urban policy outcomes: Assess how changes in FSI norms, zoning regulations, or taxation policies influence project feasibility, affordability, and supply-demand balance.\r\n\r\nForecast infrastructure impact: Simulate how upcoming projects such as metro lines, highways, and industrial corridors affect property prices, absorption trends, and demographic shifts across catchment zones.\r\n\r\nOptimize land use and density: Evaluate the trade-offs between built-up intensity, open space norms, and infrastructure load capacity, helping planners achieve balanced growth.\r\n\r\nSupport data-driven decision making: Provide evidence-based insights for town planning schemes, affordable housing programs, and smart city initiatives using real transaction and demographic data.\r\n\r\nEncourage transparency: Enable public-private collaboration by simulating outcomes that align developer feasibility with policy objectives, reducing friction in approvals and compliance.\r\n\r\nBy using SigmaValue’s Simulator, government and planning bodies can shift from reactive regulation to predictive urban governance, where every policy decision is tested, quantified, and optimized before being executed on ground.",
      },
      {
        q: "How does the Simulator support cost control and procurement teams?",
        a: "By forecasting cashflow timelines and vendor cost sensitivity, it assists procurement and finance in budget optimization and working capital planning.",
      },
      {
        q: "Can the Simulator connect with external data sources or APIs?",
        a: "Not in the current version. At present, the Simulator operates on internally processed and verified datasets from SigmaValue’s ecosystem — including transaction data, market analytics, and feasibility parameters.\r\n\r\nThis design choice is intentional, as it ensures data integrity, consistency, and auditability while the model continues to mature. However, SigmaValue is developing an API integration layer that will, in future versions, allow controlled connections with government APIs, CRM systems, ERP platforms, and financial data sources through a sandboxed and permission-based environment.\r\n\r\nThis phased approach maintains system accuracy and data security while laying the foundation for a live, interoperable real estate intelligence network.",
      },
      {
        q: "How does the Simulator help reduce risk and uncertainty?",
        a: "The Simulator reduces risk by testing multiple project outcomes under changing market, cost, and sales conditions. It maps key inputs, simulates scenarios, and evaluates their impact on profitability, timelines, and liquidity. The system then highlights high-risk parameters and suggests adjustments—such as pricing, phasing, or funding mix—to maintain stability. This helps decision-makers anticipate challenges early and act with confidence.",
      },
      {
        q: "Can the Simulator run multiple projects simultaneously?",
        a: "Yes. The Simulator’s multi-simulation mode enables users to analyze and compare several projects at once. It consolidates data across locations, typologies, and timelines into a portfolio view, allowing developers, funds, and lenders to assess overall returns, exposure, and risk concentration. Teams can test “what-if” scenarios across projects—such as changing interest rates, sales velocity, or phasing—to see how each variable impacts portfolio performance. This helps organizations prioritize high-performing projects and allocate capital more strategically.",
      },
      {
        q: "What are the measurable benefits of using the Simulator?",
        a: "60–70% faster feasibility turnaround\r\n\r\nData consistency across teams\r\n\r\nReduced financial modeling errors\r\n\r\nImproved ROI predictability and project confidence",
      },
      {
        q: "Can the Simulator generate visual dashboards and automated reports?",
        a: "Yes. It provides interactive dashboards and one-click exportable reports for decision meetings, investor decks, and lender submissions.",
      },
      {
        q: "How does the Simulator create value for multiple stakeholders simultaneously?",
        a: "Developers: Better pricing & phasing decisions\r\n\r\nBanks/NBFCs: Reliable collateral & risk assessment\r\n\r\nInvestors: Transparent ROI & exit visibility\r\n\r\nConsultants/Analysts: Unified data framework\r\n\r\nGovernment: Policy simulation & infra impact studies\r\n\r\nAll powered by AI-driven predictive modeling and real-time collaboration",
      },
      {
        q: "How is Project lifecycle simulator different from a traditional project monitoring tool?",
        a: "While project monitors report what has happened, SigmaValue’s Simulator predicts what will happen next. It merges financial, regulatory, and sales data to create a living digital twin that evolves with new data inputs — forecasting risks, overruns, and outcomes proactively.",
      },
    ],
  },
  {
    category: "PropGPT",
    faqs: [
      {
        q: "How PropGPT is it different from ChatGPT or other AI assistants?",
        a: "PropGPT is not a generic AI chatbot — it’s a domain-trained real estate intelligence engine built exclusively for property insights and decision-making.\r\n\r\nWhile ChatGPT and other assistants provide general knowledge responses, PropGPT is powered by SigmaValue’s verified real estate data, including government-registered transactions, project-level information, micromarket analytics, and predictive models.\r\n\r\nIt doesn’t guess — it analyzes. PropGPT combines AI reasoning with real transaction evidence to deliver location-specific answers such as:\r\n\r\n“What’s the realistic price for this project?”\r\n\r\n“Which micromarket will grow fastest next year?”\r\n\r\n“What’s the absorption rate or ROI for my investment?”\r\n\r\nAdditionally, it operates within a secure, sandboxed environment, ensuring data accuracy, compliance, and confidentiality, unlike open-ended AI tools that rely on public data.\r\n\r\nIn short, ChatGPT can converse about real estate — but PropGPT thinks like a real estate analyst.",
      },
      {
        q: "Can PropGPT answer location-specific queries (like Location 1 vs. Location 2 )?",
        a: "Yes. PropGPT is designed for hyper-local market comparison. It can instantly analyze and compare two or more locations based on real transaction data, buyer demographics, sales velocity, pricing trends, infrastructure influence, and future growth indicators.\r\n\r\nYou can ask questions such as:\r\n\r\n“Which is better for investment — Location A or Location B ?”\r\n\r\n“Where are prices appreciating faster?”\r\n\r\n“Which area has higher rental yield or lower inventory risk?”\r\n\r\nPropGPT evaluates each micromarket using data-backed benchmarks from SigmaValue’s database and provides a clear, easy-to-understand summary — helping you choose smarter between competing locations.",
      },
      {
        q: "Does it generate charts, tables, and dashboards?",
        a: "PropGPT can generate charts and comparison tables directly within the chat to visualize trends like pricing, absorption, or ROI. In addition, it features an intelligent redirection layer that routes complex analytical queries to the most efficient visualization module within the SigmaValue ecosystem — such as Market Lens, Sale Transaction, or Simulator dashboards.\r\nThis ensures that every visual — whether a pricing trend chart, absorption table, or ROI dashboard — is rendered using real-time, validated data and pre-optimized visualization engines. PropGPT acts as the intelligent interface layer, understanding your query and routing it to the most relevant visual data source for accurate and interactive results.",
      },
      {
        q: "Can PropGPT provide predictive insights?",
        a: "PropGPT does more than answer current market questions — it can provide AI-driven predictive insights based on patterns in historical transactions, absorption rates, buyer behavior, and infrastructure development.\r\n\r\nFor example, it can forecast:\r\n\r\n: Future price appreciation in a micromarket,\r\n\r\n: Expected demand trends across property types,\r\n\r\n: Projected absorption velocity for upcoming projects.\r\n\r\nFor deeper and more complex predictions, PropGPT seamlessly connects with SigmaValue’s Simulator and Market Lens modules, where advanced forecasting engines model long-term growth, feasibility, and investment risk.\r\n\r\nThis enables users — whether homebuyers or investors — to make forward-looking, evidence-based decisions instead of relying on intuition.",
      },
      {
        q: "Does it use real transaction and micromarket data?",
        a: "Yes — PropGPT is powered by SigmaValue’s verified database of government-registered property transactions and micromarket analytics. Every insight it provides is anchored in actual sale deeds, project registrations, and localized market behavior, not assumptions or scraped data.\r\n\r\nFor broader context, PropGPT also connects to Market Lens and Sale Transaction modules, ensuring that every response reflects real-world evidence and live market dynamics.\r\n\r\nThis makes PropGPT one of the few AI assistants that speaks the language of verified data, not guesswork — helping users trust every number it shows.",
      },
      {
        q: "How secure is the data fed into PropGPT?",
        a: "PropGPT operates within SigmaValue’s secure cloud infrastructure, designed with enterprise-grade encryption, role-based access controls, and sandboxed data environments. All user inputs and property queries are processed in real time without being stored, shared, or used for external training.\r\n\r\nFor enterprise users, PropGPT can be deployed in a private cloud or on-premise setup, ensuring complete data ownership and compliance with data protection and confidentiality standards.\r\n\r\nEvery interaction remains isolated, encrypted, and auditable.",
      },
      {
        q: "Can it simulate project feasibility scenarios?",
        a: "PropGPT can initiate and explain project feasibility simulations directly through conversation. When you ask about a project’s viability, it analyzes development costs, market absorption, pricing benchmarks, and potential returns using real SigmaValue data.\r\n\r\nFor deeper financial modeling, PropGPT seamlessly connects with the SigmaValue Simulator, where users can explore detailed feasibility scenarios — including ROI, IRR, phase-wise cashflows, and sensitivity outcomes under changing assumptions.\r\n\r\nThis integration allows even non-technical users to converse their way into feasibility modeling, turning complex project evaluations into an interactive, AI-guided experience backed by live market intelligence.",
      },
      {
        q: "Does PropGPT support voice-based queries?",
        a: "Currently, PropGPT supports text-based interactions for precise data-driven responses. However, voice-enabled queries are part of SigmaValue’s upcoming roadmap — allowing users to speak naturally and receive instant, AI-backed insights on pricing, feasibility, and market trends.\r\n\r\nVoice capability will be integrated within a secure conversational layer, ensuring that spoken data is processed privately and connected to the same verified SigmaValue database.\r\n\r\nThis evolution will make PropGPT a hands-free real estate intelligence assistant, combining conversational ease with analytical depth.",
      },
      {
        q: "Can PropGPT prepare investor pitch decks using real data?",
        a: "PropGPT can auto-generate structured investor presentations using verified SigmaValue data. When you specify a project or location, it gathers transaction trends, pricing benchmarks, absorption metrics, and ROI insights, then organizes them into ready-to-present charts and summaries.\r\n\r\nFor advanced use, PropGPT connects with SigmaValue’s Simulator and Market Lens modules to embed financial projections, risk profiles, and demand forecasts directly into the pitch deck. The output can be exported in PPT or PDF format, ready for investors, lenders, or internal board discussions.\r\n\r\nBy merging real data, predictive insights, and automation, PropGPT transforms time-consuming investor documentation into a few-minute AI-driven workflow — precise, credible, and presentation-ready.",
      },
      {
        q: "Do you offer PropGPT as SaaS or enterprise license?",
        a: "PropGPT is available in both SaaS (cloud-based) and enterprise (on-premise or private cloud) versions.\r\n\r\nSaaS Model: Ideal for individual users, brokers, and small teams who want instant access to AI-powered real estate insights without installation or infrastructure setup. It offers continuous updates, verified data access, and pay-as-you-go scalability.\r\n\r\nEnterprise License: Designed for banks, developers, and institutional clients requiring data privacy, system integration, and workflow customization. This version supports API integration with internal CRMs, simulators, and data warehouses while maintaining complete ownership and confidentiality.\r\n\r\nBoth versions operate on SigmaValue’s core AI and data intelligence engine, ensuring the same accuracy, security, and depth of insight — whether used individually or across an organization.",
      },
      {
        q: "What industries beyond real estate can PropGPT be applied to?",
        a: "While PropGPT is built for real estate, its core intelligence framework — data interpretation, predictive modeling, and conversational analytics — can be extended to multiple sectors that depend on structured + unstructured data for decision-making.\r\n\r\nPotential applications include:\r\n\r\n🏦 Banking & Finance: Loan underwriting, asset valuation, credit-risk simulations.\r\n\r\n🏗️ Infrastructure & Urban Planning: Project feasibility, land use modeling, and impact forecasting.\r\n\r\n🏢 Construction & Facilities Management: Cost optimization, procurement analytics, lifecycle tracking.\r\n\r\n📈 Investment & Private Equity: Portfolio modeling, ROI forecasting, and sector benchmarking.\r\n\r\n🌿 Sustainability & ESG Analytics: Carbon footprint modeling, policy impact simulation, and compliance reporting.\r\n\r\nBy adapting its AI reasoning and simulation architecture, PropGPT can evolve into a cross-industry decision intelligence platform — capable of contextualizing data, predicting outcomes, and generating actionable insights in any domain where data meets decisions.",
      },
      {
        q: "Can I ask PropGPT about the right price of a property I want to buy?",
        a: "Absolutely. PropGPT can estimate the fair market value of any property by analyzing registered sale transactions, project benchmarks, and micromarket trends from SigmaValue’s verified database.\r\n\r\nWhen you enter a project name or location, it evaluates factors like recent deal prices, buyer demographics, demand intensity, and property configuration to provide a realistic price range — not a guess.\r\n\r\nFor deeper insights, PropGPT can also redirect your query to the Market Lens or Sale Transaction modules, showing visual comparisons, rate movements, and absorption trends to help you negotiate confidently and invest wisely.",
      },
      {
        q: "Can PropGPT help me choose between renting and buying?",
        a: "Yes. PropGPT compares your monthly rent, home-loan EMI, property price, and future value to show which option makes better financial sense. It gives you an easy, data-backed answer on when buying is smarter than renting, or vice versa, based on your city, budget, and property type.",
      },
      {
        q: "Is the data used by PropGPT reliable?",
        a: "PropGPT is powered by SigmaValue’s verified database of registered property transactions, project information, on-ground market surveys, and data feeds from other analytical models. The system is regularly updated with new transactions and market indicators, while every data point undergoes validation, cleaning, and anomaly detection to ensure that insights remain accurate, current, and evidence-based.",
      },
      {
        q: "Does PropGPT show me ongoing or upcoming projects in my city?",
        a: "Yes. PropGPT can list ongoing, newly launched, and upcoming projects based on your preferred location, budget, and configuration. It gathers insights from official project disclosures, launch records, and verified market data.\r\n\r\nA dedicated PropGPT intelligence layer analyzes different aspects of the market.\r\n\r\nFor example: The development agreement layer scans and interprets registered land and joint development agreements to forecast upcoming projects even before they are publicly launched.\r\n\r\nSimilarly, other layers assess market transactions, absorption trends, and infrastructure developments to identify future-ready micro-markets.\r\n\r\nThis multi-layered approach allows PropGPT to deliver early, evidence-based insights on projects and locations that are likely to see the next wave of development.",
      },
      {
        q: "Can PropGPT identify good investment zones for me?",
        a: "Yes. PropGPT continuously tracks sales velocity, infrastructure growth, pricing movement, and buyer demand to identify high-potential investment corridors. It highlights areas that offer the best balance of appreciation and rental yield, helping you invest with foresight.",
      },
      {
        q: "Can PropGPT help NRI investors too?",
        a: "Absolutely. PropGPT simplifies cross-border real estate investing for NRIs by explaining city-wise ROI trends, regulatory guidelines, repatriation norms, and preferred developer zones. It’s designed to help global investors make secure, data-driven decisions in India.",
      },
      {
        q: "How secure is my data while using PropGPT?",
        a: "PropGPT runs on SigmaValue’s encrypted cloud architecture with role-based access and sandboxed processing. Your queries are handled in real time and never stored or shared externally.",
      },
      {
        q: "Does PropGPT provide property suggestions or only data insights?",
        a: "Both. PropGPT can suggest properties based on your budget, location, and preferences, and then explain why they are suitable This ensures that recommendations are transparent, not promotional, helping users see the logic behind every suggestion.",
      },
      {
        q: "How is PropGPT useful for first-time homebuyers?",
        a: "PropGPT is designed from first principles — starting with the core pain points of first-time homebuyers: lack of clarity, information asymmetry, emotional bias, and fear of overpaying. It acts as your AI-powered home-buying partner, guiding every step with logic, transparency, and verified data.\r\n\r\nFrom first principles — what first-time buyers truly need:\r\n\r\nClarity → to know what’s affordable and realistic within their budget.\r\n\r\nTrust → to differentiate verified data from marketing claims.\r\n\r\nForesight → to understand future appreciation, rentability, and liquidity.\r\n\r\nGuidance → to simplify financial, legal, and locality decisions.\r\n\r\nHow PropGPT fulfills these needs:\r\n\r\nUses verified transaction data to reveal the real market price and avoid overvaluation.\r\n\r\nAnalyzes affordability, EMI structure, and long-term cost in one place.\r\n\r\nCompares localities and projects based on demand trends, infrastructure, and growth potential.\r\n\r\nHighlights builder credibility using project delivery and sales performance data.\r\n\r\nForecasts future value and risk factors, turning emotional buying into data-backed investment.\r\n\r\n\r\n\r\nWith Propgpt at your side You don’t just buy a home — you make a strategic, well-timed, financially sound decision backed by real evidence. PropGPT transforms first-time buyers into informed decision-makers, combining human intuition with AI-driven intelligence.",
      },
      {
        q: "Can I use PropGPT on mobile?",
        a: "Yes. PropGPT runs seamlessly across mobile, tablet, and desktop through a responsive, cloud-based interface. It delivers real-time property insights on the go, with upcoming features like voice commands and PWA access for faster, hands-free interaction.\r\n\r\nWhether you’re at a site visit or traveling, PropGPT keeps AI-powered market intelligence just a tap away.",
      },
      {
        q: "Does PropGPT charge users?",
        a: "PropGPT is offered through paid subscription plans tailored to different user profiles — from individual investors to large enterprises. Each plan provides access to verified market data, AI-driven forecasts, and interactive dashboards designed to enhance decision-making and reduce risk.\r\n\r\nInstead of being a free chatbot, PropGPT delivers professional-grade intelligence, continuously updated with real transactions and market movements — ensuring every insight adds measurable value.",
      },
    ],
  },
];

export default faqData;
