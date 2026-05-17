import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Company, Event, Bet, Comment, Theme } from '../types'
import { uid, isExpired } from '../utils/odds'

const DAILY_COINS = 100
const today = () => new Date().toISOString().split('T')[0]
const futureDate = (days: number) => new Date(Date.now() + days * 86400000).toISOString()
const pastDate = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

const SEED_COMPANIES: Company[] = [
  { id: 'comp-1',  name: 'Accenture Inc.',             slug: 'accenture',          description: 'Global professional services firm specializing in IT consulting, digital transformation, and outsourcing.',          industry: 'Consulting',             viewCount: 142341, createdAt: pastDate(60) },
  { id: 'comp-2',  name: 'ADP',                         slug: 'ADP',                description: 'Leading provider of payroll, HR, and workforce management solutions for businesses of all sizes.',                  industry: 'HR Technology',          viewCount: 89204,  createdAt: pastDate(58) },
  { id: 'comp-3',  name: 'AIG',                         slug: 'AIG',                description: 'Multinational insurance and financial services corporation offering property, casualty, and life insurance.',        industry: 'Insurance',              viewCount: 67891,  createdAt: pastDate(56) },
  { id: 'comp-4',  name: 'Alliance Data Systems',       slug: 'alliance-data',      description: 'Data-driven marketing and loyalty solutions provider serving retailers and consumer brands.',                        industry: 'Marketing Technology',   viewCount: 55120,  createdAt: pastDate(54) },
  { id: 'comp-5',  name: 'Allscripts',                  slug: 'allscripts',         description: 'Healthcare IT company providing electronic health record and practice management software.',                         industry: 'Healthcare IT',          viewCount: 41234,  createdAt: pastDate(52) },
  { id: 'comp-6',  name: 'Allstate Corporation',        slug: 'allstate',           description: 'One of the largest publicly held personal lines property and casualty insurers in the U.S.',                        industry: 'Insurance',              viewCount: 38445,  createdAt: pastDate(50) },
  { id: 'comp-7',  name: 'Altice',                      slug: 'altice',             description: 'Multinational telecommunications company providing cable, broadband, and mobile services.',                          industry: 'Telecommunications',     viewCount: 34901,  createdAt: pastDate(48) },
  { id: 'comp-8',  name: 'American Airlines Group',     slug: 'american-airlines',  description: 'Major U.S. airline and one of the world\'s largest carriers by fleet size and passengers flown.',                  industry: 'Airlines',               viewCount: 128334, createdAt: pastDate(46) },
  { id: 'comp-9',  name: 'Analog Devices',              slug: 'analog-devices',     description: 'Semiconductor company specializing in data conversion, signal processing, and power management ICs.',               industry: 'Semiconductors',         viewCount: 24112,  createdAt: pastDate(44) },
  { id: 'comp-10', name: 'Anthem',                      slug: 'anthem',             description: 'One of the largest health insurance providers in the U.S., serving tens of millions of members.',                   industry: 'Health Insurance',       viewCount: 52445,  createdAt: pastDate(42) },
  { id: 'comp-11', name: 'Apache Oil',                  slug: 'apache-oil',         description: 'Independent oil and gas exploration and production company with operations in the U.S., Egypt, and North Sea.',    industry: 'Oil & Gas',              viewCount: 19334,  createdAt: pastDate(40) },
  { id: 'comp-12', name: 'Ascension Health',            slug: 'ascension-health',   description: 'One of the largest nonprofit Catholic health systems in the U.S., operating hospitals and clinics nationwide.',    industry: 'Healthcare',             viewCount: 29234,  createdAt: pastDate(38) },
  { id: 'comp-13', name: 'AT&T',                        slug: 'ATT',                description: 'American multinational telecommunications conglomerate providing wireless, broadband, and media services.',          industry: 'Telecommunications',     viewCount: 198901, createdAt: pastDate(60) },
  { id: 'comp-14', name: 'Avaya',                       slug: 'avaya',              description: 'Enterprise communications company offering contact center, unified communications, and cloud solutions.',            industry: 'Communications Tech',    viewCount: 38332,  createdAt: pastDate(36) },
  { id: 'comp-15', name: 'Baker Hughes',                slug: 'baker-hughes',       description: 'Oilfield services company providing equipment, services, and technology to the oil and gas industry worldwide.',   industry: 'Oil & Gas Services',     viewCount: 26445,  createdAt: pastDate(34) },
  { id: 'comp-16', name: 'Bank of America',             slug: 'bank-of-america',    description: 'One of the world\'s largest financial institutions, serving individual consumers, businesses, and governments.',   industry: 'Banking',                viewCount: 175678, createdAt: pastDate(60) },
  { id: 'comp-17', name: 'Barnes & Noble',              slug: 'barnes-noble',       description: 'America\'s largest retail bookseller, operating bookstores and a digital content platform.',                        industry: 'Retail',                 viewCount: 24234,  createdAt: pastDate(32) },
  { id: 'comp-18', name: 'Bass Pro Shops',              slug: 'bass-pro',           description: 'Specialty retailer of hunting, fishing, camping, and outdoor recreation merchandise.',                               industry: 'Retail',                 viewCount: 18890,  createdAt: pastDate(30) },
  { id: 'comp-19', name: 'Becton Dickinson',            slug: 'becton-dickinson',   description: 'Global medical technology company that manufactures and sells medical devices, diagnostics, and biosciences.',     industry: 'Medical Devices',        viewCount: 22890,  createdAt: pastDate(28) },
  { id: 'comp-20', name: 'Bed Bath & Beyond',           slug: 'bed-bath-beyond',    description: 'Retail chain selling domestic merchandise, home furnishings, and health and beauty products.',                      industry: 'Retail',                 viewCount: 61234,  createdAt: pastDate(60) },
  { id: 'comp-21', name: 'Belk',                        slug: 'belk',               description: 'Privately held department store chain operating in the Southeastern United States.',                                industry: 'Retail',                 viewCount: 11234,  createdAt: pastDate(26) },
  { id: 'comp-22', name: 'BNSF',                        slug: 'BNSF',               description: 'One of the largest freight railroad networks in North America, operating across 28 U.S. states and Canada.',      industry: 'Transportation',         viewCount: 17234,  createdAt: pastDate(24) },
  { id: 'comp-23', name: 'BNY',                         slug: 'BNY',                description: 'Bank of New York Mellon — global investments company providing custody, clearing, and asset servicing to institutions worldwide.', industry: 'Financial Services', viewCount: 89445, createdAt: pastDate(60) },
  { id: 'comp-24', name: 'Boeing',                      slug: 'boeing',             description: 'Multinational aerospace and defense corporation and one of the world\'s largest manufacturers of commercial jets.',industry: 'Aerospace & Defense',    viewCount: 212102, createdAt: pastDate(60) },
  { id: 'comp-25', name: 'Bose',                        slug: 'bose',               description: 'American consumer electronics company best known for its audio equipment, noise-cancelling headphones, and speakers.',industry: 'Consumer Electronics', viewCount: 34890,  createdAt: pastDate(20) },
  { id: 'comp-26', name: 'BP PLC',                      slug: 'BP',                 description: 'British multinational oil and gas company engaged in exploration, production, refining, and marketing.',             industry: 'Oil & Gas',              viewCount: 78445,  createdAt: pastDate(60) },
  { id: 'comp-27', name: 'Broadcom',                    slug: 'broadcom',           description: 'Global technology company designing semiconductor and infrastructure software solutions.',                            industry: 'Semiconductors',         viewCount: 56890,  createdAt: pastDate(18) },
  { id: 'comp-28', name: 'CA',                          slug: 'CA',                 description: 'CA Technologies — enterprise software company providing IT management solutions for mainframe and distributed IT.', industry: 'Enterprise Software',    viewCount: 14890,  createdAt: pastDate(16) },
  { id: 'comp-29', name: 'Carefirst BlueCross BlueShield', slug: 'carefirst',       description: 'Nonprofit health plan providing medical coverage to members across Maryland, Washington D.C., and Northern Virginia.', industry: 'Health Insurance', viewCount: 18334,  createdAt: pastDate(14) },
  { id: 'comp-30', name: 'CDK Global',                  slug: 'CDK',                description: 'Provider of integrated data and technology solutions to the automotive, heavy truck, and recreation industries.',   industry: 'Automotive Technology',  viewCount: 16112,  createdAt: pastDate(12) },
  { id: 'comp-31', name: 'Cengage',                     slug: 'cengage',            description: 'Education and technology company providing learning materials, digital platforms, and workforce solutions.',          industry: 'Education',              viewCount: 22445,  createdAt: pastDate(60) },
  { id: 'comp-32', name: 'Cenovus',                     slug: 'cenovus',            description: 'Canadian integrated energy company involved in oil sands, conventional oil and gas, and refining.',                 industry: 'Oil & Gas',              viewCount: 13890,  createdAt: pastDate(10) },
  { id: 'comp-33', name: 'Centene',                     slug: 'centene',            description: 'Managed care company providing services under Medicaid, Medicare, and commercial health plans.',                    industry: 'Managed Care',           viewCount: 24678,  createdAt: pastDate(9) },
  { id: 'comp-34', name: 'CenturyLink',                 slug: 'centurylink',        description: 'Telecommunications company providing broadband, voice, and managed networking services to businesses and consumers.',industry: 'Telecommunications',    viewCount: 38901,  createdAt: pastDate(60) },
  { id: 'comp-35', name: 'CGG',                         slug: 'CGG',                description: 'French multinational geoscience company providing geophysical services and data to the oil and gas industry.',      industry: 'Oil & Gas Services',     viewCount: 9334,   createdAt: pastDate(8) },
  { id: 'comp-36', name: 'Change HealthCare',           slug: 'change-healthcare',  description: 'Healthcare technology company offering revenue and payment cycle management, clinical information exchange, and more.',industry: 'Healthcare IT',        viewCount: 41234,  createdAt: pastDate(7) },
  { id: 'comp-37', name: 'Charles Schwab',              slug: 'schwab',             description: 'Financial services company offering brokerage, banking, and wealth management solutions to individual investors.',   industry: 'Financial Services',     viewCount: 67890,  createdAt: pastDate(6) },
  { id: 'comp-38', name: 'Chesapeake Energy',           slug: 'chesapeake-energy',  description: 'American oil and natural gas exploration and production company operating primarily in unconventional plays.',       industry: 'Oil & Gas',              viewCount: 31234,  createdAt: pastDate(60) },
  { id: 'comp-39', name: 'Chevron',                     slug: 'chevron',            description: 'American multinational energy corporation engaged in every aspect of the oil, natural gas, and geothermal business.',industry: 'Oil & Gas',             viewCount: 98445,  createdAt: pastDate(5) },
  { id: 'comp-40', name: 'Cisco',                       slug: 'cisco',              description: 'American multinational technology company that develops and sells networking hardware, software, and services.',     industry: 'Networking & Tech',      viewCount: 156102, createdAt: pastDate(60) },
  { id: 'comp-41', name: 'Citrix',                      slug: 'citrix',             description: 'Enterprise software company specializing in virtualization, networking, and SaaS services for remote work.',        industry: 'Enterprise Software',    viewCount: 44234,  createdAt: pastDate(4) },
  { id: 'comp-42', name: 'Coca Cola',                   slug: 'coca-cola',          description: 'American multinational beverage corporation best known for its flagship product and a portfolio of global brands.', industry: 'Beverages',              viewCount: 87890,  createdAt: pastDate(60) },
  { id: 'comp-43', name: 'Cognizant',                   slug: 'cognizant',          description: 'Multinational IT services and consulting company providing digital, technology, consulting, and operations services.',industry: 'IT Services',           viewCount: 72445,  createdAt: pastDate(3) },
  { id: 'comp-44', name: 'Comcast',                     slug: 'comcast',            description: 'American telecommunications and media conglomerate, and the largest cable TV company in the United States.',        industry: 'Telecommunications',     viewCount: 188334, createdAt: pastDate(60) },
  { id: 'comp-45', name: 'Commscope',                   slug: 'commscope',          description: 'Global provider of infrastructure solutions for communications networks including cable, wireless, and enterprise.',  industry: 'Network Infrastructure', viewCount: 19890,  createdAt: pastDate(2) },
  { id: 'comp-46', name: 'Conduent',                    slug: 'conduent',           description: 'Business process services company providing digital interactions and transaction processing for corporations and governments.',industry: 'BPO',            viewCount: 14334,  createdAt: pastDate(2) },
  { id: 'comp-47', name: 'ConocoPhillips',              slug: 'conocophillips',     description: 'American multinational energy corporation and one of the world\'s largest independent exploration and production companies.',industry: 'Oil & Gas',      viewCount: 54112,  createdAt: pastDate(1) },
  { id: 'comp-48', name: 'Cox Automotive',              slug: 'cox-automotive',     description: 'Leading provider of automotive services including vehicle remarketing, dealership software, and consumer car-buying platforms.',industry: 'Automotive',   viewCount: 28890,  createdAt: pastDate(1) },
  { id: 'comp-49', name: 'CRC',                         slug: 'CRC',                description: 'California Resources Corporation — largest oil and natural gas producer in California by volume.',                   industry: 'Oil & Gas',              viewCount: 9234,   createdAt: pastDate(1) },
  { id: 'comp-50', name: "Crown Castle Int'l",          slug: 'crown-castle',       description: 'Real estate investment trust providing wireless tower infrastructure and fiber solutions across the United States.',  industry: 'Telecom Infrastructure', viewCount: 21445,  createdAt: pastDate(1) },
  { id: 'comp-51', name: 'Cummins',                     slug: 'cummins',            description: 'American corporation that designs, manufactures, and distributes engines, filtration, and power generation products.',industry: 'Manufacturing',         viewCount: 24890,  createdAt: pastDate(1) },
  { id: 'comp-52', name: 'CVS',                         slug: 'CVS',                description: 'American retail pharmacy and health care company operating thousands of retail locations and a pharmacy benefits manager.',industry: 'Healthcare Retail',  viewCount: 134445, createdAt: pastDate(60) },
]

