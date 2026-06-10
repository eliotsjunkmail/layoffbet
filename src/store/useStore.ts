import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Company, Event, Bet, Comment, Theme, FeedbackItem } from '../types'
import { uid, isExpired, validateNoPersonalNames } from '../utils/odds'
import { api } from '../services/api'

const DAILY_COINS = 100
const today = () => new Date().toISOString().split('T')[0]
const futureDate = (days: number) => new Date(Date.now() + days * 86400000).toISOString()
const pastDate = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

const SEED_COMPANIES: Company[] = [
  { id: 'comp-1',  name: 'Accenture Inc', color: '#A100F2',             slug: 'accenture',          description: 'Global professional services firm specializing in IT consulting, digital transformation, and outsourcing',          industry: 'Consulting',             viewCount: 142341, createdAt: pastDate(60) },
  { id: 'comp-2',  name: 'ADP', color: '#003DA5',                         slug: 'adp',                description: 'Leading provider of payroll, HR, and workforce management solutions for businesses of all sizes',                  industry: 'HR Technology',          viewCount: 89204,  createdAt: pastDate(58) },
  { id: 'comp-3',  name: 'AIG', color: '#001F3F',                         slug: 'aig',                description: 'Multinational insurance and financial services corporation offering property, casualty, and life insurance',        industry: 'Insurance',              viewCount: 67891,  createdAt: pastDate(56) },
  { id: 'comp-4',  name: 'Alliance Data Systems', color: '#E31937',       slug: 'alliance-data',      description: 'Data-driven marketing and loyalty solutions provider serving retailers and consumer brands',                        industry: 'Marketing Technology',   viewCount: 55120,  createdAt: pastDate(54) },
  { id: 'comp-5',  name: 'Allscripts', color: '#004B87',                  slug: 'allscripts',         description: 'Healthcare IT company providing electronic health record and practice management software',                         industry: 'Healthcare IT',          viewCount: 41234,  createdAt: pastDate(52) },
  { id: 'comp-6',  name: 'Allstate Corporation', color: '#0066B2',        slug: 'allstate',           description: 'One of the largest publicly held personal lines property and casualty insurers in the U.S',                        industry: 'Insurance',              viewCount: 38445,  createdAt: pastDate(50) },
  { id: 'comp-7',  name: 'Altice', color: '#C81E1E',                      slug: 'altice',             description: 'Multinational telecommunications company providing cable, broadband, and mobile services',                          industry: 'Telecommunications',     viewCount: 34901,  createdAt: pastDate(48) },
  { id: 'comp-8',  name: 'American Airlines Group', color: '#0078D2',     slug: 'american-airlines',  description: 'Major U.S. airline and one of the world\'s largest carriers by fleet size and passengers flown',                  industry: 'Airlines',               viewCount: 128334, createdAt: pastDate(46) },
  { id: 'comp-9',  name: 'Analog Devices', color: '#FFB81C',              slug: 'analog-devices',     description: 'Semiconductor company specializing in data conversion, signal processing, and power management ICs',               industry: 'Semiconductors',         viewCount: 24112,  createdAt: pastDate(44) },
  { id: 'comp-10', name: 'Anthem', color: '#0066CC',                      slug: 'anthem',             description: 'One of the largest health insurance providers in the U.S., serving tens of millions of members',                   industry: 'Health Insurance',       viewCount: 52445,  createdAt: pastDate(42) },
  { id: 'comp-11', name: 'Apache Oil', color: '#E8531B',                  slug: 'apache-oil',         description: 'Independent oil and gas exploration and production company with operations in the U.S., Egypt, and North Sea',    industry: 'Oil & Gas',              viewCount: 19334,  createdAt: pastDate(40) },
  { id: 'comp-12', name: 'Ascension Health', color: '#005EB8',            slug: 'ascension-health',   description: 'One of the largest nonprofit Catholic health systems in the U.S., operating hospitals and clinics nationwide',    industry: 'Healthcare',             viewCount: 29234,  createdAt: pastDate(38) },
  { id: 'comp-13', name: 'AT&T', color: '#00A8E1',                        slug: 'att',                description: 'American multinational telecommunications conglomerate providing wireless, broadband, and media services',          industry: 'Telecommunications',     viewCount: 198901, createdAt: pastDate(60) },
  { id: 'comp-14', name: 'Avaya', color: '#003087',                       slug: 'avaya',              description: 'Enterprise communications company offering contact center, unified communications, and cloud solutions',            industry: 'Communications Tech',    viewCount: 38332,  createdAt: pastDate(36) },
  { id: 'comp-15', name: 'Baker Hughes', color: '#00A0D2',                slug: 'baker-hughes',       description: 'Oilfield services company providing equipment, services, and technology to the oil and gas industry worldwide',   industry: 'Oil & Gas Services',     viewCount: 26445,  createdAt: pastDate(34) },
  { id: 'comp-16', name: 'Bank of America', color: '#0066CC',             slug: 'bank-of-america',    description: 'One of the world\'s largest financial institutions, serving individual consumers, businesses, and governments',   industry: 'Banking',                viewCount: 175678, createdAt: pastDate(60) },
  { id: 'comp-17', name: 'Barnes & Noble', color: '#6B4C3A',              slug: 'barnes-noble',       description: 'America\'s largest retail bookseller, operating bookstores and a digital content platform',                        industry: 'Retail',                 viewCount: 24234,  createdAt: pastDate(32) },
  { id: 'comp-18', name: 'Bass Pro Shops', color: '#006241',              slug: 'bass-pro',           description: 'Specialty retailer of hunting, fishing, camping, and outdoor recreation merchandise',                               industry: 'Retail',                 viewCount: 18890,  createdAt: pastDate(30) },
  { id: 'comp-19', name: 'Becton Dickinson', color: '#003DA5',            slug: 'becton-dickinson',   description: 'Global medical technology company that manufactures and sells medical devices, diagnostics, and biosciences',     industry: 'Medical Devices',        viewCount: 22890,  createdAt: pastDate(28) },
  { id: 'comp-20', name: 'Bed Bath & Beyond', color: '#003478',           slug: 'bed-bath-beyond',    description: 'Retail chain selling domestic merchandise, home furnishings, and health and beauty products',                      industry: 'Retail',                 viewCount: 61234,  createdAt: pastDate(60) },
  { id: 'comp-21', name: 'Belk', color: '#C1121F',                        slug: 'belk',               description: 'Privately held department store chain operating in the Southeastern United States',                                industry: 'Retail',                 viewCount: 11234,  createdAt: pastDate(26) },
  { id: 'comp-22', name: 'BNSF', color: '#E47911',                        slug: 'bnsf',               description: 'One of the largest freight railroad networks in North America, operating across 28 U.S. states and Canada',      industry: 'Transportation',         viewCount: 17234,  createdAt: pastDate(24) },
  { id: 'comp-23', name: 'BNY', color: '#003DA5',                         slug: 'bny',                description: 'Bank of New York Mellon — global investments company providing custody, clearing, and asset servicing to institutions worldwide', industry: 'Financial Services', viewCount: 89445, createdAt: pastDate(60) },
  { id: 'comp-24', name: 'Boeing', color: '#0C3D7A',                      slug: 'boeing',             description: 'Multinational aerospace and defense corporation and one of the world\'s largest manufacturers of commercial jets',industry: 'Aerospace & Defense',    viewCount: 212102, createdAt: pastDate(60) },
  { id: 'comp-25', name: 'Bose', color: '#1E50BC',                        slug: 'bose',               description: 'American consumer electronics company best known for its audio equipment, noise-cancelling headphones, and speakers',industry: 'Consumer Electronics', viewCount: 34890,  createdAt: pastDate(20) },
  { id: 'comp-26', name: 'BP PLC', color: '#FFB81C',                      slug: 'bp',                 description: 'British multinational oil and gas company engaged in exploration, production, refining, and marketing',             industry: 'Oil & Gas',              viewCount: 78445,  createdAt: pastDate(60) },
  { id: 'comp-27', name: 'Broadcom', color: '#003366',                    slug: 'broadcom',           description: 'Global technology company designing semiconductor and infrastructure software solutions',                            industry: 'Semiconductors',         viewCount: 56890,  createdAt: pastDate(18) },
  { id: 'comp-28', name: 'CA', color: '#00264D',                          slug: 'ca',                 description: 'CA Technologies — enterprise software company providing IT management solutions for mainframe and distributed IT', industry: 'Enterprise Software',    viewCount: 14890,  createdAt: pastDate(16) },
  { id: 'comp-29', name: 'Carefirst BlueCross BlueShield', color: '#0066CC', slug: 'carefirst',       description: 'Nonprofit health plan providing medical coverage to members across Maryland, Washington D.C., and Northern Virginia', industry: 'Health Insurance', viewCount: 18334,  createdAt: pastDate(14) },
  { id: 'comp-30', name: 'CDK Global', color: '#2E5090',                  slug: 'cdk',                description: 'Provider of integrated data and technology solutions to the automotive, heavy truck, and recreation industries',   industry: 'Automotive Technology',  viewCount: 16112,  createdAt: pastDate(12) },
  { id: 'comp-31', name: 'Cengage', color: '#003478',                     slug: 'cengage',            description: 'Education and technology company providing learning materials, digital platforms, and workforce solutions',          industry: 'Education',              viewCount: 22445,  createdAt: pastDate(60) },
  { id: 'comp-32', name: 'Cenovus', color: '#E8530B',                     slug: 'cenovus',            description: 'Canadian integrated energy company involved in oil sands, conventional oil and gas, and refining',                 industry: 'Oil & Gas',              viewCount: 13890,  createdAt: pastDate(10) },
  { id: 'comp-33', name: 'Centene', color: '#00A0D2',                     slug: 'centene',            description: 'Managed care company providing services under Medicaid, Medicare, and commercial health plans',                    industry: 'Managed Care',           viewCount: 24678,  createdAt: pastDate(9) },
  { id: 'comp-34', name: 'CenturyLink', color: '#C41E3A',                 slug: 'centurylink',        description: 'Telecommunications company providing broadband, voice, and managed networking services to businesses and consumers',industry: 'Telecommunications',    viewCount: 38901,  createdAt: pastDate(60) },
  { id: 'comp-35', name: 'CGG', color: '#00A0D2',                         slug: 'cgg',                description: 'French multinational geoscience company providing geophysical services and data to the oil and gas industry',      industry: 'Oil & Gas Services',     viewCount: 9334,   createdAt: pastDate(8) },
  { id: 'comp-36', name: 'Change HealthCare', color: '#0066CC',           slug: 'change-healthcare',  description: 'Healthcare technology company offering revenue and payment cycle management, clinical information exchange, and more',industry: 'Healthcare IT',        viewCount: 41234,  createdAt: pastDate(7) },
  { id: 'comp-37', name: 'Charles Schwab', color: '#006B3F',              slug: 'schwab',             description: 'Financial services company offering brokerage, banking, and wealth management solutions to individual investors',   industry: 'Financial Services',     viewCount: 67890,  createdAt: pastDate(6) },
  { id: 'comp-38', name: 'Chesapeake Energy', color: '#003DA5',           slug: 'chesapeake-energy',  description: 'American oil and natural gas exploration and production company operating primarily in unconventional plays',       industry: 'Oil & Gas',              viewCount: 31234,  createdAt: pastDate(60) },
  { id: 'comp-39', name: 'Chevron', color: '#002B5C',                     slug: 'chevron',            description: 'American multinational energy corporation engaged in every aspect of the oil, natural gas, and geothermal business',industry: 'Oil & Gas',             viewCount: 98445,  createdAt: pastDate(5) },
  { id: 'comp-40', name: 'Cisco', color: '#1BA0D7',                       slug: 'cisco',              description: 'American multinational technology company that develops and sells networking hardware, software, and services',     industry: 'Networking & Tech',      viewCount: 156102, createdAt: pastDate(60) },
  { id: 'comp-41', name: 'Citrix', color: '#FF6B35',                      slug: 'citrix',             description: 'Enterprise software company specializing in virtualization, networking, and SaaS services for remote work',        industry: 'Enterprise Software',    viewCount: 44234,  createdAt: pastDate(4) },
  { id: 'comp-42', name: 'Coca Cola', color: '#F40009',                   slug: 'coca-cola',          description: 'American multinational beverage corporation best known for its flagship product and a portfolio of global brands', industry: 'Beverages',              viewCount: 87890,  createdAt: pastDate(60) },
  { id: 'comp-43', name: 'Cognizant', color: '#003DA5',                   slug: 'cognizant',          description: 'Multinational IT services and consulting company providing digital, technology, consulting, and operations services',industry: 'IT Services',           viewCount: 72445,  createdAt: pastDate(3) },
  { id: 'comp-44', name: 'Comcast', color: '#E47911',                     slug: 'comcast',            description: 'American telecommunications and media conglomerate, and the largest cable TV company in the United States',        industry: 'Telecommunications',     viewCount: 188334, createdAt: pastDate(60) },
  { id: 'comp-45', name: 'Commscope', color: '#004B87',                   slug: 'commscope',          description: 'Global provider of infrastructure solutions for communications networks including cable, wireless, and enterprise',  industry: 'Network Infrastructure', viewCount: 19890,  createdAt: pastDate(2) },
  { id: 'comp-46', name: 'Conduent', color: '#003478',                    slug: 'conduent',           description: 'Business process services company providing digital interactions and transaction processing for corporations and governments',industry: 'BPO',            viewCount: 14334,  createdAt: pastDate(2) },
  { id: 'comp-47', name: 'ConocoPhillips', color: '#004B87',              slug: 'conocophillips',     description: 'American multinational energy corporation and one of the world\'s largest independent exploration and production companies',industry: 'Oil & Gas',      viewCount: 54112,  createdAt: pastDate(1) },
  { id: 'comp-48', name: 'Cox Automotive', color: '#001F3F',              slug: 'cox-automotive',     description: 'Leading provider of automotive services including vehicle remarketing, dealership software, and consumer car-buying platforms',industry: 'Automotive',   viewCount: 28890,  createdAt: pastDate(1) },
  { id: 'comp-49', name: 'CRC', color: '#E8530B',                         slug: 'crc',                description: 'California Resources Corporation — largest oil and natural gas producer in California by volume',                   industry: 'Oil & Gas',              viewCount: 9234,   createdAt: pastDate(1) },
  { id: 'comp-50', name: "Crown Castle Int'l",          slug: 'crown-castle',       description: 'Real estate investment trust providing wireless tower infrastructure and fiber solutions across the United States',  industry: 'Telecom Infrastructure', viewCount: 21445,  createdAt: pastDate(1) },
  { id: 'comp-51', name: 'Cummins', color: '#E4001B',                     slug: 'cummins',            description: 'American corporation that designs, manufactures, and distributes engines, filtration, and power generation products',industry: 'Manufacturing',         viewCount: 24890,  createdAt: pastDate(1) },
  { id: 'comp-52', name: 'CVS', color: '#E4002B',                         slug: 'cvs',                description: 'American retail pharmacy and health care company operating thousands of retail locations and a pharmacy benefits manager',industry: 'Healthcare Retail',  viewCount: 134445, createdAt: pastDate(60) },
  { id: 'comp-54', name: 'Johnson & Johnson', color: '#D32F2F',           slug: 'johnson-johnson',     description: 'American multinational healthcare conglomerate engaged in the manufacture, research, and sale of pharmaceuticals, medical devices, and consumer packaged goods',industry: 'Healthcare',       viewCount: 98234, createdAt: pastDate(60), aliases: ['jnj'] },
  { id: 'comp-53', name: 'Meta', color: '#1877F2',                        slug: 'meta',               description: 'Facebook parent company providing social media, virtual reality, and advertising technology platforms worldwide',       industry: 'Technology',             viewCount: 201234, createdAt: pastDate(60) },
]

