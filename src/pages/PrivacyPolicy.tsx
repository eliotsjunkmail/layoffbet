import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useStore } from '../store/useStore'

export const PrivacyPolicy = () => {
  const navigate = useNavigate()
  const currentUser = useStore(s => s.currentUser)

  return (
    <Layout hideHeader={!currentUser}>
      {currentUser && (
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-5 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
      <p className="text-gray-400 dark:text-slate-400 text-sm mb-6">Last updated: July 2026</p>

      {[
        {
          title: 'Our Commitment to Anonymity',
          body: 'Layoff Live is built anonymous-first. We do not require your real name, email address, employer, or any identifying information to create an account or participate. Your username is the only identity associated with your activity on this platform.',
        },
        {
          title: 'Data We Collect',
          body: 'We collect the minimum data necessary to operate the platform:',
          list: [
            'IP address (for fraud prevention and abuse detection)',
            'A first-party anonymous session identifier stored in your browser, so we can recognize a returning anonymous visitor across sessions without a login',
            'Interaction analytics (events created, bets placed, comments, chat messages, companies favorited, and daily active-usage) — used in aggregate for operational and amusement-purpose analytics',
            'Account data (username, hashed password, virtual coin balance)',
          ],
        },
        {
          title: 'Data We Do Not Collect',
          body: 'We do not collect, request, or store:',
          list: [
            'Real names or personal identifiers',
            'Email addresses (unless added as an optional feature in the future)',
            'Employer or employment status',
            'Location data beyond approximate region via IP',
            'Financial or payment information',
          ],
        },
        {
          title: 'How We Use Your Data',
          body: 'Data is used solely to:',
          list: [
            'Operate and improve the platform',
            'Prevent spam, abuse, and market manipulation',
            'Enforce our Content Guidelines',
            'Maintain the prediction market mechanics',
          ],
        },
        {
          title: 'Analytics & Activity Tracking',
          body: 'To understand platform usage, we record your interactions and a daily "active" signal, tied to your anonymous session identifier or your account. This powers internal metrics such as total, anonymous, and registered user counts, daily/weekly/monthly active users, and the volume of events, bets, comments, chat messages, and favorites. These analytics are for operational and amusement purposes and are reviewed by administrators in aggregate.',
        },
        {
          title: 'Anonymous Participation & Public Content',
          body: 'Layoff Live is an anonymous open forum. The events, bets, comments, and chat messages you post — including those by current and former employees — are visible to other users and are not endorsed by us. We protect your anonymity by not attaching your real identity to this activity, but the content itself is public within the platform. Do not post personal or confidential information.',
        },
        {
          title: 'Data Sharing',
          body: 'We do not sell or rent your personal data. Any promotional placements shown on the site are not personalized using your data, and we do not use third-party advertising or cross-site tracking networks. We may disclose data only in the following circumstances:',
          list: [
            'When required by law or valid legal process',
            'In genuine safety emergencies to protect users or the public',
            'To service providers who operate under strict data processing agreements',
          ],
        },
        {
          title: 'Data Retention',
          body: 'Account and activity data is retained for as long as your account is active. You may request deletion of your account and associated data at any time by contacting an administrator.',
        },
        {
          title: 'Cookies & Local Storage',
          body: 'We use first-party cookies and browser local storage to keep you logged in, to remember an anonymous session, and to record the usage analytics described above. We do not use third-party advertising or cross-site tracking cookies. You may disable cookies or clear local storage in your browser, but this will prevent you from staying logged in or keeping an anonymous session.',
        },
        {
          title: 'Changes to This Policy',
          body: 'This policy may be updated at any time. Continued use of the platform following any changes constitutes your acceptance of the updated policy.',
        },
      ].map(({ title, body, list }) => (
        <div key={title} className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">{body}</p>
          {list && (
            <ul className="space-y-1.5">
              {list.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-500 dark:text-slate-400">
                  <span className="text-gray-300 dark:text-slate-600 flex-shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </Layout>
  )
}