const SEED_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin',
    coins: 9999,
    isAdmin: true,
    createdAt: pastDate(60),
    lastCoinsDate: today(),
  },
]

const SEED_EVENTS: Event[] = [
  {
    id: 'evt-1', companyId: 'comp-44', companyName: 'Comcast',
    title: 'Comcast will cut at least 5,000 jobs by end of Q3',
    description: 'Cord-cutting accelerated in Q1 and ad revenue is down YoY. Multiple sources inside the company say headcount reduction plans are being finalized at the VP level.',
    expiresAt: futureDate(14), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 420, noPool: 180, outcome: null, createdAt: pastDate(5), viewCount: 3241,
  },
  {
    id: 'evt-2', companyId: 'comp-13', companyName: 'AT&T',
    title: 'AT&T will announce another round of layoffs this quarter',
    description: 'AT&T has been shedding headcount for years as it unwinds media acquisitions. Insiders say the cost-cutting mandate from the board has not let up.',
    expiresAt: futureDate(21), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 540, noPool: 160, outcome: null, createdAt: pastDate(4), viewCount: 5872,
  },
  {
    id: 'evt-3', companyId: 'comp-24', companyName: 'Boeing',
    title: 'Boeing will freeze all salaried hiring through end of year',
    description: 'Production delays on the 737 MAX and 787 programs continue to burn cash. Finance is reportedly pushing for a blanket hiring freeze to offset cost overruns.',
    expiresAt: futureDate(30), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 290, noPool: 210, outcome: null, createdAt: pastDate(7), viewCount: 4104,
  },
  {
    id: 'evt-4', companyId: 'comp-40', companyName: 'Cisco',
    title: 'Cisco will cut 10%+ of workforce following Splunk integration',
    description: 'Post-acquisition integration of Splunk is underway. Headcount duplication across engineering and go-to-market is significant. A 10–15% reduction has been floated internally.',
    expiresAt: futureDate(45), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 380, noPool: 220, outcome: null, createdAt: pastDate(3), viewCount: 6187,
  },
  {
    id: 'evt-5', companyId: 'comp-52', companyName: 'CVS',
    title: 'CVS will close 900+ retail stores over the next 3 years',
    description: 'Foot traffic at standalone pharmacy locations has declined sharply. CVS has already begun evaluating underperforming stores and lease renewals are being skipped.',
    expiresAt: futureDate(60), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 450, noPool: 150, outcome: null, createdAt: pastDate(6), viewCount: 4788,
  },
  {
    id: 'evt-6', companyId: 'comp-16', companyName: 'Bank of America',
    title: 'Bank of America will cut 3,000+ jobs in back-office automation push',
    description: 'AI and RPA investments are replacing manual back-office roles at scale. The CFO has publicly committed to keeping headcount flat YoY, implying significant cuts to offset hiring.',
    expiresAt: futureDate(20), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 315, noPool: 185, outcome: null, createdAt: pastDate(2), viewCount: 3455,
  },
  {
    id: 'evt-7', companyId: 'comp-13', companyName: 'AT&T',
    title: 'AT&T completed a 10% workforce reduction in H1',
    description: 'After months of speculation, AT&T confirmed cuts across its wireline and corporate divisions.',
    expiresAt: pastDate(10), status: 'resolved', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 700, noPool: 150, outcome: 'yes', createdAt: pastDate(40), viewCount: 8102,
  },
  {
    id: 'evt-8', companyId: 'comp-43', companyName: 'Cognizant',
    title: 'Cognizant will miss its Q2 revenue guidance',
    description: 'Discretionary IT spending cuts by enterprise clients have slowed deal closings. Multiple analysts have flagged the risk of a guidance miss.',
    expiresAt: pastDate(5), status: 'expired', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 220, noPool: 280, outcome: null, createdAt: pastDate(45), viewCount: 2334,
  },

  // BNY predictions
  {
    id: 'evt-b1', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will cut 3,000+ jobs as part of its AI & automation transformation push',
    description: 'CEO Robin Vince has repeatedly cited AI-driven efficiency as a core pillar of the company\'s 2025 strategy. Back-office and operations roles in custody and clearing are the most exposed. Internal memos reference a "workforce evolution" program with targets not yet disclosed publicly.',
    expiresAt: futureDate(45), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 510, noPool: 190, outcome: null, createdAt: pastDate(8), viewCount: 7241,
  },
  {
    id: 'evt-b2', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY Pershing division will see a 20%+ headcount reduction this year',
    description: 'Pershing has been under revenue pressure as commission-free trading squeezes margins. Multiple layers of management have already been removed. Sources inside the division say RIFs are being planned for Q3 with a focus on middle-office and support functions.',
    expiresAt: futureDate(60), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 380, noPool: 220, outcome: null, createdAt: pastDate(6), viewCount: 5812,
  },
  {
    id: 'evt-b3', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will offshore 25%+ of its technology roles to India within 12 months',
    description: 'BNY has dramatically scaled its Pune and Chennai engineering centers. Job postings in India are up significantly YoY while U.S. tech postings have flatlined. Multiple U.S.-based engineers report being asked to train offshore counterparts.',
    expiresAt: futureDate(90), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 440, noPool: 160, outcome: null, createdAt: pastDate(5), viewCount: 6634,
  },
  {
    id: 'evt-b4', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will eliminate its entire contractor and contingent workforce before the next FTE wave',
    description: 'Historical pattern at BNY is to cut contractors and consultants 3–6 months ahead of full-time employee reductions. SOW vendors and staffing agency headcount have reportedly been quietly reduced across multiple business lines since Q1.',
    expiresAt: futureDate(30), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 290, noPool: 210, outcome: null, createdAt: pastDate(4), viewCount: 4109,
  },
  {
    id: 'evt-b5', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will consolidate its Pittsburgh and Lake Mary campuses into fewer locations',
    description: 'Real estate footprint reduction is a stated priority. Pittsburgh has been the site of multiple past reductions. The Lake Mary, FL office has seen departures accelerate. Employees have been told hybrid schedules may change as office consolidation plans are finalized.',
    expiresAt: futureDate(120), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 330, noPool: 270, outcome: null, createdAt: pastDate(3), viewCount: 3887,
  },
  {
    id: 'evt-b6', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY Asset Servicing division will announce a restructuring by end of Q3',
    description: 'Asset Servicing is BNY\'s largest segment by headcount but has faced margin compression due to fee pressure from institutional clients. A strategic review of the division\'s operating model was reportedly initiated in January. Sources expect an org announcement before Q3 earnings.',
    expiresAt: futureDate(25), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 260, noPool: 240, outcome: null, createdAt: pastDate(2), viewCount: 3421,
  },
  {
    id: 'evt-b7', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will cut its Wealth Management headcount by at least 15% in 2025',
    description: 'BNY Wealth has struggled to compete with larger private banks and RIA platforms. AUM growth has lagged peers and advisor attrition has been high. A restructuring that narrows focus to ultra-high-net-worth clients — and reduces staff servicing smaller accounts — is widely expected.',
    expiresAt: futureDate(75), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 310, noPool: 290, outcome: null, createdAt: pastDate(2), viewCount: 2988,
  },
  {
    id: 'evt-b8', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will announce Q4 layoffs timed around the bonus payout window',
    description: 'BNY has a documented pattern of announcing workforce reductions in late Q4 or early Q1, after annual bonuses are paid. Employees on the ground report performance review language shifting to emphasize "organizational fit" — historically a precursor to managed exits.',
    expiresAt: futureDate(180), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 420, noPool: 180, outcome: null, createdAt: pastDate(1), viewCount: 5203,
  },
  {
    id: 'evt-b9', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY completed a significant layoff round in its Operations division last quarter',
    description: 'Multiple sources confirmed reductions in the settlement and clearance operations group. The cuts were not publicly announced but affected primarily senior operations analysts and team leads.',
    expiresAt: pastDate(8), status: 'resolved', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 680, noPool: 120, outcome: 'yes', createdAt: pastDate(45), viewCount: 9341,
  },
  {
    id: 'evt-b10', companyId: 'comp-23', companyName: 'BNY',
    title: 'BNY will be ranked among the top 10 financial firms for layoffs in 2025 by major outlets',
    description: 'Given the scale of ongoing reductions across custody banking and financial services, tracking outlets like Layoffs.fyi and Bloomberg are expected to place BNY in the top tier of financial sector workforce reductions by year end.',
    expiresAt: futureDate(200), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 350, noPool: 250, outcome: null, createdAt: pastDate(1), viewCount: 4102,
  },
]