const ADMIN_USER: User = {
  id: 'user-admin',
  username: 'admin',
  password: 'admin',
  coins: 100,
  isAdmin: true,
  createdAt: pastDate(60),
  lastCoinsDate: today(),
}

const SEED_USERS: User[] = [
  ADMIN_USER,
  {
    id: 'user-eliot',
    username: 'eliotsjunkmail@gmail.com',
    password: 'eliot123',
    coins: 100,
    isAdmin: true,
    createdAt: pastDate(60),
    lastCoinsDate: today(),
  },
]

const SEED_EVENTS: Event[] = [
  {
    id: 'evt-1', companyId: 'comp-44', companyName: 'Comcast',
    title: 'Comcast will cut at least 5,000 jobs by end of Q3',
    description: 'Cord-cutting accelerated in Q1 and ad revenue is down YoY. Multiple sources inside the company say headcount reduction plans are being finalized at the VP level',
    expiresAt: futureDate(14), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 420, noPool: 180, outcome: null, createdAt: pastDate(5), viewCount: 3241, shareCount: 0,
  },
  {
    id: 'evt-2', companyId: 'comp-13', companyName: 'AT&T',
    title: 'AT&T will announce another round of layoffs this quarter',
    description: 'AT&T has been shedding headcount for years as it unwinds media acquisitions. Insiders say the cost-cutting mandate from the board has not let up',
    expiresAt: futureDate(21), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 540, noPool: 160, outcome: null, createdAt: pastDate(4), viewCount: 5872, shareCount: 0,
  },
  {
    id: 'evt-3', companyId: 'comp-24', companyName: 'Boeing',
    title: 'Boeing will freeze all salaried hiring through end of year',
    description: 'Production delays on the 737 MAX and 787 programs continue to burn cash. Finance is reportedly pushing for a blanket hiring freeze to offset cost overruns',
    expiresAt: futureDate(30), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 290, noPool: 210, outcome: null, createdAt: pastDate(7), viewCount: 4104, shareCount: 0,
  },
  {
    id: 'evt-4', companyId: 'comp-40', companyName: 'Cisco',
    title: 'Cisco will cut 10%+ of workforce following Splunk integration',
    description: 'Post-acquisition integration of Splunk is underway. Headcount duplication across engineering and go-to-market is significant. A 10–15% reduction has been floated internally',
    expiresAt: futureDate(45), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 380, noPool: 220, outcome: null, createdAt: pastDate(3), viewCount: 6187, shareCount: 0,
  },
  {
    id: 'evt-5', companyId: 'comp-52', companyName: 'CVS',
    title: 'CVS will close 900+ retail stores over the next 3 years',
    description: 'Foot traffic at standalone pharmacy locations has declined sharply. CVS has already begun evaluating underperforming stores and lease renewals are being skipped',
    expiresAt: futureDate(60), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 450, noPool: 150, outcome: null, createdAt: pastDate(6), viewCount: 4788, shareCount: 0,
  },
  {
    id: 'evt-6', companyId: 'comp-16', companyName: 'Bank of America',
    title: 'Bank of America will cut 3,000+ jobs in back-office automation push',
    description: 'AI and RPA investments are replacing manual back-office roles at scale. The CFO has publicly committed to keeping headcount flat YoY, implying significant cuts to offset hiring',
    expiresAt: futureDate(20), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 315, noPool: 185, outcome: null, createdAt: pastDate(2), viewCount: 3455, shareCount: 0,
  },
  {
    id: 'evt-7', companyId: 'comp-13', companyName: 'AT&T',
    title: 'AT&T completed a 10% workforce reduction in H1',
    description: 'After months of speculation, AT&T confirmed cuts across its wireline and corporate divisions',
    expiresAt: pastDate(10), status: 'resolved', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 700, noPool: 150, outcome: 'yes', createdAt: pastDate(40), viewCount: 8102, shareCount: 0,
  },
  {
    id: 'evt-8', companyId: 'comp-43', companyName: 'Cognizant',
    title: 'Cognizant will miss its Q2 revenue guidance',
    description: 'Discretionary IT spending cuts by enterprise clients have slowed deal closings. Multiple analysts have flagged the risk of a guidance miss',
    expiresAt: pastDate(5), status: 'expired', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 220, noPool: 280, outcome: null, createdAt: pastDate(45), viewCount: 2334, shareCount: 0,
  },

  // BNY predictions
  {
    id: 'evt-b1', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will announce workforce reduction impacting 3,000+ roles by end of summer',
    description: 'BNY Mellon has been heavily investing in automation and AI across custody, clearing, and wealth management divisions. Internal attrition is already above historical averages as employees anticipate changes. Multiple business units have frozen hiring and restricted travel, signaling a major restructuring wave is imminent',
    expiresAt: futureDate(85), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 580, noPool: 170, outcome: null, createdAt: pastDate(7), viewCount: 8102, shareCount: 0,
  },
  {
    id: 'evt-b2', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY Pershing will consolidate back-office operations and cut 15%+ of division headcount',
    description: 'Pershing has been under significant pressure from low margin commission-free trading and digital adoption by rivals. The technology and operations teams have been told to prepare efficiency plans. Consolidation of multiple legacy systems is underway with offshore centers in India already scaling up to absorb current Pershing workflows',
    expiresAt: futureDate(70), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 420, noPool: 210, outcome: null, createdAt: pastDate(6), viewCount: 6212, shareCount: 0,
  },
  {
    id: 'evt-b3', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will shift more U.S. technology and operations work to India and Southeast Asia',
    description: 'BNY has substantially expanded engineering centers in Bangalore and Vietnam. New tech hires are predominantly offshore-based while U.S. hiring has slowed dramatically. Internal tools training and knowledge transfer initiatives are creating a clear predecessor-replacement pipeline. Senior technologists report being asked to mentor offshore peers',
    expiresAt: futureDate(80), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 510, noPool: 150, outcome: null, createdAt: pastDate(5), viewCount: 7015, shareCount: 0,
  },

  // Johnson & Johnson predictions
  {
    id: 'evt-j1', companyId: 'comp-54', companyName: 'Johnson & Johnson',
    title: 'J&J will announce a significant workforce reduction in pharma or medical device divisions',
    description: 'J&J has been consolidating manufacturing footprints and eliminating redundancies post-acquisition integrations. Patent cliff pressures on legacy drugs are forcing efficiency initiatives. Internal reorganizations in R&D have accelerated with multiple lab closures already announced. The company faces regulatory headwinds and generics competition intensifying across key franchises',
    expiresAt: futureDate(75), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 490, noPool: 180, outcome: null, createdAt: pastDate(5), viewCount: 6821, shareCount: 0,
  },
  {
    id: 'evt-j2', companyId: 'comp-54', companyName: 'Johnson & Johnson',
    title: 'J&J will accelerate offshoring of clinical operations and medical affairs roles to India or Eastern Europe',
    description: 'J&J has been expanding clinical trial operations in lower-cost countries. Medical writing and regulatory affairs teams are increasingly being centralized offshore. The company is building new centers in India and Poland with rapid scaling. U.S.-based clinical staff report being asked to train offshore replacements and document standard procedures',
    expiresAt: futureDate(82), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 420, noPool: 210, outcome: null, createdAt: pastDate(4), viewCount: 5634, shareCount: 0,
  },
  {
    id: 'evt-j3', companyId: 'comp-54', companyName: 'Johnson & Johnson',
    title: 'J&J will consolidate manufacturing sites and reduce supply chain workforce by 10%+ by summer',
    description: 'J&J\'s manufacturing efficiency initiative is moving forward with plans to close 2-3 smaller facilities and consolidate production. Supply chain and logistics roles are being evaluated for automation and consolidation. Multiple plants have already initiated early retirement packages. The company is targeting 5-7% headcount reduction in manufacturing and supply chain by August',
    expiresAt: futureDate(78), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 380, noPool: 240, outcome: null, createdAt: pastDate(3), viewCount: 4912, shareCount: 0,
  },

  // ADP predictions
  {
    id: 'evt-a1', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP will conduct its annual June layoff round in 2025, as it has every year',
    description: 'ADP has run layoffs in June every year like clockwork, timed to its fiscal year end. Employees treat it as a certainty — the only question is which teams get hit. Director-level positions and recently reorganized divisions are historically most at risk. Internal signs point to another round this June',
    expiresAt: futureDate(30), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 620, noPool: 80, outcome: null, createdAt: pastDate(9), viewCount: 8441, shareCount: 0,
  },
  {
    id: 'evt-a2', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP will close at least 3 more legacy office buildings this year as it consolidates to hubs',
    description: 'ADP has already shrunk its Roseland, NJ headquarters from five buildings to one-and-a-half. The same playbook is being rolled out nationally — closing smaller field offices and funneling employees into regional "Centers of Excellence" in Norfolk, VA, Maitland, FL, El Paso, TX, and Phoenix, AZ',
    expiresAt: futureDate(60), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 480, noPool: 220, outcome: null, createdAt: pastDate(7), viewCount: 6123, shareCount: 0,
  },
  {
    id: 'evt-a3', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP will eliminate all remaining homeshored (WFH) roles before end of 2025',
    description: 'ADP converted thousands of employees to work-from-home status years ago, then reversed course. Homeshored employees have been told to report to new hub locations or leave. Insiders say the final wave of WFH terminations is being processed — no exceptions are being made regardless of tenure or performance',
    expiresAt: futureDate(45), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 540, noPool: 160, outcome: null, createdAt: pastDate(6), viewCount: 7209, shareCount: 0,
  },
  {
    id: 'evt-a4', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP will cut 500+ director and VP-level positions in its tax and compliance division',
    description: 'ADP\'s tax division has been a repeated target of restructuring. Director-level roles are being eliminated as layers of management are compressed. Multiple sources confirm that compliance and payroll tax teams received PIP notices ahead of the last two June cycles. A third wave is widely anticipated',
    expiresAt: futureDate(35), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 390, noPool: 210, outcome: null, createdAt: pastDate(5), viewCount: 5334, shareCount: 0,
  },
  {
    id: 'evt-a5', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP will expand its India offshore center to replace at least 1,000 US-based roles',
    description: 'ADP employees have reported being asked to train offshore counterparts in India "with enthusiasm." Job postings for equivalent roles in India-based ADP offices have increased significantly while US postings in the same functions have dried up. The pattern mirrors what played out in operations and IT support two years ago',
    expiresAt: futureDate(90), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 460, noPool: 240, outcome: null, createdAt: pastDate(4), viewCount: 4987, shareCount: 0,
  },
  {
    id: 'evt-a6', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP\'s Maitland, FL hub will see significant headcount cuts as the hub model stalls',
    description: 'Maitland was positioned as one of ADP\'s flagship Centers of Excellence. But teams there have already been hit with layoffs and the promised growth in headcount never materialized. Employees relocated to Maitland report that their division\'s work is being redistributed offshore, undermining the hub rationale entirely',
    expiresAt: futureDate(50), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 310, noPool: 290, outcome: null, createdAt: pastDate(3), viewCount: 3812, shareCount: 0,
  },
  {
    id: 'evt-a7', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP will sell or fully vacate its Roseland, NJ headquarters campus within 2 years',
    description: 'The Roseland campus has been gutted — five buildings down to barely one. Real estate carrying costs on empty corporate campuses are a board-level priority to eliminate. Several other large HQ campuses in similar conditions have been sold or leased back. Roseland is the next likely candidate',
    expiresAt: futureDate(150), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 340, noPool: 360, outcome: null, createdAt: pastDate(3), viewCount: 3201, shareCount: 0,
  },
  {
    id: 'evt-a8', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP\'s stock will underperform the S&P 500 over the next 12 months amid restructuring drag',
    description: 'ADP\'s repeated restructuring cycles are beginning to show up in client satisfaction scores and service quality metrics. Institutional investors have flagged execution risk from overlapping transformation initiatives. If client churn ticks up alongside the headcount reductions, revenue growth will miss consensus estimates',
    expiresAt: futureDate(180), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 280, noPool: 320, outcome: null, createdAt: pastDate(2), viewCount: 2789, shareCount: 0,
  },
  {
    id: 'evt-a9', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP confirmed June 2024 layoffs affecting hundreds of US-based employees across divisions',
    description: 'Leadership informed teams of the reduction in late May. The Maitland and Roseland locations were hit hardest. Several director-level positions were eliminated with little notice. Affected employees reported receiving standard severance packages with non-disparagement clauses',
    expiresAt: pastDate(7), status: 'resolved', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 710, noPool: 90, outcome: 'yes', createdAt: pastDate(60), viewCount: 11234, shareCount: 0,
  },
  {
    id: 'evt-a10', companyId: 'comp-2', companyName: 'ADP',
    title: 'ADP will require all remote employees to return to office or accept severance by Q4',
    description: 'ADP has already eliminated homeshored roles in waves. The next phase targets hybrid employees who have resisted RTO mandates at hub locations. Internal HR communications reference a "workforce alignment initiative" that insiders interpret as a final push to convert or cut anyone still working remote',
    expiresAt: futureDate(75), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 500, noPool: 200, outcome: null, createdAt: pastDate(1), viewCount: 6102, shareCount: 0,
  },

  // Meta predictions
  {
    id: 'evt-m1', companyId: 'comp-53', companyName: 'Meta',
    title: 'Meta will complete its 10% workforce reduction (8,000 jobs) by end of Q2 2026',
    description: 'Meta CEO Mark Zuckerberg announced a 10% reduction in workforce starting May 2026. With around 80,000 employees, this affects approximately 8,000 workers. The company is shifting 7,000 into AI roles while eliminating management layers. Timeline suggests completion by end of Q2.',
    expiresAt: futureDate(45), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 680, noPool: 220, outcome: null, createdAt: pastDate(3), viewCount: 9823, shareCount: 0,
  },
  {
    id: 'evt-m2', companyId: 'comp-53', companyName: 'Meta',
    title: 'Meta will announce additional workforce reductions in H2 2026 beyond the initial 10%',
    description: 'Zuckerberg declined to rule out further reductions in the second half of 2026. With AI infrastructure spending ballooning to $125-145 billion annually and compensation cuts already implemented, more layoffs appear likely as the company prioritizes AI over traditional roles.',
    expiresAt: futureDate(180), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 520, noPool: 380, outcome: null, createdAt: pastDate(2), viewCount: 7654, shareCount: 0,
  },
  {
    id: 'evt-m3', companyId: 'comp-53', companyName: 'Meta',
    title: 'Meta will cut compensation further in 2027 beyond 2026 reductions',
    description: 'Meta has already trimmed annual raises by 5% in February 2026 and 10% the year prior. Median total compensation dropped from $417,400 in 2024 to $388,200 in 2025. With massive AI infrastructure costs, another compensation cut appears likely in 2027.',
    expiresAt: futureDate(240), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 450, noPool: 270, outcome: null, createdAt: pastDate(2), viewCount: 5432, shareCount: 0,
  },
  {
    id: 'evt-m4', companyId: 'comp-53', companyName: 'Meta',
    title: 'Meta will shift more than 7,000 employees to AI roles without backfill',
    description: 'Meta is transferring approximately 7,000 employees into new AI initiatives to address critical skill gaps in AI infrastructure. The question is whether these teams will be fully backfilled from engineering or if other departments will be hollowed out.',
    expiresAt: futureDate(120), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 590, noPool: 310, outcome: null, createdAt: pastDate(1), viewCount: 6789, shareCount: 0,
  },
  {
    id: 'evt-m5', companyId: 'comp-53', companyName: 'Meta',
    title: 'Meta senior staff departures will accelerate as middle management layers are cut',
    description: 'Meta is actively flattening organizational structures and eliminating management layers. Historical pattern shows executive departures accelerate during major restructuring as senior leaders lose direct reports and influence. Some may opt for severance rather than relocate or restructure their teams.',
    expiresAt: futureDate(90), status: 'active', creatorId: 'user-eliot', creatorName: 'eliotsjunkmail@gmail.com',
    yesPool: 420, noPool: 280, outcome: null, createdAt: pastDate(1), viewCount: 5123, shareCount: 0,
  },
]