const SEED_COMMENTS: Comment[] = [
  { id: 'cmt-1', eventId: 'evt-1', content: 'I work there — the vibes are awful. Managers stopped approving expenses and travel two months ago.', createdAt: pastDate(3) },
  { id: 'cmt-2', eventId: 'evt-1', content: 'They laid off my whole team last cycle and called it a "reorg." Same playbook incoming.', createdAt: pastDate(2) },
  { id: 'cmt-3', eventId: 'evt-1', content: 'Cord-cutting is not slowing down. The math doesn\'t work without headcount cuts.', createdAt: pastDate(0) },
  { id: 'cmt-4', eventId: 'evt-2', content: 'AT&T has been doing rolling layoffs for 5 years. There\'s no floor.', createdAt: pastDate(2) },
  { id: 'cmt-5', eventId: 'evt-2', content: 'They offshored my department last year. What\'s left to cut?', createdAt: pastDate(1) },
  { id: 'cmt-6', eventId: 'evt-4', content: 'Splunk had a totally different culture. The integration is going to be brutal.', createdAt: pastDate(1) },
  { id: 'cmt-7', eventId: 'evt-5', content: 'The CVS near me already closed. This is already happening.', createdAt: pastDate(4) },
  { id: 'cmt-8', eventId: 'evt-5', content: 'Walgreens is doing the same thing. Standalone pharmacy is dying.', createdAt: pastDate(2) },
  // BNY comments
  { id: 'cmt-b1', eventId: 'evt-b1', content: 'They\'ve been quietly walking people out for months. This is just going to be the formal announcement.', createdAt: pastDate(6) },
  { id: 'cmt-b2', eventId: 'evt-b1', content: 'Robin Vince said "workforce evolution" on the last earnings call like 4 times. Read the room.', createdAt: pastDate(5) },
  { id: 'cmt-b3', eventId: 'evt-b1', content: 'My manager told us AI tools will handle 40% of our current workload by end of year. Do the math.', createdAt: pastDate(3) },
  { id: 'cmt-b4', eventId: 'evt-b2', content: 'Pershing is a mess. Lost two major RIA clients this quarter and nobody wants to talk about it internally.', createdAt: pastDate(4) },
  { id: 'cmt-b5', eventId: 'evt-b2', content: 'They restructured my team twice in 18 months. Each time fewer seats when the music stopped.', createdAt: pastDate(2) },
  { id: 'cmt-b6', eventId: 'evt-b3', content: 'I\'ve been training my replacement in Pune for 3 months. Not subtle.', createdAt: pastDate(5) },
  { id: 'cmt-b7', eventId: 'evt-b3', content: 'Every single new tech req I\'ve seen opened in the last 6 months is India-based. Zero exceptions.', createdAt: pastDate(3) },
  { id: 'cmt-b8', eventId: 'evt-b4', content: 'All the contractors in my group got 30-day notices last month. FTEs, you\'re next.', createdAt: pastDate(2) },
  { id: 'cmt-b9', eventId: 'evt-b8', content: 'This happens every year. Bonuses hit in Feb, layoffs announced in March. Clockwork.', createdAt: pastDate(1) },
  { id: 'cmt-b10', eventId: 'evt-b9', content: 'I was part of this. No warning, no severance negotiation. Just a Teams call and a badge deactivation.', createdAt: pastDate(10) },
]

interface StoreState {
  currentUser: User | null
  users: User[]
  companies: Company[]
  events: Event[]
  bets: Bet[]
  comments: Comment[]
  theme: Theme
  onboardingCompanyId: string | null
  favoriteCompanyIds: string[]

  login: (username: string, password: string) => boolean
  logout: () => void
  register: (username: string, password: string) => { ok: boolean; error?: string }
  checkDailyCoins: () => void
  setTheme: (theme: Theme) => void
  setOnboardingCompany: (companyId: string) => void
  toggleFavoriteCompany: (companyId: string) => void

  placeBet: (eventId: string, side: 'yes' | 'no', amount: number) => boolean
  getUserBet: (eventId: string) => Bet | undefined
  createEvent: (data: Omit<Event, 'id' | 'creatorId' | 'creatorName' | 'yesPool' | 'noPool' | 'outcome' | 'createdAt' | 'status' | 'viewCount'>) => void
  resolveEvent: (eventId: string, outcome: 'yes' | 'no') => void
  archiveEvent: (eventId: string) => void
  deleteEvent: (eventId: string) => void

  addCompany: (name: string, description: string, industry: string) => void
  updateCompany: (id: string, name: string, description: string, industry: string) => void
  deleteCompany: (id: string) => void

  addComment: (eventId: string, content: string) => void
  deleteComment: (id: string) => void