const SEED_COMMENTS: Comment[] = [
  { id: 'cmt-1', eventId: 'evt-1', userId: 'sys-user', content: 'I work there — the vibes are awful. Managers stopped approving expenses and travel two months ago', createdAt: pastDate(3) },
  { id: 'cmt-2', eventId: 'evt-1', userId: 'sys-user', content: 'They laid off my whole team last cycle and called it a "reorg." Same playbook incoming', createdAt: pastDate(2) },
  { id: 'cmt-3', eventId: 'evt-1', userId: 'sys-user', content: 'Cord-cutting is not slowing down. The math doesn\'t work without headcount cuts', createdAt: pastDate(0) },
  { id: 'cmt-4', eventId: 'evt-2', userId: 'sys-user', content: 'AT&T has been doing rolling layoffs for 5 years. There\'s no floor', createdAt: pastDate(2) },
  { id: 'cmt-5', eventId: 'evt-2', userId: 'sys-user', content: 'They offshored my department last year. What\'s left to cut?', createdAt: pastDate(1) },
  { id: 'cmt-6', eventId: 'evt-4', userId: 'sys-user', content: 'Splunk had a totally different culture. The integration is going to be brutal', createdAt: pastDate(1) },
  { id: 'cmt-7', eventId: 'evt-5', userId: 'sys-user', content: 'The CVS near me already closed. This is already happening', createdAt: pastDate(4) },
  { id: 'cmt-8', eventId: 'evt-5', userId: 'sys-user', content: 'Walgreens is doing the same thing. Standalone pharmacy is dying', createdAt: pastDate(2) },
  // BNY comments
  { id: 'cmt-b1', eventId: 'evt-b1', userId: 'sys-user', content: 'The hiring freeze started quietly 3 weeks ago. They told us "resource optimization" but everyone knows what\'s coming', createdAt: pastDate(7) },
  { id: 'cmt-b2', eventId: 'evt-b1', userId: 'sys-user', content: 'My group already lost 4 people to "organizational restructuring" this quarter. This is just the prelude', createdAt: pastDate(5) },
  { id: 'cmt-b3', eventId: 'evt-b2', userId: 'sys-user', content: 'Pershing losing clients left and right. They\'re consolidating everything into two centers. Settlement ops is getting hollowed out', createdAt: pastDate(6) },
  { id: 'cmt-b4', eventId: 'evt-b3', userId: 'sys-user', content: 'Training my offshore replacement in Bangalore right now. They won\'t even make it subtle at this point', createdAt: pastDate(4) },
  { id: 'cmt-b5', eventId: 'evt-b3', userId: 'sys-user', content: 'All the senior tech roles are moving offshore. New engineering team is 80% based in India now. We\'re being managed out', createdAt: pastDate(3) },
  // Johnson & Johnson comments
  { id: 'cmt-j1', eventId: 'evt-j1', userId: 'sys-user', content: 'Patent cliffs hitting hard. They already shut down two R&D labs last quarter with minimal announcement', createdAt: pastDate(4) },
  { id: 'cmt-j2', eventId: 'evt-j1', userId: 'sys-user', content: 'The manufacturing consolidation plans are real. My facility is on the closure list according to internal sources', createdAt: pastDate(2) },
  { id: 'cmt-j3', eventId: 'evt-j2', userId: 'sys-user', content: 'Clinical trials moving to India and Poland rapidly. U.S. medical affairs team size is shrinking by the month', createdAt: pastDate(5) },
  { id: 'cmt-j4', eventId: 'evt-j2', userId: 'sys-user', content: 'Training my replacement in Bangalore. Corporate says "knowledge transfer" but we all know the score', createdAt: pastDate(3) },
  { id: 'cmt-j5', eventId: 'evt-j3', userId: 'sys-user', content: 'Early retirement packages being offered in supply chain. Once those are done, the RIF will follow', createdAt: pastDate(1) },
  // ADP comments
  { id: 'cmt-a1', eventId: 'evt-a1', userId: 'sys-user', content: 'June layoffs at ADP are as predictable as tax season. Set your calendar', createdAt: pastDate(7) },
  { id: 'cmt-a2', eventId: 'evt-a1', userId: 'sys-user', content: 'Been here 11 years. It\'s June every single time. The only variable is which floor gets cleared', createdAt: pastDate(5) },
  { id: 'cmt-a3', eventId: 'evt-a1', userId: 'sys-user', content: 'Leadership briefed on scope already. Wider than last year. Whole business units being eliminated not just individuals', createdAt: pastDate(3) },
  { id: 'cmt-a4', eventId: 'evt-a2', userId: 'sys-user', content: 'My building had 400 people two years ago. We\'re down to maybe 60. The lights are literally off on two floors', createdAt: pastDate(6) },
  { id: 'cmt-a5', eventId: 'evt-a3', userId: 'sys-user', content: 'They told us to report to Norfolk or resign. Nobody wanted to relocate so most of us just waited for the package', createdAt: pastDate(4) },
  { id: 'cmt-a6', eventId: 'evt-a3', userId: 'sys-user', content: 'Homeshored since 2019. Got the "alignment" email last month. We all know what that means', createdAt: pastDate(2) },
  { id: 'cmt-a7', eventId: 'evt-a5', userId: 'sys-user', content: 'I spent 3 months documenting everything for my offshore replacement. They called it "knowledge transfer."', createdAt: pastDate(5) },
  { id: 'cmt-a8', eventId: 'evt-a5', userId: 'sys-user', content: 'My manager actually said "train them with enthusiasm." I could not make this up', createdAt: pastDate(3) },
  { id: 'cmt-a9', eventId: 'evt-a9', userId: 'sys-user', content: 'Was in the Maitland group. Got the call on a Tuesday at 10am. Badge stopped working by noon', createdAt: pastDate(20) },
  { id: 'cmt-a10', eventId: 'evt-a10', userId: 'sys-user', content: 'The "alignment initiative" email is HR code for figure out if you\'re going to make the drive or take the package', createdAt: pastDate(1) },
  // Meta comments
  { id: 'cmt-m1', eventId: 'evt-m1', userId: 'sys-user', content: '$125-145 billion on AI infrastructure is insane. Something has to give. The layoffs are just the start.', createdAt: pastDate(4) },
  { id: 'cmt-m2', eventId: 'evt-m1', userId: 'sys-user', content: 'Zuck framed this as "AI Year" but really it\'s cost-cutting disguised as strategy. The math doesn\'t work any other way.', createdAt: pastDate(3) },
  { id: 'cmt-m3', eventId: 'evt-m2', userId: 'sys-user', content: 'He literally said he won\'t rule out MORE cuts in H2. That\'s code for "yes we\'re doing this again, I just don\'t want the headlines now"', createdAt: pastDate(2) },
  { id: 'cmt-m4', eventId: 'evt-m3', userId: 'sys-user', content: 'Comp cuts in 2024, more cuts in 2025, more cuts coming in 2026, and they\'re talking 2027? This is death by a thousand cuts.', createdAt: pastDate(2) },
  { id: 'cmt-m5', eventId: 'evt-m4', userId: 'sys-user', content: 'Shifting 7000 people to AI while cutting staff elsewhere. That team is going to be stressed to the max. Burnout incoming.', createdAt: pastDate(1) },
  { id: 'cmt-m6', eventId: 'evt-m5', userId: 'sys-user', content: 'When they flatten orgs this aggressively, senior folks always bail. Why stick around if your org chart just got nuked?', createdAt: pastDate(1) },
]