  getEffectiveStatus: (event: Event) => Event['status']
  banUser: (userId: string) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: SEED_USERS,
      companies: SEED_COMPANIES,
      events: SEED_EVENTS,
      bets: [],
      comments: SEED_COMMENTS,
      theme: 'light',
      onboardingCompanyId: null,
      favoriteCompanyIds: [],

      setTheme: (theme) => set({ theme }),
      setOnboardingCompany: (companyId) => set({ onboardingCompanyId: companyId }),
      toggleFavoriteCompany: (companyId) => set(s => ({
        favoriteCompanyIds: s.favoriteCompanyIds.includes(companyId)
          ? s.favoriteCompanyIds.filter(id => id !== companyId)
          : [...s.favoriteCompanyIds, companyId],
      })),

      login: (username, password) => {
        const user = get().users.find(
          u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
        )
        if (!user) return false
        set({ currentUser: user })
        get().checkDailyCoins()
        return true
      },

      logout: () => set({ currentUser: null }),

      register: (username, password) => {
        if (!username.trim() || !password) return { ok: false, error: 'Username and password are required.' }
        const exists = get().users.some(u => u.username.toLowerCase() === username.toLowerCase())
        if (exists) return { ok: false, error: 'Username already taken.' }
        const user: User = {
          id: `user-${uid()}`,
          username: username.trim(),
          password,
          coins: DAILY_COINS,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          lastCoinsDate: today(),
        }
        set(s => ({ users: [...s.users, user], currentUser: user }))
        return { ok: true }
      },

      checkDailyCoins: () => {
        const { currentUser, users } = get()
        if (!currentUser) return
        const t = today()
        if (currentUser.lastCoinsDate === t) return
        const updated = { ...currentUser, coins: currentUser.coins + DAILY_COINS, lastCoinsDate: t }
        set(s => ({
          currentUser: updated,
          users: s.users.map(u => u.id === updated.id ? updated : u),
        }))
      },

      placeBet: (eventId, side, amount) => {
        const { currentUser, events, bets } = get()
        if (!currentUser) return false
        if (currentUser.coins < amount) return false
        const event = events.find(e => e.id === eventId)
        if (!event) return false
        if (get().getEffectiveStatus(event) !== 'active') return false
        const alreadyBet = bets.find(b => b.eventId === eventId && b.userId === currentUser.id)
        if (alreadyBet) return false

        const bet: Bet = {
          id: `bet-${uid()}`,
          eventId,
          userId: currentUser.id,
          side,
          amount,
          createdAt: new Date().toISOString(),
        }

        const updatedUser = { ...currentUser, coins: currentUser.coins - amount }
        const updatedEvent = {
          ...event,
          yesPool: side === 'yes' ? event.yesPool + amount : event.yesPool,
          noPool: side === 'no' ? event.noPool + amount : event.noPool,
        }

        set(s => ({
          bets: [...s.bets, bet],
          events: s.events.map(e => e.id === eventId ? updatedEvent : e),
          currentUser: updatedUser,
          users: s.users.map(u => u.id === updatedUser.id ? updatedUser : u),
        }))
        return true
      },