interface StoreState {
  currentUser: User | null
  guestCoins: number
  users: User[]
  companies: Company[]
  events: Event[]
  bets: Bet[]
  comments: Comment[]
  theme: Theme
  onboardingCompanyId: string | null
  favoriteCompanyIds: string[]
  pinnedEventIds: string[]
  feedback: FeedbackItem[]
  anonVotedEvents: Record<string, { lastSide: 'yes' | 'no'; count: number }>
  companyLastVisit: Record<string, string>
  markCompanyVisited: (companyId: string) => void

  login: (username: string, password: string) => boolean
  logout: () => void
  initializeAnonymousUser: () => Promise<void>
  migrateGuestBets: () => void
  register: (username: string, password: string) => { ok: boolean; error?: string }
  checkDailyCoins: () => void
  updateCoins: (amount: number) => void
  addCoin: () => Promise<void>
  setTheme: (theme: Theme) => void
  setOnboardingCompany: (companyId: string) => void
  toggleFavoriteCompany: (companyId: string) => void
  togglePinnedEvent: (eventId: string) => void
  addFeedback: (text: string, type: string) => void
  markFeedback: (id: string, status: 'completed' | 'ignored') => void
  clearAllFeedback: () => void
  deleteFeedback: (id: string) => void

  placeAnonymousVote: (eventId: string, side: 'yes' | 'no', amount?: number) => boolean
  placeBet: (eventId: string, side: 'yes' | 'no', amount: number) => boolean
  removeBet: (eventId: string) => void
  removeAnonymousVote: (eventId: string) => void
  getUserBet: (eventId: string) => Bet | undefined
  createEvent: (data: Omit<Event, 'id' | 'creatorId' | 'creatorName' | 'yesPool' | 'noPool' | 'outcome' | 'createdAt' | 'status' | 'viewCount' | 'shareCount'> & { initialSide?: 'yes' | 'no' }) => boolean
  updateEvent: (eventId: string, data: { title: string; description: string; expiresAt: string; companyId: string; companyName: string }) => void
  resolveEvent: (eventId: string, outcome: 'yes' | 'no') => void
  archiveEvent: (eventId: string) => void
  deleteEvent: (eventId: string) => void