      getUserBet: (eventId) => {
        const { currentUser, bets } = get()
        if (!currentUser) return undefined
        return bets.find(b => b.eventId === eventId && b.userId === currentUser.id)
      },

      createEvent: (data) => {
        const { currentUser } = get()
        if (!currentUser) return
        const event: Event = {
          ...data,
          id: `evt-${uid()}`,
          creatorId: currentUser.id,
          creatorName: currentUser.username,
          yesPool: 50,
          noPool: 50,
          outcome: null,
          status: 'active',
          viewCount: 0,
          createdAt: new Date().toISOString(),
        }
        set(s => ({ events: [event, ...s.events] }))
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
          if (idx !== -1) updatedUsers[idx] = { ...updatedUsers[idx], coins: updatedUsers[idx].coins + payout }
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
        const comment: Comment = {
          id: `cmt-${uid()}`,
          eventId,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ comments: [...s.comments, comment] }))
      },

      deleteComment: (id) => {
        set(s => ({ comments: s.comments.filter(c => c.id !== id) }))
      },

      getEffectiveStatus: (event) => {
        if (event.status === 'resolved' || event.status === 'archived') return event.status
        if (isExpired(event.expiresAt)) return 'expired'
        return 'active'
      },

      banUser: (userId) => {
        set(s => ({ users: s.users.filter(u => u.id !== userId) }))
      },
    }),
    {
      name: 'layoff-bets-store-v4',
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
      }),
    }
  )
)