  addCompany: (name: string, description: string, industry: string) => void
  updateCompany: (id: string, name: string, description: string, industry: string) => void
  deleteCompany: (id: string) => void

  addComment: (eventId: string, content: string) => { ok: boolean; error?: string }
  editComment: (id: string, content: string) => { ok: boolean; error?: string }
  deleteComment: (id: string) => boolean
  upvoteComment: (commentId: string) => void
  recordShare: (eventId: string) => void
  upvotedCommentIds: string[]

  getEffectiveStatus: (event: Event) => Event['status']
  banUser: (userId: string) => void
  restoreSession: () => void
  syncCommentsFromServer: () => Promise<void>
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      guestCoins: 50,
      users: SEED_USERS,
      companies: SEED_COMPANIES,
      events: SEED_EVENTS,
      bets: [],
      comments: SEED_COMMENTS,
      theme: 'light',
      onboardingCompanyId: null,
      favoriteCompanyIds: [],
      pinnedEventIds: [],
      feedback: [],
      anonVotedEvents: {},
      companyLastVisit: {},
      upvotedCommentIds: [],

      setTheme: (theme) => set({ theme }),
      setOnboardingCompany: (companyId) => set({ onboardingCompanyId: companyId }),
      toggleFavoriteCompany: (companyId) => {
        const currentState = get()
        const isCurrentlyFavorite = currentState.favoriteCompanyIds.includes(companyId)
        const updated = isCurrentlyFavorite
          ? currentState.favoriteCompanyIds.filter(id => id !== companyId)
          : [...currentState.favoriteCompanyIds, companyId]

        console.log(`[toggleFavoriteCompany] ${companyId}: ${isCurrentlyFavorite ? 'removing' : 'adding'}, new favs:`, updated)

        const userId = currentState.currentUser?.id || 'guest'
        if (isCurrentlyFavorite) {
          api.removeFavorite(userId, companyId).catch(err => console.error('Failed to sync favorite:', err))
        } else {
          api.addFavorite(userId, companyId).catch(err => console.error('Failed to sync favorite:', err))
        }

        // Update store state first
        set({ favoriteCompanyIds: updated })

        // For anonymous users, persist to both localStorage and cookie AFTER store update
        if (!currentState.currentUser && typeof window !== 'undefined') {
          // Store in the persist middleware key so it's properly saved
          const fullState = get()
          const stateToSave = {
            users: fullState.users,
            companies: fullState.companies,
            events: fullState.events,
            bets: fullState.bets,
            comments: fullState.comments,
            currentUser: fullState.currentUser,
            theme: fullState.theme,
            onboardingCompanyId: fullState.onboardingCompanyId,
            favoriteCompanyIds: updated,
            pinnedEventIds: fullState.pinnedEventIds,
            feedback: fullState.feedback,
            anonVotedEvents: fullState.anonVotedEvents,
            companyLastVisit: fullState.companyLastVisit,
            upvotedCommentIds: fullState.upvotedCommentIds,
          }
          localStorage.setItem('layoff-bets-store-v6', JSON.stringify(stateToSave))

          // Also backup to lb-anon-favorites for cookie
          localStorage.setItem('lb-anon-favorites', JSON.stringify(updated))

          // Store in cookie with 30 day expiration
          const expiryDate = new Date()
          expiryDate.setDate(expiryDate.getDate() + 30)
          document.cookie = `lb-anon-favorites=${JSON.stringify(updated)}; expires=${expiryDate.toUTCString()}; path=/`

          console.log('[toggleFavoriteCompany] persisted to localStorage and cookie')
        }
      },

      togglePinnedEvent: (eventId) => set(s => ({
        pinnedEventIds: s.pinnedEventIds.includes(eventId)
          ? s.pinnedEventIds.filter(id => id !== eventId)
          : [...s.pinnedEventIds, eventId],
      })),

      markCompanyVisited: (companyId) => set(s => ({
        companyLastVisit: { ...s.companyLastVisit, [companyId]: new Date().toISOString() },
      })),

      placeAnonymousVote: (eventId, side, amount = 10) => {
        const { events, anonVotedEvents, getEffectiveStatus } = get()
        const existing = anonVotedEvents[eventId]
        const event = events.find(e => e.id === eventId)
        if (!event || getEffectiveStatus(event) !== 'active') return false
        set(s => ({
          anonVotedEvents: {
            ...s.anonVotedEvents,
            [eventId]: { lastSide: side, count: (existing?.count ?? 0) + 1 },
          },
          events: s.events.map(e => e.id === eventId ? {
            ...e,
            yesPool: side === 'yes' ? e.yesPool + amount : e.yesPool,
            noPool:  side === 'no'  ? e.noPool  + amount : e.noPool,
          } : e),
        }))
        return true
      },

      removeAnonymousVote: (eventId) => {
        const { anonVotedEvents, events, guestCoins, getEffectiveStatus } = get()
        const vote = anonVotedEvents[eventId]
        if (!vote) return
        const event = events.find(e => e.id === eventId)
        if (!event || getEffectiveStatus(event) !== 'active') return
        const amount = vote.count * 10
        const newVotes = { ...anonVotedEvents }
        delete newVotes[eventId]
        set(s => ({
          guestCoins: guestCoins + amount,
          anonVotedEvents: newVotes,
          events: s.events.map(e => e.id === eventId ? {
            ...e,
            yesPool: vote.lastSide === 'yes' ? Math.max(0, e.yesPool - amount) : e.yesPool,
            noPool:  vote.lastSide === 'no'  ? Math.max(0, e.noPool  - amount) : e.noPool,
          } : e),
        }))
      },

      addFeedback: (text, type) => set(s => ({
        feedback: [...s.feedback, { id: `fb-${uid()}`, text: text.trim(), type: type as FeedbackItem['type'], createdAt: new Date().toISOString(), status: 'active' }]
      })),

      markFeedback: (id, status) => set(s => ({
        feedback: s.feedback.map(f => f.id === id ? { ...f, status } : f),
      })),

      clearAllFeedback: () => set({ feedback: [] }),

      deleteFeedback: (id) => set(s => ({ feedback: s.feedback.filter(f => f.id !== id) })),

      login: (username, password) => {
        const user = get().users.find(
          u => u.username && u.password && u.username.toLowerCase() === username.toLowerCase() && u.password === password
        )
        if (!user) return false
        set({ currentUser: user })
        // Persist user to localStorage for session persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('layoff-bets-currentUser', JSON.stringify(user))
        }
        // Load user's favorites from server
        api.getFavorites(user.id)
          .then(favorites => {
            console.log('[login] Loaded favorites from server:', favorites)
            set({ favoriteCompanyIds: favorites })
          })
          .catch(err => console.error('[login] Failed to load favorites:', err))
        get().checkDailyCoins()
        get().migrateGuestBets()
        return true
      },

      logout: () => {
        localStorage.removeItem('anonCoins')
        localStorage.removeItem('anonCoinsSpent')
        localStorage.removeItem('layoff-bets-currentUser')
        set({ currentUser: null, guestCoins: 50, favoriteCompanyIds: [] })
      },

      initializeAnonymousUser: async () => {
        try {
          // Try to get existing anonymous user ID from localStorage
          const storedAnonUserId = localStorage.getItem('layoff-bets-anonUserId') || undefined

          // Create or retrieve anonymous user from server
          const anonUser = await api.createOrGetAnonymousUser(storedAnonUserId)

          // Store the anonymous user ID locally
          localStorage.setItem('layoff-bets-anonUserId', anonUser.id)

          // Update store with anonymous user
          set(s => ({
            users: [...s.users.filter(u => u.id !== anonUser.id), anonUser],
            guestCoins: anonUser.coins || 50,
          }))
        } catch (error) {
          console.error('Failed to initialize anonymous user:', error)
        }
      },

      migrateGuestBets: () => {
        const { currentUser, anonVotedEvents, bets, events } = get()
        if (!currentUser) return

        const anonCoins = parseInt(localStorage.getItem('anonCoins') || '50')
        const anonCoinsSpent = parseInt(localStorage.getItem('anonCoinsSpent') || '0')
        const remainingCoins = Math.max(0, anonCoins - anonCoinsSpent)
        const newBets: Bet[] = []

        Object.entries(anonVotedEvents).forEach(([eventId, vote]) => {
          const event = events.find(e => e.id === eventId)
          if (event) {
            const amount = vote.count * 10
            const bet: Bet = {
              id: `bet-${uid()}`,
              eventId,
              userId: currentUser.id,
              side: vote.lastSide,
              amount,
              createdAt: new Date().toISOString(),
            }
            newBets.push(bet)
          }
        })

        set(s => ({
          currentUser: {
            ...currentUser,
            coins: Math.min(currentUser.coins + remainingCoins, 999),
          },
          bets: [...bets, ...newBets],
          anonVotedEvents: {},
        }))
        localStorage.removeItem('anonCoinsSpent')
        localStorage.removeItem('anonCoins')
      },

      register: (username, password) => {
        if (!username || !password) return { ok: false, error: 'Username and password are required.' }

        // Check locally first for immediate feedback on duplicate
        const localExists = get().users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase())
        if (localExists) return { ok: false, error: 'Username already taken.' }

        // Register on server first (synchronous from user perspective, but validation is server-side)
        console.log('[Store] Registering user on server:', username)
        api.register(username, password)
          .then((serverUser) => {
            console.log('[Store] Registration successful on server:', serverUser)

            // Migrate anonymous user data to new account
            const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
            const { users, bets, favoriteCompanyIds } = get()
            const anonUser = anonUserId ? users.find(u => u.id === anonUserId) : null

            let updatedUser = { ...serverUser }
            let migratedBets = [...bets]
            let migratedFavorites = [...favoriteCompanyIds]

            if (anonUser) {
              console.log('[Store] Migrating data from anonymous user:', anonUserId)

              // Migrate bets: reassign all anon user bets to new user
              migratedBets = bets.map(b =>
                b.userId === anonUser.id
                  ? { ...b, userId: serverUser.id }
                  : b
              )

              // Add 100 coin bonus + any remaining anon coins
              const bonusCoins = 100 + (anonUser.coins || 0)
              updatedUser = {
                ...serverUser,
                coins: Math.min(serverUser.coins + bonusCoins, 999)
              }

              // Favorites are already owned by user, no migration needed
              // (they're stored separately from user account)
            } else {
              // No anonymous user to migrate, just add 100 coin bonus
              updatedUser = {
                ...serverUser,
                coins: Math.min(serverUser.coins + 100, 999)
              }
            }

            // Update store with migrated data
            set(s => ({
              users: [...s.users.filter(u => u.id !== serverUser.id), updatedUser],
              currentUser: updatedUser,
              bets: migratedBets,
              favoriteCompanyIds: migratedFavorites
            }))

            // Persist to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('layoff-bets-currentUser', JSON.stringify(updatedUser))
            }

            // Migrate old guest bets if they exist
            get().migrateGuestBets()
          })
          .catch(err => {
            console.error('[Store] Registration failed on server:', err)
            // Don't add to local store if server registration fails
            set({ currentUser: null })
            if (typeof window !== 'undefined') {
              localStorage.removeItem('layoff-bets-currentUser')
            }
          })

        return { ok: true }
      },

      checkDailyCoins: () => {
        const { currentUser, users } = get()
        if (!currentUser) return
        const t = today()
        if (currentUser.lastCoinsDate === t) return
        const updated = { ...currentUser, coins: Math.min(currentUser.coins + DAILY_COINS, 999), lastCoinsDate: t }
        set(s => ({
          currentUser: updated,
          users: s.users.map(u => u.id === updated.id ? updated : u),
        }))
      },

      updateCoins: (amount) => {
        const { currentUser } = get()
        if (!currentUser) return
        const updated = { ...currentUser, coins: Math.min(currentUser.coins + amount, 999) }
        set(s => ({
          currentUser: updated,
          users: s.users.map(u => u.id === updated.id ? updated : u),
        }))
      },

      addCoin: async () => {
        const { currentUser } = get()
        if (!currentUser) return
        try {
          const updated = await api.addCoin(currentUser.id)
          set(s => ({
            currentUser: updated,
            users: s.users.map(u => u.id === updated.id ? updated : u),
          }))
        } catch (error) {
          console.error('Failed to add coin:', error)
        }
      },

      placeBet: (eventId, side, amount) => {
        const { currentUser, guestCoins, events, bets, users } = get()
        const isGuest = !currentUser
        // Use anonymous user from server if available, fallback to 'user-guest'
        const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
        const anonUser = anonUserId ? users.find(u => u.id === anonUserId) : users.find(u => u.isAnonymous)
        const userId = currentUser?.id ?? anonUser?.id ?? 'user-guest'
        const userCoins = currentUser?.coins ?? anonUser?.coins ?? guestCoins

        const event = events.find(e => e.id === eventId)
        if (!event) return false
        if (get().getEffectiveStatus(event) !== 'active') return false

        const existing = bets.find(b => b.eventId === eventId && b.userId === userId)

        // ── No prior bet: simple new position ──────────────────────────────
        if (!existing) {
          if (!isGuest && amount > 100) return false
          if (userCoins < amount) return false

          const newCoins = isGuest && !anonUser ? guestCoins - amount : (currentUser?.coins ?? anonUser?.coins ?? guestCoins) - amount
          const tempBetId = `pending-${uid()}`

          // For both logged-in and guest users, create local bet immediately
          const bet: Bet = { id: tempBetId, eventId, userId, side, amount, createdAt: new Date().toISOString() }
          set((s): any => {
            let stateUpdate: any = {
              bets: [...s.bets, bet],
              events: s.events.map(e => e.id === eventId ? { ...e, yesPool: side === 'yes' ? e.yesPool + amount : e.yesPool, noPool: side === 'no' ? e.noPool + amount : e.noPool } : e)
            }
            if (currentUser) {
              stateUpdate.currentUser = { ...currentUser, coins: newCoins }
              stateUpdate.users = s.users.map(u => u.id === currentUser.id ? { ...u, coins: newCoins } : u)
            } else if (anonUser) {
              stateUpdate.users = s.users.map(u => u.id === anonUser.id ? { ...u, coins: newCoins } : u)
            } else {
              stateUpdate.guestCoins = newCoins
            }
            return stateUpdate
          })

          // Send to server for both logged-in and anonymous users
          if (currentUser || anonUser) {
            api.placeBet({ eventId, userId, side, amount })
              .then((serverBet) => {
                // Replace pending bet ID with server bet ID in the store
                set(s => ({
                  bets: s.bets.map(b => b.id === tempBetId ? { ...serverBet } : b)
                }))
                api.updateUser(userId, { coins: newCoins })
                  .then(() => {
                    get().syncCommentsFromServer()
                  })
                  .catch(err => console.error('Failed to update coins:', err))
              })
              .catch(err => console.error('Failed to place bet:', err))
          }

          return true
        }

        // ── Same side: stack up to 100 total (only for logged-in) ──────────────────────────────
        if (existing.side === side) {
          const newAmount = existing.amount + amount
          if (!isGuest && newAmount > 100) return false
          if (userCoins < amount) return false
          const newCoins = isGuest && !anonUser ? guestCoins - amount : Math.min((currentUser?.coins ?? anonUser?.coins ?? guestCoins) - amount, 999)
          set((s): any => {
            let stateUpdate: any = {
              bets: s.bets.map(b => b.id === existing.id ? { ...b, amount: newAmount } : b),
              events: s.events.map(e => e.id === eventId ? { ...e, yesPool: side === 'yes' ? e.yesPool + amount : e.yesPool, noPool: side === 'no' ? e.noPool + amount : e.noPool } : e),
            }
            if (currentUser) {
              stateUpdate.currentUser = { ...currentUser, coins: newCoins }
              stateUpdate.users = s.users.map(u => u.id === currentUser.id ? { ...u, coins: newCoins } : u)
            } else if (anonUser) {
              stateUpdate.users = s.users.map(u => u.id === anonUser.id ? { ...u, coins: newCoins } : u)
            } else {
              stateUpdate.guestCoins = newCoins
            }
            return stateUpdate
          })

          // Update server with new bet amount
          if (currentUser || anonUser) {
            api.updateBet(existing.id, { amount: newAmount })
              .catch(err => console.error('Failed to update bet:', err))
            api.updateUser(userId, { coins: newCoins })
              .catch(err => console.error('Failed to update coins:', err))
          }

          return true
        }

        // ── Opposite side: cancel existing bet and create new one ──────────────────────────
        // When betting opposite side: cancel the existing bet (coins returned) and place new bet with swipe amount
        const netCost = amount  // Cost of the new bet
        if (userCoins < netCost) return false

        const newCoins = isGuest && !anonUser ? guestCoins - netCost : Math.min((currentUser?.coins ?? anonUser?.coins ?? guestCoins) - netCost, 999)

        // Remove existing bet and create new bet with swipe amount
        const withoutExisting = bets.filter(b => b.id !== existing.id)
        const newBets = [...withoutExisting, { id: `bet-${uid()}`, eventId, userId, side, amount, createdAt: new Date().toISOString() }]

        set((s): any => {
          let stateUpdate: any = {
            bets: newBets,
            events: s.events.map(e => e.id !== eventId ? e : {
              ...e,
              yesPool: Math.max(0, e.yesPool - (existing.side === 'yes' ? existing.amount : 0) + (side === 'yes' ? amount : 0)),
              noPool:  Math.max(0, e.noPool  - (existing.side === 'no'  ? existing.amount : 0) + (side === 'no'  ? amount : 0)),
            }),
          }
          if (currentUser) {
            stateUpdate.currentUser = { ...currentUser, coins: newCoins }
            stateUpdate.users = s.users.map(u => u.id === currentUser.id ? { ...u, coins: newCoins } : u)
          } else if (anonUser) {
            stateUpdate.users = s.users.map(u => u.id === anonUser.id ? { ...u, coins: newCoins } : u)
          } else {
            stateUpdate.guestCoins = newCoins
          }
          return stateUpdate
        })

        // Update server for opposite side bets
        if (currentUser || anonUser) {
          // Remove existing bet
          api.removeBet(existing.id)
            .catch(err => console.error('Failed to remove bet:', err))
          // Create new bet with swipe amount
          const newBetData = { eventId, userId, side, amount }
          api.placeBet(newBetData)
            .catch(err => console.error('Failed to place new bet:', err))
          api.updateUser(userId, { coins: newCoins })
            .catch(err => console.error('Failed to update coins:', err))
        }

        return true
      },

      removeBet: (eventId) => {
        const { currentUser, bets, events, getEffectiveStatus, users } = get()

        // Find the bet to remove - look for any bet with this eventId
        // For logged-in users, must match their ID
        // For anonymous users, find by anonUserId from localStorage
        let bet: Bet | undefined
        let userId: string | undefined
        let anonUser: User | undefined

        if (currentUser) {
          bet = bets.find(b => b.eventId === eventId && b.userId === currentUser.id)
          userId = currentUser.id
        } else {
          // For anonymous users, try to find by stored ID first, then fallback to any anonymous user
          const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
          anonUser = anonUserId ? users.find(u => u.id === anonUserId) : users.find(u => u.isAnonymous)

          if (anonUser) {
            bet = bets.find(b => b.eventId === eventId && b.userId === anonUser!.id)
            userId = anonUser.id
          }
        }

        if (!bet || !userId) return

        const newCoins = Math.min((currentUser?.coins ?? anonUser?.coins ?? 0) + bet.amount, 999)

        // Send to server
        api.removeBet(bet.id)
          .then(() => {
            if (currentUser || anonUser) {
              api.updateUser(userId!, { coins: newCoins })
                .catch(err => console.error('Failed to update coins:', err))
            }
          })
          .catch(err => console.error('Failed to remove bet:', err))

        // Update local state optimistically
        set((s): any => {
          let stateUpdate: any = {
            bets: s.bets.filter(b => !(b.eventId === eventId && b.userId === userId)),
            events: s.events.map(e => e.id === eventId ? {
              ...e,
              yesPool: bet.side === 'yes' ? Math.max(0, e.yesPool - bet.amount) : e.yesPool,
              noPool:  bet.side === 'no'  ? Math.max(0, e.noPool  - bet.amount) : e.noPool,
            } : e),
          }
          if (currentUser) {
            stateUpdate.currentUser = { ...currentUser, coins: newCoins }
            stateUpdate.users = s.users.map(u => u.id === currentUser.id ? { ...u, coins: newCoins } : u)
          } else if (anonUser) {
            stateUpdate.users = s.users.map(u => u.id === userId ? { ...u, coins: newCoins } : u)
          }
          return stateUpdate
        })
      },

      getUserBet: (eventId) => {
        const { currentUser, bets, users } = get()
        // Use anonymous user from server if available, fallback to 'user-guest'
        const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
        const anonUser = anonUserId ? users.find(u => u.id === anonUserId) : users.find(u => u.isAnonymous)
        const userId = currentUser?.id ?? anonUser?.id ?? 'user-guest'
        return bets.find(b => b.eventId === eventId && b.userId === userId)
      },

      createEvent: (data) => {
        const { currentUser, guestCoins, placeBet, placeAnonymousVote } = get()
        const { initialSide, ...eventData } = data as any
        const creatorId = currentUser?.id || 'anon'
        const creatorName = currentUser?.username || 'Guest'

        const costCoins = 10
        const userCoins = currentUser?.coins ?? guestCoins
        if (userCoins < costCoins) return false

        const event: Event = {
          ...eventData,
          id: `evt-${uid()}`,
          creatorId,
          creatorName,
          yesPool: 50,
          noPool: 50,
          outcome: null,
          status: 'active',
          viewCount: 0,
          shareCount: 0,
          createdAt: new Date().toISOString(),
        }

        set(s => ({ events: [event, ...s.events] }))

        if (initialSide) {
          if (currentUser) {
            placeBet(event.id, initialSide, costCoins)
          } else {
            placeAnonymousVote(event.id, initialSide, costCoins)
          }
        }
        return true
      },

      updateEvent: (eventId, data) => {
        set(s => ({
          events: s.events.map(e => e.id === eventId ? { ...e, ...data } : e),
        }))
      },

      resolveEvent: (eventId, outcome) => {
        const { events, bets, users } = get()
        const event = events.find(e => e.id === eventId)
        if (!event) return

        const totalPool = event.yesPool + event.noPool
        const winnerBets = bets.filter(b => b.eventId === eventId && b.side === outcome)
        const winnerPool = outcome === 'yes' ? event.yesPool : event.noPool
        const updatedUsers = [...users]

        winnerBets.forEach(bet => {
          const share = winnerPool > 0 ? (bet.amount / winnerPool) * totalPool : 0
          const payout = Math.floor(share)
          const idx = updatedUsers.findIndex(u => u.id === bet.userId)
          if (idx !== -1) updatedUsers[idx] = { ...updatedUsers[idx], coins: Math.min(updatedUsers[idx].coins + payout, 999) }
        })

        const { currentUser } = get()
        const updatedCurrent = currentUser ? updatedUsers.find(u => u.id === currentUser.id) ?? currentUser : null

        set({
          events: events.map(e => e.id === eventId ? { ...e, outcome, status: 'resolved' } : e),
          users: updatedUsers,
          currentUser: updatedCurrent,
        })
      },

      archiveEvent: (eventId) => {
        set(s => ({ events: s.events.map(e => e.id === eventId ? { ...e, status: 'archived' } : e) }))
      },

      deleteEvent: (eventId) => {
        set(s => ({
          events: s.events.filter(e => e.id !== eventId),
          bets: s.bets.filter(b => b.eventId !== eventId),
          comments: s.comments.filter(c => c.eventId !== eventId),
        }))
      },

      addCompany: (name, description, industry) => {
        const trimmed = name.trim()
        const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const company: Company = {
          id: `comp-${uid()}`,
          name: trimmed,
          slug,
          description: description.trim(),
          industry: industry.trim(),
          viewCount: 0,
          createdAt: new Date().toISOString(),
        }
        set(s => ({ companies: [...s.companies, company] }))
      },

      updateCompany: (id, name, description, industry) => {
        set(s => ({
          companies: s.companies.map(c => c.id === id ? { ...c, name: name.trim(), description: description.trim(), industry: industry.trim() } : c),
          events: s.events.map(e => e.companyId === id ? { ...e, companyName: name.trim() } : e),
        }))
      },

      deleteCompany: (id) => {
        set(s => ({
          companies: s.companies.filter(c => c.id !== id),
          events: s.events.filter(e => e.companyId !== id),
        }))
      },

      addComment: (eventId, content) => {
        const { currentUser } = get()
        if (!currentUser) return { ok: false, error: 'Must be logged in to comment' }

        const trimmed = content.trim()
        if (!trimmed) return { ok: false, error: 'Comment cannot be empty' }
        if (!validateNoPersonalNames(trimmed)) return { ok: false, error: 'Please avoid using personal names in comments' }

        const comment: Comment = {
          id: `cmt-${uid()}`,
          eventId,
          userId: currentUser.id,
          content: trimmed,
          createdAt: new Date().toISOString(),
        }

        // Add comment to local store immediately
        set(s => ({ comments: [...s.comments, comment] }))

        // Save to server asynchronously
        api.addComment(comment)
          .then(serverComment => {
            // Update with server ID if different
            if (serverComment.id !== comment.id) {
              set(s => ({
                comments: s.comments.map(c => c.id === comment.id ? serverComment : c)
              }))
            }
          })
          .catch(err => {
            console.error('[Store] Failed to save comment to server:', err)
            // Comment stays in local store even if server save fails
          })

        return { ok: true }
      },

      editComment: (id, content) => {
        const { currentUser, comments } = get()
        if (!currentUser) return { ok: false, error: 'Must be logged in to edit' }

        const comment = comments.find(c => c.id === id)
        if (!comment) return { ok: false, error: 'Comment not found' }
        if (comment.userId !== currentUser.id && !currentUser.isAdmin) {
          return { ok: false, error: 'You can only edit your own comments' }
        }

        const trimmed = content.trim()
        if (!trimmed) return { ok: false, error: 'Comment cannot be empty' }
        if (!validateNoPersonalNames(trimmed)) return { ok: false, error: 'Please avoid using personal names in comments' }

        set(s => ({
          comments: s.comments.map(c => c.id === id ? { ...c, content: trimmed, editedAt: new Date().toISOString() } : c)
        }))
        return { ok: true }
      },

      deleteComment: (id) => {
        const { currentUser, comments } = get()
        if (!currentUser) return false

        const comment = comments.find(c => c.id === id)
        if (!comment) return false
        if (comment.userId !== currentUser.id && !currentUser.isAdmin) return false

        set(s => ({ comments: s.comments.filter(c => c.id !== id) }))
        return true
      },

      upvoteComment: (commentId) => {
        const { upvotedCommentIds } = get()
        if (upvotedCommentIds.includes(commentId)) return
        set(s => ({
          comments: s.comments.map(c => c.id === commentId ? { ...c, upvotes: (c.upvotes ?? 0) + 1 } : c),
          upvotedCommentIds: [...s.upvotedCommentIds, commentId],
        }))
      },

      recordShare: (eventId) => {
        set(s => ({
          events: s.events.map(e => e.id === eventId ? { ...e, shareCount: (e.shareCount ?? 0) + 1 } : e),
        }))
      },

      getEffectiveStatus: (event) => {
        if (event.status === 'resolved' || event.status === 'archived') return event.status
        if (isExpired(event.expiresAt)) return 'expired'
        return 'active'
      },

      banUser: (userId) => {
        if (userId === 'user-admin') return
        set(s => ({ users: s.users.filter(u => u.id !== userId) }))
      },

      restoreSession: () => {
        if (typeof window === 'undefined') return
        try {
          const saved = localStorage.getItem('layoff-bets-currentUser')
          if (saved) {
            const user = JSON.parse(saved)
            set({ currentUser: user })
            // Verify user still exists in the users list
            const users = get().users
            if (!users.find(u => u.id === user.id)) {
              localStorage.removeItem('layoff-bets-currentUser')
              set({ currentUser: null })
            } else {
              // Load user's favorites from server
              api.getFavorites(user.id)
                .then(favorites => {
                  console.log('[restoreSession] Loaded favorites from server:', favorites)
                  set({ favoriteCompanyIds: favorites })
                })
                .catch(err => console.error('[restoreSession] Failed to load favorites:', err))
            }
          }
        } catch (e) {
          console.error('Failed to restore session:', e)
          localStorage.removeItem('layoff-bets-currentUser')
        }
      },

      syncCommentsFromServer: async () => {
        try {
          const serverData = await api.sync()
          if (serverData) {
            const currentUser = get().currentUser
            const userId = currentUser?.id
            const currentFavs = get().favoriteCompanyIds
            const currentPinned = get().pinnedEventIds
            const currentBets = get().bets

            // For logged-in users, use server data. For anonymous users, preserve local favorites
            const newFavs = userId && serverData.favorites?.[userId] ? serverData.favorites[userId] : currentFavs
            const newPinned = userId && serverData.pinnedEvents?.[userId] ? serverData.pinnedEvents[userId] : currentPinned

            // Merge bets: keep server bets as source of truth, but preserve local bets not yet synced
            const serverBets = serverData.bets || []
            // Replace pending bets with server bets, keep other local bets
            const pendingBets = currentBets.filter(b => b.id.startsWith('pending-'))
            const otherLocalBets = currentBets.filter(b => !b.id.startsWith('pending-'))

            let mergedBets = [...serverBets]
            // Keep local bets that aren't pending and don't exist on server
            for (const localBet of otherLocalBets) {
              if (!serverBets.find((sb: Bet) => sb.id === localBet.id)) {
                mergedBets.push(localBet)
              }
            }
            // Pending bets are replaced by server bets, so don't include them

            if (JSON.stringify(newFavs) !== JSON.stringify(currentFavs)) {
              console.log('[syncCommentsFromServer] favorites changed from', currentFavs, 'to', newFavs)
            }

            // Merge seed comments with server comments (server comments can add to/replace seed ones)
            const mergedComments = serverData.comments.length > 0
              ? [...SEED_COMMENTS, ...serverData.comments.filter((c: Comment) => !SEED_COMMENTS.find(sc => sc.id === c.id))]
              : SEED_COMMENTS

            set({
              users: serverData.users.length > 0 ? serverData.users : SEED_USERS,
              events: serverData.events.length > 0 ? serverData.events : SEED_EVENTS,
              bets: mergedBets,
              comments: mergedComments,
              companies: serverData.companies.length > 0 ? serverData.companies : SEED_COMPANIES,
              favoriteCompanyIds: newFavs,
              pinnedEventIds: newPinned,
              feedback: serverData.feedback || [],
              anonVotedEvents: serverData.anonVotedEvents || {},
            })
          }
        } catch (error) {
          console.error('Failed to sync from server:', error)
        }
      },
    }),
    {
      name: 'layoff-bets-store-v6',
      partialize: (s) => ({
        users: s.users,
        companies: s.companies,
        events: s.events,
        bets: s.bets,
        comments: s.comments,
        currentUser: s.currentUser,
        theme: s.theme,
        onboardingCompanyId: s.onboardingCompanyId,
        favoriteCompanyIds: s.favoriteCompanyIds,
        pinnedEventIds: s.pinnedEventIds,
        feedback: s.feedback,
        anonVotedEvents: s.anonVotedEvents,
        companyLastVisit: s.companyLastVisit,
        upvotedCommentIds: s.upvotedCommentIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const idx = state.users.findIndex(u => u.id === 'user-admin')
        if (idx === -1) {
          state.users = [ADMIN_USER, ...state.users]
        } else {
          state.users[idx] = { ...state.users[idx], username: 'admin', password: 'admin', isAdmin: true }
        }
      },
    }
  )
)
